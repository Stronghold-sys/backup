import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { api } from '@/lib/supabase';
import { toast } from 'sonner';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, XCircle, ShieldAlert } from 'lucide-react';
import { sendForgotPasswordEmail } from '@/lib/emailService';
import { useVerificationStore } from '@/lib/verificationStore';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { setResetData } = useVerificationStore(); // ✅ NEW: Use verification store
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [email, setEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [errorMessage, setErrorMessage] = useState<{ type: string; message: string } | null>(null);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null); // Clear previous errors

    try {
      console.info('🔐 Requesting password reset for:', email);
      
      const response = await api.post('/auth/forgot-password', { email });
      
      console.info('📥 Response:', response);

      if (response.success) {
        console.info('✅ Reset code sent successfully');
        
        // Send email via EmailJS
        if (response.verificationCode) {
          const emailResult = await sendForgotPasswordEmail(
            response.email,
            response.name,
            response.verificationCode
          );

          if (emailResult.success) {
            toast.success('Kode reset telah dikirim ke email Anda!');
            
            // ✅ CRITICAL FIX: Store reset data in BOTH Zustand store AND sessionStorage
            const resetDataStore = {
              email: email,
              name: response.name,
              verificationCode: response.verificationCode,
              resetId: response.verificationCode,
              timestamp: Date.now()
            };
            
            // Save to Zustand store
            setResetData(resetDataStore);
            console.info('💾 Stored reset data in Zustand store');
            
            // ✅ CRITICAL: Also save to sessionStorage for persistence
            sessionStorage.setItem('pendingReset', JSON.stringify(resetDataStore));
            console.info('💾 Stored reset data in sessionStorage');
            
            // ✅ IMPORTANT: Wait a bit to ensure sessionStorage is written
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Navigate to reset password page with data
            navigate('/reset-password', {
              state: resetDataStore,
              replace: true
            });
          } else {
            setErrorMessage({ type: 'email_error', message: 'Gagal mengirim email: ' + emailResult.error });
            toast.error('Gagal mengirim email: ' + emailResult.error);
          }
        }
      } else {
        console.info('❌ Request failed:', response);
        
        // Set inline error message
        if (response.error === 'Email tidak terdaftar') {
          setErrorMessage({ 
            type: 'not_found', 
            message: response.message || 'Email yang Anda masukkan tidak terdaftar dalam sistem. Silakan periksa kembali atau daftar akun baru.'
          });
        } else if (response.error === 'Akun telah dihapus') {
          setErrorMessage({ 
            type: 'deleted', 
            message: response.message || 'Akun dengan email ini telah dihapus oleh administrator.'
          });
        } else if (response.error === 'Akun diblokir') {
          setErrorMessage({ 
            type: 'banned', 
            message: response.message || 'Akun Anda telah diblokir oleh administrator.'
          });
        } else {
          setErrorMessage({ 
            type: 'general', 
            message: response.error || 'Terjadi kesalahan. Silakan coba lagi.'
          });
        }
        
        // Also show toast for immediate feedback
        toast.error(response.error || 'Terjadi kesalahan. Silakan coba lagi.');
      }
    } catch (error: any) {
      console.error('💥 Request error:', error);
      setErrorMessage({ 
        type: 'network', 
        message: 'Terjadi kesalahan jaringan. Silakan coba lagi.'
      });
      toast.error('Terjadi kesalahan jaringan. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate passwords
    if (newPassword !== confirmPassword) {
      toast.error('Password tidak cocok');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password minimal 6 karakter');
      return;
    }

    setIsLoading(true);

    try {
      console.info('🔐 Verifying reset code and changing password...');
      
      const response = await api.post('/auth/reset-password', {
        email,
        code: resetCode,
        newPassword,
      });
      
      console.info('📥 Response:', response);

      if (response.success) {
        console.info('✅ Password changed successfully');
        toast.success('Password berhasil diubah! Silakan login.');
        setTimeout(() => {
          navigate('/login');
        }, 1500);
      } else {
        console.info('❌ Reset failed:', response);
        toast.error(response.error || 'Kode reset salah atau sudah kadaluarsa');
      }
    } catch (error: any) {
      console.error('💥 Reset error:', error);
      toast.error('Terjadi kesalahan. Silakan coba lagi.');
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
            <CardTitle className="text-2xl font-bold text-center">
              {step === 'request' ? 'Lupa Password?' : 'Reset Password'}
            </CardTitle>
            <CardDescription className="text-center">
              {step === 'request'
                ? 'Masukkan email Anda untuk menerima kode reset password'
                : 'Masukkan kode yang dikirim ke email Anda'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 'request' ? (
              // Step 1: Request Reset Code
              <form onSubmit={handleRequestReset} className="space-y-4">
                {/* Error Message Alert */}
                {errorMessage && (
                  <Alert 
                    variant="destructive" 
                    className={`
                      ${errorMessage.type === 'not_found' ? 'bg-red-50 border-red-200 text-red-900' : ''}
                      ${errorMessage.type === 'deleted' ? 'bg-orange-50 border-orange-200 text-orange-900' : ''}
                      ${errorMessage.type === 'banned' ? 'bg-yellow-50 border-yellow-200 text-yellow-900' : ''}
                      ${errorMessage.type === 'network' ? 'bg-gray-50 border-gray-200 text-gray-900' : ''}
                    `}
                  >
                    {errorMessage.type === 'not_found' && <XCircle className="h-5 w-5 text-red-600" />}
                    {errorMessage.type === 'deleted' && <AlertCircle className="h-5 w-5 text-orange-600" />}
                    {errorMessage.type === 'banned' && <ShieldAlert className="h-5 w-5 text-yellow-600" />}
                    {errorMessage.type === 'network' && <AlertCircle className="h-5 w-5 text-gray-600" />}
                    <AlertDescription className="ml-2">
                      <span className="font-semibold block mb-1">
                        {errorMessage.type === 'not_found' && 'Email Tidak Terdaftar'}
                        {errorMessage.type === 'deleted' && 'Akun Telah Dihapus'}
                        {errorMessage.type === 'banned' && 'Akun Diblokir'}
                        {errorMessage.type === 'network' && 'Kesalahan Jaringan'}
                        {errorMessage.type === 'general' && 'Terjadi Kesalahan'}
                      </span>
                      <span className="text-sm">{errorMessage.message}</span>
                      {errorMessage.type === 'not_found' && (
                        <div className="mt-3 pt-3 border-t border-red-200">
                          <p className="text-sm font-medium mb-2">Saran:</p>
                          <ul className="text-sm space-y-1 ml-4 list-disc">
                            <li>Periksa kembali ejaan email Anda</li>
                            <li>Pastikan menggunakan email yang benar</li>
                            <li>
                              Belum punya akun? {' '}
                              <Link to="/register" className="font-semibold text-red-700 hover:underline">
                                Daftar di sini
                              </Link>
                            </li>
                          </ul>
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                {emailSent && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-900">
                        Kode reset telah dikirim!
                      </p>
                      <p className="text-xs text-green-700 mt-1">
                        Silakan cek email Anda dan masukkan kode yang dikirim.
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="nama@email.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setErrorMessage(null); // Clear error when user types
                      }}
                      className="pl-10"
                      required
                      disabled={emailSent}
                    />
                  </div>
                </div>

                {!emailSent ? (
                  <Button
                    type="submit"
                    className="w-full bg-green-600 hover:bg-green-700 h-11"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Mengirim...' : 'Kirim Kode Reset'}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={() => setStep('verify')}
                    className="w-full bg-green-600 hover:bg-green-700 h-11"
                  >
                    Lanjut ke Verifikasi
                  </Button>
                )}

                <div className="flex items-center justify-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-sm"
                    onClick={() => {
                      setEmailSent(false);
                      setEmail('');
                    }}
                    disabled={!emailSent}
                  >
                    Kirim Ulang Kode
                  </Button>
                </div>

                <div className="text-center text-sm">
                  <span className="text-gray-600">Sudah ingat password?</span>{' '}
                  <Link to="/login" className="text-green-600 hover:underline font-medium">
                    Kembali ke Login
                  </Link>
                </div>
              </form>
            ) : (
              // Step 2: Verify Code & Reset Password
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3 mb-4">
                  <AlertCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-900">
                      Kode dikirim ke: {email}
                    </p>
                    <p className="text-xs text-green-700 mt-1">
                      Kode berlaku selama 15 menit
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="resetCode">Kode Reset (6 Digit)</Label>
                  <Input
                    id="resetCode"
                    type="text"
                    placeholder="123456"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="text-center text-2xl font-mono tracking-widest"
                    maxLength={6}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">Password Baru</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="Minimal 6 karakter"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Ketik ulang password baru"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>

                {newPassword && confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-red-600">
                    Password tidak cocok
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full bg-green-600 hover:bg-green-700 h-11"
                  disabled={isLoading || !resetCode || newPassword !== confirmPassword}
                >
                  {isLoading ? 'Memproses...' : 'Reset Password'}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setStep('request');
                    setResetCode('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                >
                  Kembali ke Input Email
                </Button>

                <div className="text-center text-sm">
                  <span className="text-gray-600">Sudah ingat password?</span>{' '}
                  <Link to="/login" className="text-green-600 hover:underline font-medium">
                    Kembali ke Login
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-gray-500 mt-6">
          Tidak menerima kode? Periksa folder spam atau kirim ulang kode.
        </p>
      </div>
    </div>
  );
}