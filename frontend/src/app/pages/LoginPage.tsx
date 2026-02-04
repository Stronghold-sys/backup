import { useNotificationStore } from '@/lib/notificationStore';
import BanNotification from '@/app/components/BanNotification';
import { Link, useNavigate, useLocation } from 'react-router';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { api } from '@/lib/supabase';
import { useAuthStore } from '@/lib/store';
import { toast } from 'sonner';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, AlertTriangle, XCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser, user, accessToken } = useAuthStore();
  const { banNotification, deletedNotification, setBanNotification, setDeletedNotification, clearBanNotification, clearDeletedNotification } = useNotificationStore();
  const [isBanNotificationOpen, setIsBanNotificationOpen] = useState(false);
  const [isDeletedNotificationOpen, setIsDeletedNotificationOpen] = useState(false);
  
  //  TESTING: Pre-fill admin credentials for easy testing
  const [formData, setFormData] = useState({ 
    email: '', 
    password: '' 
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showInitWarning, setShowInitWarning] = useState(false);

  const returnTo = location.state?.from;

  // Check if app is initializing (first 15 seconds after page load)
  useEffect(() => {
    const loadTime = Date.now();
    const timer = setTimeout(() => {
      const elapsed = Date.now() - loadTime;
      if (elapsed < 15000) {
        // If less than 15 seconds have passed, might still be initializing
        setShowInitWarning(true);
      }
    }, 2000);
    
    // Hide warning after 20 seconds (initialization should be done)
    const hideTimer = setTimeout(() => {
      setShowInitWarning(false);
    }, 20000);
    
    return () => {
      clearTimeout(timer);
      clearTimeout(hideTimer);
    };
  }, []);

  // ✅ FIX v16.9: SIMPLIFIED - Only check store, NO Supabase calls
  // useAuthListener handles all session restoration
  useEffect(() => {
    // Quick check from store ONLY - no async calls
    if (user && accessToken) {
      const destination = returnTo || (user.role === 'admin' ? '/admin' : '/');
      navigate(destination, { replace: true });
    }
    // ✅ Run only once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps = check once on mount, no Supabase calls

  // ✅ FIXED: Check for pending notifications from Zustand store (NO localStorage)
  useEffect(() => {
    // Check for ban notification from store
    if (banNotification) {
      setIsBanNotificationOpen(true);
    }

    // Check for deleted notification from store
    if (deletedNotification) {
      setIsDeletedNotificationOpen(true);
    }
  }, [banNotification, deletedNotification]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // ✅ CRITICAL FIX: Sign in directly to Supabase from frontend
      // This creates the session on CLIENT side (where it's needed)
      const { supabase } = await import('@/lib/supabase');
      
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });
      
      if (authError) {
        // Check with backend for specific errors (ban, deleted, etc)
        const response = await api.post('/auth/check-user', { email: formData.email });
        
        // Check for deleted account
        if (response.deleted && response.deletedData) {
          setDeletedNotification(response.deletedData);
          setIsDeletedNotificationOpen(true);
          setIsLoading(false);
          return;
        }
        
        // Check for banned account
        if (response.banned && response.banData) {
          setBanNotification(response.banData);
          setIsBanNotificationOpen(true);
          setIsLoading(false);
          return;
        }
        
        // Generic error
        toast.error('Email atau password salah', {
          description: 'Pastikan email dan password sudah benar, atau buat akun baru di halaman Register',
          duration: 6000,
        });
        
        setIsLoading(false);
        return;
      }
      
      if (!authData.user || !authData.session) {
        toast.error('Login gagal. Silakan coba lagi.');
        setIsLoading(false);
        return;
      }
      
      // Get user metadata
      const metadata = authData.user.user_metadata || {};
      const user = {
        id: authData.user.id,
        email: authData.user.email || '',
        name: metadata.name || metadata.display_name || (authData.user.email === 'utskelompok03@gmail.com' ? 'Admin' : authData.user.email?.split('@')[0]) || 'Unknown',
        role: metadata.role || 'user',
        status: metadata.status || 'active',
        avatar: metadata.avatar || undefined,
        phone: authData.user.phone || metadata.phone || undefined,
        addresses: metadata.addresses || [],
      };
      
      // ✅ Check with backend for ban/suspend status
      const checkResponse = await api.post('/auth/check-user', { 
        email: user.email,
        userId: user.id 
      });
      
      // Check for deleted account
      if (checkResponse.deleted && checkResponse.deletedData) {
        await supabase.auth.signOut(); // Sign out from Supabase
        setDeletedNotification(checkResponse.deletedData);
        setIsDeletedNotificationOpen(true);
        setIsLoading(false);
        return;
      }
      
      // Check for banned account
      if (checkResponse.banned && checkResponse.banData) {
        await supabase.auth.signOut(); // Sign out from Supabase
        setBanNotification(checkResponse.banData);
        setIsBanNotificationOpen(true);
        setIsLoading(false);
        return;
      }
      
      // Check user status
      if (user.status !== 'active') {
        await supabase.auth.signOut(); // Sign out from Supabase
        toast.error('Akun Anda sedang diblokir atau disuspend. Silakan hubungi admin.');
        setIsLoading(false);
        return;
      }
      
      // ✅ Save user to store with access token from session
      setUser(user, authData.session.access_token);
      
      // ✅ NEW: Also save refresh token
      const { authStoreInstance } = await import('@/lib/store');
      authStoreInstance.setState({ 
        refreshToken: authData.session.refresh_token 
      });
      
      console.info('✅ [LoginPage] Tokens saved:', {
        accessToken: authData.session.access_token.substring(0, 20) + '...',
        refreshToken: authData.session.refresh_token.substring(0, 20) + '...',
      });
      
      toast.success('Berhasil masuk!');
      
      // ✅ FIX v16.8: Give MORE time for state to propagate to ALL subscribers
      // This ensures Navbar and ProtectedRoute receive updates before navigation
      await new Promise(resolve => {
        // First RAF - wait for React to schedule updates
        requestAnimationFrame(() => {
          // Second RAF - wait for React to apply updates
          requestAnimationFrame(() => {
            // Third RAF - wait for all components to re-render
            requestAnimationFrame(() => {
              resolve(true);
            });
          });
        });
      });
      
      // ✅ Navigate after GUARANTEED state propagation
      const destination = returnTo || (user.role === 'admin' ? '/admin' : '/');
      // ✅ CRITICAL: Use replace to avoid back button issues
      navigate(destination, { replace: true });
      
      // Clean up loading state
      setIsLoading(false);
    } catch (error: any) {
      // ✅ CRITICAL FIX: Check if error response contains ban/delete data
      // This handles cases where API returns 403 status but fetch throws error
      if (error.response) {
        const errorData = error.response;
        
        // Check for deleted account
        if (errorData.deleted && errorData.deletedData) {
          setDeletedNotification(errorData.deletedData);
          setIsDeletedNotificationOpen(true);
          setIsLoading(false);
          return;
        }
        
        // Check for banned account
        if (errorData.banned && errorData.banData) {
          setBanNotification(errorData.banData);
          setIsBanNotificationOpen(true);
          setIsLoading(false);
          return;
        }
      }
      
      toast.error('Terjadi kesalahan saat login', {
        description: 'Silakan coba lagi atau buat akun baru di halaman Register',
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-4">
      {/* Tombol Kembali - Compact Design */}
      <Button
        onClick={() => navigate('/')}
        variant="ghost"
        className="fixed top-20 left-6 z-50 px-4 py-2 rounded-lg bg-white/80 backdrop-blur-sm hover:bg-white border border-gray-200 shadow-sm transition-all duration-200 hover:shadow-md flex items-center gap-2 text-gray-700 hover:text-green-600"
        aria-label="Kembali"
        title="Kembali ke halaman utama"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="font-medium text-sm">Kembali</span>
      </Button>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-2">
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-2xl">M</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">MarketHub</span>
          </div>
        </div>

        <Card className="shadow-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Masuk ke Akun</CardTitle>
            <CardDescription className="text-center">
              Masukkan email dan password Anda untuk melanjutkan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="nama@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="•••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2 text-sm">
                  <input type="checkbox" className="rounded border-gray-300 text-green-600 focus:ring-green-500" />
                  <span>Ingat saya</span>
                </label>
                <Link to="/forgot-password" className="text-sm text-green-600 hover:text-green-700 font-medium">
                  Lupa password?
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 h-11"
                disabled={isLoading}
              >
                {isLoading ? 'Memproses...' : 'Masuk'}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm">
              <span className="text-gray-600">Belum punya akun?</span>{' '}
              <Link to="/register" state={{ returnTo }} className="text-green-600 hover:underline font-medium">
                Daftar sekarang
              </Link>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-gray-500 mt-6">
          Dengan masuk, Anda menyetujui <a href="#" className="text-green-600 hover:underline">Syarat & Ketentuan</a> dan{' '}
          <a href="#" className="text-green-600 hover:underline">Kebijakan Privasi</a> kami
        </p>
      </div>

      {/* ✅ FIXED: Ban Notification - Uses BanNotification component with countdown */}
      {banNotification && isBanNotificationOpen && (
        <BanNotification
          isOpen={isBanNotificationOpen}
          onClose={() => {
            setIsBanNotificationOpen(false);
            clearBanNotification();
          }}
          banData={banNotification}
        />
      )}

      {/* ✅ FIXED: Deleted Account Notification - Uses notification store data */}
      {deletedNotification && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full bg-white shadow-2xl">
            <CardHeader className="text-center border-b pb-4">
              <div className="flex justify-center mb-3">
                <XCircle className="w-16 h-16 text-gray-500" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">Akun Telah Dihapus</CardTitle>
              <CardDescription className="text-gray-600 mt-2">
                Akun Anda telah dihapus secara permanen oleh administrator
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 mb-1">Alasan:</p>
                    <p className="text-gray-800">{deletedNotification.reason}</p>
                  </div>
                </div>
              </div>
              
              <div className="text-sm text-gray-600 space-y-1">
                <p>Dihapus pada: <span className="font-medium">{new Date(deletedNotification.deletedAt).toLocaleString('id-ID')}</span></p>
                <p>Oleh: <span className="font-medium">{deletedNotification.deletedBy}</span></p>
              </div>
              
              <Button
                onClick={() => {
                  setIsDeletedNotificationOpen(false);
                  clearDeletedNotification();
                }}
                className="w-full mt-6 bg-gray-600 hover:bg-gray-700"
              >
                Tutup
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}