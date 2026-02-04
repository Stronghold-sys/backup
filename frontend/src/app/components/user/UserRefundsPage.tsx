import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Package, Clock, CheckCircle, XCircle, Truck, RefreshCw, Eye } from 'lucide-react';
import { useAuthStore } from '@/lib/store'; // ✅ FIX: Changed from @/lib/authStore to @/lib/store
import { useRefundStore, Refund, getRefundStatusDisplay, getRefundTypeDisplay } from '@/lib/refundStore';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { RefundDetailModal } from './RefundDetailModal';

export function UserRefundsPage() {
  const navigate = useNavigate();
  const { user, token } = useAuthStore();
  const { refunds, isLoading, fetchUserRefunds } = useRefundStore();
  
  const [selectedRefund, setSelectedRefund] = useState<Refund | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Fetch refunds on mount
  useEffect(() => {
    if (!user) {
      navigate('/login', { state: { from: '/refunds' } });
      return;
    }
    
    if (token) {
      fetchUserRefunds(token);
    }
  }, [user, token, fetchUserRefunds, navigate]);

  // Real-time sync - Poll every 5 seconds (will be replaced with Supabase Realtime)
  useEffect(() => {
    if (!token) return;
    
    const interval = setInterval(() => {
      fetchUserRefunds(token);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [token, fetchUserRefunds]);

  const handleViewDetail = (refund: Refund) => {
    setSelectedRefund(refund);
    setIsDetailModalOpen(true);
  };

  const getStatusIcon = (status: Refund['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5" />;
      case 'approved':
      case 'shipping':
      case 'received':
        return <Truck className="w-5 h-5" />;
      case 'refunded':
      case 'completed':
        return <CheckCircle className="w-5 h-5" />;
      case 'rejected':
        return <XCircle className="w-5 h-5" />;
      default:
        return <Clock className="w-5 h-5" />;
    }
  };

  if (isLoading && refunds.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-2" />
          <p className="text-gray-600">Memuat data refund...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Pengembalian & Refund
          </h1>
          <p className="text-gray-600">
            Kelola pengajuan refund dan pengembalian barang Anda
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Package className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {refunds.length}
                  </div>
                  <div className="text-sm text-gray-600">Total Refund</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {refunds.filter(r => r.status === 'pending').length}
                  </div>
                  <div className="text-sm text-gray-600">Menunggu</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Truck className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {refunds.filter(r => ['approved', 'shipping', 'received'].includes(r.status)).length}
                  </div>
                  <div className="text-sm text-gray-600">Diproses</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {refunds.filter(r => ['refunded', 'completed'].includes(r.status)).length}
                  </div>
                  <div className="text-sm text-gray-600">Selesai</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Refunds List */}
        {refunds.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Belum Ada Refund
              </h3>
              <p className="text-gray-600 mb-6">
                Anda belum pernah mengajukan refund atau pengembalian barang
              </p>
              <Button
                onClick={() => navigate('/orders')}
                className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600"
              >
                Lihat Pesanan
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {refunds.map((refund) => {
              const statusDisplay = getRefundStatusDisplay(refund.status);
              
              // ENHANCED TYPE SAFETY: Safe guards for object properties
              const safeBgColor = typeof statusDisplay.bgColor === 'string' ? statusDisplay.bgColor : 'bg-gray-100';
              const safeColor = typeof statusDisplay.color === 'string' ? statusDisplay.color : 'text-gray-700';
              const safeLabel = typeof statusDisplay.label === 'string' ? statusDisplay.label : '';
              
              return (
                <Card key={refund.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      {/* Left: Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-10 h-10 ${safeBgColor} rounded-lg flex items-center justify-center`}>
                            {getStatusIcon(refund.status)}
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900 text-lg">
                              {refund.id}
                            </h3>
                            <p className="text-sm text-gray-600">
                              Order: {refund.orderId}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 mb-3">
                          <div>
                            <span className="text-sm text-gray-600">Jenis:</span>
                            <span className="ml-2 text-sm font-semibold text-gray-900">
                              {getRefundTypeDisplay(refund.type)}
                            </span>
                          </div>
                          
                          <div>
                            <span className="text-sm text-gray-600">Alasan:</span>
                            <span className="ml-2 text-sm font-semibold text-gray-900">
                              {refund.reason}
                            </span>
                          </div>
                          
                          <div>
                            <span className="text-sm text-gray-600">Jumlah Refund:</span>
                            <span className="ml-2 text-sm font-bold text-orange-600">
                              Rp {refund.amount.toLocaleString('id-ID')}
                            </span>
                          </div>
                          
                          <div>
                            <span className="text-sm text-gray-600">Diajukan:</span>
                            <span className="ml-2 text-sm text-gray-900">
                              {new Date(refund.createdAt).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                        </div>

                        {/* Status */}
                        <div className="flex items-center gap-2">
                          <Badge className={`${safeBgColor} ${safeColor} border-0`}>
                            {safeLabel}
                          </Badge>
                          
                          {refund.evidence && refund.evidence.length > 0 && (
                            <Badge variant="outline" className="border-gray-300">
                              {refund.evidence.length} Bukti
                            </Badge>
                          )}
                        </div>

                        {/* Latest Status */}
                        {refund.statusHistory && refund.statusHistory.length > 0 && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-600 mb-1">Status Terbaru:</p>
                            <p className="text-sm text-gray-900">
                              {refund.statusHistory[refund.statusHistory.length - 1].note}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(refund.statusHistory[refund.statusHistory.length - 1].timestamp).toLocaleString('id-ID')}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Right: Actions */}
                      <div className="flex flex-col gap-2">
                        <Button
                          onClick={() => handleViewDetail(refund)}
                          variant="outline"
                          size="sm"
                          className="whitespace-nowrap"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Detail
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedRefund && (
        <RefundDetailModal
          refund={selectedRefund}
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedRefund(null);
          }}
          isAdmin={false}
        />
      )}
    </div>
  );
}