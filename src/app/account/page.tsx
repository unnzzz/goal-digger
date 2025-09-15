"use client";
import { useEffect, useState } from "react";
import { tierLabel, primaryStatus, unlockedStatuses } from "@/lib/status";
import AppLayout from "@/components/AppLayout";
import Image from "next/image";

type Me = {
  name:string|null; email:string; coins:number; avatarKey?:string|null;
  stats:{INT:number;STR:number;VIT:number;AES:number;WLH:number};
  primaryStatus?:string|null; badges?:{key:string,label:string}[];
};

export default function AccountPage(){
  const [me,setMe]=useState<Me|null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  useEffect(()=>{ (async()=>{ const r=await fetch("/api/me",{cache:"no-store"}); if(r.ok){ setMe(await r.json()); } })(); },[]);
  
  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch("/api/account/delete", {
        method: "DELETE",
      });
      
      if (response.ok) {
        // Redirect to home page after successful deletion
        window.location.href = "/";
      } else {
        alert("Failed to delete account. Please try again.");
      }
    } catch (error) {
      console.error("Error deleting account:", error);
      alert("An error occurred while deleting your account.");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };
  
  if(!me) return <AppLayout activePage="account"><main className="container"><h1>Account</h1><div>Loading…</div></main></AppLayout>;

  const avatarSrc = me.avatarKey ? `/avatars/${me.avatarKey}.png` : `/avatars/monkey.png`;
  const currentPrimaryStatus = primaryStatus(me.stats);
  const unlockedStatusesList = unlockedStatuses(me.stats);

  return (
    <AppLayout activePage="account">
    <main className="container" style={{marginTop:16}}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: '700',
          color: 'white',
          textAlign: 'center',
          marginBottom: '32px',
          fontFamily: "'Baloo Bhai', sans-serif"
        }}>Account</h1>
        
        {/* Account Card */}
        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '32px',
          marginBottom: '32px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '24px'
        }}>
          <div style={{
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#F8F9FA',
            border: '4px solid #E5E7EB'
          }}>
            <Image 
              src={avatarSrc} 
              alt="avatar" 
              width={80} 
              height={80} 
              style={{ borderRadius: '50%', objectFit: 'contain' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{
              fontSize: '28px',
              fontWeight: '700',
              color: '#1F2937',
              marginBottom: '8px',
              fontFamily: "'Baloo Bhai', sans-serif"
            }}>{me.name ?? "You"}</h2>
            <div style={{
              fontSize: '16px',
              color: '#6B7280',
              marginBottom: '8px',
              fontFamily: "'Baloo Bhai', sans-serif"
            }}>
              📧 {me.email}
            </div>
            <div style={{
              fontSize: '14px',
              color: '#856404',
              marginBottom: '16px',
              padding: '8px 12px',
              background: '#FFF3CD',
              border: '1px solid #FFEAA7',
              borderRadius: '6px',
              fontFamily: "'Baloo Bhai', sans-serif"
            }}>
              📧 <strong>Email Notifications:</strong> Reminder and goal emails from Goal Digger might end up in your spam folder. Please check your spam folder too!
            </div>
            <div style={{
              fontSize: '18px',
              color: '#6B7280',
              marginBottom: '16px',
              fontFamily: "'Baloo Bhai', sans-serif"
            }}>
              Primary Status: <strong style={{ color: '#8B5CF6' }}>{currentPrimaryStatus?.label ?? "Newcomer"}</strong>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {unlockedStatusesList.slice(0, 3).map(badge => (
                <span key={badge.key} style={{
                  background: 'linear-gradient(45deg, #8B5CF6, #A78BFA)',
                  color: 'white',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '14px',
                  fontWeight: '600',
                  fontFamily: "'Baloo Bhai', sans-serif"
                }}>
                  {badge.label}
                </span>
              ))}
              {unlockedStatusesList.length > 3 && (
                <span style={{
                  background: '#E5E7EB',
                  color: '#6B7280',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '14px',
                  fontWeight: '600',
                  fontFamily: "'Baloo Bhai', sans-serif"
                }}>
                  +{unlockedStatusesList.length - 3} more
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <section>
          <h2 style={{
            fontSize: '28px',
            fontWeight: '700',
            color: 'white',
            textAlign: 'center',
            marginBottom: '24px',
            fontFamily: "'Baloo Bhai', sans-serif"
          }}>Stats</h2>
          
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '32px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            flexDirection: 'row',
            gap: '12px',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <StatCard 
              label="Intelligence" 
              value={me.stats.INT} 
              icon="/icons/lightning.png"
              color="#3B82F6"
            />
            <StatCard 
              label="Strength" 
              value={me.stats.STR} 
              icon="/icons/muscle.png"
              color="#EF4444"
            />
            <StatCard 
              label="Vitality" 
              value={me.stats.VIT} 
              icon="/icons/heart.png"
              color="#10B981"
            />
            <StatCard 
              label="Aesthetic" 
              value={me.stats.AES} 
              icon="/icons/sparkle.png"
              color="#8B5CF6"
            />
            <StatCard 
              label="Wealth" 
              value={me.stats.WLH} 
              icon="/icons/diamond.png"
              color="#F59E0B"
            />
      </div>
        </section>

        {/* Delete Account Section */}
        <section style={{ marginTop: '32px' }}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '32px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            border: '2px solid #FEE2E2'
          }}>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '700',
              color: '#DC2626',
              marginBottom: '16px',
              fontFamily: "'Baloo Bhai', sans-serif"
            }}>
              ⚠️ Danger Zone
            </h2>
            <p style={{
              fontSize: '16px',
              color: '#6B7280',
              marginBottom: '24px',
              fontFamily: "'Baloo Bhai', sans-serif"
            }}>
              Once you delete your account, there is no going back. This will permanently delete all your data including goals, progress, furniture, and stats.
            </p>
            
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                style={{
                  background: 'linear-gradient(45deg, #DC2626, #EF4444)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontFamily: "'Baloo Bhai', sans-serif",
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(220, 38, 38, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                Delete My Account
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  style={{
                    background: isDeleting ? '#9CA3AF' : 'linear-gradient(45deg, #DC2626, #EF4444)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px 24px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: isDeleting ? 'not-allowed' : 'pointer',
                    fontFamily: "'Baloo Bhai', sans-serif",
                    transition: 'all 0.3s ease'
                  }}
                >
                  {isDeleting ? 'Deleting...' : 'Yes, Delete My Account'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  style={{
                    background: '#6B7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px 24px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: isDeleting ? 'not-allowed' : 'pointer',
                    fontFamily: "'Baloo Bhai', sans-serif",
                    transition: 'all 0.3s ease'
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
      </section>
    </main>
    </AppLayout>
  );
}

function StatCard({label, value, icon, color}:{label:string; value:number; icon:string; color:string}){
  const percentage = Math.min(100, value);
  
  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      padding: '16px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      transition: 'all 0.3s ease',
      border: '2px solid transparent',
      width: '140px',
      textAlign: 'center'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.15)';
      e.currentTarget.style.borderColor = color;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
      e.currentTarget.style.borderColor = 'transparent';
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        background: `${color}20`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 12px auto'
      }}>
        <Image 
          src={icon} 
          alt={label} 
          width={20} 
          height={20}
        />
      </div>
      
      <h3 style={{
        fontSize: '14px',
        fontWeight: '700',
        color: '#1F2937',
        margin: '0 0 4px 0',
        fontFamily: "'Baloo Bhai', sans-serif"
      }}>{label}</h3>
      
      <p style={{
        fontSize: '12px',
        color: '#6B7280',
        margin: '0 0 12px 0',
        fontFamily: "'Baloo Bhai', sans-serif"
      }}>{value} — {tierLabel(value)}</p>
      
      <div style={{
        height: '6px',
        background: '#E5E7EB',
        borderRadius: '3px',
        overflow: 'hidden',
        marginBottom: '8px'
      }}>
        <div style={{
          width: `${percentage}%`,
          height: '100%',
          background: color,
          borderRadius: '3px',
          transition: 'width 0.3s ease'
        }} />
      </div>
      
      <span style={{
        fontSize: '11px',
        fontWeight: '600',
        color: color,
        fontFamily: "'Baloo Bhai', sans-serif"
      }}>{percentage}%</span>
    </div>
  );
}
