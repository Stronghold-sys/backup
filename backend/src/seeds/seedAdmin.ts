import * as userStore from '../stores/user.store';
import { logger } from '../utils/logger';

/**
 * Seed admin user
 */
export async function seedAdmin(): Promise<void> {
    try {
        logger.info('Seeding admin user...');

        const adminEmail = 'utskelompok03@gmail.com';
        const adminPassword = 'admin123';

        // Check if admin already exists
        const existing = await userStore.getUserByEmail(adminEmail);

        if (existing.success && existing.user) {
            logger.info('Admin user already exists, skipping seed');
            return;
        }

        // Create admin user
        const result = await userStore.createUserInAuth(
            adminEmail,
            adminPassword,
            'Admin',
            'admin'
        );

        if (result.success) {
            logger.success('Admin user created successfully');
            logger.info(`Email: ${adminEmail}`);
            logger.info(`Password: ${adminPassword}`);
        } else {
            logger.error('Failed to create admin user:', result.error);
        }

    } catch (error: any) {
        logger.error('Error seeding admin:', error.message);
    }
}
