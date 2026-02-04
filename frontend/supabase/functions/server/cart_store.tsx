
import * as kv from "./kv_store.tsx";

export interface CartItem {
  userId: string;
  productId: string;
  quantity: number;
  addedAt: string;
  updatedAt: string;
}

/**
 * Add item to user's cart
 */
export async function addCartItem(userId: string, productId: string, quantity: number): Promise<CartItem> {
  const key = `cart:${userId}:${productId}`;

  // Check if item already exists
  const existing = await kv.get(key);

  const now = new Date().toISOString();

  if (existing) {
    // Update quantity (increment)
    const updated: CartItem = {
      ...existing,
      quantity: existing.quantity + quantity,
      updatedAt: now,
    };
    await kv.set(key, updated);
    console.log(`✅ [CartStore] Updated cart item for user ${userId}, product ${productId}, new qty: ${updated.quantity}`);
    return updated;
  } else {
    // Create new cart item
    const newItem: CartItem = {
      userId,
      productId,
      quantity,
      addedAt: now,
      updatedAt: now,
    };
    await kv.set(key, newItem);
    console.log(`✅ [CartStore] Added new cart item for user ${userId}, product ${productId}, qty: ${quantity}`);
    return newItem;
  }
}

/**
 * Get all cart items for a user
 */
export async function getCartItems(userId: string): Promise<CartItem[]> {
  const prefix = `cart:${userId}:`;
  const items = await kv.getByPrefix(prefix);
  console.log(`📦 [CartStore] Retrieved ${items.length} cart items for user ${userId}`);
  return items;
}

/**
 * Update cart item quantity
 */
export async function updateCartItemQuantity(userId: string, productId: string, quantity: number): Promise<CartItem | null> {
  const key = `cart:${userId}:${productId}`;
  const existing = await kv.get(key);

  if (!existing) {
    console.log(`⚠️ [CartStore] Cart item not found: ${key}`);
    return null;
  }

  const updated: CartItem = {
    ...existing,
    quantity,
    updatedAt: new Date().toISOString(),
  };

  await kv.set(key, updated);
  console.log(`✅ [CartStore] Updated quantity for user ${userId}, product ${productId}: ${quantity}`);
  return updated;
}

/**
 * Remove item from cart
 */
export async function removeCartItem(userId: string, productId: string): Promise<boolean> {
  const key = `cart:${userId}:${productId}`;
  await kv.del(key);
  console.log(`🗑️ [CartStore] Removed cart item for user ${userId}, product ${productId}`);
  return true;
}

/**
 * Clear all cart items for a user
 */
export async function clearCart(userId: string): Promise<boolean> {
  const prefix = `cart:${userId}:`;
  const items = await kv.getByPrefix(prefix);

  // Delete all items
  const keys = items.map(item => `cart:${userId}:${item.productId}`);
  if (keys.length > 0) {
    await kv.mdel(keys);
    console.log(`🗑️ [CartStore] Cleared ${keys.length} cart items for user ${userId}`);
  }

  return true;
}

/**
 * Get cart item count for a user
 */
export async function getCartItemCount(userId: string): Promise<number> {
  const items = await getCartItems(userId);
  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
  console.log(`🔢 [CartStore] Total cart items for user ${userId}: ${totalCount}`);
  return totalCount;
}
