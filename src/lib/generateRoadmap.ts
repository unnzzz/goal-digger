import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { Roadmap, RoadmapT } from "./schema";
import { SYSTEM_PROMPT } from "./prompt";

const client = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

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

async function validateRoadmapLinks(roadmap: RoadmapT): Promise<RoadmapT> {
  const processedRoadmap = { ...roadmap };
  
  for (const day of processedRoadmap.days) {
    // Validate learn resources
    for (const resource of day.learn) {
      if (!isValidResourceUrl(resource.url, resource.kind)) {
        console.warn(`Invalid ${resource.kind} URL: ${resource.url}`);
        // Try to find a better resource
        const betterResource = await findBetterResource(resource.title, roadmap.goal, resource.kind);
        if (betterResource) {
          Object.assign(resource, betterResource);
        }
      }
    }
    
    // Validate practice resources
    for (const resource of day.practice) {
      if (!isValidResourceUrl(resource.url, resource.kind)) {
        console.warn(`Invalid ${resource.kind} URL: ${resource.url}`);
        const betterResource = await findBetterResource(resource.title, roadmap.goal, resource.kind);
        if (betterResource) {
          Object.assign(resource, betterResource);
        }
      }
    }
  }
  
  return processedRoadmap;
}

function isValidResourceUrl(url: string, kind: string): boolean {
  try {
    const urlObj = new URL(url);
    
    // Check if it's a homepage URL (bad)
    const hostname = urlObj.hostname.toLowerCase();
    if (hostname === 'youtube.com' || hostname === 'www.youtube.com' || 
        hostname === 'coursera.org' || hostname === 'khanacademy.org' ||
        hostname === 'vimeo.com' || hostname === 'ted.com') {
      return false; // Homepage URLs are not specific enough
    }
    
    // Check for specific content indicators
    if (kind === "watch") {
      // Should be a specific video URL
      return urlObj.pathname.includes('/watch') || urlObj.pathname.includes('/v/') || 
             urlObj.pathname.includes('/embed/') || urlObj.pathname.includes('/episode/');
    }
    
    if (kind === "read") {
      // Should be a specific article URL
      return urlObj.pathname.length > 1 && !urlObj.pathname.endsWith('/');
    }
    
    if (kind === "listen") {
      // Should be a specific episode URL
      return urlObj.pathname.includes('/episode/') || urlObj.pathname.includes('/show/') ||
             urlObj.pathname.includes('/podcast/');
    }
    
    return true;
  } catch {
    return false;
  }
}

async function findBetterResource(title: string, goal: string, kind: string): Promise<any | null> {
  if (!client) return null;
  
  try {
    const searchQuery = `${title} ${goal} ${kind === 'watch' ? 'video tutorial' : kind === 'read' ? 'article guide' : 'podcast episode'}`;
    
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4o",
      input: [{ role: "user", content: `Find a specific ${kind} resource for: "${title}" related to "${goal}". Search for: ${searchQuery}. Return only the URL and title.` }],
      tools: [{ type: "web_search" }],
      tool_choice: "required",
    });
    
    const text = (response as any).output_text ?? "";
    const urlMatch = text.match(/https?:\/\/[^\s]+/);
    
    if (urlMatch && isValidResourceUrl(urlMatch[0], kind)) {
      return {
        url: urlMatch[0],
        title: title,
        source: getSourceFromUrl(urlMatch[0])
      };
    }
  } catch (error) {
    console.error("Error finding better resource:", error);
  }
  
  return null;
}

function getSourceFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    if (hostname.includes('youtube.com')) return 'YouTube';
    if (hostname.includes('vimeo.com')) return 'Vimeo';
    if (hostname.includes('coursera.org')) return 'Coursera';
    if (hostname.includes('khanacademy.org')) return 'Khan Academy';
    if (hostname.includes('ted.com')) return 'TED';
    if (hostname.includes('freecodecamp.org')) return 'FreeCodeCamp';
    if (hostname.includes('medium.com')) return 'Medium';
    if (hostname.includes('dev.to')) return 'Dev.to';
    if (hostname.includes('spotify.com')) return 'Spotify';
    if (hostname.includes('apple.com')) return 'Apple Podcasts';
    
    return 'Web';
  } catch {
    return 'Web';
  }
}

async function fixBrokenVideoLinks(roadmap: RoadmapT): Promise<RoadmapT> {
  if (!client) return roadmap;
  
  const processedRoadmap = { ...roadmap };
  
  for (const day of processedRoadmap.days) {
    // Process learn resources
    for (const resource of day.learn) {
      if (resource.kind === "watch" && resource.url.includes("youtube.com")) {
        // Check if it's a valid YouTube URL format
        if (!isValidYouTubeUrl(resource.url)) {
          // Try to find a working alternative
          const alternative = await findAlternativeVideo(resource.title, roadmap.goal);
          if (alternative) {
            resource.url = alternative.url;
            resource.source = alternative.source;
          }
        }
      }
    }
    
    // Process practice resources
    for (const resource of day.practice) {
      if (resource.kind === "watch" && resource.url.includes("youtube.com")) {
        if (!isValidYouTubeUrl(resource.url)) {
          const alternative = await findAlternativeVideo(resource.title, roadmap.goal);
          if (alternative) {
            resource.url = alternative.url;
            resource.source = alternative.source;
          }
        }
      }
    }
  }
  
  return processedRoadmap;
}

function isValidYouTubeUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname === "www.youtube.com" || urlObj.hostname === "youtube.com";
  } catch {
    return false;
  }
}

async function findAlternativeVideo(title: string, goal: string): Promise<{ url: string; source: string } | null> {
  if (!client) return null;
  
  try {
    const searchQuery = `${title} ${goal} tutorial video site:vimeo.com OR site:coursera.org OR site:khanacademy.org OR site:ted.com`;
    
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4o",
      input: [{ role: "user", content: `Find a working video alternative for: "${title}" related to "${goal}". Search for: ${searchQuery}` }],
      tools: [{ type: "web_search" }],
      tool_choice: "required",
    });
    
    // Parse the response to extract a working video URL
    const text = (response as any).output_text ?? "";
    const urlMatch = text.match(/https?:\/\/[^\s]+/);
    
    if (urlMatch) {
      const url = urlMatch[0];
      let source = "Video";
      
      if (url.includes("vimeo.com")) source = "Vimeo";
      else if (url.includes("coursera.org")) source = "Coursera";
      else if (url.includes("khanacademy.org")) source = "Khan Academy";
      else if (url.includes("ted.com")) source = "TED";
      
      return { url, source };
    }
  } catch (error) {
    console.error("Error finding alternative video:", error);
  }
  
  return null;
}

export async function generateRoadmap(params: {
  goal: string;
  total_days?: number;
  target_date?: string;
  daily_minutes: number;
}): Promise<RoadmapT> {
  if (!client) {
    throw new Error("OpenAI client not initialized. Missing OPENAI_API_KEY environment variable.");
  }

  const messages: Array<{ role: "system" | "user"; content: string }> = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: JSON.stringify(params) },
  ];

  const resp = await withRetries(() =>
    client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4o",
      input: messages,
      tools: [{ type: "web_search" }],
      text: { format: zodTextFormat(Roadmap, "roadmap") },
      tool_choice: "required", // Force web search usage
    })
  );

  const text = (resp as any).output_text ?? "";
  const roadmap = Roadmap.parse(JSON.parse(text));
  
  // Validate that all resources have proper URLs
  const validatedRoadmap = await validateRoadmapLinks(roadmap);
  
  // Post-process to fix any broken YouTube links
  const processedRoadmap = await fixBrokenVideoLinks(validatedRoadmap);
  
  return processedRoadmap;
}
