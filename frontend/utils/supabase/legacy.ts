/**
 * Legacy compatibility layer
 * 
 * This file provides backward compatibility for old imports
 * from '/utils/supabase/info' by re-exporting from the new
 * environment-aware configuration.
 * 
 * DEPRECATED: Use '/utils/supabase' instead
 */

import { projectId, supabaseAnonKey } from './index';

// Export with old naming for backward compatibility
export { projectId };
export const publicAnonKey = supabaseAnonKey;

console.warn(
  '⚠️ DEPRECATED: Importing from \'/utils/supabase/info\' is deprecated.\n' +
  'Please use \'/utils/supabase\' instead for environment-aware configuration.'
);
