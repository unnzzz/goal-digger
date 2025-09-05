"use client";

import { useState } from "react";

const COINS = { learn: 5, practice: 10, reflect: 5 } as const;

type Resource = {
  kind: "watch" | "listen" | "read";
  title: string;
  url: string;
  source: string | null;
  duration_minutes: number | null;
  split: { total_parts: number; part_number: number; range: string } | null;
};

type Day = {
  day: number;
  title: string;
  minutes: number;
  learn: Resource[];
  practice: Resource[];
  reflect: string;
};

type Roadmap = {
  goal: string;
  total_days: number;
  daily_minutes: number;
  days: Day[];
};

const CARD_COLORS = ["#FFD1A1", "#C6F1DA", "#9FD6FF", "#FFB3C7", "#C8B6FF", "#FFE6A7"];
const SECTION_META: Record<
  "learn" | "practice" | "reflect",
  { label: string; icon: string; tint: string }
> = {
  learn: { label: "LEARN", icon: "📚", tint: "#EAF7FF" },
  practice: { label: "PRACTICE", icon: "🛠️", tint: "#EFFFF1" },
  reflect: { label: "REFLECT", icon: "💭", tint: "#FFF3F5" },
};

function band(n: number) {
  return CARD_COLORS[n % CARD_COLORS.length];
}

function SplitBadge({ r }: { r: Resource }) {
  if (!r?.split) return null;
  const { part_number, total_parts, range } = r.split;
  const approx =
    r.duration_minutes && total_parts ? `≈ ${Math.round(r.duration_minutes / total_parts)} min` : null;
  return (
    <span className="kpill">
      Today: Part {part_number}/{total_parts}
      {range ? ` — ${range}` : ""}
      {approx ? ` (${approx})` : ""}
    </span>
  );
}

export default function Page() {
  // form state
  const [goal, setGoal] = useState("");
  const [dailyMinutes, setDailyMinutes] = useState(30);
  const [totalDays, setTotalDays] = useState(10);
  const [targetDate, setTargetDate] = useState("");

  // generation state
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<number>(0); // 0–100
  const [status, setStatus] = useState<string>("");
  const [data, setData] = useState<Roadmap | null>(null);
  const [original, setOriginal] = useState<Roadmap | null>(null);
  const [error, setError] = useState<string | null>(null);

  // editing state
  const [editMode, setEditMode] = useState(false);

  // save state
  const [saveTitle, setSaveTitle] = useState("");
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // community suggestions
  const [comm, setComm] = useState<{ highlights: string[]; resources: { title: string; url: string }[] } | null>(null);
  const [commLoading, setCommLoading] = useState(false);

  // ---- inline edit helpers (before saving) ----
  const setRoadmap = (updater: (prev: Roadmap) => Roadmap) => {
    setData((prev) => (prev ? updater(prev) : prev));
  };

  const addResource = (dayIdx: number, section: "learn" | "practice") => {
    const title = prompt("Resource title");
    if (!title) return;
    const url = prompt("Resource URL");
    if (!url) return;
    const kind = (prompt('kind: "watch" | "listen" | "read"') || "read") as Resource["kind"];
    setRoadmap((prev) => {
      const next = structuredClone(prev);
      next.days[dayIdx][section].push({ kind, title, url, source: null, duration_minutes: null, split: null });
      return next;
    });
  };

  const editResource = (dayIdx: number, section: "learn" | "practice", idx: number) => {
    setRoadmap((prev) => {
      const r = prev.days[dayIdx][section][idx];
      const title = prompt("New title", r.title) ?? r.title;
      const url = prompt("New URL", r.url) ?? r.url;
      const next = structuredClone(prev);
      next.days[dayIdx][section][idx] = { ...r, title, url };
      return next;
    });
  };

  const deleteResource = (dayIdx: number, section: "learn" | "practice", idx: number) => {
    setRoadmap((prev) => {
      const next = structuredClone(prev);
      next.days[dayIdx][section].splice(idx, 1);
      return next;
    });
  };

  const editDayTitle = (dayIdx: number) => {
    setRoadmap((prev) => {
      const current = prev.days[dayIdx].title;
      const title = prompt("New day title", current);
      if (!title) return prev;
      const next = structuredClone(prev);
      next.days[dayIdx].title = title;
      return next;
    });
  };

  const onChangeReflect = (dayIdx: number, value: string) => {
    setRoadmap((prev) => {
      const next = structuredClone(prev);
      next.days[dayIdx].reflect = value;
      return next;
    });
  };

  const revertEdits = () => {
    if (!original) return;
    setData(structuredClone(original));
    setEditMode(false);
  };

  // ---- generation submit (NDJSON streaming) ----
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setData(null);
    setOriginal(null);
    setEditMode(false);
    setSaveMsg(null);
    setSaving(false);
    setComm(null);
    setCommLoading(false);
    setProgress(0);
    setStatus("Starting…");
    setLoading(true);

    try {
      const res = await fetch("/api/generate/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal,
          daily_minutes: Number(dailyMinutes),
          total_days: targetDate ? undefined : Number(totalDays),
          target_date: targetDate || undefined,
        }),
      });

      if (!res.body) {
        const text = await res.text();
        setError(text || "Generation failed.");
        setLoading(false);
        setStatus("");
        setProgress(0);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let aborted = false;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        let idx;
        while ((idx = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, idx).trim();
          buf = buf.slice(idx + 1);
          if (!line) continue;

          let evt: any = null;
          try {
            evt = JSON.parse(line);
          } catch {
            continue;
          }

          if (evt.type === "progress") {
            const pct =
              typeof evt.percent === "number"
                ? Math.max(0, Math.min(100, Math.round(evt.percent)))
                : Math.round((evt.done / Math.max(1, evt.total)) * 100);
            setProgress(pct);
            if (evt.message) setStatus(evt.message);
            continue;
          }

          if (evt.type === "error") {
            setError(evt.message || "This goal is not allowed.");
            setLoading(false);
            setStatus("");
            setProgress(0);
            aborted = true;
            try {
              await reader.cancel();
            } catch {}
            break;
          }

          if (evt.type === "result") {
            const out = evt.data as Roadmap;
            setData(out);
            setOriginal(out);
            setSaveTitle(out.goal);
            setProgress(100);
            setStatus("Done");

            // Load community suggestions (Reddit)
            setComm(null);
            setCommLoading(true);
            try {
              const r = await fetch("/api/community", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ goal: out.goal }),
              });
              const j = await r.json();
              setComm(j.suggestions || null);
            } catch {
              setComm(null);
            } finally {
              setCommLoading(false);
            }
            continue;
          }
        }

        if (aborted) break;
      }
    } catch (err: any) {
      setError(err?.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container">
      {/* HERO */}
      <div
        className="card"
        style={{
          background: "#FFF8E8",
          borderColor: "#EADBC2",
          display: "grid",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 28 }}>🐱‍👤</span>
          <h1 style={{ margin: 0 }}>Goal-Digger</h1>
          <span className="kpill">Turn any goal into daily quests</span>
        </div>
        <p style={{ margin: 0 }}>
          Tell us your goal and time budget. We’ll craft a colorful roadmap with{" "}
          <strong>Learn / Practice / Reflect</strong> cards — complete quests, earn coins, and level up.
        </p>
      </div>

      {/* GENERATOR FORM */}
      <div className="grid" style={{ marginTop: 12, display: "grid", gap: 12, gridTemplateColumns: "1.1fr .9fr" }}>
        <div className="card" style={{ background: "#F3FBFF", borderColor: "#CFEAF9" }}>
          <h2 style={{ marginTop: 0 }}>🎯 Your Goal</h2>
          <form onSubmit={handleSubmit}>
            <label>Goal</label>
            <input
              placeholder="e.g., Learn SQL for data analysis"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              required
            />

            <div className="grid" style={{ marginTop: 10 }}>
              <div>
                <label>Daily minutes</label>
                <input
                  type="number"
                  min={10}
                  max={240}
                  value={dailyMinutes}
                  onChange={(e) => setDailyMinutes(parseInt(e.target.value, 10) || 0)}
                  required
                />
              </div>
              <div>
                <label>Total days</label>
                <input
                  type="number"
                  min={1}
                  value={totalDays}
                  onChange={(e) => setTotalDays(parseInt(e.target.value, 10) || 1)}
                  disabled={!!targetDate}
                />
                <small>Disabled if a target date is set</small>
              </div>
              <div>
                <label>Target date (optional)</label>
                <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
              </div>
            </div>

            <button className="btn" style={{ marginTop: 12 }} disabled={loading}>
              {loading ? "Generating…" : "Generate roadmap"}
            </button>

            {loading && (
              <div
                style={{
                  marginTop: 12,
                  background: "#FFF",
                  border: "1px solid #eee",
                  borderRadius: 10,
                  padding: 10,
                }}
              >
                <div style={{ height: 8, width: "100%", background: "#eee", borderRadius: 999 }}>
                  <div
                    style={{
                      height: 8,
                      width: `${progress}%`,
                      background: "#8ADBA5",
                      borderRadius: 999,
                      transition: "width .3s ease",
                    }}
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                  <small>{status || "Working…"}</small>
                  <small>{progress}%</small>
                </div>
              </div>
            )}

            {error && (
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
                {error}
              </div>
            )}
          </form>
        </div>

        <div className="card" style={{ background: "#FFF4F8", borderColor: "#F9CBD9" }}>
          <h2 style={{ marginTop: 0 }}>🍯 Tips</h2>
          <ul className="list">
            <li>Be specific: “Ship a React portfolio” beats “learn coding”.</li>
            <li>Pick a realistic time budget (15–60 min works great).</li>
            <li>After generation you can <b>edit</b> the plan before saving.</li>
          </ul>
          <div className="kpill" style={{ marginTop: 8 }}>Safe & filtered: illegal/explicit goals are blocked.</div>
        </div>
      </div>

      {/* RESULT / EDITOR */}
      {data && (
        <>
          {/* Controls */}
          <div className="card" style={{ marginTop: 12, background: "#FFFCEC", borderColor: "#F3E8B7" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h2 style={{ margin: 0 }}>
                {data.goal} <span className="kpill">{data.total_days} days</span>{" "}
                <span className="kpill">≈ {data.daily_minutes} min/day</span>
              </h2>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                <button className="btn" onClick={() => setEditMode((v) => !v)}>
                  {editMode ? "Stop editing" : "Edit roadmap"}
                </button>
                {editMode && original && (
                  <button className="btn-ghost" onClick={revertEdits}>
                    Revert changes
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Days grid */}
          <div
            className="grid"
            style={{ marginTop: 12, display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))" }}
          >
            {data.days.map((d, di) => (
              <article key={d.day} className="card" style={{ overflow: "hidden" }}>
                <div className="band" style={{ height: 8, background: band(di) }} />
                <div style={{ padding: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span className="kpill" style={{ background: band(di), borderColor: "#00000022" }}>
                      Day {d.day}
                    </span>
                    <strong style={{ fontSize: 16 }}>{d.title}</strong>
                    <span className="kpill">{d.minutes} min</span>
                    {editMode && (
                      <button className="btn-ghost" onClick={() => editDayTitle(di)}>
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
                        <li key={`L${d.day}-${i}`}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <strong>[{r.kind}]</strong>
                            <a href={r.url} target="_blank" rel="noreferrer">
                              {r.title}
                            </a>
                            <SplitBadge r={r} />
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
                      <button className="btn-ghost" onClick={() => addResource(di, "learn")}>
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
                        <li key={`P${d.day}-${i}`}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <strong>[{r.kind}]</strong>
                            <a href={r.url} target="_blank" rel="noreferrer">
                              {r.title}
                            </a>
                            <SplitBadge r={r} />
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
                        </li>
                      ))}
                    </ul>
                    {editMode && (
                      <button className="btn-ghost" onClick={() => addResource(di, "practice")}>
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
                      <p style={{ marginTop: 8 }}>{d.reflect}</p>
                    ) : (
                      <div style={{ marginTop: 8 }}>
                        <textarea
                          style={{ width: "100%", minHeight: 90 }}
                          value={d.reflect}
                          onChange={(e) => onChangeReflect(di, e.target.value)}
                        />
                      </div>
                    )}
                  </section>
                </div>
              </article>
            ))}
          </div>

          {/* SAVE */}
          <div className="card" style={{ marginTop: 12, background: "#EDF9F3", borderColor: "#CFEBDD" }}>
            <h3 style={{ marginTop: 0 }}>💾 Save this roadmap</h3>
            <label>Goal title</label>
            <input placeholder="e.g., Learn SQL for data analysis" value={saveTitle} onChange={(e) => setSaveTitle(e.target.value)} />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              <button
                className="btn"
                disabled={saving}
                onClick={async () => {
                  if (!data) return;
                  setSaving(true);
                  setSaveMsg(null);
                  try {
                    const res = await fetch("/api/goals", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        title: saveTitle || data.goal,
                        dailyMinutes: data.daily_minutes,
                        totalDays: data.total_days,
                        roadmap: data,
                        startNow: false,
                      }),
                    });
                    const j = await res.json();
                    setSaveMsg(res.ok ? (j.existed ? "Already saved." : "Saved!") : "Save failed (log in?)");
                  } catch (e: any) {
                    setSaveMsg(e.message || "Save failed");
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                {saving ? "Saving…" : "Save to my account"}
              </button>

              <button
                className="btn"
                disabled={saving}
                onClick={async () => {
                  if (!data) return;
                  setSaving(true);
                  setSaveMsg(null);
                  try {
                    const res = await fetch("/api/goals", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        title: saveTitle || data.goal,
                        dailyMinutes: data.daily_minutes,
                        totalDays: data.total_days,
                        roadmap: data,
                        startNow: true, // server is idempotent
                      }),
                    });
                    const j = await res.json();
                    setSaveMsg(
                      res.ok ? (j.existed ? "Already saved — started today if not already." : "Saved & started! Check Dashboard → Daily quests.") : "Save failed (log in?)"
                    );
                  } catch (e: any) {
                    setSaveMsg(e.message || "Save failed");
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                {saving ? "Starting…" : "Save & start today"}
              </button>
            </div>
            {saveMsg && <p style={{ marginTop: 8 }}>{saveMsg}</p>}
          </div>

          {/* COMMUNITY */}
          <div className="card" style={{ marginTop: 12, background: "#F7F0FF", borderColor: "#E2D6FF" }}>
            <h3 style={{ marginTop: 0 }}>🌟 Community suggestions (Reddit)</h3>
            {commLoading && <p>Gathering advice…</p>}
            {!commLoading && comm && (
              <>
                {comm.highlights?.length ? (
                  <ul className="list">
                    {comm.highlights.map((h, i) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                ) : (
                  <p>No highlights found.</p>
                )}
                {comm.resources?.length ? (
                  <>
                    <h4>Resources mentioned</h4>
                    <ul className="list">
                      {comm.resources.map((r, i) => (
                        <li key={i}>
                          <a href={r.url} target="_blank" rel="noreferrer">
                            {r.title || r.url}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </>
            )}
          </div>
        </>
      )}

      <footer style={{ opacity: 0.7, marginTop: 16 }}>
        <small>Made fun with colorful bento cards — keep digging those goals! 🪙</small>
      </footer>
    </main>
  );
}
