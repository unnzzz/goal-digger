"use client";
import Link from "next/link";
import { useEffect, useState, useCallback, useRef } from "react";
import { useSession, signOut } from "next-auth/react";

type MeResponse =
  | {
      // shape from newer /api/me I gave you
      name: string | null;
      coins: number;
      avatarKey?: string | null;
      email?: string | null;
    }
  | {
      // legacy shape you showed earlier
      ok: boolean;
      name?: string | null;
      email?: string | null;
      coins?: number;
      avatarKey?: string | null;
    };

const AVATAR_FALLBACK = "/avatars/monkey.png";
const COIN_ICON = "/icons/coin.png";

export default function NavBar() {
  const { data: session, status } = useSession();
  const [coins, setCoins] = useState<number>(0);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [avatarKey, setAvatarKey] = useState<string | null>(null);
  const fetchMeRef = useRef<() => Promise<void>>();

  const fetchMe = useCallback(async () => {
    console.log('NavBar fetchMe called');
    try {
      const res = await fetch("/api/me", { cache: "no-store" });
      if (!res.ok) {
        setCoins(0);
        setDisplayName(null);
        setAvatarKey(null);
        return;
      }
      const j: MeResponse = await res.json();

      // Handle both response shapes
      const isOkFlag = (j as any).ok === true;
      const name = (isOkFlag ? (j as any).name : (j as any).name) ?? null;
      const email = (isOkFlag ? (j as any).email : (j as any).email) ?? null;
      const coinsVal =
        (isOkFlag ? (j as any).coins : (j as any).coins) ?? 0;
      const avatar =
        (isOkFlag ? (j as any).avatarKey : (j as any).avatarKey) ?? null;

      console.log('NavBar updating coins to:', coinsVal);
      setCoins(coinsVal);
      setDisplayName((name && name.trim()) || email || null);
      setAvatarKey(avatar);
    } catch {
      // ignore network errors, keep prior UI
    }
  }, []);

  // Keep the ref updated with the latest fetchMe function
  useEffect(() => {
    fetchMeRef.current = fetchMe;
  }, [fetchMe]);

  useEffect(() => {
    if (status === "authenticated") fetchMe();
  }, [status, fetchMe]);

  useEffect(() => {
    const onRefresh = () => {
      console.log('NavBar received coins:refresh event');
      // Use the ref to get the latest fetchMe function
      if (fetchMeRef.current) {
        fetchMeRef.current();
      }
    };
    window.addEventListener("coins:refresh", onRefresh);
    window.addEventListener("auth:changed", onRefresh);
    return () => {
      window.removeEventListener("coins:refresh", onRefresh);
      window.removeEventListener("auth:changed", onRefresh);
    };
  }, []); // Empty dependency array - event listener is set up once

  const avatarSrc =
    avatarKey ? `/avatars/${avatarKey}.png` : AVATAR_FALLBACK;

  return (
    <nav style={{ padding: 12, borderBottom: "1px solid #222" }}>
      <div
        className="container"
        style={{ display: "flex", gap: 12, alignItems: "center" }}
      >
        <Link href="/">Generator</Link>
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/diary">Diary</Link>
        <Link href="/shop">Shop</Link>
        <Link href="/room">Room</Link>

        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          {status === "authenticated" ? (
            <>
              <span
                className="kpill"
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                title={`${coins} coins`}
              >
                <img
                  src={COIN_ICON}
                  alt="coins"
                  width={16}
                  height={16}
                  style={{ display: "inline-block" }}
                />
                {coins}
              </span>

              <Link
                href="/account"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  textDecoration: "none",
                }}
                title="Account"
              >
                <img
                  src={avatarSrc}
                  alt="avatar"
                  width={28}
                  height={28}
                  style={{ borderRadius: 8 }}
                />
                <span>{displayName ?? session?.user?.email ?? "You"}</span>
              </Link>

              <button
                className="btn"
                style={{ padding: "4px 10px" }}
                onClick={() => signOut()}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/signup">Sign up</Link>
              <span>•</span>
              <Link href="/login">Log in</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
