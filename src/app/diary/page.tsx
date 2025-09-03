"use client";
import { useEffect, useState } from "react";
type Entry = { id:string; date:string; type:string; content:string; dayNumber:number|null; goalId:string|null };

export default function DiaryPage() {
  const [date,setDate]=useState<string>(""); const [items,setItems]=useState<Entry[]>([]);
  const load=async()=>{ const qs = date?`?date=${date}`:""; const res=await fetch(`/api/diary${qs}`); if(res.ok) setItems(await res.json()); };
  useEffect(()=>{ load(); },[date]);

  return (<main className="container"><div className="card">
    <h1>Your diary</h1>
    <div style={{display:"flex",gap:12,alignItems:"center"}}>
      <label>Filter by date</label><input type="date" value={date} onChange={e=>setDate(e.target.value)} />
      <button className="btn" onClick={load}>Refresh</button>
    </div>
    <ul className="list" style={{marginTop:12}}>
      {items.map(e=>(
        <li key={e.id}>
          <strong>{new Date(e.date).toLocaleDateString()}</strong> — <em>{e.type}</em> {e.dayNumber ? <span className="kpill">Day {e.dayNumber}</span> : null}
          <div style={{whiteSpace:"pre-wrap",marginTop:6}}>{e.content}</div>
        </li>
      ))}
    </ul>
  </div></main>);
}
