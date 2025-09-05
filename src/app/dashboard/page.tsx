"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const COINS = { learn: 5, practice: 10, reflect: 5 } as const;

type SplitT = { total_parts: number; part_number: number; range?: string | null } | null;

type DailyItem = {
  goalId: string;
  goalTitle: string;
  dayNumber: number;
  section: "learn" | "practice" | "reflect";
  index: number;
  kind?: "watch" | "listen" | "read";
  title?: string;
  url?: string;
  duration_minutes?: number | null;
  split?: SplitT;
  reflectText?: string;
  completed?: boolean;
};

type DailyPayload = { date: string; items: DailyItem[]; tz?: string };

type GoalListItem = {
  id: string;
  title: string;
  createdAt: string;
  startDate: string | null;
};

function SplitBadge({ r }: { r: { split?: SplitT; duration_minutes?: number | null } }) {
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

export default function Dashboard() {
  const router = useRouter();

  // Browser time zone (IANA)
  const [tz, setTz] = useState<string>("America/Detroit");
  useEffect(() => {
    try {
      const guess = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (guess) setTz(guess);
    } catch {}
  }, []);
// after you setTz(guess)
useEffect(() => {
  try {
    const guess = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (guess) {
      setTz(guess);
      // NEW: tell the server our TZ so reminders use it
      fetch("/api/me/tz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tz: guess }),
      });
    }
  } catch {}
}, []);

  // GOALS state
  const [goalsLoading, setGoalsLoading] = useState(true);
  const [goalsErr, setGoalsErr] = useState<string | null>(null);
  const [goals, setGoals] = useState<GoalListItem[]>([]);

  // DAILY state
  const [dailyLoading, setDailyLoading] = useState(true);
  const [dailyErr, setDailyErr] = useState<string | null>(null);
  const [daily, setDaily] = useState<DailyPayload | null>(null);

  // Diary local state: drafts + “saved” flash
  const [diaryDrafts, setDiaryDrafts] = useState<Record<string, string>>({});
  const [savedKeys, setSavedKeys] = useState<Record<string, number>>({}); // key -> timestamp

  const startedCount = useMemo(() => goals.filter((g) => !!g.startDate).length, [goals]);

  const loadGoals = async () => {
    setGoalsLoading(true);
    setGoalsErr(null);
    try {
      const res = await fetch("/api/goals", { cache: "no-store" });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) throw new Error("Failed to load goals");
      const j = await res.json();
      const list: GoalListItem[] = Array.isArray(j) ? j : (j?.goals ?? []);
      setGoals(list);
    } catch (e: any) {
      setGoalsErr(e?.message || "Failed to load goals");
      setGoals([]);
    } finally {
      setGoalsLoading(false);
    }
  };

  const loadDaily = async () => {
    setDailyLoading(true);
    setDailyErr(null);
    try {
      // No query param; server uses “today” in X-Timezone
      const res = await fetch(`/api/daily`, { cache: "no-store", headers: { "X-Timezone": tz } });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const ctype = res.headers.get("content-type") || "";
      if (!res.ok || !ctype.includes("application/json")) {
        setDailyErr("Failed to load daily quests");
        setDaily({ date: "", items: [], tz });
        return;
      }
      const j = (await res.json()) as DailyPayload;
      setDaily(j);
    } catch {
      setDailyErr("Network error while loading daily quests");
      setDaily({ date: "", items: [], tz });
    } finally {
      setDailyLoading(false);
    }
  };

  useEffect(() => {
    loadGoals();
  }, []); // mount

  useEffect(() => {
    if (startedCount > 0) {
      loadDaily();
    } else {
      setDaily({ date: "", items: [], tz });
      setDailyLoading(false);
      setDailyErr(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startedCount, tz]);

  const items = useMemo(() => {
    if (!daily?.items) return [];
    const order: Record<DailyItem["section"], number> = { learn: 0, practice: 1, reflect: 2 };
    return [...daily.items].sort((a, b) => {
      const g = a.goalTitle.localeCompare(b.goalTitle);
      if (g) return g;
      if (a.dayNumber !== b.dayNumber) return a.dayNumber - b.dayNumber;
      return order[a.section] - order[b.section] || a.index - b.index;
    });
  }, [daily]);

  const isCompleted = (it: DailyItem) => !!it.completed;

  const completeQuest = async (it: DailyItem, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (isCompleted(it)) return;

    const res = await fetch(`/api/goals/${it.goalId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Roadmap-Ajax": "1" },
      body: JSON.stringify({ dayNumber: it.dayNumber, section: it.section, index: it.index }),
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
    setDaily((prev) => {
      if (!prev) return prev;
      return { ...prev, items: prev.items.map((x) => (x === it ? { ...x, completed: true } : x)) };
    });
    window.dispatchEvent(new Event("coins:refresh"));
    alert(`Quest completed! +${j.coinsAwarded} coins (total: ${j.totalCoins})`);
  };

  // ---- Diary helpers ----
  const diaryKeyFor = (it: DailyItem) => `${it.goalId}-${it.dayNumber}-${it.section}-${it.index}`;

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

  const saveDiary = async (it: DailyItem) => {
    const key = diaryKeyFor(it);
    const content = (diaryDrafts[key] || "").trim();
    if (!content) return;

    const res = await fetch("/api/diary", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Timezone": tz },
      body: JSON.stringify({
        goalId: it.goalId,
        type: it.section === "practice" ? "practice" : "reflect",
        content,
        dayNumber: it.dayNumber,
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

  const onDiaryKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, it: DailyItem) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      saveDiary(it);
    }
  };

  const renderDiaryBox = (it: DailyItem) => {
    if (!(it.section === "practice" || it.section === "reflect")) return null;
    const key = diaryKeyFor(it);
    const placeholder =
      it.section === "practice" ? "Diary: what did you practice/struggle with?" : "Diary: quick reflection…";
    const val = diaryDrafts[key] ?? "";
    const justSaved = key in savedKeys;

    return (
      <div style={{ marginTop: 6 }}>
        <textarea
          placeholder={placeholder}
          style={{ width: "100%", minHeight: 80 }}
          value={val}
          onChange={(e) => onDiaryChange(key, e.currentTarget.value)}
          onKeyDown={(e) => onDiaryKeyDown(e, it)}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
          <button
            type="button"
            className="btn"
            onClick={() => saveDiary(it)}
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

const startGoal = async (g: GoalListItem) => {
  const tzHead = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const res = await fetch(`/api/goals/${g.id}/start`, {
    method: "POST",
    headers: { "X-Roadmap-Ajax": "1", "X-Timezone": tzHead },
  });
  if (!res.ok) { alert("Could not start goal"); return; }
  const j = await res.json();
  setGoals((prev) => prev.map((x) => (x.id === g.id ? { ...x, startDate: j.startDate } : x)));
  await loadDaily();
  // Optionally toast: “Reminders armed for today”
};


  const viewGoal = (g: GoalListItem) => router.push(`/goal/${g.id}`);

  const deleteGoal = async (g: GoalListItem) => {
    if (!confirm(`Delete goal "${g.title}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/goals/${g.id}`, { method: "DELETE", headers: { "X-Roadmap-Ajax": "1" } });
    if (!res.ok) {
      let msg = "Delete failed";
      try {
        const j = await res.json();
        if (j?.error) msg = j.error;
      } catch {}
      alert(msg);
      return;
    }
    setGoals((prev) => prev.filter((x) => x.id !== g.id));
    await loadDaily();
  };

  return (
    <main className="container">
      <div className="card">

        {/* ---- GOALS ---- */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h1 style={{ margin: 0 }}>Goals</h1>
        </div>

        {goalsLoading && <p style={{ marginTop: 10 }}>Loading goals…</p>}
        {goalsErr && (
          <div
            style={{
              marginTop: 12,
              padding: "10px 12px",
              border: "1px solid #5a1a1a",
              background: "#2a0f0f",
              color: "#ffb3b3",
              borderRadius: 8,
            }}
          >
            {goalsErr}
          </div>
        )}

        {!goalsLoading && !goalsErr && goals.length === 0 && (
          <p style={{ marginTop: 10 }}>No goals yet. Generate a roadmap on the Generator page to get started.</p>
        )}

        <ul className="list" style={{ marginTop: 10 }}>
          {goals.map((g) => (
            <li key={g.id}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <strong>{g.title}</strong>
                {g.startDate ? (
                  <span className="kpill">Started: {new Date(g.startDate).toISOString().slice(0, 10)}</span>
                ) : (
                  <span className="kpill">Not started</span>
                )}
                <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                  <button type="button" className="btn" onClick={() => viewGoal(g)}>View</button>
                  {!g.startDate && (
                    <button type="button" className="btn" onClick={() => startGoal(g)}>Start from today</button>
                  )}
                  <button type="button" className="btn" onClick={() => deleteGoal(g)}>Delete</button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <hr style={{ margin: "16px 0", borderColor: "#333" }} />

        {/* ---- DAILY QUESTS (Today in user TZ) ---- */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h2 style={{ margin: 0 }}>
            Daily quests {daily?.tz ? <span className="kpill">Today — {daily.tz}</span> : <span className="kpill">Today</span>}
          </h2>
        </div>

        {startedCount === 0 ? (
          <p style={{ marginTop: 10 }}>Start any goal to see its daily quests here.</p>
        ) : (
          <>
            {dailyLoading && <p style={{ marginTop: 10 }}>Loading…</p>}
            {dailyErr && (
              <div
                style={{
                  marginTop: 12,
                  padding: "10px 12px",
                  border: "1px solid #5a1a1a",
                  background: "#2a0f0f",
                  color: "#ffb3b3",
                  borderRadius: 8,
                  wordBreak: "break-word",
                }}
              >
                {dailyErr}
              </div>
            )}
            {!dailyLoading && !dailyErr && (daily?.items?.length ?? 0) === 0 && (
              <p style={{ marginTop: 10 }}>No quests for today.</p>
            )}

            <ul className="list" style={{ marginTop: 10 }}>
              {daily?.items?.map((it, i) => {
                const coins = COINS[it.section];
                const key = `${it.goalId}-${it.dayNumber}-${it.section}-${it.index}-${i}`;
                return (
                  <li key={key}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <strong>
                          {it.goalTitle} — Day {it.dayNumber} — {it.section.toUpperCase()}
                        </strong>
                        <span className="kpill">+{coins} coins</span>
                        {it.section !== "reflect" && it.title && (
                          <>
                            <span>•</span>
                            <strong>[{it.kind}]</strong>
                            {it.url ? <a href={it.url} target="_blank" rel="noreferrer">{it.title}</a> : <span>{it.title}</span>}
                            <SplitBadge r={{ split: it.split, duration_minutes: it.duration_minutes ?? null }} />
                          </>
                        )}
                      </div>

                      {it.section === "reflect" && (
                        <div style={{ marginTop: 6 }}>
                          <p style={{ margin: 0 }}>{it.reflectText || "Reflect on what you learned today."}</p>
                        </div>
                      )}

                      <div style={{ marginTop: 6 }}>
                        <button type="button" className="btn" onClick={(e) => completeQuest(it, e)} disabled={!!it.completed}>
                          {it.completed ? "Completed" : "Complete"}
                        </button>
                      </div>

                      {/* Diary box with Save button */}
                      {renderDiaryBox(it)}
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </main>
  );
}
