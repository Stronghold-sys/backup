/**
 * 🔐 Auth Helper Functions
 * ✅ v17.5 FIX: Enhanced with automatic token refresh to prevent expired token errors
 */

import { authStoreInstance } from './store';

/**
 * Get access token from Supabase Auth session (primary) or auth store (fallback)
 * ✅ v17.5: Enhanced with automatic token refresh
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    // ✅ PRIORITY 1: Get from Supabase Auth session with auto-refresh
    const { supabase, refreshSession } = await import('./supabase');
    
    // ✅ CRITICAL FIX: Use getSession first (faster), then refresh if needed
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      // ✅ SILENT: Only log critical errors in dev mode
      if (import.meta.env.DEV && error.message && !error.message.includes('session')) {
        console.warn('⚠️ [AuthHelper] Supabase session error:', error.message);
      }
    }
    
    // ✅ NEW: Check if session exists but might be expired/expiring
    if (session?.access_token) {
      // ✅ Check if token is about to expire (within 1 minute)
      const expiresAt = session.expires_at;
      if (expiresAt) {
        const now = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = expiresAt - now;
        
        // ✅ If token expires in less than 60 seconds, refresh it proactively
        if (timeUntilExpiry < 60) {
          if (import.meta.env.DEV) {
            console.info('🔄 [AuthHelper] Token expiring soon, refreshing...');
          }
          
          const refreshResult = await refreshSession();
          if (refreshResult.success && refreshResult.session) {
            // Update store with new token
            authStoreInstance.setState({ accessToken: refreshResult.session.access_token });
            return refreshResult.session.access_token;
          }
        }
      }
      
      // Token is still valid
      return session.access_token;
    }
    
    // ✅ PRIORITY 2: No session, try to refresh using stored refresh token
    const { refreshToken } = authStoreInstance.getState();
    if (refreshToken) {
      if (import.meta.env.DEV) {
        console.info('🔄 [AuthHelper] No active session, attempting refresh...');
      }
      
      const refreshResult = await refreshSession();
      if (refreshResult.success && refreshResult.session) {
        authStoreInstance.setState({ accessToken: refreshResult.session.access_token });
        return refreshResult.session.access_token;
      }
    }
    
    // ✅ PRIORITY 3: Fallback to store (in-memory)
    const { accessToken } = authStoreInstance.getState();
    if (accessToken) {
      return accessToken;
    }
    
    // ✅ ULTRA SILENT: No warnings at all
    // This is normal - user is simply not logged in
    return null;
  } catch (error) {
    // ✅ SILENT: Only log if actual error (not "no token")
    if (import.meta.env.DEV) {
      console.error('❌ [AuthHelper] Critical error getting access token:', error);
    }
    
    // Last resort: Try store only
    const { accessToken } = authStoreInstance.getState();
    return accessToken || null;
  }
}

/**
 * Synchronous version - gets token from store only (for immediate use)
 * Use async version (getAccessToken) when possible
 */
export function getAccessTokenSync(): string | null {
  const { accessToken } = authStoreInstance.getState();
  return accessToken;
}
