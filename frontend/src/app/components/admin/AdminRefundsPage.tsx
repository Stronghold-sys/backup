import React, { useEffect, useState } from 'react';
import { Package, Clock, CheckCircle, XCircle, Truck, RefreshCw, Eye, Filter } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAuthStore } from '@/lib/store';
import { useRefundStore, Refund, getRefundStatusDisplay, getRefundTypeDisplay } from '@/lib/refundStore';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { AdminRefundDetailModal } from './AdminRefundDetailModal';

type FilterStatus = 'all' | Refund['status'];

export function AdminRefundsPage() {
  const navigate = useNavigate();
  const { user, accessToken } = useAuthStore(); // ✅ FIXED: Remove logout function - no auto-logout
  const { refunds, isLoading, error, fetchAllRefunds } = useRefundStore(); // ✅ Get error from store
  
  const [selectedRefund, setSelectedRefund] = useState<Refund | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // ✅ Check authentication and redirect if needed
  useEffect(() => {
    // If no user or token, redirect to login
    if (!user || !accessToken) {
      navigate('/login', { state: { from: '/admin/refunds' } });
      return;
    }

    // If user is not admin, redirect to home
    if (user.role !== 'admin') {
      navigate('/');
      return;
    }
  }, [user, accessToken, navigate]);

  // Fetch refunds on mount
  useEffect(() => {
    if (user?.role !== 'admin') {
      return;
    }
    
    if (!accessToken) {
      return;
    }
    
    // ✅ refundStore will handle getting fresh token from Supabase
    fetchAllRefunds(accessToken);
  }, [user, accessToken, fetchAllRefunds]);

  // Real-time sync - Poll every 3 seconds (will be replaced with Supabase Realtime)
  useEffect(() => {
    if (!accessToken || user?.role !== 'admin') return;
    
    const interval = setInterval(() => {
      fetchAllRefunds(accessToken);
    }, 3000);
    
    return () => clearInterval(interval);
  }, [accessToken, user, fetchAllRefunds]);

  const handleViewDetail = (refund: Refund) => {
    try {
      setSelectedRefund(refund);
      setIsDetailModalOpen(true);
    } catch (error: any) {
      alert('Terjadi kesalahan saat membuka detail refund. Silakan refresh halaman.');
    }
  };

  const handleModalClose = () => {
    setIsDetailModalOpen(false);
    setSelectedRefund(null);
    
    // Refresh data after modal close
    if (accessToken) {
      fetchAllRefunds(accessToken);
    }
  };

  // Filter refunds
  const filteredRefunds = refunds.filter(refund => {
    // Filter by status
    if (filterStatus !== 'all' && refund.status !== filterStatus) {
      return false;
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        refund.id.toLowerCase().includes(query) ||
        refund.orderId.toLowerCase().includes(query) ||
        refund.userName.toLowerCase().includes(query) ||
        refund.userEmail.toLowerCase().includes(query) ||
        refund.reason.toLowerCase().includes(query)
      );
    }
    
    return true;
  });

  // Calculate stats
  const stats = {
    total: refunds.length,
    pending: refunds.filter(r => r.status === 'pending').length,
    processing: refunds.filter(r => ['approved', 'shipping', 'received'].includes(r.status)).length,
    completed: refunds.filter(r => ['refunded', 'completed'].includes(r.status)).length,
    rejected: refunds.filter(r => r.status === 'rejected').length,
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
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-2" />
          <p className="text-gray-600">Memuat data refund...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Kelola Refund & Pengembalian
        </h1>
        <p className="text-gray-600">
          Review dan proses pengajuan refund dari customer
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                <div className="text-xs text-gray-600">Total</div>
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
                <div className="text-2xl font-bold text-gray-900">{stats.pending}</div>
                <div className="text-xs text-gray-600">Pending</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Truck className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.processing}</div>
                <div className="text-xs text-gray-600">Processing</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.completed}</div>
                <div className="text-xs text-gray-600">Completed</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.rejected}</div>
                <div className="text-xs text-gray-600">Rejected</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="Cari refund ID, order ID, nama user, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-500" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">Semua Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="shipping">Shipping</option>
                <option value="received">Received</option>
                <option value="refunded">Refunded</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            {/* Refresh Button */}
            <Button
              variant="outline"
              onClick={() => accessToken && fetchAllRefunds(accessToken)}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ✅ Error Message */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 mb-1">Gagal Memuat Data Refund</h3>
                <p className="text-sm text-red-700">{error}</p>
                {error.includes('Sesi Anda telah berakhir') && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3 border-red-300 text-red-700 hover:bg-red-100"
                    onClick={() => window.location.href = '/login'}
                  >
                    Login Ulang
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Refunds List */}
      {filteredRefunds.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchQuery || filterStatus !== 'all' ? 'Tidak Ada Hasil' : 'Belum Ada Refund'}
            </h3>
            <p className="text-gray-600">
              {searchQuery || filterStatus !== 'all' 
                ? 'Coba ubah filter atau kata kunci pencarian' 
                : 'Belum ada pengajuan refund dari customer'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredRefunds.map((refund) => {
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
                          <h3 className="font-bold text-gray-900">
                            {refund.id}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Order: {refund.orderId}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-2 mb-3">
                        <div>
                          <span className="text-sm text-gray-600">Customer:</span>
                          <span className="ml-2 text-sm font-semibold text-gray-900">
                            {refund.userName}
                          </span>
                        </div>
                        
                        <div>
                          <span className="text-sm text-gray-600">Email:</span>
                          <span className="ml-2 text-sm text-gray-900">
                            {refund.userEmail}
                          </span>
                        </div>
                        
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
                          <span className="text-sm text-gray-600">Jumlah:</span>
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
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`${safeBgColor} ${safeColor} border-0`}>
                          {safeLabel}
                        </Badge>
                        
                        {refund.evidence && refund.evidence.length > 0 && (
                          <Badge variant="outline" className="border-gray-300">
                            {refund.evidence.length} Bukti
                          </Badge>
                        )}

                        {refund.status === 'pending' && (
                          <Badge className="bg-red-100 text-red-700 border-0 animate-pulse">
                            Perlu Review
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={() => handleViewDetail(refund)}
                        size="sm"
                        className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 whitespace-nowrap"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Review
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selectedRefund && (
        <AdminRefundDetailModal
          refund={selectedRefund}
          isOpen={isDetailModalOpen}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
}