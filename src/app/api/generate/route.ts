import OpenAI from "openai";
import { z } from "zod";
import { Roadmap, RoadmapT } from "@/lib/schema";
import { SYSTEM_PROMPT } from "@/lib/prompt";
import { zodTextFormat } from "openai/helpers/zod";

export const dynamic = "force-dynamic";
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const Input = z.object({
  goal: z.string(),
  total_days: z.number().int().optional(),
  target_date: z.string().optional(),
  daily_minutes: z.number().int(),
});

async function callWithModel(model: string, messages: any[]) {
  return client.responses.create({
    model,
    input: messages,
    // omit temperature for models that disallow it with SO
    tools: [{ type: "web_search" }],   // 👈 enable web browsing like ChatGPT
    text: { format: zodTextFormat(Roadmap, "roadmap") },
    tool_choice: "auto"
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { goal, total_days, target_date, daily_minutes } = Input.parse(body);

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: JSON.stringify({ goal, total_days, target_date, daily_minutes }) },
    ] as const;

    // Try your configured model first; if tools aren't supported, fall back.
    const primary = process.env.OPENAI_MODEL || "gpt-5";
    let resp;
    try {
      resp = await callWithModel(primary, messages);
    } catch (e: any) {
      if (String(e?.message || "").toLowerCase().includes("tool") ||
          String(e?.message || "").toLowerCase().includes("web_search")) {
        resp = await callWithModel("gpt-4o", messages); // widely supports web_search
      } else {
        throw e;
      }
    }

    const text = (resp as any).output_text ?? "";
    const data: RoadmapT = Roadmap.parse(JSON.parse(text));
    return new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message ?? "Unknown error" }), {
      status: 400, headers: { "Content-Type": "application/json" }
    });
  }
}
