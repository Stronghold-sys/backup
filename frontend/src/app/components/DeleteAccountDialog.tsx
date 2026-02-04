import { AlertCircle } from 'lucide-react';
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

interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function DeleteAccountDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading = false,
}: DeleteAccountDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <AlertDialogTitle className="text-xl">
              Hapus Akun Permanen?
            </AlertDialogTitle>
          </div>
        </AlertDialogHeader>
        
        <AlertDialogDescription className="sr-only">
          Dialog konfirmasi untuk menghapus akun secara permanen
        </AlertDialogDescription>
        
        <div className="text-left space-y-3">
          <div className="text-gray-700 font-medium">
            ⚠️ Peringatan: Tindakan ini tidak dapat dibatalkan!
          </div>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
            <div className="text-sm text-gray-800 font-medium">
              Dengan menghapus akun, Anda akan kehilangan:
            </div>
            <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
              <li>Semua data profil dan akun Supabase</li>
              <li>Riwayat pesanan</li>
              <li>Alamat pengiriman</li>
              <li>Voucher yang tersimpan</li>
              <li>Foto profil dan file yang diupload</li>
              <li>Akses ke aplikasi secara permanen</li>
            </ul>
          </div>

          <div className="text-sm text-gray-600">
            Akun akan dihapus <span className="font-semibold">secara permanen dari sistem dan Supabase Auth</span>. Proses ini tidak dapat dibatalkan atau dipulihkan. Jika ingin menggunakan layanan lagi, Anda harus mendaftar ulang dari awal dengan email baru.
          </div>

          <div className="text-sm font-semibold text-gray-900">
            Apakah Anda yakin ingin melanjutkan?
          </div>
        </div>
        
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            Batal
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {isLoading ? 'Menghapus...' : 'Ya, Hapus Akun Saya'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}