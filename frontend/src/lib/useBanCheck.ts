import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuthStore } from './store';
import { api } from './supabase';
import { toast } from 'sonner';
import { useNotificationStore } from './notificationStore';

/**
 * Custom hook to check if current user is banned
 * Auto-logout and redirect to login if banned
 */
export function useBanCheck() {
  const { user, accessToken, logout } = useAuthStore();
  const { setBanNotification } = useNotificationStore();
  const navigate = useNavigate();

  console.info('[useBanCheck] Hook called - user:', user?.id);

  useEffect(() => {
    // Only run if user is logged in
    if (!user || !accessToken) {
      return;
    }

    const checkBanStatus = async () => {
      try {
        console.info(`[useBanCheck] Checking ban status for user: ${user.id}`);
        
        // Check ban status from backend (no auth required - public endpoint)
        // ✅ FIXED: Don't pass accessToken because endpoint doesn't require auth
        const response = await api.get(`/users/${user.id}/ban-status`);
        
        console.info(`[useBanCheck] Ban status response:`, response);

        if (response.success && response.banned && response.banData) {
          console.info('🚫 User is banned, logging out...');
          console.info('Ban data:', response.banData);
          
          // ✅ FIXED: Save ban data to Zustand store (NO localStorage)
          setBanNotification(response.banData);
          
          // Logout user
          logout();
          
          // Show toast
          toast.error('Akun Anda telah di-suspend/ban oleh admin');
          
          // Redirect to login
          navigate('/login', { replace: true });
        } else {
          console.info(`[useBanCheck] User is not banned (banned: ${response.banned})`);
        }
      } catch (error) {
        // Silently fail - don't spam errors if endpoint not ready
        console.info('[useBanCheck] Could not check ban status:', error instanceof Error ? error.message : 'Unknown error');
      }
    };

    // Check immediately
    checkBanStatus();

    // Check every 30 seconds
    const interval = setInterval(checkBanStatus, 30000);

    return () => clearInterval(interval);
    // ✅ FIXED: Remove logout, navigate, and setBanNotification from deps to prevent infinite loop
    // These functions are stable and don't need to be dependencies
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, accessToken]); // ✅ ONLY depend on user.id and accessToken
}