// ✅ FIXED: Replaced Zustand with pure React implementation
import { useState, useEffect, useMemo } from 'react';
import { Notification } from './notificationStore'; // ✅ Import from notificationStore

export type PaymentMethod = 'QRIS' | 'GoPay' | 'OVO' | 'DANA' | 'BCA_VA' | 'BRI_VA' | 'Mandiri_VA' | 'BNI_VA' | 'Credit_Card' | 'COD' | 'Gopay' | 'ShopeePay' | 'LinkAja';

export type PaymentStatus = 'pending' | 'waiting_payment' | 'paid' | 'failed' | 'expired' | 'cod_pending';

export interface PaymentInfo {
  orderId: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  qrCode?: string;
  virtualAccount?: string;
  expiryTime?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ✅ Payment Method Configuration
export interface PaymentMethodConfig {
  id: PaymentMethod;
  name: string;
  type: 'qris' | 'ewallet' | 'bank_transfer' | 'card' | 'cod';
  description: string;
  available: boolean;
  fee?: number;
}

export const PAYMENT_METHODS: PaymentMethodConfig[] = [
  // QRIS
  {
    id: 'QRIS',
    name: 'QRIS',
    type: 'qris',
    description: 'Scan QR untuk bayar - Semua e-wallet & m-banking',
    available: true,
  },
  // E-Wallets
  {
    id: 'Gopay',
    name: 'GoPay',
    type: 'ewallet',
    description: 'Bayar pakai saldo GoPay',
    available: true,
  },
  {
    id: 'OVO',
    name: 'OVO',
    type: 'ewallet',
    description: 'Bayar pakai saldo OVO',
    available: true,
  },
  {
    id: 'DANA',
    name: 'DANA',
    type: 'ewallet',
    description: 'Bayar pakai saldo DANA',
    available: true,
  },
  {
    id: 'ShopeePay',
    name: 'ShopeePay',
    type: 'ewallet',
    description: 'Bayar pakai saldo ShopeePay',
    available: true,
  },
  {
    id: 'LinkAja',
    name: 'LinkAja',
    type: 'ewallet',
    description: 'Bayar pakai saldo LinkAja',
    available: true,
  },
  // Bank Transfer
  {
    id: 'BCA_VA',
    name: 'BCA Virtual Account',
    type: 'bank_transfer',
    description: 'Transfer ke Virtual Account BCA',
    available: true,
  },
  {
    id: 'BRI_VA',
    name: 'BRI Virtual Account',
    type: 'bank_transfer',
    description: 'Transfer ke Virtual Account BRI',
    available: true,
  },
  {
    id: 'Mandiri_VA',
    name: 'Mandiri Virtual Account',
    type: 'bank_transfer',
    description: 'Transfer ke Virtual Account Mandiri',
    available: true,
  },
  {
    id: 'BNI_VA',
    name: 'BNI Virtual Account',
    type: 'bank_transfer',
    description: 'Transfer ke Virtual Account BNI',
    available: true,
  },
  // Credit Card
  {
    id: 'Credit_Card',
    name: 'Kartu Kredit/Debit',
    type: 'card',
    description: 'Bayar pakai kartu kredit atau debit',
    available: true,
  },
  // COD
  {
    id: 'COD',
    name: 'Bayar di Tempat (COD)',
    type: 'cod',
    description: 'Bayar saat barang diterima',
    available: true,
  },
];

// ✅ REMOVED: Notification interface (now imported from notificationStore)

interface PaymentStoreState {
  payments: Record<string, PaymentInfo>;
  notifications: Notification[];
}

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

const paymentStore = new Store<PaymentStoreState>({
  payments: {},
  notifications: [],
});

// Export store instance for non-React usage
export const paymentStoreInstance = paymentStore;

// Export helpers for non-React usage
export const paymentStoreHelpers = {
  addPayment: (payment: PaymentInfo) => {
    const state = paymentStore.getState();
    paymentStore.setState({
      payments: {
        ...state.payments,
        [payment.orderId]: payment,
      },
    });
  },

  updatePaymentStatus: (orderId: string, status: PaymentStatus, paidAt?: string) => {
    const state = paymentStore.getState();
    const payment = state.payments[orderId];
    if (payment) {
      paymentStore.setState({
        payments: {
          ...state.payments,
          [orderId]: {
            ...payment,
            status,
            paidAt,
            updatedAt: new Date().toISOString(),
          },
        },
      });
    }
  },

  getPayment: (orderId: string) => {
    return paymentStore.getState().payments[orderId];
  },

  addNotification: (notification: Notification) => {
    const state = paymentStore.getState();
    paymentStore.setState({
      notifications: [notification, ...state.notifications],
    });
  },

  markNotificationAsRead: (notificationId: string) => {
    const state = paymentStore.getState();
    paymentStore.setState({
      notifications: state.notifications.map((n) =>
        n.id === notificationId ? { ...n, read: true } : n
      ),
    });
  },

  markAllNotificationsAsRead: (userId: string) => {
    const state = paymentStore.getState();
    paymentStore.setState({
      notifications: state.notifications.map((n) =>
        n.userId === userId ? { ...n, read: true } : n
      ),
    });
  },

  getUnreadCount: (userId: string) => {
    const state = paymentStore.getState();
    return state.notifications.filter((n) => n.userId === userId && !n.read).length;
  },

  getUserNotifications: (userId: string) => {
    const state = paymentStore.getState();
    return state.notifications.filter((n) => n.userId === userId);
  },

  clearNotifications: (userId: string) => {
    const state = paymentStore.getState();
    paymentStore.setState({
      notifications: state.notifications.filter((n) => n.userId !== userId),
    });
  },
};

// React hook
export function usePaymentStore() {
  const [state, setState] = useState(paymentStore.getState());

  useEffect(() => {
    return paymentStore.subscribe(setState);
  }, []);

  // ✅ FIXED: Wrap helpers in useMemo to ensure stable references
  const stableHelpers = useMemo(() => paymentStoreHelpers, []);

  return {
    ...state,
    ...stableHelpers, // ✅ Use memoized helpers for stable references
  };
}

// Helper functions for display
export const getPaymentMethodName = (method: PaymentMethod): string => {
  const names: Record<PaymentMethod, string> = {
    QRIS: 'QRIS',
    GoPay: 'GoPay',
    OVO: 'OVO',
    DANA: 'DANA',
    BCA_VA: 'BCA Virtual Account',
    BRI_VA: 'BRI Virtual Account',
    Mandiri_VA: 'Mandiri Virtual Account',
    BNI_VA: 'BNI Virtual Account',
    Credit_Card: 'Kartu Kredit',
    COD: 'Bayar di Tempat (COD)',
    Gopay: 'GoPay',
    ShopeePay: 'ShopeePay',
    LinkAja: 'LinkAja',
  };
  return names[method] || method;
};

export const getPaymentStatusDisplay = (status: PaymentStatus): { text: string; color: string } => {
  const displays: Record<PaymentStatus, { text: string; color: string }> = {
    pending: { text: 'Menunggu Pembayaran', color: 'yellow' },
    waiting_payment: { text: 'Menunggu Pembayaran', color: 'yellow' },
    paid: { text: 'Dibayar', color: 'green' },
    failed: { text: 'Gagal', color: 'red' },
    expired: { text: 'Kedaluwarsa', color: 'gray' },
    cod_pending: { text: 'COD - Bayar saat Terima', color: 'orange' },
  };
  return displays[status] || { text: status, color: 'gray' };
};

// ✅ Generate QR Code for payment (mock implementation)
export const generateQRCode = (orderId: string, amount: number): string => {
  // In production, this would call a payment gateway API
  // For now, return a base64 encoded placeholder QR code
  const qrData = `ORDER:${orderId}|AMOUNT:${amount}|TIME:${Date.now()}`;
  return `data:image/svg+xml;base64,${btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <rect fill="#fff" width="200" height="200"/>
      <rect fill="#000" x="10" y="10" width="180" height="180"/>
      <rect fill="#fff" x="20" y="20" width="160" height="160"/>
      <text x="100" y="100" text-anchor="middle" fill="#000" font-size="12">
        QRIS Payment
      </text>
      <text x="100" y="120" text-anchor="middle" fill="#000" font-size="10">
        Order: ${orderId.substring(0, 8)}
      </text>
      <text x="100" y="135" text-anchor="middle" fill="#000" font-size="10">
        Rp ${amount.toLocaleString('id-ID')}
      </text>
    </svg>
  `)}`;
};

// ✅ Generate Virtual Account number (mock implementation)
export const generateVirtualAccount = (method: PaymentMethod, orderId: string): string => {
  // In production, this would call a payment gateway API
  // For now, generate a mock VA number
  const bankCode: Record<string, string> = {
    BCA_VA: '014',
    BRI_VA: '002',
    Mandiri_VA: '008',
    BNI_VA: '009',
  };
  
  const code = bankCode[method] || '000';
  const timestamp = Date.now().toString().substring(-6);
  const orderHash = orderId.substring(0, 8).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  return `${code}${timestamp}${orderHash}`;
};