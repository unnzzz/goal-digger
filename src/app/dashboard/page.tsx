"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bento } from "@/components/ui/Bento";
import { SplitBadge } from "@/components/ui/SplitBadge";

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

const CARD_COLORS = ["#FFD1A1", "#C6F1DA", "#9FD6FF", "#FFB3C7", "#C8B6FF", "#FFE6A7"];
const SECTION_META: Record<
  DailyItem["section"],
  { label: string; icon: string; tint: string }
> = {
  learn: { label: "LEARN", icon: "📚", tint: "#EAF7FF" },
  practice: { label: "PRACTICE", icon: "🛠️", tint: "#EFFFF1" },
  reflect: { label: "REFLECT", icon: "💭", tint: "#FFF3F5" },
};

function colorFromKey(key: string) {
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return CARD_COLORS[h % CARD_COLORS.length];
}

function GoalCard({
  g,
  onView,
  onStart,
  onDelete,
}: {
  g: GoalListItem;
  onView: (g: GoalListItem) => void;
  onStart: (g: GoalListItem) => void;
  onDelete: (g: GoalListItem) => void;
}) {
  const color = colorFromKey(g.title);
  return (
    <div className="goal-card" style={{ overflow: "hidden", background: "#fff" }}>
      <div className="band" style={{ background: color }} />
      <div style={{ padding: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span className="kpill" style={{ background: color, borderColor: "#00000022" }}>
            🎯
          </span>
          <strong style={{ fontSize: 16 }}>{g.title}</strong>
        </div>
        <div className="meta" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span className="kpill" title="Created">
            🗓️ {new Date(g.createdAt).toISOString().slice(0, 10)}
          </span>
          {g.startDate ? (
            <span className="kpill" title="Started">
              ✅ Started: {new Date(g.startDate).toISOString().slice(0, 10)}
            </span>
          ) : (
            <span className="kpill">⏳ Not started</span>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button className="btn" onClick={() => onView(g)}>
            View
          </button>
          {!g.startDate && (
            <button className="btn-ghost" onClick={() => onStart(g)}>
              Start today
            </button>
          )}
          <button className="btn-ghost" onClick={() => onDelete(g)}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();

  // ---- Timezone (IANA) & tell server (for reminders, daily calc) ----
  const [tz, setTz] = useState<string>("UTC");
  useEffect(() => {
    try {
      const guess = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (guess) {
        setTz(guess);
        // also inform server; fire-and-forget
        fetch("/api/me/tz", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tz: guess }),
        }).catch(() => {});
      }
    } catch {}
  }, []);

  // ---- GOALS state ----
  const [goalsLoading, setGoalsLoading] = useState(true);
  const [goalsErr, setGoalsErr] = useState<string | null>(null);
  const [goals, setGoals] = useState<GoalListItem[]>([]);

  // ---- DAILY state ----
  const [dailyLoading, setDailyLoading] = useState(true);
  const [dailyErr, setDailyErr] = useState<string | null>(null);
  const [daily, setDaily] = useState<DailyPayload | null>(null);

  // ---- Diary drafts & "Saved!" flash ----
  const [diaryDrafts, setDiaryDrafts] = useState<Record<string, string>>({});
  const [savedKeys, setSavedKeys] = useState<Record<string, number>>({});

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
    // tiny toast
    alert(`Quest completed! +${j.coinsAwarded} coins (total: ${j.totalCoins})`);
  };

  // ---- Diary helpers ----
  const diaryKeyFor = (it: DailyItem) => `${it.goalId}-${it.dayNumber}-${it.section}-${it.index}`;
  const [openDiary, setOpenDiary] = useState<Record<string, boolean>>({});
  const toggleDiary = (key: string) =>
    setOpenDiary((p) => ({ ...p, [key]: !p[key] }));

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

  const startGoal = async (g: GoalListItem) => {
    const tzHead = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const res = await fetch(`/api/goals/${g.id}/start`, {
      method: "POST",
      headers: { "X-Roadmap-Ajax": "1", "X-Timezone": tzHead },
    });
    if (!res.ok) {
      alert("Could not start goal");
      return;
    }
    const j = await res.json();
    setGoals((prev) => prev.map((x) => (x.id === g.id ? { ...x, startDate: j.startDate } : x)));
    await loadDaily();
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

  // ---- UI helpers ----
  const niceDate = useMemo(() => {
    try {
      return daily?.date ? new Date(daily.date).toLocaleDateString(undefined, { dateStyle: "full" }) : "";
    } catch {
      return daily?.date || "";
    }
  }, [daily?.date]);

  const SectionCard = ({ it }: { it: DailyItem }) => {
    const meta = SECTION_META[it.section];
    const coins = COINS[it.section];
    const key = diaryKeyFor(it);
    const open = !!openDiary[key];

    const goalColor = colorFromKey(it.goalTitle);
    const bg = meta.tint;
    return (
      <div className="quest-card" style={{ background: bg, borderColor: "#00000022" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span className="kpill" style={{ background: goalColor, borderColor: "#00000022" }}>
              {meta.icon}
            </span>
            <strong>
              {it.goalTitle} — Day {it.dayNumber}
            </strong>
            <span className="kpill">{meta.label}</span>
            <span className="kpill">+{coins} 💰</span>
          </div>
          <button
            className={`btn ${it.completed ? "disabled" : ""}`}
            onClick={(e) => completeQuest(it, e)}
            disabled={!!it.completed}
            title={it.completed ? "Already completed" : "Mark complete"}
          >
            {it.completed ? "Completed" : "Complete"}
          </button>
        </div>

        {it.section !== "reflect" && (it.title || it.url) ? (
          <div style={{ marginTop: 10 }}>
            <div className="res" style={{ alignItems: "center" }}>
              <span className="dot" style={{ background: goalColor }} />
              <div style={{ flex: 1 }}>
                {it.url ? (
                  <a href={it.url} target="_blank" rel="noreferrer">
                    <strong>[{it.kind}]</strong> {it.title}
                  </a>
                ) : (
                  <span>
                    <strong>[{it.kind}]</strong> {it.title}
                  </span>
                )}
                <div style={{ marginTop: 6 }}>
                  <SplitBadge r={{ split: it.split, duration_minutes: it.duration_minutes ?? null }} />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 8 }} className="meta">
            {it.reflectText || "Reflect on what you learned today."}
          </div>
        )}

        {/* Diary toggle + editor */}
        {(it.section === "practice" || it.section === "reflect") && (
          <div style={{ marginTop: 10 }}>
            <button className="btn-ghost" onClick={() => toggleDiary(key)}>
              {open ? "Hide diary" : "Add to diary"}
            </button>
            {open && (
              <div className="card" style={{ marginTop: 8 }}>
                <textarea
                  placeholder={
                    it.section === "practice"
                      ? "Diary: what did you practice/struggle with?"
                      : "Diary: quick reflection…"
                  }
                  style={{ width: "100%", minHeight: 90 }}
                  value={diaryDrafts[key] ?? ""}
                  onChange={(e) => onDiaryChange(key, e.currentTarget.value)}
                  onKeyDown={(e) => onDiaryKeyDown(e, it)}
                />
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => saveDiary(it)}
                    disabled={!String(diaryDrafts[key] ?? "").trim()}
                    title="Ctrl/Cmd+Enter to save"
                  >
                    Save diary
                  </button>
                  {key in savedKeys ? (
                    <span className="kpill">Saved!</span>
                  ) : (
                    <small className="meta">Tip: Ctrl/Cmd+Enter</small>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ---- Render ----
  return (
    <main className="container">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <div className="logo" />
        <h1 className="brand">Goal-Digger</h1>
      </div>
      <div className="subtitle">Your cozy dashboard — goals & today’s quests ✨</div>

      <div className="bento-grid">
        {/* GOALS */}
        <Bento
          title="Your goals"
          color="var(--card)"
          right={
            <a className="btn" href="/">
              + New roadmap
            </a>
          }
        >
          {goalsLoading && <div className="meta">Loading goals…</div>}
          {goalsErr && (
            <div className="card" style={{ borderColor: "#f99" }}>
              {goalsErr}
            </div>
          )}
          {!goalsLoading && !goalsErr && goals.length === 0 && (
            <div className="meta">No goals yet. Generate a roadmap to get started.</div>
          )}

          <div
            className="grid"
            style={{ marginTop: 12, gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 12 }}
          >
            {goals.map((g) => (
              <GoalCard key={g.id} g={g} onView={viewGoal} onStart={startGoal} onDelete={deleteGoal} />
            ))}
          </div>
        </Bento>

        {/* DAILY QUESTS */}
        <Bento
          title="Daily quests"
          color="var(--card-2)"
          right={
            <span className="kpill">
              {niceDate ? `Today • ${niceDate}` : "Today"} {daily?.tz ? `• ${daily.tz}` : ""}
            </span>
          }
        >
          {startedCount === 0 ? (
            <div className="meta">Start any goal to see its daily quests here.</div>
          ) : (
            <>
              {dailyLoading && <div className="meta">Loading today’s quests…</div>}
              {dailyErr && (
                <div className="card" style={{ borderColor: "#f99", wordBreak: "break-word" }}>
                  {dailyErr}
                </div>
              )}
              {!dailyLoading && !dailyErr && (items.length === 0) && (
                <div className="meta">No quests for today. Great day to rest 🌤️</div>
              )}

              <div
                className="grid"
                style={{ marginTop: 12, gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 12 }}
              >
                {items.map((it, i) => (
                  <SectionCard key={`${it.goalId}-${it.dayNumber}-${it.section}-${it.index}-${i}`} it={it} />
                ))}
              </div>
            </>
          )}
        </Bento>
      </div>
    </main>
  );
}
