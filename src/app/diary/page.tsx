"use client";

import { useEffect, useMemo, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { useAvatar } from "@/contexts/AvatarContext";
import { getMessageForAction } from "@/lib/avatarMessages";

type DiaryEntry = {
  id: string;
  goalId: string;
  goalTitle: string;
  type: "practice" | "reflect"; // learn isn't stored today; section will still render
  content: string;
  dayNumber: number | null;
  dateUTC: string;   // ISO
  dateLocal: string; // YYYY-MM-DD (from server, user TZ)
  createdAt: string; // ISO
};

type GetDiaryResponse = {
  tz: string;
  count: number;
  entries: DiaryEntry[];
};

function guessTZ() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Detroit";
  } catch {
    return "America/Detroit";
  }
}

function formatHuman(isoDateLocal: string, tz: string) {
  // isoDateLocal is "YYYY-MM-DD" in user's TZ (string, not Date)
  const d = new Date(`${isoDateLocal}T12:00:00`); // noon avoids DST edge
  try {
    return d.toLocaleDateString(undefined, { timeZone: tz, weekday: "short", month: "short", day: "numeric", year: "numeric" });
  } catch {
    return isoDateLocal;
  }
}

function groupBy<T, K extends string | number>(arr: T[], keyFn: (t: T) => K): Record<K, T[]> {
  return arr.reduce((acc, item) => {
    const k = keyFn(item);
    (acc[k] ||= []).push(item);
    return acc;
  }, {} as Record<K, T[]>);
}

export default function DiaryDatesPage() {
  const [tz, setTz] = useState<string>(guessTZ());
  const { showMessage } = useAvatar();

  // Left-side list of dates that have entries
  const [dates, setDates] = useState<string[]>([]);
  const [datesLoading, setDatesLoading] = useState(true);
  const [datesErr, setDatesErr] = useState<string | null>(null);

  // Right-side detail for selected date
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayLoading, setDayLoading] = useState(false);
  const [dayErr, setDayErr] = useState<string | null>(null);
  const [entries, setEntries] = useState<DiaryEntry[]>([]);

  // On mount: set TZ
  useEffect(() => setTz(guessTZ()), []);

  // Show avatar message when diary page loads
  useEffect(() => {
    const timer = setTimeout(() => {
      showMessage(getMessageForAction('diary_visited'));
    }, 2000); // Delay to let page load
    return () => clearTimeout(timer);
  }, [showMessage]);

  // Load recent entries to build the date index (left column)
  async function loadIndex() {
    setDatesLoading(true);
    setDatesErr(null);
    try {
      const res = await fetch("/api/diary", { headers: { "X-Timezone": tz, "Cache-Control": "no-store" } });
      if (!res.ok) {
        let msg = "Failed to load diary index";
        try {
          const j = await res.json();
          if (j?.error) msg = j.error;
        } catch {}
        throw new Error(msg);
      }
      const j = (await res.json()) as GetDiaryResponse;
      const all = Array.isArray(j.entries) ? j.entries : [];
      // unique dateLocal list (newest first)
      const seen = new Set<string>();
      const ordered: string[] = [];
      for (const e of all) {
        if (!seen.has(e.dateLocal)) {
          seen.add(e.dateLocal);
          ordered.push(e.dateLocal);
        }
      }
      // If empty, just keep []
      setDates(ordered);
      // Auto-select the first date if nothing selected
      if (!selectedDate && ordered.length > 0) {
        setSelectedDate(ordered[0]);
      }
    } catch (e: any) {
      setDatesErr(e?.message || "Network error");
      setDates([]);
    } finally {
      setDatesLoading(false);
    }
  }

  // Load details for a specific date into right pane
  async function loadDay(dateLocal: string) {
    setDayLoading(true);
    setDayErr(null);
    try {
      const res = await fetch(`/api/diary?date=${encodeURIComponent(dateLocal)}`, {
        headers: { "X-Timezone": tz, "Cache-Control": "no-store" },
      });
      if (!res.ok) {
        let msg = "Failed to load diary entries";
        try {
          const j = await res.json();
          if (j?.error) msg = j.error;
        } catch {}
        throw new Error(msg);
      }
      const j = (await res.json()) as GetDiaryResponse;
      setEntries(Array.isArray(j.entries) ? j.entries : []);
    } catch (e: any) {
      setDayErr(e?.message || "Network error");
      setEntries([]);
    } finally {
      setDayLoading(false);
    }
  }

  // Initial index load, and refresh when TZ changes
  useEffect(() => {
    loadIndex();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tz]);

  // Whenever selectedDate changes, load that day
  useEffect(() => {
    if (selectedDate) {
      loadDay(selectedDate);
    } else {
      setEntries([]);
    }
  }, [selectedDate]);

  // --- Right pane: organize by section then by goal ---
  const practice = useMemo(() => entries.filter((e) => e.type === "practice"), [entries]);
  const reflect = useMemo(() => entries.filter((e) => e.type === "reflect"), [entries]);
  const learn: DiaryEntry[] = []; // placeholder (no learn entries saved today)

  function Section({ title, items }: { title: string; items: DiaryEntry[] }) {
    // group by goal
    const byGoal = groupBy(items, (e) => e.goalTitle || "(untitled)");
    const goalNames = Object.keys(byGoal).sort((a, b) => a.localeCompare(b));
    if (goalNames.length === 0) {
      return (
        <div style={{ marginTop: 12, padding: '12px', background: '#f8f9fa', borderRadius: '12px', border: '1px solid #e9ecef' }}>
          <h3 style={{ marginBottom: 8, color: '#495057', fontSize: '16px', fontWeight: '600' }}>{title}</h3>
          <p style={{ color: "#6c757d", margin: 0, fontStyle: 'italic' }}>None logged.</p>
        </div>
      );
    }
    return (
      <div style={{ marginTop: 12, padding: '12px', background: '#f8f9fa', borderRadius: '12px', border: '1px solid #e9ecef' }}>
        <h3 style={{ marginBottom: 12, color: '#495057', fontSize: '16px', fontWeight: '600' }}>{title}</h3>
        {goalNames.map((g, goalIndex) => {
          // Define color schemes for different goals
          const colorSchemes = [
            { bg: '#E3F2FD', border: '#2196F3', badge: '#1976D2', text: '#0D47A1' }, // Blue
            { bg: '#F3E5F5', border: '#9C27B0', badge: '#7B1FA2', text: '#4A148C' }, // Purple
            { bg: '#E8F5E8', border: '#4CAF50', badge: '#388E3C', text: '#1B5E20' }, // Green
            { bg: '#FFF3E0', border: '#FF9800', badge: '#F57C00', text: '#E65100' }, // Orange
            { bg: '#FCE4EC', border: '#E91E63', badge: '#C2185B', text: '#880E4F' }, // Pink
            { bg: '#E0F2F1', border: '#009688', badge: '#00695C', text: '#004D40' }, // Teal
            { bg: '#F1F8E9', border: '#8BC34A', badge: '#689F38', text: '#33691E' }, // Light Green
            { bg: '#FFF8E1', border: '#FFC107', badge: '#FF8F00', text: '#FF6F00' }, // Amber
          ];
          
          const colors = colorSchemes[goalIndex % colorSchemes.length];
          
          return (
            <div key={g} style={{ 
              marginBottom: 12, 
              padding: '12px', 
              background: colors.bg, 
              borderRadius: '8px', 
              border: `2px solid ${colors.border}`,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <h4 style={{ margin: 0, color: colors.text, fontSize: '16px', fontWeight: '600' }}>{g}</h4>
                {byGoal[g][0].dayNumber && (
                  <span style={{ 
                    background: colors.badge, 
                    color: 'white', 
                    padding: '4px 8px', 
                    borderRadius: '12px', 
                    fontSize: '12px', 
                    fontWeight: '500' 
                  }}>
                    Day {byGoal[g][0].dayNumber}
                  </span>
                )}
            </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {byGoal[g].map((e, index) => (
                <div key={e.id} style={{ 
                  padding: '8px 10px', 
                  background: 'white', 
                  borderRadius: '6px', 
                  border: `1px solid ${colors.border}`,
                  position: 'relative',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    marginBottom: '4px' 
                  }}>
                    <span style={{ 
                      fontSize: '12px', 
                      color: '#6c757d', 
                      fontWeight: '500' 
                    }}>
                      Entry #{index + 1}
                    </span>
                    <span style={{ 
                      fontSize: '12px', 
                      color: '#6c757d',
                      background: '#e9ecef',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }} title={new Date(e.createdAt).toLocaleString()}>
                      {new Date(e.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <div style={{ 
                    whiteSpace: "pre-wrap", 
                    color: '#212529',
                    lineHeight: '1.5',
                    fontSize: '14px'
                  }}>
                    {e.content}
                  </div>
                </div>
              ))}
              </div>
          </div>
          );
        })}
      </div>
    );
  }

  return (
    <AppLayout activePage="diary">
      <div className="diary-page" style={{ width: '100%', maxWidth: 'none', padding: '0px', margin: '0px' }}>
        <div className="card" style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 40, padding: '20px 40px', width: '100%', maxWidth: 'none', margin: '0px' }}>
        {/* LEFT: Calendar view */}
        <aside style={{ 
          background: 'linear-gradient(135deg, #6A3EE8 0%, #9C27B0 100%)', 
          padding: '20px', 
          borderRadius: '16px', 
          border: '1px solid #e9ecef',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Background decoration */}
          <div style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '100px',
            height: '100px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '50%',
            zIndex: 0
          }} />
          <div style={{
            position: 'absolute',
            bottom: '-30px',
            left: '-30px',
            width: '60px',
            height: '60px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '50%',
            zIndex: 0
          }} />
          
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ margin: 0, color: 'white', fontSize: '20px', fontWeight: '700' }}>Calendar</h2>
          </div>

            {datesLoading && (
              <div style={{ 
                color: 'rgba(255,255,255,0.8)', 
                fontStyle: 'italic', 
                textAlign: 'center',
                padding: '20px'
              }}>
                Loading calendar...
              </div>
            )}
            
          {datesErr && (
            <div
              style={{
                  padding: "12px 16px",
                  border: "1px solid rgba(255,255,255,0.3)",
                  background: "rgba(255,255,255,0.1)",
                  color: "white",
                borderRadius: 8,
                wordBreak: "break-word",
                  fontSize: '14px',
                  backdropFilter: 'blur(10px)'
              }}
            >
              {datesErr}
            </div>
          )}

            {!datesLoading && !datesErr && dates.length === 0 && (
              <div style={{ 
                color: 'rgba(255,255,255,0.8)', 
                fontStyle: 'italic', 
                textAlign: 'center',
                padding: '20px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '12px',
                backdropFilter: 'blur(10px)'
              }}>
                No diary entries yet
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {dates.map((d) => {
              const selected = d === selectedDate;
                const date = new Date(`${d}T12:00:00`);
                const dayName = date.toLocaleDateString(undefined, { timeZone: tz, weekday: 'short' });
                const dayNumber = date.getDate();
                const monthName = date.toLocaleDateString(undefined, { timeZone: tz, month: 'short' });
                
              return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setSelectedDate(d)}
                    aria-pressed={selected}
                    style={{
                      width: "100%",
                      padding: '16px',
                      background: selected 
                        ? 'rgba(255,255,255,0.25)' 
                        : 'rgba(255,255,255,0.1)',
                      color: 'white',
                      border: selected 
                        ? '2px solid rgba(255,255,255,0.5)' 
                        : '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '12px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      textAlign: 'left',
                      backdropFilter: 'blur(10px)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    title={d}
                    onMouseEnter={(e) => {
                      if (!selected) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!selected) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }
                    }}
                  >
                    {/* Date circle */}
                    <div style={{
                      width: '40px',
                      height: '40px',
                      background: selected 
                        ? 'rgba(255,255,255,0.3)' 
                        : 'rgba(255,255,255,0.2)',
                      borderRadius: '50%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: '700',
                      minWidth: '40px'
                    }}>
                      <div style={{ lineHeight: '1' }}>{dayNumber}</div>
                      <div style={{ fontSize: '8px', opacity: 0.8 }}>{dayName}</div>
                    </div>
                    
                    {/* Date info */}
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        fontSize: '14px', 
                        fontWeight: '600',
                        marginBottom: '2px'
                      }}>
                    {formatHuman(d, tz)}
                      </div>
                    </div>
                    
                    {/* Selection indicator */}
                    {selected && (
                      <div style={{
                        width: '8px',
                        height: '8px',
                        background: 'white',
                        borderRadius: '50%',
                        opacity: 0.8
                      }} />
                    )}
                  </button>
              );
            })}
            </div>
          </div>
        </aside>

        {/* RIGHT: Day detail */}
        <section>
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: 12, 
            flexWrap: "wrap", 
            marginBottom: 16,
            padding: '12px 16px',
            background: 'white',
            borderRadius: '12px',
            border: '1px solid #e9ecef',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}>
            <h1 style={{ margin: 0, color: '#212529', fontSize: '24px', fontWeight: '700' }}>
              Diary Entry
            </h1>
            {selectedDate && (
              <span style={{ 
                background: '#6A3EE8', 
                color: 'white', 
                padding: '6px 12px', 
                borderRadius: '12px', 
                fontSize: '12px', 
                fontWeight: '500' 
              }}>
                {formatHuman(selectedDate, tz)}
              </span>
            )}
          </div>

          {dayLoading && (
            <div style={{ 
              padding: '40px', 
              textAlign: 'center', 
              color: '#6c757d', 
              fontStyle: 'italic' 
            }}>
              Loading diary entries...
            </div>
          )}
          {dayErr && (
            <div
              style={{
                marginTop: 12,
                padding: "12px 16px",
                border: "1px solid #dc3545",
                background: "#f8d7da",
                color: "#721c24",
                borderRadius: 8,
                wordBreak: "break-word",
                fontSize: '14px'
              }}
            >
              {dayErr}
            </div>
          )}

          {!dayLoading && !dayErr && selectedDate && entries.length === 0 && (
            <div style={{ 
              padding: '40px', 
              textAlign: 'center', 
              color: '#6c757d', 
              fontStyle: 'italic',
              background: '#f8f9fa',
              borderRadius: '12px',
              border: '1px solid #e9ecef'
            }}>
              No diary notes for this date.
            </div>
          )}

          {!dayLoading && !dayErr && selectedDate && (
            <>
              <Section title="Practice" items={practice} />
              <Section title="Reflect" items={reflect} />
            </>
          )}
        </section>
      </div>
      </div>
    </AppLayout>
  );
}
