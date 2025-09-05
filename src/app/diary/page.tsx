"use client";

import { useEffect, useMemo, useState } from "react";

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
        <div style={{ marginTop: 12 }}>
          <h3 style={{ marginBottom: 6 }}>{title}</h3>
          <p style={{ color: "#aaa", margin: 0 }}>None logged.</p>
        </div>
      );
    }
    return (
      <div style={{ marginTop: 12 }}>
        <h3 style={{ marginBottom: 6 }}>{title}</h3>
        {goalNames.map((g) => (
          <div key={g} style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 600 }}>
              {g} {g !== "(untitled)" && <span className="kpill">{byGoal[g][0].dayNumber ? `Day ${byGoal[g][0].dayNumber}` : ""}</span>}
            </div>
            <ul className="list" style={{ marginTop: 6 }}>
              {byGoal[g].map((e) => (
                <li key={e.id}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    {e.dayNumber ? <span className="kpill">Day {e.dayNumber}</span> : null}
                    <span className="kpill" title={new Date(e.createdAt).toLocaleString()}>
                      {new Date(e.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <div style={{ whiteSpace: "pre-wrap", marginTop: 6 }}>{e.content}</div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    );
  }

  return (
    <main className="container">
      <div className="card" style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 16 }}>
        {/* LEFT: Dates list */}
        <aside>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <h2 style={{ margin: 0 }}>Dates</h2>
            <span className="kpill">{tz}</span>
          </div>

          {datesLoading && <p>Loading…</p>}
          {datesErr && (
            <div
              style={{
                padding: "10px 12px",
                border: "1px solid #5a1a1a",
                background: "#2a0f0f",
                color: "#ffb3b3",
                borderRadius: 8,
                wordBreak: "break-word",
              }}
            >
              {datesErr}
            </div>
          )}

          {!datesLoading && !datesErr && dates.length === 0 && <p>No diary entries yet.</p>}

          <ul className="list">
            {dates.map((d) => {
              const selected = d === selectedDate;
              return (
                <li key={d}>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setSelectedDate(d)}
                    aria-pressed={selected}
                    style={selected ? { width: "100%", background: "#1f4d36" } : { width: "100%" }}
                    title={d}
                  >
                    {formatHuman(d, tz)}
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* RIGHT: Day detail */}
        <section>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <h1 style={{ margin: 0 }}>
              {selectedDate ? formatHuman(selectedDate, tz) : "Select a date"}
            </h1>
            {selectedDate && <span className="kpill">{selectedDate}</span>}
          </div>

          {dayLoading && <p style={{ marginTop: 8 }}>Loading…</p>}
          {dayErr && (
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
              {dayErr}
            </div>
          )}

          {!dayLoading && !dayErr && selectedDate && entries.length === 0 && (
            <p style={{ marginTop: 8 }}>No diary notes for this date.</p>
          )}

          {!dayLoading && !dayErr && selectedDate && (
            <>
              {/* Learn is empty today unless you extend the API to allow learn-type diary entries */}
              
              <Section title="Practice" items={practice} />
              <Section title="Reflect" items={reflect} />
            </>
          )}
        </section>
      </div>
    </main>
  );
}
