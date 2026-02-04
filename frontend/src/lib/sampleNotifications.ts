/**
 * 📢 Sample Notifications Helper
 * 
 * DEPRECATED: This file is not actively used.
 * Notifications are now managed through paymentStore.ts
 * 
 * ✅ FIXED: Removed broken imports to prevent build errors
 */

// This file is kept for backwards compatibility but is not functional
// All notification logic should use paymentStoreHelpers.addNotification()

console.warn('[sampleNotifications.ts] This file is deprecated. Use paymentStoreHelpers instead.');

export const initializeSampleNotifications = () => {
  console.warn('[sampleNotifications] This function is deprecated and does nothing');
};

export const notifyOrderStatusChange = () => {
  console.warn('[sampleNotifications] This function is deprecated');
};

export const notifyPaymentReminder = () => {
  console.warn('[sampleNotifications] This function is deprecated');
};

export const notifyRefundStatus = () => {
  console.warn('[sampleNotifications] This function is deprecated');
};

export const notifyFlashSale = () => {
  console.warn('[sampleNotifications] This function is deprecated');
};
