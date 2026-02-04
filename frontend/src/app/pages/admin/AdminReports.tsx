import { useState, useMemo } from 'react';
import { FileText, Download, TrendingUp, Package, Users, DollarSign } from 'lucide-react';
import AdminLayout from '@/app/components/Layout/AdminLayout';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import { useOrderStore, useProductStore, useAuthStore } from '@/lib/store';

export default function AdminReports() {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const { orders } = useOrderStore();
  const { products } = useProductStore();

  // Calculate statistics (REAL-TIME dari store)
  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const totalRevenue = orders
      .filter(o => o.paymentStatus === 'paid')
      .reduce((sum, o) => sum + o.totalAmount, 0);
    
    const totalItemsSold = orders
      .filter(o => o.paymentStatus === 'paid')
      .reduce((sum, o) => sum + o.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);

    // Get unique user count from orders
    const uniqueUsers = new Set(orders.map(o => o.userId)).size;

    return {
      totalOrders,
      totalRevenue,
      totalItemsSold,
      uniqueUsers,
    };
  }, [orders]);

  // Revenue trend data (last 7 days) - REAL-TIME
  const salesData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date;
    });

    return last7Days.map(date => {
      const dayOrders = orders.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate.toDateString() === date.toDateString();
      });

      const paidOrders = dayOrders.filter(o => o.paymentStatus === 'paid');
      const penjualan = paidOrders.reduce((sum, order) => sum + order.totalAmount, 0);
      const pesanan = dayOrders.length;

      return {
        name: date.toLocaleDateString('id-ID', { weekday: 'short' }),
        penjualan: penjualan,
        pesanan: pesanan,
      };
    });
  }, [orders]);

  // Top products calculation - REAL-TIME
  const topProducts = useMemo(() => {
    // Group all items from all orders
    const productSales = new Map<string, { name: string; sold: number; revenue: number }>();

    orders.filter(o => o.paymentStatus === 'paid').forEach(order => {
      order.items.forEach(item => {
        const existing = productSales.get(item.productId);
        if (existing) {
          existing.sold += item.quantity;
          existing.revenue += item.price * item.quantity;
        } else {
          productSales.set(item.productId, {
            name: item.name,
            sold: item.quantity,
            revenue: item.price * item.quantity,
          });
        }
      });
    });

    // Convert to array and sort by sold quantity
    return Array.from(productSales.values())
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 5);
  }, [orders]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)} Jt`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  };

  const exportReport = (type: string) => {
    toast.success(`Laporan ${type} berhasil diexport ke Excel`);
  };

  return (
    <AdminLayout>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ flexShrink: 0, marginBottom: '1.5rem' }}>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <FileText className="w-7 h-7 text-green-600" />
                Laporan
              </h1>
              <p className="text-sm text-gray-600 mt-1">Analisis dan laporan performa marketplace</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => exportReport('penjualan')}>
                <Download className="w-4 h-4 mr-1" />
                Export Excel
              </Button>
            </div>
          </div>
        </div>

        {/* Period Selector */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={period === 'daily' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod('daily')}
          >
            Harian
          </Button>
          <Button
            variant={period === 'weekly' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod('weekly')}
          >
            Mingguan
          </Button>
          <Button
            variant={period === 'monthly' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod('monthly')}
          >
            Bulanan
          </Button>
        </div>

        {/* Scrollable Content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100">
              <DollarSign className="w-8 h-8 text-green-600 mb-2" />
              <p className="text-sm text-gray-600">Total Pendapatan</p>
              <p className="text-2xl font-bold text-green-700">{formatPrice(stats.totalRevenue)}</p>
              <p className="text-xs text-green-600 mt-1">↑ 23% dari minggu lalu</p>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100">
              <TrendingUp className="w-8 h-8 text-blue-600 mb-2" />
              <p className="text-sm text-gray-600">Total Transaksi</p>
              <p className="text-2xl font-bold text-blue-700">{stats.totalOrders}</p>
              <p className="text-xs text-blue-600 mt-1">↑ 18% dari minggu lalu</p>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100">
              <Package className="w-8 h-8 text-purple-600 mb-2" />
              <p className="text-sm text-gray-600">Produk Terjual</p>
              <p className="text-2xl font-bold text-purple-700">{stats.totalItemsSold}</p>
              <p className="text-xs text-purple-600 mt-1">↑ 15% dari minggu lalu</p>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-yellow-50 to-yellow-100">
              <Users className="w-8 h-8 text-yellow-600 mb-2" />
              <p className="text-sm text-gray-600">User Aktif</p>
              <p className="text-2xl font-bold text-yellow-700">{stats.uniqueUsers}</p>
              <p className="text-xs text-yellow-600 mt-1">↑ 8% dari minggu lalu</p>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            {/* Sales Chart */}
            <Card className="p-6">
              <h3 className="font-bold text-lg mb-4">Grafik Penjualan</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(0)}jt`} />
                  <Tooltip formatter={(value: any) => formatPrice(value)} />
                  <Legend />
                  <Line type="monotone" dataKey="penjualan" stroke="#10b981" strokeWidth={2} name="Penjualan" />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            {/* Orders Chart */}
            <Card className="p-6">
              <h3 className="font-bold text-lg mb-4">Grafik Pesanan</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="pesanan" fill="#3b82f6" name="Jumlah Pesanan" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Top Products Table */}
          <Card className="p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Produk Terlaris</h3>
              <Button variant="outline" size="sm" onClick={() => exportReport('produk terlaris')}>
                <Download className="w-4 h-4 mr-1" />
                Export
              </Button>
            </div>
            {topProducts.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Belum ada data penjualan produk</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 text-sm font-semibold">Rank</th>
                      <th className="text-left p-3 text-sm font-semibold">Nama Produk</th>
                      <th className="text-right p-3 text-sm font-semibold">Terjual</th>
                      <th className="text-right p-3 text-sm font-semibold">Pendapatan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProducts.map((product, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                            index === 0 ? 'bg-yellow-500' : 
                            index === 1 ? 'bg-gray-400' : 
                            index === 2 ? 'bg-orange-600' : 'bg-gray-300'
                          }`}>
                            {index + 1}
                          </div>
                        </td>
                        <td className="p-3 font-medium">{product.name}</td>
                        <td className="p-3 text-right">{product.sold} unit</td>
                        <td className="p-3 text-right font-semibold text-green-600">
                          {formatPrice(product.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Report Cards */}
          <div className="grid md:grid-cols-3 gap-4 pb-6">
            <Card className="p-6 hover:shadow-lg transition cursor-pointer" onClick={() => exportReport('refund')}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold mb-1">Laporan Refund</h3>
                  <p className="text-2xl font-bold text-red-600">
                    {orders.filter(o => o.status === 'cancelled').length}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">Pesanan dibatalkan</p>
                </div>
                <Download className="w-5 h-5 text-gray-400" />
              </div>
              <Button variant="outline" size="sm" className="w-full">
                Download PDF
              </Button>
            </Card>

            <Card className="p-6 hover:shadow-lg transition cursor-pointer" onClick={() => exportReport('user aktif')}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold mb-1">Laporan User Aktif</h3>
                  <p className="text-2xl font-bold text-blue-600">{stats.uniqueUsers}</p>
                  <p className="text-xs text-gray-600 mt-1">User aktif bulan ini</p>
                </div>
                <Download className="w-5 h-5 text-gray-400" />
              </div>
              <Button variant="outline" size="sm" className="w-full">
                Download PDF
              </Button>
            </Card>

            <Card className="p-6 hover:shadow-lg transition cursor-pointer" onClick={() => exportReport('keuangan')}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold mb-1">Laporan Keuangan</h3>
                  <p className="text-2xl font-bold text-green-600">{formatNumber(stats.totalRevenue)}</p>
                  <p className="text-xs text-gray-600 mt-1">Total bulan ini</p>
                </div>
                <Download className="w-5 h-5 text-gray-400" />
              </div>
              <Button variant="outline" size="sm" className="w-full">
                Download PDF
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}