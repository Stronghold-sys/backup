import * as kv from './kv.store';
import { Voucher } from '../types';
import { generateVoucherCode } from '../utils/crypto';
import { generateUUID } from '../utils/crypto';
import { logger } from '../utils/logger';

/**
 * Create voucher for user
 */
export async function createVoucherForUser(userId: string, userEmail: string): Promise<Voucher> {
    const voucherId = generateUUID();
    const code = generateVoucherCode(8);

    const voucher: Voucher = {
        id: voucherId,
        code,
        discountType: 'percentage',
        discountValue: 10,
        minPurchase: 50000,
        maxDiscount: 20000,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        usageLimit: 1,
        usedCount: 0,
        status: 'active',
        userId,
        userEmail,
        isPublic: false,
        createdAt: new Date().toISOString()
    };

    await kv.set(`voucher:${voucherId}`, voucher);
    logger.success(`Voucher created: ${code} for ${userEmail}`);

    return voucher;
}

/**
 * Get voucher by code
 */
export async function getVoucherByCode(code: string): Promise<Voucher | null> {
    const vouchers = await kv.getByPrefix<Voucher>('voucher:');
    return vouchers.find(v => v.code === code) || null;
}

/**
 * Validate voucher
 */
export async function validateVoucher(
    code: string,
    userId: string,
    orderAmount: number
): Promise<{ valid: boolean; voucher?: Voucher; error?: string }> {
    const voucher = await getVoucherByCode(code);

    if (!voucher) {
        return { valid: false, error: 'Voucher tidak ditemukan' };
    }

    if (voucher.status !== 'active') {
        return { valid: false, error: 'Voucher tidak aktif' };
    }

    if (voucher.expiresAt && new Date() > new Date(voucher.expiresAt)) {
        return { valid: false, error: 'Voucher sudah kadaluarsa' };
    }

    if (voucher.userId && voucher.userId !== userId) {
        return { valid: false, error: 'Voucher ini tidak dapat digunakan' };
    }

    if (voucher.minPurchase && orderAmount < voucher.minPurchase) {
        return { valid: false, error: `Minimal pembelian Rp ${voucher.minPurchase.toLocaleString()}` };
    }

    if (voucher.usageLimit && voucher.usedCount >= voucher.usageLimit) {
        return { valid: false, error: 'Voucher sudah habis digunakan' };
    }

    return { valid: true, voucher };
}

/**
 * Use voucher
 */
export async function useVoucher(voucherId: string): Promise<void> {
    const voucher = await kv.get<Voucher>(`voucher:${voucherId}`);

    if (voucher) {
        voucher.usedCount++;

        if (voucher.usageLimit && voucher.usedCount >= voucher.usageLimit) {
            voucher.status = 'used';
        }

        await kv.set(`voucher:${voucherId}`, voucher);
    }
}

/**
 * Seed public vouchers
 */
export async function seedPublicVouchers(): Promise<void> {
    const publicVouchers = [
        {
            code: 'WELCOME10',
            discountType: 'percentage' as const,
            discountValue: 10,
            minPurchase: 100000,
            isPublic: true
        },
        {
            code: 'SAVE20K',
            discountType: 'fixed' as const,
            discountValue: 20000,
            minPurchase: 200000,
            isPublic: true
        }
    ];

    for (const voucherData of publicVouchers) {
        const existing = await getVoucherByCode(voucherData.code);
        if (!existing) {
            const voucher: Voucher = {
                id: generateUUID(),
                ...voucherData,
                usageLimit: undefined,
                usedCount: 0,
                status: 'active',
                isPublic: true,
                createdAt: new Date().toISOString()
            };

            await kv.set(`voucher:${voucher.id}`, voucher);
            logger.info(`Public voucher seeded: ${voucher.code}`);
        }
    }
}
