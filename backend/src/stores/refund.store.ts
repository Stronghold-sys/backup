import * as kv from './kv.store';
import { Refund } from '../types';
import { generateUUID } from '../utils/crypto';

/**
 * Create refund request
 */
export async function createRefund(
    orderId: string,
    userId: string,
    reason: string,
    amount: number
): Promise<Refund> {
    const refund: Refund = {
        id: generateUUID(),
        orderId,
        userId,
        reason,
        amount,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    await kv.set(`refund:${refund.id}`, refund);
    return refund;
}

/**
 * Get refund by ID
 */
export async function getRefundById(refundId: string): Promise<Refund | null> {
    return await kv.get<Refund>(`refund:${refundId}`);
}

/**
 * Get all refunds
 */
export async function getAllRefunds(): Promise<Refund[]> {
    return await kv.getByPrefix<Refund>('refund:');
}

/**
 * Get user refunds
 */
export async function getUserRefunds(userId: string): Promise<Refund[]> {
    const allRefunds = await getAllRefunds();
    return allRefunds.filter(r => r.userId === userId);
}

/**
 * Update refund status
 */
export async function updateRefundStatus(
    refundId: string,
    status: 'pending' | 'approved' | 'rejected',
    adminNote?: string
): Promise<Refund | null> {
    const refund = await getRefundById(refundId);

    if (!refund) return null;

    refund.status = status;
    refund.adminNote = adminNote;
    refund.updatedAt = new Date().toISOString();

    await kv.set(`refund:${refundId}`, refund);
    return refund;
}
