import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '/utils/supabase'; // ✅ FIXED: Use correct path
import { Lock, Eye, EyeOff, Clock, RefreshCw, KeyRound, ArrowLeft } from 'lucide-react';
import { sendForgotPasswordEmail } from '@/lib/emailService';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(600); // 10 minutes
  const [step, setStep] = useState<'code' | 'password'>('code');

  // Try to get data from location.state first, then fallback to sessionStorage
  const getResetData = () => {
    // First try location.state
    if (location.state?.email && location.state?.verificationCode) {
      console.info('✅ Using reset data from location.state');
      return location.state;
    }

    // Fallback to sessionStorage
    const stored = sessionStorage.getItem('pendingReset');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        // Check if data is not too old (max 15 minutes)
        const age = Date.now() - (data.timestamp || 0);
        if (age < 15 * 60 * 1000) {
          console.info('✅ Using reset data from sessionStorage');
          return data;
        } else {
          console.info('⏰ Stored reset data expired');
          sessionStorage.removeItem('pendingReset');
        }
      } catch (e) {
        console.error('❌ Failed to parse stored reset data');
        sessionStorage.removeItem('pendingReset');
      }
    }

    console.info('❌ No valid reset data found');
    return null;
  };

  const resetData = getResetData();

  // Get email from data
  const email = resetData?.email || '';
  const name = resetData?.name || '';
  const verificationCode = resetData?.verificationCode || '';

  useEffect(() => {
    console.info('🔍 [ResetPasswordPage] Component mounted');
    console.info('🔍 [ResetPasswordPage] Location state:', location.state);
    console.info('🔍 [ResetPasswordPage] SessionStorage:', sessionStorage.getItem('pendingReset'));
    console.info('🔍 [ResetPasswordPage] Parsed data:', {
      email,
      name,
      verificationCode: verificationCode ? '✅ Present' : '❌ Missing'
    });

    if (!email || !verificationCode) {
      console.error('❌ [ResetPasswordPage] Missing reset data - redirecting back');
      
      // ✅ FIXED: Reduce delay and show error immediately for better UX
      toast.error('Sesi reset password tidak valid. Silakan coba lagi.', {
        duration: 5000,
      });
      
      // Redirect immediately
      navigate('/forgot-password', { replace: true });
    }
  }, []); // Only run once on mount

  useEffect(() => {
    // Countdown timer
    if (countdown > 0) {
      const timer = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [countdown]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleInputChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // Only allow digits

    const newCode = [...code];
    newCode[index] = value.slice(-1); // Only take last character
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      if (nextInput) nextInput.focus();
    }

    // Auto-advance to password when all 6 digits entered
    if (newCode.every(digit => digit !== '') && index === 5) {
      setStep('password');
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    const verificationCode = code.join('');

    if (verificationCode.length !== 6) {
      toast.error('Masukkan 6 digit kode verifikasi');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password minimal 6 karakter');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Password tidak cocok');
      return;
    }

    setIsResetting(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-adb995ba/auth/reset-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            email: email,
            code: verificationCode,
            newPassword: newPassword,
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('✅ Password berhasil diubah!');
        
        // Clear sessionStorage after successful reset
        sessionStorage.removeItem('pendingReset');
        console.info('🗑️ Cleared reset data from sessionStorage');
        
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 1000);
      } else {
        toast.error(data.error || 'Kode verifikasi salah atau sudah kadaluarsa');
        setCode(['', '', '', '', '', '']);
        setStep('code');
        document.getElementById('code-0')?.focus();
      }
    } catch (error) {
      console.error('Reset password error:', error);
      toast.error('Terjadi kesalahan saat mengubah password');
    } finally {
      setIsResetting(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-adb995ba/auth/resend-verification`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            email: email,
            type: 'forgot_password',
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        // Send new email
        if (data.verificationCode) {
          const result = await sendForgotPasswordEmail(
            email,
            name,
            data.verificationCode
          );

          if (result.success) {
            toast.success('Kode verifikasi baru telah dikirim');
            setCountdown(600); // Reset timer
            setCode(['', '', '', '', '', '']);
            setStep('code');
            document.getElementById('code-0')?.focus();
          } else {
            toast.error('Gagal mengirim email: ' + result.error);
          }
        }
      } else {
        toast.error(data.error || 'Gagal mengirim ulang kode');
      }
    } catch (error) {
      console.error('Resend error:', error);
      toast.error('Terjadi kesalahan');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-4 relative">
      {/* Tombol Kembali - Compact Design */}
      <Button
        onClick={() => navigate('/forgot-password')}
        variant="ghost"
        className="fixed top-20 left-6 z-50 px-4 py-2 rounded-lg bg-white/80 backdrop-blur-sm hover:bg-white border border-gray-200 shadow-sm transition-all duration-200 hover:shadow-md flex items-center gap-2 text-gray-700 hover:text-green-600"
        aria-label="Kembali"
        title="Kembali ke lupa password"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="font-medium text-sm">Kembali</span>
      </Button>

      <Card className="w-full max-w-md p-8 space-y-6 shadow-xl">
        {/* Icon */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full mb-4">
            <Lock className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Reset Password</h1>
          <p className="text-gray-600 mt-2">
            Kami telah mengirim kode verifikasi ke
          </p>
          <p className="text-green-600 font-semibold break-all">{email}</p>
        </div>

        {/* Countdown Timer */}
        {countdown > 0 ? (
          <div className="flex items-center justify-center gap-2 text-gray-600 bg-green-50 rounded-lg p-3">
            <Clock className="w-4 h-4" />
            <span className="text-sm">
              Kode berlaku selama: <strong className="text-green-600">{formatTime(countdown)}</strong>
            </span>
          </div>
        ) : (
          <div className="text-center bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-600 text-sm font-semibold">⏰ Kode verifikasi telah kedaluwarsa</p>
          </div>
        )}

        <form onSubmit={handleResetPassword} className="space-y-6">
          {/* Step 1: Verification Code */}
          {step === 'code' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
                Masukkan 6 Digit Kode Verifikasi
              </label>
              <div className="flex gap-2 justify-center">
                {code.map((digit, index) => (
                  <Input
                    key={index}
                    id={`code-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleInputChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-12 h-14 text-center text-2xl font-bold border-2 focus:border-green-500 focus:ring-green-500"
                    disabled={countdown === 0}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Step 2: New Password */}
          {step === 'password' && (
            <>
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-3 text-center">
                <p className="text-sm text-green-800 font-medium">
                  ✅ Kode Terverifikasi! Buat password baru Anda.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Password Baru</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      id="newPassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Minimal 6 karakter"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pl-10 pr-10"
                      required
                      autoFocus
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
                      placeholder="Ketik ulang password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
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

                {newPassword && confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-sm text-red-600">Password tidak cocok</p>
                )}
              </div>
            </>
          )}

          {/* Action Buttons */}
          {step === 'code' ? (
            <Button
              type="button"
              onClick={() => {
                if (code.every(digit => digit !== '')) {
                  setStep('password');
                } else {
                  toast.error('Masukkan 6 digit kode verifikasi');
                }
              }}
              disabled={code.some(digit => digit === '') || countdown === 0}
              className="w-full h-12 bg-green-600 hover:bg-green-700"
            >
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5" />
                <span>Lanjutkan</span>
              </div>
            </Button>
          ) : (
            <div className="space-y-3">
              <Button
                type="submit"
                disabled={!newPassword || !confirmPassword || newPassword !== confirmPassword || isResetting}
                className="w-full h-12 bg-green-600 hover:bg-green-700"
              >
                {isResetting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Mengubah Password...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Lock className="w-5 h-5" />
                    <span>Ubah Password</span>
                  </div>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setStep('code');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                className="w-full"
              >
                Kembali ke Input Kode
              </Button>
            </div>
          )}
        </form>

        {/* Resend Button */}
        {step === 'code' && (
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">Tidak menerima kode?</p>
            <Button
              variant="outline"
              onClick={handleResend}
              disabled={isResending || countdown > 540} // Can resend after 1 minute
              className="text-green-600 hover:bg-green-50 border-green-200"
            >
              {isResending ? (
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Mengirim Ulang...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  <span>Kirim Ulang Kode</span>
                </div>
              )}
            </Button>
            {countdown > 540 && (
              <p className="text-xs text-gray-500 mt-1">
                Dapat mengirim ulang setelah {Math.ceil((countdown - 540) / 60)} menit
              </p>
            )}
          </div>
        )}

        {/* Back to Login */}
        <div className="text-center">
          <button
            onClick={() => navigate('/login')}
            className="text-sm text-gray-600 hover:text-green-600 underline"
          >
            Kembali ke halaman login
          </button>
        </div>
      </Card>
    </div>
  );
}