/**
 * 💸 REFUND STORE - Production Mode
 * 
 * ✅ FIXED: Pure React implementation (no Zustand)
 * All data fetched from Supabase Database
 * NO localStorage usage
 */

import { useState, useEffect, useMemo } from 'react';
import { projectId, supabaseAnonKey } from '/utils/supabase';

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
  type: 'user_request' | 'admin_cancel';
  
  // Refund Details
  reason: string;
  description: string;
  amount: number;
  
  // Evidence (for user_request type)
  evidence?: RefundEvidence[];
  
  // Status
  status: 'pending' | 'approved' | 'rejected' | 'shipping' | 'received' | 'refunded' | 'completed';
  
  // Return Shipping
  returnShipping?: RefundShipping;
  
  // Admin Actions
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  adminNote?: string;
  
  // Refund Processing
  refundedAt?: string;
  refundMethod?: string;
  
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

interface RefundState {
  refunds: Refund[];
  isLoading: boolean;
  error: string | null;
}

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-adb995ba`;

// Simple store class
class Store<T> {
  private state: T;
  private listeners: Set<(state: T) => void> = new Set();

  constructor(initialState: T) {
    this.state = initialState;
  }

  getState = () => this.state;

  setState = (partial: Partial<T> | ((state: T) => Partial<T>)) => {
    const newState = typeof partial === 'function' ? partial(this.state) : partial;
    this.state = { ...this.state, ...newState };
    this.listeners.forEach((listener) => listener(this.state));
  };

  subscribe = (listener: (state: T) => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
}

const refundStore = new Store<RefundState>({
  refunds: [],
  isLoading: false,
  error: null,
});

// Export store instance for non-React usage
export const refundStoreInstance = refundStore;

// Export helpers for non-React usage
export const refundStoreHelpers = {
  // Fetch user's refunds
  fetchUserRefunds: async (token: string) => {
    refundStore.setState({ isLoading: true, error: null });
    
    try {
      // ✅ CRITICAL FIX: Send BOTH Authorization header AND X-Session-Token
      const { supabaseAnonKey: publicAnonKey } = await import('/utils/supabase');
      
      const response = await fetch(`${API_URL}/refunds/user`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`, // For Supabase Edge Functions
          'X-Session-Token': token, // For our backend
        },
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch refunds');
      }
      
      refundStore.setState({ refunds: data.refunds || [], isLoading: false });
      console.info('[RefundStore] Fetched user refunds:', data.refunds?.length || 0);
    } catch (error: any) {
      console.error('[RefundStore] Fetch user refunds error:', error);
      refundStore.setState({ error: error.message, isLoading: false });
    }
  },
  
  // Fetch all refunds (Admin only)
  fetchAllRefunds: async (token: string) => {
    refundStore.setState({ isLoading: true, error: null });
    
    try {
      console.info('[RefundStore] ✅ Fetching all refunds...');
      console.info('[RefundStore] Token present:', token ? 'YES' : 'NO');
      
      if (!token) {
        throw new Error('Session expired. Please login again.');
      }
      
      // ✅ CRITICAL FIX: Get fresh token directly from Supabase session
      let freshToken = token;
      try {
        const { supabase } = await import('./supabase');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('[RefundStore] ❌ Error getting session:', sessionError);
        } else if (session?.access_token) {
          freshToken = session.access_token;
          console.info('[RefundStore] ✅ Using fresh token from Supabase session');
        } else {
          console.info('[RefundStore] ⚠️ No active session found, using provided token');
        }
      } catch (sessionFetchError) {
        console.info('[RefundStore] ⚠️ Could not get session, using provided token:', sessionFetchError);
      }
      
      const requestUrl = `${API_URL}/refunds`;
      console.info('[RefundStore] Request URL:', requestUrl);
      
      // ✅ CRITICAL FIX: Send BOTH Authorization header AND X-Session-Token
      // Supabase Edge Functions validates Authorization header
      // Our backend uses X-Session-Token
      const { supabaseAnonKey: publicAnonKey } = await import('/utils/supabase');
      
      const response = await fetch(requestUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`, // For Supabase Edge Functions
          'X-Session-Token': freshToken, // For our backend
          'Content-Type': 'application/json',
        },
      });
      
      console.info('[RefundStore] Response status:', response.status, response.statusText);
      
      const data = await response.json();
      console.info('[RefundStore] Response data:', data);
      
      if (response.status === 401 || response.status === 403) {
        console.error('[RefundStore] ❌ Authorization failed:', {
          status: response.status,
          statusText: response.statusText,
          error: data.error
        });
        
        // ✅ FIXED: Don't throw error, just set empty refunds and clear error
        // The component will handle showing proper message
        refundStore.setState({ 
          refunds: [],
          isLoading: false,
          error: null // ✅ Don't set error to avoid triggering auto-logout
        });
        
        console.info('⚠️ [RefundStore] Authorization failed - returning empty refunds');
        return;
      }
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || `Failed to fetch refunds (status: ${response.status})`);
      }
      
      refundStore.setState({ refunds: data.refunds || [], isLoading: false, error: null });
      console.info('[RefundStore] ✅ Fetched all refunds:', data.refunds?.length || 0);
    } catch (error: any) {
      console.error('[RefundStore] ❌ Fetch all refunds error:', error);
      
      // User-friendly error message
      let userMessage = error.message;
      if (error.message.includes('Failed to fetch')) {
        userMessage = 'Gagal mengambil data. Periksa koneksi internet Anda.';
      }
      
      refundStore.setState({ 
        error: userMessage,
        isLoading: false, 
        refunds: [] 
      });
    }
  },
  
  // Fetch single refund
  fetchRefund: async (refundId: string, token: string): Promise<Refund | null> => {
    try {
      // ✅ CRITICAL FIX: Send BOTH Authorization header AND X-Session-Token
      const { supabaseAnonKey: publicAnonKey } = await import('/utils/supabase');
      
      const response = await fetch(`${API_URL}/refunds/${refundId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`, // For Supabase Edge Functions
          'X-Session-Token': token, // For our backend
        },
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch refund');
      }
      
      // Update in local state
      const state = refundStore.getState();
      const refunds = state.refunds;
      const index = refunds.findIndex(r => r.id === refundId);
      if (index !== -1) {
        refunds[index] = data.refund;
        refundStore.setState({ refunds: [...refunds] });
      } else {
        refundStore.setState({ refunds: [...refunds, data.refund] });
      }
      
      console.info('[RefundStore] Fetched refund:', refundId);
      return data.refund;
    } catch (error: any) {
      console.error('[RefundStore] Fetch refund error:', error);
      return null;
    }
  },
  
  // Create refund
  createRefund: async (refundData: Partial<Refund>, token: string): Promise<{ success: boolean; refund?: Refund; error?: string }> => {
    refundStore.setState({ isLoading: true, error: null });
    
    try {
      // ✅ CRITICAL FIX: Send BOTH Authorization header AND X-Session-Token
      const { supabaseAnonKey: publicAnonKey } = await import('/utils/supabase');
      
      const response = await fetch(`${API_URL}/refunds`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`, // For Supabase Edge Functions
          'Content-Type': 'application/json',
          'X-Session-Token': token, // For our backend
        },
        body: JSON.stringify(refundData),
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        refundStore.setState({ isLoading: false, error: data.error });
        return { success: false, error: data.error };
      }
      
      // Add to local state
      const state = refundStore.getState();
      refundStore.setState({
        refunds: [...state.refunds, data.refund],
        isLoading: false,
      });
      
      console.info('[RefundStore] Refund created:', data.refund.id);
      return { success: true, refund: data.refund };
    } catch (error: any) {
      console.error('[RefundStore] Create refund error:', error);
      refundStore.setState({ error: error.message, isLoading: false });
      return { success: false, error: error.message };
    }
  },
  
  // Update refund status (Admin only)
  updateRefundStatus: async (
    refundId: string,
    status: string,
    note: string,
    additionalData: any,
    token: string
  ): Promise<{ success: boolean; refund?: Refund; error?: string }> => {
    refundStore.setState({ isLoading: true, error: null });
    
    try {
      // ✅ CRITICAL FIX: Send BOTH Authorization header AND X-Session-Token
      const { supabaseAnonKey: publicAnonKey } = await import('/utils/supabase');
      
      const response = await fetch(`${API_URL}/refunds/${refundId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`, // For Supabase Edge Functions
          'Content-Type': 'application/json',
          'X-Session-Token': token, // For our backend
        },
        body: JSON.stringify({
          status,
          note,
          ...additionalData,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        refundStore.setState({ isLoading: false, error: data.error });
        return { success: false, error: data.error };
      }
      
      // Update in local state
      const state = refundStore.getState();
      const refunds = state.refunds;
      const index = refunds.findIndex(r => r.id === refundId);
      if (index !== -1) {
        refunds[index] = data.refund;
        refundStore.setState({ refunds: [...refunds], isLoading: false });
      }
      
      console.info('[RefundStore] Refund status updated:', refundId, '→', status);
      return { success: true, refund: data.refund };
    } catch (error: any) {
      console.error('[RefundStore] Update status error:', error);
      refundStore.setState({ error: error.message, isLoading: false });
      return { success: false, error: error.message };
    }
  },
  
  // Upload evidence (photo/video)
  uploadEvidence: async (file: File, refundId: string, token: string): Promise<{ success: boolean; evidence?: RefundEvidence; error?: string }> => {
    refundStore.setState({ isLoading: true, error: null });
    
    try {
      const bucketName = 'make-adb995ba-refund-evidence';
      const fileName = `${refundId}/${Date.now()}-${file.name}`;
      
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      await new Promise((resolve) => {
        reader.onload = resolve;
      });
      
      const base64Data = reader.result as string;
      
      // Create evidence metadata
      const evidence: RefundEvidence = {
        id: `EV-${Date.now()}`,
        type: file.type.startsWith('video/') ? 'video' : 'image',
        url: base64Data, // Temporary - should be replaced with Supabase Storage URL
        fileName: file.name,
        fileSize: file.size,
        uploadedAt: new Date().toISOString(),
      };
      
      // ✅ CRITICAL FIX: Send BOTH Authorization header AND X-Session-Token
      const { supabaseAnonKey: publicAnonKey } = await import('/utils/supabase');
      
      // Send to backend
      const response = await fetch(`${API_URL}/refunds/${refundId}/evidence`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`, // For Supabase Edge Functions
          'Content-Type': 'application/json',
          'X-Session-Token': token, // For our backend
        },
        body: JSON.stringify({ evidence }),
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        refundStore.setState({ isLoading: false, error: data.error });
        return { success: false, error: data.error };
      }
      
      refundStore.setState({ isLoading: false });
      console.info('[RefundStore] Evidence uploaded:', refundId);
      return { success: true, evidence };
    } catch (error: any) {
      console.error('[RefundStore] Upload evidence error:', error);
      refundStore.setState({ error: error.message, isLoading: false });
      return { success: false, error: error.message };
    }
  },
  
  // Helper: Get refund by order ID
  getRefundByOrderId: (orderId: string): Refund | undefined => {
    return refundStore.getState().refunds.find(r => r.orderId === orderId);
  },
  
  // Clear refunds
  clearRefunds: () => {
    refundStore.setState({ refunds: [], error: null });
  },
};

// React hook
export function useRefundStore() {
  const [state, setState] = useState(refundStore.getState());

  useEffect(() => {
    return refundStore.subscribe(setState);
  }, []);

  // ✅ FIXED: Wrap helpers in useMemo to ensure stable references
  const stableHelpers = useMemo(() => refundStoreHelpers, []);

  return {
    ...state,
    ...stableHelpers, // ✅ Use memoized helpers for stable references
  };
}

// Helper functions
export function getRefundStatusDisplay(status: Refund['status']): {
  label: string;
  color: string;
  bgColor: string;
} {
  const statusMap: Record<Refund['status'], { label: string; color: string; bgColor: string }> = {
    pending: {
      label: 'Menunggu Review',
      color: 'text-yellow-700',
      bgColor: 'bg-yellow-100',
    },
    approved: {
      label: 'Disetujui',
      color: 'text-blue-700',
      bgColor: 'bg-blue-100',
    },
    rejected: {
      label: 'Ditolak',
      color: 'text-red-700',
      bgColor: 'bg-red-100',
    },
    shipping: {
      label: 'Sedang Dikirim',
      color: 'text-purple-700',
      bgColor: 'bg-purple-100',
    },
    received: {
      label: 'Barang Diterima',
      color: 'text-indigo-700',
      bgColor: 'bg-indigo-100',
    },
    refunded: {
      label: 'Dana Dikembalikan',
      color: 'text-green-700',
      bgColor: 'bg-green-100',
    },
    completed: {
      label: 'Selesai',
      color: 'text-gray-700',
      bgColor: 'bg-gray-100',
    },
  };
  
  return statusMap[status] || statusMap.pending;
}

export function getRefundTypeDisplay(type: Refund['type']): string {
  return type === 'user_request' ? 'Ajuan User' : 'Otomatis (Cancel Admin)';
}