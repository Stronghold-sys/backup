import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as userStore from './user_store.tsx';
import { uploadImage, deleteImage, BUCKETS, extractFilePathFromUrl } from './storageHelper.tsx';

const profileRoutes = new Hono();

// Middleware untuk verifikasi user menggunakan Supabase Auth
const verifyUser = async (c: any) => {
  // ✅ Support BOTH X-Session-Token AND Authorization header
  let sessionToken = c.req.header('X-Session-Token');
  
  // If no X-Session-Token, try Authorization header
  if (!sessionToken) {
    const authHeader = c.req.header('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      sessionToken = authHeader.substring(7); // Remove 'Bearer ' prefix
    }
  }
  
  if (!sessionToken) {
    return null;
  }

  // ✅ FIX: getUserFromToken returns user object directly (not wrapped in result)
  const user = await userStore.getUserFromToken(sessionToken);
  
  return user; // Returns user object or null
};

// Update profile
profileRoutes.put('/profile', async (c) => {
  const user = await verifyUser(c);
  
  if (!user) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  try {
    const body = await c.req.json();
    const { name, email, phone } = body;

    // Get existing user data from Supabase Auth
    const existingUserResult = await userStore.getUserById(user.id);
    
    if (!existingUserResult.success || !existingUserResult.user) {
      return c.json({ success: false, error: 'User not found' }, 404);
    }
    
    const existingUser = existingUserResult.user;

    // Update user metadata in Supabase Auth
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      email: email || existingUser.email,
      phone: phone || existingUser.phone || undefined,
      user_metadata: {
        ...existingUser,
        name: name || existingUser.name,
        phone: phone || existingUser.phone,
      }
    });
    
    if (updateError) {
      console.error('Error updating profile in Supabase Auth:', updateError);
      return c.json({ success: false, error: 'Failed to update profile' }, 500);
    }

    // Get updated user
    const updatedUserResult = await userStore.getUserById(user.id);
    
    return c.json({ success: true, data: updatedUserResult.user });
  } catch (error) {
    console.error('Error updating profile:', error);
    return c.json({ success: false, error: 'Failed to update profile' }, 500);
  }
});

// ✅ Change password
profileRoutes.post('/profile/change-password', async (c) => {
  const user = await verifyUser(c);
  
  if (!user) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  try {
    const body = await c.req.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return c.json({ success: false, error: 'Password tidak boleh kosong' }, 400);
    }

    if (newPassword.length < 6) {
      return c.json({ success: false, error: 'Password baru minimal 6 karakter' }, 400);
    }

    // Verify current password by attempting to sign in
    const signInResult = await userStore.signInUser(user.email, currentPassword);
    
    if (!signInResult.success) {
      return c.json({ success: false, error: 'Password saat ini salah' }, 400);
    }

    // Update password in Supabase Auth
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      password: newPassword
    });
    
    if (updateError) {
      console.error('Error updating password:', updateError);
      return c.json({ success: false, error: 'Gagal mengubah password' }, 500);
    }

    return c.json({ success: true, message: 'Password berhasil diubah' });
  } catch (error) {
    console.error('Error changing password:', error);
    return c.json({ success: false, error: 'Gagal mengubah password' }, 500);
  }
});

// Get profile
profileRoutes.get('/profile', async (c) => {
  const user = await verifyUser(c);
  
  if (!user) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  try {
    // Get user from Supabase Auth
    const userResult = await userStore.getUserById(user.id);
    
    if (!userResult.success || !userResult.user) {
      return c.json({ success: false, error: 'User not found' }, 404);
    }

    // ✅ FIX: Return 'user' instead of 'data' to match frontend expectations
    return c.json({ success: true, user: userResult.user });
  } catch (error) {
    console.error('Error getting profile:', error);
    return c.json({ success: false, error: 'Failed to get profile' }, 500);
  }
});

// Update addresses
profileRoutes.put('/profile/addresses', async (c) => {
  const user = await verifyUser(c);
  
  if (!user) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  try {
    const body = await c.req.json();
    const { addresses } = body;

    if (!addresses || !Array.isArray(addresses)) {
      return c.json({ success: false, error: 'Invalid addresses data' }, 400);
    }

    // Update addresses in Supabase Auth metadata
    const updateResult = await userStore.updateUserAddresses(user.id, addresses);
    
    if (!updateResult.success) {
      return c.json({ success: false, error: 'Failed to update addresses' }, 500);
    }

    // Get updated user
    const updatedUserResult = await userStore.getUserById(user.id);
    
    return c.json({ success: true, data: updatedUserResult.user });
  } catch (error) {
    console.error('Error updating addresses:', error);
    return c.json({ success: false, error: 'Failed to update addresses' }, 500);
  }
});

export default profileRoutes;