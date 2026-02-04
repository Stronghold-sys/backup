import { useEffect, useState } from 'react';
import { X, CheckCircle, XCircle, Clock, AlertCircle, Smartphone } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { PaymentStatus } from '@/lib/paymentStore';
import { toast } from 'sonner';

interface EWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletType: 'Gopay' | 'OVO' | 'DANA' | 'ShopeePay' | 'LinkAja';
  amount: number;
  orderId: string;
  paymentStatus: PaymentStatus;
  onPaymentStatusChange: (status: PaymentStatus) => void;
  expiryMinutes?: number;
}

export default function EWalletModal({
  isOpen,
  onClose,
  walletType,
  amount,
  orderId,
  paymentStatus,
  onPaymentStatusChange,
  expiryMinutes = 10,
}: EWalletModalProps) {
  const [timeLeft, setTimeLeft] = useState(expiryMinutes * 60); // seconds
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (!isOpen || paymentStatus !== 'waiting_payment') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onPaymentStatusChange('expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, paymentStatus, onPaymentStatusChange]);

  // Simulate payment success after some time (for demo)
  useEffect(() => {
    if (!isOpen || paymentStatus !== 'waiting_payment') return;

    // Simulate payment success after 5 seconds for demo purposes
    const demoTimer = setTimeout(() => {
      if (paymentStatus === 'waiting_payment') {
        onPaymentStatusChange('paid');
      }
    }, 5000); // Changed from 15000 to 5000

    return () => clearTimeout(demoTimer);
  }, [isOpen, paymentStatus, onPaymentStatusChange]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getWalletColor = () => {
    switch (walletType) {
      case 'Gopay':
        return { primary: '#00AA13', secondary: '#E8F5E9' };
      case 'OVO':
        return { primary: '#4D2D8E', secondary: '#EDE7F6' };
      case 'DANA':
        return { primary: '#118EEA', secondary: '#E3F2FD' };
      case 'ShopeePay':
        return { primary: '#EE4D2D', secondary: '#FFEBEE' };
      case 'LinkAja':
        return { primary: '#E31E24', secondary: '#FFEBEE' };
      default:
        return { primary: '#00AA13', secondary: '#E8F5E9' };
    }
  };

  const handleOpenWallet = () => {
    setIsRedirecting(true);
    
    // Simulate opening wallet app (in real app, this would use deep links)
    toast.info(`Membuka aplikasi ${walletType}...`);
    
    // In production, you would use deep links like:
    // - Gopay: gojek://gopay/payment/...
    // - OVO: ovo://payment/...
    // - DANA: dana://payment/...
    // - ShopeePay: shopeeid://payment/...
    // - LinkAja: linkaja://payment/...
    
    setTimeout(() => {
      setIsRedirecting(false);
    }, 2000);
  };

  if (!isOpen) return null;

  const colors = getWalletColor();

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4" 
      style={{ 
        display: 'flex',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(255, 255, 255, 0.95)', // Changed from black to white
      }}
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-white/95 backdrop-blur-sm" // Changed from bg-black/60
        onClick={paymentStatus === 'waiting_payment' ? undefined : onClose}
        style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)' }} // Changed from rgba(0, 0, 0, 0.7)
      />

      {/* Modal */}
      <div 
        className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full animate-in fade-in zoom-in duration-200"
        style={{
          backgroundColor: 'white',
          border: '5px solid #ef4444',
          zIndex: 10000,
          maxHeight: '90vh',
          overflow: 'hidden', // Hide scrollbar
        }}
      >
        {/* Close Button X - Always show */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition z-10 shadow-lg"
        >
          <X className="w-6 h-6 text-white" />
        </button>

        {/* Scrollable content wrapper */}
        <div 
          className="overflow-y-auto scrollbar-hide"
          style={{ 
            maxHeight: 'calc(90vh - 10px)',
            scrollbarWidth: 'none', // Firefox
            msOverflowStyle: 'none', // IE/Edge
            WebkitOverflowScrolling: 'touch', // Smooth scrolling on iOS
          }}
        >

          {/* Content based on status */}
          {paymentStatus === 'waiting_payment' && (
            <div className="p-6 text-center">
              {/* Wallet Icon */}
              <div 
                className="w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ backgroundColor: colors.secondary }}
              >
                <Smartphone className="w-12 h-12" style={{ color: colors.primary }} />
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Bayar dengan {walletType}
              </h2>
              <p className="text-gray-600 mb-6">
                Selesaikan pembayaran di aplikasi {walletType} Anda
              </p>

              {/* Timer */}
              <div className="flex items-center justify-center gap-2 mb-6">
                <Clock className="w-5 h-5 text-orange-500" />
                <span className="text-lg font-semibold text-orange-500">
                  Waktu tersisa: {formatTime(timeLeft)}
                </span>
              </div>

              {/* Payment Details */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Total Pembayaran:</span>
                  <span className="text-2xl font-bold" style={{ color: colors.primary }}>
                    {formatPrice(amount)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">ID Pesanan:</span>
                  <span className="font-mono font-semibold text-gray-900">{orderId}</span>
                </div>
              </div>

              {/* Open Wallet Button */}
              <Button
                onClick={handleOpenWallet}
                disabled={isRedirecting}
                className="w-full h-12 mb-4 text-white font-semibold"
                style={{ 
                  backgroundColor: colors.primary,
                  opacity: isRedirecting ? 0.7 : 1,
                }}
              >
                {isRedirecting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Membuka {walletType}...
                  </>
                ) : (
                  <>
                    <Smartphone className="w-5 h-5 mr-2" />
                    Buka Aplikasi {walletType}
                  </>
                )}
              </Button>

              {/* Instructions */}
              <div 
                className="border rounded-lg p-4 text-left"
                style={{ 
                  backgroundColor: colors.secondary,
                  borderColor: colors.primary + '40',
                }}
              >
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" style={{ color: colors.primary }} />
                  Cara Pembayaran:
                </h3>
                <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                  <li>Klik tombol "Buka Aplikasi {walletType}" di atas</li>
                  <li>Atau buka aplikasi {walletType} secara manual</li>
                  <li>Cek notifikasi pembayaran di aplikasi</li>
                  <li>Konfirmasi dan selesaikan pembayaran</li>
                  <li>Kembali ke halaman ini untuk melihat status</li>
                </ol>
              </div>

              {/* Loading indicator */}
              <div className="mt-6 flex items-center justify-center gap-2 text-gray-500">
                <div 
                  className="animate-spin rounded-full h-5 w-5 border-b-2"
                  style={{ borderColor: colors.primary }}
                ></div>
                <span className="text-sm">Menunggu pembayaran...</span>
              </div>
            </div>
          )}

          {paymentStatus === 'paid' && (
            <div className="p-8 text-center">
              <div 
                className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: colors.secondary }}
              >
                <CheckCircle className="w-12 h-12" style={{ color: colors.primary }} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Pembayaran Berhasil!</h2>
              <p className="text-gray-600 mb-6">
                Terima kasih, pembayaran Anda melalui {walletType} telah kami terima. Pesanan Anda sedang diproses.
              </p>
              <div 
                className="border rounded-lg p-4 mb-6"
                style={{ 
                  backgroundColor: colors.secondary,
                  borderColor: colors.primary + '40',
                }}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Total Dibayar:</span>
                  <span className="text-xl font-bold" style={{ color: colors.primary }}>
                    {formatPrice(amount)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">ID Pesanan:</span>
                  <span className="font-mono font-semibold text-gray-900">{orderId}</span>
                </div>
                <div className="flex justify-between items-center text-sm mt-1">
                  <span className="text-gray-600">Metode:</span>
                  <span className="font-semibold text-gray-900">{walletType}</span>
                </div>
              </div>
              <Button
                onClick={onClose}
                className="w-full text-white"
                style={{ backgroundColor: colors.primary }}
              >
                Lihat Detail Pesanan
              </Button>
            </div>
          )}

          {(paymentStatus === 'expired' || timeLeft <= 0) && (
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-12 h-12 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Pembayaran Kedaluwarsa</h2>
              <p className="text-gray-600 mb-6">
                Waktu pembayaran {walletType} telah habis. Silakan lakukan pemesanan ulang dan pilih metode
                pembayaran kembali.
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">ID Pesanan:</span>
                  <span className="font-mono font-semibold text-gray-900">{orderId}</span>
                </div>
              </div>
              <Button
                onClick={onClose}
                className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
              >
                Tutup
              </Button>
            </div>
          )}

          {paymentStatus === 'failed' && (
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-12 h-12 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Pembayaran Gagal</h2>
              <p className="text-gray-600 mb-6">
                Terjadi kesalahan saat memproses pembayaran {walletType} Anda. Silakan coba lagi.
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">ID Pesanan:</span>
                  <span className="font-mono font-semibold text-gray-900">{orderId}</span>
                </div>
              </div>
              <Button
                onClick={onClose}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
              >
                Coba Lagi
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}