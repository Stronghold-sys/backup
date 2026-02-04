// auth_helper.tsx - Supabase Auth verification helper
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

/**
 * Verify user token using Supabase Auth and sync with KV store
 * @param token - JWT access token from Supabase Auth
 * @returns User object from KV store or null if invalid
 */
export async function verifyUserToken(token: string) {
  try {
    console.log('🔐 [AuthHelper] Verifying token with Supabase Auth...');
    console.log('- Token preview:', token.substring(0, 30) + '...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify token with Supabase Auth
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !authUser) {
      console.error('❌ [AuthHelper] Supabase auth verification failed:', authError?.message);
      return null;
    }
    
    console.log('✅ [AuthHelper] Token verified with Supabase Auth');
    console.log('- User ID:', authUser.id);
    console.log('- Email:', authUser.email);
    
    // Get user from KV store by ID
    let user = await kv.get(`user:${authUser.id}`);
    
    if (!user) {
      console.log('⚠️ [AuthHelper] User not found in KV store, creating from auth data...');
      
      // Create user from auth metadata
      const metadata = authUser.user_metadata || {};
      const newUser = {
        id: authUser.id,
        email: authUser.email || '',
        name: metadata.name || authUser.email?.split('@')[0] || 'User',
        role: metadata.role || 'user',
        status: metadata.status || 'active',
        avatar: metadata.avatar || undefined,
        phone: authUser.phone || metadata.phone || undefined,
        addresses: metadata.addresses || [],
        accessToken: token,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      await kv.set(`user:${authUser.id}`, newUser);
      user = newUser;
      console.log('✅ [AuthHelper] Created new user in KV store');
    }
    
    // Update accessToken in KV store to keep it fresh
    if (user.accessToken !== token) {
      console.log('🔄 [AuthHelper] Updating accessToken in KV store...');
      user.accessToken = token;
      user.updatedAt = new Date().toISOString();
      await kv.set(`user:${user.id}`, user);
      console.log('✅ [AuthHelper] AccessToken updated');
    }
    
    console.log('✅ [AuthHelper] User authenticated:', {
      id: user.id,
      email: user.email,
      role: user.role
    });
    
    return user;
    
  } catch (error: any) {
    console.error('❌ [AuthHelper] Error verifying token:', error);
    return null;
  }
}
