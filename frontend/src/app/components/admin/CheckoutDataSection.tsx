import { MapPin, Package, Tag, CreditCard, Check, AlertCircle } from 'lucide-react';
import { Order } from '@/lib/store';
import { Badge } from '@/app/components/ui/badge';
import { getShippingLogo } from '@/app/components/payment/PaymentLogos';

interface CheckoutDataSectionProps {
  order: Order;
}

export default function CheckoutDataSection({ order }: CheckoutDataSectionProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getPaymentStatusBadge = (status: string) => {
    const variants: Record<string, { bg: string; text: string; icon: JSX.Element }> = {
      paid: {
        bg: 'bg-green-100',
        text: 'text-green-800',
        icon: <Check className="w-4 h-4" />,
      },
      waiting_payment: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        icon: <AlertCircle className="w-4 h-4" />,
      },
      failed: {
        bg: 'bg-red-100',
        text: 'text-red-800',
        icon: <AlertCircle className="w-4 h-4" />,
      },
      expired: {
        bg: 'bg-gray-100',
        text: 'text-gray-800',
        icon: <AlertCircle className="w-4 h-4" />,
      },
      cancelled: {
        bg: 'bg-red-100',
        text: 'text-red-800',
        icon: <AlertCircle className="w-4 h-4" />,
      },
      refunded: {
        bg: 'bg-blue-100',
        text: 'text-blue-800',
        icon: <Check className="w-4 h-4" />,
      },
      cod_pending: {
        bg: 'bg-orange-100',
        text: 'text-orange-800',
        icon: <AlertCircle className="w-4 h-4" />,
      },
    };

    return variants[status] || variants.waiting_payment;
  };

  const getPaymentStatusText = (status: string) => {
    const text: Record<string, string> = {
      paid: 'Pembayaran Berhasil',
      waiting_payment: 'Menunggu Pembayaran',
      failed: 'Pembayaran Gagal',
      expired: 'Pembayaran Kedaluwarsa',
      cancelled: 'Pembayaran Dibatalkan',
      refunded: 'Dana Dikembalikan',
      cod_pending: 'COD - Bayar saat Terima',
    };
    return text[status] || String(status);
  };

  // Helper to extract shipping data (handle both old string format and new object format)
  const getShippingData = () => {
    // Check if shippingMethod is an object (new format)
    if (order.shippingMethod && typeof order.shippingMethod === 'object') {
      const shippingObj = order.shippingMethod as any;
      return {
        providerName: shippingObj.providerName || order.shippingProvider || 'Unknown',
        serviceName: shippingObj.serviceName || order.shippingService || 'Unknown',
        displayName: `${shippingObj.providerName} - ${shippingObj.serviceName}`,
      };
    }
    
    // Old format (string)
    return {
      providerName: order.shippingProvider || 'Unknown',
      serviceName: order.shippingService || 'REG',
      displayName: order.shippingMethod as string || 'Unknown',
    };
  };

  const shippingData = getShippingData();
  const paymentStatusBadge = getPaymentStatusBadge(order.paymentStatus || 'waiting_payment');
  
  // ENHANCED TYPE SAFETY: Safe guards for object properties
  const safeBg = typeof paymentStatusBadge.bg === 'string' ? paymentStatusBadge.bg : 'bg-gray-100';
  const safeText = typeof paymentStatusBadge.text === 'string' ? paymentStatusBadge.text : 'text-gray-700';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <span className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm">
            ℹ️
          </span>
          Data Checkout (Real-Time)
        </h3>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs font-medium text-green-700">Live Data</span>
        </div>
      </div>

      <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded-lg">
        <p className="text-sm text-blue-900">
          <strong>Informasi Real-Time:</strong> Data di bawah ini otomatis
          tersinkronisasi dengan data yang dipilih user saat checkout. Semua
          perubahan langsung terlihat tanpa perlu refresh halaman.
        </p>
      </div>

      {/* Address Section */}
      <div className="p-5 bg-white border-2 border-gray-200 rounded-lg">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-5 h-5 text-green-600" />
          <h4 className="font-semibold text-gray-900">Alamat Pengiriman</h4>
          <Badge className="ml-auto bg-green-100 text-green-700">
            Dikonfirmasi
          </Badge>
        </div>
        <div className="pl-7 space-y-2">
          <div className="flex items-start gap-2">
            <p className="text-sm text-gray-500 w-24">Nama Penerima:</p>
            <p className="text-sm font-semibold text-gray-900 flex-1">
              {order.shippingAddress.name}
            </p>
          </div>
          <div className="flex items-start gap-2">
            <p className="text-sm text-gray-500 w-24">Telepon:</p>
            <p className="text-sm text-gray-900 flex-1">
              {order.shippingAddress.phone}
            </p>
          </div>
          <div className="flex items-start gap-2">
            <p className="text-sm text-gray-500 w-24">Alamat:</p>
            <p className="text-sm text-gray-900 flex-1">
              {order.shippingAddress.address}
            </p>
          </div>
          <div className="flex items-start gap-2">
            <p className="text-sm text-gray-500 w-24">Kota/Provinsi:</p>
            <p className="text-sm text-gray-900 flex-1">
              {order.shippingAddress.city}, {order.shippingAddress.province}
            </p>
          </div>
          <div className="flex items-start gap-2">
            <p className="text-sm text-gray-500 w-24">Kode Pos:</p>
            <p className="text-sm text-gray-900 flex-1">
              {order.shippingAddress.postalCode}
            </p>
          </div>
        </div>
        <div className="mt-3 p-2 bg-gray-50 rounded text-xs text-gray-600">
          <strong>Status:</strong> Alamat sudah terkunci dan tidak dapat diubah oleh
          admin
        </div>
      </div>

      {/* Shipping Section */}
      <div className="p-5 bg-white border-2 border-gray-200 rounded-lg">
        <div className="flex items-center gap-2 mb-4">
          <Package className="w-5 h-5 text-blue-600" />
          <h4 className="font-semibold text-gray-900">Jasa Pengiriman</h4>
          <Badge className="ml-auto bg-blue-100 text-blue-700">
            Dikonfirmasi
          </Badge>
        </div>
        <div className="pl-7 space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{getShippingLogo(shippingData.providerName)}</span>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">{shippingData.displayName}</p>
              <p className="text-sm text-gray-600">
                {shippingData.providerName} - {shippingData.serviceName}
              </p>
            </div>
            <div className="text-right">
              <p className="font-bold text-gray-900">
                {order.shippingCost === 0
                  ? 'GRATIS'
                  : formatPrice(order.shippingCost)}
              </p>
              {order.shippingCost === 0 && (
                <span className="text-xs text-green-600 font-semibold">
                  Gratis Ongkir
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="mt-3 p-2 bg-gray-50 rounded text-xs text-gray-600">
          <strong>Status:</strong> Jasa pengiriman dipilih user dan tidak dapat diubah
        </div>
      </div>

      {/* Voucher Section (if applicable) */}
      {order.voucher && (
        <div className="p-5 bg-gradient-to-r from-orange-50 to-pink-50 border-2 border-orange-200 rounded-lg">
          <div className="flex items-center gap-2 mb-4">
            <Tag className="w-5 h-5 text-orange-600" />
            <h4 className="font-semibold text-gray-900">Voucher Diterapkan</h4>
            <Badge className="ml-auto bg-orange-100 text-orange-700">
              Aktif
            </Badge>
          </div>
          <div className="pl-7 space-y-2">
            <div className="flex items-center gap-2">
              <p className="text-sm text-gray-500 w-32">Kode Voucher:</p>
              <p className="text-sm font-bold text-orange-600 flex-1">
                {order.voucher.code}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-sm text-gray-500 w-32">Deskripsi:</p>
              <p className="text-sm text-gray-900 flex-1">
                {order.voucher.description}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-sm text-gray-500 w-32">Potongan:</p>
              <p className="text-sm font-bold text-red-600 flex-1">
                -{formatPrice(order.discount || 0)}
              </p>
            </div>
          </div>
          <div className="mt-3 p-2 bg-white/50 rounded text-xs text-gray-700">
            <strong>Catatan:</strong> Jika pembayaran gagal, voucher akan aktif
            kembali secara otomatis
          </div>
        </div>
      )}

      {/* Payment Section */}
      <div className="p-5 bg-white border-2 border-gray-200 rounded-lg">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="w-5 h-5 text-purple-600" />
          <h4 className="font-semibold text-gray-900">Metode Pembayaran</h4>
          <Badge
            className={`ml-auto ${safeBg} ${safeText}`}
          >
            <span className="flex items-center gap-1">
              {paymentStatusBadge.icon}
              {getPaymentStatusText(order.paymentStatus || 'waiting_payment')}
            </span>
          </Badge>
        </div>
        <div className="pl-7 space-y-2">
          <div className="flex items-center gap-2">
            <p className="text-sm text-gray-500 w-32">Metode:</p>
            <p className="text-sm font-semibold text-gray-900 flex-1">
              {order.paymentMethod}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-sm text-gray-500 w-32">Status:</p>
            <p className="text-sm font-semibold text-gray-900 flex-1">
              {getPaymentStatusText(order.paymentStatus || 'waiting_payment')}
            </p>
          </div>
        </div>

        {/* Payment Status Alert */}
        {order.paymentStatus === 'waiting_payment' && (
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-yellow-900">
                Menunggu Pembayaran
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                Pesanan tidak dapat diproses hingga pembayaran berhasil. Status akan
                otomatis ter-update secara real-time.
              </p>
            </div>
          </div>
        )}

        {order.paymentStatus === 'paid' && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
            <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-green-900">
                Pembayaran Berhasil
              </p>
              <p className="text-xs text-green-700 mt-1">
                Pesanan siap diproses. Klik tombol "Proses Pesanan" untuk melanjutkan.
              </p>
            </div>
          </div>
        )}

        {order.paymentStatus === 'refunded' && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
            <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-900">
                💰 Dana Dikembalikan
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Pesanan dibatalkan dan dana telah dikembalikan ke metode pembayaran customer ({order.paymentMethod}).
              </p>
              {order.refundedAt && (
                <p className="text-xs text-blue-600 mt-1">
                  Direfund pada: {new Date(order.refundedAt).toLocaleString('id-ID')}
                </p>
              )}
            </div>
          </div>
        )}

        {order.paymentStatus === 'cancelled' && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-900">
                Pembayaran Dibatalkan
              </p>
              <p className="text-xs text-red-700 mt-1">
                {order.paymentMethod === 'COD' 
                  ? 'Pesanan COD dibatalkan. Tidak ada dana yang perlu dikembalikan.'
                  : 'Pesanan dibatalkan sebelum pembayaran. Tidak ada transaksi yang terjadi.'}
              </p>
            </div>
          </div>
        )}

        {order.paymentStatus === 'cod_pending' && (
          <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-2">
            <Check className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-orange-900">
                💵 Cash on Delivery (COD)
              </p>
              <p className="text-xs text-orange-700 mt-1">
                Customer akan membayar tunai saat barang diterima. Tidak perlu konfirmasi pembayaran online.
              </p>
              <p className="text-xs text-orange-600 mt-1 font-medium">
                ✅ Pesanan sudah siap diproses admin
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Total Summary */}
      <div className="p-5 bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-lg">
        <h4 className="font-semibold text-gray-900 mb-3">Ringkasan Total</h4>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal Produk:</span>
            <span className="font-semibold text-gray-900">
              {formatPrice(order.subtotal)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Ongkos Kirim:</span>
            <span
              className={`font-semibold ${
                order.shippingCost === 0 ? 'text-green-600' : 'text-gray-900'
              }`}
            >
              {order.shippingCost === 0
                ? 'GRATIS'
                : formatPrice(order.shippingCost)}
            </span>
          </div>
          {order.discount && order.discount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Diskon Voucher:</span>
              <span className="font-semibold text-red-600">
                -{formatPrice(order.discount)}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center pt-2 border-t-2 border-gray-300">
            <span className="font-bold text-gray-900">Total Pembayaran:</span>
            <span className="text-xl font-bold text-green-600">
              {formatPrice(order.totalAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* System Info */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-xs text-gray-600 leading-relaxed">
          <strong>🔒 Sistem Lock:</strong> Semua data checkout di atas sudah
          terkunci dan tidak dapat diubah oleh admin. Perubahan hanya dapat
          dilakukan oleh sistem secara otomatis (contoh: status pembayaran
          berubah saat user menyelesaikan pembayaran).
        </p>
      </div>
    </div>
  );
}