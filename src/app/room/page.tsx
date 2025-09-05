"use client";
import { useEffect, useState } from "react";

type Owned = { id:string; placed:boolean; posX:number|null; posY:number|null; item:{ id:string; name:string; cost:number }};

export default function RoomPage(){
  const [items,setItems]=useState<Owned[]>([]);
  const [loading,setLoading]=useState(true);

  const load=async()=>{
    setLoading(true);
    const r=await fetch("/api/room/inventory",{cache:"no-store"});
    const j=await r.json();
    setItems(j.items??[]);
    setLoading(false);
  };
  useEffect(()=>{ load(); },[]);

  return (
    <main className="container" style={{marginTop:16}}>
      <h1>Your Room</h1>
      <p style={{opacity:0.8}}>All furniture you’ve purchased.</p>
      {loading ? <div>Loading…</div> : (
        <ul className="list">
          {items.map(x=>(
            <li key={x.id} className="card" style={{padding:12,display:"flex",justifyContent:"space-between"}}>
              <div>
                <strong>{x.item.name}</strong>
                <div style={{opacity:0.7}}>Cost: {x.item.cost}c</div>
              </div>
              <div>{x.placed ? <span className="kpill">Placed</span> : <span className="kpill">In storage</span>}</div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
