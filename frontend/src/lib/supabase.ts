import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { projectId, supabaseAnonKey, supabaseUrl } from '/utils/supabase'; // ✅ FIXED: Use correct path
import { handleApiResponse, type ApiResponse } from './apiHelpers';
import { authStoreHelpers } from './storeV2'; // ✅ NEW: For updating token after refresh

// ✅ VERSION CHECK - To confirm latest version is loaded
console.info('📦 [Supabase] Loading supabase.ts v17.7.0 - ADDED AUTH ENDPOINTS TO PUBLIC');

// ✅ CRITICAL: Global singleton stored in window to survive hot reloads
declare global {
  interface Window {
    __supabaseClient?: SupabaseClient;
  }
}

export const getSupabase = (): SupabaseClient => {
  // ✅ Check global first to survive hot reloads
  if (typeof window !== 'undefined' && window.__supabaseClient) {
    console.info('♻️ [Supabase] Reusing existing singleton client');
    return window.__supabaseClient;
  }
  
  console.info('🔧 [Supabase] Creating new Supabase client (SINGLETON)...');
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
      storageKey: 'sb-dazsblmccvxtewtmaljf-auth-token',
      flowType: 'pkce',
    },
  });
  console.info('✅ [Supabase] Singleton client created successfully');
  
  // ✅ Store in global
  if (typeof window !== 'undefined') {
    window.__supabaseClient = client;
    console.info('✅ [Supabase] Client stored in window.__supabaseClient for persistence');
  }
  
  return client;
};

// ✅ Lazy initialization with proxy
let _supabaseCache: SupabaseClient | null = null;
export const supabase = new Proxy({} as SupabaseClient, {
  get(target, prop) {
    if (!_supabaseCache) {
      _supabaseCache = getSupabase();
    }
    return (_supabaseCache as any)[prop];
  }
});

// ✅ Re-export publicAnonKey
export { supabaseAnonKey };

// ✅ Helper: Logout from Supabase Auth
export const logoutSupabase = async () => {
  try {
    console.info('🔐 [Supabase] Logging out from Supabase Auth...');
    const client = getSupabase();
    const { error } = await client.auth.signOut();
    
    if (error) {
      console.error('❌ [Supabase] Logout error:', error.message);
      return { success: false, error: error.message };
    }
    
    console.info('✅ [Supabase] Logged out successfully from Supabase Auth');
    return { success: true };
  } catch (error: any) {
    // ✅ FIX: Silently ignore AbortError - it's expected when navigating during logout
    if (error.name === 'AbortError') {
      // No logging needed - this is normal behavior during navigation
      return { success: true, aborted: true }; // Mark as aborted but successful
    }
    
    console.error('❌ [Supabase] Logout exception:', error);
    return { success: false, error: error.message };
  }
};

// ✅ Helper: Refresh session to get new access token
export const refreshSession = async () => {
  try {
    console.info('🔄 [Supabase] Refreshing session...');
    const client = getSupabase();
    const { data, error } = await client.auth.refreshSession();
    
    if (error) {
      console.error('❌ [Supabase] Refresh session error:', error.message);
      return { success: false, error: error.message, session: null };
    }
    
    if (!data.session) {
      console.warn('⚠️ [Supabase] No session found after refresh');
      return { success: false, error: 'No session found', session: null };
    }
    
    console.info('✅ [Supabase] Session refreshed successfully');
    return { success: true, session: data.session };
  } catch (error: any) {
    console.error('❌ [Supabase] Refresh session exception:', error);
    return { success: false, error: error.message, session: null };
  }
};

// ✅ API Helper
const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-adb995ba`;

// ✅ Public endpoints that don't require authentication
const PUBLIC_ENDPOINTS = [
  '/maintenance', // GET maintenance status is public
  '/init',        // POST/GET initialization endpoint is public
  '/auth/forgot-password',  // ✅ NEW: Forgot password is public
  '/auth/reset-password',   // ✅ NEW: Reset password is public
  '/auth/resend-verification', // ✅ NEW: Resend verification is public
  '/auth/sign-up',          // ✅ NEW: Sign up is public
  '/auth/sign-in',          // ✅ NEW: Sign in is public
  '/auth/sign-out',         // ✅ NEW: Sign out is public
  '/auth/check-user',       // ✅ NEW v2.1: Check user ban/delete status (called before login)
];

// ✅ Helper function to check if endpoint is public
const isPublicEndpoint = (endpoint: string): boolean => {
  // ✅ FIXED v2.1: Also check if endpoint starts with pattern (for dynamic IDs)
  return PUBLIC_ENDPOINTS.some(publicPath => 
    endpoint === publicPath || 
    endpoint.startsWith(publicPath + '/') ||
    endpoint.includes('/ban-status') // ✅ Ban status check is public for any user
  );
};

// ✅ Global flag to prevent infinite retry loops
let isRefreshingToken = false;

// ✅ ENHANCED: API wrapper WITH auto-token-refresh on 401
const apiCall = async (
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  endpoint: string,
  accessToken?: string | null,
  data?: any,
  isRetry: boolean = false // ✅ NEW: Prevent infinite retries
): Promise<any> => {
  // ✅ DEBUG: Log API call details
  console.info(`🌐 [API ${method}] ${endpoint}`, {
    hasToken: !!accessToken,
    tokenLength: accessToken?.length || 0,
    tokenPreview: accessToken ? `${accessToken.substring(0, 20)}...` : 'NONE'
  });

  // ✅ FIXED: Always send publicAnonKey as Bearer token (for Supabase Edge Functions validation)
  // Send custom session token in separate header (for our app auth)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${supabaseAnonKey}`, // ✅ FIXED: Always use publicAnonKey
  };

  // ✅ Add custom session token if provided
  if (accessToken) {
    headers['X-Session-Token'] = accessToken;
    console.info(`✅ [API ${method}] Token added to X-Session-Token header`);
  } else {
    // ✅ FIX v17.6: Only show warning for non-public endpoints
    if (!isPublicEndpoint(endpoint)) {
      console.warn(`⚠️ [API ${method}] NO TOKEN provided for: ${endpoint}`);
    } else {
      console.info(`📖 [API ${method}] Public endpoint - no token required: ${endpoint}`);
    }
  }

  const options: RequestInit = {
    method,
    headers,
  };

  if (data && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, options);

  if (!response.ok) {
    // ✅ CRITICAL FIX: Clone response before reading to prevent "body stream already read" error
    const responseClone = response.clone();
    let errorData: any = null;
    try {
      errorData = await response.json();
      // ✅ Log error response
      console.error(`❌ [API ${method}] ${response.status} Error:`, errorData);
    } catch (parseError) {
      // ✅ FIX: Use cloned response for text fallback
      try {
        const errorText = await responseClone.text();
        console.error(`❌ [API ${method}] Error text:`, errorText);
      } catch (textError) {
        console.error(`❌ [API ${method}] Could not read error response`);
      }
    }
    
    // ✅ CRITICAL: If error data contains ban/delete info, return it instead of throwing
    if (errorData && (errorData.deleted || errorData.banned)) {
      console.info('🚨 [API] Returning ban/delete error data without throwing');
      return errorData; // Return the error data directly
    }
    
    // ✅ Handle 401 Unauthorized with token refresh
    if (response.status === 401 && !isRetry) {
      console.info('🔄 [API] 401 Unauthorized - Attempting to refresh token...');
      isRefreshingToken = true;
      const refreshResult = await refreshSession();
      isRefreshingToken = false;
      
      if (refreshResult.success && refreshResult.session) {
        console.info('✅ [API] Token refreshed successfully - Retrying request...');
        authStoreHelpers.setToken(refreshResult.session.access_token); // ✅ NEW: Update token in store
        return apiCall(method, endpoint, refreshResult.session.access_token, data, true);
      } else {
        console.error('❌ [API] Token refresh failed:', refreshResult.error);
        throw new Error(`HTTP ${response.status}: ${errorData?.error || 'Request failed'}`);
      }
    }
    
    // ✅ For other errors, create error object with response data attached
    const error: any = new Error(`HTTP ${response.status}: ${errorData?.error || 'Request failed'}`);
    error.response = errorData;
    throw error;
  }

  return response.json();
};

export const api = {
  async get(endpoint: string, accessToken?: string | null) {
    return apiCall('GET', endpoint, accessToken);
  },

  async post(endpoint: string, data?: any, accessToken?: string | null) {
    return apiCall('POST', endpoint, accessToken, data);
  },

  async put(endpoint: string, data?: any, accessToken?: string | null) {
    return apiCall('PUT', endpoint, accessToken, data);
  },

  async delete(endpoint: string, accessToken?: string | null) {
    return apiCall('DELETE', endpoint, accessToken);
  },

  // Helper for multipart/form-data uploads
  async upload(endpoint: string, formData: FormData, accessToken?: string | null) {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${supabaseAnonKey}`,
    };

    // ✅ Add custom session token if provided
    if (accessToken) {
      headers['X-Session-Token'] = accessToken;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      
      if (response.status === 401) {
        console.warn('⚠️ [API] 401 Unauthorized on upload:', endpoint);
      }
      
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return response.json();
  },
};