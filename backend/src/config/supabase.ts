import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';

// Service role client (admin privileges)
export const supabaseAdmin: SupabaseClient = createClient(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

// Anonymous client (public access)
export const supabaseAnon: SupabaseClient = createClient(
    env.SUPABASE_URL,
    env.SUPABASE_ANON_KEY
);

// Helper function to get Supabase client
export function getSupabase(): SupabaseClient {
    return supabaseAdmin;
}
