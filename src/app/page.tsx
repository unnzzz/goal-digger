"use client";
import { useState } from "react";

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

export default function Page() {
  // form state
  const [goal, setGoal] = useState("");
  const [dailyMinutes, setDailyMinutes] = useState(60);
  const [totalDays, setTotalDays] = useState(10);
  const [targetDate, setTargetDate] = useState("");

  // generation state
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<number>(0);   // 0–100
  const [status, setStatus] = useState<string>("");
  const [data, setData] = useState<Roadmap | null>(null);
  const [original, setOriginal] = useState<Roadmap | null>(null);
  const [error, setError] = useState<string | null>(null);

  // editing state
  const [editMode, setEditMode] = useState(false);

  // save-to-account state
  const [saveTitle, setSaveTitle] = useState("");
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // ---- inline edit helpers (before saving) ----
  const setRoadmap = (updater: (prev: Roadmap) => Roadmap) => {
    setData((prev) => (prev ? updater(prev) : prev));
  };

  const addResource = (dayIdx: number, section: "learn" | "practice") => {
    const title = prompt("Resource title"); if (!title) return;
    const url = prompt("Resource URL"); if (!url) return;
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

  // ---- generation submit (always streaming) ----
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setData(null);
    setOriginal(null);
    setEditMode(false);
    setLoading(true);
    setProgress(0);
    setStatus("Starting…");

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

      if (!res.body) throw new Error("No response stream");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        let idx;
        while ((idx = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, idx).trim();
          buf = buf.slice(idx + 1);
          if (!line) continue;

          try {
            const evt = JSON.parse(line);

            if (evt.type === "progress") {
              const pct = typeof evt.percent === "number"
                ? Math.max(0, Math.min(100, Math.round(evt.percent)))
                : Math.round((evt.done / Math.max(1, evt.total)) * 100);
              setProgress(pct);
              if (evt.message) setStatus(evt.message);
            }

            if (evt.type === "result") {
              const out = evt.data as Roadmap;
              setData(out);
              setOriginal(out);
              setProgress(100);
              setStatus("Done");
            }

            if (evt.type === "error") {
              throw new Error(evt.message || "Generation error");
            }
          } catch {
            // ignore malformed lines
          }
        }
      }
    } catch (err: any) {
      setError(err?.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container">
      <div className="card">
        <h1>Roadmap Generator</h1>
        <p>Enter a goal and time budget. Get a daily Learn / Practice / Reflect plan with free links — edit it before saving.</p>

        <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
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
                onChange={(e) => setDailyMinutes(parseInt(e.target.value, 10))}
                required
              />
            </div>
            <div>
              <label>Total days</label>
              <input
                type="number"
                min={1}
                value={totalDays}
                onChange={(e) => setTotalDays(parseInt(e.target.value, 10))}
                disabled={!!targetDate}
              />
              <small>Disabled if you set a target date</small>
            </div>
            <div>
              <label>Target date (optional)</label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>
          </div>

          <button className="btn" style={{ marginTop: 12 }} disabled={loading}>
            {loading ? "Generating…" : "Generate roadmap"}
          </button>
        </form>

        {loading && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <progress value={progress} max={100} style={{ width: 240 }} />
              <span>{status || `${progress}%`}</span>
            </div>
            <small>Finding resources and building your plan…</small>
          </div>
        )}

        {error && <p style={{ color: "#ff8a8a", marginTop: 12 }}>Error: {error}</p>}

        {data && (
          <>
            {/* Edit controls */}
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button className="btn" onClick={() => setEditMode((v) => !v)}>
                {editMode ? "Stop editing" : "Edit roadmap"}
              </button>
              {editMode && original && (
                <button className="btn" onClick={revertEdits}>Revert changes</button>
              )}
            </div>

            <section style={{ marginTop: 20 }}>
              <header>
                <h2>
                  {data.goal} <span className="kpill">{data.total_days} days</span>{" "}
                  <span className="kpill">≈ {data.daily_minutes} min/day</span>
                </h2>
              </header>

              {data.days.map((d, di) => (
                <article key={d.day} className="day">
                  <h3>
                    Day {d.day}: {d.title} <span className="badge">{d.minutes} min</span>
                    {editMode && (
                      <button className="btn" style={{ marginLeft: 8 }} onClick={() => editDayTitle(di)}>
                        Edit title
                      </button>
                    )}
                  </h3>

                  <h4>Learn</h4>
                  <ul className="list">
                    {d.learn.map((r, i) => (
                      <li key={`L${d.day}-${i}`}>
                        <strong>[{r.kind}]</strong>{" "}
                        <a href={r.url} target="_blank" rel="noreferrer">{r.title}</a>
                        {r.split ? (
                          <span className="kpill">
                            Part {r.split.part_number}/{r.split.total_parts}: {r.split.range}
                          </span>
                        ) : null}
                        {editMode && (
                          <>
                            <button className="btn" style={{ marginLeft: 8 }} onClick={() => editResource(di, "learn", i)}>Edit</button>
                            <button className="btn" style={{ marginLeft: 8 }} onClick={() => deleteResource(di, "learn", i)}>Delete</button>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                  {editMode && (
                    <button className="btn" onClick={() => addResource(di, "learn")}>Add Learn resource</button>
                  )}

                  <h4>Practice</h4>
                  <ul className="list">
                    {d.practice.map((r, i) => (
                      <li key={`P${d.day}-${i}`}>
                        <strong>[{r.kind}]</strong>{" "}
                        <a href={r.url} target="_blank" rel="noreferrer">{r.title}</a>
                        {r.split ? (
                          <span className="kpill">
                            Part {r.split.part_number}/{r.split.total_parts}: {r.split.range}
                          </span>
                        ) : null}
                        {editMode && (
                          <>
                            <button className="btn" style={{ marginLeft: 8 }} onClick={() => editResource(di, "practice", i)}>Edit</button>
                            <button className="btn" style={{ marginLeft: 8 }} onClick={() => deleteResource(di, "practice", i)}>Delete</button>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                  {editMode && (
                    <button className="btn" onClick={() => addResource(di, "practice")}>Add Practice resource</button>
                  )}

                  <h4>Reflect</h4>
                  {!editMode ? (
                    <p style={{ marginTop: 6 }}>{d.reflect}</p>
                  ) : (
                    <textarea
                      style={{ width: "100%", minHeight: 90, marginTop: 6 }}
                      value={d.reflect}
                      onChange={(e) => onChangeReflect(di, e.target.value)}
                    />
                  )}
                </article>
              ))}
            </section>

            {/* Save to account (uses the possibly edited roadmap) */}
            <section style={{ marginTop: 12 }}>
              <h3>Save this roadmap</h3>
              <label>Goal title</label>
              <input
                placeholder="e.g., Learn SQL for data analysis"
                value={saveTitle}
                onChange={(e) => setSaveTitle(e.target.value)}
              />
              <button
                className="btn"
                style={{ marginTop: 8 }}
                onClick={async () => {
                  if (!data) return;
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
                      }),
                    });
                    setSaveMsg(res.ok ? "Saved! Open your Dashboard." : "Save failed (log in?)");
                  } catch (e: any) {
                    setSaveMsg(e.message || "Save failed");
                  }
                }}
              >
                Save to my account
              </button>
              {saveMsg && <p>{saveMsg}</p>}
            </section>
          </>
        )}
      </div>

      <footer>
        <p>Built with OpenAI Responses API (web_search tool) + Structured Outputs — generation logic unchanged.</p>
      </footer>
    </main>
  );
}
