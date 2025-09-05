// src/lib/time.ts
export function isValidTZ(tz: string) {
  try { new Intl.DateTimeFormat("en-US", { timeZone: tz }); return true; } catch { return false; }
}

export function localNowParts(tz: string) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit"
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map(p => [p.type, p.value]));
  return {
    y: +parts.year, m: +parts.month, d: +parts.day, h: +parts.hour, min: +parts.minute,
    label: `${parts.year}-${parts.month}-${parts.day}` // YYYY-MM-DD
  };
}

export function todayLabel(tz: string) {
  return new Date().toLocaleDateString("en-CA", { timeZone: tz });
}

function epochDayUTC(y:number,m:number,d:number){ return Math.floor(Date.UTC(y, m-1, d) / 86400000); }
export function dayNumberFrom(startDate: Date, localDateLabel: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(localDateLabel);
  if (!m) return 1;
  const s = startDate;
  const startED = epochDayUTC(s.getUTCFullYear(), s.getUTCMonth()+1, s.getUTCDate());
  const tgtED = epochDayUTC(+m[1], +m[2], +m[3]);
  return Math.max(1, tgtED - startED + 1);
}
