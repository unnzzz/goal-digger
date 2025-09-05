import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { Roadmap, RoadmapT } from "./schema";
import { SYSTEM_PROMPT } from "./prompt";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseRetryAfter(err: any): number | null {
  try {
    const h = err?.headers;
    if (h && typeof h.get === "function") {
      const ra = h.get("retry-after");
      if (ra) {
        const s = Number(ra);
        if (!Number.isNaN(s) && s > 0) return s * 1000;
      }
    }
    // fallback: parse "Please try again in Xs" from message
    const m: string = String(err?.message || "");
    const match = m.match(/try again in ([0-9]+(?:\.[0-9]+)?)s/i);
    if (match) {
      const secs = Number(match[1]);
      if (!Number.isNaN(secs) && secs > 0) return Math.ceil(secs * 1000);
    }
  } catch {}
  return null;
}

function shouldRetry(err: any): boolean {
  const status = err?.status ?? err?.response?.status;
  const code = err?.code || err?.error?.code;
  if (status === 429 || code === "rate_limit_exceeded") return true;
  if (status >= 500 && status < 600) return true;
  // occasional network hiccups
  if (String(err?.message || "").toLowerCase().includes("fetch failed")) return true;
  return false;
}

async function withRetries<T>(
  fn: () => Promise<T>,
  { max = 4, base = 1200 }: { max?: number; base?: number } = {}
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err: any) {
      attempt++;
      if (!shouldRetry(err) || attempt > max) throw err;
      const headerDelay = parseRetryAfter(err);
      const backoff = headerDelay ?? Math.min(15000, base * Math.pow(2, attempt - 1)); // 1.2s, 2.4s, 4.8s, …
      const jitter = Math.floor(Math.random() * 300);
      await sleep(backoff + jitter);
    }
  }
}

export async function generateRoadmap(params: {
  goal: string;
  total_days?: number;
  target_date?: string;
  daily_minutes: number;
}): Promise<RoadmapT> {
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: JSON.stringify(params) },
  ] as const;

  const resp = await withRetries(() =>
    client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5",
      input: messages,
      tools: [{ type: "web_search" }], // ✅ same browsing
      text: { format: zodTextFormat(Roadmap, "roadmap") }, // ✅ same SO schema
      tool_choice: "auto",
    })
  );

  const text = (resp as any).output_text ?? "";
  return Roadmap.parse(JSON.parse(text));
}
