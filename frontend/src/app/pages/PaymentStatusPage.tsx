import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { CheckCircle, XCircle, Clock, Package } from 'lucide-react';
import Layout from '@/app/components/Layout/Layout';
import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';
import { getPaymentStatusDisplay, getPaymentMethodName } from '@/lib/paymentStore';
import { Order, useAuthStore } from '@/lib/store';
import { api } from '@/lib/supabase';

export default function PaymentStatusPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const { accessToken } = useAuthStore();
  
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ✅ Fetch order from API on mount and poll for updates
  useEffect(() => {
    if (!orderId || !accessToken) {
      setIsLoading(false);
      return;
    }

    // Initial fetch
    loadOrder();

    // Poll for updates every 3 seconds
    const interval = setInterval(() => {
      console.info('🔄 Polling order status...');
      loadOrder();
    }, 3000);

    return () => clearInterval(interval);
  }, [orderId, accessToken]);

  const loadOrder = async () => {
    try {
      console.info('📦 Loading order:', orderId);
      console.info('🔑 Access token:', accessToken ? 'Present' : 'Missing');
      
      if (!accessToken) {
        console.error('❌ No access token available');
        setIsLoading(false);
        return;
      }

      const response = await api.get(`/orders/${orderId}`, accessToken);
      
      console.info('📦 Order API response:', response);
      
      if (response.success && response.order) {
        console.info('✅ Order loaded:', response.order);
        setOrder(response.order);
      } else {
        console.error('❌ Failed to load order:', response);
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
        console.error('❌ Network error: Failed to connect to server');
      } else if (error.message?.includes('401')) {
        console.error('❌ Auth error: Session expired');
      }
    } finally {
      setIsLoading(false);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!orderId || !order || isLoading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-8 text-center">
            {isLoading ? (
              <>
                <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4 animate-pulse" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Memuat...</h2>
                <p className="text-gray-600 mb-6">
                  Mohon tunggu, kami sedang memuat informasi pesanan Anda.
                </p>
              </>
            ) : (
              <>
                <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Pesanan Tidak Ditemukan</h2>
                <p className="text-gray-600 mb-6">
                  Maaf, kami tidak dapat menemukan informasi pesanan Anda.
                </p>
                <Button
                  onClick={() => navigate('/orders')}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                >
                  Lihat Semua Pesanan
                </Button>
              </>
            )}
          </Card>
        </div>
      </Layout>
    );
  }

  const statusDisplay = getPaymentStatusDisplay(order.paymentStatus);

  const getStatusIcon = () => {
    switch (order.paymentStatus) {
      case 'paid':
        return <CheckCircle className="w-20 h-20 text-green-600" />;
      case 'cod_pending':
        return <Package className="w-20 h-20 text-orange-500" />;
      case 'waiting_payment':
        return <Clock className="w-20 h-20 text-yellow-500" />;
      case 'expired':
      case 'failed':
        return <XCircle className="w-20 h-20 text-red-600" />;
      default:
        return <Package className="w-20 h-20 text-gray-400" />;
    }
  };

  const getStatusMessage = () => {
    switch (order.paymentStatus) {
      case 'paid':
        // ✅ Special message for COD orders
        if (order.paymentMethod === 'cod') {
          return {
            title: 'Pesanan Berhasil Dibuat!',
            description: 'Pesanan Anda sedang diproses. Pembayaran akan dilakukan saat barang diterima (Cash on Delivery).',
            bgColor: 'bg-green-50',
            borderColor: 'border-green-200',
          };
        }
        return {
          title: 'Pembayaran Berhasil!',
          description: 'Terima kasih, pembayaran Anda telah kami terima. Pesanan Anda sedang diproses dan akan segera dikirim.',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
        };
      case 'cod_pending':
        return {
          title: 'Pesanan Berhasil Dibuat!',
          description: 'Pesanan Anda sedang diproses. Pembayaran akan dilakukan tunai saat barang diterima (Cash on Delivery).',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
        };
      case 'waiting_payment':
        return {
          title: 'Menunggu Pembayaran',
          description: 'Pesanan Anda sudah dibuat. Silakan selesaikan pembayaran untuk melanjutkan proses.',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
        };
      case 'expired':
        return {
          title: 'Pembayaran Kedaluwarsa',
          description: 'Waktu pembayaran telah habis. Silakan lakukan pemesanan ulang untuk melanjutkan.',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
        };
      case 'failed':
        return {
          title: 'Pembayaran Gagal',
          description: 'Terjadi kesalahan saat memproses pembayaran Anda. Silakan coba lagi atau hubungi customer service.',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
        };
      default:
        return {
          title: 'Status Tidak Diketahui',
          description: 'Kami sedang memeriksa status pembayaran Anda.',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
        };
    }
  };

  const statusInfo = getStatusMessage();

  // Type guards for safe className rendering
  const safeBorderColor = typeof statusInfo.borderColor === 'string' ? statusInfo.borderColor : 'border-gray-200';
  const safeBgColor = typeof statusInfo.bgColor === 'string' ? statusInfo.bgColor : 'bg-gray-50';
  const safeTitle = typeof statusInfo.title === 'string' ? statusInfo.title : 'Status';
  const safeDescription = typeof statusInfo.description === 'string' ? statusInfo.description : '';

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Status Card */}
          <Card className={`p-8 mb-6 border-2 ${safeBorderColor} ${safeBgColor}`}>
            <div className="text-center mb-6">
              <div className="mb-4 flex justify-center">{getStatusIcon()}</div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{safeTitle}</h1>
              <p className="text-gray-600 text-lg">{safeDescription}</p>
            </div>

            {/* Payment Status Badge */}
            <div className="flex justify-center mb-6">
              <span
                className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${typeof statusDisplay.bgColor === 'string' ? statusDisplay.bgColor : 'bg-gray-100'} ${typeof statusDisplay.color === 'string' ? statusDisplay.color : 'text-gray-700'}`}
              >
                {typeof statusDisplay.label === 'string' ? statusDisplay.label : ''}
              </span>
            </div>

            {/* Actions based on status */}
            <div className="flex flex-col sm:flex-row gap-3">
              {order.paymentStatus === 'paid' && (
                <>
                  <Button
                    onClick={() => navigate(`/orders`)}
                    className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                  >
                    <Package className="w-5 h-5 mr-2" />
                    Lihat Detail Pesanan
                  </Button>
                  <Button
                    onClick={() => navigate('/')}
                    variant="outline"
                    className="flex-1"
                  >
                    Kembali ke Beranda
                  </Button>
                </>
              )}

              {order.paymentStatus === 'cod_pending' && (
                <>
                  <Button
                    onClick={() => navigate(`/orders`)}
                    className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
                  >
                    <Package className="w-5 h-5 mr-2" />
                    Lihat Detail Pesanan
                  </Button>
                  <Button
                    onClick={() => navigate('/')}
                    variant="outline"
                    className="flex-1"
                  >
                    Kembali ke Beranda
                  </Button>
                </>
              )}

              {order.paymentStatus === 'waiting_payment' && (
                <>
                  <Button
                    onClick={() => navigate(`/orders`)}
                    className="flex-1 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700"
                  >
                    Lihat Instruksi Pembayaran
                  </Button>
                  <Button
                    onClick={() => navigate('/')}
                    variant="outline"
                    className="flex-1"
                  >
                    Kembali ke Beranda
                  </Button>
                </>
              )}

              {(order.paymentStatus === 'expired' || order.paymentStatus === 'failed') && (
                <>
                  <Button
                    onClick={() => navigate('/products')}
                    className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                  >
                    Belanja Lagi
                  </Button>
                  <Button
                    onClick={() => navigate('/orders')}
                    variant="outline"
                    className="flex-1"
                  >
                    Lihat Pesanan
                  </Button>
                </>
              )}
            </div>
          </Card>

          {/* Order Details Card */}
          <Card className="p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Detail Pesanan</h2>
            
            <div className="space-y-3 border-t pt-4">
              <div className="flex justify-between">
                <span className="text-gray-600">ID Pesanan:</span>
                <span className="font-mono font-semibold text-gray-900">{order.id}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Metode Pembayaran:</span>
                <span className="font-semibold text-gray-900">
                  {getPaymentMethodName(order.paymentMethod)}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Total Pembayaran:</span>
                <span className="text-xl font-bold text-green-600">
                  {formatPrice(order.totalAmount)}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Tanggal Pesanan:</span>
                <span className="text-gray-900">{formatDate(order.createdAt)}</span>
              </div>
              
              {order.paidAt && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Tanggal Pembayaran:</span>
                  <span className="text-gray-900">{formatDate(order.paidAt)}</span>
                </div>
              )}
            </div>
          </Card>

          {/* Items Card */}
          <Card className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Produk yang Dipesan</h2>
            
            {/* ✅ DEBUG: Log items data */}
            {console.info('🔍 [PaymentStatus] Order items:', order.items)}
            {console.info('🔍 [PaymentStatus] Order items length:', order.items?.length || 0)}
            
            <div className="space-y-4">
              {(!order.items || order.items.length === 0) ? (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Tidak ada produk ditemukan</p>
                  <p className="text-xs text-gray-400 mt-1">Order ID: {order.id}</p>
                </div>
              ) : (
                order.items.map((item, index) => (
                  <div key={`payment-item-${item.productId}-${index}`} className="flex gap-4 pb-4 border-b last:border-b-0">
                    <img
                      src={item.product?.images?.[0] || item.product?.image || 'https://via.placeholder.com/150?text=No+Image'}
                      alt={item.product?.name || 'Product'}
                      className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                      onError={(e) => {
                        e.currentTarget.src = 'https://via.placeholder.com/150?text=No+Image';
                      }}
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{item.product?.name || 'Produk'}</h3>
                      <p className="text-sm text-gray-600">Jumlah: {item.quantity}</p>
                      <p className="text-sm font-semibold text-green-600">
                        {formatPrice((item.price || item.product?.price || 0) * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 pt-4 border-t space-y-2">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal:</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>
                  Ongkir ({typeof order.shippingMethod === 'object' && order.shippingMethod?.serviceName
                    ? order.shippingMethod.serviceName
                    : order.shippingMethod || 'Standard'}):
                </span>
                <span>{formatPrice(order.shippingCost)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-gray-900">
                <span>Total:</span>
                <span className="text-green-600">{formatPrice(order.totalAmount)}</span>
              </div>
            </div>
          </Card>

          {/* Help Section */}
          <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm">
              Butuh bantuan?{' '}
              <button
                onClick={() => navigate('/chat')}
                className="text-green-600 hover:text-green-700 font-semibold"
              >
                Hubungi Customer Service
              </button>
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}