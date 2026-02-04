import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { api } from '@/lib/supabase';
import { toast } from 'sonner';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, User as UserIcon } from 'lucide-react';
import { useVerificationStore } from '@/lib/verificationStore';

export default function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setVerificationData } = useVerificationStore(); // ✅ NEW: Use verification store
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  // Get returnTo from location state
  const returnTo = (location.state as any)?.returnTo || null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Password tidak cocok');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password minimal 6 karakter');
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post('/auth/signup', {
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });

      if (response.success) {
        // Don't show toast here - VerifyEmailPage will show it
        // This prevents duplicate toasts
        
        // Ensure all data is present before navigating
        if (!response.verificationCode || !response.voucher) {
          toast.error('Terjadi kesalahan. Silakan coba lagi.');
          return;
        }
        
        // ✅ FIXED: Store verification data in Zustand store (NO sessionStorage)
        const verificationDataStore = {
          email: formData.email,
          name: formData.name,
          voucherCode: response.voucher?.code,
          verificationId: response.verificationCode,
          returnTo: returnTo,
          timestamp: Date.now()
        };
        setVerificationData(verificationDataStore);
        
        // Navigate to verification page with email and voucher data
        navigate('/verify-email', {
          replace: false,
          state: {
            email: formData.email,
            name: formData.name,
            verificationCode: response.verificationCode,
            voucher: response.voucher,
            returnTo: returnTo,
          }
        });
      } else {
        // Show specific error message from backend
        if (response.error) {
          toast.error(response.error);
        } else {
          toast.error('Gagal membuat akun. Silakan coba lagi.');
        }
      }
    } catch (error: any) {
      // ✅ Parse error message from backend
      let errorMessage = 'Terjadi kesalahan saat mendaftar. Silakan coba lagi.';
      
      if (error.message) {
        // Check if error message contains JSON
        const jsonMatch = error.message.match(/\{.*\}/);
        if (jsonMatch) {
          try {
            const errorObj = JSON.parse(jsonMatch[0]);
            if (errorObj.error) {
              errorMessage = errorObj.error;
              
              // ✅ Special handling for duplicate email
              if (errorMessage.toLowerCase().includes('email sudah terdaftar') || 
                  errorMessage.toLowerCase().includes('email already registered') ||
                  errorMessage.toLowerCase().includes('already exists')) {
                // ✅ Provide actionable guidance
                toast.error('Email sudah terdaftar', {
                  description: 'Sudah punya akun? Silakan login atau gunakan email lain.',
                  duration: 5000,
                  action: {
                    label: 'Login',
                    onClick: () => navigate('/login', { state: { returnTo } })
                  }
                });
                return; // Don't show second toast
              }
            }
          } catch {
            // Not valid JSON, use original message
            errorMessage = error.message;
          }
        } else if (error.message.includes('HTTP')) {
          // Extract message after HTTP status
          const parts = error.message.split(':');
          if (parts.length > 1) {
            errorMessage = parts.slice(1).join(':').trim();
          }
        } else {
          errorMessage = error.message;
        }
      }
      
      toast.error(errorMessage);
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
            <CardTitle className="text-2xl font-bold text-center">Buat Akun Baru</CardTitle>
            <CardDescription className="text-center">
              Daftar untuk mulai berbelanja di MarketHub
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nama Lengkap</Label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

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
                    placeholder="Minimal 6 karakter"
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

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Ulangi password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <input
                  type="checkbox"
                  id="terms"
                  className="mt-1 rounded border-gray-300 text-green-600 focus:ring-green-500"
                  required
                />
                <label htmlFor="terms" className="text-sm text-gray-600">
                  Saya menyetujui{' '}
                  <a href="#" className="text-green-600 hover:underline">
                    Syarat & Ketentuan
                  </a>{' '}
                  dan{' '}
                  <a href="#" className="text-green-600 hover:underline">
                    Kebijakan Privasi
                  </a>
                </label>
              </div>

              <Button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 h-11"
                disabled={isLoading}
              >
                {isLoading ? 'Memproses...' : 'Daftar Sekarang'}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-gray-600">Sudah punya akun? </span>
              <Link to="/login" state={{ returnTo }} className="text-green-600 hover:text-green-700 font-medium">
                Masuk di sini
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}