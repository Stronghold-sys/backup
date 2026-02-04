import { useEffect, useState } from 'react';
import { X, Copy, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { PaymentStatus, PaymentMethod } from '@/lib/paymentStore';

interface VirtualAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  virtualAccount: string;
  amount: number;
  orderId: string;
  bankName: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  onPaymentStatusChange: (status: PaymentStatus) => void;
  expiryHours?: number;
}

export default function VirtualAccountModal({
  isOpen,
  onClose,
  virtualAccount,
  amount,
  orderId,
  bankName,
  paymentMethod,
  paymentStatus,
  onPaymentStatusChange,
  expiryHours = 24,
}: VirtualAccountModalProps) {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(expiryHours * 3600); // in seconds

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

    const demoTimer = setTimeout(() => {
      if (paymentStatus === 'waiting_payment') {
        onPaymentStatusChange('paid');
      }
    }, 5000); // Changed from 20000 to 5000 (5 seconds)

    return () => clearTimeout(demoTimer);
  }, [isOpen, paymentStatus, onPaymentStatusChange]);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Failed to copy
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getBankLogo = (method: PaymentMethod): string => {
    const logos: Record<string, string> = {
      BCA_VA: '🏦',
      BRI_VA: '🏦',
      Mandiri_VA: '🏦',
      BNI_VA: '🏦',
    };
    return logos[method] || '🏦';
  };

  if (!isOpen) return null;

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
            <div className="p-6">
              {/* Header */}
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3 text-3xl">
                  {getBankLogo(paymentMethod)}
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Transfer ke {bankName}
                </h2>
                <p className="text-gray-600">
                  Lakukan transfer sesuai nominal yang tertera
                </p>
              </div>

              {/* Timer */}
              <div className="flex items-center justify-center gap-2 mb-6 bg-orange-50 border border-orange-200 rounded-lg p-3">
                <Clock className="w-5 h-5 text-orange-500" />
                <div className="text-center">
                  <p className="text-xs text-orange-600 mb-1">Selesaikan pembayaran dalam:</p>
                  <p className="text-lg font-semibold text-orange-500">{formatTime(timeLeft)}</p>
                </div>
              </div>

              {/* Virtual Account Number */}
              <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4 mb-4">
                <label className="text-sm text-gray-600 mb-2 block">Nomor Virtual Account</label>
                <div className="flex items-center justify-between gap-3">
                  <div className="font-mono text-xl font-bold text-gray-900 tracking-wider">
                    {virtualAccount.match(/.{1,4}/g)?.join(' ')}
                  </div>
                  <button
                    onClick={() => handleCopy(virtualAccount)}
                    className="flex items-center gap-2 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition text-sm font-medium"
                  >
                    {copied ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Tersalin
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Salin
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Amount */}
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 mb-6">
                <label className="text-sm text-gray-600 mb-2 block">Total Pembayaran</label>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-2xl font-bold text-green-600">{formatPrice(amount)}</div>
                  <button
                    onClick={() => handleCopy(amount.toString())}
                    className="flex items-center gap-2 px-3 py-2 bg-white border border-green-300 hover:bg-green-50 text-green-600 rounded-lg transition text-sm font-medium"
                  >
                    <Copy className="w-4 h-4" />
                    Salin
                  </button>
                </div>
                <p className="text-xs text-green-700 mt-2">
                  ⚠️ Transfer dengan nominal EXACT untuk verifikasi otomatis
                </p>
              </div>

              {/* Order ID */}
              <div className="bg-gray-50 rounded-lg p-3 mb-6">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">ID Pesanan:</span>
                  <span className="font-mono font-semibold text-gray-900">{orderId}</span>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Cara Transfer:
                </h3>
                <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                  <li>Buka aplikasi mobile banking atau internet banking {bankName}</li>
                  <li>Pilih menu Transfer atau Transfer Antar Bank</li>
                  <li>Masukkan nomor Virtual Account di atas</li>
                  <li>Masukkan nominal sesuai yang tertera (EXACT)</li>
                  <li>Konfirmasi dan selesaikan transfer</li>
                  <li>Pembayaran akan otomatis terverifikasi</li>
                </ol>
              </div>

              {/* ATM Instructions (Collapsible) */}
              <details className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                <summary className="font-semibold text-gray-900 cursor-pointer">
                  Cara Transfer via ATM {bankName}
                </summary>
                <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside mt-3">
                  <li>Masukkan kartu ATM dan PIN</li>
                  <li>Pilih menu Transaksi Lainnya</li>
                  <li>Pilih Transfer</li>
                  <li>Pilih ke Rekening {bankName}</li>
                  <li>Masukkan nomor Virtual Account</li>
                  <li>Masukkan nominal transfer</li>
                  <li>Konfirmasi dan selesaikan transaksi</li>
                </ol>
              </details>

              {/* Loading indicator */}
              <div className="flex items-center justify-center gap-2 text-gray-500">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
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
                Transfer Anda telah kami terima dan diverifikasi. Pesanan Anda sedang diproses.
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

          {paymentStatus === 'expired' && (
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-12 h-12 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Pembayaran Kedaluwarsa</h2>
              <p className="text-gray-600 mb-6">
                Waktu pembayaran telah habis. Nomor Virtual Account sudah tidak dapat digunakan.
                Silakan lakukan pemesanan ulang.
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
                <AlertCircle className="w-12 h-12 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Transfer Gagal</h2>
              <p className="text-gray-600 mb-6">
                Terjadi kesalahan saat memproses transfer Anda. Silakan coba lagi atau hubungi
                customer service.
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