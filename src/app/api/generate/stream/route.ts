// src/app/api/generate/stream/route.ts
import { z } from "zod";
import { generateRoadmapWithGemini } from "@/lib/geminiRoadmapGenerator";
import type { RoadmapT } from "@/lib/schema";
import { checkGoalSafety } from "@/lib/goalGuard";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const Input = z.object({
  goal: z.string(),
  total_days: z.number().int().optional(),
  target_date: z.string().optional(),
  daily_minutes: z.number().int(),
});

// You can tune these via env if you like
const CHUNK_SIZE = Number(process.env.FAST_CHUNK_SIZE ?? 10);   // days per generation call
const CONCURRENCY = Number(process.env.FAST_CONCURRENCY ?? 3); // parallel calls
const TICK_MS = 1000;                                         // progress update interval (ms)
const EMA_ALPHA = 0.3;                                        // smoothing for per-day duration estimate
const STITCHING_FRACTION = 0.02;                              // last 2% reserved for stitching

type Task = () => Promise<RoadmapT>;
type ChunkMeta = {
  id: number;
  spanDays: number;
  run: Task;
  start?: number;
  end?: number;
  done: boolean;
};

function enc(obj: any) {
  return new TextEncoder().encode(JSON.stringify(obj) + "\n");
}

export async function POST(req: Request) {
  try {
    // Parse once so we can run the safety check before heavy work
    const body = await req.json();

    // ---- SAFETY GUARD: block illegal/explicit goals early (NDJSON error to match client) ----
    {
      const goal = String(body?.goal || "");
      const guard = checkGoalSafety(goal);
      if (!guard.ok) {
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(enc({ type: "error", message: guard.reason || "This goal is not allowed." }));
            controller.close();
          },
        });
        return new Response(stream, {
          status: 400,
          headers: {
            "Content-Type": "application/x-ndjson",
            "Cache-Control": "no-store",
          },
        });
      }
    }

    // ---- DAILY GOAL LIMIT CHECK ----
    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
      const user = await prisma.user.findUnique({ where: { email: session.user.email } });
      if (user) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const goalsCreatedToday = await prisma.goal.count({
          where: {
            userId: user.id,
            createdAt: {
              gte: today,
              lt: tomorrow
            }
          }
        });

        if (goalsCreatedToday >= 3) {
          const stream = new ReadableStream({
            start(controller) {
              controller.enqueue(enc({ 
                type: "error", 
                message: "Daily goal limit reached. You can create up to 3 goals per day. Try again tomorrow." 
              }));
              controller.close();
            },
          });
          return new Response(stream, {
            status: 429,
            headers: {
              "Content-Type": "application/x-ndjson",
              "Cache-Control": "no-store",
            },
          });
        }
      }
    }

    const params = Input.parse(body);

    let tickTimer: ReturnType<typeof setInterval> | null = null;
    let controllerClosed = false;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let controller: ReadableStreamDefaultController<any> | null = null;

    const closeStream = () => {
      if (controllerClosed || !controller) return;
      try {
        controllerClosed = true;
        if (tickTimer) {
          clearInterval(tickTimer);
          tickTimer = null;
        }
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
        controller.close();
      } catch (error) {
        console.warn('Close failed:', error);
      }
    };

    const stream = new ReadableStream({
      async start(streamController) {
        controller = streamController;
        
        const send = (obj: any) => {
          if (controllerClosed) return;
          try {
            controller!.enqueue(enc(obj));
          } catch (error) {
            // Controller might be closed, ignore the error
            controllerClosed = true;
            console.warn('Send failed:', error);
          }
        };

        // Set a timeout to prevent hanging streams
        timeout = setTimeout(() => {
          console.warn('Stream timeout, closing...');
          closeStream();
        }, 300000); // 5 minutes timeout

        // Build chunk tasks (we ALWAYS chunk when total_days is provided, even if small)
        const buildChunks = (): ChunkMeta[] => {
          // If target_date is used, we don't know days ahead of time → treat as 1 pseudo-chunk.
          if (params.target_date && !params.total_days) {
            return [{
              id: 0,
              spanDays: 1,
              run: () => generateRoadmapWithGemini(params),
              done: false
            }];
          }

          const totalDays = Math.max(1, Number(params.total_days ?? 1));
          const chunks: ChunkMeta[] = [];
          let remaining = totalDays;
          let id = 0;

          while (remaining > 0) {
            const span = Math.min(remaining, Math.max(1, CHUNK_SIZE));
            const sub = {
              goal: params.goal,
              total_days: span,
              daily_minutes: params.daily_minutes,
            } as const;

            chunks.push({
              id: id++,
              spanDays: span,
              run: () => generateRoadmapWithGemini(sub),
              done: false,
            });
            remaining -= span;
          }

          // If user asked for only 1 day (or tiny plan), we still keep it as one chunk;
          // our micro-ticks will keep the bar moving.
          return chunks;
        };

        const chunks = buildChunks();
        const totalWeight = chunks.reduce((s, c) => s + c.spanDays, 0);

        // Adaptive estimate for ms per day (initialize with a sane baseline)
        let emaMsPerDay = 8000; // ~8s/day default; it will adapt quickly

        // Percent computation:
        //  - We use 0..(1 - STITCHING_FRACTION) for "chunking" work
        //  - Last STITCHING_FRACTION (e.g., 2%) for stitching/renumbering
        const chunkingMax = 1 - STITCHING_FRACTION;

        // Concurrency scheduler
        const results: RoadmapT[] = new Array(chunks.length);
        let inFlight = 0;
        let nextIdx = 0;
        let completedWeight = 0;
        let stitching = false;

        function calcPercent(now = Date.now()) {
          // Completed weight (exact)
          const doneWeight = completedWeight;

          // In-progress estimate using EMA and elapsed time per chunk
          let activeContribution = 0;
          for (const ch of chunks) {
            if (ch.done || ch.start == null || ch.end != null) continue;
            const elapsed = now - ch.start;
            const expectForChunk = Math.max(emaMsPerDay * ch.spanDays, 1000); // guard: at least 1s
            const frac = Math.min(0.99, elapsed / expectForChunk); // don't ever declare 100% until finished
            activeContribution += ch.spanDays * frac;
          }

          const progressWeight = doneWeight + activeContribution;
          const base = (progressWeight / totalWeight) * chunkingMax; // 0..(1 - stitching)
          return base;
        }

        const emitProgress = (message?: string) => {
          try {
            const pct = Math.max(0, Math.min(1, calcPercent())) * 100;
            send({
              type: "progress",
              percent: Math.round(pct),
              message: message || "Working…",
              done: Math.round(pct),
              total: 100
            });
          } catch (error) {
            // Controller might be closed, ignore the error
            console.warn('Progress emit failed:', error);
          }
        };

        // Start a ticking timer to push micro-progress every second
        tickTimer = setInterval(() => {
          if (!stitching && !controllerClosed) {
            try {
              emitProgress();
            } catch (error) {
              // Timer might be running after controller is closed, clear it
              controllerClosed = true;
              if (tickTimer) {
                clearInterval(tickTimer);
                tickTimer = null;
              }
            }
          }
        }, TICK_MS);

        // Kick initial progress
        emitProgress("Starting…");

        // Runner that respects CONCURRENCY and updates timings
        try {
          await new Promise<void>((resolve, reject) => {
            const runNext = () => {
              // All queued & none in-flight? done scheduling
              if (nextIdx >= chunks.length && inFlight === 0) return resolve();

              // Launch up to CONCURRENCY
              while (inFlight < CONCURRENCY && nextIdx < chunks.length) {
                const idx = nextIdx++;
                const ch = chunks[idx];
                ch.start = Date.now();
                inFlight++;

                ch.run().then((res) => {
                  if (controllerClosed) return;
                  
                  ch.end = Date.now();
                  ch.done = true;
                  results[idx] = res;

                  // Update EMA (ms/day)
                  const ms = Math.max(1, (ch.end - (ch.start || 0)));
                  const msPerDay = ms / ch.spanDays;
                  emaMsPerDay = EMA_ALPHA * msPerDay + (1 - EMA_ALPHA) * emaMsPerDay;

                  // Update completed weight & emit immediate progress
                  completedWeight += ch.spanDays;
                  emitProgress(`Chunk ${completedWeight}/${totalWeight} days complete`);

                }).catch((e) => {
                  console.error(`Chunk ${idx} failed:`, e);
                  controllerClosed = true;
                  reject(e);
                }).finally(() => {
                  inFlight--;
                  if (!controllerClosed) {
                    runNext();
                  }
                });
              }
            };

            runNext();
          });
        } catch (error) {
          // Clear timer on error and mark controller as closed
          console.error('Streaming error:', error);
          closeStream();
          throw error;
        }

        // All chunks done — finalize with a small stitching phase (2%)
        stitching = true;
        if (tickTimer) { 
          clearInterval(tickTimer); 
          tickTimer = null; 
        }

        // Push to 99% smoothly (if not already)
        send({ type: "progress", percent: Math.max(99, Math.round(calcPercent() * 100)), message: "Stitching…" });

        // Stitch + renumber
        const first = results[0];
        const allDays = results.flatMap(r => r.days);
        allDays.forEach((d, i) => (d.day = i + 1));
        const merged: RoadmapT = { ...first, total_days: allDays.length, days: allDays };

        // 100% and result
        send({ type: "progress", percent: 100, message: "Done" });
        send({ type: "result", data: merged });
        
        // Close the stream properly
        closeStream();
      },
      cancel() {
        // Handle stream cancellation
        console.log('Stream cancelled');
        closeStream();
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(enc({ type: "error", message: err?.message ?? "Unknown error" }));
        controller.close();
      }
    });
    return new Response(stream, { headers: { "Content-Type": "application/x-ndjson" }, status: 400 });
  }
}
