"use client";

import Image from "next/image";
import Link from "next/link";
import { useUserData } from "@/hooks/useUserData";

interface MobileNavigationProps {
  activePage?: string;
}

export default function MobileNavigation({ activePage = "" }: MobileNavigationProps) {
  const { userData } = useUserData();
  return (
    <div className="mobile-nav">
      <Link href="/" className={`mobile-nav-item ${activePage === 'generator' ? 'active' : ''}`}>
        <Image src="/icons/rocket.png" alt="RoadMap Generator" width={24} height={24} />
        <span>Generator</span>
      </Link>
      <Link href="/dashboard" className={`mobile-nav-item ${activePage === 'dashboard' ? 'active' : ''}`}>
        <Image src="/icons/dashboard.png" alt="Dashboard" width={24} height={24} />
        <span>Dashboard</span>
      </Link>
      <Link href="/diary" className={`mobile-nav-item ${activePage === 'diary' ? 'active' : ''}`}>
        <Image src="/icons/diary.png" alt="Diary" width={24} height={24} />
        <span>Diary</span>
      </Link>
      <Link href="/room" className={`mobile-nav-item ${activePage === 'room' ? 'active' : ''}`}>
        <Image src="/icons/room.png" alt="Room" width={24} height={24} />
        <span>Room</span>
      </Link>
      <Link href="/shop" className={`mobile-nav-item ${activePage === 'shop' ? 'active' : ''}`}>
        <Image src="/icons/shop.png" alt="Shop" width={24} height={24} />
        <span>Shop</span>
      </Link>
      <Link href="/account" className={`mobile-nav-item ${activePage === 'account' ? 'active' : ''}`}>
        {userData?.avatarKey ? (
          <Image 
            src={`/avatars/${userData.avatarKey}.png`} 
            alt="Account" 
            width={24} 
            height={24}
            style={{ borderRadius: "50%" }}
          />
        ) : (
          <Image src="/icons/profile.png" alt="Account" width={24} height={24} />
        )}
        <span>Account</span>
      </Link>
    </div>
  );
}
