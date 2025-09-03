"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Resource = { kind:"watch"|"listen"|"read"; title:string; url:string; source:string|null; duration_minutes:number|null; split:{total_parts:number;part_number:number;range:string}|null };
type Day = { day:number; title:string; minutes:number; learn:Resource[]; practice:Resource[]; reflect:string; };
type Roadmap = { goal:string; total_days:number; daily_minutes:number; days:Day[]; };

export default function GoalPage({ params }: { params: { id:string } }) {
  const [goal,setGoal]=useState<any>(null);
  const [roadmap,setRoadmap]=useState<Roadmap|null>(null);
  const [loading,setLoading]=useState(true);
  const [editMode,setEditMode]=useState(false);
  const [today,setToday]=useState<string>(()=>new Date().toISOString().slice(0,10));
  const router = useRouter();

  useEffect(()=>{ (async()=>{
    const res=await fetch(`/api/goals/${params.id}`); if(!res.ok){ if(res.status===401) router.push("/login"); return; }
    const j=await res.json(); setGoal(j); setRoadmap(j.roadmapJson as Roadmap); setLoading(false);
  })(); },[params.id]);

  if (loading) return <main className="container"><div className="card">Loading…</div></main>;
  if (!goal || !roadmap) return <main className="container"><div className="card">Not found.</div></main>;

  const saveRoadmap = async()=> {
    const res=await fetch(`/api/goals/${goal.id}`,{ method:"PUT", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({ title:goal.title, roadmap })});
    if(!res.ok) alert("Save failed"); else alert("Saved!");
  };

  // editing helpers
  const addResource=(di:number, section:"learn"|"practice")=>{
    const title=prompt("Resource title"); if(!title) return;
    const url=prompt("Resource URL"); if(!url) return;
    const kind=(prompt("kind: watch | listen | read")||"read") as Resource["kind"];
    const next=structuredClone(roadmap!); (next as Roadmap).days[di][section].push({ kind,title,url,source:null,duration_minutes:null,split:null });
    setRoadmap(next);
  };
  const editResource=(di:number, section:"learn"|"practice", i:number)=>{
    const r=(roadmap as Roadmap).days[di][section][i];
    const title=prompt("New title", r.title) || r.title; const url=prompt("New URL", r.url) || r.url;
    const next=structuredClone(roadmap!); (next as Roadmap).days[di][section][i] = { ...r, title, url }; setRoadmap(next);
  };
  const deleteResource=(di:number, section:"learn"|"practice", i:number)=>{
    const next=structuredClone(roadmap!); (next as Roadmap).days[di][section].splice(i,1); setRoadmap(next);
  };
  const editDayTitle=(di:number)=>{
    const t=prompt("New day title",(roadmap as Roadmap).days[di].title); if(!t) return;
    const next=structuredClone(roadmap!); (next as Roadmap).days[di].title=t; setRoadmap(next);
  };

  // diary and coins
  const saveDiary = async (date:string, type:"practice"|"reflect", content:string, dayNumber:number|null) => {
    if (!content.trim()) return alert("Write something first");
    const res = await fetch("/api/diary", { method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ goalId: goal.id, date, type, content, dayNumber }) });
    if (!res.ok) alert("Diary save failed"); else alert("Diary saved");
  };
  const completeQuest = async (dayNumber:number, section:"learn"|"practice"|"reflect", index:number) => {
    const res = await fetch(`/api/goals/${goal.id}/complete`, { method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ dayNumber, section, index }) });
    if (!res.ok) alert("Could not mark complete"); else alert("Quest completed! Coins awarded.");
  };

  return (
    <main className="container"><div className="card">
      <h1>{goal.title}</h1>
      <p><span className="kpill">{roadmap.total_days} days</span> <span className="kpill">≈ {roadmap.daily_minutes} min/day</span></p>
      <div style={{display:"flex", gap:8, margin:"8px 0"}}>
        <button className="btn" onClick={()=>setEditMode(v=>!v)}>{editMode?"Stop editing":"Edit roadmap"}</button>
        {editMode && <button className="btn" onClick={saveRoadmap}>Save changes</button>}
        <div style={{marginLeft:"auto"}}><label style={{marginRight:8}}>Diary date</label><input type="date" value={today} onChange={e=>setToday(e.target.value)}/></div>
      </div>

      {roadmap.days.map((d,di)=>(
        <article key={di} className="day">
          <h3>Day {d.day}: {d.title} <span className="badge">{d.minutes} min</span>
            {editMode && <button className="btn" style={{marginLeft:8}} onClick={()=>editDayTitle(di)}>Edit title</button>}
          </h3>

          <h4>Learn</h4>
          <ul className="list">
            {d.learn.map((r,i)=>(
              <li key={`L${di}-${i}`}>
                <strong>[{r.kind}]</strong> <a href={r.url} target="_blank" rel="noreferrer">{r.title}</a>
                {r.split && <span className="kpill">Part {r.split.part_number}/{r.split.total_parts}: {r.split.range}</span>}
                <button className="btn" style={{marginLeft:8}} onClick={()=>completeQuest(d.day,"learn",i)}>Complete</button>
                {editMode && <>
                  <button className="btn" style={{marginLeft:8}} onClick={()=>editResource(di,"learn",i)}>Edit</button>
                  <button className="btn" style={{marginLeft:8}} onClick={()=>deleteResource(di,"learn",i)}>Delete</button>
                </>}
              </li>
            ))}
          </ul>
          {editMode && <button className="btn" onClick={()=>addResource(di,"learn")}>Add Learn resource</button>}

          <h4>Practice</h4>
          <ul className="list">
            {d.practice.map((r,i)=>(
              <li key={`P${di}-${i}`} style={{marginBottom:10}}>
                <strong>[{r.kind}]</strong> <a href={r.url} target="_blank" rel="noreferrer">{r.title}</a>
                {r.split && <span className="kpill">Part {r.split.part_number}/{r.split.total_parts}: {r.split.range}</span>}
                <button className="btn" style={{marginLeft:8}} onClick={()=>completeQuest(d.day,"practice",i)}>Complete</button>
                {editMode && <>
                  <button className="btn" style={{marginLeft:8}} onClick={()=>editResource(di,"practice",i)}>Edit</button>
                  <button className="btn" style={{marginLeft:8}} onClick={()=>deleteResource(di,"practice",i)}>Delete</button>
                </>}
                {/* Inline diary entry textbox for PRACTICE */}
                <div style={{marginTop:6}}>
                  <textarea placeholder="Diary: what did you practice/struggle with?" style={{width:"100%", minHeight:80}}
                    onBlur={(e)=>{ const v=e.currentTarget.value; if(v.trim()) saveDiary(today,"practice",v,d.day); e.currentTarget.value=""; }} />
                  <small>Tip: click/tap outside the box to save.</small>
                </div>
              </li>
            ))}
          </ul>
          {editMode && <button className="btn" onClick={()=>addResource(di,"practice")}>Add Practice resource</button>}

          <h4>Reflect</h4>
          <p style={{marginBottom:6}}>{d.reflect}</p>
          <button className="btn" onClick={()=>completeQuest(d.day,"reflect",0)}>Mark Reflect Complete</button>
          {/* Inline diary entry textbox for REFLECT */}
          <div style={{marginTop:6}}>
            <textarea placeholder="Diary: quick reflection…" style={{width:"100%", minHeight:80}}
              onBlur={(e)=>{ const v=e.currentTarget.value; if(v.trim()) saveDiary(today,"reflect",v,d.day); e.currentTarget.value=""; }} />
            <small>Tip: click/tap outside the box to save.</small>
          </div>
        </article>
      ))}
    </div></main>
  );
}
