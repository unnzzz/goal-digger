"use client";

import { useState, useEffect } from "react";

interface AvatarChatboxProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
}

export default function AvatarChatbox({ message, isVisible, onClose }: AvatarChatboxProps) {
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShowMessage(true);
      // Auto-hide after 4 seconds
      const timer = setTimeout(() => {
        setShowMessage(false);
        setTimeout(onClose, 300); // Wait for fade out animation
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible && !showMessage) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: "20px",
        bottom: "200px", // Above the avatar
        zIndex: 60,
        maxWidth: "200px",
        opacity: showMessage ? 1 : 0,
        transform: showMessage ? "translateY(0)" : "translateY(10px)",
        transition: "all 0.3s ease",
        pointerEvents: "none"
      }}
    >
      <div
        style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
          padding: "12px 16px",
          borderRadius: "20px 20px 20px 4px",
          boxShadow: "0 8px 25px rgba(0,0,0,0.15)",
          fontSize: "14px",
          fontFamily: "'Baloo Bhai', sans-serif",
          fontWeight: "500",
          lineHeight: "1.4",
          position: "relative",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255,255,255,0.2)"
        }}
      >
        {/* Speech bubble tail */}
        <div
          style={{
            position: "absolute",
            bottom: "-8px",
            left: "20px",
            width: "0",
            height: "0",
            borderLeft: "8px solid transparent",
            borderRight: "8px solid transparent",
            borderTop: "8px solid #667eea"
          }}
        />
        {message}
      </div>
    </div>
  );
}

