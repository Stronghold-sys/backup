import { toast } from 'sonner';
import { projectId, publicAnonKey } from '/utils/supabase'; // ✅ FIXED: Use correct path
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Package, ShoppingBag, Clock, CheckCircle, XCircle, Truck, RefreshCw } from 'lucide-react';
import Layout from '@/app/components/Layout/Layout';
import { Card } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Skeleton } from '@/app/components/ui/skeleton';
import { api } from '@/lib/supabase';
import { Order, useAuthStore } from '@/lib/store';
import QRISModal from '@/app/components/payment/QRISModal';
import VirtualAccountModal from '@/app/components/payment/VirtualAccountModal';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import {
  usePaymentStore,
  PaymentMethod,
  PaymentStatus,
  generateQRCode,
  generateVirtualAccount,
} from '@/lib/paymentStore';

export default function OrdersPage() {
  const navigate = useNavigate();
  const { accessToken, user } = useAuthStore();
  const { addNotification } = usePaymentStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Payment modal states
  const [showQRISModal, setShowQRISModal] = useState(false);
  const [showVAModal, setShowVAModal] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState('');
  const [currentPaymentStatus, setCurrentPaymentStatus] = useState<PaymentStatus>('waiting_payment');
  const [qrCode, setQrCode] = useState('');
  const [virtualAccount, setVirtualAccount] = useState('');
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  useEffect(() => {
    // ✅ FIX v16.9: Only load orders when accessToken is available
    if (accessToken && user) {
      console.info('🔄 [OrdersPage] Authenticated, loading orders...', {
        hasToken: !!accessToken,
        tokenLength: accessToken.length,
        userId: user.id
      });
      loadOrders();
    } else {
      console.info('⏳ [OrdersPage] Waiting for authentication...', {
        hasToken: !!accessToken,
        hasUser: !!user
      });
      setIsLoading(false);
    }
  }, [accessToken, user]); // ✅ Re-run when accessToken or user changes

  const loadOrders = async () => {
    try {
      // ✅ Double-check authentication
      if (!accessToken || !user) {
        console.info('ℹ️ [OrdersPage] User not authenticated, skipping load orders');
        setIsLoading(false);
        return;
      }

      console.info('📡 [OrdersPage] Calling API /orders with token...');
      const response = await api.get('/orders', accessToken!);
      
      console.info('✅ [OrdersPage] API response:', response);
      if (response.success) {
        setOrders(response.orders);
      }
    } catch (error: any) {
      console.error('❌ [OrdersPage] Error loading orders:', error);
      
      // ✅ Show user-friendly error message
      if (error.message?.includes('401')) {
        toast.error('Sesi Anda telah berakhir. Silakan login kembali.');
      } else {
        toast.error('Gagal memuat pesanan. Silakan coba lagi.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
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
    return `${config.bg} ${config.color}`;
  };

  const getStatusText = (status: string) => {
    const statusConfig: Record<string, string> = {
      pending: 'Menunggu Konfirmasi',
      waiting_payment: 'Menunggu Pembayaran',
      processing: 'Sedang Diproses',
      packed: 'Sedang Dikemas',
      shipped: 'Dalam Pengiriman',
      delivered: 'Terkirim',
      cancelled: 'Dibatalkan',
    };

    return statusConfig[status] || status;
  };

  const filterOrders = (tab?: string) => {
    if (!tab || tab === 'all') return orders;
    
    // Map tab to status
    const tabStatusMap: Record<string, string[]> = {
      'waiting_payment': ['waiting_payment', 'pending'], // Belum Bayar
      'packed': ['processing', 'packed'], // Dikemas (processing + packed)
      'shipped': ['shipped'], // Dikirim
      'delivered': ['delivered'], // Selesai
    };
    
    const allowedStatuses = tabStatusMap[tab] || [];
    return orders.filter((order) => allowedStatuses.includes(order.status));
  };

  const handlePay = async (order: Order, e: React.MouseEvent) => {
    e.preventDefault(); // Prevent Link navigation
    e.stopPropagation(); // Prevent card click
    
    console.info('🔍 Paying for order:', order.id, 'Amount:', order.totalAmount);
    const qr = generateQRCode(order.id, order.totalAmount);
    console.info('🔍 Generated QR Code:', qr);
    
    setQrCode(qr);
    setPaymentAmount(order.totalAmount);
    setCurrentOrderId(order.id);
    setCurrentPaymentStatus('waiting_payment');
    setSelectedPaymentMethod('QRIS');
    setShowQRISModal(true);
    console.info('✅ QRIS Modal should be visible now');
  };

  const handleVirtualAccountPay = async (order: Order, bank: 'BCA' | 'BRI' | 'Mandiri' | 'BNI', e: React.MouseEvent) => {
    e.preventDefault(); // Prevent Link navigation
    const method = `${bank}_VA` as PaymentMethod;
    const va = generateVirtualAccount(method);
    setVirtualAccount(va);
    setPaymentAmount(order.totalAmount);
    setCurrentOrderId(order.id);
    setCurrentPaymentStatus('waiting_payment');
    setSelectedPaymentMethod(method);
    setShowVAModal(true);
  };

  const handlePaymentStatusChange = (status: PaymentStatus) => {
    setCurrentPaymentStatus(status);
    
    if (status === 'paid') {
      // ✅ CRITICAL FIX: Confirm payment via API before navigation
      handlePaymentConfirm();
    }
  };

  // ✅ NEW: Handle payment confirmation via API
  const handlePaymentConfirm = async () => {
    if (!currentOrderId || isProcessingPayment) return;

    setIsProcessingPayment(true);

    try {
      console.info('✅ Confirming payment for order:', currentOrderId);

      // Update order payment status to "paid" and status to "processing"
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-adb995ba/orders/${currentOrderId}/payment-status`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
            'X-Session-Token': accessToken!,
          },
          body: JSON.stringify({
            paymentStatus: 'paid',
            status: 'processing',
            paidAt: new Date().toISOString(),
          }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        console.info('✅ Payment confirmed successfully:', result);

        toast.success('Pembayaran berhasil! Pesanan Anda sedang diproses.');

        // ✅ AGGRESSIVE REFRESH: Reload orders multiple times
        const refreshIntervals = [500, 1500, 3000]; // Refresh at 0.5s, 1.5s, and 3s
        refreshIntervals.forEach((delay) => {
          setTimeout(() => {
            console.info(`🔄 Force refreshing orders (${delay}ms)...`);
            loadOrders();
          }, delay);
        });

        // Close modals after showing success message
        setTimeout(() => {
          setShowQRISModal(false);
          setShowVAModal(false);
          // Navigate to payment status page
          navigate(`/payment-status?orderId=${currentOrderId}`);
        }, 2000);
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to confirm payment:', errorText);
        toast.error('Gagal mengkonfirmasi pembayaran');
      }
    } catch (error) {
      console.error('❌ Error confirming payment:', error);
      toast.error('Terjadi kesalahan saat mengkonfirmasi pembayaran');
    } finally {
      setTimeout(() => {
        setIsProcessingPayment(false);
      }, 4000);
    }
  };

  const getBankName = (method: PaymentMethod): string => {
    const bankNames: Record<string, string> = {
      BCA_VA: 'BCA',
      BRI_VA: 'BRI',
      Mandiri_VA: 'Mandiri',
      BNI_VA: 'BNI',
    };
    return bankNames[method] || method;
  };

  return (
    <Layout>
      <div className="flex-1 bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold mb-6">Pesanan Saya</h1>

          <Tabs defaultValue="all">
            <TabsList className="w-full justify-start mb-6">
              <TabsTrigger value="all">Semua</TabsTrigger>
              <TabsTrigger value="waiting_payment">Belum Bayar</TabsTrigger>
              <TabsTrigger value="packed">Dikemas</TabsTrigger>
              <TabsTrigger value="shipped">Dikirim</TabsTrigger>
              <TabsTrigger value="delivered">Selesai</TabsTrigger>
            </TabsList>

            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="p-6">
                    <Skeleton className="h-20 w-full" />
                  </Card>
                ))}
              </div>
            ) : (
              <>
                <TabsContent value="all">
                  <OrderList orders={filterOrders()} getStatusBadge={getStatusBadge} getStatusText={getStatusText} formatPrice={formatPrice} handlePay={handlePay} handleVirtualAccountPay={handleVirtualAccountPay} />
                </TabsContent>
                <TabsContent value="waiting_payment">
                  <OrderList orders={filterOrders('waiting_payment')} getStatusBadge={getStatusBadge} getStatusText={getStatusText} formatPrice={formatPrice} handlePay={handlePay} handleVirtualAccountPay={handleVirtualAccountPay} />
                </TabsContent>
                <TabsContent value="packed">
                  <OrderList orders={filterOrders('packed')} getStatusBadge={getStatusBadge} getStatusText={getStatusText} formatPrice={formatPrice} handlePay={handlePay} handleVirtualAccountPay={handleVirtualAccountPay} />
                </TabsContent>
                <TabsContent value="shipped">
                  <OrderList orders={filterOrders('shipped')} getStatusBadge={getStatusBadge} getStatusText={getStatusText} formatPrice={formatPrice} handlePay={handlePay} handleVirtualAccountPay={handleVirtualAccountPay} />
                </TabsContent>
                <TabsContent value="delivered">
                  <OrderList orders={filterOrders('delivered')} getStatusBadge={getStatusBadge} getStatusText={getStatusText} formatPrice={formatPrice} handlePay={handlePay} handleVirtualAccountPay={handleVirtualAccountPay} />
                </TabsContent>
              </>
            )}
          </Tabs>
        </div>
      </div>
      {showQRISModal && (
        <QRISModal
          isOpen={showQRISModal}
          onClose={() => setShowQRISModal(false)}
          qrCode={qrCode}
          amount={paymentAmount}
          orderId={currentOrderId}
          paymentStatus={currentPaymentStatus}
          onPaymentStatusChange={handlePaymentStatusChange}
          expiryMinutes={10}
        />
      )}
      {showVAModal && selectedPaymentMethod && (
        <VirtualAccountModal
          isOpen={showVAModal}
          onClose={() => setShowVAModal(false)}
          virtualAccount={virtualAccount}
          amount={paymentAmount}
          orderId={currentOrderId}
          bankName={getBankName(selectedPaymentMethod)}
          paymentMethod={selectedPaymentMethod}
          paymentStatus={currentPaymentStatus}
          onPaymentStatusChange={handlePaymentStatusChange}
          expiryHours={24}
        />
      )}
    </Layout>
  );
}

function OrderList({
  orders,
  getStatusBadge,
  getStatusText,
  formatPrice,
  handlePay,
  handleVirtualAccountPay,
}: {
  orders: Order[];
  getStatusBadge: (status: string) => string;
  getStatusText: (status: string) => string;
  formatPrice: (price: number) => string;
  handlePay: (order: Order, e: React.MouseEvent) => void;
  handleVirtualAccountPay: (order: Order, bank: 'BCA' | 'BRI' | 'Mandiri' | 'BNI', e: React.MouseEvent) => void;
}) {
  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">Belum ada pesanan</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <Link key={order.id} to={`/orders/${order.id}`}>
          <Card className="p-6 hover:shadow-lg transition cursor-pointer">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm text-gray-500">ID Pesanan: {order.id}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(order.createdAt).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <Badge className={getStatusBadge(order.status)}>{getStatusText(order.status)}</Badge>
            </div>

            {/* Order Items */}
            <div className="space-y-3 mb-4">
              {order.items.slice(0, 2).map((item, index) => {
                // Debug log for each item
                console.info(`📦 Order ${order.id} Item ${index}:`, {
                  productId: item.productId,
                  productName: item.product?.name,
                  images: item.product?.images,
                  image: item.product?.image,
                });

                return (
                  <div key={`${order.id}-${item.productId}-${index}`} className="flex gap-3">
                    <ImageWithFallback
                      src={item.product?.images?.[0] || item.product?.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100&h=100&fit=crop'}
                      alt={item.product?.name || 'Product'}
                      className="w-16 h-16 object-cover rounded"
                      onError={(e) => {
                        console.error(`❌ Image failed to load for product ${item.productId}:`, e.currentTarget.src);
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100&h=100&fit=crop';
                      }}
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm line-clamp-1">{item.product?.name || 'Product Not Found'}</p>
                      <p className="text-xs text-gray-500">x{item.quantity}</p>
                      <p className="text-sm font-semibold text-green-600">{formatPrice(item.product?.price || item.price || 0)}</p>
                    </div>
                  </div>
                );
              })}
              {order.items.length > 2 && (
                <p className="text-sm text-gray-500">+{order.items.length - 2} produk lainnya</p>
              )}
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <span className="text-sm text-gray-600">Total Pembayaran</span>
              <span className="text-lg font-bold text-green-600">{formatPrice(order.totalAmount)}</span>
            </div>

            {(order.status === 'waiting_payment' || order.status === 'pending') && (
              <div className="mt-4 flex gap-2">
                <Button
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold"
                  onClick={(e) => handlePay(order, e)}
                >
                  💳 Bayar Sekarang
                </Button>
              </div>
            )}

            {order.paymentStatus === 'cod_pending' && (
              <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm font-semibold text-orange-900">💵 Bayar saat Barang Tiba</p>
                <p className="text-xs text-orange-700 mt-1">
                  Pesanan Anda sedang diproses. Pembayaran dilakukan tunai saat barang diterima.
                </p>
              </div>
            )}
          </Card>
        </Link>
      ))}
    </div>
  );
}