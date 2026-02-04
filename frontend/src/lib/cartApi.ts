import { projectId } from '/utils/supabase';
import { Product, CartItem, authStoreInstance } from './store'; // ✅ FIXED: Import store instance

/**
 * ✅ PRODUCTION MODE: All cart operations use Supabase backend
 * NO localStorage usage - all data from database
 */

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-adb995ba`;

/**
 * Backend cart item format (from database)
 */
export interface CartItemBackend {
  userId: string;
  productId: string;
  quantity: number;
  addedAt: string;
  updatedAt: string;
}

/**
 * ✅ Get auth token from Supabase Auth session or store
 */
export async function getAuthToken(): Promise<string | null> {
  // ✅ Use async version to get token from Supabase Auth session
  try {
    const { getAccessToken } = await import('./authHelper');
    return await getAccessToken();
  } catch (e) {
    console.error('Error getting auth token:', e);
    // Fallback to store
    const { accessToken } = authStoreInstance.getState();
    return accessToken;
  }
}

/**
 * Add item to cart (backend)
 */
export async function addToCartBackend(productId: string, quantity: number): Promise<CartItemBackend> {
  const token = await getAuthToken();
  
  const response = await fetch(`${API_BASE}/cart/items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ productId, quantity }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to add item to cart');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Get cart items from backend
 */
export async function getCartItemsBackend(): Promise<CartItemBackend[]> {
  const token = await getAuthToken();
  
  if (!token) {
    console.info('ℹ️ [getCartItemsBackend] No auth token available');
    throw new Error('No authentication token');
  }
  
  console.info('📦 [getCartItemsBackend] Fetching cart items...');
  
  const response = await fetch(`${API_BASE}/cart/items`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    let errorMessage = 'Failed to get cart items';
    try {
      const error = await response.json();
      errorMessage = error.error || errorMessage;
      
      // If 401, it means user is not authenticated - return empty array instead of throwing
      if (response.status === 401) {
        console.info('ℹ️ [getCartItemsBackend] Unauthorized (401) - User session expired or invalid');
        throw new Error('Unauthorized');
      }
      
      console.error(`❌ [getCartItemsBackend] Error ${response.status}: ${errorMessage}`);
    } catch (e) {
      if ((e as Error).message === 'Unauthorized') {
        throw e; // Re-throw Unauthorized to be handled gracefully
      }
      console.error(`❌ [getCartItemsBackend] Error ${response.status}: ${response.statusText}`);
    }
    throw new Error(errorMessage);
  }

  const result = await response.json();
  console.info(`✅ [getCartItemsBackend] Fetched ${result.data?.length || 0} items`);
  return result.data || [];
}

/**
 * Update cart item quantity (backend)
 */
export async function updateCartItemBackend(productId: string, quantity: number): Promise<CartItemBackend> {
  const token = await getAuthToken();
  
  const response = await fetch(`${API_BASE}/cart/items/${productId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ quantity }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update cart item');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Remove item from cart (backend)
 */
export async function removeFromCartBackend(productId: string): Promise<void> {
  const token = await getAuthToken();
  
  const response = await fetch(`${API_BASE}/cart/items/${productId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to remove item from cart');
  }
}

/**
 * Clear all cart items (backend)
 */
export async function clearCartBackend(): Promise<void> {
  const token = await getAuthToken();
  
  const response = await fetch(`${API_BASE}/cart/clear`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to clear cart');
  }
}

/**
 * Get cart item count (backend)
 */
export async function getCartCountBackend(): Promise<number> {
  const token = await getAuthToken();
  
  const response = await fetch(`${API_BASE}/cart/count`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get cart count');
  }

  const result = await response.json();
  return result.count;
}

/**
 * Sync cart from backend to local state
 * Converts backend cart items to CartItem format with full product data
 * 
 * ✅ FIXED: Returns null on error to distinguish from "empty cart"
 * - null = error/failed sync (preserve existing cart)
 * - [] = successful sync with no items (empty cart)
 */
export async function syncCartFromBackend(products: Product[]): Promise<CartItem[] | null> {
  try {
    // Check if user is authenticated first
    const token = await getAuthToken();
    if (!token) {
      console.info('ℹ️ [syncCartFromBackend] No auth token, returning empty cart');
      // No token = not authenticated = legitimately empty cart
      return [];
    }
    
    const backendCart = await getCartItemsBackend();
    
    // Map backend cart items to CartItem format
    const cartItems: CartItem[] = backendCart
      .map(item => {
        const product = products.find(p => p.id === item.productId);
        if (!product) {
          console.warn(`⚠️ [syncCartFromBackend] Product ${item.productId} not found in products list`);
          return null;
        }
        
        return {
          productId: item.productId,
          product,
          quantity: item.quantity,
        };
      })
      .filter(item => item !== null) as CartItem[];
    
    console.info(`✅ [syncCartFromBackend] Synced ${cartItems.length} cart items from backend`);
    return cartItems; // ✅ Empty array = successful sync with no items
  } catch (error: any) {
    // ✅ FIXED: Return null on errors to preserve existing cart
    // Only return empty array for legitimate "no auth" cases
    if (error.message === 'No authentication token') {
      console.info('ℹ️ [syncCartFromBackend] User not authenticated, returning empty cart');
      return []; // Legitimate empty cart
    } else if (error.message === 'Unauthorized') {
      console.info('⚠️ [syncCartFromBackend] Session expired or invalid token, returning null to preserve cart');
      return null; // ✅ Return null to preserve existing cart
    } else {
      console.error('❌ [syncCartFromBackend] Failed to sync cart (network/API error), returning null to preserve cart:', error);
      return null; // ✅ Return null on all other errors to preserve cart
    }
  }
}