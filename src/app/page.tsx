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
  const [goal, setGoal] = useState("");
  const [dailyMinutes, setDailyMinutes] = useState(60);
  const [totalDays, setTotalDays] = useState(10);
  const [targetDate, setTargetDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Roadmap | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setData(null);
    setLoading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal,
          daily_minutes: Number(dailyMinutes),
          total_days: targetDate ? undefined : Number(totalDays),
          target_date: targetDate || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to generate");
      setData(json as Roadmap);
    } catch (err: any) {
      setError(err.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container">
      <div className="card">
        <h1>Roadmap Generator</h1>
        <p>Enter a goal and time budget. Get a daily Learn / Practice / Reflect plan with free links.</p>

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

        {error && (
          <p style={{ color: "#ff8a8a", marginTop: 12 }}>Error: {error}</p>
        )}

        {data && (
          <section style={{ marginTop: 20 }}>
            <header>
              <h2>
                {data.goal} <span className="kpill">{data.total_days} days</span>{" "}
                <span className="kpill">≈ {data.daily_minutes} min/day</span>
              </h2>
            </header>

            {data.days.map((d) => (
              <article key={d.day} className="day">
                <h3>
                  Day {d.day}: {d.title} <span className="badge">{d.minutes} min</span>
                </h3>

                <h4>Learn</h4>
                <ul className="list">
                  {d.learn.map((r, i) => (
                    <li key={`L${d.day}-${i}`}>
                      <strong>[{r.kind}]</strong>{" "}
                      <a href={r.url} target="_blank" rel="noreferrer">{r.title}</a>
                      {r.source ? <span className="kpill">{r.source}</span> : null}
                      {r.duration_minutes ? <span className="kpill">~{r.duration_minutes} min</span> : null}
                      {r.split ? (
                        <span className="kpill">Part {r.split.part_number}/{r.split.total_parts}: {r.split.range}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>

                <h4>Practice</h4>
                <ul className="list">
                  {d.practice.map((r, i) => (
                    <li key={`P${d.day}-${i}`}>
                      <strong>[{r.kind}]</strong>{" "}
                      <a href={r.url} target="_blank" rel="noreferrer">{r.title}</a>
                      {r.source ? <span className="kpill">{r.source}</span> : null}
                      {r.duration_minutes ? <span className="kpill">~{r.duration_minutes} min</span> : null}
                      {r.split ? (
                        <span className="kpill">Part {r.split.part_number}/{r.split.total_parts}: {r.split.range}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>

                <h4>Reflect</h4>
                <p style={{ marginTop: 6 }}>{d.reflect}</p>
              </article>
            ))}

            <footer>
              <button
                className="btn"
                onClick={() => {
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${data.goal.replace(/\s+/g, "-").toLowerCase()}-roadmap.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Download JSON
              </button>
            </footer>
          </section>
        )}
      </div>
      <footer>
        <p>Built with OpenAI Responses API and Structured Outputs.</p>
      </footer>
    </main>
  );
}
