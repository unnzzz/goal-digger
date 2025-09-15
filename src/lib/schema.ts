import { z } from "zod";

// NOTE: This schema is used for Structured Outputs generation.
// Avoid .url(), .min(), .max(), regex, etc. — the API rejects them.
// All fields required; use nullables for "optional" semantics.

export const Resource = z.object({
  kind: z.enum(["watch", "listen", "read"]),
  title: z.string(),
  url: z.string(),                 // no .url() -> avoids "format": "uri"
  source: z.string().nullable(),
  duration_minutes: z.number().int().nullable(),
  description: z.string().nullable(), // Add description field
  split: z.object({
    total_parts: z.number().int(),
    part_number: z.number().int(),
    range: z.string(),
  }).nullable(),
});

export const Day = z.object({
  day: z.number().int(),
  title: z.string(),
  minutes: z.number().int(),
  learn: z.array(Resource),        // no .min()
  practice: z.array(Resource),     // no .min()
  reflect: z.string(),
  quiz: z.array(z.any()).optional(), // Quiz questions
});

export const Roadmap = z.object({
  goal: z.string(),
  total_days: z.number().int(),
  daily_minutes: z.number().int(),
  days: z.array(Day),
});

export type ResourceT = z.infer<typeof Resource>;
export type DayT = z.infer<typeof Day>;
export type RoadmapT = z.infer<typeof Roadmap>;
