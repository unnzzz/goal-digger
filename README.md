# Roadmap Generator (Next.js + OpenAI GPT-5)

Generate a day-by-day Learn / Practice / Reflect roadmap from a user goal using the OpenAI Responses API
with strict JSON Structured Outputs (Zod). Long resources are split across days; each Learn & Practice has multiple free links.

## Quickstart
1) `npm install`
2) Copy `.env.local.example` to `.env.local` and paste your OpenAI key
3) `npm run dev` → http://localhost:3000

## Environment
- `OPENAI_API_KEY` (required)
- `OPENAI_MODEL` (optional, default `gpt-5`; e.g., `gpt-5-mini`)
