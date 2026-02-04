/**
 * Supabase Utilities - Compatible with both Figma Make and Local Development
 * 
 * This file exports Supabase credentials that work in both environments:
 * - Figma Make: Uses hardcoded values from info.tsx
 * - Local Dev: Uses .env file via import.meta.env
 */

import { getSupabaseUrl, getSupabaseAnonKey, getProjectId } from './config';

// Export URL, key, and project ID
// These can be imported with: import { supabaseUrl, supabaseAnonKey, projectId } from '/utils/supabase'
export const supabaseUrl = getSupabaseUrl();
export const supabaseAnonKey = getSupabaseAnonKey();
export const projectId = getProjectId();

// For backward compatibility with old imports
// import { publicAnonKey, projectId } from '/utils/supabase/info'
export const publicAnonKey = supabaseAnonKey;

// ✅ REMOVED: Don't re-export from client.ts to avoid duplicate Supabase instances
// Instead, use the singleton from @/lib/supabase