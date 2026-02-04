import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '/utils/supabase'; // ✅ FIXED: Use correct path
import { useAuthStore } from '@/lib/store';
import { ShieldCheck, Mail, Clock, RefreshCw, ArrowLeft } from 'lucide-react';
import { sendVerificationEmail } from '@/lib/emailService';
import { useVerificationStore } from '@/lib/verificationStore';

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useAuthStore();
  const { verificationData, isVerificationValid } = useVerificationStore(); // ✅ NEW: Use verification store

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(600); // 10 minutes

  // Track if email has been sent to prevent duplicate toasts
  const emailSentRef = useRef(false);
  const toastShownRef = useRef(false);

  // ✅ FIXED: Use useMemo to recompute when verificationData changes
  const data = useMemo(() => {
    // First try location.state
    if (location.state?.email && location.state?.verificationCode) {
      console.info('✅ Using verification data from location.state');
      return location.state;
    }

    // ✅ FIXED: Fallback to verification store instead of sessionStorage
    if (verificationData && isVerificationValid()) {
      console.info('✅ Using verification data from verification store');
      return {
        email: verificationData.email,
        name: verificationData.name,
        verificationCode: verificationData.verificationId, // ✅ FIXED: Map verificationId to verificationCode
        voucher: { code: verificationData.voucherCode }, // ✅ FIXED: Map voucherCode to voucher object
        returnTo: verificationData.returnTo || null
      };
    }

    console.info('❌ No valid verification data found');
    return null;
  }, [location.state, verificationData, isVerificationValid]);

  // Get email and voucher from data
  const email = data?.email || '';
  const name = data?.name || '';
  const verificationCode = data?.verificationCode || '';
  const voucher = data?.voucher || null;
  const returnTo = data?.returnTo || null;

  // Debug: Log received state
  useEffect(() => {
    console.info('🔍 [VerifyEmailPage] Component mounted');
    console.info('🔍 [VerifyEmailPage] Location state:', location.state);
    console.info('🔍 [VerifyEmailPage] Verification store:', verificationData);
    console.info('🔍 [VerifyEmailPage] Parsed data:', {
      email,
      name,
      verificationCode: verificationCode ? '✅ Present' : '❌ Missing',
      voucher: voucher ? '✅ Present' : '❌ Missing',
      returnTo
    });
    
    // ✅ FIXED: Log success when data is found
    if (email && verificationCode) {
      console.info('✅ [VerifyEmailPage] All verification data present and valid');
    } else {
      console.warn('❌ [VerifyEmailPage] Missing verification data');
      console.warn('   - Location state:', location.state);
      console.warn('   - Verification store:', verificationData);
    }
  }, []);

  // Check if data is missing - redirect only if truly missing
  useEffect(() => {
    if (!email || !verificationCode) {
      console.error('❌ [VerifyEmailPage] Missing verification data');
      console.error('   - Location state:', location.state);
      console.error('   - Verification store:', verificationData);
      
      // Don't show error immediately - maybe data is still loading
      const timer = setTimeout(() => {
        toast.error('Sesi pendaftaran tidak valid. Silakan daftar ulang.');
        navigate('/register', { replace: true });
      }, 500); // Wait longer before redirecting

      return () => clearTimeout(timer);
    }
  }, []); // Only run once on mount

  useEffect(() => {
    // Only send email if we have all required data AND haven't sent yet
    if (!email || !verificationCode || !voucher || emailSentRef.current) {
      if (emailSentRef.current) {
        console.info('⏭️ Email already sent, skipping...');
      } else {
        console.info('⏳ Waiting for verification data...');
      }
      return;
    }

    console.info('📧 Sending verification email to:', email);
    emailSentRef.current = true; // Mark as sent BEFORE calling API

    // Send verification email
    sendVerificationEmail(
      email,
      name,
      verificationCode,
      voucher.code,
      voucher.discountValue
    ).then(result => {
      // Only show toast once
      if (!toastShownRef.current) {
        if (result.success) {
          console.info('✅ Verification email sent successfully');
          toast.success('Kode verifikasi telah dikirim ke email Anda');
          toastShownRef.current = true;
        } else {
          console.error('❌ Failed to send verification email:', result.error);
          toast.error(`Gagal mengirim email: ${result.error || 'Silakan coba lagi'}`, {
            duration: 5000,
          });
          toastShownRef.current = true;
        }
      }
    });
  }, []); // Empty dependency - only run once!

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

    // Auto-verify when all 6 digits entered
    if (newCode.every(digit => digit !== '') && index === 5) {
      handleVerify(newCode.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handleVerify = async (codeString?: string) => {
    const verificationCode = codeString || code.join('');

    if (verificationCode.length !== 6) {
      toast.error('Masukkan 6 digit kode verifikasi');
      return;
    }

    setIsVerifying(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-adb995ba/auth/verify-signup`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            email: email,
            code: verificationCode,
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('✅ Email berhasil diverifikasi!');
        
        // ✅ FIXED: Clear verification data from Zustand store (NO sessionStorage)
        // Data is in-memory only, will be cleared automatically on page reload
        console.info('🗑️ Verification successful - data will be cleared from memory');
        
        // Set user in store
        setUser(data.user, data.accessToken);

        // Show voucher notification
        if (data.voucher) {
          toast.success(
            `🎁 Voucher ${data.voucher.code} telah ditambahkan ke akun Anda!`,
            { duration: 5000 }
          );
        }

        // Navigate to home
        setTimeout(() => {
          navigate(returnTo || '/', { replace: true });
        }, 1000);
      } else {
        toast.error(data.error || 'Kode verifikasi salah');
        setCode(['', '', '', '', '', '']);
        document.getElementById('code-0')?.focus();
      }
    } catch (error) {
      console.error('Verification error:', error);
      toast.error('Terjadi kesalahan saat verifikasi');
    } finally {
      setIsVerifying(false);
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
            type: 'signup',
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        // Send new email
        if (data.verificationCode && data.voucher) {
          const result = await sendVerificationEmail(
            email,
            name,
            data.verificationCode,
            data.voucher.code,
            data.voucher.discountValue
          );

          if (result.success) {
            toast.success('Kode verifikasi baru telah dikirim ke email Anda');
            setCountdown(600); // Reset timer
            setCode(['', '', '', '', '', '']);
            document.getElementById('code-0')?.focus();
          } else {
            // Failed to send email
            toast.error(`Gagal mengirim email: ${result.error || 'Silakan coba lagi'}`, {
              duration: 5000,
            });
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
        onClick={() => navigate('/register')}
        variant="ghost"
        className="fixed top-20 left-6 z-50 px-4 py-2 rounded-lg bg-white/80 backdrop-blur-sm hover:bg-white border border-gray-200 shadow-sm transition-all duration-200 hover:shadow-md flex items-center gap-2 text-gray-700 hover:text-green-600"
        aria-label="Kembali"
        title="Kembali ke halaman pendaftaran"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="font-medium text-sm">Kembali</span>
      </Button>

      <Card className="w-full max-w-md p-8 space-y-6 shadow-xl">
        {/* Icon */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full mb-4">
            <Mail className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Verifikasi Email</h1>
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

        {/* Verification Code Input */}
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
                disabled={isVerifying || countdown === 0}
              />
            ))}
          </div>
        </div>

        {/* Verify Button */}
        <Button
          onClick={() => handleVerify()}
          disabled={code.some(digit => digit === '') || isVerifying || countdown === 0}
          className="w-full h-12 bg-green-600 hover:bg-green-700"
        >
          {isVerifying ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Memverifikasi...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" />
              <span>Verifikasi Email</span>
            </div>
          )}
        </Button>

        {/* Resend Button */}
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

        {/* Info Box */}
        {voucher && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-4 text-center">
            <p className="text-sm text-green-800 font-medium mb-1">
              🎁 Bonus Voucher Menanti!
            </p>
            <p className="text-xs text-green-700">
              Setelah verifikasi, Anda akan mendapatkan voucher diskon <strong>{voucher.discountValue}%</strong>
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}