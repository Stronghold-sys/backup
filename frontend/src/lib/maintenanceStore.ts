/**
 * ✅ MAINTENANCE MODE STORE
 * Real-time synchronized maintenance mode status
 * Uses Supabase KV + Realtime for instant sync across all users
 */

import { create } from 'zustand';
import { api, supabase } from './supabase';
import { authStoreInstance } from './storeV2'; // ✅ Import auth store to get token

export interface MaintenanceMode {
  enabled: boolean;
  message: string;
  startTime: string | null;
  endTime: string | null;
  duration: number;
}

interface MaintenanceStore {
  maintenance: MaintenanceMode;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchMaintenanceStatus: () => Promise<void>;
  setMaintenanceMode: (enabled: boolean, message?: string, duration?: number, scheduledDate?: string, scheduledTime?: string) => Promise<void>;
  isUnderMaintenance: () => boolean;
}

export const useMaintenanceStore = create<MaintenanceStore>((set, get) => ({
  maintenance: {
    enabled: false,
    message: '',
    startTime: null,
    endTime: null,
    duration: 0,
  },
  isLoading: false,
  error: null,

  fetchMaintenanceStatus: async () => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await api.get('/maintenance');
      
      if (response.success && response.maintenance) {
        console.info('🔧 [MaintenanceStore] Status fetched:', response.maintenance);
        set({ 
          maintenance: response.maintenance,
          isLoading: false 
        });
      }
    } catch (error: any) {
      console.error('❌ [MaintenanceStore] Fetch error:', error);
      set({ 
        error: error.message || 'Gagal mengambil status maintenance',
        isLoading: false 
      });
    }
  },

  setMaintenanceMode: async (enabled: boolean, message?: string, duration?: number, scheduledDate?: string, scheduledTime?: string) => {
    try {
      set({ isLoading: true, error: null });
      
      console.info('🔧 [MaintenanceStore] Setting maintenance:', { enabled, message, duration, scheduledDate, scheduledTime });
      
      // ✅ FIX v16.5: Get access token from auth store
      const { accessToken } = authStoreInstance.getState();
      
      if (!accessToken) {
        console.error('❌ [MaintenanceStore] No access token found - user not authenticated');
        throw new Error('Unauthorized: Please login as admin');
      }
      
      console.info('🔑 [MaintenanceStore] Sending request with access token');
      
      // ✅ Pass accessToken as third parameter
      const response = await api.post('/maintenance', {
        enabled,
        message: message || 'Sistem sedang dalam pemeliharaan. Mohon maaf atas ketidaknyamanannya.',
        duration: duration || 2,
        scheduledDate,
        scheduledTime,
      }, accessToken);
      
      if (response.success && response.maintenance) {
        console.info('✅ [MaintenanceStore] Maintenance mode updated:', response.maintenance);
        set({ 
          maintenance: response.maintenance,
          isLoading: false 
        });
      }
    } catch (error: any) {
      console.error('❌ [MaintenanceStore] Update error:', error);
      set({ 
        error: error.message || 'Gagal mengatur maintenance mode',
        isLoading: false 
      });
      throw error;
    }
  },

  isUnderMaintenance: () => {
    const { maintenance } = get();
    
    if (!maintenance.enabled) return false;
    
    // Check if scheduled maintenance is active
    if (maintenance.startTime && maintenance.endTime) {
      const now = new Date();
      const start = new Date(maintenance.startTime);
      const end = new Date(maintenance.endTime);
      
      return now >= start && now <= end;
    }
    
    // Immediate maintenance
    return maintenance.enabled;
  },
}));

/**
 * ✅ REAL-TIME MAINTENANCE SYNC HOOK
 * Subscribes to maintenance mode changes via Supabase Realtime
 */
export function useMaintenanceSync() {
  const { fetchMaintenanceStatus } = useMaintenanceStore();

  // Fetch initial status
  React.useEffect(() => {
    console.info('🔧 [MaintenanceSync] Initializing...');
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
          console.info('🔄 [MaintenanceSync] Realtime update received:', payload);
          
          // Refetch maintenance status when KV store changes
          fetchMaintenanceStatus();
        }
      )
      .subscribe((status) => {
        console.info('🔧 [MaintenanceSync] Subscription status:', status);
      });

    return () => {
      console.info('🔧 [MaintenanceSync] Cleaning up subscription...');
      supabase.removeChannel(channel);
    };
  }, []);
}

// React import
import React from 'react';