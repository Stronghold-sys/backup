import { useState } from 'react';
import { Settings, ShieldAlert, Trash2 } from 'lucide-react';
import { Card } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import AdminLayout from '@/app/components/Layout/AdminLayout';
import { useAuthStore } from '@/lib/store';
import { toast } from 'sonner';
import AdminMaintenanceMode from '@/app/components/admin/AdminMaintenanceMode';
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
import { projectId, publicAnonKey } from '/utils/supabase'; // ✅ FIXED: Use correct path

export default function AdminSettings() {
  const { accessToken } = useAuthStore();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleDeleteAccount = () => {
    toast.error('Fitur hapus akun dinonaktifkan untuk akun SuperAdmin');
    setDeleteDialogOpen(false);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="w-7 h-7 text-green-600" />
            Pengaturan Sistem
          </h1>
          <p className="text-sm text-gray-600 mt-1">Kelola pengaturan marketplace Anda</p>
        </div>

        {/* Info Cards - Only Aplikasi & Keamanan */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-2">📱 Aplikasi</h3>
            <p className="text-sm text-gray-600 mb-4">
              Informasi dasar tentang aplikasi marketplace Anda
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Nama:</span>
                <span className="font-medium">MarketHub</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Versi:</span>
                <span className="font-medium">1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className="font-medium text-green-600">Aktif</span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-2">🔐 Keamanan</h3>
            <p className="text-sm text-gray-600 mb-4">
              Sistem autentikasi dan keamanan data
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Auth:</span>
                <span className="font-medium">Supabase</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Database:</span>
                <span className="font-medium">PostgreSQL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Storage:</span>
                <span className="font-medium">Supabase Storage</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Mode Maintenance */}
        <AdminMaintenanceMode />

        {/* Danger Zone - Delete Account */}
        <Card className="p-6 border-red-200 bg-red-50">
          <h3 className="font-bold text-lg mb-2 text-red-600 flex items-center gap-2">
            <Trash2 className="w-5 h-5" />
            Zona Berbahaya
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Tindakan berikut bersifat permanen dan tidak dapat dibatalkan.
          </p>
          <Button
            variant="outline"
            className="border-red-500 text-red-600 hover:bg-red-100"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Hapus Akun Admin
          </Button>
        </Card>
      </div>

      {/* Delete Account Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Akun admin Anda akan dihapus secara permanen
              beserta semua data terkait.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              className="bg-red-600 hover:bg-red-700"
            >
              Ya, Hapus Akun
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}