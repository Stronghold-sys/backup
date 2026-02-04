import { useState, useEffect } from 'react';
import { Bell, Package, TrendingUp, AlertCircle, CheckCircle, Zap, RefreshCw, Wallet, ShoppingBag, Wrench } from 'lucide-react';
import Layout from '@/app/components/Layout/Layout';
import { Card } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { useNotificationStore } from '@/lib/notificationStore';
import { useAuthStore } from '@/lib/store';
import { useMaintenanceStore } from '@/lib/maintenanceStore';
import { toast } from 'sonner';

export default function NotificationsPage() {
  const {
    notifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getUnreadCount,
  } = useNotificationStore();
  
  const { user } = useAuthStore();
  const { maintenance, isUnderMaintenance } = useMaintenanceStore(); // ✅ Get maintenance status
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  
  // Debug logging
  useEffect(() => {
    if (user) {
      console.info('📄 [NotificationsPage] Debug:', {
        userId: user.id,
        totalNotifications: notifications.length,
        allNotifications: notifications,
      });
    }
  }, [user, notifications]);

  const handleMarkAsRead = (id: string) => {
    markAsRead(id);
    toast.success('Notifikasi ditandai sudah dibaca');
  };

  const handleMarkAllAsRead = () => {
    if (!user) return;
    const unreadCount = getUnreadCount(user.id);
    if (unreadCount === 0) {
      toast.info('Semua notifikasi sudah dibaca');
      return;
    }
    markAllAsRead(user.id);
    toast.success(`${unreadCount} notifikasi ditandai sudah dibaca`);
  };

  const handleDelete = (id: string) => {
    deleteNotification(id);
    toast.success('Notifikasi dihapus');
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'order_created':
        return <ShoppingBag className="w-5 h-5 text-green-600" />;
      case 'order_processing':
        return <Package className="w-5 h-5 text-blue-600" />;
      case 'payment_pending':
      case 'payment_reminder':
        return <Wallet className="w-5 h-5 text-yellow-600" />;
      case 'order_shipped':
        return <Package className="w-5 h-5 text-indigo-600" />;
      case 'order_delivered':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'refund_requested':
      case 'refund_approved':
      case 'refund_completed':
        return <RefreshCw className="w-5 h-5 text-purple-600" />;
      case 'flash_sale':
        return <Zap className="w-5 h-5 text-orange-600" />;
      case 'maintenance':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'system':
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
      default:
        return <Bell className="w-5 h-5 text-gray-600" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const now = new Date();
    const notifDate = new Date(timestamp);
    const diffMs = now.getTime() - notifDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Baru saja';
    if (diffMins < 60) return `${diffMins} menit yang lalu`;
    if (diffHours < 24) return `${diffHours} jam yang lalu`;
    if (diffDays < 7) return `${diffDays} hari yang lalu`;
    
    return notifDate.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const filteredNotifications = notifications.filter(notif => {
    // Filter by user first
    if (user && notif.userId !== user.id) return false;
    
    // Then filter by read status
    if (filter === 'unread') return !notif.read;
    if (filter === 'read') return notif.read;
    return true;
  });

  const unreadCount = user ? getUnreadCount(user.id) : 0;

  // ✅ Helper function to format maintenance end time
  const getMaintenanceEndTime = () => {
    if (!maintenance.endTime) return null;
    const endTime = new Date(maintenance.endTime);
    const now = new Date();
    const diffMs = endTime.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    
    if (diffMins < 1) return 'Segera selesai';
    if (diffMins < 60) return `${diffMins} menit lagi`;
    if (diffHours < 24) return `${diffHours} jam lagi`;
    
    return endTime.toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Layout>
      <div className="flex-1 bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Notifikasi</h1>
              <p className="text-gray-600 mt-1">
                {unreadCount > 0 ? `${unreadCount} notifikasi belum dibaca` : 'Semua notifikasi sudah dibaca'}
              </p>
            </div>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="text-green-600 hover:text-green-700 border-green-600"
              >
                Tandai Semua Dibaca
              </Button>
            )}
          </div>

          {/* Filter Tabs */}
          <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="mb-6">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="all">
                Semua ({notifications.length})
              </TabsTrigger>
              <TabsTrigger value="unread">
                Belum Dibaca ({unreadCount})
              </TabsTrigger>
              <TabsTrigger value="read">
                Sudah Dibaca ({notifications.length - unreadCount})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* ✅ Maintenance Notification - Shows when maintenance is active */}
          {isUnderMaintenance() && (
            <Card className="p-4 mb-4 bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-300 shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="flex-shrink-0 mt-1">
                  <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center animate-pulse">
                    <Wrench className="w-6 h-6 text-white" />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <h3 className="font-bold text-red-900 text-lg">Mode Maintenance Aktif</h3>
                    <Badge className="bg-red-600 text-white text-xs px-2 py-1 animate-pulse">
                      Sistem Maintenance
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-red-800 mb-3 font-medium">
                    {maintenance.message || 'Sistem sedang dalam pemeliharaan. Beberapa fitur mungkin tidak tersedia.'}
                  </p>

                  {/* Time Info */}
                  <div className="flex flex-col gap-2 text-xs text-red-700">
                    {maintenance.startTime && (
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        <span>
                          Dimulai: {new Date(maintenance.startTime).toLocaleString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    )}
                    {maintenance.endTime && (
                      <div className="flex items-center gap-2 font-semibold">
                        <Bell className="w-4 h-4" />
                        <span>Estimasi selesai: {getMaintenanceEndTime()}</span>
                      </div>
                    )}
                  </div>

                  {/* Info Text */}
                  <div className="mt-3 p-3 bg-white/50 rounded-lg border border-red-200">
                    <p className="text-xs text-red-800">
                      <strong>Catatan:</strong> Selama maintenance, transaksi dan beberapa fitur mungkin tidak berfungsi. 
                      Kami mohon maaf atas ketidaknyamanan ini.
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Notifications List */}
          {filteredNotifications.length === 0 ? (
            <Card className="p-12">
              <div className="text-center">
                <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Tidak Ada Notifikasi
                </h3>
                <p className="text-gray-600">
                  {filter === 'unread'
                    ? 'Semua notifikasi sudah dibaca'
                    : 'Belum ada notifikasi untuk ditampilkan'}
                </p>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notif) => (
                <Card
                  key={notif.id}
                  className={`p-4 transition-all cursor-pointer hover:shadow-md ${
                    !notif.read ? 'bg-blue-50 border-blue-200 shadow-sm' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => !notif.read && handleMarkAsRead(notif.id)}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-1">{getIcon(notif.type)}</div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-gray-900">{notif.title}</h3>
                            {!notif.read && (
                              <Badge className="bg-blue-500 text-white text-xs px-2 py-0.5">
                                Baru
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {notif.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-2">
                            {formatTimestamp(notif.createdAt)}
                          </p>
                        </div>

                        {/* Actions */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(notif.id);
                          }}
                          className="text-gray-400 hover:text-red-600 flex-shrink-0"
                        >
                          Hapus
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Info Box */}
          <Card className="mt-8 p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">Tentang Notifikasi</h3>
                <p className="text-sm text-gray-600">
                  Anda akan menerima notifikasi untuk pesanan, pembayaran, pengiriman, refund, flash sale, dan update sistem. 
                  Notifikasi yang belum dibaca akan ditampilkan dengan latar belakang biru.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}