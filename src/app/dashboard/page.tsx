"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bento } from "@/components/ui/Bento";
import { SplitBadge } from "@/components/ui/SplitBadge";
import Image from 'next/image';
import { useUserData } from '@/hooks/useUserData';
import AppLayout from '../../components/AppLayout';
import { useAvatar } from '../../contexts/AvatarContext';
import { getMessageForAction } from '../../lib/avatarMessages';

const COINS = { learn: 5, practice: 10, reflect: 5, quiz: 50 } as const;

type SplitT = { total_parts: number; part_number: number; range?: string | null } | null;

type DailyItem = {
  goalId: string;
  goalTitle: string;
  dayNumber: number;
  section: "learn" | "practice" | "reflect" | "quiz";
  index: number;
  kind?: "watch" | "listen" | "read";
  title?: string;
  url?: string;
  duration_minutes?: number | null;
  split?: SplitT;
  reflectText?: string;
  completed?: boolean;
  quizData?: any[];
};

type DailyPayload = { date: string; items: DailyItem[]; tz?: string };

type GoalListItem = {
  id: string;
  title: string;
  createdAt: string;
  startDate: string | null;
  totalDays: number;
};

const CARD_COLORS = ["#FFD1A1", "#FFE4E1", "#9FD6FF", "#FFB3C7", "#C8B6FF", "#FFE6A7"];
const SECTION_META: Record<
  DailyItem["section"],
  { label: string; icon: string; tint: string }
> = {
  learn: { label: "LEARN", icon: "📚", tint: "#EAF7FF" },
  practice: { label: "PRACTICE", icon: "🛠️", tint: "#FFF3E0" },
  reflect: { label: "REFLECT", icon: "💭", tint: "#F3E5F5" },
  quiz: { label: "QUIZ", icon: "🧠", tint: "#F3E8FF" },
};

function colorFromKey(key: string) {
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return CARD_COLORS[h % CARD_COLORS.length];
}

async function calculateProgress(goal: GoalListItem, dailyItems: DailyItem[]) {
  if (!goal.startDate) return { percentage: 0, daysRemaining: 0, daysSinceStart: 0 };
  
  const startDate = new Date(goal.startDate);
  const today = new Date();
  
  // Fix timezone issues by normalizing dates to start of day
  const startOfStartDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
  const daysSinceStart = Math.floor((startOfToday.getTime() - startOfStartDate.getTime()) / (1000 * 60 * 60 * 24));
  
  const totalDays = goal.totalDays;
  const daysRemaining = Math.max(0, totalDays - daysSinceStart);
  
  // Calculate progress based on ALL quests across the entire goal duration
  // We need to fetch all quest completions for this goal, not just today's
  try {
    const response = await fetch(`/api/goals/${goal.id}/progress`);
    if (response.ok) {
      const data = await response.json();
      const percentage = data.percentage || 0;
      
      // Debug logging
      console.log(`Goal: ${goal.title}`, {
        totalDays,
        daysSinceStart,
        daysRemaining,
        totalQuests: data.totalQuests,
        completedQuests: data.completedQuests,
        percentage
      });
      
      return { percentage, daysRemaining, daysSinceStart };
    }
  } catch (error) {
    console.error('Error fetching goal progress:', error);
  }
  
  // Fallback: calculate based on today's quests only
  const goalQuests = dailyItems.filter(item => item.goalId === goal.id);
  const completedQuests = goalQuests.filter(item => item.completed).length;
  const percentage = completedQuests > 0 ? Math.min(100, Math.round((completedQuests / goalQuests.length) * 100)) : 0;
  
  return { percentage, daysRemaining, daysSinceStart };
}

function GoalCard({
  g,
  onView,
  onStart,
  onDelete,
  dailyItems,
}: {
  g: GoalListItem;
  onView: (g: GoalListItem) => void;
  onStart: (g: GoalListItem) => void;
  onDelete: (g: GoalListItem) => void;
  dailyItems: DailyItem[];
}) {
  const color = colorFromKey(g.title);
  const [progress, setProgress] = useState({ percentage: 0, daysRemaining: 0, daysSinceStart: 0 });

  useEffect(() => {
    calculateProgress(g, dailyItems).then(setProgress);
  }, [g, dailyItems]);
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
            🗓️ Created: {new Date(g.createdAt).toISOString().slice(0, 10)}
          </span>
          {g.startDate ? (
            <span className="kpill" title="Started">
              ✅ Started: {new Date(g.startDate).toISOString().slice(0, 10)}
            </span>
          ) : (
            <span className="kpill">⏳ Not started</span>
          )}
        </div>

        {/* Progress Bar */}
        {g.startDate && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: "#666", fontWeight: 600 }}>Progress</span>
              <span style={{ fontSize: 12, color: "#666", fontWeight: 600 }}>{progress.percentage}% Complete</span>
            </div>
            <div style={{ 
              width: "100%", 
              height: "8px", 
              backgroundColor: "#E5E7EB", 
              borderRadius: "4px", 
              overflow: "hidden" 
            }}>
              <div style={{ 
                width: `${progress.percentage}%`, 
                height: "100%", 
                backgroundColor: "#10B981", 
                borderRadius: "4px",
                transition: "width 0.3s ease"
              }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
              <span style={{ fontSize: 11, color: "#9CA3AF" }}>Days remaining: {progress.daysRemaining}</span>
              <span style={{ fontSize: 11, color: "#9CA3AF" }}>
                {progress.daysSinceStart === 0 ? "Started today" : `Started ${progress.daysSinceStart} day${progress.daysSinceStart === 1 ? '' : 's'} ago`}
              </span>
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 10, justifyContent: 'space-between' }}>
          <button 
            className="btn" 
            onClick={() => onView(g)}
            style={{ 
              minWidth: '80px', 
              padding: '12px 16px', 
              fontSize: '14px',
              flex: '1'
            }}
          >
            View
          </button>
          {!g.startDate && (
            <button 
              className="btn" 
              onClick={() => onStart(g)}
              style={{ 
                minWidth: '80px', 
                padding: '12px 16px', 
                fontSize: '14px',
                background: 'linear-gradient(45deg, #10B981, #059669)',
                flex: '1'
              }}
            >
              Start today
            </button>
          )}
          <button 
            className="btn" 
            onClick={() => onDelete(g)}
            style={{ 
              minWidth: '80px', 
              padding: '12px 16px', 
              fontSize: '14px',
              background: 'linear-gradient(45deg, #991B1B, #B91C1C)',
              flex: '1'
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function diaryKeyFor(it: DailyItem) {
  return `${it.goalId}-${it.dayNumber}-${it.section}-${it.index}`;
}

function isCompleted(it: DailyItem) {
  if (it.section === "quiz") {
    // For quiz items, check if quiz has been passed or completed
    const quizPassed = localStorage.getItem(`quiz-passed-day-${it.dayNumber}`) === 'true';
    const quizCompleted = localStorage.getItem(`quiz-completed-day-${it.dayNumber}`);
    return quizPassed || !!quizCompleted;
  }
  return !!it.completed;
}

function isQuizUnlocked(it: DailyItem, dailyItems: DailyItem[]) {
  if (it.section !== "quiz") return false;
  
  // Quiz is unlocked only if all other quests for that day are completed
  // We need to check if learn, practice, and reflect quests are completed
  const dayItems = dailyItems.filter(item => 
    item.goalId === it.goalId && item.dayNumber === it.dayNumber
  );
  
  const learnCompleted = dayItems
    .filter(item => item.section === "learn")
    .every(item => item.completed);
    
  const practiceCompleted = dayItems
    .filter(item => item.section === "practice")
    .every(item => item.completed);
    
  const reflectCompleted = dayItems
    .filter(item => item.section === "reflect")
    .every(item => item.completed);
  
  return learnCompleted && practiceCompleted && reflectCompleted;
}

function SectionCard({ 
  it, 
  openDiary, 
  diaryDrafts, 
  savedKeys, 
  toggleDiary, 
  onDiaryChange, 
  onDiaryKeyDown, 
  saveDiary, 
  completeQuest,
  dailyItems
}: { 
  it: DailyItem;
  openDiary: Record<string, boolean>;
  diaryDrafts: Record<string, string>;
  savedKeys: Record<string, number>;
  toggleDiary: (key: string) => void;
  onDiaryChange: (key: string, v: string) => void;
  onDiaryKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>, it: DailyItem) => void;
  saveDiary: (it: DailyItem) => void;
  completeQuest: (it: DailyItem, e?: React.MouseEvent) => void;
  dailyItems: DailyItem[];
}) {
  const meta = SECTION_META[it.section];
  const coins = COINS[it.section];
  const key = diaryKeyFor(it);
  const open = !!openDiary[key];

  // Color-coded section bars
  const getSectionColor = (section: string) => {
    switch (section) {
      case "learn": return "#3B82F6"; // Blue
      case "practice": return "#10B981"; // Green  
      case "reflect": return "#F59E0B"; // Orange
      case "quiz": return "#8B5CF6"; // Purple
      default: return "#6B7280"; // Gray
    }
  };

  const sectionColor = getSectionColor(it.section);
  const isCompletedValue = it.completed;

  return (
    <div style={{ 
      background: "#FFFFFF", 
      border: "1px solid #E5E7EB", 
      borderRadius: "12px", 
      padding: "20px", 
      marginBottom: "16px",
      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
      position: "relative",
      opacity: isCompletedValue ? 0.7 : 1
    }}>
      {/* Section Color Bar */}
      <div style={{
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        width: "6px",
        backgroundColor: sectionColor,
        borderTopLeftRadius: "12px",
        borderBottomLeftRadius: "12px"
      }} />

      {/* Header */}
      <div style={{ marginLeft: "16px", marginBottom: "16px", marginTop: "8px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
          <div style={{ flex: 1, marginRight: "12px" }}>
            {/* Goal Title - above section name */}
            <h2 style={{ 
              fontSize: "16px", 
              fontWeight: "600", 
              color: "#4B5563", 
              margin: "0 0 6px 0",
              textTransform: "uppercase",
              letterSpacing: "0.5px"
            }}>
              {it.goalTitle}
            </h2>
            {/* Section Name */}
            <h3 style={{ 
              fontSize: "18px", 
              fontWeight: "700", 
              color: "#1F2937", 
              margin: "0 0 8px 0",
              textTransform: "uppercase",
              letterSpacing: "0.5px"
            }}>
              {meta.label}
            </h3>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", flexWrap: "wrap" }}>
              <span style={{
                background: "#E0E7FF",
                color: "#3730A3",
                padding: "2px 8px",
                borderRadius: "12px",
                fontSize: "11px",
                fontWeight: "600",
                border: "1px solid #C7D2FE"
              }}>
                Day {it.dayNumber}
              </span>
              <span style={{
                background: "#F3F4F6",
                color: "#6B7280",
                padding: "2px 6px",
                borderRadius: "4px",
                fontSize: "10px",
                fontWeight: "500"
              }}>
                Quest #{it.index + 1}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
            <span style={{
              background: "#F3F4F6",
              color: "#374151",
              padding: "4px 8px",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "4px"
            }}>
              +{coins} <img src="/icons/coin.png" alt="" width={18} height={18} style={{ 
                verticalAlign: "middle",
                filter: "drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2))"
              }} />
            </span>
            <button
              className={`btn ${isCompletedValue ? "disabled" : ""}`}
              onClick={(e) => completeQuest(it, e)}
              disabled={isCompletedValue}
              title={isCompletedValue ? "Already completed" : it.section === "quiz" ? "Take quiz" : "Mark complete"}
              style={{
                padding: "8px 16px",
                fontSize: "14px",
                fontWeight: "600"
              }}
            >
              {isCompletedValue ? (it.section === "quiz" ? "✅ Quiz Completed" : "Completed") : it.section === "quiz" ? "Take Quiz" : "Complete"}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ marginLeft: "16px" }}>
        {it.section === "quiz" ? (
          <div style={{
            background: "#F9FAFB",
            border: "1px solid #E5E7EB",
            borderRadius: "8px",
            padding: "16px",
            marginBottom: "12px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
              <span style={{
                background: "#8B5CF6",
                color: "white",
                padding: "4px 8px",
                borderRadius: "4px",
                fontSize: "12px",
                fontWeight: "600",
                textTransform: "uppercase"
              }}>
                🧠 QUIZ
              </span>
              <span style={{
                background: "#E5E7EB",
                color: "#6B7280",
                padding: "4px 8px",
                borderRadius: "12px",
                fontSize: "12px",
                fontWeight: "500"
              }}>
                {it.quizData?.length || 0} questions
              </span>
            </div>
            <h4 style={{ 
              fontSize: "16px", 
              fontWeight: "600", 
              color: "#1F2937", 
              margin: "0 0 8px 0" 
            }}>
              {it.title}
            </h4>
            <p style={{ 
              fontSize: "14px", 
              color: "#6B7280", 
              margin: "0 0 12px 0" 
            }}>
              Test your knowledge and unlock the next day's quests! Score 80% or higher to pass.
            </p>
            <button
              className="btn"
              onClick={() => {
                const completed = isCompleted(it);
                const unlocked = isQuizUnlocked(it, dailyItems);
                if (!completed && unlocked) {
                  window.open(`/quiz/${it.dayNumber}?goalId=${it.goalId}`, '_blank');
                }
              }}
              disabled={isCompleted(it) || !isQuizUnlocked(it, dailyItems)}
              style={{
                background: isCompleted(it) ? "#10B981" : isQuizUnlocked(it, dailyItems) ? "#8B5CF6" : "#D1D5DB",
                color: "white",
                padding: "8px 16px",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: "600",
                border: "none",
                cursor: (isCompleted(it) || !isQuizUnlocked(it, dailyItems)) ? "not-allowed" : "pointer",
                opacity: (isCompleted(it) || !isQuizUnlocked(it, dailyItems)) ? 0.8 : 1
              }}
            >
              {isCompleted(it) ? "✅ Quiz Completed" : isQuizUnlocked(it, dailyItems) ? "Take Quiz" : "Complete Quests First"}
            </button>
          </div>
        ) : it.section !== "reflect" && (it.title || it.url) ? (
          <div style={{
            background: "#F9FAFB",
            border: "1px solid #E5E7EB",
            borderRadius: "8px",
            padding: "16px",
            marginBottom: "12px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
              <span style={{
                background: it.kind === "watch" ? "#EF4444" : "#6B7280",
                color: "white",
                padding: "4px 8px",
                borderRadius: "4px",
                fontSize: "12px",
                fontWeight: "600",
                textTransform: "uppercase"
              }}>
                {it.kind === "watch" ? "📺 WATCH" : it.kind === "read" ? "📖 READ" : "🎧 LISTEN"}
              </span>
              {it.url && (
                <a 
                  href={it.url} 
                  target="_blank" 
                  rel="noreferrer"
                  style={{
                    background: "#3B82F6",
                    color: "white",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                    textDecoration: "none",
                    display: "inline-block"
                  }}
                >
                  View Resource
                </a>
              )}
              {it.duration_minutes && (
                <span style={{
                  background: "#E5E7EB",
                  color: "#6B7280",
                  padding: "4px 8px",
                  borderRadius: "12px",
                  fontSize: "12px",
                  fontWeight: "500"
                }}>
                  {it.duration_minutes} min
                </span>
              )}
            </div>
            <div style={{ fontSize: "16px", color: "#1F2937", fontWeight: "500" }}>
              {it.url ? (
                <a href={it.url} target="_blank" rel="noreferrer" style={{ color: "inherit", textDecoration: "none" }}>
                  {it.title}
                </a>
              ) : (
                it.title
              )}
            </div>
          </div>
        ) : (
          <div style={{
            background: "#FEF3C7",
            border: "1px solid #F59E0B",
            borderRadius: "8px",
            padding: "16px",
            marginBottom: "12px"
          }}>
            <p style={{ 
              fontSize: "16px", 
              color: "#92400E", 
              margin: 0,
              fontStyle: "italic"
            }}>
              {it.reflectText || "Reflect on what you learned today."}
            </p>
          </div>
        )}

        {/* Diary toggle + editor */}
        {(it.section === "practice" || it.section === "reflect") && (
          <div style={{ marginTop: "12px" }}>
            <button 
              className="btn-ghost" 
              onClick={() => toggleDiary(key)}
              style={{
                background: "transparent",
                border: "1px solid #D1D5DB",
                color: "#6B7280",
                padding: "8px 16px",
                borderRadius: "6px",
                fontSize: "14px",
                cursor: "pointer"
              }}
            >
              {open ? "Hide diary" : "Add to diary"}
            </button>
            {open && (
              <div style={{ 
                background: "#F9FAFB", 
                border: "1px solid #E5E7EB", 
                borderRadius: "8px", 
                padding: "16px", 
                marginTop: "8px" 
              }}>
                <textarea
                  placeholder={
                    it.section === "practice"
                      ? "Diary: what did you practice/struggle with?"
                      : "Diary: quick reflection…"
                  }
                  style={{ 
                    width: "100%", 
                    minHeight: "90px",
                    border: "1px solid #D1D5DB",
                    borderRadius: "6px",
                    padding: "12px",
                    fontSize: "14px",
                    fontFamily: "inherit",
                    resize: "vertical"
                  }}
                  value={diaryDrafts[key] ?? ""}
                  onChange={(e) => onDiaryChange(key, e.currentTarget.value)}
                  onKeyDown={(e) => onDiaryKeyDown(e, it)}
                />
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px" }}>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      console.log("Save button clicked");
                      saveDiary(it);
                    }}
                    disabled={!String(diaryDrafts[key] ?? "").trim()}
                    title="Ctrl/Cmd+Enter to save"
                    style={{ 
                      opacity: !String(diaryDrafts[key] ?? "").trim() ? 0.5 : 1,
                      cursor: !String(diaryDrafts[key] ?? "").trim() ? "not-allowed" : "pointer",
                      padding: "8px 16px",
                      fontSize: "14px"
                    }}
                  >
                    Save diary
                  </button>
                  {key in savedKeys ? (
                    <span style={{
                      background: "#10B981",
                      color: "white",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontSize: "12px",
                      fontWeight: "600"
                    }}>
                      Saved!
                    </span>
                  ) : (
                    <small style={{ color: "#6B7280", fontSize: "12px" }}>
                      Tip: Ctrl/Cmd+Enter
                    </small>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const { userData, loading: userLoading } = useUserData();
  const { showMessage } = useAvatar();

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

  // Show avatar message when dashboard loads (only once per session)
  useEffect(() => {
    if (!userLoading && userData) {
      const timer = setTimeout(() => {
        showMessage(getMessageForAction('dashboard_visited'));
      }, 2000); // Longer delay to let page fully load
      return () => clearTimeout(timer);
    }
  }, [userLoading, userData, showMessage]);

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

  // Listen for quiz completion events to refresh the dashboard
  useEffect(() => {
    const handleQuizCompletion = () => {
      loadDaily();
    };

    window.addEventListener('quiz-completed', handleQuizCompletion);
    return () => window.removeEventListener('quiz-completed', handleQuizCompletion);
  }, []);

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
    const order: Record<DailyItem["section"], number> = { learn: 0, practice: 1, reflect: 2, quiz: 3 };
    return [...daily.items].sort((a, b) => {
      // First sort by completion status (incomplete first, completed last)
      const aCompleted = isCompleted(a);
      const bCompleted = isCompleted(b);
      if (aCompleted !== bCompleted) return aCompleted ? 1 : -1;
      
      // Then by goal title
      const g = a.goalTitle.localeCompare(b.goalTitle);
      if (g) return g;
      
      // Then by day number
      if (a.dayNumber !== b.dayNumber) return a.dayNumber - b.dayNumber;
      
      // Finally by section and index
      return order[a.section] - order[b.section] || a.index - b.index;
    });
  }, [daily]);


  const completeQuest = useCallback(async (it: DailyItem, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (isCompleted(it)) return;

    // For quiz sections, redirect to quiz page instead of marking complete
    if (it.section === "quiz") {
      if (isCompleted(it)) {
        alert('You have already completed this quiz!');
        return;
      }
      window.open(`/quiz/${it.dayNumber}?goalId=${it.goalId}`, '_blank');
      return;
    }

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
    
    // Dispatch coin refresh event with a small delay to ensure API has updated
    setTimeout(() => {
      console.log('Dispatching coins:refresh event from dashboard');
    window.dispatchEvent(new Event("coins:refresh"));
    }, 100);
    
    // Show coin reward popup
    setCoinRewardData({
      coinsAwarded: j.coinsAwarded,
      totalCoins: j.totalCoins,
      questType: it.section.toUpperCase()
    });
    setShowCoinRewardModal(true);
    
    // Auto-hide popup after 5 seconds
    setTimeout(() => {
      setShowCoinRewardModal(false);
    }, 5000);

    // Show avatar message for quest completion (instant)
    setTimeout(() => {
      showMessage(getMessageForAction('quest_completed'), true);
    }, 2000); // Show after coin popup
  }, [showMessage]);

  // ---- Coin Reward Modal ----
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

  // ---- Diary helpers ----
  const [openDiary, setOpenDiary] = useState<Record<string, boolean>>({});
  const toggleDiary = useCallback((key: string) =>
    setOpenDiary((p) => ({ ...p, [key]: !p[key] })), []);

  const onDiaryChange = useCallback((key: string, v: string) =>
    setDiaryDrafts((prev) => ({ ...prev, [key]: v })), []);

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

  const saveDiary = useCallback(async (it: DailyItem) => {
    const key = diaryKeyFor(it);
    const content = (diaryDrafts[key] || "").trim();
    console.log("Saving diary:", { key, content, goalId: it.goalId, section: it.section, dayNumber: it.dayNumber });
    
    if (!content) {
      console.log("No content to save");
      return;
    }

    try {
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
        console.error("Diary save failed:", msg);
      alert(msg);
      return;
    }

      console.log("Diary saved successfully");
    markSavedFlash(key);
    } catch (error) {
      console.error("Diary save error:", error);
      alert("Failed to save diary. Please try again.");
    }
  }, [diaryDrafts, tz]);

  const onDiaryKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>, it: DailyItem) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      saveDiary(it);
    }
  }, [saveDiary]);

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
      if (!daily?.date) return "";
      // Parse the date string and format it in the correct timezone
      const [year, month, day] = daily.date.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString(undefined, { 
        dateStyle: "full",
        timeZone: daily.tz || tz 
      });
    } catch {
      return daily?.date || "";
    }
  }, [daily?.date, daily?.tz, tz]);


  // ---- Render ----
  return (
    <AppLayout activePage="dashboard">
      <div className="dashboard-page">
        {/* Content Area */}
        <div className="content-main" style={{ padding: "32px" }}>

      <div className="bento-grid">
        {/* GOALS */}
        <Bento
          title="Your goals"
          color="#FFF8E8"
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
            style={{ marginTop: 12, gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 16 }}
          >
            {goals.map((g) => (
              <GoalCard key={g.id} g={g} onView={viewGoal} onStart={startGoal} onDelete={deleteGoal} dailyItems={items} />
            ))}
          </div>
        </Bento>

        {/* DAILY QUESTS */}
        <Bento
          title="Daily quests"
          color="#F3FBFF"
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

              {/* Daily Quest Summary */}
              {!dailyLoading && !dailyErr && items.length > 0 && (
                <div style={{
                  background: "linear-gradient(135deg, #4C1D95 0%, #6D28D9 100%)",
                  color: "white",
                  padding: "16px 20px",
                  borderRadius: "12px",
                  marginBottom: "20px",
                  boxShadow: "0 4px 12px rgba(76, 29, 149, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexWrap: "wrap",
                  gap: "12px"
                }}>
                  <div style={{ textAlign: "center", width: "100%" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", marginBottom: "16px" }}>
                      <img 
                        src="/icons/trophy.png" 
                        alt="trophy" 
                        width={54} 
                        height={54} 
                        style={{ 
                          filter: "drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2))"
                        }} 
                      />
                      <div>
                        <h3 style={{
                          margin: 0,
                          fontSize: "18px",
                          fontWeight: "700",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px"
                        }}>
                          Today's Quest Summary
                        </h3>
                        <p style={{
                          margin: 0,
                          fontSize: "14px",
                          opacity: 0.9,
                          fontWeight: "500"
                        }}>
                          {items.length} total quest{items.length !== 1 ? 's' : ''} across {new Set(items.map(item => item.goalId)).size} goal{new Set(items.map(item => item.goalId)).size !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "16px", flexWrap: "wrap" }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{
                        fontSize: "24px",
                        fontWeight: "700",
                        color: "#3B82F6"
                      }}>
                        {items.filter(item => !item.completed).length}
                      </div>
                      <div style={{
                        fontSize: "12px",
                        opacity: 0.8,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px"
                      }}>
                        Pending
                      </div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{
                        fontSize: "24px",
                        fontWeight: "700",
                        color: "#10B981"
                      }}>
                        {items.filter(item => item.completed).length}
                      </div>
                      <div style={{
                        fontSize: "12px",
                        opacity: 0.8,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px"
                      }}>
                        Completed
                      </div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{
                        fontSize: "24px",
                        fontWeight: "700",
                        color: "#F59E0B"
                      }}>
                        {Math.round((items.filter(item => item.completed).length / items.length) * 100)}%
                      </div>
                      <div style={{
                        fontSize: "12px",
                        opacity: 0.8,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px"
                      }}>
                        Progress
                      </div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{
                        fontSize: "24px",
                        fontWeight: "700",
                        color: "#F59E0B",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "4px"
                      }}>
                        {items.reduce((total, item) => {
                          const coins = COINS[item.section];
                          return total + (item.completed ? coins : 0);
                        }, 0)}
                        <img 
                          src="/icons/coin.png" 
                          alt="coins" 
                          width={18} 
                          height={18} 
                          style={{ 
                            verticalAlign: "middle"
                          }} 
                        />
                      </div>
                      <div style={{
                        fontSize: "12px",
                        opacity: 0.8,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px"
                      }}>
                        Coins Earned
                      </div>
                    </div>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ marginTop: 12 }}>
                {(() => {
                  // Separate completed and unfinished quests
                  const completedQuests = items.filter(item => item.completed);
                  const unfinishedQuests = items.filter(item => !item.completed);

                  // Group only unfinished quests by goal
                  const groupedByGoal = unfinishedQuests.reduce((acc, item) => {
                    if (!acc[item.goalId]) {
                      acc[item.goalId] = [];
                    }
                    acc[item.goalId].push(item);
                    return acc;
                  }, {} as Record<string, typeof unfinishedQuests>);

                  const goalEntries = Object.entries(groupedByGoal);
                  const hasUnfinishedQuests = goalEntries.length > 0;
                  const hasCompletedQuests = completedQuests.length > 0;
                  
                  return (
                    <>
                      {/* Unfinished Quests - Grouped by Goal */}
                      {hasUnfinishedQuests && goalEntries.map(([goalId, goalItems], goalIndex) => {
                        const goal = goals.find(g => g.id === goalId);
                        const goalTitle = goal?.title || "Unknown Goal";
                        const isLastGoal = goalIndex === goalEntries.length - 1;
                        const isLastSection = isLastGoal && !hasCompletedQuests;
                        
                        return (
                          <div key={goalId} style={{ marginBottom: isLastSection ? 0 : "32px" }}>
                        {/* Goal Header */}
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          marginBottom: "16px",
                          padding: "12px 16px",
                          background: "#8B5CF6",
                          borderRadius: "12px",
                          color: "white",
                          boxShadow: "0 4px 12px rgba(139, 92, 246, 0.3)"
                        }}>
                              <div style={{
                                background: "rgba(255, 255, 255, 0.2)",
                                borderRadius: "8px",
                                padding: "8px",
                                fontSize: "20px"
                              }}>
                                🎯
                              </div>
                              <div>
                                <h3 style={{
                                  margin: 0,
                                  fontSize: "18px",
                                  fontWeight: "700",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.5px"
                                }}>
                                  {goalTitle}
                                </h3>
                                <p style={{
                                  margin: 0,
                                  fontSize: "14px",
                                  opacity: 0.9,
                                  fontWeight: "500"
                                }}>
                                  {goalItems.length} quest{goalItems.length !== 1 ? 's' : ''} for today
                                </p>
                              </div>
                            </div>

                            {/* Quest Cards Grid */}
              <div
                className="grid"
                              style={{ 
                                gridTemplateColumns: "repeat(auto-fit,minmax(350px,1fr))", 
                                gap: 16,
                                marginBottom: isLastSection ? 0 : "24px"
                              }}
                            >
                              {goalItems.map((it, i) => (
                                <SectionCard 
                                  key={`${it.goalId}-${it.dayNumber}-${it.section}-${it.index}-${i}`} 
                                  it={it}
                                  openDiary={openDiary}
                                  diaryDrafts={diaryDrafts}
                                  savedKeys={savedKeys}
                                  toggleDiary={toggleDiary}
                                  onDiaryChange={onDiaryChange}
                                  onDiaryKeyDown={onDiaryKeyDown}
                                  saveDiary={saveDiary}
                                  completeQuest={completeQuest}
                                  dailyItems={daily?.items || []}
                                />
                              ))}
                            </div>

                            {/* Goal Separator (if not last section) */}
                            {!isLastSection && (
                              <div style={{
                                height: "2px",
                                background: "linear-gradient(90deg, transparent, #E5E7EB, transparent)",
                                margin: "16px 0",
                                borderRadius: "1px"
                              }} />
                            )}
                          </div>
                        );
                      })}

                      {/* Completed Quests - All at the end, not grouped */}
                      {hasCompletedQuests && (
                        <>
                          {/* Separator between unfinished and completed */}
                          {hasUnfinishedQuests && (
                            <div style={{
                              height: "3px",
                              background: "linear-gradient(90deg, transparent, #10B981, transparent)",
                              margin: "24px 0",
                              borderRadius: "2px"
                            }} />
                          )}

                          {/* Completed Quests Header */}
                          <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            marginBottom: "16px",
                            padding: "12px 16px",
                            background: "linear-gradient(135deg, #10B981 0%, #34D399 100%)",
                            borderRadius: "12px",
                            color: "white",
                            boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)"
                          }}>
                            <div style={{
                              background: "rgba(255, 255, 255, 0.2)",
                              borderRadius: "8px",
                              padding: "8px",
                              fontSize: "20px"
                            }}>
                              ✅
                            </div>
                            <div>
                              <h3 style={{
                                margin: 0,
                                fontSize: "18px",
                                fontWeight: "700",
                                textTransform: "uppercase",
                                letterSpacing: "0.5px"
                              }}>
                                Completed Quests
                              </h3>
                              <p style={{
                                margin: 0,
                                fontSize: "14px",
                                opacity: 0.9,
                                fontWeight: "500"
                              }}>
                                {completedQuests.length} quest{completedQuests.length !== 1 ? 's' : ''} completed today
                              </p>
                            </div>
                          </div>

                          {/* Completed Quest Cards Grid */}
              <div
                className="grid"
                            style={{ 
                              gridTemplateColumns: "repeat(auto-fit,minmax(350px,1fr))", 
                              gap: 16
                            }}
                          >
                            {completedQuests.map((it, i) => (
                              <SectionCard 
                                key={`completed-${it.goalId}-${it.dayNumber}-${it.section}-${it.index}-${i}`} 
                                it={it}
                                openDiary={openDiary}
                                diaryDrafts={diaryDrafts}
                                savedKeys={savedKeys}
                                toggleDiary={toggleDiary}
                                onDiaryChange={onDiaryChange}
                                onDiaryKeyDown={onDiaryKeyDown}
                                saveDiary={saveDiary}
                                completeQuest={completeQuest}
                                dailyItems={daily?.items || []}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </>
                  );
                })()}
              </div>
            </>
          )}
        </Bento>
      </div>
      </div>

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
      </div>
    </AppLayout>
  );
}
