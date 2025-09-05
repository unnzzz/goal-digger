"use client";
import { useState } from "react";
import Link from "next/link";

const AVATARS = [
  { key: "astronaut", label: "Astronaut" },
  { key: "runner", label: "Runner" },
  { key: "hacker_cat", label: "Hacker Cat" },
  { key: "plant_witch", label: "Plant Witch" },
];

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [avatarKey, setAvatarKey] = useState<string>("astronaut");

  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setOk(null);
    setLoading(true);
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // NOTE: backend should accept avatarKey and store it on the user
        body: JSON.stringify({ email, password, name, avatarKey }),
      });

      let j: any = {};
      try {
        j = await res.json();
      } catch {
        // ignore non-JSON errors
      }

      if (!res.ok) {
        setErr(j.error || "Sign up failed");
        return;
      }
      setOk("Check your email for a verification link. After verifying, log in.");
    } catch (e: any) {
      setErr(e?.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container" style={{ paddingTop: 16 }}>
      <div className="card" style={{ maxWidth: 560 }}>
        <h1>Create account</h1>

        <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, marginTop: 12 }}>
          <label>
            <div style={{ marginBottom: 6 }}>Name</div>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          </label>

          <label>
            <div style={{ marginBottom: 6 }}>Email</div>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </label>

          <label>
            <div style={{ marginBottom: 6 }}>Password</div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
            />
          </label>

          {/* Avatar picker */}
          <div>
            <div style={{ marginBottom: 6 }}>Choose your avatar</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              {AVATARS.map((a) => (
                <button
                  key={a.key}
                  type="button"
                  onClick={() => setAvatarKey(a.key)}
                  aria-pressed={avatarKey === a.key}
                  title={a.label}
                  style={{
                    border: avatarKey === a.key ? "2px solid #4f46e5" : "1px solid #333",
                    borderRadius: 10,
                    padding: 10,
                    background: "transparent",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <img
                    src={`/avatars/${a.key}.png`}
                    alt={a.label}
                    width={72}
                    height={72}
                    style={{ borderRadius: 8, objectFit: "cover" }}
                  />
                  <small style={{ opacity: 0.9 }}>{a.label}</small>
                </button>
              ))}
            </div>
          </div>

          <button className="btn" disabled={loading}>
            {loading ? "Creating…" : "Sign up"}
          </button>

          {err ? <div style={{ color: "#ff8a8a" }}>{err}</div> : null}
          {ok ? <div style={{ color: "#8aff8a" }}>{ok}</div> : null}
        </form>

        <div style={{ marginTop: 12 }}>
          Already verified? <Link href="/login">Log in</Link>
        </div>
      </div>
    </main>
  );
}
