import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { ProductSync, OrderSync } from './syncManager';
import { productStoreInstance, orderStoreInstance, authStoreInstance } from './store'; // ✅ FIXED: Import store instance

/**
 * 🔄 Real-time Product & Order Sync Hook
 * Automatically syncs products and orders from backend periodically
 * - Products: Always sync (public data)
 * - Orders: Only sync for authenticated users
 */
export function useRealTimeSync(intervalMs: number = 30000, syncOrders: boolean = false) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);
  const previousProductCount = useRef(0);
  const previousOrderCount = useRef(0);

  useEffect(() => {
    // Cleanup function
    const cleanup = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    // Start periodic sync
    intervalRef.current = setInterval(async () => {
      try {
        console.info('🔄 [RealTimeSync] Syncing data...');
        
        // Always sync products
        await ProductSync.loadProducts();
        
        // ✅ FIX: Get products directly from store state without subscribing
        const currentProducts = productStoreInstance.getState().products;
        
        // Only show notification after initial load
        if (isInitializedRef.current && currentProducts.length !== previousProductCount.current) {
          console.info(`📦 Products updated: ${previousProductCount.current} -> ${currentProducts.length}`);
        }
        
        previousProductCount.current = currentProducts.length;

        // ✅ NEW: Sync orders if enabled and user is authenticated
        if (syncOrders) {
          const currentUser = authStoreInstance.getState().user;
          if (currentUser) {
            try {
              const orders = await OrderSync.getUserOrders();
              const currentOrders = orderStoreInstance.getState().orders;
              
              // Only show notification after initial load
              if (isInitializedRef.current && orders.length !== previousOrderCount.current) {
                console.info(`📦 Orders updated: ${previousOrderCount.current} -> ${orders.length}`);
              }
              
              previousOrderCount.current = orders.length;
            } catch (error) {
              console.warn('⚠️ [RealTimeSync] Failed to sync orders:', error);
            }
          }
        }
        
        isInitializedRef.current = true;
      } catch (error) {
        console.warn('⚠️ [RealTimeSync] Sync failed:', error);
        // Don't show error toast - silent failure is better for UX
      }
    }, intervalMs);

    return cleanup;
  }, [intervalMs, syncOrders]);
}