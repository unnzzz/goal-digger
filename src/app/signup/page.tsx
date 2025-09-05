"use client";
import { useState } from "react";
import Link from "next/link";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setOk(null); setLoading(true);
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });

      const maybeJson = async () => {
        try { return await res.json(); } catch { return {}; }
      };
      const j = await maybeJson();

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
    <main className="container">
      <div className="card" style={{ maxWidth: 480 }}>
        <h1>Create account</h1>
        <form onSubmit={onSubmit} style={{ display: "grid", gap: 10, marginTop: 12 }}>
          <label>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          <label>Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          <label>Password</label>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          <button className="btn" disabled={loading}>{loading ? "Creating…" : "Sign up"}</button>
          {err && <p style={{ color: "#ff8a8a" }}>{err}</p>}
          {ok && <p style={{ color: "#8aff8a" }}>{ok}</p>}
        </form>
        <p style={{ marginTop: 12 }}>Already verified? <Link href="/login">Log in</Link></p>
      </div>
    </main>
  );
}
