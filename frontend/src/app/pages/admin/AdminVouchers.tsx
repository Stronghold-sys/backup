import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/app/components/ui/alert-dialog';
import { Plus, Search, Gift, Calendar, Users, TrendingUp, Edit, Trash2, Copy, Tag, RefreshCw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/lib/store';
import CreateVoucherModal from '@/app/components/admin/CreateVoucherModal';
import AdminLayout from '@/app/components/Layout/AdminLayout';
import { projectId, publicAnonKey } from '/utils/supabase/info';

interface Voucher {
  id: string;
  code: string;
  discountType: 'percentage';
  discountValue: number;
  status: 'active' | 'used' | 'expired';
  userId: string | null; // ✅ Can be null for public vouchers
  userEmail: string;
  usedAt?: string;
  usedInOrderId?: string;
  createdAt: string;
  expiresAt?: string;
  usageCount?: number; // ✅ For public vouchers
  maxUsage?: number; // ✅ For public vouchers
  usedByUserIds?: string[]; // ✅ Array of user IDs who used this public voucher
}

interface VoucherStats {
  total: number;
  active: number;
  used: number;
  expired: number;
}

export default function AdminVouchers() {
  const { accessToken } = useAuthStore();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [stats, setStats] = useState<VoucherStats>({ total: 0, active: 0, used: 0, expired: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isInitialLoadRef = useRef(true); // ✅ Use ref instead of state to prevent re-render issues
  
  // ✅ NEW: Delete confirmation dialog state
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; voucherId: string; voucherCode: string }>({
    isOpen: false,
    voucherId: '',
    voucherCode: '',
  });

  // ✅ AUTO-REFRESH: Fetch vouchers and stats on mount and every 10 seconds
  useEffect(() => {
    fetchVouchers();
    fetchStats();
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(() => {
      console.info('🔄 [AdminVouchers] Auto-refreshing vouchers and stats...');
      fetchVouchers(); // ✅ Also refresh vouchers list
      fetchStats();
    }, 10000); // 10 seconds
    
    return () => clearInterval(interval);
  }, []);

  const fetchVouchers = async () => {
    // ✅ FIXED: Add detailed logging for debugging
    console.info('📋 [AdminVouchers] Fetching vouchers...');
    console.info('🔑 [AdminVouchers] Access token:', accessToken ? 'Present' : 'Missing');
    console.info('🔑 [AdminVouchers] Access token value:', accessToken?.substring(0, 20) + '...');
    console.info('🔑 [AdminVouchers] Public anon key:', publicAnonKey ? 'Present' : 'Missing');
    console.info('🌐 [AdminVouchers] Project ID:', projectId);
    
    const url = `https://${projectId}.supabase.co/functions/v1/make-server-adb995ba/vouchers`;
    console.info('🌐 [AdminVouchers] URL:', url);
    
    try {
      // ✅ CRITICAL FIX: Add Authorization header with publicAnonKey for Supabase Edge Functions
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`, // ✅ Required by Supabase Edge Functions
          'X-Session-Token': accessToken!, // ✅ Our custom user token
        },
      });

      console.info('📡 [AdminVouchers] Response status:', response.status);
      console.info('📡 [AdminVouchers] Response headers:', Object.fromEntries(response.headers.entries()));
      
      // Get response text first
      const responseText = await response.text();
      console.info('📡 [AdminVouchers] Response text:', responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
        console.info('📡 [AdminVouchers] Response data:', data);
      } catch (parseError) {
        console.error('❌ [AdminVouchers] Failed to parse JSON:', parseError);
        toast.error('Response bukan JSON valid');
        return;
      }
      
      if (response.ok) {
        console.info('✅ [AdminVouchers] Vouchers loaded:', data.vouchers?.length || 0);
        console.info('✅ [AdminVouchers] First voucher:', data.vouchers?.[0]);
        setVouchers(data.vouchers || []);
        
        // ✅ FIX: Only show toast on initial load, not on auto-refresh
        if (isInitialLoadRef.current) {
          if (!data.vouchers || data.vouchers.length === 0) {
            toast.info('Belum ada voucher. Silakan buat voucher baru.');
          } else {
            toast.success(`Berhasil memuat ${data.vouchers.length} voucher`);
          }
          isInitialLoadRef.current = false; // ✅ Set initial load to false after first load
        }
      } else {
        console.error('❌ [AdminVouchers] Failed to fetch vouchers:', response.status, data);
        toast.error('Gagal memuat voucher: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('❌ [AdminVouchers] Fetch vouchers error:', error);
      toast.error('Terjadi kesalahan saat memuat voucher: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    console.info('📊 [AdminVouchers] Fetching stats...');
    try {
      // ✅ CRITICAL FIX: Add Authorization header with publicAnonKey for Supabase Edge Functions
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-adb995ba/vouchers/stats`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`, // ✅ Required by Supabase Edge Functions
            'X-Session-Token': accessToken!, // ✅ Our custom user token
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.info('✅ [AdminVouchers] Stats loaded:', data.stats);
        setStats(data.stats);
      } else {
        console.error('❌ [AdminVouchers] Failed to fetch stats:', response.status);
      }
    } catch (error) {
      console.error('❌ [AdminVouchers] Fetch stats error:', error);
    }
  };

  const handleVoucherCreated = () => {
    isInitialLoadRef.current = true; // ✅ Show toast on manual refresh after creating voucher
    fetchVouchers();
    fetchStats();
  };

  // ✅ UPDATED: Open delete confirmation dialog
  const handleDeleteVoucher = (voucherId: string, voucherCode: string) => {
    setDeleteDialog({
      isOpen: true,
      voucherId,
      voucherCode,
    });
  };

  // ✅ NEW: Confirm and execute delete
  const confirmDeleteVoucher = async () => {
    const { voucherId, voucherCode } = deleteDialog;
    
    console.info('🗑️ [AdminVouchers] Deleting voucher:', voucherId);
    
    // Close dialog first
    setDeleteDialog({ isOpen: false, voucherId: '', voucherCode: '' });
    
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-adb995ba/vouchers/${voucherId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'X-Session-Token': accessToken!,
          },
        }
      );

      if (response.ok) {
        console.info('✅ [AdminVouchers] Voucher deleted successfully');
        toast.success(`Voucher "${voucherCode}" berhasil dihapus`);
        
        // Refresh data
        fetchVouchers();
        fetchStats();
      } else {
        const data = await response.json();
        console.error('❌ [AdminVouchers] Failed to delete voucher:', data);
        toast.error('Gagal menghapus voucher: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('❌ [AdminVouchers] Delete voucher error:', error);
      toast.error('Terjadi kesalahan saat menghapus voucher');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Aktif</Badge>;
      case 'used':
        return <Badge className="bg-gray-500">Digunakan</Badge>;
      case 'expired':
        return <Badge className="bg-red-500">Kedaluwarsa</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // ✅ NEW: Enhanced status badge showing usage for public vouchers
  const getEnhancedStatusBadge = (voucher: Voucher) => {
    const isPublicVoucher = voucher.userId === null || voucher.userId === 'public';
    
    if (isPublicVoucher) {
      const usageCount = voucher.usageCount || 0;
      const maxUsage = voucher.maxUsage || 0;
      
      // Show different badges based on usage
      if (voucher.status === 'expired') {
        return (
          <div className="flex flex-col items-end gap-1">
            <Badge className="bg-red-500">Kedaluwarsa</Badge>
            {usageCount > 0 && (
              <span className="text-xs text-gray-500">{usageCount}/{maxUsage} digunakan</span>
            )}
          </div>
        );
      } else if (usageCount > 0) {
        // ✅ Show "Digunakan X kali" for public vouchers with usage
        return (
          <div className="flex flex-col items-end gap-1">
            <Badge className="bg-blue-500">Digunakan {usageCount}x</Badge>
            <span className="text-xs text-green-600">Masih aktif ({maxUsage - usageCount} tersisa)</span>
          </div>
        );
      } else {
        // Not used yet
        return (
          <div className="flex flex-col items-end gap-1">
            <Badge className="bg-green-500">Aktif</Badge>
            <span className="text-xs text-gray-500">0/{maxUsage} digunakan</span>
          </div>
        );
      }
    } else {
      // Personal voucher - simple status
      switch (voucher.status) {
        case 'active':
          return <Badge className="bg-green-500">Aktif</Badge>;
        case 'used':
          return <Badge className="bg-gray-500">Digunakan</Badge>;
        case 'expired':
          return <Badge className="bg-red-500">Kedaluwarsa</Badge>;
        default:
          return <Badge>{voucher.status}</Badge>;
      }
    }
  };

  // ✅ NEW: Get usage info for display
  const getUsageInfo = (voucher: Voucher) => {
    const isPublicVoucher = voucher.userId === null || voucher.userId === 'public';
    
    if (isPublicVoucher) {
      const usageCount = voucher.usageCount || 0;
      const usedByUserIds = voucher.usedByUserIds || [];
      
      if (usageCount > 0) {
        return (
          <div className="text-sm">
            <div className="text-gray-900 font-medium">{usageCount} kali</div>
            <div className="text-xs text-gray-500 mt-0.5">
              oleh {usedByUserIds.length} user
            </div>
          </div>
        );
      } else {
        return <span className="text-gray-400">Belum digunakan</span>;
      }
    } else {
      // Personal voucher
      if (voucher.usedAt) {
        return (
          <div>
            <div>{formatDate(voucher.usedAt)}</div>
            {voucher.usedInOrderId && (
              <div className="text-xs text-gray-500 mt-1">
                Order: {voucher.usedInOrderId.substring(0, 12)}...
              </div>
            )}
          </div>
        );
      } else {
        return <span className="text-gray-400">Belum digunakan</span>;
      }
    }
  };

  const filteredVouchers = vouchers.filter((voucher) => {
    const search = searchQuery.toLowerCase();
    return (
      voucher?.code?.toLowerCase().includes(search) ||
      voucher?.userEmail?.toLowerCase().includes(search) ||
      voucher?.usedInOrderId?.toLowerCase().includes(search)
    );
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Voucher & Promo</h1>
            <p className="text-gray-600 mt-1">Kelola voucher diskon pengguna</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                fetchVouchers();
                fetchStats();
              }}
              variant="outline"
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button
              onClick={() => setIsModalOpen(true)}
              className="bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700 text-white gap-2"
            >
              <Plus className="w-4 h-4" />
              Buat Voucher Baru
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Voucher</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Tag className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Aktif</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{stats.active}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Digunakan</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.used}</p>
              </div>
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                <Tag className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Kedaluwarsa</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{stats.expired}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Calendar className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Search */}
        <Card className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Cari kode voucher, email pengguna, atau ID order..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </Card>

        {/* Vouchers Table */}
        <Card>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kode Voucher
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Diskon
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pengguna
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Digunakan Pada
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dibuat
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      Memuat data...
                    </td>
                  </tr>
                ) : filteredVouchers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      {searchQuery ? 'Tidak ada voucher yang sesuai pencarian' : 'Belum ada voucher'}
                    </td>
                  </tr>
                ) : (
                  filteredVouchers.map((voucher) => (
                    <tr key={voucher.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Tag className="w-4 h-4 text-orange-600 mr-2" />
                          <span className="font-mono font-semibold text-gray-900">{voucher.code}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-green-600 font-semibold">{voucher.discountValue}%</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getEnhancedStatusBadge(voucher)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{voucher.userEmail}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {getUsageInfo(voucher)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(voucher.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <Button
                          onClick={() => handleDeleteVoucher(voucher.id, voucher.code)}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden">
            {isLoading ? (
              <div className="p-8 text-center text-gray-500">
                Memuat data...
              </div>
            ) : filteredVouchers.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                {searchQuery ? 'Tidak ada voucher yang sesuai pencarian' : 'Belum ada voucher'}
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredVouchers.map((voucher) => (
                  <div key={voucher.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-orange-600" />
                        <span className="font-mono font-semibold text-gray-900">{voucher.code}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {getEnhancedStatusBadge(voucher)}
                        <Button
                          onClick={() => handleDeleteVoucher(voucher.id, voucher.code)}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 ml-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Diskon:</span>
                        <span className="text-green-600 font-semibold">{voucher.discountValue}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Pengguna:</span>
                        <span className="text-gray-900">{voucher.userEmail}</span>
                      </div>
                      {getUsageInfo(voucher) && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Digunakan:</span>
                          <span className="text-gray-900">{getUsageInfo(voucher)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600">Dibuat:</span>
                        <span className="text-gray-900">{formatDate(voucher.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Info */}
          <div className="px-6 py-4 border-t bg-gray-50">
            <p className="text-sm text-gray-600">
              Menampilkan {filteredVouchers.length} dari {vouchers.length} voucher
            </p>
          </div>
        </Card>

        {/* Info Card */}
        <Card className="p-6 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <Tag className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900">Informasi Voucher</h3>
              <ul className="mt-2 space-y-1 text-sm text-blue-800">
                <li>• Voucher dibuat otomatis saat pengguna baru melakukan registrasi</li>
                <li>• Diskon voucher dibuat secara acak (5%, 10%, 15%, atau 20%)</li>
                <li>• Setiap voucher hanya dapat digunakan 1 kali per akun</li>
                <li>• Voucher otomatis ditandai "Digunakan" setelah pembayaran berhasil</li>
                <li>• Jika pembayaran gagal, voucher dapat digunakan kembali</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>

      {/* Create Voucher Modal */}
      <CreateVoucherModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onVoucherCreated={handleVoucherCreated} />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.isOpen} onOpenChange={() => setDeleteDialog({ isOpen: false, voucherId: '', voucherCode: '' })}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <AlertDialogTitle className="text-xl font-bold text-gray-900">
                  Hapus Voucher?
                </AlertDialogTitle>
              </div>
            </div>
            <AlertDialogDescription className="text-gray-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus voucher <span className="font-mono font-semibold text-gray-900">"{deleteDialog.voucherCode}"</span>?
              <br />
              <br />
              <span className="text-red-600 font-medium">Tindakan ini tidak dapat dibatalkan.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel className="flex-1 sm:flex-initial">Batal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteVoucher}
              className="flex-1 sm:flex-initial bg-red-600 hover:bg-red-700 text-white"
            >
              Hapus Voucher
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}