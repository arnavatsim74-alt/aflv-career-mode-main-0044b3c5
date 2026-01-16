import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface IFUserStats {
  onlineFlights: number;
  violations: number;
  xp: number;
  landingCount: number;
  flightTime: number; // in seconds
  atcOperations: number;
  atcRank: number | null;
  grade: number;
  hash: string;
  violationCountByLevel: {
    level1: number;
    level2: number;
    level3: number;
  };
  roles: number[];
  userId: string;
  virtualOrganization: string | null;
  discordId: string | null;
  errorCode: number;
  username?: string;
}

export function useInfiniteFlightUserStats() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userStats, setUserStats] = useState<IFUserStats | null>(null);

  const fetchByUserId = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('infinite-flight-user-stats', {
        body: { userIds: [userId] },
      });

      if (fnError) throw fnError;
      
      if (data.success && data.users && data.users.length > 0) {
        setUserStats(data.users[0]);
        return data.users[0];
      } else {
        setError('User not found');
        return null;
      }
    } catch (err: any) {
      console.error('Error fetching IF user stats:', err);
      setError(err.message || 'Failed to fetch user stats');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchByUserHash = useCallback(async (userHash: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('infinite-flight-user-stats', {
        body: { userHashes: [userHash] },
      });

      if (fnError) throw fnError;
      
      if (data.success && data.users && data.users.length > 0) {
        setUserStats(data.users[0]);
        return data.users[0];
      } else {
        setError('User not found');
        return null;
      }
    } catch (err: any) {
      console.error('Error fetching IF user stats:', err);
      setError(err.message || 'Failed to fetch user stats');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchByDiscordId = useCallback(async (discordId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('infinite-flight-user-stats', {
        body: { discordId },
      });

      if (fnError) throw fnError;
      
      if (data.success && data.users && data.users.length > 0) {
        setUserStats(data.users[0]);
        return data.users[0];
      } else {
        setError('User not found');
        return null;
      }
    } catch (err: any) {
      console.error('Error fetching IF user stats:', err);
      setError(err.message || 'Failed to fetch user stats');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearStats = useCallback(() => {
    setUserStats(null);
    setError(null);
  }, []);

  return {
    loading,
    error,
    userStats,
    fetchByUserId,
    fetchByUserHash,
    fetchByDiscordId,
    clearStats,
  };
}
