import * as kv from './kv_store.tsx';

/**
 * REFUND STORE - Manage refunds and returns
 * 
 * Data Structure:
 * - refund:{refundId} = Refund object
 * - refunds:user:{userId} = Array of refund IDs (untuk query by user)
 * - refunds:order:{orderId} = Refund ID (untuk query by order)
 * 
 * CRITICAL RULES:
 * - All files stored in Supabase Storage
 * - All data stored in KV Database
 * - Real-time sync via Supabase Realtime
 * - NO localStorage usage
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

// ✅ Initialize Supabase client for Storage
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface RefundEvidence {
  id: string;
  type: 'image' | 'video';
  url: string; // URL from Supabase Storage
  fileName: string;
  fileSize: number;
  uploadedAt: string;
}

export interface RefundShipping {
  courier: string;
  trackingNumber: string;
  shippedAt: string;
  receivedAt?: string;
  status: 'pending' | 'shipped' | 'received';
}

export interface Refund {
  id: string;
  orderId: string;
  userId: string;
  userName: string;
  userEmail: string;
  
  // Refund Type
  type: 'user_request' | 'admin_cancel'; // User-initiated or Auto refund
  
  // Refund Details
  reason: string;
  description: string;
  amount: number; // Total amount to refund
  
  // Evidence (for user_request type)
  evidence?: RefundEvidence[];
  
  // Status Flow
  status: 'pending' | 'approved' | 'rejected' | 'shipping' | 'received' | 'refunded' | 'completed';
  
  // Return Shipping (for user_request type)
  returnShipping?: RefundShipping;
  
  // Admin Actions
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  adminNote?: string;
  
  // Refund Processing
  refundedAt?: string;
  refundMethod?: string; // Bank transfer, e-wallet, etc.
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  
  // Status History
  statusHistory: Array<{
    status: string;
    note: string;
    timestamp: string;
    updatedBy?: string;
    updatedByName?: string;
  }>;
}

/**
 * Create a new refund
 */
export async function createRefund(refundData: Omit<Refund, 'id' | 'createdAt' | 'updatedAt' | 'statusHistory'>): Promise<{ success: boolean; refund?: Refund; error?: string }> {
  try {
    const refundId = `REF-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    const refund: Refund = {
      ...refundData,
      id: refundId,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      statusHistory: [{
        status: 'pending',
        note: refundData.type === 'user_request' 
          ? 'Refund diajukan oleh user, menunggu investigasi admin'
          : 'Refund otomatis dibuat karena pesanan dibatalkan admin',
        timestamp: new Date().toISOString(),
      }],
    };
    
    // Save refund
    await kv.set(`refund:${refundId}`, refund);
    
    // Index by user
    const userRefunds = await kv.get(`refunds:user:${refundData.userId}`) || [];
    userRefunds.push(refundId);
    await kv.set(`refunds:user:${refundData.userId}`, userRefunds);
    
    // Index by order (one-to-one)
    await kv.set(`refunds:order:${refundData.orderId}`, refundId);
    
    console.log(`✅ Refund created: ${refundId} for order ${refundData.orderId}`);
    
    return { success: true, refund };
  } catch (error: any) {
    console.error('❌ Create refund error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get refund by ID
 */
export async function getRefund(refundId: string): Promise<Refund | null> {
  try {
    const refund = await kv.get(`refund:${refundId}`);
    return refund;
  } catch (error: any) {
    console.error('❌ Get refund error:', error);
    return null;
  }
}

/**
 * Get refund by order ID
 */
export async function getRefundByOrderId(orderId: string): Promise<Refund | null> {
  try {
    const refundId = await kv.get(`refunds:order:${orderId}`);
    if (!refundId) return null;
    
    return await getRefund(refundId);
  } catch (error: any) {
    console.error('❌ Get refund by order error:', error);
    return null;
  }
}

/**
 * Get all refunds for a user
 */
export async function getUserRefunds(userId: string): Promise<Refund[]> {
  try {
    const refundIds = await kv.get(`refunds:user:${userId}`) || [];
    const refunds = await Promise.all(
      refundIds.map((id: string) => getRefund(id))
    );
    const validRefunds = refunds.filter((r): r is Refund => r !== null);
    
    // ✅ FIX: Generate signed URLs for evidence images
    const refundsWithSignedUrls = await Promise.all(
      validRefunds.map(refund => generateSignedUrlsForEvidence(refund))
    );
    
    return refundsWithSignedUrls;
  } catch (error: any) {
    console.error('❌ Get user refunds error:', error);
    return [];
  }
}

/**
 * Helper: Generate signed URLs for refund evidence images
 */
async function generateSignedUrlsForEvidence(refund: Refund): Promise<Refund> {
  try {
    // If no evidence, return as is
    if (!refund.evidence || refund.evidence.length === 0) {
      return refund;
    }
    
    console.log(`🔐 [RefundStore] Generating signed URLs for refund ${refund.id} evidence...`);
    
    // Generate signed URLs for each evidence
    const evidenceWithSignedUrls = await Promise.all(
      refund.evidence.map(async (evidence) => {
        try {
          // Extract file path from URL
          // URL format: https://{project}.supabase.co/storage/v1/object/sign/make-adb995ba-refund-evidence/{path}?token=...
          // We need to extract just the path part
          let filePath = evidence.url;
          
          // ✅ FIX: Extract path from signed URL or public URL
          if (filePath.includes('supabase.co/storage')) {
            // Pattern: /object/sign/{bucket}/{path}?token= or /object/public/{bucket}/{path}
            const signMatch = filePath.match(/\/object\/(sign|public)\/make-adb995ba-refund-evidence\/(.+?)(\?|$)/);
            if (signMatch && signMatch[2]) {
              filePath = decodeURIComponent(signMatch[2]); // ✅ Decode URL-encoded path
              console.log(`   📝 Extracted path from URL: ${filePath}`);
            } else {
              console.error(`   ❌ Could not extract path from URL: ${filePath}`);
              return evidence; // Return original if can't parse
            }
          } else if (filePath.startsWith('make-adb995ba-refund-evidence/')) {
            // Remove bucket name if already a path
            filePath = filePath.replace('make-adb995ba-refund-evidence/', '');
          }
          
          console.log(`   📸 Generating signed URL for: ${filePath}`);
          
          // Generate signed URL (valid for 1 hour)
          const { data, error } = await supabase.storage
            .from('make-adb995ba-refund-evidence') // ✅ FIX: Correct bucket name
            .createSignedUrl(filePath, 3600); // 1 hour expiry
          
          if (error) {
            console.error(`   ❌ Error generating signed URL for ${filePath}:`, error.message);
            return evidence; // Return original if fails
          }
          
          if (!data?.signedUrl) {
            console.error(`   ❌ No signed URL returned for ${filePath}`);
            return evidence;
          }
          
          console.log(`   ✅ Signed URL generated: ${data.signedUrl.substring(0, 80)}...`);
          
          return {
            ...evidence,
            url: data.signedUrl, // ✅ Replace with signed URL
          };
        } catch (err: any) {
          console.error(`   ❌ Exception generating signed URL:`, err.message);
          return evidence; // Return original if error
        }
      })
    );
    
    return {
      ...refund,
      evidence: evidenceWithSignedUrls,
    };
  } catch (error: any) {
    console.error('❌ Error in generateSignedUrlsForEvidence:', error.message);
    return refund; // Return original if error
  }
}

/**
 * Get all refunds (Admin only)
 */
export async function getAllRefunds(): Promise<Refund[]> {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 [RefundStore.getAllRefunds] START');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // ✅ CRITICAL FIX: Get only actual refund objects, not index entries
    // Pattern: refund:{id} (without any colons after "refund:")
    // This excludes: refunds:user:{userId} and refunds:order:{orderId}
    
    // First, get ALL keys with prefix "refund"
    console.log('📦 Fetching all keys with prefix "refund"...');
    const allData = await kv.getByPrefix('refund');
    console.log(`📦 Raw data count from KV: ${allData?.length || 0}`);
    
    if (allData && allData.length > 0) {
      console.log('📦 Sample raw data (first 3):');
      allData.slice(0, 3).forEach((item, index) => {
        if (item && typeof item === 'object') {
          console.log(`   [${index}] Keys: ${Object.keys(item).join(', ')}`);
          console.log(`   [${index}] Has id? ${!!item.id}, Has orderId? ${!!item.orderId}`);
        } else {
          console.log(`   [${index}] Type: ${typeof item}, Value: ${JSON.stringify(item).substring(0, 100)}`);
        }
      });
    }
    
    // Filter to only include actual refund objects
    // Refund objects MUST have: id, orderId, userId, status, createdAt
    const refunds: Refund[] = allData.filter((item: any) => {
      // Must be an object
      if (!item || typeof item !== 'object') {
        return false;
      }
      
      // Must NOT be an array (excludes refunds:user:{userId} which stores array)
      if (Array.isArray(item)) {
        return false;
      }
      
      // Must have ALL required refund fields
      const hasAllFields = 
        typeof item.id === 'string' && 
        item.id.startsWith('REF-') && // Refund IDs start with REF-
        typeof item.orderId === 'string' && 
        typeof item.userId === 'string' &&
        typeof item.status === 'string' &&
        typeof item.createdAt === 'string';
      
      if (hasAllFields) {
        console.log(`✅ Valid refund found: ${item.id} (status: ${item.status})`);
      }
      
      return hasAllFields;
    });
    
    console.log(`✅ Filtered refunds count: ${refunds.length}`);
    
    if (refunds.length > 0) {
      console.log('📋 Refund IDs:', refunds.map(r => `${r.id} (${r.status})`));
    } else {
      console.log('⚠️ No refunds found after filtering!');
      console.log('💡 Debugging - All raw data:');
      allData.forEach((item, index) => {
        if (Array.isArray(item)) {
          console.log(`   [${index}] ARRAY with ${item.length} items: ${JSON.stringify(item).substring(0, 100)}`);
        } else if (item && typeof item === 'object') {
          console.log(`   [${index}] OBJECT keys: ${Object.keys(item).join(', ')}`);
        } else {
          console.log(`   [${index}] ${typeof item}: ${JSON.stringify(item).substring(0, 100)}`);
        }
      });
    }
    
    // Sort by createdAt descending
    refunds.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    // ✅ FIX: Generate signed URLs for evidence images
    console.log('🔐 [RefundStore] Generating signed URLs for all refund evidence...');
    const refundsWithSignedUrls = await Promise.all(
      refunds.map(refund => generateSignedUrlsForEvidence(refund))
    );
    console.log(`✅ [RefundStore] Signed URLs generated for ${refundsWithSignedUrls.length} refunds`);
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ [RefundStore.getAllRefunds] DONE - Returning ${refundsWithSignedUrls.length} refunds`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    return refundsWithSignedUrls;
  } catch (error: any) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━��━');
    console.error('❌ [RefundStore.getAllRefunds] ERROR');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('Error details:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    return [];
  }
}

/**
 * Update refund status
 */
export async function updateRefundStatus(
  refundId: string,
  newStatus: Refund['status'],
  note: string,
  updatedBy?: string,
  updatedByName?: string,
  additionalData?: Partial<Refund>
): Promise<{ success: boolean; refund?: Refund; error?: string }> {
  try {
    const refund = await getRefund(refundId);
    if (!refund) {
      return { success: false, error: 'Refund tidak ditemukan' };
    }
    
    // Update refund
    const updatedRefund: Refund = {
      ...refund,
      ...additionalData,
      status: newStatus,
      updatedAt: new Date().toISOString(),
      statusHistory: [
        ...refund.statusHistory,
        {
          status: newStatus,
          note,
          timestamp: new Date().toISOString(),
          updatedBy,
          updatedByName,
        },
      ],
    };
    
    // Save
    await kv.set(`refund:${refundId}`, updatedRefund);
    
    console.log(`✅ Refund ${refundId} status updated to: ${newStatus}`);
    
    return { success: true, refund: updatedRefund };
  } catch (error: any) {
    console.error('❌ Update refund status error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Add evidence to refund
 */
export async function addRefundEvidence(
  refundId: string,
  evidence: RefundEvidence
): Promise<{ success: boolean; error?: string }> {
  try {
    const refund = await getRefund(refundId);
    if (!refund) {
      return { success: false, error: 'Refund tidak ditemukan' };
    }
    
    refund.evidence = refund.evidence || [];
    refund.evidence.push(evidence);
    refund.updatedAt = new Date().toISOString();
    
    await kv.set(`refund:${refundId}`, refund);
    
    console.log(`✅ Evidence added to refund ${refundId}`);
    
    return { success: true };
  } catch (error: any) {
    console.error('❌ Add refund evidence error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update return shipping info
 */
export async function updateReturnShipping(
  refundId: string,
  shippingData: RefundShipping
): Promise<{ success: boolean; error?: string }> {
  try {
    const refund = await getRefund(refundId);
    if (!refund) {
      return { success: false, error: 'Refund tidak ditemukan' };
    }
    
    refund.returnShipping = shippingData;
    refund.updatedAt = new Date().toISOString();
    
    await kv.set(`refund:${refundId}`, refund);
    
    console.log(`✅ Return shipping updated for refund ${refundId}`);
    
    return { success: true };
  } catch (error: any) {
    console.error('❌ Update return shipping error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get refund statistics (for admin dashboard)
 */
export async function getRefundStats(): Promise<{
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  completed: number;
  totalAmount: number;
}> {
  try {
    const refunds = await getAllRefunds();
    
    return {
      total: refunds.length,
      pending: refunds.filter(r => r.status === 'pending').length,
      approved: refunds.filter(r => r.status === 'approved' || r.status === 'shipping').length,
      rejected: refunds.filter(r => r.status === 'rejected').length,
      completed: refunds.filter(r => r.status === 'completed' || r.status === 'refunded').length,
      totalAmount: refunds.reduce((sum, r) => sum + r.amount, 0),
    };
  } catch (error: any) {
    console.error('❌ Get refund stats error:', error);
    return {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      completed: 0,
      totalAmount: 0,
    };
  }
}