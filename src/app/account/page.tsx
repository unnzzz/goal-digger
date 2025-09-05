"use client";
import { useEffect, useState } from "react";
import { tierLabel } from "@/lib/status";

type Me = {
  name:string|null; coins:number; avatarKey?:string|null;
  stats:{INT:number;STR:number;VIT:number;AES:number;WLH:number};
  primaryStatus?:string|null; badges?:{key:string,label:string}[];
};

export default function AccountPage(){
  const [me,setMe]=useState<Me|null>(null);
  useEffect(()=>{ (async()=>{ const r=await fetch("/api/me",{cache:"no-store"}); if(r.ok){ setMe(await r.json()); } })(); },[]);
  if(!me) return <main className="container"><h1>Account</h1><div>Loading…</div></main>;

  const avatarSrc = me.avatarKey ? `/avatars/${me.avatarKey}.png` : `/avatars/astronaut.png`;

  return (
    <main className="container" style={{marginTop:16}}>
      <h1>Account</h1>
      <div className="card" style={{padding:16,display:"flex",gap:16,alignItems:"center"}}>
        <img src={avatarSrc} width={72} height={72} style={{borderRadius:12}} alt="avatar"/>
        <div>
          <div style={{fontSize:18}}><strong>{me.name ?? "You"}</strong></div>
          <div style={{marginTop:6}}>
            Primary Status: <strong>{me.primaryStatus ?? "—"}</strong>
          </div>
          <div style={{marginTop:6,display:"flex",gap:6,flexWrap:"wrap"}}>
            {me.badges?.map(b=><span key={b.key} className="kpill">{b.label}</span>)}
          </div>
        </div>
      </div>

      <section style={{marginTop:16}}>
        <h2>Stats</h2>
        <StatBar label="Intelligence" v={me.stats.INT}/>
        <StatBar label="Strength" v={me.stats.STR}/>
        <StatBar label="Vitality" v={me.stats.VIT}/>
        <StatBar label="Aesthetic" v={me.stats.AES}/>
        <StatBar label="Wealth" v={me.stats.WLH}/>
      </section>
    </main>
  );
}

function StatBar({label,v}:{label:string;v:number}){
  return (
    <div className="card" style={{padding:12,marginBottom:8}}>
      <div style={{display:"flex",justifyContent:"space-between"}}>
        <strong>{label}</strong>
        <span>{v} — {tierLabel(v)}</span>
      </div>
      <div style={{height:8,background:"#222",borderRadius:6,marginTop:8}}>
        <div style={{width:`${Math.min(100,v)}%`,height:"100%",background:"#4f46e5",borderRadius:6}}/>
      </div>
    </div>
  );
}
