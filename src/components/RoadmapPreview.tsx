"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const COINS = { learn: 5, practice: 10, reflect: 5 } as const;

type Resource = {
  kind: "watch" | "listen" | "read";
  title: string;
  url: string;
  source: string | null;
  duration_minutes: number | null;
  split: { total_parts: number; part_number: number; range?: string | null } | null;
};

type Day = { day: number; title: string; minutes: number; learn: Resource[]; practice: Resource[]; reflect: string; };

type Roadmap = { goal: string; total_days: number; daily_minutes: number; days: Day[]; };

type Completion = { dayNumber: number; section: "learn" | "practice" | "reflect"; index: number; };

function SplitBadge({
  r,
}: {
  r: { split?: { part_number: number; total_parts: number; range?: string | null } | null; duration_minutes?: number | null };
}) {
  const s = r?.split;
  if (!s) return null;
  const part = Math.max(1, Number(s.part_number || 1));
  const total = Math.max(part, Number(s.total_parts || part));
  const range = s.range ? String(s.range) : "";
  const approx =
    typeof r.duration_minutes === "number" && r.duration_minutes > 0 && total > 0
      ? `≈ ${Math.round(r.duration_minutes / total)} min`
      : null;
  return (
    <span className="kpill">
      Today: Part {part}/{total}
      {range ? ` — ${range}` : ""}
      {approx ? ` (${approx})` : ""}
    </span>
  );
}

export default function GoalPage({ params }: { params: { id: string } }) {
  const router = useRouter();

  // Browser TZ for diary saves
  const [tz, setTz] = useState<string>("America/Detroit");
  useEffect(() => {
    try {
      const guess = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (guess) setTz(guess);
    } catch {}
  }, []);

  const [goal, setGoal] = useState<any>(null);
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/goals/${params.id}`);
      if (!res.ok) {
        if (res.status === 401) router.push("/login");
        return;
      }
      const j = await res.json();
      setGoal(j.goal);
      setRoadmap(j.goal.roadmapJson as Roadmap);
      setCompletions(j.completions as Completion[]);
      setLoading(false);
    })();
  }, [params.id, router]);

  // ---- helpers that don’t use hooks ----
  const saveRoadmap = async () => {
    const res = await fetch(`/api/goals/${goal.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: goal.title, roadmap }),
    });
    if (!res.ok) alert("Save failed");
    else alert("Saved!");
  };

  const addResource = (di: number, section: "learn" | "practice") => {
    const title = prompt("Resource title");
    if (!title) return;
    const url = prompt("Resource URL");
    if (!url) return;
    const kind = (prompt('kind: "watch" | "listen" | "read"') || "read") as Resource["kind"];
    setRoadmap((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      next.days[di][section].push({
        kind,
        title,
        url,
        source: null,
        duration_minutes: null,
        split: null,
      });
      return next;
    });
  };

  const editResource = (di: number, section: "learn" | "practice", i: number) => {
    setRoadmap((prev) => {
      if (!prev) return prev;
      const r = prev.days[di][section][i];
      const title = prompt("New title", r.title) ?? r.title;
      const url = prompt("New URL", r.url) ?? r.url;
      const next = structuredClone(prev);
      next.days[di][section][i] = { ...r, title, url };
      return next;
    });
  };

  const deleteResource = (di: number, section: "learn" | "practice", i: number) => {
    setRoadmap((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      next.days[di][section].splice(i, 1);
      return next;
    });
  };

  const isCompleted = (d: number, section: "learn" | "practice" | "reflect", i: number) =>
    completions.some((c) => c.dayNumber === d && c.section === section && c.index === i);

  const completeQuest = async (
    dayNumber: number,
    section: "learn" | "practice" | "reflect",
    index: number,
    e?: React.MouseEvent
  ) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (isCompleted(dayNumber, section, index)) return;

    const res = await fetch(`/api/goals/${goal.id}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Roadmap-Ajax": "1" },
      body: JSON.stringify({ dayNumber, section, index }),
    });

    if (!res.ok) {
      let msg = "Could not mark complete";
      try {
        const j = await res.json();
        if (j?.error) msg = j.error;
      } catch {}
      alert(msg);
      return;
    }

    const j = await res.json();
    setCompletions((prev) => [...prev, { dayNumber, section, index }]);
    window.dispatchEvent(new Event("coins:refresh"));
    alert(`Quest completed! +${j.coinsAwarded} coins (total: ${j.totalCoins}) 🪙`);
  };

 const startToday = async (e?: React.MouseEvent) => {
  e?.preventDefault(); e?.stopPropagation();
  const tzHead = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const res = await fetch(`/api/goals/${goal.id}/start`, {
    method: "POST",
    headers: { "X-Roadmap-Ajax": "1", "X-Timezone": tzHead },
  });
  if (!res.ok) { alert("Could not start"); return; }
  const j = await res.json();
  setGoal((g: any) => ({ ...g, startDate: j.startDate }));
  alert("Starts today — reminders armed. Check Dashboard → Daily quests.");
};


  // ----- Diary helpers (no hooks) -----
  const [diaryDrafts, setDiaryDrafts] = useState<Record<string, string>>({});
  const [savedKeys, setSavedKeys] = useState<Record<string, number>>({});

  const diaryKeyFor = (day: number, section: "practice" | "reflect", index: number) =>
    `${goal?.id ?? "g"}-${day}-${section}-${index}`;

  const onDiaryChange = (key: string, v: string) =>
    setDiaryDrafts((prev) => ({ ...prev, [key]: v }));

  const markSavedFlash = (key: string) => {
    setSavedKeys((prev) => ({ ...prev, [key]: Date.now() }));
    setTimeout(() => {
      setSavedKeys((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }, 1500);
  };

  const saveDiary = async (dayNumber: number, section: "practice" | "reflect", index: number) => {
    const key = diaryKeyFor(dayNumber, section, index);
    const content = (diaryDrafts[key] || "").trim();
    if (!content) return;

    const res = await fetch("/api/diary", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Timezone": tz },
      body: JSON.stringify({
        goalId: goal.id,
        type: section,
        content,
        dayNumber,
      }),
    });

    if (!res.ok) {
      let msg = "Diary save failed";
      try {
        const j = await res.json();
        if (j?.error) msg = j.error;
      } catch {}
      alert(msg);
      return;
    }

    setDiaryDrafts((prev) => ({ ...prev, [key]: "" }));
    markSavedFlash(key);
  };

  const onDiaryKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    dayNumber: number,
    section: "practice" | "reflect",
    index: number
  ) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      saveDiary(dayNumber, section, index);
    }
  };

  const renderPracticeDiary = (d: Day, i: number) => {
    const key = diaryKeyFor(d.day, "practice", i);
    const val = diaryDrafts[key] ?? "";
    const justSaved = key in savedKeys;
    return (
      <div style={{ marginTop: 6 }}>
        <textarea
          placeholder="Diary: what did you practice/struggle with?"
          style={{ width: "100%", minHeight: 80 }}
          value={val}
          onChange={(e) => onDiaryChange(key, e.currentTarget.value)}
          onKeyDown={(e) => onDiaryKeyDown(e, d.day, "practice", i)}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
          <button
            type="button"
            className="btn"
            onClick={() => saveDiary(d.day, "practice", i)}
            disabled={!val.trim()}
            title="Ctrl/Cmd+Enter to save"
          >
            Save diary
          </button>
          {justSaved ? <span className="kpill">Saved!</span> : <small>Tip: Ctrl/Cmd+Enter to save</small>}
        </div>
      </div>
    );
  };

  const renderReflectDiary = (d: Day) => {
    const key = diaryKeyFor(d.day, "reflect", 0);
    const val = diaryDrafts[key] ?? "";
    const justSaved = key in savedKeys;
    return (
      <div style={{ marginTop: 6 }}>
        <textarea
          placeholder="Diary: quick reflection…"
          style={{ width: "100%", minHeight: 80 }}
          value={val}
          onChange={(e) => onDiaryChange(key, e.currentTarget.value)}
          onKeyDown={(e) => onDiaryKeyDown(e, d.day, "reflect", 0)}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
          <button
            type="button"
            className="btn"
            onClick={() => saveDiary(d.day, "reflect", 0)}
            disabled={!val.trim()}
            title="Ctrl/Cmd+Enter to save"
          >
            Save diary
          </button>
          {justSaved ? <span className="kpill">Saved!</span> : <small>Tip: Ctrl/Cmd+Enter to save</small>}
        </div>
      </div>
    );
  };

  // ✅ Plain const instead of useMemo (no conditional hooks issue)
  const dayOrder = (roadmap?.days ?? []).map((d) => d.day);

  // Early returns are fine now — no hooks follow below
  if (loading) {
    return (
      <main className="container">
        <div className="card">Loading…</div>
      </main>
    );
  }
  if (!goal || !roadmap) {
    return (
      <main className="container">
        <div className="card">Not found.</div>
      </main>
    );
  }

  return (
    <main className="container">
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h1 style={{ margin: 0 }}>{goal.title}</h1>
          <span className="kpill">{roadmap.total_days} days</span>
          <span className="kpill">≈ {roadmap.daily_minutes} min/day</span>
          {!goal.startDate && (
            <button type="button" className="btn" onClick={(e) => startToday(e)}>
              Start from today
            </button>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, margin: "8px 0" }}>
          <button type="button" className="btn" onClick={() => setEditMode((v) => !v)}>
            {editMode ? "Stop editing" : "Edit roadmap"}
          </button>
          {editMode && (
            <button type="button" className="btn" onClick={saveRoadmap}>
              Save changes
            </button>
          )}
        </div>

        {(roadmap.days ?? []).map((d, di) => (
          <article key={di} className="day">
            <h3>
              Day {d.day}: {d.title} <span className="badge">{d.minutes} min</span>
              {editMode && (
                <button
                  type="button"
                  className="btn"
                  style={{ marginLeft: 8 }}
                  onClick={() =>
                    setRoadmap((prev) => {
                      if (!prev) return prev;
                      const t = prompt("New day title", prev.days[di].title);
                      if (!t) return prev;
                      const next = structuredClone(prev);
                      next.days[di].title = t;
                      return next;
                    })
                  }
                >
                  Edit title
                </button>
              )}
            </h3>

            <h4>Learn</h4>
            <ul className="list">
              {d.learn.map((r, i) => (
                <li key={`L${di}-${i}`}>
                  <strong>[{r.kind}]</strong>{" "}
                  <a href={r.url} target="_blank" rel="noreferrer">
                    {r.title}
                  </a>
                  <SplitBadge r={r} />
                  <span className="kpill">+{COINS.learn} coins</span>
                  <button
                    type="button"
                    className="btn"
                    style={{ marginLeft: 8 }}
                    onClick={(e) => completeQuest(d.day, "learn", i, e)}
                    disabled={isCompleted(d.day, "learn", i)}
                  >
                    {isCompleted(d.day, "learn", i) ? "Completed" : "Complete"}
                  </button>
                  {editMode && (
                    <>
                      <button type="button" className="btn" style={{ marginLeft: 8 }} onClick={() => editResource(di, "learn", i)}>
                        Edit
                      </button>
                      <button type="button" className="btn" style={{ marginLeft: 8 }} onClick={() => deleteResource(di, "learn", i)}>
                        Delete
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
            {editMode && (
              <button type="button" className="btn" onClick={() => addResource(di, "learn")}>
                Add Learn resource
              </button>
            )}

            <h4>Practice</h4>
            <ul className="list">
              {d.practice.map((r, i) => (
                <li key={`P${di}-${i}`} style={{ marginBottom: 10 }}>
                  <strong>[{r.kind}]</strong>{" "}
                  <a href={r.url} target="_blank" rel="noreferrer">
                    {r.title}
                  </a>
                  <SplitBadge r={r} />
                  <span className="kpill">+{COINS.practice} coins</span>
                  <button
                    type="button"
                    className="btn"
                    style={{ marginLeft: 8 }}
                    onClick={(e) => completeQuest(d.day, "practice", i, e)}
                    disabled={isCompleted(d.day, "practice", i)}
                  >
                    {isCompleted(d.day, "practice", i) ? "Completed" : "Complete"}
                  </button>
                  {editMode && (
                    <>
                      <button type="button" className="btn" style={{ marginLeft: 8 }} onClick={() => editResource(di, "practice", i)}>
                        Edit
                      </button>
                      <button type="button" className="btn" style={{ marginLeft: 8 }} onClick={() => deleteResource(di, "practice", i)}>
                        Delete
                      </button>
                    </>
                  )}

                  {/* Practice diary box */}
                  {renderPracticeDiary(d, i)}
                </li>
              ))}
            </ul>
            {editMode && (
              <button type="button" className="btn" onClick={() => addResource(di, "practice")}>
                Add Practice resource
              </button>
            )}

            <h4>Reflect</h4>
            {!editMode ? (
              <div style={{ marginBottom: 6 }}>
                <p style={{ margin: 0 }}>
                  {d.reflect} <span className="kpill">+{COINS.reflect} coins</span>
                </p>
                <button
                  type="button"
                  className="btn"
                  style={{ marginLeft: 8, marginTop: 6 }}
                  onClick={(e) => completeQuest(d.day, "reflect", 0, e)}
                  disabled={isCompleted(d.day, "reflect", 0)}
                >
                  {isCompleted(d.day, "reflect", 0) ? "Completed" : "Mark Reflect Complete"}
                </button>
              </div>
            ) : (
              <div style={{ marginBottom: 6 }}>
                <textarea
                  style={{ width: "100%", minHeight: 90 }}
                  value={d.reflect}
                  onChange={(e) =>
                    setRoadmap((prev) => {
                      if (!prev) return prev;
                      const next = structuredClone(prev);
                      next.days[di].reflect = e.target.value;
                      return next;
                    })
                  }
                />
                <span className="kpill">+{COINS.reflect} coins</span>
                <button
                  type="button"
                  className="btn"
                  style={{ marginLeft: 8 }}
                  onClick={(e) => completeQuest(d.day, "reflect", 0, e)}
                  disabled={isCompleted(d.day, "reflect", 0)}
                >
                  {isCompleted(d.day, "reflect", 0) ? "Completed" : "Mark Reflect Complete"}
                </button>
              </div>
            )}

            {/* Reflect diary box */}
            {renderReflectDiary(d)}
          </article>
        ))}
      </div>
    </main>
  );
}
