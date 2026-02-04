import * as kv from './kv_store.tsx';

export interface DeletedUserRecord {
  userId: string;
  email: string;
  name: string;
  deletedBy: string;
  deletedByName: string;
  deletedAt: string;
  reason?: string;
}

/**
 * Store deleted user information
 */
export async function storeDeletedUser(record: DeletedUserRecord): Promise<void> {
  try {
    const key = `deleted_user:${record.email}`;
    await kv.set(key, record);
    console.log(`✅ Stored deleted user record for: ${record.email}`);
  } catch (error) {
    console.error('❌ Error storing deleted user record:', error);
    throw error;
  }
}

/**
 * Check if an email belongs to a deleted user
 */
export async function getDeletedUserByEmail(email: string): Promise<DeletedUserRecord | null> {
  try {
    const key = `deleted_user:${email}`;
    const record = await kv.get(key);
    return record as DeletedUserRecord | null;
  } catch (error) {
    console.error('❌ Error getting deleted user record:', error);
    return null;
  }
}

/**
 * Remove deleted user record (for cleanup or if user is restored)
 */
export async function removeDeletedUserRecord(email: string): Promise<void> {
  try {
    const key = `deleted_user:${email}`;
    await kv.del(key);
    console.log(`✅ Removed deleted user record for: ${email}`);
  } catch (error) {
    console.error('❌ Error removing deleted user record:', error);
    throw error;
  }
}

/**
 * Get all deleted user records
 */
export async function getAllDeletedUsers(): Promise<DeletedUserRecord[]> {
  try {
    const records = await kv.getByPrefix('deleted_user:');
    return records as DeletedUserRecord[];
  } catch (error) {
    console.error('❌ Error getting deleted user records:', error);
    return [];
  }
}

/**
 * Clear all deleted user records (for reset)
 */
export async function clearAllDeletedUsers(): Promise<void> {
  try {
    const records = await getAllDeletedUsers();
    const emails = records.map(r => r.email);

    if (emails.length > 0) {
      await kv.mdel(emails.map(email => `deleted_user:${email}`));
      console.log(`✅ Cleared ${emails.length} deleted user records`);
    }
  } catch (error) {
    console.error('❌ Error clearing deleted user records:', error);
    throw error;
  }
}
