import { useEffect, useState } from 'react';
import { X, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { PaymentStatus } from '@/lib/paymentStore';
import { QRCodeSVG } from 'qrcode.react';

interface QRISModalProps {
  isOpen: boolean;
  onClose: () => void;
  qrCode: string;
  amount: number;
  orderId: string;
  paymentStatus: PaymentStatus;
  onPaymentStatusChange: (status: PaymentStatus) => void;
  expiryMinutes?: number;
}

export default function QRISModal({
  isOpen,
  onClose,
  qrCode,
  amount,
  orderId,
  paymentStatus,
  onPaymentStatusChange,
  expiryMinutes = 10,
}: QRISModalProps) {
  const [timeLeft, setTimeLeft] = useState(expiryMinutes * 60); // seconds
  const [copied, setCopied] = useState(false);

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
    }, 5000); // Changed from 15000 to 5000 (5 seconds)

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

  if (!isOpen) return null;
  if (!qrCode || qrCode.length === 0) return null;

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
        backgroundColor: 'rgba(255, 255, 255, 0.95)', // Changed from black to white with blur effect
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
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Scan QR untuk Menyelesaikan Pembayaran
              </h2>
              <p className="text-gray-600 mb-6">
                Gunakan aplikasi e-wallet atau mobile banking yang mendukung QRIS
              </p>

              {/* Timer */}
              <div className="flex items-center justify-center gap-2 mb-6">
                <Clock className="w-5 h-5 text-orange-500" />
                <span className="text-lg font-semibold text-orange-500">
                  Waktu tersisa: {formatTime(timeLeft)}
                </span>
              </div>

              {/* QR Code */}
              <div className="bg-white p-6 rounded-xl border-4 border-green-500 mb-6 inline-block">
                <QRCodeSVG 
                  value={qrCode} 
                  size={256}
                  level="H"
                  includeMargin={true}
                  fgColor="#000000"
                  bgColor="#ffffff"
                />
              </div>

              {/* Payment Details */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Total Pembayaran:</span>
                  <span className="text-2xl font-bold text-green-600">{formatPrice(amount)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">ID Pesanan:</span>
                  <span className="font-mono font-semibold text-gray-900">{orderId}</span>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Cara Pembayaran:
                </h3>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Buka aplikasi e-wallet atau mobile banking Anda</li>
                  <li>Pilih menu "Scan QR" atau "QRIS"</li>
                  <li>Arahkan kamera ke QR code di atas</li>
                  <li>Konfirmasi pembayaran di aplikasi Anda</li>
                </ol>
              </div>

              {/* Loading indicator */}
              <div className="mt-6 flex items-center justify-center gap-2 text-gray-500">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-500"></div>
                <span className="text-sm">Menunggu pembayaran...</span>
              </div>
            </div>
          )}

          {paymentStatus === 'paid' && (
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Pembayaran Berhasil!</h2>
              <p className="text-gray-600 mb-6">
                Terima kasih, pembayaran Anda telah kami terima. Pesanan Anda sedang diproses.
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Total Dibayar:</span>
                  <span className="text-xl font-bold text-green-600">{formatPrice(amount)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">ID Pesanan:</span>
                  <span className="font-mono font-semibold text-gray-900">{orderId}</span>
                </div>
              </div>
              <Button
                onClick={onClose}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
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
                Waktu pembayaran telah habis. Silakan lakukan pemesanan ulang dan pilih metode
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
                Terjadi kesalahan saat memproses pembayaran Anda. Silakan coba lagi.
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