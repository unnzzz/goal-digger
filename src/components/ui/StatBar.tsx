"use client";
export function StatBar({ icon, label, value, max }:{
  icon: React.ReactNode; label:string; value:number; max:number;
}) {
  const pct = Math.max(0, Math.min(1, value / Math.max(1, max)));
  return (
    <div className="stat">
      <div style={{width:24,display:"grid",placeItems:"center"}}>{icon}</div>
      <div className="bar"><span style={{ width: `${pct*100}%` }} /></div>
      <div className="mono">{value}/{max}</div>
    </div>
  );
}
