/**
 * REFUND TYPES - Frontend TypeScript Definitions
 * 
 * Matches backend refund_store.tsx structure
 * All data from Supabase Database
 * Real-time sync via Supabase Realtime
 */

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
 * Helper function to get status display info
 */
export function getRefundStatusInfo(status: Refund['status']): {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
} {
  switch (status) {
    case 'pending':
      return {
        label: 'Menunggu Investigasi',
        color: 'text-yellow-700',
        bgColor: 'bg-yellow-100',
        icon: 'Clock',
      };
    case 'approved':
      return {
        label: 'Disetujui',
        color: 'text-green-700',
        bgColor: 'bg-green-100',
        icon: 'CheckCircle',
      };
    case 'rejected':
      return {
        label: 'Ditolak',
        color: 'text-red-700',
        bgColor: 'bg-red-100',
        icon: 'XCircle',
      };
    case 'shipping':
      return {
        label: 'Dalam Pengiriman',
        color: 'text-blue-700',
        bgColor: 'bg-blue-100',
        icon: 'Truck',
      };
    case 'received':
      return {
        label: 'Barang Diterima',
        color: 'text-purple-700',
        bgColor: 'bg-purple-100',
        icon: 'Package',
      };
    case 'refunded':
      return {
        label: 'Dana Dikembalikan',
        color: 'text-green-700',
        bgColor: 'bg-green-100',
        icon: 'DollarSign',
      };
    case 'completed':
      return {
        label: 'Selesai',
        color: 'text-gray-700',
        bgColor: 'bg-gray-100',
        icon: 'Check',
      };
    default:
      return {
        label: 'Unknown',
        color: 'text-gray-700',
        bgColor: 'bg-gray-100',
        icon: 'AlertCircle',
      };
  }
}

/**
 * Helper function to get refund type label
 */
export function getRefundTypeLabel(type: Refund['type']): string {
  return type === 'user_request' ? 'Diajukan User' : 'Refund Otomatis (Admin Batalkan)';
}

/**
 * Refund reason options
 */
export const REFUND_REASONS = [
  'Barang rusak/cacat',
  'Barang tidak sesuai deskripsi',
  'Salah ukuran/varian',
  'Tidak sesuai ekspektasi',
  'Barang palsu/KW',
  'Pengiriman terlalu lama',
  'Berubah pikiran',
  'Lainnya',
];

/**
 * Admin cancel reasons
 */
export const ADMIN_CANCEL_REASONS = [
  'Stok tidak tersedia',
  'Harga salah/sistem error',
  'Alamat pengiriman bermasalah',
  'Permintaan pembeli',
  'Pesanan mencurigakan',
  'Lainnya',
];
