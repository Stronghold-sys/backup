import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { syncAdminData } from './syncManager';
import { useAuthStore } from './store';

/**
 * 🔄 Real-time Admin Data Sync Hook
 * Automatically syncs all admin data (products, orders, users) periodically
 * Only runs when user is admin
 */
export function useAdminSync(intervalMs: number = 60000) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  useEffect(() => {
    // Only run for admin users
    if (user?.role !== 'admin') {
      console.info('[useAdminSync] User is not admin, skipping auto-sync');
      return;
    }

    console.info('[useAdminSync] Starting admin data auto-sync...');

    // Cleanup function
    const cleanup = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        console.info('[useAdminSync] Stopped admin data auto-sync');
      }
    };

    // Initial sync
    const performInitialSync = async () => {
      if (!isInitializedRef.current) {
        console.info('[useAdminSync] Performing initial sync...');
        setIsLoading(true);
        
        try {
          await syncAdminData();
          setLastSyncTime(new Date());
          isInitializedRef.current = true;
          console.info('[useAdminSync] Initial sync completed');
        } catch (error) {
          console.error('[useAdminSync] Initial sync failed:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    performInitialSync();

    // Start periodic sync
    intervalRef.current = setInterval(async () => {
      if (!isInitializedRef.current) return;

      try {
        console.info('[useAdminSync] Syncing admin data...');
        setIsLoading(true);
        await syncAdminData();
        setLastSyncTime(new Date());
        console.info('[useAdminSync] Admin data synced successfully');
      } catch (error) {
        console.warn('[useAdminSync] Sync failed:', error);
        // Silent failure - don't show toast to avoid annoying users
      } finally {
        setIsLoading(false);
      }
    }, intervalMs);

    return cleanup;
  }, [user?.role, intervalMs]);

  return {
    isLoading,
    lastSyncTime,
  };
}
