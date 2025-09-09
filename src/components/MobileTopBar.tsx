"use client";

import { useUserData } from "@/hooks/useUserData";
import Image from "next/image";

export default function MobileTopBar() {
  const { userData, loading } = useUserData();

  return (
    <div className="mobile-top-bar">
      <div className="mobile-top-bar-content">
        <div className="mobile-logo">
          <Image src="/logo.png" alt="Goal-Digger" width={32} height={32} />
          <span>Goal-Digger</span>
        </div>
        
        <div className="mobile-stats">
          <div className="stat-item coins">
            <Image src="/icons/coin.png" alt="Coins" width={20} height={20} />
            <span>{userData?.coins || 0}</span>
          </div>
          <div className="stat-item">
            <div className="stat-label">INT</div>
            <Image src="/icons/lightning.png" alt="INT" width={20} height={20} />
            <span>{userData?.stats?.INT || 0}</span>
          </div>
          <div className="stat-item">
            <div className="stat-label">STR</div>
            <Image src="/icons/muscle.png" alt="STR" width={20} height={20} />
            <span>{userData?.stats?.STR || 0}</span>
          </div>
          <div className="stat-item">
            <div className="stat-label">VIT</div>
            <Image src="/icons/heart.png" alt="VIT" width={20} height={20} />
            <span>{userData?.stats?.VIT || 0}</span>
          </div>
          <div className="stat-item">
            <div className="stat-label">AES</div>
            <Image src="/icons/sparkle.png" alt="AES" width={20} height={20} />
            <span>{userData?.stats?.AES || 0}</span>
          </div>
          <div className="stat-item">
            <div className="stat-label">WLH</div>
            <Image src="/icons/diamond.png" alt="WLH" width={20} height={20} />
            <span>{userData?.stats?.WLH || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
