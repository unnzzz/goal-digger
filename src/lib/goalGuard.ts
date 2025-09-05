// src/lib/goalGuard.ts
//
// Conservative goal gate:
// - Uses word boundaries so we don't false-flag words like "complex" or "dissertation".
// - Has an allowlist for legit phrases (hackathon, life hacks, ethical hacking, adult learning).
// - Targets *actions* (make/build/teach me to do X illegally) instead of vague words.
// - Returns a generic reason (you can customize the string).

type Rule = { label: string; re: RegExp };

// ✅ Allowlist phrases that should *not* be blocked even if they contain "hack" or "adult".
const ALLOWLIST: RegExp[] = [
  /\bhackathon(s)?\b/i,
  /\blife[-\s]?hack(s)?\b/i,
  /\b(productivity|growth|marketing)\s+hacks?\b/i,
  /\bethical\s+hacking\b/i,
  /\bbug\s*bounty\b/i,
  /\bpenetration\s+testing\b/i,
  /\badult\s+learning\b/i,
];

// ❌ Explicit sexual content (word boundaries; avoid catching random substrings)
const NSFW: Rule[] = [
  { label: "explicit-sex", re: /\bsex(ual|ually)?\b/i },
  { label: "porn", re: /\bporn(ography)?\b/i },
  { label: "xxx", re: /\bxxx\b/i },
  { label: "erotic", re: /\berotic(a)?\b/i },
  { label: "hentai", re: /\bhentai\b/i },
  { label: "fetish", re: /\bfetish(es)?\b/i },
  { label: "onlyfans", re: /\bonlyfans\b/i },
  { label: "nsfw", re: /\bnsfw\b/i },
  { label: "nude", re: /\bnude(s|ity)?\b/i },
  { label: "bdsm", re: /\bbdsm\b/i },
  { label: "lewd", re: /\blewd\b/i },
];

// ❌ Sexual content involving minors (hard block)
const MINORS: Rule[] = [
  { label: "minor-sex", re: /\b(child|children|kid|minor|under\s*age|teen(s)?)\b.*\b(sex|sexual|nude|explicit|porn)\b/i },
];

// ❌ Illegal wrongdoing (focus on verbs + objects; avoid "hackathon")
const ILLEGAL: Rule[] = [
  // Explosives / weapons
  { label: "explosive", re: /\b(make|build|assemble|manufacture)\b.*\b(pipe\s*bomb|bomb|explosive|napalm|molotov)\b/i },
  { label: "silencer", re: /\b(make|build|3d[-\s]?print)\b.*\b(silencer|suppressor)\b/i },
  { label: "ghost-gun", re: /\b(ghost\s*gun|unregistered\s*firearm|3d[-\s]?printed\s*gun)\b/i },

  // Drugs (manufacture/distribute)
  { label: "hard-drugs", re: /\b(make|cook|synthesize|sell|distribute|ship)\b.*\b(cocaine|heroin|fentanyl|meth(amphetamine)?|lsd|mdma|ecstasy)\b/i },

  // Fraud / identity
  { label: "card-fraud", re: /\b(credit\s*card\s*fraud|carding|cvv\s*dumps?|skimmer|clone\s*card)\b/i },
  { label: "id-fraud", re: /\b(forg(e|ing)\s*(id|documents?)|fake\s*id|counterfeit\s*(money|currency|bills?))\b/i },

  // Hacking (exclude legit cases via allowlist)
  { label: "malware", re: /\b(keylogger|ransomware|rat\b|remote\s+access\s+trojan|botnet|stealer)\b/i },
  { label: "illegal-hacking", re: /\b(hack(?!athon)|hacking|ddos|backdoor|zero[-\s]?day|0day)\b/i },

  // Bypassing protections
  { label: "bypass", re: /\b(break\s*into|bypass|circumvent)\b.*\b(paywall|license|activation|drm)\b/i },
];

function matchesAny(text: string, rules: Rule[]): string | null {
  for (const { label, re } of rules) {
    if (re.test(text)) return label;
  }
  return null;
}

function allowedByAllowlist(text: string): boolean {
  return ALLOWLIST.some((re) => re.test(text));
}

export function checkGoalSafety(goal: string): { ok: boolean; reason?: string } {
  const g = (goal || "").toLowerCase().trim();
  if (!g) return { ok: true }; // empty goal isn't blocked here; your UI already requires input

  // If it clearly matches an allowlist phrase, skip ILLEGAL/HACK blocks
  const isAllowlisted = allowedByAllowlist(g);

  // minors: always block if both minor term + sexual context appear (rule above already couples them)
  if (matchesAny(g, MINORS)) {
    return { ok: false, reason: "This goal is not allowed." };
  }

  // explicit sexual content
  if (matchesAny(g, NSFW)) {
    return { ok: false, reason: "Explicit goals are not allowed." };
  }

  // illegal wrongdoing (but let allowlist pass)
  if (!isAllowlisted) {
    const hit = matchesAny(g, ILLEGAL);
    if (hit) {
      return { ok: false, reason: "Illegal goals are not allowed." };
    }
  }

  return { ok: true };
}
