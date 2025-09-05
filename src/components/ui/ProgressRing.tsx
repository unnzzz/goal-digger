"use client";
export function ProgressRing({ value }:{ value:number }) {
  const pct = Math.max(0, Math.min(100, value));
  const R = 46;
  const C = 2*Math.PI*R;
  const dash = (pct/100)*C;
  return (
    <div className="ring">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={R} fill="none" stroke="#eee7da" strokeWidth="8"/>
        <circle cx="50" cy="50" r={R} fill="none" stroke="#a9d36c" strokeWidth="8"
          strokeDasharray={`${dash} ${C-dash}`} strokeLinecap="round" transform="rotate(-90 50 50)"/>
      </svg>
      <div style={{position:"absolute"}} className="mono" aria-label="overall progress">{Math.round(pct)}%</div>
    </div>
  );
}
