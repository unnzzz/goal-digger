import { z } from "zod";
import { generateRoadmap } from "@/lib/generateRoadmap";
import type { RoadmapT } from "@/lib/schema";
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

// Tunables
const CHUNK_SIZE = Number(process.env.FAST_CHUNK_SIZE ?? 7);
const CONCURRENCY = Number(process.env.FAST_CONCURRENCY ?? 3);
const TICK_MS = 1000;
const EMA_ALPHA = 0.3;
const STITCHING_FRACTION = 0.02;

type Task = () => Promise<RoadmapT>;
type ChunkMeta = {
  id: number;
  spanDays: number;
  run: Task;
  start?: number;
  end?: number;
  done: boolean;
};

export async function POST(req: Request) {
  const encoder = new TextEncoder();
  let closed = false;
  let tickTimer: ReturnType<typeof setInterval> | null = null;

  function safeSend(controller: ReadableStreamDefaultController<Uint8Array>, obj: any) {
    if (closed) return;
    try {
      controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
    } catch {
      // if enqueue throws (closed), mark closed to prevent further sends
      closed = true;
    }
  }

  function closeAll(controller: ReadableStreamDefaultController<Uint8Array>) {
    if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
    if (closed) return;
    closed = true;
    try { controller.close(); } catch {}
  }

  try {
    const body = await req.json();
    const params = Input.parse(body);

    // Check daily goal limit
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
          const rs = new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(new TextEncoder().encode(JSON.stringify({ 
                type: "error", 
                message: "Daily goal limit reached. You can create up to 3 goals per day. Try again tomorrow." 
              }) + "\n"));
              controller.close();
            }
          });
          return new Response(rs, { status: 429, headers: { "Content-Type": "application/x-ndjson" } });
        }
      }
    }

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        // abort handling
        const abort = (msg?: string) => {
          if (!closed) {
            safeSend(controller, { type: "error", message: msg || "Aborted" });
            closeAll(controller);
          }
        };
        try {
          // if client disconnects
          const signal: AbortSignal | undefined = (req as any).signal;
          if (signal) {
            signal.addEventListener("abort", () => abort("Client disconnected"));
          }

          // Build chunks (even for small plans we make 1 chunk for smooth progress)
          const chunks: ChunkMeta[] = (() => {
            if (params.target_date && !params.total_days) {
              return [{ id: 0, spanDays: 1, run: () => generateRoadmap(params), done: false }];
            }
            const totalDays = Math.max(1, Number(params.total_days ?? 1));
            const arr: ChunkMeta[] = [];
            let rem = totalDays, id = 0;
            while (rem > 0) {
              const span = Math.min(rem, Math.max(1, CHUNK_SIZE));
              const sub = { goal: params.goal, total_days: span, daily_minutes: params.daily_minutes } as const;
              arr.push({ id: id++, spanDays: span, run: () => generateRoadmap(sub), done: false });
              rem -= span;
            }
            return arr;
          })();

          const totalWeight = chunks.reduce((s, c) => s + c.spanDays, 0);
          let emaMsPerDay = 8000; // adaptive estimate
          let completedWeight = 0;
          let stitching = false;

          const chunkingMax = 1 - STITCHING_FRACTION;

          const calcPercent = (now = Date.now()) => {
            let active = 0;
            for (const ch of chunks) {
              if (ch.done || ch.start == null || ch.end != null) continue;
              const elapsed = now - ch.start;
              const expect = Math.max(emaMsPerDay * ch.spanDays, 1000);
              const frac = Math.min(0.99, elapsed / expect);
              active += ch.spanDays * frac;
            }
            const weight = completedWeight + active;
            return Math.min(1, (weight / totalWeight) * chunkingMax);
          };

          const emitProgress = (message?: string) => {
            const pct = Math.round(Math.max(0, Math.min(1, calcPercent())) * 100);
            safeSend(controller, { type: "progress", percent: pct, message: message || "Working…", done: pct, total: 100 });
          };

          // Ticking micro-progress (never after close)
          tickTimer = setInterval(() => {
            if (!closed && !stitching) emitProgress();
          }, TICK_MS);

          emitProgress("Starting…");

          // Concurrency runner with progress updates
          const results: RoadmapT[] = new Array(chunks.length);
          await new Promise<void>((resolve, reject) => {
            let inFlight = 0;
            let nextIdx = 0;

            const runNext = () => {
              if (closed) return; // client aborted
              if (nextIdx >= chunks.length && inFlight === 0) return resolve();

              while (inFlight < CONCURRENCY && nextIdx < chunks.length) {
                const idx = nextIdx++;
                const ch = chunks[idx];
                ch.start = Date.now();
                inFlight++;

                ch.run()
                  .then((res) => {
                    ch.end = Date.now();
                    ch.done = true;
                    results[idx] = res;
                    const ms = Math.max(1, (ch.end - (ch.start || 0)));
                    const mpd = ms / ch.spanDays;
                    emaMsPerDay = EMA_ALPHA * mpd + (1 - EMA_ALPHA) * emaMsPerDay;
                    completedWeight += ch.spanDays;
                    emitProgress(`Generated ${completedWeight}/${totalWeight} days`);
                  })
                  .catch((e) => {
                    reject(e);
                  })
                  .finally(() => {
                    inFlight--;
                    runNext();
                  });
              }
            };

            runNext();
          });

          // Stitching phase
          stitching = true;
          if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }

          const pre = Math.max(99, Math.round(calcPercent() * 100));
          safeSend(controller, { type: "progress", percent: pre, message: "Stitching…" });

          const first = results[0];
          const allDays = results.flatMap((r) => r.days);
          allDays.forEach((d, i) => (d.day = i + 1));
          const merged: RoadmapT = { ...first, total_days: allDays.length, days: allDays };

          safeSend(controller, { type: "progress", percent: 100, message: "Done" });
          safeSend(controller, { type: "result", data: merged });
          closeAll(controller);
        } catch (e: any) {
          if (!closed) {
            const msg = e?.message || "Generation failed";
            safeSend(controller, { type: "error", message: msg });
            closeAll(controller);
          }
        }
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    // Fallback if creating the stream failed before start()
    const msg = err?.message ?? "Unknown error";
    const rs = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(JSON.stringify({ type: "error", message: msg }) + "\n"));
        controller.close();
      }
    });
    return new Response(rs, { status: 400, headers: { "Content-Type": "application/x-ndjson" } });
  }
}
