/**
 * ✅ MAINTENANCE MODE STORE
 * Manages system-wide maintenance mode status
 * Uses KV store for persistence + Supabase Realtime for instant sync
 */

import * as kv from './kv_store.tsx';

const MAINTENANCE_KEY = 'system_maintenance_mode';

export interface MaintenanceMode {
  enabled: boolean;
  message: string;
  enabledBy: string;
  enabledAt: string;
  disabledAt?: string;
}

/**
 * Get current maintenance mode status
 */
export async function getMaintenanceStatus(): Promise<MaintenanceMode | null> {
  const data = await kv.get(MAINTENANCE_KEY);
  return data as MaintenanceMode | null;
}

/**
 * Enable maintenance mode
 */
export async function enableMaintenance(
  adminEmail: string,
  message: string = 'Sistem sedang dalam maintenance. Mohon coba beberapa saat lagi.'
): Promise<MaintenanceMode> {
  const maintenanceData: MaintenanceMode = {
    enabled: true,
    message,
    enabledBy: adminEmail,
    enabledAt: new Date().toISOString(),
  };

  await kv.set(MAINTENANCE_KEY, maintenanceData);
  
  console.log('🔧 [MaintenanceStore] Maintenance mode ENABLED by:', adminEmail);
  return maintenanceData;
}

/**
 * Disable maintenance mode
 */
export async function disableMaintenance(): Promise<MaintenanceMode> {
  const currentData = await getMaintenanceStatus();
  
  const maintenanceData: MaintenanceMode = {
    enabled: false,
    message: '',
    enabledBy: currentData?.enabledBy || '',
    enabledAt: currentData?.enabledAt || '',
    disabledAt: new Date().toISOString(),
  };

  await kv.set(MAINTENANCE_KEY, maintenanceData);
  
  console.log('✅ [MaintenanceStore] Maintenance mode DISABLED');
  return maintenanceData;
}

/**
 * Check if system is under maintenance
 */
export async function isMaintenanceMode(): Promise<boolean> {
  const status = await getMaintenanceStatus();
  return status?.enabled || false;
}
