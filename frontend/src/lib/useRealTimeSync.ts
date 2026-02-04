import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * ================================================================
 * REAL-TIME SYNC HOOK
 * ================================================================
 * 
 * Hook untuk monitoring status koneksi dan sinkronisasi real-time
 * dengan Supabase.
 */

interface RealTimeSyncStatus {
  isConnected: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  error: Error | null;
}

export function useRealTimeSync() {
  const [status, setStatus] = useState<RealTimeSyncStatus>({
    isConnected: true,
    isSyncing: false,
    lastSyncTime: null,
    error: null,
  });

  useEffect(() => {
    // Monitor network status
    const handleOnline = () => {
      setStatus((prev) => ({ ...prev, isConnected: true, error: null }));
    };

    const handleOffline = () => {
      setStatus((prev) => ({
        ...prev,
        isConnected: false,
        error: new Error('Network offline'),
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set initial connection status
    setStatus((prev) => ({ ...prev, isConnected: navigator.onLine }));

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Function to manually trigger sync
  const sync = async () => {
    setStatus((prev) => ({ ...prev, isSyncing: true, error: null }));

    try {
      // Simulate sync operation
      // In real app, this would check connection to Supabase
      const { error } = await supabase.from('products').select('id').limit(1);

      if (error) throw error;

      setStatus((prev) => ({
        ...prev,
        isSyncing: false,
        lastSyncTime: new Date(),
        error: null,
      }));
    } catch (error) {
      setStatus((prev) => ({
        ...prev,
        isSyncing: false,
        error: error as Error,
      }));
    }
  };

  return {
    ...status,
    sync,
  };
}

/**
 * Hook for monitoring specific table changes
 */
export function useTableSync(
  table: string,
  callback?: (payload: any) => void
) {
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    const channel = supabase
      .channel(`${table}-changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
        },
        (payload) => {
          setLastUpdate(new Date());
          callback?.(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // ✅ FIXED: Remove callback from deps to prevent infinite loop
    // Callback is captured in closure and remains stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table]); // ✅ ONLY depend on table name

  return { lastUpdate };
}