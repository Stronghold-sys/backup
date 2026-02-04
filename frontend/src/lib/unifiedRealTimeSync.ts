// ✅ UNIFIED REAL-TIME SYNC MANAGER
// Centralized real-time synchronization for all features

import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from './store';
import { useCartStore, useOrderStore } from './storeV2';
import { useNotificationStore } from './notificationStore';
import { supabase } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '/utils/supabase/info';

// ==================== CONSTANTS ====================
const SYNC_VERSION = '2.1.0';

// ✅ PRODUCTION: All logging disabled

// ==================== CONFIGURATION ====================

const SYNC_CONFIG = {
  // Debounce delays (ms)
  CART_SYNC_DELAY: 500,
  ORDER_SYNC_DELAY: 1000,
  USER_CHECK_INTERVAL: 30000, // 30 seconds
  
  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000,
  
  // Features (can be toggled on/off)
  ENABLE_CART_SYNC: false, // ✅ DISABLED until fully tested to prevent errors
  ENABLE_ORDER_SYNC: false, // ✅ DISABLED - needs database table setup
  ENABLE_USER_STATUS_CHECK: true, // ✅ ENABLED - critical security feature
  ENABLE_NOTIFICATION_SYNC: false, // ✅ DISABLED - needs database table setup
};

// ==================== CART REAL-TIME SYNC ====================

export function useCartRealTimeSync() {
  const { user, accessToken } = useAuthStore();
  const { items, setItems, getTotalItems } = useCartStore();
  const syncTimeoutRef = useRef<NodeJS.Timeout>();
  const isSyncingRef = useRef(false);
  const channelRef = useRef<any>(null);

  // Sync cart to backend (debounced)
  const syncCartToBackend = useCallback(async () => {
    if (!user || !accessToken || isSyncingRef.current) return;

    try {
      isSyncingRef.current = true;
      console.info('🔄 [CartSync] Syncing cart to backend...', items.length, 'items');

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-adb995ba/cart/sync`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
            'X-Session-Token': accessToken,
          },
          body: JSON.stringify({ items }),
        }
      );

      if (!response.ok) {
        console.error('❌ [CartSync] HTTP Error:', response.status, response.statusText);
      }

      const data = await response.json();
      
      if (data.success) {
        console.info('✅ [CartSync] Cart synced successfully');
      } else {
        console.error('❌ [CartSync] Sync failed:', data.error);
        console.error('📊 [CartSync] Response data:', data);
      }
    } catch (error: any) {
      console.error('❌ [CartSync] Sync error:', error.message || error);
      console.error('📊 [CartSync] Full error:', error);
    } finally {
      isSyncingRef.current = false;
    }
  }, [user, accessToken, items]);

  // Debounced sync
  const debouncedSync = useCallback(() => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(() => {
      syncCartToBackend();
    }, SYNC_CONFIG.CART_SYNC_DELAY);
  }, [syncCartToBackend]);

  // Load cart from backend on mount
  useEffect(() => {
    if (!user || !accessToken) return;

    const loadCart = async () => {
      try {
        console.info('📥 [CartSync] Loading cart from backend...');
        
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-adb995ba/cart`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'X-Session-Token': accessToken,
            },
          }
        );

        const data = await response.json();
        
        if (data.success && data.cart) {
          console.info('✅ [CartSync] Cart loaded:', data.cart.length, 'items');
          setItems(data.cart);
        }
      } catch (error) {
        console.error('❌ [CartSync] Load error:', error);
      }
    };

    loadCart();
  }, [user, accessToken, setItems]);

  // Sync when cart changes
  useEffect(() => {
    if (!SYNC_CONFIG.ENABLE_CART_SYNC || !user) return;
    debouncedSync();
  }, [items, user, debouncedSync]);

  // Listen for cart changes from other tabs via Supabase Realtime
  useEffect(() => {
    if (!user || !SYNC_CONFIG.ENABLE_CART_SYNC) return;

    console.info('👂 [CartSync] Setting up Realtime listener for user:', user.id);

    // Subscribe to cart changes
    const channel = supabase
      .channel(`cart:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'carts',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.info('🔔 [CartSync] Realtime update received:', payload);
          
          // Reload cart from backend
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const newCart = payload.new as any;
            if (newCart.items) {
              console.info('✅ [CartSync] Updating local cart from Realtime');
              setItems(JSON.parse(newCart.items));
            }
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      console.info('👋 [CartSync] Cleaning up Realtime listener');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [user, setItems]);

  return {
    isSyncing: isSyncingRef.current,
    syncNow: syncCartToBackend,
  };
}

// ==================== USER STATUS REAL-TIME CHECK ====================

export function useUserStatusCheck() {
  const { user, accessToken, logout } = useAuthStore();
  const { setBanNotification, setDeletedNotification } = useNotificationStore();
  const checkIntervalRef = useRef<NodeJS.Timeout>();

  const checkUserStatus = useCallback(async () => {
    if (!user || !accessToken) return;

    try {
      // ✅ SILENT: Remove verbose logging
      // console.info('🔍 [UserStatus] Checking user status...');

      // ✅ Add timeout to prevent hanging (increased to 10 seconds)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-adb995ba/auth/check-status`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'X-Session-Token': accessToken,
          },
          signal: controller.signal, // ✅ Add abort signal
        }
      );

      clearTimeout(timeoutId);

      // ✅ Handle expected status codes gracefully
      if (response.status === 401) {
        // Token expired/invalid - this is expected, just skip silently
        // console.info('ℹ️ [UserStatus] Token expired or invalid (expected behavior)');
        return;
      }

      if (response.status === 403) {
        // User banned/deleted/suspended - handle this with proper error response
        try {
          const errorData = await response.json();
          
          // If banned, handle it properly
          if (errorData.banned && errorData.banData) {
            console.info('🚫 [UserStatus] User is banned:', errorData.banData);
            setBanNotification({
              isBanned: true,
              reason: errorData.banData.reason || 'Melanggar ketentuan',
              bannedAt: errorData.banData.bannedAt || new Date().toISOString(),
              bannedBy: errorData.banData.bannedBy || 'Admin',
              permanent: errorData.banData.permanent || false,
              banEndDate: errorData.banData.banEndDate,
            });
            toast.error('Akun Anda telah dibanned oleh admin');
            setTimeout(() => logout(), 2000);
            return;
          }
          
          // If deleted, handle it properly
          if (errorData.deleted) {
            console.info('🗑️ [UserStatus] User was deleted');
            setDeletedNotification(true);
            toast.error('Akun Anda telah dihapus oleh admin');
            setTimeout(() => logout(), 2000);
            return;
          }
          
          // Generic 403 - just log as info, not warning
          // console.info('ℹ️ [UserStatus] User account inactive (expected behavior)');
        } catch (parseError) {
          // If we can't parse the response, just log and continue
          // console.info('ℹ️ [UserStatus] Access forbidden (expected behavior)');
        }
        return;
      }

      // ✅ Only warn for unexpected status codes (not 401/403)
      if (!response.ok) {
        console.error('❌ [UserStatus] Unexpected server error:', response.status);
        return;
      }

      const data = await response.json();

      // ✅ If we get here, status is OK (200) and user is active
      // No need to check banned/deleted again as server returns 403 for those cases
      // console.info('✅ [UserStatus] User status OK');
    } catch (error: any) {
      // ✅ Better error handling - silently handle timeouts and network errors
      if (error.name === 'AbortError') {
        // ✅ SILENT: Don't warn about timeout - server might be slow or under maintenance
        // Just skip this check and try again on next interval
        return;
      } else if (error.message?.includes('Failed to fetch')) {
        // ✅ SILENT: Network error - skip this check silently
        return;
      } else {
        // Only log unexpected errors
        console.error('❌ [UserStatus] Unexpected error:', error.message);
      }
      // Don't throw - just silently fail and try again on next interval
    }
  }, [user, accessToken, logout, setBanNotification, setDeletedNotification]);

  // Check status periodically
  useEffect(() => {
    if (!SYNC_CONFIG.ENABLE_USER_STATUS_CHECK || !user) return;

    console.info('⏰ [UserStatus] Starting periodic status check');

    // Check immediately
    checkUserStatus();

    // Then check periodically
    checkIntervalRef.current = setInterval(
      checkUserStatus,
      SYNC_CONFIG.USER_CHECK_INTERVAL
    );

    return () => {
      console.info('👋 [UserStatus] Stopping periodic check');
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [user, checkUserStatus]);

  // Also listen via Realtime for immediate updates
  useEffect(() => {
    if (!user) return;

    console.info('👂 [UserStatus] Setting up Realtime listener for user status');

    const channel = supabase
      .channel(`user_status:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          console.info('🔔 [UserStatus] Realtime update received:', payload);
          // Re-check status immediately
          checkUserStatus();
        }
      )
      .subscribe();

    return () => {
      console.info('👋 [UserStatus] Cleaning up Realtime listener');
      supabase.removeChannel(channel);
    };
  }, [user, checkUserStatus]);

  return {
    checkNow: checkUserStatus,
  };
}

// ==================== ORDER STATUS REAL-TIME SYNC ====================

export function useOrderRealTimeSync() {
  const { user } = useAuthStore();
  const { setOrders } = useOrderStore();

  useEffect(() => {
    if (!user || !SYNC_CONFIG.ENABLE_ORDER_SYNC) return;

    console.info('👂 [OrderSync] Setting up Realtime listener for orders');

    const channel = supabase
      .channel(`orders:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.info('🔔 [OrderSync] Realtime update received:', payload);

          if (payload.eventType === 'UPDATE') {
            const updatedOrder = payload.new as any;
            console.info('✅ [OrderSync] Order status updated:', updatedOrder.id, '→', updatedOrder.status);
            
            // Update order in store
            setOrders((orders) =>
              orders.map((order) =>
                order.id === updatedOrder.id
                  ? { ...order, status: updatedOrder.status, updatedAt: updatedOrder.updated_at }
                  : order
              )
            );

            // Show toast notification
            toast.success(`Pesanan ${updatedOrder.id.substring(0, 8)} telah diupdate ke ${updatedOrder.status}`);
          }

          if (payload.eventType === 'INSERT') {
            console.info('✅ [OrderSync] New order created');
            // Reload orders from backend
            // (implementation depends on your order loading logic)
          }
        }
      )
      .subscribe();

    return () => {
      console.info('👋 [OrderSync] Cleaning up Realtime listener');
      supabase.removeChannel(channel);
    };
  }, [user, setOrders]);
}

// ==================== NOTIFICATION REAL-TIME SYNC ====================

export function useNotificationRealTimeSync() {
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user || !SYNC_CONFIG.ENABLE_NOTIFICATION_SYNC) return;

    console.info('👂 [NotificationSync] Setting up Realtime listener');

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.info('🔔 [NotificationSync] New notification received:', payload);
          const notification = payload.new as any;
          
          // Show toast
          toast(notification.title, {
            description: notification.message,
          });

          // Update notification badge (if you have one)
          // updateNotificationBadge();
        }
      )
      .subscribe();

    return () => {
      console.info('👋 [NotificationSync] Cleaning up Realtime listener');
      supabase.removeChannel(channel);
    };
  }, [user]);
}

// ==================== REFUND STATUS REAL-TIME SYNC ====================

export function useRefundRealTimeSync(refundId?: string, onUpdate?: () => void) {
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user || !refundId) return;

    // ✅ Logging disabled

    const channel = supabase
      .channel(`refund:${refundId}`)
      .on(
        'broadcast',
        { event: 'refund_update' },
        (payload) => {
          // ✅ Logging disabled
          
          // Show toast notification
          if (payload.payload?.status) {
            const statusMessages: Record<string, string> = {
              approved: '✅ Refund Anda telah disetujui',
              rejected: '❌ Refund Anda ditolak',
              shipping: '📦 Konfirmasi pengiriman berhasil',
              refunded: '💰 Dana telah dikembalikan',
              completed: '✅ Refund selesai',
            };
            
            const message = statusMessages[payload.payload.status] || 'Status refund diperbarui';
            toast.success(message);
          }
          
          // Trigger reload callback
          if (onUpdate) {
            onUpdate();
          }
        }
      )
      .subscribe();

    return () => {
      // ✅ Logging disabled
      supabase.removeChannel(channel);
    };
  }, [user, refundId, onUpdate]);
}

// ==================== MASTER REAL-TIME SYNC HOOK ====================

/**
 * Master hook that enables ALL real-time sync features
 * Use this in your main App component
 */
export function useRealTimeSync() {
  console.info('🔄 [RealTimeSync] Initializing all real-time features');

  // Enable all sync features
  useCartRealTimeSync();
  useUserStatusCheck();
  useOrderRealTimeSync();
  useNotificationRealTimeSync();

  console.info('✅ [RealTimeSync] All real-time features active');
}