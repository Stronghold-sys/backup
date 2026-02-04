/**
 * ✅ MAINTENANCE MODE REAL-TIME SYNC HOOK
 * Auto-syncs maintenance status across all users using Supabase Realtime
 */

import { useEffect } from 'react';
import { useMaintenanceStore } from './maintenanceStore';
import { supabase } from './supabase';
import logger from './logger';

export function useMaintenanceSync() {
  const { fetchMaintenanceStatus } = useMaintenanceStore();

  useEffect(() => {
    logger.debug('[MaintenanceSync] Initializing real-time sync...');
    
    // Fetch initial status
    fetchMaintenanceStatus();

    // Subscribe to realtime changes via KV store updates
    const channel = supabase.channel('maintenance-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kv_store_adb995ba',
          filter: `key=eq.system:maintenance`,
        },
        (payload) => {
          logger.debug('[MaintenanceSync] Realtime update received:', payload);
          
          // Refetch maintenance status when KV store changes
          fetchMaintenanceStatus();
        }
      )
      .subscribe((status) => {
        logger.debug('[MaintenanceSync] Subscription status:', status);
      });

    return () => {
      logger.debug('[MaintenanceSync] Cleaning up subscription...');
      supabase.removeChannel(channel);
    };
  }, [fetchMaintenanceStatus]);
}