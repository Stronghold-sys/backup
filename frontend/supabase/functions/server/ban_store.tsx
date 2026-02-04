import * as kv from "./kv_store.tsx";

export interface UserBan {
  userId: string;
  type: 'suspend' | 'ban';
  reason: string;
  startDate: string; // ISO string
  endDate: string | 'permanent'; // ISO string or 'permanent'
  bannedBy: string; // Admin user ID
  bannedByName: string; // Admin name
  bannedAt: string; // ISO string
  isActive: boolean;
}

/**
 * Save ban/suspend data for a user
 */
export async function banUser(banData: UserBan): Promise<void> {
  const key = `user_ban_${banData.userId}`;
  await kv.set(key, banData);
  console.log(`🚫 User ${banData.userId} has been ${banData.type}ed until ${banData.endDate}`);
}

/**
 * Get ban data for a user
 */
export async function getUserBan(userId: string): Promise<UserBan | null> {
  const key = `user_ban_${userId}`;
  
  try {
    const banData = await kv.get(key);
    
    if (!banData) {
      return null;
    }
    
    return banData as UserBan;
  } catch (error: any) {
    // ✅ GRACEFUL FALLBACK: On connection error, assume user is NOT banned
    console.error(`⚠️ Failed to check ban status for user ${userId}:`, error.message);
    console.log('🔄 Fallback: Assuming user is NOT banned (fail-open for availability)');
    return null;
  }
}

/**
 * Check if user is currently banned/suspended
 */
export async function isUserBanned(userId: string): Promise<{ banned: boolean; data: UserBan | null }> {
  const banData = await getUserBan(userId);
  
  if (!banData || !banData.isActive) {
    return { banned: false, data: null };
  }
  
  // Check if ban is permanent
  if (banData.endDate === 'permanent') {
    return { banned: true, data: banData };
  }
  
  // Check if ban has expired
  const now = new Date();
  const endDate = new Date(banData.endDate);
  
  if (now >= endDate) {
    // Ban has expired, deactivate it
    banData.isActive = false;
    await banUser(banData);
    return { banned: false, data: null };
  }
  
  return { banned: true, data: banData };
}

/**
 * Remove ban/suspend from a user
 */
export async function unbanUser(userId: string): Promise<void> {
  const banData = await getUserBan(userId);
  
  if (banData) {
    banData.isActive = false;
    await banUser(banData);
    console.log(`✅ User ${userId} has been unbanned`);
  }
}

/**
 * Get all banned users
 */
export async function getAllBannedUsers(): Promise<UserBan[]> {
  const allBans = await kv.getByPrefix('user_ban_');
  const activeBans = allBans.filter((ban: UserBan) => ban.isActive);
  
  // Filter out expired bans
  const now = new Date();
  return activeBans.filter((ban: UserBan) => {
    if (ban.endDate === 'permanent') return true;
    return new Date(ban.endDate) > now;
  });
}

/**
 * Calculate duration from now
 */
export function calculateEndDate(duration: number, unit: 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years'): string {
  const now = new Date();
  
  switch (unit) {
    case 'seconds':
      now.setSeconds(now.getSeconds() + duration);
      break;
    case 'minutes':
      now.setMinutes(now.getMinutes() + duration);
      break;
    case 'hours':
      now.setHours(now.getHours() + duration);
      break;
    case 'days':
      now.setDate(now.getDate() + duration);
      break;
    case 'weeks':
      now.setDate(now.getDate() + (duration * 7));
      break;
    case 'months':
      now.setMonth(now.getMonth() + duration);
      break;
    case 'years':
      now.setFullYear(now.getFullYear() + duration);
      break;
  }
  
  return now.toISOString();
}