"use client";

import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useUserData } from "../hooks/useUserData";
import { useAvatar } from "../contexts/AvatarContext";
import AvatarChatbox from "./AvatarChatbox";
import MobileNavigation from "./MobileNavigation";
import MobileTopBar from "./MobileTopBar";
import GlobalGenerationStatus from "./GlobalGenerationStatus";

interface AppLayoutProps {
  children: React.ReactNode;
  activePage?: string;
}

export default function AppLayout({ children, activePage = "" }: AppLayoutProps) {
  const { data: session, status } = useSession();
  const { userData, loading: userLoading } = useUserData();
  const { currentMessage, isVisible, hideMessage } = useAvatar();

  if (status === "loading") {
    return (
      <div className="app-layout">
        <aside className="sidebar">
          <div className="sidebar-header">
            <Link href="/" className="sidebar-logo">
              Goal-Digger
            </Link>
          </div>
        </aside>
        <main className="main-content">
          <div className="content-main" style={{ padding: "32px" }}>
            <div className="card">Loading...</div>
          </div>
        </main>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="app-layout">
        <aside className="sidebar">
          <div className="sidebar-header">
            <Link href="/" className="sidebar-logo">
              Goal-Digger
            </Link>
          </div>
        </aside>
        <main className="main-content">
          <div className="content-main" style={{ padding: "32px" }}>
            <div className="card">Please sign in to continue.</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={`app-layout ${activePage === 'room' ? 'room-page' : ''}`}>
      {/* Mobile Top Bar */}
      <MobileTopBar />
      
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <a href="/" className="sidebar-logo">
            Goal-Digger
          </a>
        </div>
        <nav className="sidebar-nav">
          <Link href="/" className={`nav-item ${activePage === 'generator' ? 'active' : ''}`}>
            <Image src="/icons/rocket.png" alt="RoadMap Generator" width={41} height={41} className="nav-icon" />
            <div>
              <div className="nav-text">RoadMap Generator</div>
            </div>
          </Link>
          <Link href="/dashboard" className={`nav-item ${activePage === 'dashboard' ? 'active' : ''}`}>
            <Image src="/icons/dashboard.png" alt="Dashboard" width={41} height={41} className="nav-icon" />
            <div>
              <div className="nav-text">Dashboard</div>
            </div>
          </Link>
          <Link href="/diary" className={`nav-item ${activePage === 'diary' ? 'active' : ''}`}>
            <Image src="/icons/diary.png" alt="Diary" width={41} height={41} className="nav-icon" />
            <div>
              <div className="nav-text">Diary</div>
            </div>
          </Link>
          <Link href="/room" className={`nav-item ${activePage === 'room' ? 'active' : ''}`}>
            <Image src="/icons/room.png" alt="Room" width={41} height={41} className="nav-icon" />
            <div>
              <div className="nav-text">Room</div>
            </div>
          </Link>
          <Link href="/shop" className={`nav-item ${activePage === 'shop' ? 'active' : ''}`}>
            <Image src="/icons/shop.png" alt="Shop" width={41} height={41} className="nav-icon" />
            <div>
              <div className="nav-text">Shop</div>
            </div>
          </Link>
          <Link href="/account" className={`nav-item ${activePage === 'account' ? 'active' : ''}`}>
            <div style={{
              width: 41,
              height: 41,
              borderRadius: '50%',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'transparent',
              border: '2px solid rgba(255, 255, 255, 0.2)'
            }}>
              <Image 
                src={userData?.avatarKey ? `/avatars/${userData.avatarKey}.png` : '/avatars/monkey.png'} 
                alt="Profile" 
                width={35} 
                height={35} 
                style={{ borderRadius: '50%', objectFit: 'contain' }}
              />
            </div>
            <div>
              <div className="nav-text">Profile</div>
              <div className="nav-status">Status: {userLoading ? '...' : userData?.primaryStatus || 'Newcomer'}</div>
            </div>
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="nav-item sign-out-btn"
            style={{
              background: 'linear-gradient(45deg, #5B21B6, #7C3AED)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 16px',
              margin: '8px',
              cursor: 'pointer',
              fontFamily: "'Baloo Bhai', sans-serif",
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              boxShadow: '0 4px 12px rgba(91, 33, 182, 0.3)',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              width: 'calc(100% - 16px)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(45deg, #4C1D95, #6D28D9)';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 20px rgba(91, 33, 182, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(45deg, #5B21B6, #7C3AED)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(91, 33, 182, 0.3)';
            }}
          >
            <div>
              <div className="nav-text">Sign Out</div>
            </div>
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Top Bar */}
        <div className="topbar">
          <div className="topbar-left">
            <div className="coin-display">
              <Image src="/icons/coin.png" alt="Coins" width={34} height={34} className="coin-icon" />
              <span className="coin-amount">{userLoading ? '...' : userData?.coins || 0}</span>
            </div>
          </div>
          <div className="topbar-right">
            <div className="stats-bar">
              <div className="stat-item">
                <Image src="/icons/lightning.png" alt="Intelligence" width={27} height={27} className="stat-icon" />
                <span>INT {userLoading ? '...' : userData?.stats?.INT || 0}</span>
              </div>
              <div className="stat-item">
                <Image src="/icons/muscle.png" alt="Strength" width={27} height={27} className="stat-icon" />
                <span>STR {userLoading ? '...' : userData?.stats?.STR || 0}</span>
              </div>
              <div className="stat-item">
                <Image src="/icons/heart.png" alt="Vitality" width={27} height={27} className="stat-icon" />
                <span>VIT {userLoading ? '...' : userData?.stats?.VIT || 0}</span>
              </div>
              <div className="stat-item">
                <Image src="/icons/sparkle.png" alt="Aesthetics" width={27} height={27} className="stat-icon" />
                <span>AES {userLoading ? '...' : userData?.stats?.AES || 0}</span>
              </div>
              <div className="stat-item">
                <Image src="/icons/diamond.png" alt="Willpower" width={27} height={27} className="stat-icon" />
                <span>WLH {userLoading ? '...' : userData?.stats?.WLH || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Wrapper */}
        <div className="content-wrapper">
          {children}
        </div>
      </main>

      {/* Avatar Chatbox - Only show on room page */}
      {activePage === 'room' && (
        <AvatarChatbox
          message={currentMessage}
          isVisible={isVisible}
          onClose={hideMessage}
        />
      )}

      {/* Static Avatar - Only show on room page */}
      {activePage === 'room' && userData?.avatarKey && (
        <div className="avatar-container">
          <Image
            src={`/avatars/full-body/${userData.avatarKey}.png`}
            alt="Avatar"
            width={120}
            height={180}
            className="avatar-image"
            onError={(e) => {
              // Fallback to regular avatar if full-body doesn't exist
              const target = e.target as HTMLImageElement;
              target.src = `/avatars/${userData.avatarKey}.png`;
            }}
          />
        </div>
      )}
      
      {/* Mobile Navigation */}
      <MobileNavigation activePage={activePage} />
      
      {/* Global Generation Status */}
      <GlobalGenerationStatus />
    </div>
  );
}
