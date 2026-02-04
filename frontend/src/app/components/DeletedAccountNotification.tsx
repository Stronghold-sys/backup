import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { UserX, AlertCircle } from 'lucide-react';

interface DeletedAccountData {
  userId: string;
  email: string;
  deletedBy: string;
  deletedByName: string;
  deletedAt: string;
  reason?: string;
}

interface DeletedAccountNotificationProps {
  isOpen: boolean;
  onClose: () => void;
  deletedData: DeletedAccountData;
}

export default function DeletedAccountNotification({ isOpen, onClose, deletedData }: DeletedAccountNotificationProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'full',
      timeStyle: 'short'
    }).format(date);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserX className="w-6 h-6 text-red-600" />
            <span className="text-red-600">Akun Telah Dihapus</span>
          </DialogTitle>
          <DialogDescription>
            Akun Anda telah dihapus oleh administrator
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Icon & Status */}
          <div className="p-6 rounded-lg text-center bg-red-50 border-2 border-red-200">
            <div className="flex justify-center mb-3">
              <UserX className="w-16 h-16 text-red-600" />
            </div>
            <h3 className="text-lg font-bold mb-1 text-red-900">
              Account Deleted
            </h3>
            <p className="text-sm text-red-700">
              Akun Anda telah dihapus secara permanen oleh administrator
            </p>
          </div>

          {/* Email Info */}
          <div className="space-y-2">
            <Label className="font-semibold">Email Akun:</Label>
            <div className="p-3 bg-gray-50 border rounded-md">
              <p className="text-sm text-gray-900 font-medium">{deletedData.email}</p>
            </div>
          </div>

          {/* Reason (if provided) */}
          {deletedData.reason && (
            <div className="space-y-2">
              <Label className="font-semibold">Alasan Penghapusan:</Label>
              <div className="p-3 bg-gray-50 border rounded-md">
                <p className="text-sm text-gray-900">{deletedData.reason}</p>
              </div>
            </div>
          )}

          {/* Permanent Status */}
          <div className="p-4 bg-red-100 border-2 border-red-300 rounded-lg text-center">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-2" />
            <p className="text-red-900 font-bold text-lg">PENGHAPUSAN PERMANEN</p>
            <p className="text-red-700 text-sm mt-1">
              Akun Anda telah dihapus secara permanen dari sistem dan tidak dapat dipulihkan.
            </p>
          </div>

          {/* Admin Info */}
          <div className="pt-4 border-t">
            <p className="text-xs text-gray-500">
              Dihapus oleh: <strong>{deletedData.deletedByName}</strong><br />
              Tanggal: {formatDate(deletedData.deletedAt)}
            </p>
          </div>

          {/* Info */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-900">
              ℹ️ <strong>Apa yang terjadi?</strong><br />
              • Semua data profil Anda telah dihapus dari sistem<br />
              • Anda tidak dapat login kembali dengan akun ini<br />
              • Jika ini adalah kesalahan, silakan hubungi administrator
            </p>
          </div>

          {/* Contact Info */}
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-md">
            <p className="text-sm text-orange-900">
              📧 <strong>Butuh bantuan?</strong><br />
              Hubungi tim support kami di <a href="mailto:support@marketplace.com" className="underline font-medium">support@marketplace.com</a> atau hubungi administrator untuk informasi lebih lanjut.
            </p>
          </div>
        </div>

        <div className="flex justify-center">
          <Button 
            onClick={onClose} 
            variant="outline"
            className="w-full"
          >
            Tutup
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={`text-sm font-medium ${className}`}>{children}</label>;
}
