import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Get Supabase client
 */
function getSupabase() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Get all users from Supabase Auth
 */
export async function getAllUsersFromAuth() {
  const supabase = getSupabase();
  
  try {
    console.log('👥 Fetching all users from Supabase Auth...');
    
    // Get all users from Supabase Auth
    const { data, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error('❌ Failed to fetch users from Supabase Auth:', error.message);
      return { success: false, error: error.message, users: [] };
    }
    
    console.log(`✅ Fetched ${data.users.length} users from Supabase Auth`);
    
    // Transform to app format
    const users = data.users.map((authUser) => {
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
        emailConfirmed: authUser.email_confirmed_at ? true : false,
        lastSignIn: authUser.last_sign_in_at,
      };
    });
    
    return { success: true, users };
    
  } catch (error: any) {
    console.error('❌ Error fetching users from Supabase Auth:', error.message);
    return { success: false, error: error.message, users: [] };
  }
}

/**
 * Get user by ID from Supabase Auth
 */
export async function getUserById(userId: string) {
  const supabase = getSupabase();
  
  try {
    console.log('🔍 Fetching user from Supabase Auth:', userId);
    
    const { data: authUser, error } = await supabase.auth.admin.getUserById(userId);
    
    if (error || !authUser) {
      console.error('❌ User not found in Supabase Auth:', error?.message);
      return { success: false, error: error?.message || 'User not found', user: null };
    }
    
    const metadata = authUser.user.user_metadata || {};
    
    // ✅ SPECIAL CASE: Override name for admin account
    let displayName = metadata.name || metadata.display_name || authUser.user.email?.split('@')[0] || 'Unknown';
    if (authUser.user.email === 'utskelompok03@gmail.com') {
      displayName = 'Admin';
    }
    
    const user = {
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
    
    console.log('✅ User found:', user.email);
    return { success: true, user };
    
  } catch (error: any) {
    console.error('❌ Error fetching user:', error.message);
    return { success: false, error: error.message, user: null };
  }
}

/**
 * Get user by email from Supabase Auth
 */
export async function getUserByEmail(email: string) {
  const supabase = getSupabase();
  
  try {
    console.log('🔍 Fetching user by email from Supabase Auth:', email);
    
    // List all users and find by email (Supabase doesn't have a direct email lookup)
    const { data, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error('❌ Failed to fetch users:', error.message);
      return { success: false, error: error.message, user: null };
    }
    
    const authUser = data.users.find(u => u.email === email);
    
    if (!authUser) {
      console.log('❌ User not found with email:', email);
      return { success: false, error: 'User not found', user: null };
    }
    
    const metadata = authUser.user_metadata || {};
    
    // ✅ SPECIAL CASE: Override name for admin account
    let displayName = metadata.name || metadata.display_name || authUser.email?.split('@')[0] || 'Unknown';
    if (authUser.email === 'utskelompok03@gmail.com') {
      displayName = 'Admin';
    }
    
    const user = {
      id: authUser.id,
      email: authUser.email || '',
      name: displayName,
      role: metadata.role || 'user',
      status: metadata.status || 'active',
      avatar: metadata.avatar || null,
      phone: authUser.phone || metadata.phone || null,
      addresses: metadata.addresses || [],
      password: metadata.password_hash || null, // For compatibility
      createdAt: authUser.created_at,
      updatedAt: authUser.updated_at || authUser.created_at,
    };
    
    console.log('✅ User found:', user.email);
    return { success: true, user };
    
  } catch (error: any) {
    console.error('❌ Error fetching user by email:', error.message);
    return { success: false, error: error.message, user: null };
  }
}

/**
 * Create user in Supabase Auth (official auth system)
 */
export async function createUserInAuth(
  email: string, 
  password: string, 
  name: string, 
  role: string = 'user',
  additionalMetadata: any = {}
) {
  const supabase = getSupabase();
  
  try {
    console.log('🔐 Creating user in Supabase Auth:', email);
    
    // Validate password
    if (!password || password.length < 6) {
      console.error('❌ Password too short or empty');
      return { success: false, error: 'Password must be at least 6 characters' };
    }
    
    // Default address
    const defaultAddress = {
      id: `addr-${Date.now()}`,
      name: name,
      phone: '+62 812-3456-7890',
      address: 'Jl. Contoh No. 123',
      city: 'Jakarta',
      province: 'DKI Jakarta',
      postalCode: '12345',
      isDefault: true,
    };
    
    // Create user using Supabase Auth Admin API
    const { data, error } = await supabase.auth.admin.createUser({
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
      // Automatically confirm the user's email
      email_confirm: true
    });
    
    if (error) {
      console.error('❌ Failed to create user in Supabase Auth:', error.message);
      return { success: false, error: error.message };
    }
    
    console.log('✅ User created in Supabase Auth successfully:', email);
    console.log('   - Auth User ID:', data.user?.id);
    console.log('   - Email:', data.user?.email);
    console.log('   - Role:', role);
    
    return { success: true, data: data.user };
    
  } catch (error: any) {
    console.error('❌ Error creating user in Supabase Auth:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Update user metadata in Supabase Auth
 */
export async function updateUserMetadata(userId: string, metadata: any) {
  const supabase = getSupabase();
  
  try {
    console.log('📝 Updating user metadata in Supabase Auth:', userId);
    
    const { data, error } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: metadata
    });
    
    if (error) {
      console.error('❌ Failed to update user metadata:', error.message);
      return { success: false, error: error.message };
    }
    
    console.log('✅ User metadata updated successfully');
    return { success: true, data: data.user };
    
  } catch (error: any) {
    console.error('❌ Error updating user metadata:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Update user role in Supabase Auth
 */
export async function updateUserRole(userId: string, role: string) {
  const supabase = getSupabase();
  
  try {
    console.log('👤 Updating user role:', userId, '→', role);
    
    // Get current user
    const { data: authUser, error: getError } = await supabase.auth.admin.getUserById(userId);
    
    if (getError || !authUser) {
      console.error('❌ User not found:', getError?.message);
      return { success: false, error: 'User not found' };
    }
    
    // Update role in metadata
    const { data, error } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: { 
        ...authUser.user.user_metadata,
        role: role,
      }
    });
    
    if (error) {
      console.error('❌ Failed to update user role:', error.message);
      return { success: false, error: error.message };
    }
    
    console.log('✅ User role updated successfully');
    return { success: true, data: data.user };
    
  } catch (error: any) {
    console.error('❌ Error updating user role:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Update user status in Supabase Auth
 */
export async function updateUserStatus(userId: string, status: string) {
  const supabase = getSupabase();
  
  try {
    console.log('📊 Updating user status:', userId, '→', status);
    
    // Get current user
    const { data: authUser, error: getError } = await supabase.auth.admin.getUserById(userId);
    
    if (getError || !authUser) {
      console.error('❌ User not found:', getError?.message);
      return { success: false, error: 'User not found' };
    }
    
    // Update status in metadata
    const { data, error } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: { 
        ...authUser.user.user_metadata,
        status: status,
      }
    });
    
    if (error) {
      console.error('❌ Failed to update user status:', error.message);
      return { success: false, error: error.message };
    }
    
    console.log('✅ User status updated successfully');
    return { success: true, data: data.user };
    
  } catch (error: any) {
    console.error('❌ Error updating user status:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Update user avatar in Supabase Auth metadata
 */
export async function updateUserAvatar(userId: string, avatarUrl: string | null) {
  const supabase = getSupabase();
  
  try {
    console.log('🖼️  Updating user avatar:', userId);
    
    // Get current user
    const { data: authUser, error: getError } = await supabase.auth.admin.getUserById(userId);
    
    if (getError || !authUser) {
      console.error('❌ User not found:', getError?.message);
      return { success: false, error: 'User not found' };
    }
    
    // Update avatar in metadata
    const { data, error } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: { 
        ...authUser.user.user_metadata,
        avatar: avatarUrl,
      }
    });
    
    if (error) {
      console.error('❌ Failed to update user avatar:', error.message);
      return { success: false, error: error.message };
    }
    
    console.log('✅ User avatar updated successfully');
    return { success: true, data: data.user };
    
  } catch (error: any) {
    console.error('❌ Error updating user avatar:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Update user addresses in Supabase Auth metadata
 */
export async function updateUserAddresses(userId: string, addresses: any[]) {
  const supabase = getSupabase();
  
  try {
    console.log('📍 Updating user addresses:', userId);
    
    // Get current user
    const { data: authUser, error: getError } = await supabase.auth.admin.getUserById(userId);
    
    if (getError || !authUser) {
      console.error('❌ User not found:', getError?.message);
      return { success: false, error: 'User not found' };
    }
    
    // Update addresses in metadata
    const { data, error } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: { 
        ...authUser.user.user_metadata,
        addresses: addresses,
      }
    });
    
    if (error) {
      console.error('❌ Failed to update user addresses:', error.message);
      return { success: false, error: error.message };
    }
    
    console.log('✅ User addresses updated successfully');
    return { success: true, data: data.user };
    
  } catch (error: any) {
    console.error('❌ Error updating user addresses:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Update user password hash in Supabase Auth (for password verification)
 */
export async function updateUserPasswordHash(userId: string, passwordHash: string) {
  const supabase = getSupabase();
  
  try {
    console.log('🔐 Updating user password hash:', userId);
    
    // Get current user
    const { data: authUser, error: getError } = await supabase.auth.admin.getUserById(userId);
    
    if (getError || !authUser) {
      console.error('❌ User not found:', getError?.message);
      return { success: false, error: 'User not found' };
    }
    
    // Update password hash in metadata (for custom password verification)
    const { data, error } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: { 
        ...authUser.user.user_metadata,
        password_hash: passwordHash,
      }
    });
    
    if (error) {
      console.error('❌ Failed to update password hash:', error.message);
      return { success: false, error: error.message };
    }
    
    console.log('✅ Password hash updated successfully');
    return { success: true, data: data.user };
    
  } catch (error: any) {
    console.error('❌ Error updating password hash:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Sign in user and return access token
 */
export async function signInUser(email: string, password: string) {
  // ✅ CRITICAL FIX: Use ANON_KEY for user-facing auth operations
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  
  // ✅ DEBUG: Log environment check
  if (!supabaseAnonKey) {
    console.error('❌ CRITICAL: SUPABASE_ANON_KEY is not set in environment!');
    return { success: false, error: 'Server configuration error', user: null, accessToken: null };
  }
  
  console.log('🔐 Signing in user (credentials hidden for security)');
  console.log('🔑 Using Supabase ANON key for auth (length:', supabaseAnonKey?.length, ')');
  
  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  
  try {
    // Use Supabase Auth to sign in with ANON client
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: email,
      password: password,
    });
    
    if (error) {
      console.error('❌ Sign in failed:', error.message);
      console.error('❌ Error details:', error);
      return { success: false, error: error.message, user: null, accessToken: null };
    }
    
    if (!data.user || !data.session) {
      console.error('❌ Sign in failed: No user or session returned');
      return { success: false, error: 'Authentication failed', user: null, accessToken: null };
    }
    
    const metadata = data.user.user_metadata || {};
    
    // ✅ SPECIAL CASE: Override name for admin account
    let displayName = metadata.name || metadata.display_name || data.user.email?.split('@')[0] || 'Unknown';
    if (data.user.email === 'utskelompok03@gmail.com') {
      displayName = 'Admin';
    }
    
    const user = {
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
    
    console.log('✅ User signed in successfully:', user.email);
    console.log('✅ User role:', user.role);
    console.log('✅ Access token generated (length:', data.session.access_token?.length, ')');
    
    return { 
      success: true, 
      user, 
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    };
    
  } catch (error: any) {
    console.error('❌ Error signing in user:', error.message);
    console.error('❌ Full error:', error);
    return { success: false, error: error.message, user: null, accessToken: null };
  }
}

/**
 * Get user from access token
 * Returns the user object directly (or null if invalid)
 */
export async function getUserFromToken(token: string | undefined) {
  console.log('🔍 [getUserFromToken] Starting validation...');
  
  if (!token || token.trim() === '') {
    console.error('❌ [getUserFromToken] Token is empty or undefined');
    return null;
  }
  
  try {
    console.log('🔑 [getUserFromToken] Token preview:', token.substring(0, 30) + '...');
    console.log('📏 [getUserFromToken] Token length:', token.length);
    
    // ✅ FIX v16.5: Use ANON_KEY to validate user JWT tokens
    // User tokens are signed with ANON_KEY, not SERVICE_ROLE_KEY
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    if (!supabaseAnonKey) {
      console.error('❌ [getUserFromToken] SUPABASE_ANON_KEY not found in environment!');
      return null;
    }
    
    console.log('🔧 [getUserFromToken] Creating Supabase client with ANON_KEY...');
    
    // ✅ CRITICAL FIX: Create client with ANON_KEY to validate user tokens
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
    
    console.log('📡 [getUserFromToken] Calling Supabase auth.getUser(token)...');
    // ✅ Pass token as parameter to validate JWT
    const { data, error } = await supabaseClient.auth.getUser(token);
    
    console.log('📥 [getUserFromToken] Supabase response received');
    console.log('   ✓ Has error:', !!error);
    console.log('   ✓ Error name:', error?.name || 'none');
    console.log('   ✓ Error message:', error?.message || 'none');
    console.log('   ✓ Error status:', (error as any)?.status || 'none');
    console.log('   ✓ Has data.user:', !!data?.user);
    console.log('   ✓ User email:', data?.user?.email || 'none');
    
    if (error) {
      // ✅ Handle specific auth errors gracefully
      const errorName = error?.name || '';
      const errorStatus = (error as any)?.status;
      
      if (errorName === 'AuthSessionMissingError' || errorStatus === 400) {
        console.warn('⚠️ [getUserFromToken] Session expired or invalid - user needs to re-login');
        console.warn('   This is normal if token has expired. Returning null.');
      } else {
        console.error('❌ [getUserFromToken] Supabase Auth validation FAILED');
        console.error('   Full error object:', JSON.stringify(error, null, 2));
      }
      return null;
    }
    
    if (!data.user) {
      console.error('❌ [getUserFromToken] No user data in response');
      return null;
    }
    
    const metadata = data.user.user_metadata || {};
    
    // ✅ SPECIAL CASE: Override name for admin account to show "Admin" instead of "utskelompok03"
    let displayName = metadata.name || metadata.display_name || data.user.email?.split('@')[0] || 'Unknown';
    
    // If this is the main admin account, show "Admin" as display name
    if (data.user.email === 'utskelompok03@gmail.com') {
      displayName = 'Admin';
    }
    
    const user = {
      id: data.user.id,
      email: data.user.email || '',
      name: displayName,
      role: metadata.role || 'user', // ✅ CRITICAL: Must match what's stored in Supabase Auth metadata
      status: metadata.status || 'active',
      avatar: metadata.avatar || null,
      phone: data.user.phone || metadata.phone || null,
      addresses: metadata.addresses || [],
      createdAt: data.user.created_at,
      updatedAt: data.user.updated_at || data.user.created_at,
    };
    
    console.log('✅ [getUserFromToken] User authenticated successfully!');
    console.log('   ✓ Email:', user.email);
    console.log('   ✓ Role:', user.role);
    console.log('   ✓ Status:', user.status);
    console.log('   ✓ Metadata role:', metadata.role);
    console.log('   ✓ ID:', user.id);
    return user; // ✅ Return user directly
    
  } catch (error: any) {
    console.error('❌ [getUserFromToken] Exception caught:', error.message);
    console.error('   Error name:', error.name);
    console.error('   Full exception:', error);
    return null; // ✅ Return null directly
  }
}

/**
 * Delete user from Supabase Auth and Storage
 */
export async function deleteUserFromAuth(userId: string) {
  const supabase = getSupabase();
  
  try {
    console.log(`🗑️  Deleting user from Supabase Auth: ${userId}`);
    
    // 1. Get user data to delete avatar
    const { data: authUser, error: getError } = await supabase.auth.admin.getUserById(userId);
    
    if (!getError && authUser) {
      const metadata = authUser.user.user_metadata || {};
      
      // 2. Delete user avatar from Storage if exists
      if (metadata.avatar) {
        const bucketName = 'make-adb995ba-avatars';
        const avatarPath = metadata.avatar.split('/').pop(); // Extract filename
        if (avatarPath) {
          const { error: storageError } = await supabase.storage
            .from(bucketName)
            .remove([`avatars/${avatarPath}`]);
          
          if (storageError) {
            console.warn('⚠️  Could not delete avatar:', storageError.message);
          } else {
            console.log('✅ Avatar deleted from Storage');
          }
        }
      }
    }
    
    // 3. Delete user from Supabase Auth
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);
    
    if (authError) {
      console.error('❌ Failed to delete user from Supabase Auth:', authError.message);
      return { success: false, error: authError.message };
    }
    
    console.log('✅ User deleted from Supabase Auth successfully');
    
    return { success: true, message: 'User deleted successfully from Supabase Auth' };
    
  } catch (error: any) {
    console.error('❌ Error deleting user:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Save user to Supabase database (DEPRECATED - kept for backwards compatibility)
 */
export async function saveUserToDatabase(userData: any) {
  console.log('ℹ️  saveUserToDatabase is deprecated - all user data is now stored in Supabase Auth');
  return { success: true, message: 'User data stored in Supabase Auth' };
}

/**
 * Initialize users table (DEPRECATED - kept for backwards compatibility)
 */
export async function initializeUsersTable() {
  console.log('ℹ️  initializeUsersTable is deprecated - all user data is now stored in Supabase Auth');
  return { success: true, needsManualSetup: false };
}