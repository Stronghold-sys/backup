/**
 * 🔔 NOTIFICATION STORE - Production Mode
 * 
 * ✅ FIXED: Pure React implementation (no Zustand)
 * In-memory store for showing notifications after redirect
 * NO localStorage usage - all data in memory only
 * 
 * This replaces localStorage for:
 * - Ban notifications
 * - Deleted account notifications
 * - User notifications (orders, payments, etc.)
 */

import { useState, useEffect, useMemo } from 'react';

interface BanData {
  reason: string;
  bannedAt: string;
  bannedBy: string;
}

interface DeletedData {
  reason: string;
  deletedAt: string;
  deletedBy: string;
}

// User notification interface
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'payment_success' | 'payment_failed' | 'payment_expired' | 'order_update' | 'order_created' | 'info' | 'refund';
  read: boolean;
  orderId?: string;
  createdAt: string;
}

interface NotificationState {
  banNotification: BanData | null;
  deletedNotification: DeletedData | null;
  notifications: Notification[];
  maintenanceMode: boolean;
  maintenanceMessage: string;
  maintenanceStartTime: string | null;
  maintenanceEndTime: string | null;
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

const notificationStore = new Store<NotificationState>({
  banNotification: null,
  deletedNotification: null,
  notifications: [],
  maintenanceMode: false,
  maintenanceMessage: '',
  maintenanceStartTime: null,
  maintenanceEndTime: null,
});

// Export store instance for non-React usage
export const notificationStoreInstance = notificationStore;

// Export helpers for non-React usage
export const notificationStoreHelpers = {
  setBanNotification: (data: BanData | null) => {
    console.info('✅ [NotificationStore] Storing ban notification:', data);
    notificationStore.setState({ banNotification: data });
  },

  clearBanNotification: () => {
    console.info('🗑️ [NotificationStore] Clearing ban notification');
    notificationStore.setState({ banNotification: null });
  },

  setDeletedNotification: (data: DeletedData | null) => {
    console.info('✅ [NotificationStore] Storing deleted notification:', data);
    notificationStore.setState({ deletedNotification: data });
  },

  clearDeletedNotification: () => {
    console.info('🗑️ [NotificationStore] Clearing deleted notification');
    notificationStore.setState({ deletedNotification: null });
  },

  addNotification: (notification: Notification) => {
    console.info('✅ [NotificationStore] Adding user notification:', notification);
    notificationStore.setState((state) => ({
      notifications: [...state.notifications, notification],
    }));
  },

  removeNotification: (id: string) => {
    console.info('🗑️ [NotificationStore] Removing user notification:', id);
    notificationStore.setState((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },

  markNotificationAsRead: (id: string) => {
    console.info('✅ [NotificationStore] Marking user notification as read:', id);
    notificationStore.setState((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    }));
  },

  setMaintenanceMode: (mode: boolean, message: string, startTime: string | null, endTime: string | null) => {
    console.info('✅ [NotificationStore] Setting maintenance mode:', mode);
    notificationStore.setState({
      maintenanceMode: mode,
      maintenanceMessage: message,
      maintenanceStartTime: startTime,
      maintenanceEndTime: endTime,
    });
  },

  clearMaintenanceMode: () => {
    console.info('🗑️ [NotificationStore] Clearing maintenance mode');
    notificationStore.setState({
      maintenanceMode: false,
      maintenanceMessage: '',
      maintenanceStartTime: null,
      maintenanceEndTime: null,
    });
  },

  // ✅ NEW: Helper functions for user notifications
  getUnreadCount: (userId?: string) => {
    const state = notificationStore.getState();
    if (userId) {
      return state.notifications.filter((n) => !n.read && n.userId === userId).length;
    }
    return state.notifications.filter((n) => !n.read).length;
  },

  getUnreadNotifications: (userId?: string) => {
    const state = notificationStore.getState();
    if (userId) {
      return state.notifications.filter((n) => !n.read && n.userId === userId).length;
    }
    return state.notifications.filter((n) => !n.read).length;
  },

  markAsRead: (id: string) => {
    notificationStoreHelpers.markNotificationAsRead(id);
  },

  markAllAsRead: (userId?: string) => {
    console.info('✅ [NotificationStore] Marking all notifications as read for user:', userId);
    notificationStore.setState((state) => ({
      notifications: state.notifications.map((n) => 
        userId ? (n.userId === userId ? { ...n, read: true } : n) : { ...n, read: true }
      ),
    }));
  },

  deleteNotification: (id: string) => {
    console.info('🗑️ [NotificationStore] Deleting notification:', id);
    notificationStore.setState((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },

  enableMaintenance: (message: string, startTime: string, endTime: string) => {
    notificationStoreHelpers.setMaintenanceMode(true, message, startTime, endTime);
  },

  disableMaintenance: () => {
    notificationStoreHelpers.clearMaintenanceMode();
  },
};

// React hook
export function useNotificationStore() {
  const [state, setState] = useState(notificationStore.getState());

  useEffect(() => {
    return notificationStore.subscribe(setState);
  }, []);

  // ✅ FIXED: Wrap helpers in useMemo to ensure stable references
  const stableHelpers = useMemo(() => notificationStoreHelpers, []);

  return {
    ...state,
    ...stableHelpers, // ✅ Use memoized helpers for stable references
  };
}