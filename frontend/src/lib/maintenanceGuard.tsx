/**
 * ✅ MAINTENANCE MODE GUARD v2.0
 * Helper to block transaction actions during maintenance
 * 
 * MIGRATION NOTE: Converted from .ts to .tsx to support JSX
 * Timestamp: 2025-02-01
 */

import React from 'react'; // ✅ FIXED: Import React at the top
import { useMaintenanceStore } from './maintenanceStore';
import { toast } from 'sonner';

/**
 * Check if action is allowed (not in maintenance mode)
 * Shows toast notification if blocked
 * 
 * @returns true if allowed, false if blocked
 */
export function useMaintenanceGuard() {
  const { isUnderMaintenance, maintenance } = useMaintenanceStore();

  const checkAndBlock = (actionName: string = 'transaksi'): boolean => {
    if (isUnderMaintenance()) {
      toast.error('Sistem Sedang Maintenance', {
        description: maintenance.message || 'Transaksi sementara tidak dapat dilakukan. Mohon coba lagi nanti.',
        duration: 5000,
      });
      return false; // Blocked
    }
    return true; // Allowed
  };

  return {
    isAllowed: !isUnderMaintenance(),
    checkAndBlock,
  };
}

/**
 * HOC to wrap components that require maintenance check
 */
export function withMaintenanceCheck<P extends object>(
  Component: React.ComponentType<P>,
  fallbackMessage?: string
) {
  return function MaintenanceCheckedComponent(props: P) {
    const { isUnderMaintenance, maintenance } = useMaintenanceStore();

    if (isUnderMaintenance()) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Sistem Sedang Maintenance
          </h3>
          <p className="text-gray-600 max-w-md">
            {fallbackMessage || maintenance.message || 'Fitur ini sementara tidak tersedia. Mohon coba lagi nanti.'}
          </p>
          {maintenance.endTime && (
            <p className="text-sm text-gray-500 mt-4">
              Estimasi selesai: {new Date(maintenance.endTime).toLocaleString('id-ID')}
            </p>
          )}
        </div>
      );
    }

    return <Component {...props} />;
  };
}