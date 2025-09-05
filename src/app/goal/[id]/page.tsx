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

type Day = {
  day: number;
  title: string;
  minutes: number;
  learn: Resource[];
  practice: Resource[];
  reflect: string;
};

type Roadmap = { goal: string; total_days: number; daily_minutes: number; days: Day[] };

type Completion = { dayNumber: number; section: "learn" | "practice" | "reflect"; index: number };

const CARD_COLORS = ["#FFD1A1", "#C6F1DA", "#9FD6FF", "#FFB3C7", "#C8B6FF", "#FFE6A7"];
const SECTION_META: Record<
  "learn" | "practice" | "reflect",
  { label: string; icon: string; tint: string }
> = {
  learn: { label: "LEARN", icon: "📚", tint: "#EAF7FF" },
  practice: { label: "PRACTICE", icon: "🛠️", tint: "#EFFFF1" },
  reflect: { label: "REFLECT", icon: "💭", tint: "#FFF3F5" },
};

function colorFromKey(n: number) {
  return CARD_COLORS[n % CARD_COLORS.length];
}

function SplitBadge({
  r,
}: {
  r: { split?: { part_number: number; total_parts: number; range?: string | null }; duration_minutes?: number | null };
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
  const [tz, setTz] = useState<string>("UTC");
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

  // ---- helpers (no React hooks inside) ----
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
    alert(`Quest completed! +${j.coinsAwarded} coins (total: ${j.totalCoins})`);
  };

  const startToday = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    const tzHead = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const res = await fetch(`/api/goals/${goal.id}/start`, {
      method: "POST",
      headers: { "X-Roadmap-Ajax": "1", "X-Timezone": tzHead },
    });
    if (!res.ok) {
      alert("Could not start");
      return;
    }
    const j = await res.json();
    setGoal((g: any) => ({ ...g, startDate: j.startDate }));
    alert("Starts today — reminders armed. Check Dashboard → Daily quests.");
  };

  // ----- Diary helpers -----
  const [diaryDrafts, setDiaryDrafts] = useState<Record<string, string>>({});
  const [savedKeys, setSavedKeys] = useState<Record<string, number>>({});

  const diaryKeyFor = (day: number, section: "practice" | "reflect", index: number) =>
    `${goal?.id ?? "g"}-${day}-${section}-${index}`;

  const onDiaryChange = (key: string, v: string) => setDiaryDrafts((prev) => ({ ...prev, [key]: v }));

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
      body: JSON.stringify({ goalId: goal.id, type: section, content, dayNumber }),
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
          style={{ width: "100%", minHeight: 90 }}
          value={val}
          onChange={(e) => onDiaryChange(key, e.currentTarget.value)}
          onKeyDown={(e) => onDiaryKeyDown(e, d.day, "practice", i)}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
          <button
            type="button"
            className="btn"
            onClick={() => saveDiary(d.day, "practice", i)}
            disabled={!val.trim()}
            title="Ctrl/Cmd+Enter to save"
          >
            Save diary
          </button>
          {justSaved ? <span className="kpill">Saved!</span> : <small className="meta">Tip: Ctrl/Cmd+Enter</small>}
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
          style={{ width: "100%", minHeight: 90 }}
          value={val}
          onChange={(e) => onDiaryChange(key, e.currentTarget.value)}
          onKeyDown={(e) => onDiaryKeyDown(e, d.day, "reflect", 0)}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
          <button
            type="button"
            className="btn"
            onClick={() => saveDiary(d.day, "reflect", 0)}
            disabled={!val.trim()}
            title="Ctrl/Cmd+Enter to save"
          >
            Save diary
          </button>
          {justSaved ? <span className="kpill">Saved!</span> : <small className="meta">Tip: Ctrl/Cmd+Enter</small>}
        </div>
      </div>
    );
  };

  // ✅ Plain const instead of useMemo (avoids “rendered more hooks” pitfalls)
  const dayOrder = (roadmap?.days ?? []).map((d) => d.day);

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
      {/* Header card */}
      <div className="card" style={{ background: "#FFF8E8" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 28 }}>🐾</span>
          <h1 style={{ margin: 0 }}>{goal.title}</h1>
          <span className="kpill">{roadmap.total_days} days</span>
          <span className="kpill">≈ {roadmap.daily_minutes} min/day</span>
          {!goal.startDate && (
            <button type="button" className="btn" onClick={startToday} style={{ marginLeft: "auto" }}>
              Start from today
            </button>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button type="button" className="btn" onClick={() => setEditMode((v) => !v)}>
            {editMode ? "Stop editing" : "Edit roadmap"}
          </button>
          {editMode && (
            <button type="button" className="btn" onClick={saveRoadmap}>
              Save changes
            </button>
          )}
          <a className="btn-ghost" href="/dashboard" style={{ marginLeft: "auto" }}>
            ← Back to dashboard
          </a>
        </div>
      </div>

      {/* Days grid */}
      <div
        className="grid"
        style={{ marginTop: 12, display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))" }}
      >
        {(roadmap.days ?? []).map((d, di) => {
          const band = colorFromKey(di);
          return (
            <article key={di} className="card" style={{ overflow: "hidden" }}>
              <div className="band" style={{ height: 8, background: band }} />
              <div style={{ padding: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span className="kpill" style={{ background: band, borderColor: "#00000022" }}>
                    Day {d.day}
                  </span>
                  <strong style={{ fontSize: 16 }}>{d.title}</strong>
                  <span className="kpill">{d.minutes} min</span>
                  {editMode && (
                    <button
                      type="button"
                      className="btn-ghost"
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
                </div>

                {/* LEARN */}
                <section className="quest-card" style={{ background: SECTION_META.learn.tint, marginTop: 12 }}>
                  <header style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="kpill">📚 {SECTION_META.learn.label}</span>
                    <span className="kpill">+{COINS.learn} coins</span>
                  </header>

                  <ul className="list" style={{ marginTop: 8 }}>
                    {d.learn.map((r, i) => (
                      <li key={`L${di}-${i}`}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <strong>[{r.kind}]</strong>
                          <a href={r.url} target="_blank" rel="noreferrer">
                            {r.title}
                          </a>
                          <SplitBadge r={r} />
                          <button
                            type="button"
                            className="btn"
                            onClick={(e) => completeQuest(d.day, "learn", i, e)}
                            disabled={isCompleted(d.day, "learn", i)}
                            style={{ marginLeft: "auto" }}
                          >
                            {isCompleted(d.day, "learn", i) ? "Completed" : "Complete"}
                          </button>
                          {editMode && (
                            <>
                              <button className="btn-ghost" onClick={() => editResource(di, "learn", i)}>
                                Edit
                              </button>
                              <button className="btn-ghost" onClick={() => deleteResource(di, "learn", i)}>
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                  {editMode && (
                    <button type="button" className="btn-ghost" onClick={() => addResource(di, "learn")}>
                      + Add Learn resource
                    </button>
                  )}
                </section>

                {/* PRACTICE */}
                <section className="quest-card" style={{ background: SECTION_META.practice.tint, marginTop: 12 }}>
                  <header style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="kpill">🛠️ {SECTION_META.practice.label}</span>
                    <span className="kpill">+{COINS.practice} coins</span>
                  </header>

                  <ul className="list" style={{ marginTop: 8 }}>
                    {d.practice.map((r, i) => (
                      <li key={`P${di}-${i}`} style={{ marginBottom: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <strong>[{r.kind}]</strong>
                          <a href={r.url} target="_blank" rel="noreferrer">
                            {r.title}
                          </a>
                          <SplitBadge r={r} />
                          <button
                            type="button"
                            className="btn"
                            onClick={(e) => completeQuest(d.day, "practice", i, e)}
                            disabled={isCompleted(d.day, "practice", i)}
                            style={{ marginLeft: "auto" }}
                          >
                            {isCompleted(d.day, "practice", i) ? "Completed" : "Complete"}
                          </button>
                          {editMode && (
                            <>
                              <button className="btn-ghost" onClick={() => editResource(di, "practice", i)}>
                                Edit
                              </button>
                              <button className="btn-ghost" onClick={() => deleteResource(di, "practice", i)}>
                                Delete
                              </button>
                            </>
                          )}
                        </div>

                        {/* Practice diary */}
                        <div>{renderPracticeDiary(d, i)}</div>
                      </li>
                    ))}
                  </ul>
                  {editMode && (
                    <button type="button" className="btn-ghost" onClick={() => addResource(di, "practice")}>
                      + Add Practice resource
                    </button>
                  )}
                </section>

                {/* REFLECT */}
                <section className="quest-card" style={{ background: SECTION_META.reflect.tint, marginTop: 12 }}>
                  <header style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="kpill">💭 {SECTION_META.reflect.label}</span>
                    <span className="kpill">+{COINS.reflect} coins</span>
                  </header>

                  {!editMode ? (
                    <div style={{ marginTop: 8 }}>
                      <p style={{ margin: 0 }}>{d.reflect}</p>
                      <button
                        type="button"
                        className="btn"
                        style={{ marginTop: 8 }}
                        onClick={(e) => completeQuest(d.day, "reflect", 0, e)}
                        disabled={isCompleted(d.day, "reflect", 0)}
                      >
                        {isCompleted(d.day, "reflect", 0) ? "Completed" : "Mark Reflect Complete"}
                      </button>
                    </div>
                  ) : (
                    <div style={{ marginTop: 8 }}>
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
                      <button
                        type="button"
                        className="btn"
                        style={{ marginTop: 8 }}
                        onClick={(e) => completeQuest(d.day, "reflect", 0, e)}
                        disabled={isCompleted(d.day, "reflect", 0)}
                      >
                        {isCompleted(d.day, "reflect", 0) ? "Completed" : "Mark Reflect Complete"}
                      </button>
                    </div>
                  )}

                  {/* Reflect diary */}
                  <div style={{ marginTop: 8 }}>{renderReflectDiary(d)}</div>
                </section>
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}
