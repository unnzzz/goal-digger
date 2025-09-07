import { useState, useEffect } from 'react';

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
