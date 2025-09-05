"use client";
import { useEffect, useState } from "react";

type ShopItem = {
  id: string;
  name: string;
  cost: number;
  boosts: { INT: number; STR: number; VIT: number; AES: number; WLH: number };
  locked: boolean;
  reasons: string[];
  owned: boolean;
};

type ShopListResponse =
  | { coins: number; items: ShopItem[] }
  | { error: string };

export default function ShopPage() {
  const [coins, setCoins] = useState<number>(0);
  const [items, setItems] = useState<ShopItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unauth, setUnauth] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    setUnauth(false);
    try {
      const r = await fetch("/api/shop/list", {
        cache: "no-store",
        // credentials not required for same-origin in browser, but explicit is safe:
        credentials: "include",
      });

      // Note: if not logged in, this endpoint should return 401 with {error:"Unauthorized"}
      const j: ShopListResponse = await r.json().catch(() => ({ error: "Bad JSON from /api/shop/list" }));
      console.log("[shop] /api/shop/list ->", j);

      if (!r.ok) {
        if ((j as any)?.error === "Unauthorized") {
          setUnauth(true);
          setItems([]);
          setCoins(0);
          return;
        }
        setError((j as any)?.error || `HTTP ${r.status}`);
        setItems([]);
        setCoins(0);
        return;
      }

      const data = j as { coins: number; items: ShopItem[] };
      setCoins(data.coins ?? 0);
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e: any) {
      setError(e?.message || "Network error");
      setItems([]);
      setCoins(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const buy = async (id: string) => {
    setMsg(null);
    setError(null);
    try {
      const r = await fetch("/api/shop/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ itemId: id }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (r.status === 401) {
          setUnauth(true);
          setMsg(null);
          return;
        }
        setError(j.error || "Failed to buy");
        return;
      }
      setMsg("Purchased!");
      setCoins(j.coins ?? 0);
      await load();
      // Let the navbar refresh coins
      window.dispatchEvent(new Event("coins:refresh"));
    } catch (e: any) {
      setError(e?.message || "Network error");
    }
  };

  return (
    <main className="container" style={{ marginTop: 16 }}>
      <h1>Shop</h1>

      {loading && <div>Loading…</div>}

      {!loading && unauth && (
        <div className="card" style={{ padding: 12 }}>
          <strong>You must be logged in to view the shop.</strong>
          <div style={{ marginTop: 8 }}>
            Please <a href="/login">log in</a> or <a href="/signup">create an account</a>.
          </div>
        </div>
      )}

      {!loading && !unauth && error && (
        <div className="error" style={{ padding: 12 }}>
          <strong>Shop error:</strong> {error}
        </div>
      )}

      {!loading && !unauth && !error && items && items.length === 0 && (
        <div className="card" style={{ padding: 12 }}>
          <strong>No items in the shop yet.</strong>
          <div style={{ marginTop: 8 }}>
            If you haven’t seeded the catalog, run:
            <pre style={{ marginTop: 8 }}>
{`npm i -D tsx
# in package.json add:
# "prisma": { "seed": "tsx prisma/seed.ts" }
npx prisma db seed`}
            </pre>
            Make sure <code>ShopItem.name</code> is <code>@unique</code> and your migration ran.
          </div>
        </div>
      )}

      {!loading && !unauth && !error && items && items.length > 0 && (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <div>
              <strong>Coins:</strong> {coins}
            </div>
            {msg && <div className="success">{msg}</div>}
          </div>

          <ul className="list">
            {items.map((it) => (
              <li key={it.id} className="card" style={{ padding: 12, display: "grid", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <div>
                    <strong>{it.name}</strong>
                    <div style={{ opacity: 0.7, marginTop: 4 }}>
                      Cost: <img src="/ui/coin.png" alt="" width={14} height={14} style={{ verticalAlign: "text-bottom" }} />{" "}
                      {it.cost}
                    </div>
                    <div style={{ opacity: 0.7, marginTop: 4 }}>
                      Boosts: INT +{it.boosts.INT}, STR +{it.boosts.STR}, VIT +{it.boosts.VIT}, AES +{it.boosts.AES}, WLH +{it.boosts.WLH}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {it.owned ? (
                      <span className="kpill">Owned</span>
                    ) : it.locked ? (
                      <button className="disabled" disabled title={it.reasons.join(", ") || "Locked"}>
                        Locked
                      </button>
                    ) : (
                      <button onClick={() => buy(it.id)} disabled={coins < it.cost}>
                        Buy
                      </button>
                    )}
                  </div>
                </div>
                {it.locked && it.reasons.length > 0 ? (
                  <div style={{ fontSize: 12, opacity: 0.8 }}>Requires: {it.reasons.join(", ")}</div>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
