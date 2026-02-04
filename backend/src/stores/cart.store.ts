import * as kv from './kv.store';
import { Cart, CartItem } from '../types';

/**
 * Get user cart
 */
export async function getUserCart(userId: string): Promise<Cart | null> {
    return await kv.get<Cart>(`cart:${userId}`);
}

/**
 * Update user cart
 */
export async function updateUserCart(userId: string, items: CartItem[]): Promise<void> {
    const cart: Cart = {
        userId,
        items,
        updatedAt: new Date().toISOString()
    };

    await kv.set(`cart:${userId}`, cart);
}

/**
 * Add item to cart
 */
export async function addToCart(userId: string, productId: string, quantity: number): Promise<void> {
    const cart = await getUserCart(userId);
    const items = cart?.items || [];

    const existingItem = items.find(item => item.productId === productId);

    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        items.push({ productId, quantity });
    }

    await updateUserCart(userId, items);
}

/**
 * Remove item from cart
 */
export async function removeFromCart(userId: string, productId: string): Promise<void> {
    const cart = await getUserCart(userId);
    if (!cart) return;

    const items = cart.items.filter(item => item.productId !== productId);
    await updateUserCart(userId, items);
}

/**
 * Clear cart
 */
export async function clearCart(userId: string): Promise<void> {
    await kv.del(`cart:${userId}`);
}
