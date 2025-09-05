"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
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

const AVATAR_FALLBACK = "/avatars/astronaut.png";
const COIN_ICON = "/ui/coin.png";

export default function NavBar() {
  const { data: session, status } = useSession();
  const [coins, setCoins] = useState<number>(0);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [avatarKey, setAvatarKey] = useState<string | null>(null);

  async function fetchMe() {
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

      setCoins(coinsVal);
      setDisplayName((name && name.trim()) || email || null);
      setAvatarKey(avatar);
    } catch {
      // ignore network errors, keep prior UI
    }
  }

  useEffect(() => {
    if (status === "authenticated") fetchMe();
  }, [status]);

  useEffect(() => {
    const onRefresh = () => fetchMe();
    window.addEventListener("coins:refresh", onRefresh);
    window.addEventListener("auth:changed", onRefresh);
    return () => {
      window.removeEventListener("coins:refresh", onRefresh);
      window.removeEventListener("auth:changed", onRefresh);
    };
  }, []);

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
