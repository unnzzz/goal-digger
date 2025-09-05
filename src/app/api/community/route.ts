// src/app/api/community/route.ts
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import OpenAI from "openai";

// ---------- Safety / quality config ----------
const MAX_POSTS = 5;
const TOP_COMMENTS_LIMIT = 20;
const MIN_HIGHLIGHTS = 3;

// Block obvious adult/mature/NSFW content by keywords (in titles, comments, URLs)
const BLOCKLIST = [
  "nsfw","porn","nude","sex","sexual","erotic","xxx","18\\+","onlyfans",
  "camgirl","cam boy","fetish","bdsm","hentai","adult","explicit","r34","rule34",
  "escort","hookup","dating app","sext","stripper","lewd"
];

// Only allow “verified/safe” domains for resources
const SAFE_DOMAINS = new Set<string>([
  // Big learning platforms
  "youtube.com","youtu.be","khanacademy.org","coursera.org","edx.org","udacity.com","udemy.com","skillshare.com","freecodecamp.org",
  // Official docs / developer portals (add more as you like)
  "developer.mozilla.org","docs.python.org","pytorch.org","tensorflow.org","react.dev","vitejs.dev","nextjs.org","nodejs.org",
  "scikit-learn.org","rust-lang.org","go.dev","kotlinlang.org","java.com","oracle.com","microsoft.com","learn.microsoft.com",
  "docs.aws.amazon.com","cloud.google.com","firebase.google.com","docs.github.com","git-scm.com",
  // Trusted publications / foundations
  "wikipedia.org","wikibooks.org","wikiversity.org","arxiv.org","mit.edu","stanford.edu","harvard.edu",
  // Add your curated picks here:
  "realpython.com","geeksforgeeks.org","towardsdatascience.com","medium.com","w3schools.com",
]);

// Wildcard top-level domains to allow (conservative)
const SAFE_TLDS = new Set<string>(["edu","gov"]);

// ------------------------------------------------

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type RedditPost = {
  id: string;
  title: string;
  permalink: string;
  url: string;
  score: number;
  num_comments: number;
  subreddit: string;
  over_18?: boolean;
  selftext?: string;
};

function blockedByKeywords(s: string): boolean {
  const text = s.toLowerCase();
  return BLOCKLIST.some((k) => text.includes(k));
}

function toHostname(u: string): string | null {
  try { return new URL(u).hostname.replace(/^www\./, "").toLowerCase(); } catch { return null; }
}

function isVerifiedResource(url: string): boolean {
  const host = toHostname(url);
  if (!host) return false;
  // Allow *.wikipedia.org, *.mit.edu etc.
  if (host.endsWith(".wikipedia.org")) return true;
  // Exact domain allowlist
  if (SAFE_DOMAINS.has(host)) return true;
  // Allow specific TLDs (e.g., *.edu, *.gov)
  const tld = host.split(".").pop();
  if (tld && SAFE_TLDS.has(tld)) return true;
  return false;
}

function extractUrlsFromText(text: string): string[] {
  const regex = /\bhttps?:\/\/[^\s)<>"']+/gi;
  const out = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text))) {
    const raw = m[0].replace(/[),.;:"'!?]+$/, ""); // trim trailing punct
    out.add(raw);
  }
  return Array.from(out);
}

function isRelevantToGoal(goal: string, text: string): boolean {
  const g = goal.toLowerCase();
  const parts = g.split(/[^a-z0-9]+/i).filter((w) => w.length >= 4);
  if (parts.length === 0) return true; // fallback: accept
  const t = text.toLowerCase();
  // Require at least one goal keyword
  return parts.some((p) => t.includes(p));
}

async function fetchJSON(url: string) {
  const res = await fetch(url, {
    headers: { "User-Agent": "roadmap-app/1.0 (+github)" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Reddit fetch failed: ${res.status}`);
  return res.json();
}

export async function POST(req: NextRequest) {
  try {
    const { goal } = await req.json();
    if (!goal || typeof goal !== "string") {
      return new Response(JSON.stringify({ error: "goal required" }), {
        status: 400, headers: { "Content-Type": "application/json" },
      });
    }

    // 1) Search Reddit for top posts mentioning the goal (last year)
    const searchUrl = `https://www.reddit.com/search.json?q=${encodeURIComponent(goal)}&sort=top&t=year&limit=${MAX_POSTS}`;
    const s = await fetchJSON(searchUrl);
    const rawPosts: RedditPost[] = (s?.data?.children || []).map((c: any) => c?.data).filter(Boolean);

    // 2) Filter out NSFW/mature and obviously off-topic posts
    const posts: RedditPost[] = rawPosts
      .filter((p) => !p.over_18)
      .filter((p) => !blockedByKeywords(p.title))
      .filter((p) => isRelevantToGoal(goal, p.title))
      .map((d) => ({
        id: d.id,
        title: d.title || "",
        permalink: d.permalink,
        url: d.url || "",
        score: d.score || 0,
        num_comments: d.num_comments || 0,
        subreddit: d.subreddit || "",
        over_18: d.over_18 || false,
        selftext: d.selftext || "",
      }));

    // Early return if nothing safe/relevant
    if (posts.length === 0) {
      return new Response(
        JSON.stringify({ posts: [], suggestions: { highlights: [], resources: [] } }),
        { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } }
      );
    }

    // 3) Pull top comments, filter NSFW + relevance, extract candidate URLs
    const commentsByPost: Record<string, string[]> = {};
    const candidateUrls = new Set<string>();

    for (const p of posts) {
      try {
        const threadUrl = `https://www.reddit.com${p.permalink}.json?sort=top&limit=${TOP_COMMENTS_LIMIT}`;
        const t = await fetchJSON(threadUrl);
        const comments: string[] = (t?.[1]?.data?.children || [])
          .map((c: any) => String(c?.data?.body || ""))
          .filter((b: string) => b.trim().length > 0)
          .filter((b: string) => !blockedByKeywords(b))
          .filter((b: string) => isRelevantToGoal(goal, b))
          .slice(0, 200); // hard cap

        commentsByPost[p.id] = comments;

        // From post and comments, extract URLs; then keep only verified
        const urls = [
          ...extractUrlsFromText(p.title + " " + (p.selftext || "")),
          ...comments.flatMap(extractUrlsFromText),
        ];
        for (const u of urls) {
          if (isVerifiedResource(u) && !blockedByKeywords(u)) {
            candidateUrls.add(u);
          }
        }
      } catch {
        commentsByPost[p.id] = [];
      }
    }

    // 4) Build a **filtered** corpus for the model
    const blocks: string[] = [];
    for (const p of posts) {
      blocks.push(`### Post: ${p.title} (r/${p.subreddit})`);
      for (const [i, c] of (commentsByPost[p.id] || []).entries()) {
        blocks.push(`- C${i + 1}: ${c}`);
      }
      blocks.push("");
    }
    const corpus = blocks.join("\n");

    // 5) Ask the model to summarize actionable, on-goal advice only
    const sys = `You summarize Reddit advice for a user's learning goal.
STRICT RULES:
- Only include actionable, on-topic tips directly helpful for achieving the goal.
- Ignore jokes, venting, or unrelated digressions.
- DO NOT include mature, explicit, or NSFW content.
- For "resources", ONLY include items from the provided "verified_resources" list.
- If there aren't enough useful items, return fewer results. No filler.`;

    const user = {
      goal,
      reddit_corpus: corpus.slice(0, 120000), // safety cap
      verified_resources: Array.from(candidateUrls).slice(0, 50),
      format: {
        highlights: "5-12 concise bullets, concrete and useful",
        resources: "0-20 items from verified_resources only; {title, url}",
      },
      output_json_schema: {
        type: "object",
        properties: {
          highlights: { type: "array", items: { type: "string" } },
          resources: {
            type: "array",
            items: {
              type: "object",
              required: ["title", "url"],
              properties: { title: { type: "string" }, url: { type: "string" } },
            },
          },
        },
        required: ["highlights", "resources"],
        additionalProperties: false,
      },
    };

    const resp = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5",
      input: [
        { role: "system", content: sys },
        { role: "user", content: JSON.stringify(user) },
      ],
    });

    const raw = (resp as any).output_text ?? "{}";
    let parsed: any = { highlights: [], resources: [] };
    try { parsed = JSON.parse(raw); } catch { /* keep defaults */ }

    // 6) Final **server-side** sanitization (belt-and-suspenders)
    const safeHighlights = (Array.isArray(parsed.highlights) ? parsed.highlights : [])
      .map((s) => String(s))
      .filter((s) => s.trim().length > 0)
      .filter((s) => !blockedByKeywords(s))
      .filter((s) => isRelevantToGoal(goal, s))
      .slice(0, 20);

    const seen = new Set<string>();
    const safeResources = (Array.isArray(parsed.resources) ? parsed.resources : [])
      .map((r: any) => ({ title: String(r?.title || "").trim(), url: String(r?.url || "").trim() }))
      .filter((r) => r.title && r.url && !blockedByKeywords(r.title) && !blockedByKeywords(r.url))
      .filter((r) => isVerifiedResource(r.url))
      .filter((r) => {
        const k = `${toHostname(r.url)}|${new URL(r.url).pathname}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .slice(0, 20);

    // If not enough highlights, fall back to short “what people suggest” from comments
    const suggestions = {
      highlights: safeHighlights.slice(0, Math.max(MIN_HIGHLIGHTS, safeHighlights.length)),
      resources: safeResources,
    };

    return new Response(
      JSON.stringify({ posts, suggestions }),
      { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "community error" }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
}
