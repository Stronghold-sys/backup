import * as kv from './kv.store';
import { DeletedUser } from '../types';
import { logger } from '../utils/logger';

/**
 * Store deleted user info
 */
export async function storeDeletedUser(
    email: string,
    userId: string,
    deletedBy: string,
    reason?: string
): Promise<void> {
    const deletedUser: DeletedUser = {
        email,
        userId,
        deletedAt: new Date().toISOString(),
        deletedBy,
        reason
    };

    await kv.set(`deleted_user:${email}`, deletedUser);
    logger.info(`Deleted user record stored for ${email}`);
}

/**
 * Get deleted user by email
 */
export async function getDeletedUserByEmail(email: string): Promise<DeletedUser | null> {
    return await kv.get<DeletedUser>(`deleted_user:${email}`);
}

/**
 * Remove deleted user record
 */
export async function removeDeletedUser(email: string): Promise<void> {
    await kv.del(`deleted_user:${email}`);
    logger.info(`Deleted user record removed for ${email}`);
}
