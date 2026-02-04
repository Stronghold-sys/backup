// Get Supabase URL
export function getSupabaseUrl(): string {
  // Hardcoded Figma Make project ID
  const defaultProjectId = 'dazsblmccvxtewtmaljf';
  return `https://${defaultProjectId}.supabase.co`;
}

// Get Supabase Anon Key
export function getSupabaseAnonKey(): string {
  // Hardcoded Figma Make anon key
  const defaultAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhenNibG1jY3Z4dGV3dG1hbGpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NDAwMzIsImV4cCI6MjA3NzIxNjAzMn0.cmoBL0dvnHwp4pnlfnIKCNFwRwzfocRQeKFCba1JlhI';
  return defaultAnonKey;
}

// Get Project ID (for API calls)
export function getProjectId(): string {
  return 'dazsblmccvxtewtmaljf';
}

// Validate configuration
export function validateSupabaseConfig(): { valid: boolean; error?: string } {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();

  if (!url || !url.includes('supabase.co')) {
    return {
      valid: false,
      error: 'Invalid Supabase URL configuration.',
    };
  }

  if (!key || key.length < 100) {
    return {
      valid: false,
      error: 'Invalid Supabase Anon Key configuration.',
    };
  }

  return { valid: true };
}