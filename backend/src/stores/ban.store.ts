import * as kv from './kv.store';
import { BanRecord } from '../types';
import { logger } from '../utils/logger';

/**
 * Check if user is banned
 */
export async function isUserBanned(userId: string): Promise<{ banned: boolean; data?: BanRecord }> {
    const banRecord = await kv.get<BanRecord>(`ban:${userId}`);

    if (!banRecord || !banRecord.isActive) {
        return { banned: false };
    }

    // Check if ban has expired
    if (banRecord.expiresAt && new Date() > new Date(banRecord.expiresAt)) {
        banRecord.isActive = false;
        await kv.set(`ban:${userId}`, banRecord);
        return { banned: false };
    }

    return { banned: true, data: banRecord };
}

/**
 * Get user ban record
 */
export async function getUserBan(userId: string): Promise<BanRecord | null> {
    return await kv.get<BanRecord>(`ban:${userId}`);
}

/**
 * Ban user
 */
export async function banUser(
    userId: string,
    type: 'ban' | 'suspend',
    reason: string,
    duration?: number
): Promise<void> {
    const banRecord: BanRecord = {
        userId,
        type,
        reason,
        duration,
        expiresAt: duration ? new Date(Date.now() + duration * 60 * 1000).toISOString() : null,
        isActive: true,
        createdAt: new Date().toISOString()
    };

    await kv.set(`ban:${userId}`, banRecord);
    logger.info(`User ${userId} ${type}ed: ${reason}`);
}

/**
 * Unban user
 */
export async function unbanUser(userId: string): Promise<void> {
    const banRecord = await kv.get<BanRecord>(`ban:${userId}`);

    if (banRecord) {
        banRecord.isActive = false;
        await kv.set(`ban:${userId}`, banRecord);
    }

    logger.info(`User ${userId} unbanned`);
}
