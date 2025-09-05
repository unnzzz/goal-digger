import crypto from "crypto";

function stableStringify(obj: any): string {
  const seen = new WeakSet();
  const stringify = (val: any): any => {
    if (val && typeof val === "object") {
      if (seen.has(val)) return null;
      seen.add(val);
      if (Array.isArray(val)) return val.map(stringify);
      return Object.fromEntries(Object.keys(val).sort().map(k => [k, stringify(val[k])]));
    }
    return val;
  };
  return JSON.stringify(stringify(obj));
}

export function hashRoadmap(roadmap: unknown): string {
  const s = stableStringify(roadmap);
  return crypto.createHash("sha256").update(s).digest("hex");
}
