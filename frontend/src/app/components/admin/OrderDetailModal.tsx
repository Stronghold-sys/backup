import { useState } from 'react';
import { Order } from '@/lib/store';
import { usePaymentStore, getPaymentMethodName, getPaymentStatusDisplay } from '@/lib/paymentStore';
import { useRefundStore } from '@/lib/refundStore';
import { useAuthStore } from '@/lib/store';
import CheckoutDataSection from '@/app/components/admin/CheckoutDataSection';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Textarea } from '@/app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import { 
  X, 
  CreditCard, 
  MapPin, 
  Package, 
  Truck, 
  Clock, 
  AlertCircle, 
  CheckCircle 
} from 'lucide-react';

interface OrderDetailModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus: (orderId: string, newStatus: string, note: string) => void;
}

export default function OrderDetailModal({
  order,
  isOpen,
  onClose,
  onUpdateStatus,
}: OrderDetailModalProps) {
  const { getPayment } = usePaymentStore();
  const { getRefund } = useRefundStore();
  const { user } = useAuthStore();
  const [newStatus, setNewStatus] = useState('');
  const [note, setNote] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  if (!isOpen || !order) return null;

  // ✅ FIX: Use order.paymentStatus from database, not from local payment store
  const payment = getPayment(order.id);
  const paymentStatusDisplay = order.paymentStatus 
    ? getPaymentStatusDisplay(order.paymentStatus) 
    : (payment ? getPaymentStatusDisplay(payment.status) : null);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
      pending: { label: 'Menunggu Konfirmasi', color: 'text-yellow-700', bg: 'bg-yellow-100' },
      waiting_payment: { label: 'Menunggu Pembayaran', color: 'text-orange-700', bg: 'bg-orange-100' },
      processing: { label: 'Sedang Diproses', color: 'text-blue-700', bg: 'bg-blue-100' },
      packed: { label: 'Sedang Dikemas', color: 'text-indigo-700', bg: 'bg-indigo-100' },
      shipped: { label: 'Dalam Pengiriman', color: 'text-purple-700', bg: 'bg-purple-100' },
      delivered: { label: 'Terkirim', color: 'text-green-700', bg: 'bg-green-100' },
      cancelled: { label: 'Dibatalkan', color: 'text-red-700', bg: 'bg-red-100' },
    };

    const config = statusConfig[status] || statusConfig.pending;
    // Type guard to ensure safe rendering of config properties
    const safeBg = typeof config.bg === 'string' ? config.bg : 'bg-gray-100';
    const safeColor = typeof config.color === 'string' ? config.color : 'text-gray-700';
    const safeLabel = typeof config.label === 'string' ? config.label : '';
    
    return (
      <Badge className={`${safeBg} ${safeColor}`}>
        {safeLabel}
      </Badge>
    );
  };

  // Get available next statuses based on current status
  const getAvailableStatuses = (currentStatus: string) => {
    // ✅ FIX: Allow admin to process paid orders
    // Check if payment is paid (for non-COD orders)
    const isPaid = order.paymentStatus === 'paid';
    const isCOD = order.paymentMethod?.toUpperCase() === 'COD';
    
    const statusFlow: Record<string, string[]> = {
      // ✅ FIXED: If payment is paid OR it's COD, allow processing
      waiting_payment: (isPaid || isCOD) ? ['processing', 'cancelled'] : ['cancelled'],
      processing: ['packed', 'cancelled'], // Setelah diproses, bisa dikemas atau dibatalkan
      packed: ['shipped', 'cancelled'], // Setelah dikemas, bisa dikirim atau dibatalkan
      shipped: ['delivered', 'cancelled'], // Setelah dikirim, bisa sampai atau dibatalkan
      delivered: [], // Sudah selesai, tidak bisa ubah
      cancelled: [], // Sudah dibatalkan, tidak bisa ubah
    };

    return statusFlow[currentStatus] || [];
  };

  // Get all possible statuses with disabled state
  const getAllStatusOptions = (currentStatus: string) => {
    const availableStatuses = getAvailableStatuses(currentStatus);
    const allStatuses = [
      { value: 'processing', label: 'Sedang Diproses', icon: '🔵' },
      { value: 'packed', label: 'Sedang Dikemas', icon: '📦' },
      { value: 'shipped', label: 'Dalam Pengiriman', icon: '🚚' },
      { value: 'delivered', label: 'Terkirim', icon: '✅' },
      { value: 'cancelled', label: 'Dibatalkan', icon: '❌' },
    ];

    return allStatuses.map(status => ({
      ...status,
      disabled: !availableStatuses.includes(status.value),
      available: availableStatuses.includes(status.value),
    }));
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      processing: 'Sedang Diproses',
      packed: 'Sedang Dikemas',
      shipped: 'Dalam Pengiriman',
      delivered: 'Terkirim',
      cancelled: 'Dibatalkan',
    };
    return labels[status] || status;
  };

  const canProcessOrder = () => {
    // ✅ FIX: Allow processing for COD payments even if not paid yet
    // COD payment is completed when goods are delivered
    // ⚠️ CRITICAL: paymentMethod is stored as 'COD' (uppercase) in database
    const isCOD = order.paymentMethod?.toUpperCase() === 'COD';
    const isPaid = order.paymentStatus === 'paid';
    
    // Allow processing if:
    // 1. Payment is already completed (paid), OR
    // 2. Payment method is COD (payment happens on delivery)
    return isPaid || isCOD;
  };

  // Check if order status is final (cannot be changed)
  const isFinalStatus = () => {
    return order.status === 'delivered' || order.status === 'cancelled';
  };

  const handleUpdateStatus = async () => {
    if (!newStatus || !canProcessOrder() || isFinalStatus()) return;

    setIsUpdating(true);
    try {
      await onUpdateStatus(order.id, newStatus, note);
      setNewStatus('');
      setNote('');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay - Changed from bg-black/60 to bg-white/95 */}
      <div
        className="absolute inset-0 bg-white/95 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-green-50 to-emerald-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Detail Pesanan</h2>
            <p className="text-sm text-gray-600 mt-1">ID: {order.id}</p>
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge(order.status)}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white hover:bg-gray-100 flex items-center justify-center transition shadow-sm"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Checkout Data Section - NEW */}
          <div className="mb-6">
            <CheckoutDataSection order={order} />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Payment Information */}
              <div className="bg-white border-2 border-gray-200 rounded-xl p-4">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-green-600" />
                  Informasi Pembayaran
                </h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center pb-3 border-b">
                    <span className="text-gray-600">Metode Pembayaran:</span>
                    <span className="font-semibold text-gray-900">
                      {getPaymentMethodName(order.paymentMethod)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center pb-3 border-b">
                    <span className="text-gray-600">Status Pembayaran:</span>
                    {paymentStatusDisplay && (
                      <Badge className={`${typeof paymentStatusDisplay.bgColor === 'string' ? paymentStatusDisplay.bgColor : 'bg-gray-100'} ${typeof paymentStatusDisplay.color === 'string' ? paymentStatusDisplay.color : 'text-gray-700'}`}>
                        {typeof paymentStatusDisplay.label === 'string' ? paymentStatusDisplay.label : ''}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center pb-3 border-b">
                    <span className="text-gray-600">Total Pembayaran:</span>
                    <span className="text-xl font-bold text-green-600">
                      {formatPrice(order.totalAmount)}
                    </span>
                  </div>
                  
                  {order.paidAt && (
                    <div className="flex justify-between items-center pb-3 border-b">
                      <span className="text-gray-600">Waktu Pembayaran:</span>
                      <span className="text-sm text-gray-900">{formatDate(order.paidAt)}</span>
                    </div>
                  )}

                  {/* Payment Status Alert */}
                  {order.paymentStatus !== 'paid' && order.paymentMethod?.toUpperCase() === 'COD' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="text-sm font-semibold text-blue-800">
                            Pembayaran COD (Cash on Delivery)
                          </div>
                          <div className="text-xs text-blue-700 mt-1">
                            Pembayaran akan dilakukan saat barang diterima. Pesanan dapat diproses sekarang.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {order.paymentStatus !== 'paid' && order.paymentMethod?.toUpperCase() !== 'COD' && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-3">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="text-sm font-semibold text-yellow-800">
                            Pembayaran Belum Selesai
                          </div>
                          <div className="text-xs text-yellow-700 mt-1">
                            Pesanan belum dapat diproses karena menunggu pembayaran dari customer.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {order.paymentStatus === 'paid' && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-3">
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="text-sm font-semibold text-green-800">
                            Pembayaran Berhasil
                          </div>
                          <div className="text-xs text-green-700 mt-1">
                            Pesanan siap untuk diproses dan dikirim.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Shipping Address */}
              <div className="bg-white border-2 border-gray-200 rounded-xl p-4">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-green-600" />
                  Alamat Pengiriman
                </h3>
                <div className="space-y-2 text-sm">
                  <p className="font-semibold text-gray-900">{order.shippingAddress.name}</p>
                  <p className="text-gray-600">{order.shippingAddress.phone}</p>
                  <p className="text-gray-700">{order.shippingAddress.address}</p>
                  <p className="text-gray-700">
                    {order.shippingAddress.city}, {order.shippingAddress.province} {order.shippingAddress.postalCode}
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Products */}
              <div className="bg-white border-2 border-gray-200 rounded-xl p-4">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5 text-green-600" />
                  Produk ({order.items.length})
                </h3>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {order.items.map((item, idx) => {
                    // Get product image - support both 'image' and 'images' fields
                    const productImage = item.product?.images?.[0] || item.product?.image || '';
                    
                    return (
                      <div key={idx} className="flex items-start gap-3 py-3 border-b last:border-b-0">
                        <ImageWithFallback
                          src={productImage}
                          alt={item.product?.name || 'Product'}
                          className="w-16 h-16 object-cover rounded-lg bg-gray-100"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">
                            {item.product?.name || 'Unknown Product'}
                          </p>
                          <p className="text-xs text-gray-600">Jumlah: {item.quantity}</p>
                          <p className="text-sm font-semibold text-green-600">
                            {formatPrice((item.product?.price || 0) * item.quantity)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Order Summary */}
                <div className="mt-4 pt-4 border-t space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-semibold text-gray-900">{formatPrice(order.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      Ongkir ({typeof order.shippingMethod === 'object' && order.shippingMethod?.serviceName 
                        ? order.shippingMethod.serviceName 
                        : order.shippingMethod || 'Standard'}):
                    </span>
                    <span className="font-semibold text-gray-900">
                      {order.shippingCost === 0 ? 'GRATIS' : formatPrice(order.shippingCost)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="font-bold text-gray-900">Total:</span>
                    <span className="text-xl font-bold text-green-600">
                      {formatPrice(order.totalAmount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Update Status */}
              <div className="bg-white border-2 border-gray-200 rounded-xl p-4">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-green-600" />
                  Ubah Status Pesanan
                </h3>
                
                {/* Final Status Alert - NEW */}
                {isFinalStatus() && (
                  <div className={`${order.status === 'delivered' ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'} border rounded-lg p-3 mb-4`}>
                    <div className="flex items-start gap-2">
                      <CheckCircle className={`w-5 h-5 ${order.status === 'delivered' ? 'text-green-600' : 'text-gray-600'} flex-shrink-0 mt-0.5`} />
                      <div>
                        <p className={`text-sm font-semibold ${order.status === 'delivered' ? 'text-green-800' : 'text-gray-800'}`}>
                          {order.status === 'delivered' ? 'Pesanan Telah Selesai' : 'Pesanan Telah Dibatalkan'}
                        </p>
                        <p className={`text-xs ${order.status === 'delivered' ? 'text-green-700' : 'text-gray-700'} mt-1`}>
                          {order.status === 'delivered' 
                            ? 'Pesanan sudah diterima customer dan tidak dapat diubah lagi.' 
                            : 'Pesanan sudah dibatalkan dan tidak dapat diubah lagi.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {!canProcessOrder() && !isFinalStatus() && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-red-800">
                          Tidak Dapat Memproses Pesanan
                        </p>
                        <p className="text-xs text-red-700 mt-1">
                          Pesanan hanya dapat diproses setelah pembayaran berhasil.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Only show form if not final status */}
                {!isFinalStatus() && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">
                        Status Baru:
                      </label>
                      <Select
                        value={newStatus}
                        onValueChange={setNewStatus}
                        disabled={!canProcessOrder() || isUpdating}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih status..." />
                        </SelectTrigger>
                        <SelectContent>
                          {getAllStatusOptions(order.status).map(option => (
                            <SelectItem 
                              key={option.value} 
                              value={option.value}
                              disabled={option.disabled}
                              className={option.disabled ? 'opacity-40 cursor-not-allowed' : ''}
                            >
                              <div className="flex items-center gap-2">
                                <span>{option.icon}</span>
                                <span>{option.label}</span>
                                {!option.available && (
                                  <span className="text-xs text-gray-400 ml-2">(Tidak tersedia)</span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500 mt-1">
                        💡 Hanya status yang valid sesuai alur yang dapat dipilih
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">
                        Catatan:
                      </label>
                      <Textarea
                        placeholder="Tambahkan catatan untuk update status..."
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={3}
                        disabled={!canProcessOrder() || isUpdating}
                      />
                    </div>

                    <Button
                      onClick={handleUpdateStatus}
                      disabled={!newStatus || !canProcessOrder() || isUpdating}
                      className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                    >
                      {isUpdating ? 'Memperbarui...' : 'Perbarui Status'}
                    </Button>
                  </div>
                )}
              </div>

              {/* Status History */}
              <div className="bg-white border-2 border-gray-200 rounded-xl p-4">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-green-600" />
                  Riwayat Status
                </h3>
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {order.statusHistory?.map((history, idx) => (
                    <div key={idx} className="flex gap-3 pb-3 border-b last:border-b-0">
                      <div className="w-2 h-2 rounded-full bg-green-500 mt-2 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="font-semibold text-sm text-gray-900">
                          {getStatusBadge(history.status)}
                        </div>
                        <p className="text-xs text-gray-600 mt-1">{history.note}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(history.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}