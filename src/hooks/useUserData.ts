import { useState, useEffect, useRef } from 'react';

interface UserData {
  coins: number;
  stats: {
    INT: number;
    STR: number;
    VIT: number;
    AES: number;
    WLH: number;
  };
  name?: string;
  avatarKey?: string;
  primaryStatus?: string;
  badges?: Array<{ key: string; label: string }>;
}

export function useUserData() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function fetchUserData() {
      try {
        setLoading(true);
        const response = await fetch('/api/me');
        
        if (!response.ok) {
          throw new Error('Failed to fetch user data');
        }
        
        const data = await response.json();
        setUserData(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        console.error('Error fetching user data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchUserData();

    // Listen for coin and stats refresh events with debouncing
    const handleDataRefresh = () => {
      console.log('Data refresh event received, scheduling user data refetch...');
      
      // Clear existing timeout
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      
      // Debounce the refresh to avoid multiple rapid calls
      refreshTimeoutRef.current = setTimeout(() => {
        console.log('Refetching user data...');
        fetchUserData();
      }, 100); // 100ms debounce
    };

    window.addEventListener('coins:refresh', handleDataRefresh);
    window.addEventListener('stats:refresh', handleDataRefresh);
    window.addEventListener('user:refresh', handleDataRefresh);

    // Cleanup listeners and timeout on unmount
    return () => {
      window.removeEventListener('coins:refresh', handleDataRefresh);
      window.removeEventListener('stats:refresh', handleDataRefresh);
      window.removeEventListener('user:refresh', handleDataRefresh);
      
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  const refetch = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/me');
      
      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }
      
      const data = await response.json();
      setUserData(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching user data:', err);
    } finally {
      setLoading(false);
    }
  };

  return { userData, loading, error, refetch };
}
