import AdminPageWrapper from '@/app/components/AdminPageWrapper';
import AdminLayout from '@/app/components/Layout/AdminLayout';
import { Card } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { 
  ShoppingCart, 
  Package, 
  Users, 
  TrendingUp,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw
} from 'lucide-react';
import { useOrderStore, useProductStore, useAuthStore } from '@/lib/store';
import { useMemo, useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { syncAdminData } from '@/lib/syncManager';
import { toast } from 'sonner';
import { Button } from '@/app/components/ui/button';

export default function AdminDashboard() {
  const { orders } = useOrderStore();
  const { products } = useProductStore();
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // ✅ NEW: Load all admin data on mount
  useEffect(() => {
    const loadAdminData = async () => {
      if (user?.role !== 'admin') {
        console.info('[AdminDashboard] User is not admin, skipping data load');
        setIsLoading(false);
        return;
      }

      console.info('[AdminDashboard] Loading admin data...');
      setIsLoading(true);
      
      try {
        await syncAdminData();
        console.info('[AdminDashboard] Admin data loaded successfully');
      } catch (error) {
        console.error('[AdminDashboard] Failed to load admin data:', error);
        toast.error('Gagal memuat data dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    loadAdminData();
  }, [user?.role]);

  // ✅ NEW: Manual refresh function
  const handleRefresh = async () => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    try {
      await syncAdminData();
      toast.success('Data berhasil diperbarui');
    } catch (error) {
      console.error('[AdminDashboard] Refresh failed:', error);
      toast.error('Gagal memperbarui data');
    } finally {
      setIsSyncing(false);
    }
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => o.status === 'waiting_payment' || o.status === 'pending').length;
    const processingOrders = orders.filter(o => o.status === 'processing' || o.status === 'packed').length;
    const deliveredOrders = orders.filter(o => o.status === 'delivered').length;
    const shippedOrders = orders.filter(o => o.status === 'shipped').length;
    const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;
    const totalRevenue = orders
      .filter(o => o.paymentStatus === 'paid')
      .reduce((sum, o) => sum + o.totalAmount, 0);
    const totalProducts = products.length;
    const lowStockProducts = products.filter(p => p.stock > 0 && p.stock <= 10).length;

    return {
      totalOrders,
      pendingOrders,
      processingOrders,
      deliveredOrders,
      shippedOrders,
      cancelledOrders,
      totalRevenue,
      totalProducts,
      lowStockProducts,
    };
  }, [orders, products]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  // Order status distribution for pie chart
  const orderStatusData = useMemo(() => [
    { name: 'Menunggu Pembayaran', value: stats.pendingOrders, color: '#f97316' },
    { name: 'Sedang Diproses', value: stats.processingOrders, color: '#a855f7' },
    { name: 'Dikirim', value: stats.shippedOrders, color: '#3b82f6' },
    { name: 'Selesai', value: stats.deliveredOrders, color: '#10b981' },
    { name: 'Dibatalkan', value: stats.cancelledOrders, color: '#ef4444' },
  ].filter(item => item.value > 0), [stats]);

  // Revenue trend data (last 7 days)
  const revenueTrendData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date;
    });

    return last7Days.map(date => {
      const dayOrders = orders.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate.toDateString() === date.toDateString() && order.paymentStatus === 'paid';
      });

      const revenue = dayOrders.reduce((sum, order) => sum + order.totalAmount, 0);

      return {
        date: date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
        revenue: revenue,
        orders: dayOrders.length,
      };
    });
  }, [orders]);

  // Recent orders (last 5)
  const recentOrders = useMemo(() => {
    return [...orders]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [orders]);

  return (
    <AdminLayout>
      <AdminPageWrapper>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent">
                Dashboard Admin
              </h1>
              <p className="text-gray-600 mt-2">Selamat datang di halaman admin</p>
            </div>
            {isLoading && (
              <div className="flex items-center gap-2 text-orange-600">
                <RefreshCw className="animate-spin h-5 w-5" />
                <span className="text-sm">Memuat data...</span>
              </div>
            )}
          </div>

          {/* Main Stats Cards - Sesuai dengan gambar */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Orders */}
            <Card className="p-6 hover:shadow-lg transition-shadow border-l-4 border-blue-500">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <ShoppingCart className="w-6 h-6 text-blue-600" />
                </div>
                <Badge className="bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700">
                  Total
                </Badge>
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900">{stats.totalOrders}</p>
                <p className="text-sm text-gray-600 mt-1">Total Pesanan</p>
              </div>
            </Card>

            {/* Pending Orders */}
            <Card className="p-6 hover:shadow-lg transition-shadow border-l-4 border-orange-500">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Clock className="w-6 h-6 text-orange-600" />
                </div>
                <Badge className="bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700">
                  Pending
                </Badge>
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900">{stats.pendingOrders}</p>
                <p className="text-sm text-gray-600 mt-1">Menunggu Pembayaran</p>
              </div>
            </Card>

            {/* Processing Orders */}
            <Card className="p-6 hover:shadow-lg transition-shadow border-l-4 border-purple-500">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Package className="w-6 h-6 text-purple-600" />
                </div>
                <Badge className="bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700">
                  Processing
                </Badge>
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900">{stats.processingOrders}</p>
                <p className="text-sm text-gray-600 mt-1">Sedang Diproses</p>
              </div>
            </Card>

            {/* Total Revenue */}
            <Card className="p-6 hover:shadow-lg transition-shadow border-l-4 border-green-500">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <Badge className="bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700">
                  Revenue
                </Badge>
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{formatPrice(stats.totalRevenue)}</p>
                <p className="text-sm text-gray-600 mt-1">Total Pendapatan</p>
              </div>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Trend Chart */}
            <Card className="p-6">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900">Tren Pendapatan (7 Hari Terakhir)</h2>
                <p className="text-sm text-gray-600 mt-1">Grafik pendapatan harian</p>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#6b7280"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    style={{ fontSize: '12px' }}
                    tickFormatter={(value) => `${(value / 1000000).toFixed(1)}jt`}
                  />
                  <Tooltip 
                    formatter={(value: any) => [formatPrice(value), 'Pendapatan']}
                    contentStyle={{ 
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '8px 12px'
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    name="Pendapatan"
                    stroke="#10b981" 
                    strokeWidth={3}
                    dot={{ fill: '#10b981', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            {/* Order Status Distribution */}
            <Card className="p-6">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900">Distribusi Status Pesanan</h2>
                <p className="text-sm text-gray-600 mt-1">Pembagian pesanan berdasarkan status</p>
              </div>
              {orderStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={orderStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => {
                        // Type guards to ensure safe rendering in template literal
                        const safeName = typeof entry.name === 'string' ? entry.name : String(entry.name || '');
                        const safeValue = typeof entry.value === 'number' || typeof entry.value === 'string' ? entry.value : '';
                        return `${safeName}: ${safeValue}`;
                      }}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {orderStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '8px 12px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px]">
                  <p className="text-gray-500">Belum ada data pesanan</p>
                </div>
              )}
            </Card>
          </div>

          {/* Additional Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Products */}
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-100 rounded-lg">
                  <Package className="w-6 h-6 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <p className="text-2xl font-bold text-gray-900">{stats.totalProducts}</p>
                  <p className="text-sm text-gray-600">Total Produk</p>
                </div>
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
            </Card>

            {/* Low Stock Products */}
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <p className="text-2xl font-bold text-gray-900">{stats.lowStockProducts}</p>
                  <p className="text-sm text-gray-600">Stok Menipis</p>
                </div>
                {stats.lowStockProducts > 0 && (
                  <ArrowDownRight className="w-5 h-5 text-red-600" />
                )}
              </div>
            </Card>

            {/* Delivered Orders */}
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-2xl font-bold text-gray-900">{stats.deliveredOrders}</p>
                  <p className="text-sm text-gray-600">Pesanan Selesai</p>
                </div>
                <ArrowUpRight className="w-5 h-5 text-green-600" />
              </div>
            </Card>
          </div>

          {/* Recent Orders */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Pesanan Terbaru</h2>
                <p className="text-sm text-gray-600 mt-1">5 pesanan terakhir</p>
              </div>
              <Badge className="bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:from-orange-600 hover:to-pink-600">
                {recentOrders.length} pesanan
              </Badge>
            </div>

            {recentOrders.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Belum ada pesanan</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentOrders.map((order) => {
                  const getStatusBadge = (status: string) => {
                    const statusConfig: Record<string, { label: string; className: string }> = {
                      pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-700' },
                      waiting_payment: { label: 'Menunggu Pembayaran', className: 'bg-orange-100 text-orange-700' },
                      processing: { label: 'Diproses', className: 'bg-blue-100 text-blue-700' },
                      packed: { label: 'Dikemas', className: 'bg-indigo-100 text-indigo-700' },
                      shipped: { label: 'Dikirim', className: 'bg-purple-100 text-purple-700' },
                      delivered: { label: 'Selesai', className: 'bg-green-100 text-green-700' },
                      cancelled: { label: 'Dibatalkan', className: 'bg-red-100 text-red-700' },
                    };

                    const config = statusConfig[status] || statusConfig.pending;
                    return (
                      <Badge className={config.className}>
                        {config.label}
                      </Badge>
                    );
                  };

                  return (
                    <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <p className="font-semibold text-gray-900">#{order.id}</p>
                          {getStatusBadge(order.status)}
                        </div>
                        <p className="text-sm text-gray-600">
                          {new Date(order.createdAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {order.items.length} item • {order.paymentMethod}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600">
                          {formatPrice(order.totalAmount)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Quick Actions */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Quick Actions</h2>
              <Button
                onClick={handleRefresh}
                disabled={isSyncing || isLoading}
                size="sm"
                variant="outline"
                className="border-orange-500 text-orange-600 hover:bg-orange-50"
              >
                {isSyncing ? (
                  <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Refresh Data
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <a
                href="/admin/orders"
                className="p-4 border-2 border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition group"
              >
                <ShoppingCart className="w-8 h-8 text-gray-600 group-hover:text-orange-600 mb-2" />
                <p className="font-semibold text-gray-900 group-hover:text-orange-600">
                  Kelola Pesanan
                </p>
                <p className="text-sm text-gray-600">
                  {stats.pendingOrders} pesanan menunggu
                </p>
              </a>

              <a
                href="/admin/products"
                className="p-4 border-2 border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition group"
              >
                <Package className="w-8 h-8 text-gray-600 group-hover:text-orange-600 mb-2" />
                <p className="font-semibold text-gray-900 group-hover:text-orange-600">
                  Kelola Produk
                </p>
                <p className="text-sm text-gray-600">
                  {stats.lowStockProducts} produk stok menipis
                </p>
              </a>

              <a
                href="/admin/users"
                className="p-4 border-2 border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition group"
              >
                <Users className="w-8 h-8 text-gray-600 group-hover:text-orange-600 mb-2" />
                <p className="font-semibold text-gray-900 group-hover:text-orange-600">
                  Kelola Pengguna
                </p>
                <p className="text-sm text-gray-600">
                  Lihat semua pengguna
                </p>
              </a>
            </div>
          </Card>
        </div>
      </AdminPageWrapper>
    </AdminLayout>
  );
}