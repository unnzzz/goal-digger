"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";

type Me = { ok: boolean; name?: string|null; email?: string|null; coins?: number };

export default function NavBar() {
  const { data: session, status } = useSession();
  const [coins, setCoins] = useState<number | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);

  const fetchMe = async () => {
    try {
      const res = await fetch("/api/me", { cache: "no-store" });
      const j: Me = await res.json();
      if (j.ok) {
        setCoins(j.coins ?? 0);
        setDisplayName((j.name && j.name.trim()) || (j.email ?? null));
      } else {
        setCoins(null);
        setDisplayName(null);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    // fetch on mount if authenticated
    if (status === "authenticated") fetchMe();
  }, [status]);

  useEffect(() => {
    // refresh coins when any part of the app dispatches this event
    const onRefresh = () => fetchMe();
    window.addEventListener("coins:refresh", onRefresh);
    window.addEventListener("auth:changed", onRefresh);
    return () => {
      window.removeEventListener("coins:refresh", onRefresh);
      window.removeEventListener("auth:changed", onRefresh);
    };
  }, []);

  return (
    <nav style={{padding:12, borderBottom:"1px solid #222"}}>
      <div className="container" style={{display:"flex", gap:12, alignItems:"center"}}>
        <Link href="/">Generator</Link>
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/diary">Diary</Link>

        <div style={{marginLeft:"auto", display:"flex", alignItems:"center", gap:12}}>
          {status === "authenticated" ? (
            <>
              <span className="kpill">💰 {coins ?? 0} coins</span>
              <span>{displayName ?? session?.user?.email}</span>
              <button className="btn" style={{padding:"4px 10px"}} onClick={() => signOut()}>Sign out</button>
            </>
          ) : (
            <>
              <Link href="/signup">Sign up</Link><span>•</span>
              <Link href="/login">Log in</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
