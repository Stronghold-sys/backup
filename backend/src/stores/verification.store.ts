import * as kv from './kv.store';
import { VerificationCode } from '../types';
import { generateVerificationCode as genCode } from '../utils/crypto';
import { logger } from '../utils/logger';

/**
 * Generate verification code
 */
export function generateVerificationCode(): string {
    return genCode();
}

/**
 * Store verification code
 */
export async function storeVerificationCode(
    email: string,
    code: string,
    type: 'signup' | 'forgot_password',
    expiresInMinutes: number = 10
): Promise<void> {
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString();

    const verification: VerificationCode = {
        email,
        code,
        type,
        expiresAt,
        createdAt: new Date().toISOString()
    };

    await kv.set(`verification:${type}:${email}`, verification);
    logger.info(`Verification code stored for ${email} (${type})`);
}

/**
 * Verify code
 */
export async function verifyCode(
    email: string,
    code: string,
    type: 'signup' | 'forgot_password'
): Promise<{ success: boolean; error?: string }> {
    const verification = await kv.get<VerificationCode>(`verification:${type}:${email}`);

    if (!verification) {
        return { success: false, error: 'Kode verifikasi tidak ditemukan atau sudah kadaluarsa' };
    }

    if (new Date() > new Date(verification.expiresAt)) {
        await kv.del(`verification:${type}:${email}`);
        return { success: false, error: 'Kode verifikasi sudah kadaluarsa' };
    }

    if (verification.code !== code) {
        return { success: false, error: 'Kode verifikasi salah' };
    }

    return { success: true };
}

/**
 * Delete verification code
 */
export async function deleteVerificationCode(
    email: string,
    type: 'signup' | 'forgot_password'
): Promise<void> {
    await kv.del(`verification:${type}:${email}`);
}

/**
 * Resend verification code
 */
export async function resendVerificationCode(
    email: string,
    type: 'signup' | 'forgot_password'
): Promise<{ success: boolean; code?: string; error?: string }> {
    const newCode = generateVerificationCode();
    await storeVerificationCode(email, newCode, type, 10);

    return { success: true, code: newCode };
}
