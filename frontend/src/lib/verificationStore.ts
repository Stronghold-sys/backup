/**
 * 🔐 VERIFICATION STORE - Production Mode
 * 
 * ✅ FIXED: Pure React implementation (no Zustand)
 * In-memory store for verification/reset flow data
 * NO sessionStorage usage - all data in memory only
 * 
 * This replaces sessionStorage for:
 * - Email verification flow
 * - Password reset flow
 */

import { useState, useEffect, useMemo } from 'react';

interface VerificationData {
  email: string;
  name: string;
  voucherCode?: string;
  verificationId?: string;
  returnTo?: string | null;
  timestamp: number;
}

interface ResetData {
  email: string;
  resetId?: string;
  timestamp: number;
}

interface VerificationState {
  verificationData: VerificationData | null;
  resetData: ResetData | null;
}

const EXPIRY_TIME = 15 * 60 * 1000; // 15 minutes

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

const verificationStore = new Store<VerificationState>({
  verificationData: null,
  resetData: null,
});

// Export store instance for non-React usage
export const verificationStoreInstance = verificationStore;

// Export helpers for non-React usage
export const verificationStoreHelpers = {
  setVerificationData: (data: VerificationData | null) => {
    console.info('✅ [VerificationStore] Storing verification data:', {
      email: data?.email,
      hasVoucher: !!data?.voucherCode,
      timestamp: data?.timestamp,
    });
    verificationStore.setState({ verificationData: data });
  },

  clearVerificationData: () => {
    console.info('🗑️ [VerificationStore] Clearing verification data');
    verificationStore.setState({ verificationData: null });
  },

  isVerificationValid: (): boolean => {
    const { verificationData } = verificationStore.getState();
    if (!verificationData) return false;
    
    const age = Date.now() - verificationData.timestamp;
    const isValid = age < EXPIRY_TIME;
    
    if (!isValid) {
      console.info('⏰ [VerificationStore] Verification data expired');
      verificationStoreHelpers.clearVerificationData();
    }
    
    return isValid;
  },

  setResetData: (data: ResetData | null) => {
    console.info('✅ [VerificationStore] Storing reset data:', {
      email: data?.email,
      timestamp: data?.timestamp,
    });
    verificationStore.setState({ resetData: data });
  },

  clearResetData: () => {
    console.info('🗑️ [VerificationStore] Clearing reset data');
    verificationStore.setState({ resetData: null });
  },

  isResetValid: (): boolean => {
    const { resetData } = verificationStore.getState();
    if (!resetData) return false;
    
    const age = Date.now() - resetData.timestamp;
    const isValid = age < EXPIRY_TIME;
    
    if (!isValid) {
      console.info('⏰ [VerificationStore] Reset data expired');
      verificationStoreHelpers.clearResetData();
    }
    
    return isValid;
  },
};

// React hook
export function useVerificationStore() {
  const [state, setState] = useState(verificationStore.getState());

  useEffect(() => {
    return verificationStore.subscribe(setState);
  }, []);

  // ✅ FIXED: Wrap helpers in useMemo to ensure stable references
  const stableHelpers = useMemo(() => verificationStoreHelpers, []);

  return {
    ...state,
    ...stableHelpers, // ✅ Use memoized helpers for stable references
  };
}