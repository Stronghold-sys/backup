import * as kv from './kv_store.tsx';

interface Voucher {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minPurchase?: number;
  maxDiscount?: number;
  maxUsage?: number;
  usageCount?: number;
  status: 'active' | 'used' | 'expired';
  userId: string | null;
  userEmail: string;
  usedByUserIds?: string[];
  usedAt?: string;
  usedInOrderId?: string;
  createdAt: string;
  expiresAt?: string;
}

/**
 * Get voucher by ID
 */
async function getVoucherById(voucherId: string): Promise<Voucher | null> {
  try {
    const data = await kv.get(`voucher:${voucherId}`);
    if (!data) return null;
    return JSON.parse(data);
  } catch (error) {
    console.error('Error getting voucher:', error);
    return null;
  }
}

/**
 * Get voucher by code
 */
async function getVoucherByCode(code: string): Promise<Voucher | null> {
  try {
    // Get voucher ID from code mapping
    const voucherId = await kv.get(`voucher_code:${code.toUpperCase()}`);
    if (!voucherId) return null;
    
    // Get voucher data
    return await getVoucherById(voucherId);
  } catch (error) {
    console.error('Error getting voucher by code:', error);
    return null;
  }
}

/**
 * Validate voucher for usage
 */
export async function validateVoucher(
  code: string, 
  userId: string, 
  totalAmount?: number
): Promise<{
  valid: boolean;
  message: string;
  voucher?: Voucher;
}> {
  try {
    const voucher = await getVoucherByCode(code);
    
    if (!voucher) {
      return { valid: false, message: 'Kode voucher tidak ditemukan' };
    }
    
    // Check if voucher is expired
    if (voucher.expiresAt && new Date(voucher.expiresAt) < new Date()) {
      return { valid: false, message: 'Voucher sudah kedaluwarsa' };
    }
    
    // Check voucher status
    const isPublicVoucher = voucher.userId === null || voucher.userId === 'public';
    
    if (isPublicVoucher) {
      // For public vouchers, check max usage and if user already used it
      if (voucher.status === 'expired') {
        return { valid: false, message: 'Voucher sudah mencapai batas penggunaan' };
      }
      
      if (voucher.usedByUserIds && voucher.usedByUserIds.includes(userId)) {
        return { valid: false, message: 'Anda sudah menggunakan voucher ini' };
      }
      
      if (voucher.maxUsage && voucher.usageCount && voucher.usageCount >= voucher.maxUsage) {
        return { valid: false, message: 'Voucher sudah mencapai batas penggunaan' };
      }
    } else {
      // For personal vouchers, check if it belongs to this user and not used
      if (voucher.userId !== userId) {
        return { valid: false, message: 'Voucher ini tidak dapat digunakan oleh akun Anda' };
      }
      
      if (voucher.status === 'used') {
        return { valid: false, message: 'Voucher sudah digunakan' };
      }
      
      if (voucher.status === 'expired') {
        return { valid: false, message: 'Voucher sudah kedaluwarsa' };
      }
    }
    
    // Check minimum purchase requirement
    if (voucher.minPurchase && totalAmount && totalAmount < voucher.minPurchase) {
      return { 
        valid: false, 
        message: `Minimum pembelian Rp ${voucher.minPurchase.toLocaleString('id-ID')} untuk menggunakan voucher ini` 
      };
    }
    
    return { 
      valid: true, 
      message: 'Voucher berhasil divalidasi',
      voucher 
    };
  } catch (error) {
    console.error('Error validating voucher:', error);
    return { valid: false, message: 'Terjadi kesalahan saat validasi voucher' };
  }
}

/**
 * Get user's vouchers (personal + available public vouchers)
 */
export async function getUserVouchersWithData(userId: string): Promise<Voucher[]> {
  try {
    const allVouchers = await getAllVouchers();
    
    console.log(`🔍 [getUserVouchersWithData] Filtering ${allVouchers.length} total vouchers for user ${userId}`);
    
    // Filter vouchers for this user:
    // 1. Personal vouchers (userId matches and status is active)
    // 2. Public vouchers (userId is null or 'public', status is active, and user hasn't used it yet)
    const userVouchers = allVouchers.filter(voucher => {
      const isPersonalVoucher = voucher.userId === userId;
      const isPublicVoucher = voucher.userId === null || voucher.userId === 'public';
      
      if (isPersonalVoucher) {
        // Include personal vouchers that are active
        const isActive = voucher.status === 'active';
        if (!isActive) {
          console.log(`  ⏭️  Skipping personal voucher ${voucher.code} - status: ${voucher.status}`);
        }
        return isActive;
      }
      
      if (isPublicVoucher) {
        // Include public vouchers that are active and user hasn't used
        const hasUsed = voucher.usedByUserIds && voucher.usedByUserIds.includes(userId);
        const isActive = voucher.status === 'active';
        
        if (hasUsed) {
          console.log(`  ⏭️  Skipping public voucher ${voucher.code} - already used by this user`);
        } else if (!isActive) {
          console.log(`  ⏭️  Skipping public voucher ${voucher.code} - status: ${voucher.status}`);
        }
        
        return isActive && !hasUsed;
      }
      
      return false;
    });
    
    console.log(`✅ [getUserVouchersWithData] Returning ${userVouchers.length} available vouchers for user ${userId}`);
    
    return userVouchers;
  } catch (error) {
    console.error('Error getting user vouchers:', error);
    return [];
  }
}

/**
 * Create voucher for a specific user (used during signup)
 */
export async function createVoucherForUser(userId: string, email: string): Promise<Voucher> {
  const voucherId = `voucher-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const voucherCode = `WELCOME${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  
  const voucher: Voucher = {
    id: voucherId,
    code: voucherCode,
    discountType: 'percentage',
    discountValue: 10,
    minPurchase: 50000,
    maxDiscount: 50000,
    status: 'active',
    userId: userId,
    userEmail: email,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
  };
  
  await kv.set(`voucher:${voucherId}`, JSON.stringify(voucher));
  await kv.set(`voucher_code:${voucherCode}`, voucherId);
  
  return voucher;
}

/**
 * Mark voucher as used
 */
export async function markVoucherAsUsed(voucherId: string, orderId: string, userId: string): Promise<void> {
  const voucher = await getVoucherById(voucherId);
  if (!voucher) {
    throw new Error('Voucher not found');
  }
  
  const isPublicVoucher = voucher.userId === null || voucher.userId === 'public';
  
  if (isPublicVoucher) {
    // For public vouchers, add user to usedByUserIds and increment usage count
    if (!voucher.usedByUserIds) {
      voucher.usedByUserIds = [];
    }
    if (!voucher.usedByUserIds.includes(userId)) {
      voucher.usedByUserIds.push(userId);
    }
    
    voucher.usageCount = (voucher.usageCount || 0) + 1;
    
    // Check if max usage reached
    if (voucher.maxUsage && voucher.usageCount >= voucher.maxUsage) {
      voucher.status = 'expired';
    }
    
    console.log(`✅ Public voucher ${voucher.code} used by ${userId} (${voucher.usageCount}/${voucher.maxUsage || '∞'})`);
  } else {
    // For personal vouchers, mark as used
    voucher.status = 'used';
    voucher.usedAt = new Date().toISOString();
    voucher.usedInOrderId = orderId;
    
    console.log(`✅ Personal voucher ${voucher.code} marked as used in order ${orderId}`);
  }
  
  await kv.set(`voucher:${voucherId}`, JSON.stringify(voucher));
  
  console.log(`✅ Voucher ${voucher.code} marked as ${voucher.status}`);
}

/**
 * Create a new voucher (admin)
 */
export async function createVoucher(voucher: Voucher): Promise<void> {
  await kv.set(`voucher:${voucher.id}`, JSON.stringify(voucher));
  await kv.set(`voucher_code:${voucher.code}`, voucher.id);
  console.log(`✅ Created voucher: ${voucher.code} for ${voucher.userEmail}`);
}

/**
 * Get all vouchers (for admin)
 */
export async function getAllVouchers(): Promise<Voucher[]> {
  try {
    const values = await kv.getByPrefix('voucher:');
    const vouchers: Voucher[] = [];
    
    for (const value of values) {
      // Skip if value is a plain string (from voucher_code mappings)
      if (typeof value === 'string' && !value.startsWith('{')) {
        continue;
      }
      
      try {
        const voucher = typeof value === 'string' ? JSON.parse(value) : value;
        // Additional check: ensure it's a valid voucher object with required fields
        if (voucher && voucher.id && voucher.code) {
          vouchers.push(voucher);
        }
      } catch (e) {
        console.error('Error parsing voucher:', e);
      }
    }
    
    return vouchers;
  } catch (error) {
    console.error('Error getting all vouchers:', error);
    return [];
  }
}

/**
 * Revert voucher usage (when order is cancelled)
 */
export async function revertVoucherUsage(voucherId: string): Promise<void> {
  const voucher = await getVoucherById(voucherId);
  if (!voucher) {
    throw new Error('Voucher not found');
  }
  
  const isPublicVoucher = voucher.userId === null || voucher.userId === 'public';
  
  if (isPublicVoucher) {
    // For public vouchers, decrement usage count
    voucher.usageCount = Math.max(0, (voucher.usageCount || 0) - 1);
    
    // If was expired due to max usage, reactivate
    if (voucher.status === 'expired' && voucher.maxUsage && voucher.usageCount < voucher.maxUsage) {
      voucher.status = 'active';
    }
  } else {
    // For personal vouchers, revert to active
    voucher.status = 'active';
    delete voucher.usedAt;
    delete voucher.usedInOrderId;
  }
  
  await kv.set(`voucher:${voucherId}`, JSON.stringify(voucher));
  
  console.log(`🔄 Personal voucher reverted or public voucher ${voucher.code} usage adjusted`);
}

/**
 * Get voucher statistics
 */
export async function getVoucherStats(): Promise<{
  total: number;
  active: number;
  used: number;
  expired: number;
}> {
  try {
    const allVouchers = await getAllVouchers();
    
    // For "used" count, we need to count:
    // 1. Personal vouchers with status 'used' (each counts as 1 usage)
    // 2. Public vouchers' total usageCount (can be used multiple times)
    let totalUsed = 0;
    
    allVouchers.forEach(voucher => {
      const isPublicVoucher = voucher.userId === null || voucher.userId === 'public';
      
      if (isPublicVoucher) {
        // For public vouchers, add their usage count
        totalUsed += voucher.usageCount || 0;
      } else {
        // For personal vouchers, count if status is 'used'
        if (voucher.status === 'used') {
          totalUsed += 1;
        }
      }
    });
    
    const stats = {
      total: allVouchers.length,
      active: allVouchers.filter(v => v.status === 'active').length,
      used: totalUsed,
      expired: allVouchers.filter(v => v.status === 'expired').length,
    };
    
    console.log(`📊 Voucher stats: Total=${stats.total}, Active=${stats.active}, Used=${stats.used}, Expired=${stats.expired}`);
    
    return stats;
  } catch (error) {
    console.error('Error getting voucher stats:', error);
    return { total: 0, active: 0, used: 0, expired: 0 };
  }
}

/**
 * Seed public vouchers (called on server startup)
 */
export async function seedPublicVouchers(): Promise<void> {
  const publicVouchers = [
    {
      id: 'voucher-public-welcome10',
      code: 'WELCOME10',
      discountType: 'percentage' as const,
      discountValue: 10,
      minPurchase: 100000,
      maxDiscount: 50000,
      maxUsage: 1000,
      usageCount: 0,
      status: 'active' as const,
      userId: 'public',
      userEmail: 'public@system',
      usedByUserIds: [],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'voucher-public-hemat20',
      code: 'HEMAT20',
      discountType: 'percentage' as const,
      discountValue: 20,
      minPurchase: 200000,
      maxDiscount: 100000,
      maxUsage: 1000,
      usageCount: 0,
      status: 'active' as const,
      userId: 'public',
      userEmail: 'public@system',
      usedByUserIds: [],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'voucher-public-gratis30',
      code: 'GRATIS30',
      discountType: 'percentage' as const,
      discountValue: 30,
      minPurchase: 500000,
      maxDiscount: 200000,
      maxUsage: 1000,
      usageCount: 0,
      status: 'active' as const,
      userId: 'public',
      userEmail: 'public@system',
      usedByUserIds: [],
      createdAt: new Date().toISOString(),
    },
  ];
  
  for (const voucher of publicVouchers) {
    const existing = await getVoucherById(voucher.id);
    if (!existing) {
      await createVoucher(voucher);
      console.log(`✅ Seeded public voucher: ${voucher.code}`);
    }
  }
}