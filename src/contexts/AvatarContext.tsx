"use client";

import { createContext, useContext, useState, useRef, ReactNode } from "react";

interface AvatarContextType {
  showMessage: (message: string, instant?: boolean) => void;
  currentMessage: string;
  isVisible: boolean;
  hideMessage: () => void;
}

const AvatarContext = createContext<AvatarContextType | undefined>(undefined);

export function AvatarProvider({ children }: { children: ReactNode }) {
  const [currentMessage, setCurrentMessage] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const messageQueue = useRef<string[]>([]);
  const isProcessing = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageTime = useRef(0);
  const COOLDOWN_MS = 4000; // 4 seconds between messages

  const processQueue = () => {
    if (isProcessing.current || messageQueue.current.length === 0) return;
    
    isProcessing.current = true;
    const message = messageQueue.current.shift()!;
    
    setCurrentMessage(message);
    setIsVisible(true);
    
    // Auto-hide after 4 seconds
    timeoutRef.current = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        isProcessing.current = false;
        processQueue(); // Process next message
      }, 300); // Wait for fade out animation
    }, 4000);
  };

  const showMessage = (message: string, instant: boolean = false) => {
    const now = Date.now();
    
    // For instant messages (user actions), bypass cooldown
    if (instant) {
      // Clear any existing timeout and show immediately
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setCurrentMessage(message);
      setIsVisible(true);
      lastMessageTime.current = now;
      
      // Auto-hide after 4 seconds
      timeoutRef.current = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => {
          isProcessing.current = false;
          processQueue(); // Process any queued messages
        }, 300);
      }, 4000);
      return;
    }
    
    // For non-instant messages (page navigation), check cooldown
    if (now - lastMessageTime.current < COOLDOWN_MS) {
      // Add to queue if not already there and not too recent
      if (!messageQueue.current.includes(message)) {
        messageQueue.current.push(message);
      }
      return;
    }
    
    // Add to queue if not already there
    if (!messageQueue.current.includes(message)) {
      messageQueue.current.push(message);
    }
    
    lastMessageTime.current = now;
    processQueue();
  };

  const hideMessage = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
    isProcessing.current = false;
    processQueue(); // Process next message
  };

  return (
    <AvatarContext.Provider value={{ showMessage, currentMessage, isVisible, hideMessage }}>
      {children}
    </AvatarContext.Provider>
  );
}

export function useAvatar() {
  const context = useContext(AvatarContext);
  if (context === undefined) {
    throw new Error("useAvatar must be used within an AvatarProvider");
  }
  return context;
}
