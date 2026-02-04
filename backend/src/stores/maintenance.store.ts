import * as kv from './kv.store';
import { SystemSettings } from '../types';

/**
 * Get maintenance mode status
 */
export async function getMaintenanceMode(): Promise<SystemSettings> {
    const settings = await kv.get<SystemSettings>('system:maintenance');

    if (!settings) {
        return {
            maintenanceMode: false
        };
    }

    return settings;
}

/**
 * Set maintenance mode
 */
export async function setMaintenanceMode(
    enabled: boolean,
    message?: string,
    startTime?: string,
    endTime?: string
): Promise<void> {
    const settings: SystemSettings = {
        maintenanceMode: enabled,
        maintenanceMessage: message,
        startTime,
        endTime
    };

    await kv.set('system:maintenance', settings);
}
