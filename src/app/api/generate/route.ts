import { z } from "zod";
import { generateRoadmap } from "@/lib/generateRoadmap";
import type { RoadmapT } from "@/lib/schema";

export const dynamic = "force-dynamic";

const Input = z.object({
  goal: z.string(),
  total_days: z.number().int().optional(),
  target_date: z.string().optional(),
  daily_minutes: z.number().int(),
});

const CHUNK_SIZE = Number(process.env.FAST_CHUNK_SIZE ?? 7);
const CONCURRENCY = Number(process.env.FAST_CONCURRENCY ?? 3);

// simple in-memory cache (optional)
const cache = new Map<string, { at: number; json: string }>();
const CACHE_TTL_MS = 1000 * 60 * 60; // 1h

function keyOf(p: any) { return JSON.stringify(p); }
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function pLimit<T>(limit: number, tasks: (() => Promise<T>)[]) {
  const results: T[] = new Array(tasks.length);
  let i = 0, active = 0;
  return await new Promise<T[]>((resolve, reject) => {
    const next = () => {
      if (i === tasks.length && active === 0) return resolve(results);
      while (active < limit && i < tasks.length) {
        const cur = i++;
        active++;
        tasks[cur]().then(
          (r) => { results[cur] = r; active--; next(); },
          (e) => reject(e)
        );
      }
    };
    next();
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const params = Input.parse(body);

    // cache hit?
    const key = keyOf(params);
    const cached = cache.get(key);
    if (cached && (Date.now() - cached.at) < CACHE_TTL_MS) {
      return new Response(cached.json, { status: 200, headers: { "Content-Type": "application/json" } });
    }

    // If target_date is used or total_days is small, single call (unchanged logic)
    if (params.target_date || !params.total_days || params.total_days <= CHUNK_SIZE) {
      const data = await generateRoadmap(params);
      const json = JSON.stringify(data);
      cache.set(key, { at: Date.now(), json });
      return new Response(json, { status: 200, headers: { "Content-Type": "application/json" } });
    }

    // Otherwise: split into chunks and run in parallel (same logic per chunk)
    const tasks: (() => Promise<RoadmapT>)[] = [];
    let remaining = params.total_days!;
    while (remaining > 0) {
      const span = Math.min(remaining, CHUNK_SIZE);
      const sub = { goal: params.goal, total_days: span, daily_minutes: params.daily_minutes } as const;
      tasks.push(() => generateRoadmap(sub));
      remaining -= span;
    }

    const chunks = await pLimit(CONCURRENCY, tasks);

    // stitch and renumber days (logic content unchanged)
    const first = chunks[0];
    const allDays = chunks.flatMap(c => c.days);
    allDays.forEach((d, i) => (d.day = i + 1));
    const merged: RoadmapT = {
      ...first,
      total_days: allDays.length,
      days: allDays,
    };

    const json = JSON.stringify(merged);
    cache.set(key, { at: Date.now(), json });
    return new Response(json, { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message ?? "Unknown error" }), {
      status: 400, headers: { "Content-Type": "application/json" }
    });
  }
}
