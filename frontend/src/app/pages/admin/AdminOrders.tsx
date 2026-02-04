import { useState, useEffect, useMemo } from 'react';
import AdminLayout from '@/app/components/Layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Input } from '@/app/components/ui/input';
import {
  Package,
  RefreshCw,
  Search,
  Eye,
  AlertCircle,
  ShoppingBag,
  Clock,
} from 'lucide-react';
import { OrderSync } from '@/lib/syncManager';
import { Order, useAuthStore, useOrderStore } from '@/lib/store';
import { toast } from 'sonner';
import { useRefundStore } from '@/lib/refundStore';
import OrderDetailModal from '@/app/components/admin/OrderDetailModal';
import { refreshSession } from '@/lib/supabase';

export default function AdminOrders() {
  const { accessToken, user } = useAuthStore();
  const { orders, setOrders } = useOrderStore();
  const { createRefund } = useRefundStore();
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const loadOrders = async () => {
    if (!user?.role || user.role !== 'admin') {
      console.info('[AdminOrders] User is not admin');
      console.info('[AdminOrders] User role:', user?.role || 'UNKNOWN');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      // ✅ v17.5 FIX: Refresh session before loading to ensure token is fresh
      console.info('🔄 [AdminOrders] Refreshing session to ensure fresh token...');
      const refreshResult = await refreshSession();
      
      if (refreshResult.success && refreshResult.session) {
        console.info('✅ [AdminOrders] Session refreshed successfully');
        // Token will be automatically updated by getAccessToken in syncManager
      } else {
        console.warn('⚠️ [AdminOrders] Session refresh failed, continuing with existing token...');
      }
      
      console.info('📡 [AdminOrders] Loading orders...');
      console.info('👤 [AdminOrders] User:', user.email, 'Role:', user.role);
      
      const allOrders = await OrderSync.getAllOrders();
      if (allOrders && allOrders.length >= 0) {
        setOrders(allOrders);
        console.info('✅ [AdminOrders] Loaded orders successfully:', allOrders.length);
      }
    } catch (error: any) {
      console.error('❌ [AdminOrders] Failed to load orders:', error);
      console.error('   Error message:', error.message);
      console.error('   Error response:', error.response);
      
      // ✅ NEW: Check if error is token-related
      if (error.message && (error.message.includes('Unauthorized') || error.message.includes('401'))) {
        console.error('🔴 [AdminOrders] Token-related error detected!');
        console.error('   This could mean:');
        console.error('   1. Token has expired');
        console.error('   2. Token is invalid');
        console.error('   3. User metadata does not have admin role');
        toast.error('Sesi Anda mungkin telah berakhir. Silakan login ulang.');
      } else {
        toast.error('Gagal memuat data pesanan');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ v17.5: Load orders on mount (removed accessToken dependency - handled by refresh)
  useEffect(() => {
    if (user?.role === 'admin') {
      loadOrders();
    }
  }, [user?.role]);

  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return orders;

    const query = searchQuery.toLowerCase();
    return orders.filter((order) =>
      order.id.toLowerCase().includes(query) ||
      order.shippingAddress.name.toLowerCase().includes(query) ||
      order.shippingAddress.phone.toLowerCase().includes(query)
    );
  }, [orders, searchQuery]);

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      waiting_payment: 'bg-orange-100 text-orange-700',
      processing: 'bg-blue-100 text-blue-700',
      packed: 'bg-indigo-100 text-indigo-700',
      shipped: 'bg-purple-100 text-purple-700',
      delivered: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700',
    };
    return statusMap[status] || statusMap.pending;
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: 'Menunggu Konfirmasi',
      waiting_payment: 'Menunggu Pembayaran',
      processing: 'Sedang Diproses',
      packed: 'Sedang Dikemas',
      shipped: 'Dalam Pengiriman',
      delivered: 'Terkirim',
      cancelled: 'Dibatalkan',
    };
    return statusMap[status] || status;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kelola Pesanan</h1>
          <p className="text-gray-600">Manage dan update status pesanan customer</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{orders.length}</div>
                  <div className="text-xs text-gray-600">Total Pesanan</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {orders.filter((o) => ['pending', 'waiting_payment'].includes(o.status)).length}
                  </div>
                  <div className="text-xs text-gray-600">Pending</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {orders.filter((o) => ['processing', 'packed', 'shipped'].includes(o.status)).length}
                  </div>
                  <div className="text-xs text-gray-600">Processing</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {orders.filter((o) => o.status === 'delivered').length}
                  </div>
                  <div className="text-xs text-gray-600">Selesai</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <CardTitle>Daftar Pesanan</CardTitle>
              <div className="flex gap-2">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Cari order ID, nama, telepon..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button variant="outline" onClick={loadOrders} disabled={isLoading}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="w-12 h-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {searchQuery ? 'Tidak Ada Hasil' : 'Belum Ada Pesanan'}
                </h3>
                <p className="text-gray-600">
                  {searchQuery ? 'Coba ubah kata kunci pencarian' : 'Belum ada pesanan dari customer'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="py-3 px-4 text-left text-sm font-semibold text-gray-900">Order ID</th>
                      <th className="py-3 px-4 text-left text-sm font-semibold text-gray-900">Tanggal</th>
                      <th className="py-3 px-4 text-left text-sm font-semibold text-gray-900">Customer</th>
                      <th className="py-3 px-4 text-right text-sm font-semibold text-gray-900">Total</th>
                      <th className="py-3 px-4 text-center text-sm font-semibold text-gray-900">Status</th>
                      <th className="py-3 px-4 text-center text-sm font-semibold text-gray-900">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => (
                      <tr key={order.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <span className="font-mono text-sm">{order.id}</span>
                        </td>
                        <td className="py-3 px-4">
                          {new Date(order.createdAt).toLocaleDateString('id-ID')}
                        </td>
                        <td className="py-3 px-4">{order.shippingAddress.name}</td>
                        <td className="py-3 px-4 text-right font-semibold">
                          {formatPrice(order.totalAmount)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge className={getStatusBadge(order.status)}>
                            {getStatusText(order.status)}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedOrder(order);
                              setIsDetailOpen(true);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Detail
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <OrderDetailModal
        order={selectedOrder}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onUpdateStatus={async (orderId, status, note) => {
          try {
            console.info('Updating status:', { orderId, status, note });
            
            // ✅ FIXED: Backend already handles auto-refund, no need to create here
            const order = await OrderSync.updateOrderStatus(orderId, status, note);

            toast.success('Status pesanan berhasil diperbarui');
            
            // ✅ FIXED: Removed frontend auto-refund logic
            // Backend already creates auto-refund for cancelled paid orders (except COD)
            // No need to create refund here to avoid duplication
            
            setIsDetailOpen(false);
            setSelectedOrder(null);
            await loadOrders();
          } catch (error: any) {
            console.error('Error updating status:', error);
            toast.error(error.message || 'Terjadi kesalahan');
          }
        }}
      />
    </AdminLayout>
  );
}