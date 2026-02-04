import { supabaseAdmin, supabaseAnon } from '../config/supabase';
import { User } from '../types';
import { logger } from '../utils/logger';

/**
 * Get all users from Supabase Auth
 */
export async function getAllUsersFromAuth() {
    try {
        logger.debug('Fetching all users from Supabase Auth...');

        const { data, error } = await supabaseAdmin.auth.admin.listUsers();

        if (error) {
            logger.error('Failed to fetch users from Supabase Auth:', error.message);
            return { success: false, error: error.message, users: [] };
        }

        logger.success(`Fetched ${data.users.length} users from Supabase Auth`);

        const users: User[] = data.users.map((authUser) => {
            const metadata = authUser.user_metadata || {};

            return {
                id: authUser.id,
                email: authUser.email || '',
                name: metadata.name || metadata.display_name || (authUser.email === 'utskelompok03@gmail.com' ? 'Admin' : authUser.email?.split('@')[0]) || 'Unknown',
                role: metadata.role || 'user',
                status: metadata.status || 'active',
                avatar: metadata.avatar || null,
                phone: authUser.phone || metadata.phone || null,
                addresses: metadata.addresses || [],
                createdAt: authUser.created_at,
                updatedAt: authUser.updated_at || authUser.created_at,
            };
        });

        return { success: true, users };

    } catch (error: any) {
        logger.error('Error fetching users from Supabase Auth:', error.message);
        return { success: false, error: error.message, users: [] };
    }
}

/**
 * Get user by ID from Supabase Auth
 */
export async function getUserById(userId: string) {
    try {
        logger.debug('Fetching user from Supabase Auth:', userId);

        const { data: authUser, error } = await supabaseAdmin.auth.admin.getUserById(userId);

        if (error || !authUser) {
            logger.error('User not found in Supabase Auth:', error?.message);
            return { success: false, error: error?.message || 'User not found', user: null };
        }

        const metadata = authUser.user.user_metadata || {};

        let displayName = metadata.name || metadata.display_name || authUser.user.email?.split('@')[0] || 'Unknown';
        if (authUser.user.email === 'utskelompok03@gmail.com') {
            displayName = 'Admin';
        }

        const user: User = {
            id: authUser.user.id,
            email: authUser.user.email || '',
            name: displayName,
            role: metadata.role || 'user',
            status: metadata.status || 'active',
            avatar: metadata.avatar || null,
            phone: authUser.user.phone || metadata.phone || null,
            addresses: metadata.addresses || [],
            createdAt: authUser.user.created_at,
            updatedAt: authUser.user.updated_at || authUser.user.created_at,
        };

        logger.success('User found:', user.email);
        return { success: true, user };

    } catch (error: any) {
        logger.error('Error fetching user:', error.message);
        return { success: false, error: error.message, user: null };
    }
}

/**
 * Get user by email from Supabase Auth
 */
export async function getUserByEmail(email: string) {
    try {
        logger.debug('Fetching user by email from Supabase Auth:', email);

        const { data, error } = await supabaseAdmin.auth.admin.listUsers();

        if (error) {
            logger.error('Failed to fetch users:', error.message);
            return { success: false, error: error.message, user: null };
        }

        const authUser = data.users.find(u => u.email === email);

        if (!authUser) {
            logger.info('User not found with email:', email);
            return { success: false, error: 'User not found', user: null };
        }

        const metadata = authUser.user_metadata || {};

        let displayName = metadata.name || metadata.display_name || authUser.email?.split('@')[0] || 'Unknown';
        if (authUser.email === 'utskelompok03@gmail.com') {
            displayName = 'Admin';
        }

        const user: User = {
            id: authUser.id,
            email: authUser.email || '',
            name: displayName,
            role: metadata.role || 'user',
            status: metadata.status || 'active',
            avatar: metadata.avatar || null,
            phone: authUser.phone || metadata.phone || null,
            addresses: metadata.addresses || [],
            createdAt: authUser.created_at,
            updatedAt: authUser.updated_at || authUser.created_at,
        };

        logger.success('User found:', user.email);
        return { success: true, user };

    } catch (error: any) {
        logger.error('Error fetching user by email:', error.message);
        return { success: false, error: error.message, user: null };
    }
}

/**
 * Create user in Supabase Auth
 */
export async function createUserInAuth(
    email: string,
    password: string,
    name: string,
    role: string = 'user',
    additionalMetadata: any = {}
) {
    try {
        logger.info('Creating user in Supabase Auth:', email);

        if (!password || password.length < 6) {
            logger.error('Password too short or empty');
            return { success: false, error: 'Password must be at least 6 characters' };
        }

        const defaultAddress = {
            id: `addr-${Date.now()}`,
            label: 'Alamat Utama',
            recipientName: name,
            phone: '+62 812-3456-7890',
            address: 'Jl. Contoh No. 123',
            city: 'Jakarta',
            province: 'DKI Jakarta',
            postalCode: '12345',
            isDefault: true,
        };

        const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: password,
            user_metadata: {
                name: name,
                display_name: name,
                role: role,
                status: 'active',
                addresses: [defaultAddress],
                avatar: null,
                phone: null,
                ...additionalMetadata,
            },
            email_confirm: true
        });

        if (error) {
            logger.error('Failed to create user in Supabase Auth:', error.message);
            return { success: false, error: error.message };
        }

        logger.success('User created in Supabase Auth successfully:', email);
        logger.info('Auth User ID:', data.user?.id);
        logger.info('Role:', role);

        return { success: true, data: data.user };

    } catch (error: any) {
        logger.error('Error creating user in Supabase Auth:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Update user metadata in Supabase Auth
 */
export async function updateUserMetadata(userId: string, metadata: any) {
    try {
        logger.info('Updating user metadata in Supabase Auth:', userId);

        const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            user_metadata: metadata
        });

        if (error) {
            logger.error('Failed to update user metadata:', error.message);
            return { success: false, error: error.message };
        }

        logger.success('User metadata updated successfully');
        return { success: true, data: data.user };

    } catch (error: any) {
        logger.error('Error updating user metadata:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Sign in user and return access token
 */
export async function signInUser(email: string, password: string) {
    try {
        logger.info('Signing in user (credentials hidden for security)');

        const { data, error } = await supabaseAnon.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            logger.error('Sign in failed:', error.message);
            return { success: false, error: error.message, user: null, accessToken: null };
        }

        if (!data.user || !data.session) {
            logger.error('Sign in failed: No user or session returned');
            return { success: false, error: 'Authentication failed', user: null, accessToken: null };
        }

        const metadata = data.user.user_metadata || {};

        let displayName = metadata.name || metadata.display_name || data.user.email?.split('@')[0] || 'Unknown';
        if (data.user.email === 'utskelompok03@gmail.com') {
            displayName = 'Admin';
        }

        const user: User = {
            id: data.user.id,
            email: data.user.email || '',
            name: displayName,
            role: metadata.role || 'user',
            status: metadata.status || 'active',
            avatar: metadata.avatar || null,
            phone: data.user.phone || metadata.phone || null,
            addresses: metadata.addresses || [],
            createdAt: data.user.created_at,
            updatedAt: data.user.updated_at || data.user.created_at,
        };

        logger.success('User signed in successfully:', user.email);
        logger.info('User role:', user.role);

        return {
            success: true,
            user,
            accessToken: data.session.access_token,
            refreshToken: data.session.refresh_token,
        };

    } catch (error: any) {
        logger.error('Error signing in user:', error.message);
        return { success: false, error: error.message, user: null, accessToken: null };
    }
}

/**
 * Get user from access token
 */
export async function getUserFromToken(token: string | undefined): Promise<User | null> {
    if (!token || token.trim() === '') {
        logger.error('Token is empty or undefined');
        return null;
    }

    try {
        logger.debug('Validating token...');

        const { data, error } = await supabaseAnon.auth.getUser(token);

        if (error) {
            logger.warn('Token validation failed:', error.message);
            return null;
        }

        if (!data.user) {
            logger.error('No user data in response');
            return null;
        }

        const metadata = data.user.user_metadata || {};

        let displayName = metadata.name || metadata.display_name || data.user.email?.split('@')[0] || 'Unknown';
        if (data.user.email === 'utskelompok03@gmail.com') {
            displayName = 'Admin';
        }

        const user: User = {
            id: data.user.id,
            email: data.user.email || '',
            name: displayName,
            role: metadata.role || 'user',
            status: metadata.status || 'active',
            avatar: metadata.avatar || null,
            phone: data.user.phone || metadata.phone || null,
            addresses: metadata.addresses || [],
            createdAt: data.user.created_at,
            updatedAt: data.user.updated_at || data.user.created_at,
        };

        logger.success('User authenticated successfully:', user.email);
        return user;

    } catch (error: any) {
        logger.error('Exception in getUserFromToken:', error.message);
        return null;
    }
}

/**
 * Delete user from Supabase Auth
 */
export async function deleteUserFromAuth(userId: string) {
    try {
        logger.info(`Deleting user from Supabase Auth: ${userId}`);

        const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (error) {
            logger.error('Failed to delete user from Supabase Auth:', error.message);
            return { success: false, error: error.message };
        }

        logger.success('User deleted from Supabase Auth successfully');

        return { success: true, message: 'User deleted successfully from Supabase Auth' };

    } catch (error: any) {
        logger.error('Error deleting user:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Update user role
 */
export async function updateUserRole(userId: string, role: string) {
    try {
        const { data: authUser, error: getError } = await supabaseAdmin.auth.admin.getUserById(userId);

        if (getError || !authUser) {
            return { success: false, error: 'User not found' };
        }

        const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            user_metadata: {
                ...authUser.user.user_metadata,
                role: role,
            }
        });

        if (error) {
            return { success: false, error: error.message };
        }

        logger.success('User role updated successfully');
        return { success: true, data: data.user };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Update user status
 */
export async function updateUserStatus(userId: string, status: string) {
    try {
        const { data: authUser, error: getError } = await supabaseAdmin.auth.admin.getUserById(userId);

        if (getError || !authUser) {
            return { success: false, error: 'User not found' };
        }

        const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            user_metadata: {
                ...authUser.user.user_metadata,
                status: status,
            }
        });

        if (error) {
            return { success: false, error: error.message };
        }

        logger.success('User status updated successfully');
        return { success: true, data: data.user };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Update user avatar
 */
export async function updateUserAvatar(userId: string, avatarUrl: string | null) {
    try {
        const { data: authUser, error: getError } = await supabaseAdmin.auth.admin.getUserById(userId);

        if (getError || !authUser) {
            return { success: false, error: 'User not found' };
        }

        const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            user_metadata: {
                ...authUser.user.user_metadata,
                avatar: avatarUrl,
            }
        });

        if (error) {
            return { success: false, error: error.message };
        }

        logger.success('User avatar updated successfully');
        return { success: true, data: data.user };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Update user addresses
 */
export async function updateUserAddresses(userId: string, addresses: any[]) {
    try {
        const { data: authUser, error: getError } = await supabaseAdmin.auth.admin.getUserById(userId);

        if (getError || !authUser) {
            return { success: false, error: 'User not found' };
        }

        const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            user_metadata: {
                ...authUser.user.user_metadata,
                addresses: addresses,
            }
        });

        if (error) {
            return { success: false, error: error.message };
        }

        logger.success('User addresses updated successfully');
        return { success: true, data: data.user };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
