import { useState } from 'react';
import { Trash2, AlertTriangle, Database, RefreshCw } from 'lucide-react';
import AdminLayout from '@/app/components/Layout/AdminLayout';
import { Card } from '@/app/components/ui/card';
import { LoadingButton } from '@/app/components/loading';
import { Badge } from '@/app/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '/utils/supabase'; // ✅ FIXED: Use correct path
import { getAccessToken } from '@/lib/authHelper';

export default function AdminResetData() {
  const [isResetting, setIsResetting] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState<string | null>(null);

  const resetOptions = [
    {
      id: 'orders',
      title: 'Reset Orders',
      description: 'Hapus semua data pesanan dan riwayat transaksi',
      icon: RefreshCw,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      danger: 'medium',
    },
    {
      id: 'products',
      title: 'Reset Products',
      description: 'Hapus semua produk dari database',
      icon: Database,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      danger: 'high',
    },
    {
      id: 'users',
      title: 'Reset Users',
      description: 'Hapus semua user (kecuali admin)',
      icon: Trash2,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      danger: 'high',
    },
    {
      id: 'all',
      title: 'Reset All Data',
      description: 'Hapus SEMUA data dari database (sangat berbahaya!)',
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      danger: 'critical',
    },
  ];

  const handleReset = async (type: string) => {
    setIsResetting(true);
    try {
      // ✅ FIXED: Use auth helper instead of localStorage
      const accessToken = await getAccessToken();

      let endpoint = '';
      switch (type) {
        case 'orders':
          endpoint = '/admin/reset/orders';
          break;
        case 'products':
          endpoint = '/admin/reset/products';
          break;
        case 'users':
          endpoint = '/admin/reset/users';
          break;
        case 'all':
          endpoint = '/admin/reset/all';
          break;
        default:
          throw new Error('Invalid reset type');
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-adb995ba${endpoint}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Session-Token': accessToken || '',
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reset data');
      }

      const result = await response.json();
      toast.success(`Data berhasil direset!`, {
        description: result.message || `${type} data telah dihapus`,
      });

      // Reload page after reset
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Error resetting data:', error);
      toast.error('Gagal mereset data', {
        description: error instanceof Error ? error.message : 'Terjadi kesalahan',
      });
    } finally {
      setIsResetting(false);
      setShowResetDialog(null);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
            <AlertTriangle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reset Data</h1>
            <p className="text-gray-600 mt-1">
              Kelola dan reset data di database (gunakan dengan hati-hati!)
            </p>
          </div>
        </div>

        {/* Warning Banner */}
        <Card className="p-6 bg-red-50 border-2 border-red-200">
          <div className="flex gap-4">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-bold text-red-900 mb-2">⚠️ PERINGATAN PENTING</h3>
              <p className="text-red-800 text-sm leading-relaxed">
                Fitur ini akan menghapus data secara permanen dari database. Tindakan ini{' '}
                <strong>TIDAK DAPAT DIBATALKAN</strong>. Pastikan Anda benar-benar memahami
                konsekuensinya sebelum melanjutkan. Disarankan untuk membuat backup terlebih
                dahulu.
              </p>
            </div>
          </div>
        </Card>

        {/* Reset Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {resetOptions.map((option) => {
            const Icon = option.icon;
            return (
              <Card
                key={option.id}
                className={`p-6 hover:shadow-lg transition-shadow border-2 ${option.borderColor} ${option.bgColor}`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      option.id === 'all'
                        ? 'bg-red-600'
                        : option.id === 'products'
                        ? 'bg-orange-600'
                        : option.id === 'users'
                        ? 'bg-purple-600'
                        : 'bg-blue-600'
                    }`}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className={`font-bold text-lg ${option.color}`}>
                        {option.title}
                      </h3>
                      <Badge
                        className={`text-xs ${
                          option.danger === 'critical'
                            ? 'bg-red-600 text-white'
                            : option.danger === 'high'
                            ? 'bg-orange-600 text-white'
                            : 'bg-yellow-500 text-white'
                        }`}
                      >
                        {option.danger === 'critical'
                          ? 'SANGAT BERBAHAYA'
                          : option.danger === 'high'
                          ? 'BERBAHAYA'
                          : 'HATI-HATI'}
                      </Badge>
                    </div>
                    <p className="text-gray-700 text-sm mb-4">{option.description}</p>
                    <LoadingButton
                      onClick={() => setShowResetDialog(option.id)}
                      disabled={isResetting}
                      className={`w-full ${
                        option.id === 'all'
                          ? 'bg-red-600 hover:bg-red-700'
                          : option.id === 'products'
                          ? 'bg-orange-600 hover:bg-orange-700'
                          : option.id === 'users'
                          ? 'bg-purple-600 hover:bg-purple-700'
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                      isLoading={isResetting}
                      loadingText="Mereset..."
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Reset {option.title.replace('Reset ', '')}
                    </LoadingButton>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 bg-blue-50 border-2 border-blue-200">
            <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
              <Database className="w-5 h-5" />
              Kapan Menggunakan Reset?
            </h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Development dan testing aplikasi</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Membersihkan data dummy atau test data</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Memulai fresh start dengan data baru</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Maintenance dan troubleshooting database</span>
              </li>
            </ul>
          </Card>

          <Card className="p-6 bg-purple-50 border-2 border-purple-200">
            <h3 className="font-bold text-purple-900 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Yang Perlu Diperhatikan
            </h3>
            <ul className="space-y-2 text-sm text-purple-800">
              <li className="flex items-start gap-2">
                <span className="text-purple-600 mt-0.5">•</span>
                <span>Backup data penting sebelum mereset</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 mt-0.5">•</span>
                <span>Reset tidak dapat dibatalkan (permanen)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 mt-0.5">•</span>
                <span>Informasikan user jika melakukan reset di production</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 mt-0.5">•</span>
                <span>Periksa dependensi data sebelum reset</span>
              </li>
            </ul>
          </Card>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog
        open={showResetDialog !== null}
        onOpenChange={() => setShowResetDialog(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Konfirmasi Reset Data
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p className="text-base font-medium text-gray-900">
                Anda yakin ingin mereset{' '}
                <strong className="text-red-600">
                  {resetOptions.find((opt) => opt.id === showResetDialog)?.title}
                </strong>
                ?
              </p>
              <p className="text-sm text-gray-700">
                {resetOptions.find((opt) => opt.id === showResetDialog)?.description}
              </p>
              <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                <p className="text-sm font-semibold text-red-900 mb-2">
                  ⚠️ TINDAKAN INI TIDAK DAPAT DIBATALKAN
                </p>
                <p className="text-xs text-red-800">
                  Data yang dihapus akan hilang secara permanen dan tidak dapat dikembalikan.
                  Pastikan Anda sudah membuat backup jika diperlukan.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResetting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => showResetDialog && handleReset(showResetDialog)}
              disabled={isResetting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isResetting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Mereset...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Ya, Reset Data
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}