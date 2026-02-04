import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

/**
 * Hash password using SHA-256
 */
export async function hashPassword(password: string): Promise<string> {
    return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * Generate UUID v4
 */
export function generateUUID(): string {
    return uuidv4();
}

/**
 * Generate random verification code (6 digits)
 */
export function generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generate random voucher code
 */
export function generateVoucherCode(length: number = 8): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}
