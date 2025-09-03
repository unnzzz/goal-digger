import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { Roadmap, RoadmapT } from "./schema";
import { SYSTEM_PROMPT } from "./prompt";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

  const resp = await client.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-5",
    input: messages,
    tools: [{ type: "web_search" }],
    text: { format: zodTextFormat(Roadmap, "roadmap") },
    tool_choice: "auto",
  });

  const text = (resp as any).output_text ?? "";
  return Roadmap.parse(JSON.parse(text));
}
