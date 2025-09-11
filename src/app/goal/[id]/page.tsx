"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "../../../components/AppLayout";

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
  const [showAddResourceModal, setShowAddResourceModal] = useState(false);
  const [addResourceData, setAddResourceData] = useState<{
    dayIndex: number;
    section: "learn" | "practice";
    title: string;
    url: string;
    kind: Resource["kind"];
  }>({
    dayIndex: 0,
    section: "learn",
    title: "",
    url: "",
    kind: "read"
  });
  const [showCoinRewardModal, setShowCoinRewardModal] = useState(false);
  const [coinRewardData, setCoinRewardData] = useState<{
    coinsAwarded: number;
    totalCoins: number;
    questType: string;
  }>({
    coinsAwarded: 0,
    totalCoins: 0,
    questType: ""
  });

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
    setAddResourceData({
      dayIndex: di,
      section: section,
      title: "",
      url: "",
      kind: "read"
    });
    setShowAddResourceModal(true);
  };

  const handleAddResource = () => {
    if (!addResourceData.title || !addResourceData.url) return;
    
    setRoadmap((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      next.days[addResourceData.dayIndex][addResourceData.section].push({
        kind: addResourceData.kind,
        title: addResourceData.title,
        url: addResourceData.url,
        source: null,
        duration_minutes: null,
        split: null,
      });
      return next;
    });
    
    setShowAddResourceModal(false);
    setAddResourceData({
      dayIndex: 0,
      section: "learn",
      title: "",
      url: "",
      kind: "read"
    });
  };

  const editResource = (di: number, section: "learn" | "practice", i: number) => {
    setRoadmap((prev) => {
      if (!prev) return prev;
      const r = prev.days[di][section][i];
      const title = prompt("New title", r.title) ?? r.title;
      const url = prompt("New URL", r.url) ?? r.url;
      const next = structuredClone(prev);
      next.days[di][section][i] = { 
        kind: r.kind,
        title, 
        url,
        source: r.source,
        duration_minutes: r.duration_minutes,
        split: r.split,
        isAIGenerated: r.isAIGenerated,
        contentType: r.contentType
      };
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
      console.error('Quest completion failed:', msg, 'Status:', res.status);
      alert(`ERROR: ${msg} (Status: ${res.status})`);
      return;
    }

    const j = await res.json();
    setCompletions((prev) => [...prev, { dayNumber, section, index }]);
    
    // Dispatch coin refresh event with a small delay to ensure API has updated
    setTimeout(() => {
      console.log('Dispatching coins:refresh event from goal page');
    window.dispatchEvent(new Event("coins:refresh"));
    }, 100);
    
    // Show coin reward popup
    setCoinRewardData({
      coinsAwarded: j.coinsAwarded,
      totalCoins: j.totalCoins,
      questType: section.toUpperCase()
    });
    setShowCoinRewardModal(true);
    
    // Auto-hide popup after 5 seconds
    setTimeout(() => {
      setShowCoinRewardModal(false);
    }, 5000);
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
      <AppLayout activePage="goal">
        <div className="content-main" style={{ padding: "32px" }}>
        <div className="card">Loading…</div>
        </div>
      </AppLayout>
    );
  }
  
  if (!goal || !roadmap) {
    return (
      <AppLayout activePage="goal">
        <div className="content-main" style={{ padding: "32px" }}>
        <div className="card">Not found.</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout activePage="goal">
      <div className="content-main" style={{ padding: "32px" }}>
      {/* Header card */}
      <div className="card" style={{ background: "#FFF8E8" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
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

      {/* Days grid - New Modern Design */}
      <div
        style={{ 
          marginTop: 20, 
          display: "grid", 
          gap: 20, 
          gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
          width: "100%"
        }}
      >
        {(roadmap?.days ?? []).map((d, di) => {
          const isCompletedDay = (day: number) => {
            const learnCompleted = d.learn.every((_, i) => isCompleted(day, "learn", i));
            const practiceCompleted = d.practice.every((_, i) => isCompleted(day, "practice", i));
            const reflectCompleted = isCompleted(day, "reflect", 0);
            return learnCompleted && practiceCompleted && reflectCompleted;
          };

          const dayCompleted = isCompletedDay(d.day);
          const band = colorFromKey(di);
          
          return (
            <article 
              key={di} 
              style={{ 
                background: 'white',
                borderRadius: '16px',
                border: `2px solid ${dayCompleted ? '#10B981' : '#E5E7EB'}`,
                boxShadow: dayCompleted 
                  ? '0 8px 32px rgba(16, 185, 129, 0.15)' 
                  : '0 4px 16px rgba(0, 0, 0, 0.1)',
                overflow: "hidden",
                position: 'relative',
                transition: 'all 0.3s ease'
              }}
            >
              {/* Day header with gradient */}
              <div style={{ 
                background: `linear-gradient(135deg, ${band} 0%, ${band}CC 100%)`,
                padding: '20px',
                position: 'relative'
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    color: 'black',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    fontSize: '14px',
                    fontWeight: '700',
                    backdropFilter: 'blur(10px)'
                  }}>
                    Day {d.day}
                  </div>
                  <h3 style={{ 
                    margin: 0, 
                    color: 'black', 
                    fontSize: '14px', 
                    fontWeight: '600',
                    flex: 1,
                    minWidth: '200px'
                  }}>
                    {d.title}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      background: 'rgba(255, 255, 255, 0.2)',
                      color: 'black',
                      padding: '6px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '600',
                      backdropFilter: 'blur(10px)'
                    }}>
                      {d.minutes} min
                  </span>
                    {dayCompleted && (
                      <div style={{
                        background: 'rgba(16, 185, 129, 0.9)',
                        color: 'white',
                        padding: '6px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        ✓ Complete
                      </div>
                    )}
                  </div>
                </div>
                  {editMode && (
                    <button
                      type="button"
                    style={{
                      position: 'absolute',
                      top: '20px',
                      right: '20px',
                      background: 'rgba(255, 255, 255, 0.2)',
                      color: 'white',
                      border: 'none',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      backdropFilter: 'blur(10px)'
                    }}
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

              <div style={{ padding: '20px' }}>
                {/* LEARN Section */}
                <div style={{ 
                  background: 'white',
                  borderRadius: '12px', 
                  padding: '0',
                  marginBottom: '16px',
                  border: '1px solid #E5E7EB',
                  display: 'flex',
                  overflow: 'hidden'
                }}>
                  {/* Blue vertical bar */}
                  <div style={{
                    width: '6px',
                    background: '#3B82F6',
                    flexShrink: 0
                  }} />
                  
                  <div style={{ padding: '16px', flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <span style={{ fontSize: '16px' }}>🌱</span>
                      <span style={{ 
                        background: '#3B82F6', 
                        color: 'white', 
                        padding: '4px 8px', 
                        borderRadius: '8px', 
                        fontSize: '12px', 
                        fontWeight: '600' 
                      }}>
                        LEARN +{COINS.learn} coins
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {d.learn.map((r, i) => (
                        <div key={`L${di}-${i}`} style={{
                          background: 'white',
                          padding: '16px',
                          borderRadius: '12px',
                          border: '1px solid #E5E7EB',
                          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                          position: 'relative'
                        }}>
                          
                          {/* Day and Quest badges */}
                          <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                            <span style={{
                              background: '#8B5CF6',
                              color: 'white',
                              padding: '3px 8px',
                              borderRadius: '12px',
                              fontSize: '10px',
                              fontWeight: '600'
                            }}>
                              Day {d.day}
                            </span>
                            <span style={{
                              background: '#F3F4F6',
                              color: '#6B7280',
                              padding: '3px 8px',
                              borderRadius: '12px',
                              fontSize: '10px',
                              fontWeight: '600'
                            }}>
                              Quest #{i + 1}
                            </span>
                          </div>
                          
                          {/* Resource card */}
                          <div style={{
                            background: '#F8FAFC',
                            padding: '12px',
                            borderRadius: '8px',
                            border: '1px solid #E2E8F0',
                            marginBottom: '12px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                              <button style={{
                                background: '#374151',
                                color: 'white',
                                border: 'none',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                fontSize: '9px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                {r.kind === 'watch' ? '📺' : r.kind === 'listen' ? '🎧' : '📖'} {r.kind.toUpperCase()}
                              </button>
                              <a 
                                href={r.url} 
                                target="_blank" 
                                rel="noreferrer"
                                style={{
                                  background: '#3B82F6',
                                  color: 'white',
                                  border: 'none',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  fontSize: '10px',
                                  fontWeight: '500',
                                  textDecoration: 'none',
                                  cursor: 'pointer'
                                }}
                              >
                                View Resource
                              </a>
                              <span style={{
                                background: '#F3F4F6',
                                color: '#6B7280',
                                padding: '4px 8px',
                                borderRadius: '12px',
                                fontSize: '9px',
                                fontWeight: '500'
                              }}>
                                {r.duration_minutes || 7} min
                              </span>
                            </div>
                            <div style={{ 
                              fontSize: '13px', 
                              fontWeight: '600', 
                              color: '#1F2937',
                              lineHeight: '1.4'
                            }}>
                            {r.title}
                            </div>
                          </div>
                          
                          {/* Complete button and reward */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '12px', color: '#6B7280' }}>+{COINS.learn}</span>
                              <img src="/icons/coin.png" alt="coin" style={{ width: '14px', height: '14px' }} />
                            </div>
                          <button
                            type="button"
                              style={{
                                background: isCompleted(d.day, "learn", i) ? '#10B981' : '#6A3EE8',
                                color: 'white',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: '600',
                                fontFamily: 'inherit',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                              }}
                            onClick={(e) => completeQuest(d.day, "learn", i, e)}
                            disabled={isCompleted(d.day, "learn", i)}
                          >
                              {isCompleted(d.day, "learn", i) ? "✓ COMPLETE" : "COMPLETE"}
                          </button>
                          </div>
                          
                          {editMode && (
                            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                              <button 
                                style={{
                                  background: 'transparent',
                                  color: '#6B7280',
                                  border: '1px solid #D1D5DB',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  fontSize: '10px',
                                  cursor: 'pointer'
                                }}
                                onClick={() => editResource(di, "learn", i)}
                              >
                                Edit
                              </button>
                              <button 
                                style={{
                                  background: 'transparent',
                                  color: '#DC2626',
                                  border: '1px solid #FECACA',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  fontSize: '10px',
                                  cursor: 'pointer'
                                }}
                                onClick={() => deleteResource(di, "learn", i)}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                    ))}
                    </div>
                  {editMode && (
                      <button 
                        type="button" 
                        style={{
                          background: 'transparent',
                          color: '#3B82F6',
                          border: '1px dashed #3B82F6',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          marginTop: '8px',
                          width: '100%'
                        }}
                        onClick={() => addResource(di, "learn")}
                      >
                      + Add Learn resource
                    </button>
                  )}
                  </div>
                </div>

                {/* PRACTICE Section */}
                <div style={{ 
                  background: 'white',
                  borderRadius: '12px', 
                  padding: '0',
                  marginBottom: '16px',
                  border: '1px solid #E5E7EB',
                  display: 'flex',
                  overflow: 'hidden'
                }}>
                  {/* Green vertical bar */}
                  <div style={{
                    width: '6px',
                    background: '#10B981',
                    flexShrink: 0
                  }} />
                  
                  <div style={{ padding: '16px', flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <span style={{ fontSize: '16px' }}>🛠️</span>
                      <span style={{ 
                        background: '#10B981', 
                        color: 'white', 
                        padding: '4px 8px', 
                        borderRadius: '8px', 
                        fontSize: '12px', 
                        fontWeight: '600' 
                      }}>
                        PRACTICE +{COINS.practice} coins
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {d.practice.map((r, i) => (
                        <div key={`P${di}-${i}`} style={{
                          background: 'white',
                          padding: '20px',
                          borderRadius: '12px',
                          border: '1px solid #E5E7EB',
                          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                          position: 'relative'
                        }}>
                          {/* Quest category */}
                          <div style={{ 
                            fontSize: '14px', 
                            fontWeight: '600', 
                            color: '#1F2937',
                            marginBottom: '12px'
                          }}>
                            PRACTICE
                          </div>
                          
                          {/* Day and Quest badges */}
                          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                            <span style={{
                              background: '#000000',
                              color: 'white',
                              padding: '3px 8px',
                              borderRadius: '12px',
                              fontSize: '10px',
                              fontWeight: '600'
                            }}>
                              Day {d.day}
                            </span>
                            <span style={{
                              background: '#F3F4F6',
                              color: '#6B7280',
                              padding: '3px 8px',
                              borderRadius: '12px',
                              fontSize: '10px',
                              fontWeight: '600'
                            }}>
                              Quest #{i + 1}
                            </span>
                          </div>
                          
                          {/* Resource card */}
                          <div style={{
                            background: '#F8FAFC',
                            padding: '12px',
                            borderRadius: '8px',
                            border: '1px solid #E2E8F0',
                            marginBottom: '12px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                              <button style={{
                                background: '#374151',
                                color: 'white',
                                border: 'none',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                fontSize: '9px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                {r.kind === 'watch' ? '📺' : r.kind === 'listen' ? '🎧' : '📖'} {r.kind.toUpperCase()}
                              </button>
                              <a 
                                href={r.url} 
                                target="_blank" 
                                rel="noreferrer"
                                style={{
                                  background: '#3B82F6',
                                  color: 'white',
                                  border: 'none',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  fontSize: '10px',
                                  fontWeight: '500',
                                  textDecoration: 'none',
                                  cursor: 'pointer'
                                }}
                              >
                                View Resource
                              </a>
                              <span style={{
                                background: '#F3F4F6',
                                color: '#6B7280',
                                padding: '4px 8px',
                                borderRadius: '12px',
                                fontSize: '9px',
                                fontWeight: '500'
                              }}>
                                {r.duration_minutes || 7} min
                              </span>
                            </div>
                            <div style={{ 
                              fontSize: '13px', 
                              fontWeight: '600', 
                              color: '#1F2937',
                              lineHeight: '1.4'
                            }}>
                            {r.title}
                            </div>
                          </div>
                          
                          {/* Complete button and reward */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '14px', color: '#6B7280' }}>+{COINS.practice}</span>
                              <span style={{ fontSize: '16px' }}>🪙</span>
                            </div>
                          <button
                            type="button"
                              style={{
                                background: isCompleted(d.day, "practice", i) ? '#10B981' : '#6A3EE8',
                                color: 'white',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: '600',
                                fontFamily: 'inherit',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                              }}
                            onClick={(e) => completeQuest(d.day, "practice", i, e)}
                            disabled={isCompleted(d.day, "practice", i)}
                          >
                              {isCompleted(d.day, "practice", i) ? "✓ COMPLETE" : "COMPLETE"}
                          </button>
                          </div>
                          
                          {/* Practice diary */}
                          <div style={{ marginTop: '16px' }}>{renderPracticeDiary(d, i)}</div>
                          
                          {editMode && (
                            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                              <button 
                                style={{
                                  background: 'transparent',
                                  color: '#6B7280',
                                  border: '1px solid #D1D5DB',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  fontSize: '10px',
                                  cursor: 'pointer'
                                }}
                                onClick={() => editResource(di, "practice", i)}
                              >
                                Edit
                              </button>
                              <button 
                                style={{
                                  background: 'transparent',
                                  color: '#DC2626',
                                  border: '1px solid #FECACA',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  fontSize: '10px',
                                  cursor: 'pointer'
                                }}
                                onClick={() => deleteResource(di, "practice", i)}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                    ))}
                    </div>
                  {editMode && (
                      <button 
                        type="button" 
                        style={{
                          background: 'transparent',
                          color: '#10B981',
                          border: '1px dashed #10B981',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          marginTop: '8px',
                          width: '100%'
                        }}
                        onClick={() => addResource(di, "practice")}
                      >
                      + Add Practice resource
                    </button>
                  )}
                  </div>
                </div>

                {/* REFLECT Section */}
                <div style={{ 
                  background: 'white',
                  borderRadius: '12px', 
                  padding: '0',
                  border: '1px solid #E5E7EB',
                  display: 'flex',
                  overflow: 'hidden'
                }}>
                  {/* Orange vertical bar */}
                  <div style={{
                    width: '6px',
                    background: '#F59E0B',
                    flexShrink: 0
                  }} />
                  
                  <div style={{ padding: '16px', flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <span style={{ fontSize: '16px' }}>💭</span>
                      <span style={{ 
                        background: '#F59E0B', 
                        color: 'white', 
                        padding: '4px 8px', 
                        borderRadius: '8px', 
                        fontSize: '12px', 
                        fontWeight: '600' 
                      }}>
                        REFLECT +{COINS.reflect} coins
                      </span>
                    </div>

                    <div style={{
                      background: 'white',
                      padding: '20px',
                      borderRadius: '12px',
                      border: '1px solid #E5E7EB',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                      position: 'relative'
                    }}>
                      {/* Goal name at top */}
                      <div style={{ 
                        fontSize: '18px', 
                        fontWeight: '700', 
                        color: '#1F2937',
                        marginBottom: '8px'
                      }}>
                        {goal.title}
                      </div>
                      
                      {/* Quest category */}
                      <div style={{ 
                        fontSize: '14px', 
                        fontWeight: '600', 
                        color: '#1F2937',
                        marginBottom: '12px'
                      }}>
                        REFLECT
                      </div>
                      
                      {/* Day and Quest badges */}
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                        <span style={{
                          background: '#000000',
                          color: 'white',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '10px',
                          fontWeight: '600'
                        }}>
                          Day {d.day}
                        </span>
                        <span style={{
                          background: '#F3F4F6',
                          color: '#6B7280',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '10px',
                          fontWeight: '600'
                        }}>
                          Quest #1
                        </span>
                    </div>
                      
                      {/* Resource card */}
                      <div style={{
                        background: '#FFFBEB',
                        padding: '16px',
                        borderRadius: '8px',
                        border: '1px solid #FED7AA',
                        marginBottom: '16px'
                      }}>
                        <div style={{ 
                          fontSize: '16px', 
                          fontWeight: '700', 
                          color: '#1F2937',
                          lineHeight: '1.4'
                        }}>
                          {!editMode ? d.reflect : (
                      <textarea
                              style={{ 
                                width: "100%", 
                                minHeight: 90,
                                padding: '12px',
                                borderRadius: '8px',
                                border: '1px solid #D1D5DB',
                                fontSize: '12px',
                                fontFamily: 'inherit',
                                resize: 'vertical',
                                background: 'white'
                              }}
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
                          )}
                        </div>
                      </div>
                      
                      {/* Complete button and reward */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '14px', color: '#6B7280' }}>+{COINS.reflect}</span>
                          <span style={{ fontSize: '16px' }}>🪙</span>
                        </div>
                      <button
                        type="button"
                          style={{
                            background: isCompleted(d.day, "reflect", 0) ? '#10B981' : '#6A3EE8',
                            color: 'white',
                            border: 'none',
                            padding: '12px 24px',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: '600',
                            fontFamily: 'inherit',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                        onClick={(e) => completeQuest(d.day, "reflect", 0, e)}
                        disabled={isCompleted(d.day, "reflect", 0)}
                      >
                          {isCompleted(d.day, "reflect", 0) ? "✓ COMPLETE" : "COMPLETE"}
                      </button>
                    </div>

                  {/* Reflect diary */}
                      <div style={{ marginTop: '16px' }}>{renderReflectDiary(d)}</div>
                    </div>
                  </div>
                </div>

                {/* Quiz Section */}
                {(d as any).quiz && (d as any).quiz.length > 0 && (
                  <div style={{ 
                    background: '#F3E8FF',
                    borderLeft: '4px solid #8B5CF6',
                    padding: '20px',
                    marginTop: '16px',
                    borderRadius: '8px'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px',
                      marginBottom: '16px'
                    }}>
                      <span style={{ fontSize: '18px' }}>🧠</span>
                      <h4 style={{ 
                        margin: 0, 
                        fontSize: '16px', 
                        fontWeight: '700', 
                        color: '#7C3AED',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Daily Quiz
                      </h4>
                    </div>
                    
                    <p style={{ 
                      margin: '0 0 16px 0', 
                      fontSize: '14px', 
                      color: '#6B7280' 
                    }}>
                      Test your knowledge! Score 50% or higher to unlock the next day.
                    </p>
                    
                    <div style={{ marginBottom: '20px' }}>
                      {(d as any).quiz.map((question: any, idx: number) => (
                        <div key={idx} style={{
                          marginBottom: '20px',
                          padding: '16px',
                          background: 'white',
                          borderRadius: '8px',
                          border: '1px solid #E5E7EB'
                        }}>
                          <h6 style={{
                            fontSize: '16px',
                            fontWeight: '600',
                            color: '#1F2937',
                            margin: '0 0 12px 0'
                          }}>
                            {idx + 1}. {question.question}
                          </h6>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {Object.entries(question.options).map(([key, value]) => (
                              <label key={key} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s ease'
                              }}>
                                <input 
                                  type="radio" 
                                  name={`quiz-${d.day}-${idx}`} 
                                  value={key}
                                  style={{ margin: 0 }}
                                />
                                <span>{key}. {String(value)}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <button style={{
                      background: '#6A3EE8',
                      color: 'white',
                      border: 'none',
                      padding: '12px 24px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s ease'
                    }}>
                      Submit Quiz
                    </button>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
      </div>

      {/* Add Resource Modal */}
      {showAddResourceModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            width: '90%',
            maxWidth: '500px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
            border: '1px solid #E5E7EB'
          }}>
            <h2 style={{
              margin: '0 0 20px 0',
              fontSize: '20px',
              fontWeight: '700',
              color: '#1F2937'
            }}>
              Add New Resource
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Resource Title */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '6px'
                }}>
                  Resource Title
                </label>
                <input
                  type="text"
                  value={addResourceData.title}
                  onChange={(e) => setAddResourceData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter resource title"
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    fontSize: '14px',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              {/* Resource URL */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '6px'
                }}>
                  Resource URL
                </label>
                <input
                  type="url"
                  value={addResourceData.url}
                  onChange={(e) => setAddResourceData(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://example.com"
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    fontSize: '14px',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              {/* Resource Kind */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '6px'
                }}>
                  Resource Type
                </label>
                <select
                  value={addResourceData.kind}
                  onChange={(e) => setAddResourceData(prev => ({ ...prev, kind: e.target.value as Resource["kind"] }))}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    background: 'white'
                  }}
                >
                  <option value="read">📖 Read</option>
                  <option value="watch">📺 Watch</option>
                  <option value="listen">🎧 Listen</option>
                </select>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{
              display: 'flex',
              gap: '12px',
              marginTop: '24px',
              justifyContent: 'flex-end'
            }}>
              <button
                type="button"
                onClick={() => setShowAddResourceModal(false)}
                style={{
                  background: 'transparent',
                  color: '#6B7280',
                  border: '1px solid #D1D5DB',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontFamily: 'inherit'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddResource}
                disabled={!addResourceData.title || !addResourceData.url}
                style={{
                  background: addResourceData.title && addResourceData.url ? '#6A3EE8' : '#9CA3AF',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: addResourceData.title && addResourceData.url ? 'pointer' : 'not-allowed',
                  fontFamily: 'inherit'
                }}
              >
                Add Resource
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Coin Reward Modal */}
      {showCoinRewardModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            width: '90%',
            maxWidth: '400px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
            border: '1px solid #E5E7EB',
            textAlign: 'center'
          }}>
            {/* Success Icon */}
            <div style={{
              fontSize: '48px',
              marginBottom: '16px'
            }}>
              🎉
            </div>

            {/* Quest Completed Text */}
            <h2 style={{
              margin: '0 0 8px 0',
              fontSize: '20px',
              fontWeight: '700',
              color: '#1F2937'
            }}>
              Quest Completed!
            </h2>

            {/* Quest Type */}
            <p style={{
              margin: '0 0 20px 0',
              fontSize: '16px',
              color: '#6B7280',
              fontWeight: '500'
            }}>
              {coinRewardData.questType} Quest
            </p>

            {/* Coin Reward */}
            <div style={{
              background: '#F9FAFB',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '20px',
              border: '1px solid #E5E7EB'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginBottom: '8px'
              }}>
                <img src="/icons/coin.png" alt="coin" style={{ width: '20px', height: '20px' }} />
                <span style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  color: '#1F2937'
                }}>
                  +{coinRewardData.coinsAwarded}
                </span>
              </div>
              <p style={{
                margin: 0,
                fontSize: '14px',
                color: '#6B7280',
                fontWeight: '500'
              }}>
                Total: {coinRewardData.totalCoins} coins
              </p>
            </div>

            {/* Action Button */}
            <div style={{
              display: 'flex',
              justifyContent: 'center'
            }}>
              <button
                type="button"
                onClick={() => setShowCoinRewardModal(false)}
                style={{
                  background: '#6A3EE8',
                  color: 'white',
                  border: 'none',
                  padding: '10px 24px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontFamily: 'inherit'
                }}
              >
                Awesome!
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
