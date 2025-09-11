"use client";
import { useEffect, useState } from "react";
import Image from 'next/image';
import { useUserData } from '@/hooks/useUserData';
import AppLayout from '../../components/AppLayout';
import { useAvatar } from '@/contexts/AvatarContext';
import { getMessageForAction } from '@/lib/avatarMessages';

type ShopItem = {
  id: string;
  name: string;
  cost: number;
  category: string;
  boosts: { INT: number; STR: number; VIT: number; AES: number; WLH: number };
  locked: boolean;
  reasons: string[];
  owned: boolean;
};

type ShopListResponse =
  | { coins: number; items: ShopItem[] }
  | { error: string };

// Helper function to group items by category
function groupItemsByCategory(items: ShopItem[]) {
  return items.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, ShopItem[]>);
}

// Helper function to get furniture image path
function getFurnitureImagePath(itemName: string): string {
  const filename = itemName.toLowerCase().replace(/[^a-z0-9]/g, '_') + '.png';
  return `/furniture/${filename}`;
}

export default function ShopPage() {
  const [coins, setCoins] = useState<number>(0);
  const { userData, loading: userLoading } = useUserData();
  const [items, setItems] = useState<ShopItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unauth, setUnauth] = useState(false);
  const { showMessage } = useAvatar();

  // Avatar messages removed - only show in room tab

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
      // Let the navbar refresh coins and stats
      window.dispatchEvent(new Event("coins:refresh"));
      window.dispatchEvent(new Event("stats:refresh"));
      
      // Avatar messages removed - only show in room tab
    } catch (e: any) {
      setError(e?.message || "Network error");
    }
  };

  return (
    <AppLayout activePage="shop">
      <div className="content-main" style={{ padding: "32px 48px", width: "100%", maxWidth: "none" }}>

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
              marginBottom: 24,
            }}
          >
            <h1 style={{ 
              fontSize: '32px', 
              fontWeight: '700', 
              color: 'white', 
              margin: 0,
              fontFamily: "'Baloo Bhai', sans-serif"
            }}>
              Shop
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ 
                fontSize: '18px', 
                fontWeight: '600', 
                color: 'white',
                fontFamily: "'Baloo Bhai', sans-serif"
              }}>
                Coins: {coins}
              </span>
              <img src="/icons/coin.png" alt="coins" width={24} height={24} />
            </div>
          </div>
          {msg && <div className="success" style={{ marginBottom: 20 }}>{msg}</div>}

          {Object.entries(groupItemsByCategory(items)).map(([category, categoryItems]) => (
            <div key={category} style={{ marginBottom: '48px' }}>
              <h2 style={{
                fontSize: '24px',
                fontWeight: '700',
                color: 'white',
                marginBottom: '16px',
                fontFamily: "'Baloo Bhai', sans-serif",
                textTransform: 'capitalize'
              }}>
                {category.replace(/([A-Z])/g, ' $1').trim()}
              </h2>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '30px',
                width: '100%'
              }}>
                {categoryItems.map((it) => (
                  <div key={it.id} style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '20px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                    border: it.owned ? '2px solid #10B981' : '2px solid transparent',
                    transition: 'all 0.3s ease'
                  }}>
                    {/* Furniture Image */}
                    <div style={{
                      width: '100%',
                      height: '120px',
                      marginBottom: '12px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'linear-gradient(135deg, #f3f4f6, #e5e7eb)'
                    }}>
                      <Image
                        src={getFurnitureImagePath(it.name)}
                        alt={it.name}
                        width={200}
                        height={120}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          borderRadius: '4px'
                        }}
                        onError={(e) => {
                          // Fallback to a colored rectangle if image fails to load
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = `<div style="
                              width: 100%; 
                              height: 100%; 
                              background: linear-gradient(45deg, #8B5CF6, #A78BFA); 
                              border-radius: 8px; 
                              display: flex; 
                              align-items: center; 
                              justify-content: center; 
                              color: white; 
                              font-weight: bold; 
                              font-size: 12px; 
                              text-align: center;
                              font-family: 'Baloo Bhai', sans-serif;
                            ">${it.name}</div>`;
                          }
                        }}
                      />
                    </div>
                    
                    <div style={{ marginBottom: '12px' }}>
                      <h3 style={{
                        fontSize: '18px',
                        fontWeight: '700',
                        color: '#1F2937',
                        margin: '0 0 8px 0',
                        fontFamily: "'Baloo Bhai', sans-serif"
                      }}>
                        {it.name}
                      </h3>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginBottom: '8px'
                      }}>
                        <img src="/icons/coin.png" alt="coins" width={16} height={16} />
                        <span style={{ 
                          fontSize: '16px', 
                          fontWeight: '600', 
                          color: '#F59E0B',
                          fontFamily: "'Baloo Bhai', sans-serif"
                        }}>
                          {it.cost}
                        </span>
                      </div>
                      <div style={{ fontSize: '14px', color: '#6B7280', fontFamily: "'Baloo Bhai', sans-serif" }}>
                        Boosts: {Object.entries(it.boosts)
                          .filter(([_, value]) => value > 0)
                          .map(([stat, value]) => `${stat} +${value}`)
                          .join(', ') || 'None'}
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      {it.owned ? (
                        <span style={{
                          background: '#10B981',
                          color: 'white',
                          padding: '8px 16px',
                          borderRadius: '20px',
                          fontSize: '14px',
                          fontWeight: '600',
                          fontFamily: "'Baloo Bhai', sans-serif"
                        }}>
                          ✓ Owned
                        </span>
                      ) : it.locked ? (
                        <button 
                          style={{
                            background: '#6B7280',
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '20px',
                            fontSize: '14px',
                            fontWeight: '600',
                            fontFamily: "'Baloo Bhai', sans-serif",
                            cursor: 'not-allowed'
                          }}
                          disabled
                          title={it.reasons.join(", ") || "Locked"}
                        >
                          🔒 Locked
                        </button>
                      ) : (
                        <button 
                          onClick={() => buy(it.id)} 
                          disabled={coins < it.cost}
                          style={{
                            background: coins < it.cost ? '#D1D5DB' : 'linear-gradient(45deg, #8B5CF6, #A78BFA)',
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '20px',
                            fontSize: '14px',
                            fontWeight: '600',
                            fontFamily: "'Baloo Bhai', sans-serif",
                            cursor: coins < it.cost ? 'not-allowed' : 'pointer',
                            transition: 'all 0.3s ease'
                          }}
                        >
                          Buy
                        </button>
                      )}
                    </div>
                    
                    {it.locked && it.reasons.length > 0 && (
                      <div style={{ 
                        fontSize: '12px', 
                        color: '#EF4444', 
                        marginTop: '8px',
                        fontFamily: "'Baloo Bhai', sans-serif"
                      }}>
                        Requires: {it.reasons.join(", ")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
        </div>
    </AppLayout>
  );
}
