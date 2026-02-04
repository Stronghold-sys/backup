import { useEffect, useRef } from 'react';
import { useProductStore, useCartStore } from './store';
import { toast } from 'sonner';

/**
 * ✅ PRODUCTION MODE: Simple cart sync with product catalog
 * 
 * CRITICAL CHANGES v2.0:
 * - NO backend dependency
 * - NO localStorage usage
 * - Pure local state management
 * - Only syncs with product catalog (price/stock updates)
 * - Never clears cart on error
 * 
 * What it does:
 * 1. Updates cart items with latest product data (price, stock, name)
 * 2. Removes items that are no longer in catalog
 * 3. Adjusts quantities if stock changed
 * 4. Shows toast notifications for changes
 */
export function useCartSync() {
  const { products } = useProductStore();
  const { items, updateQuantity, removeItem, updateProductInCart } = useCartStore();
  
  const isSyncingRef = useRef(false);
  const lastSyncKeyRef = useRef('');

  console.info('🔄 [CartSync] Active - items:', items.length, 'products:', products.length);

  // Sync cart items with product catalog
  useEffect(() => {
    // Skip if already syncing or no data
    if (isSyncingRef.current || products.length === 0 || items.length === 0) {
      return;
    }

    // Create a unique key to detect changes
    const currentKey = `${products.map(p => `${p.id}-${p.price}-${p.stock}`).join('|')}_${items.map(i => `${i.productId}-${i.quantity}`).join('|')}`;
    
    // Skip if nothing changed
    if (lastSyncKeyRef.current === currentKey) {
      return;
    }

    console.info('🔄 [CartSync] Syncing cart with product catalog...');
    isSyncingRef.current = true;
    lastSyncKeyRef.current = currentKey;

    // Sync each cart item with latest product data
    items.forEach((cartItem) => {
      const latestProduct = products.find((p) => p.id === cartItem.productId);
      
      if (!latestProduct) {
        // Product removed from catalog
        console.info(`⚠️ [CartSync] Product ${cartItem.productId} not found, removing from cart`);
        removeItem(cartItem.productId);
        toast.warning(`Produk "${cartItem.product?.name || 'Unknown'}" tidak tersedia lagi`);
        return;
      }

      // Update product data if changed
      const needsUpdate = 
        cartItem.product?.price !== latestProduct.price ||
        cartItem.product?.stock !== latestProduct.stock ||
        cartItem.product?.name !== latestProduct.name;

      if (needsUpdate) {
        console.info(`🔄 [CartSync] Updating product data for ${cartItem.productId}`);
        updateProductInCart(cartItem.productId, latestProduct);
        
        // Notify price change
        if (cartItem.product?.price !== latestProduct.price) {
          toast.info(`Harga "${latestProduct.name}" telah diperbarui`);
        }
      }

      // Check if out of stock
      if (latestProduct.stock === 0) {
        console.info(`⚠️ [CartSync] Product ${cartItem.productId} out of stock, removing`);
        removeItem(cartItem.productId);
        toast.warning(`Produk "${latestProduct.name}" habis dan dihapus dari keranjang`);
        return;
      }

      // Adjust quantity if exceeds stock
      if (cartItem.quantity > latestProduct.stock) {
        console.info(`⚠️ [CartSync] Adjusting quantity for ${cartItem.productId}: ${cartItem.quantity} -> ${latestProduct.stock}`);
        updateQuantity(cartItem.productId, latestProduct.stock);
        toast.warning(`Jumlah "${latestProduct.name}" disesuaikan dengan stok (${latestProduct.stock})`);
      }
    });

    isSyncingRef.current = false;
    console.info('✅ [CartSync] Sync complete');
  }, [products, items, updateQuantity, removeItem, updateProductInCart]);

  return { isSyncing: isSyncingRef.current };
}
