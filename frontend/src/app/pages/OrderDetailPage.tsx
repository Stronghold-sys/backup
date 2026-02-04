import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Package, MapPin, Truck, Clock, FileText, CheckCircle, AlertTriangle, CreditCard, X, DollarSign, RefreshCw } from 'lucide-react';
import Layout from '@/app/components/Layout/Layout';
import { Card } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { api } from '@/lib/supabase';
import { Order, useAuthStore } from '@/lib/store';
import { toast } from 'sonner';
import QRISModal from '@/app/components/payment/QRISModal';
import EWalletModal from '@/app/components/payment/EWalletModal';
import VirtualAccountModal from '@/app/components/payment/VirtualAccountModal';
import { projectId, publicAnonKey } from '/utils/supabase'; // ✅ FIXED: Corrected import path
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import { useRefundRealTimeSync } from '@/lib/unifiedRealTimeSync';

// ✅ Add Refund interface
interface Refund {
  id: string;
  orderId: string;
  userId: string;
  userName: string;
  userEmail: string;
  type: 'user_request' | 'admin_cancel';
  reason: string;
  description: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'shipping' | 'received' | 'refunded' | 'completed';
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  adminNote?: string;
  refundedAt?: string;
  refundMethod?: string;
  createdAt: string;
  updatedAt: string;
  statusHistory: Array<{
    status: string;
    note: string;
    timestamp: string;
    updatedBy?: string;
    updatedByName?: string;
  }>;
  returnShipping?: {
    courier: string;
    trackingNumber: string;
  };
}

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { accessToken } = useAuthStore();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Payment modal states
  const [showQRISModal, setShowQRISModal] = useState(false);
  const [showEWalletModal, setShowEWalletModal] = useState(false);
  const [showVAModal, setShowVAModal] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [virtualAccount, setVirtualAccount] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'waiting_payment' | 'paid' | 'failed' | 'expired'>('waiting_payment');

  // Cancel order modal state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // ✅ NEW: Refund state
  const [refund, setRefund] = useState<Refund | null>(null);
  const [isLoadingRefund, setIsLoadingRefund] = useState(false);
  const [isConfirmingShipment, setIsConfirmingShipment] = useState(false); // ✅ NEW: For confirming shipment

  // ✅ NEW: Setup real-time sync for refund updates
  useRefundRealTimeSync(refund?.id, () => {
    // Reload refund when update received
    loadRefund();
  });

  useEffect(() => {
    if (id) {
      loadOrder();
      loadRefund(); // ✅ NEW: Load refund data
      
      // ✅ Setup real-time polling every 3 seconds for order status and refund updates
      const interval = setInterval(() => {
        loadOrder();
        loadRefund(); // ✅ Poll refund status too
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [id]);

  const loadOrder = async () => {
    try {
      console.info('📦 Loading order:', id);
      console.info('🔑 Access token:', accessToken ? 'Present' : 'Missing');
      
      if (!accessToken) {
        console.error('❌ No access token available');
        toast.error('Sesi Anda telah berakhir. Silakan login kembali.');
        navigate('/login');
        return;
      }

      const response = await api.get(`/orders/${id}`, accessToken);
      
      console.info('📦 Order API response:', response);
      
      if (response.success && response.order) {
        console.info('📦 Loaded order:', response.order);
        console.info('📦 Order items:', response.order.items);
        response.order.items.forEach((item: any, index: number) => {
          console.info(`📷 Item ${index} images:`, {
            productId: item.productId,
            productName: item.product?.name,
            images: item.product?.images,
            image: item.product?.image,
          });
        });
        setOrder(response.order);
      } else {
        console.error('❌ Order not found or invalid response:', response);
        toast.error('Pesanan tidak ditemukan');
        navigate('/orders');
      }
    } catch (error: any) {
      console.error('❌ Error loading order:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      // ✅ Better error handling
      if (error.message?.includes('Failed to fetch')) {
        toast.error('Gagal terhubung ke server. Periksa koneksi internet Anda.');
      } else if (error.message?.includes('401')) {
        toast.error('Sesi Anda telah berakhir. Silakan login kembali.');
        navigate('/login');
      } else {
        toast.error('Gagal memuat pesanan. Silakan coba lagi.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ NEW: Load refund data by order ID
  const loadRefund = async () => {
    if (!id) return;

    setIsLoadingRefund(true);
    try {
      console.info('💰 [LoadRefund] Starting for order ID:', id);
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-adb995ba/refunds/order/${id}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'X-Session-Token': accessToken!,
          },
        }
      );

      console.info('💰 [LoadRefund] Response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.info('💰 [LoadRefund] Response data:', result);
        
        if (result.success && result.refund) {
          console.info('💰 [LoadRefund] Refund found:', {
            id: result.refund.id,
            orderId: result.refund.orderId,
            status: result.refund.status,
            userId: result.refund.userId
          });
          setRefund(result.refund);
        } else {
          // No refund exists for this order
          console.info('💰 [LoadRefund] No refund exists for order:', id);
          setRefund(null);
        }
      } else {
        const errorData = await response.json();
        console.error('❌ [LoadRefund] Error response:', errorData);
      }
    } catch (error) {
      console.error('❌ [LoadRefund] Exception:', error);
    } finally {
      setIsLoadingRefund(false);
    }
  };

  // ✅ NEW: Confirm shipment (user confirms they've shipped the item back)
  const handleConfirmShipment = async () => {
    if (!refund || isConfirmingShipment) return;

    setIsConfirmingShipment(true);
    try {
      console.info('🔄 [ConfirmShipment] Starting...', { refundId: refund.id, status: refund.status });
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-adb995ba/refunds/${refund.id}/status`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
            'X-Session-Token': accessToken!,
          },
          body: JSON.stringify({
            status: 'shipping',
            statusNote: 'Barang telah dikirim oleh user, menunggu konfirmasi diterima dari admin',
          }),
        }
      );

      console.info('📡 [ConfirmShipment] Response status:', response.status, response.statusText);

      const result = await response.json();
      console.info('📦 [ConfirmShipment] Response data:', result);

      if (response.ok) {
        if (result.success) {
          toast.success('Konfirmasi pengiriman berhasil! Admin akan memverifikasi penerimaan barang.');
          loadRefund(); // Reload refund data
        } else {
          console.error('❌ [ConfirmShipment] Server error:', result.error);
          toast.error(result.error || 'Gagal mengkonfirmasi pengiriman');
        }
      } else {
        console.error('❌ [ConfirmShipment] HTTP error:', response.status, result);
        toast.error(result.error || 'Gagal mengkonfirmasi pengiriman');
      }
    } catch (error) {
      console.error('❌ [ConfirmShipment] Exception:', error);
      toast.error('Terjadi kesalahan saat mengkonfirmasi pengiriman');
    } finally {
      setIsConfirmingShipment(false);
    }
  };

  // ✅ Check if order can be cancelled by user
  const canCancelOrder = () => {
    if (!order) return false;
    
    // ✅ NEW: User can cancel if:
    // 1. Status is waiting_payment (paid or unpaid) - will create refund request if paid
    // 2. COD orders can be cancelled anytime before delivered
    // 3. Cannot cancel if already processing, shipped, or delivered
    return (
      order.status === 'waiting_payment' || 
      order.status === 'pending' ||
      (order.paymentMethod === 'COD' && order.status !== 'delivered' && order.status !== 'cancelled')
    ) && order.status !== 'processing' && order.status !== 'shipped' && order.status !== 'delivered';
  };

  // ✅ Handle cancel order with refund request for paid orders
  const handleCancelOrder = async () => {
    if (!order) return;

    setIsCancelling(true);

    try {
      console.info('🚫 Cancelling order:', order.id);
      console.info('💰 Payment status:', order.paymentStatus);
      console.info('💳 Payment method:', order.paymentMethod);

      // Check if order is paid and not COD (will create refund request)
      const willCreateRefund = order.paymentStatus === 'paid' && order.paymentMethod !== 'COD';

      const response = await api.post(`/orders/${order.id}/cancel`, {}, accessToken!);
      
      if (response.success) {
        if (willCreateRefund) {
          toast.success('Pesanan dibatalkan. Permintaan refund telah dibuat dan menunggu persetujuan admin.');
        } else {
          toast.success('Pesanan berhasil dibatalkan');
        }
        setShowCancelModal(false);
        
        // Refresh order data
        setTimeout(() => {
          loadOrder();
        }, 1000);
      } else {
        toast.error(response.error || 'Gagal membatalkan pesanan');
      }
    } catch (error) {
      console.error('❌ Error canceling order:', error);
      toast.error('Terjadi kesalahan saat membatalkan pesanan');
    } finally {
      setIsCancelling(false);
    }
  };

  // ✅ Handle "Bayar Sekarang" button
  const handlePayNow = () => {
    if (!order) return;

    console.info('💳 Opening payment modal for order:', order.id);
    console.info('💳 Payment method:', order.paymentMethod);

    // Reset payment status to waiting_payment
    setPaymentStatus('waiting_payment');

    // Generate payment data based on payment method
    const paymentMethod = order.paymentMethod;

    if (paymentMethod === 'QRIS') {
      setQrCode(`QRIS-${order.id}-${order.totalAmount}`);
      setShowQRISModal(true);
    } else if (['GoPay', 'OVO', 'DANA', 'ShopeePay'].includes(paymentMethod)) {
      setShowEWalletModal(true);
    } else if (['BCA_VA', 'BRI_VA', 'Mandiri_VA', 'BNI_VA'].includes(paymentMethod)) {
      const vaNumber = generateVirtualAccount(paymentMethod);
      setVirtualAccount(vaNumber);
      setShowVAModal(true);
    } else {
      toast.error('Metode pembayaran tidak didukung');
    }
  };

  // Generate Virtual Account number
  const generateVirtualAccount = (method: string): string => {
    const bankCodes: Record<string, string> = {
      BCA_VA: '70012',
      BRI_VA: '88810',
      Mandiri_VA: '88008',
      BNI_VA: '88801',
    };
    const code = bankCodes[method] || '88888';
    const randomDigits = Math.floor(Math.random() * 10000000000).toString().padStart(10, '0');
    return `${code}${randomDigits}`;
  };

  // Get bank name for display
  const getBankName = (method: string): string => {
    const bankNames: Record<string, string> = {
      BCA_VA: 'BCA',
      BRI_VA: 'BRI',
      Mandiri_VA: 'Mandiri',
      BNI_VA: 'BNI',
    };
    return bankNames[method] || method;
  };

  // ✅ Handle payment confirmation (when user confirms payment)
  const handlePaymentConfirm = async () => {
    if (!order || isProcessingPayment) return;

    setIsProcessingPayment(true);

    try {
      console.info('✅ Confirming payment for order:', order.id);

      // ✅ FIXED: Update payment status to "paid" but keep order status as "waiting_payment"
      // Admin will manually change status to "processing"
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-adb995ba/orders/${order.id}/payment-status`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
            'X-Session-Token': accessToken!,
          },
          body: JSON.stringify({
            paymentStatus: 'paid',
            status: 'waiting_payment', // ✅ FIXED: Keep as waiting_payment, admin will process it
            paidAt: new Date().toISOString(),
          }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        console.info('✅ Payment confirmed successfully:', result);

        toast.success('Pembayaran berhasil! Menunggu diproses admin.');

        // ✅ CRITICAL FIX: Update local state immediately with response data
        if (result.order) {
          console.info('✅ Updating local order state with:', result.order);
          setOrder(result.order);
        }

        // Close all modals after a short delay to show success message
        setTimeout(() => {
          setShowQRISModal(false);
          setShowEWalletModal(false);
          setShowVAModal(false);
        }, 2000);

        // ✅ AGGRESSIVE REFRESH: Multiple refresh attempts to ensure data sync
        const refreshIntervals = [1500, 3000, 5000]; // Refresh at 1.5s, 3s, and 5s
        refreshIntervals.forEach((delay) => {
          setTimeout(() => {
            console.info(`🔄 Force refreshing order data (${delay}ms)...`);
            loadOrder();
          }, delay);
        });
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to confirm payment:', errorText);
        toast.error('Gagal mengkonfirmasi pembayaran');
      }
    } catch (error) {
      console.error('❌ Error confirming payment:', error);
      toast.error('Terjadi kesalahan saat mengkonfirmasi pembayaran');
    } finally {
      // Reset processing state after all operations
      setTimeout(() => {
        setIsProcessingPayment(false);
      }, 6000);
    }
  };

  const formatPrice = (price: number) => {
    // Handle undefined, null, NaN with fallback to 0
    const validPrice = (!price || isNaN(price)) ? 0 : price;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(validPrice);
  };

  // Get status badge with proper color and label
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

  // ✅ NEW: Get refund status badge
  const getRefundStatusBadge = (status: Refund['status']) => {
    const statusConfig: Record<Refund['status'], { label: string; color: string; bg: string; icon: string }> = {
      pending: { label: 'Menunggu Review Admin', color: 'text-yellow-700', bg: 'bg-yellow-100', icon: '⏳' },
      approved: { label: 'Disetujui - Kirim Barang', color: 'text-blue-700', bg: 'bg-blue-100', icon: '✅' },
      rejected: { label: 'Ditolak', color: 'text-red-700', bg: 'bg-red-100', icon: '❌' },
      shipping: { label: 'Barang Dalam Pengiriman', color: 'text-purple-700', bg: 'bg-purple-100', icon: '🚚' },
      received: { label: 'Barang Diterima Admin', color: 'text-indigo-700', bg: 'bg-indigo-100', icon: '📦' },
      refunded: { label: 'Dana Dikembalikan', color: 'text-green-700', bg: 'bg-green-100', icon: '💰' },
      completed: { label: 'Selesai', color: 'text-green-700', bg: 'bg-green-100', icon: '✅' },
    };

    const config = statusConfig[status];
    return (
      <Badge className={`${config.bg} ${config.color} flex items-center gap-1`}>
        <span>{config.icon}</span>
        <span>{config.label}</span>
      </Badge>
    );
  };

  if (isLoading || !order) {
    return (
      <Layout>
        <div className="flex-1 bg-gray-50 flex items-center justify-center">
          <p>Memuat...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex-1 bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Button */}
          <Button
            variant="ghost"
            className="mb-4 -ml-2 hover:bg-gray-100"
            onClick={() => navigate('/orders')}
          >
            <ArrowLeft className="w-5 h-5 mr-1" />
            Kembali ke Pesanan Saya
          </Button>

          <h1 className="text-2xl font-bold mb-6">Detail Pesanan</h1>

          {/* Order Status */}
          <Card className="p-6 mb-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm text-gray-500">ID Pesanan</p>
                <p className="font-semibold">{order.id}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(order.createdAt).toLocaleString('id-ID')}
                </p>
              </div>
              {getStatusBadge(order.status)}
            </div>

            {/* Timeline */}
            <div className="mt-6">
              <h3 className="font-semibold mb-4">Status Pesanan</h3>
              <div className="space-y-3">
                {(order.statusHistory || []).map((history, index) => (
                  <div key={`status-${index}-${history.timestamp}`} className="flex items-start">
                    <div className="flex-shrink-0 w-2 h-2 bg-green-600 rounded-full mt-2 mr-3"></div>
                    <div className="flex-1">
                      <p className="font-medium">{history.status}</p>
                      <p className="text-sm text-gray-600">{history.note}</p>
                      <p className="text-xs text-gray-400">{new Date(history.timestamp).toLocaleString('id-ID')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Shipping Info */}
          <Card className="p-6 mb-6">
            <h3 className="font-semibold mb-4">Informasi Pengiriman</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Alamat</span>
                <span className="text-right">{order.shippingAddress?.address || 'Belum ada alamat'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">No. Resi</span>
                <span className="font-mono text-sm">{order.trackingNumber || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Kurir</span>
                <span>
                  {typeof order.shippingMethod === 'object' && order.shippingMethod?.providerName
                    ? `${order.shippingMethod.providerName} - ${order.shippingMethod.serviceName}`
                    : order.shippingMethod || 'Standard'}
                </span>
              </div>
            </div>
          </Card>

          {/* Order Items */}
          <Card className="p-6 mb-6">
            <h3 className="font-semibold mb-4">Produk Dipesan</h3>
            
            {/* ✅ DEBUG: Log items data */}
            {console.info('🔍 [OrderDetail] Order items:', order.items)}
            {console.info('🔍 [OrderDetail] Order items length:', order.items?.length || 0)}
            
            <div className="space-y-4">
              {(!order.items || order.items.length === 0) ? (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Tidak ada produk ditemukan</p>
                  <p className="text-xs text-gray-400 mt-1">Order ID: {order.id}</p>
                </div>
              ) : (
                order.items.map((item, index) => (
                  <div key={`item-${item.productId}-${index}`} className="flex gap-4">
                    <ImageWithFallback
                      src={item.product?.images?.[0] || item.product?.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100&h=100&fit=crop'}
                      alt={item.product?.name || 'Product'}
                      className="w-20 h-20 object-cover rounded"
                      fallbackSrc="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100&h=100&fit=crop"
                    />
                    <div className="flex-1">
                      <p className="font-medium">{item.product?.name || 'Produk'}</p>
                      <p className="text-sm text-gray-500">x{item.quantity}</p>
                    </div>
                    <div className="text-right">
                      {item.product?.originalPrice && (
                        <p className="text-xs text-gray-400 line-through">
                          {formatPrice((item.product.originalPrice) * item.quantity)}
                        </p>
                      )}
                      <p className="font-semibold text-green-600">{formatPrice((item.product?.price || item.price || 0) * item.quantity)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* ✅ NEW: Refund Status Card (only show if refund exists) */}
          {refund && (
            <Card className="p-6 mb-6 border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-pink-50">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-r from-orange-500 to-pink-500 p-2 rounded-full">
                    <DollarSign className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Status Refund</h3>
                    <p className="text-xs text-gray-500">ID: {refund.id}</p>
                  </div>
                </div>
                {getRefundStatusBadge(refund.status)}
              </div>

              {/* Refund Info */}
              <div className="bg-white rounded-lg p-4 mb-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Jumlah Refund:</span>
                  <span className="font-bold text-green-600">{formatPrice(refund.amount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Alasan:</span>
                  <span className="font-semibold text-right max-w-[200px]">{refund.reason}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Diajukan:</span>
                  <span className="text-gray-500">{new Date(refund.createdAt).toLocaleString('id-ID')}</span>
                </div>
              </div>

              {/* Refund Timeline */}
              <div>
                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Timeline Refund
                </h4>
                <div className="space-y-3">
                  {refund.statusHistory.map((history, index) => (
                    <div key={`refund-history-${index}`} className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-2 h-2 bg-orange-600 rounded-full mt-2"></div>
                      <div className="flex-1 bg-white rounded-lg p-3">
                        <p className="font-semibold text-sm">{history.status}</p>
                        <p className="text-xs text-gray-600 mt-1">{history.note}</p>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs text-gray-400">{new Date(history.timestamp).toLocaleString('id-ID')}</p>
                          {history.updatedByName && (
                            <p className="text-xs text-gray-500">oleh {history.updatedByName}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Additional Info for Specific Statuses */}
              {refund.status === 'pending' && (
                <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-yellow-800">
                        Menunggu Review Admin
                      </p>
                      <p className="text-xs text-yellow-700 mt-1">
                        Permintaan refund Anda sedang ditinjau oleh admin. Kami akan menghubungi Anda secepatnya.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {refund.status === 'rejected' && refund.adminNote && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-red-800">
                        Refund Ditolak
                      </p>
                      <p className="text-xs text-red-700 mt-1">
                        {refund.adminNote}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {refund.status === 'refunded' && (
                <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-green-800">
                        Dana Telah Dikembalikan
                      </p>
                      <p className="text-xs text-green-700 mt-1">
                        Dana sebesar {formatPrice(refund.amount)} telah dikembalikan ke rekening Anda{refund.refundMethod ? ` melalui ${refund.refundMethod}` : ''}.
                      </p>
                      {refund.refundedAt && (
                        <p className="text-xs text-green-600 mt-1">
                          Pada: {new Date(refund.refundedAt).toLocaleString('id-ID')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ✅ NEW: Shipping - Item in transit */}
              {refund.status === 'shipping' && (
                <div className="mt-4 bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Truck className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-purple-800">
                        Barang Dalam Pengiriman
                      </p>
                      <p className="text-xs text-purple-700 mt-1">
                        Barang Anda sedang dalam perjalanan ke warehouse kami. Admin akan mengkonfirmasi setelah barang diterima.
                      </p>
                      {refund.returnShipping && (
                        <div className="mt-2 p-2 bg-purple-100 rounded text-xs">
                          <p><strong>Kurir:</strong> {refund.returnShipping.courier}</p>
                          <p><strong>Resi:</strong> {refund.returnShipping.trackingNumber}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ✅ NEW: Received - Item received by admin */}
              {refund.status === 'received' && (
                <div className="mt-4 bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Package className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-indigo-800">
                        Barang Telah Diterima Admin
                      </p>
                      <p className="text-xs text-indigo-700 mt-1">
                        Barang Anda telah diterima oleh tim kami. Dana akan segera diproses dan dikembalikan.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ✅ NEW: Approved - Instructions to Ship */}
              {refund.status === 'approved' && refund.returnShipping && (
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Package className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-blue-900 mb-2">
                        Silakan Kirim Barang Kembali
                      </p>
                      <div className="space-y-2 text-xs text-blue-800">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="font-semibold text-blue-700">Kurir yang Ditentukan:</p>
                            <p className="font-bold text-blue-900 text-sm">{refund.returnShipping.courier}</p>
                          </div>
                          <div>
                            <p className="font-semibold text-blue-700">Nomor Resi:</p>
                            <p className="font-bold text-blue-900 text-sm">{refund.returnShipping.trackingNumber}</p>
                          </div>
                        </div>
                        
                        <div className="mt-3 pt-3 border-t border-blue-300">
                          <p className="font-semibold text-blue-900 mb-2">📦 Instruksi Pengiriman:</p>
                          <ol className="list-decimal list-inside space-y-1 text-blue-800">
                            <li>Kemas barang dengan rapi dan aman</li>
                            <li>Gunakan kurir <strong>{refund.returnShipping.courier}</strong></li>
                            <li>Simpan nomor resi untuk tracking: <strong>{refund.returnShipping.trackingNumber}</strong></li>
                            <li>Kirim ke alamat toko/warehouse kami</li>
                            <li>Setelah barang diterima, dana akan dikembalikan</li>
                          </ol>
                        </div>

                        {refund.adminNote && (
                          <div className="mt-3 pt-3 border-t border-blue-300">
                            <p className="font-semibold text-blue-700">💬 Catatan dari Admin:</p>
                            <p className="text-blue-800 mt-1">{refund.adminNote}</p>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 flex items-center gap-2 text-xs text-blue-700 bg-blue-100 rounded p-2">
                        <AlertTriangle className="w-4 h-4" />
                        <p>Pastikan barang dikemas dengan baik untuk menghindari kerusakan saat pengiriman.</p>
                      </div>

                      {/* ✅ NEW: Confirm Shipment Button */}
                      {refund.status === 'approved' && (
                        <Button
                          className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold py-3 rounded-lg shadow-lg flex items-center justify-center gap-2 mt-4"
                          onClick={handleConfirmShipment}
                          disabled={isConfirmingShipment}
                        >
                          <Truck className="w-5 h-5" />
                          {isConfirmingShipment ? 'Memproses...' : 'Konfirmasi Pengiriman'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Payment Summary */}
          <Card className="p-6 mb-6">
            <h3 className="font-semibold mb-4">Ringkasan Pembayaran</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Ongkir</span>
                <span>{formatPrice(order.shippingCost)}</span>
              </div>
              <div className="flex justify-between pt-3 border-t font-bold">
                <span>Total</span>
                <span className="text-green-600">{formatPrice(order.totalAmount)}</span>
              </div>
            </div>
          </Card>

          {/* Actions */}
          {(order.status === 'waiting_payment' || order.status === 'pending') && (
            <div className="space-y-3">
              {/* Pay Now Button */}
              <Button 
                className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-semibold py-3 rounded-lg shadow-lg flex items-center justify-center gap-2" 
                onClick={handlePayNow}
                disabled={isProcessingPayment}
              >
                <CreditCard className="w-5 h-5" />
                {isProcessingPayment ? 'Memproses...' : 'Bayar Sekarang'}
              </Button>

              {/* Cancel Order Button - Only if waiting for payment */}
              {canCancelOrder() && (
                <Button 
                  variant="outline"
                  className="w-full border-2 border-red-500 text-red-600 hover:bg-red-50 font-semibold py-3 rounded-lg flex items-center justify-center gap-2" 
                  onClick={() => setShowCancelModal(true)}
                  disabled={isCancelling}
                >
                  <X className="w-5 h-5" />
                  Batalkan Pesanan
                </Button>
              )}
            </div>
          )}

          {/* Info message for processed orders */}
          {!canCancelOrder() && order.status !== 'delivered' && order.status !== 'cancelled' && (
            <Card className="p-4 bg-blue-50 border-blue-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-blue-900 text-sm">
                    Pesanan Sedang Diproses
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    Pesanan yang sudah dalam proses tidak dapat dibatalkan secara langsung. Silakan hubungi admin melalui customer service jika ada masalah dengan pesanan Anda.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* ✅ NEW: Request Return/Refund for Delivered Orders */}
          {order.status === 'delivered' && !refund && (
            <Button 
              variant="outline"
              className="w-full border-2 border-orange-500 text-orange-600 hover:bg-orange-50 font-semibold py-3 rounded-lg flex items-center justify-center gap-2" 
              onClick={() => navigate(`/refund-request/${order.id}`)}
            >
              <DollarSign className="w-5 h-5" />
              Ajukan Pengembalian Barang
            </Button>
          )}

          {/* ✅ NEW: Info for delivered orders with existing refund */}
          {order.status === 'delivered' && refund && (
            <Card className="p-4 bg-green-50 border-green-200">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-green-900 text-sm">
                    Pesanan Telah Sampai
                  </p>
                  <p className="text-xs text-green-700 mt-1">
                    Pesanan Anda telah diterima. Permintaan pengembalian barang sudah diajukan, lihat status refund di atas.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* ✅ NEW: Info for delivered orders without refund */}
          {order.status === 'delivered' && !refund && (
            <Card className="p-4 bg-green-50 border-green-200">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-green-900 text-sm">
                    Pesanan Telah Sampai
                  </p>
                  <p className="text-xs text-green-700 mt-1">
                    Terima kasih! Jika ada masalah dengan produk, Anda dapat mengajukan pengembalian barang dalam waktu 7 hari.
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Payment Modals */}
      {order && (
        <>
          {/* QRIS Modal */}
          <QRISModal
            isOpen={showQRISModal}
            onClose={() => setShowQRISModal(false)}
            qrCode={qrCode}
            orderId={order.id}
            amount={order.totalAmount}
            paymentStatus={paymentStatus}
            onPaymentStatusChange={(status) => {
              setPaymentStatus(status);
              if (status === 'paid') {
                handlePaymentConfirm();
              }
            }}
          />

          {/* E-Wallet Modal */}
          <EWalletModal
            isOpen={showEWalletModal}
            onClose={() => setShowEWalletModal(false)}
            walletType={order.paymentMethod}
            orderId={order.id}
            amount={order.totalAmount}
            paymentStatus={paymentStatus}
            onPaymentStatusChange={(status) => {
              setPaymentStatus(status);
              if (status === 'paid') {
                handlePaymentConfirm();
              }
            }}
          />

          {/* Virtual Account Modal */}
          <VirtualAccountModal
            isOpen={showVAModal}
            onClose={() => setShowVAModal(false)}
            bankName={getBankName(order.paymentMethod)}
            virtualAccount={virtualAccount}
            orderId={order.id}
            amount={order.totalAmount}
            paymentMethod={order.paymentMethod}
            paymentStatus={paymentStatus}
            onPaymentStatusChange={(status) => {
              setPaymentStatus(status);
              if (status === 'paid') {
                handlePaymentConfirm();
              }
            }}
          />

          {/* Cancel Order Confirmation Modal */}
          {showCancelModal && (
            <div className="fixed inset-0 bg-white/95 backdrop-blur-sm flex items-center justify-center z-50 p-4"> {/* Changed from bg-black bg-opacity-50 */}
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-red-500 to-pink-500 p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-white bg-opacity-20 p-2 rounded-full">
                        <AlertTriangle className="w-6 h-6" />
                      </div>
                      <h2 className="text-xl font-bold">Konfirmasi Pembatalan</h2>
                    </div>
                    <button
                      onClick={() => setShowCancelModal(false)}
                      className="hover:bg-white hover:bg-opacity-20 p-1 rounded-full transition"
                      disabled={isCancelling}
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <p className="text-gray-700 mb-4">
                    Apakah Anda yakin ingin membatalkan pesanan ini?
                  </p>
                  
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-yellow-800">
                          Perhatian
                        </p>
                        <p className="text-xs text-yellow-700 mt-1">
                          Pesanan yang telah dibatalkan tidak dapat dikembalikan. Anda harus membuat pesanan baru jika ingin memesan kembali.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Order Info */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">ID Pesanan:</span>
                      <span className="font-mono text-xs">{order.id}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total:</span>
                      <span className="font-semibold text-green-600">
                        {formatPrice(order.totalAmount)}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setShowCancelModal(false)}
                      disabled={isCancelling}
                      className="flex-1"
                    >
                      Batal
                    </Button>
                    <Button
                      onClick={handleCancelOrder}
                      disabled={isCancelling}
                      className="flex-1 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white"
                    >
                      {isCancelling ? (
                        <>
                          <span className="animate-spin mr-2">⏳</span>
                          Membatalkan...
                        </>
                      ) : (
                        'Ya, Batalkan Pesanan'
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </Layout>
  );
}