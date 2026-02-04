import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { AlertTriangle, Clock, Ban, XCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '/utils/supabase/info';

interface BanData {
  userId: string;
  type: 'suspend' | 'ban';
  reason: string;
  startDate: string;
  endDate: string | 'permanent';
  bannedBy: string;
  bannedByName: string;
  bannedAt: string;
  isActive: boolean;
}

interface BanNotificationProps {
  isOpen: boolean;
  onClose: () => void;
  banData: BanData;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

export default function BanNotification({ isOpen, onClose, banData }: BanNotificationProps) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    total: 0
  });
  
  const [isUnsuspending, setIsUnsuspending] = useState(false);
  const [hasExpired, setHasExpired] = useState(false);

  // Auto-unsuspend function
  const handleAutoUnsuspend = async () => {
    setIsUnsuspending(true);
    console.info('⏰ Auto-unsuspending user:', banData.userId);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-adb995ba/users/${banData.userId}/auto-unsuspend`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const result = await response.json();

      if (result.success) {
        console.info('✅ Auto-unsuspend successful');
        toast.success('🎉 Masa suspend telah berakhir! Akun Anda aktif kembali.', {
          duration: 5000,
        });
        
        // Wait 2 seconds before reloading to show success message
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        console.error('❌ Auto-unsuspend failed:', result.error);
        toast.error('Gagal mengaktifkan kembali akun. Silakan refresh halaman.');
      }
    } catch (error) {
      console.error('❌ Auto-unsuspend error:', error);
      toast.error('Terjadi kesalahan. Silakan refresh halaman untuk coba lagi.');
    } finally {
      setIsUnsuspending(false);
    }
  };

  // Check and auto-unsuspend when time expires
  useEffect(() => {
    if (banData.endDate === 'permanent' || banData.type === 'ban') {
      return; // Don't auto-unsuspend permanent bans or ban types
    }

    const calculateTimeRemaining = () => {
      const now = new Date().getTime();
      const end = new Date(banData.endDate).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 });
        
        // Time expired! Auto-unsuspend
        if (!hasExpired && !isUnsuspending) {
          setHasExpired(true);
          handleAutoUnsuspend();
        }
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeRemaining({ days, hours, minutes, seconds, total: diff });
    };

    // Calculate immediately
    calculateTimeRemaining();

    // Update every second
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [banData.endDate, hasExpired, isUnsuspending]);

  const formatDate = (dateString: string) => {
    // Handle invalid or empty date strings
    if (!dateString || dateString === 'permanent') {
      return 'Invalid date';
    }
    
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'full',
      timeStyle: 'short'
    }).format(date);
  };

  const isPermanent = banData.endDate === 'permanent';
  const isBan = banData.type === 'ban';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isBan ? (
              <>
                <Ban className="w-6 h-6 text-red-600" />
                <span className="text-red-600">Akun Anda Di-Ban</span>
              </>
            ) : (
              <>
                <XCircle className="w-6 h-6 text-orange-600" />
                <span className="text-orange-600">Akun Anda Di-Suspend</span>
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            Anda tidak dapat mengakses akun saat ini
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Icon & Status */}
          <div className={`p-6 rounded-lg text-center ${isBan ? 'bg-red-50 border-2 border-red-200' : 'bg-orange-50 border-2 border-orange-200'}`}>
            <div className="flex justify-center mb-3">
              {isBan ? (
                <Ban className="w-16 h-16 text-red-600" />
              ) : (
                <AlertTriangle className="w-16 h-16 text-orange-600" />
              )}
            </div>
            <h3 className={`text-lg font-bold mb-1 ${isBan ? 'text-red-900' : 'text-orange-900'}`}>
              {isBan ? 'Account Banned' : 'Account Suspended'}
            </h3>
            <p className={`text-sm ${isBan ? 'text-red-700' : 'text-orange-700'}`}>
              Akun Anda telah di-{isBan ? 'ban' : 'suspend'} oleh administrator
            </p>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label className="font-semibold">Alasan:</Label>
            <div className="p-3 bg-gray-50 border rounded-md">
              <p className="text-sm text-gray-900">{banData.reason}</p>
            </div>
          </div>

          {/* Countdown or Permanent */}
          {isPermanent ? (
            <div className="p-4 bg-red-100 border-2 border-red-300 rounded-lg text-center">
              <Ban className="w-12 h-12 text-red-600 mx-auto mb-2" />
              <p className="text-red-900 font-bold text-lg">BAN PERMANEN</p>
              <p className="text-red-700 text-sm mt-1">
                Akun Anda telah di-ban secara permanen dan tidak akan bisa digunakan kembali.
              </p>
            </div>
          ) : hasExpired && isUnsuspending ? (
            <div className="p-4 bg-green-100 border-2 border-green-300 rounded-lg text-center">
              <div className="flex justify-center mb-3">
                <div className="animate-spin">
                  <CheckCircle className="w-12 h-12 text-green-600" />
                </div>
              </div>
              <p className="text-green-900 font-bold text-lg">⏰ Waktu Suspend Habis!</p>
              <p className="text-green-700 text-sm mt-1">
                Sedang mengaktifkan kembali akun Anda...
              </p>
            </div>
          ) : hasExpired ? (
            <div className="p-4 bg-green-100 border-2 border-green-300 rounded-lg text-center">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-2" />
              <p className="text-green-900 font-bold text-lg">🎉 Suspend Berakhir!</p>
              <p className="text-green-700 text-sm mt-1">
                Akun Anda sudah aktif kembali. Silakan refresh halaman.
              </p>
            </div>
          ) : (
            <>
              {/* Countdown Timer */}
              <div className="space-y-2">
                <Label className="font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Waktu Tersisa:
                </Label>
                <div className="grid grid-cols-4 gap-2">
                  <div className={`p-3 rounded-lg text-center ${isBan ? 'bg-red-100 border border-red-300' : 'bg-orange-100 border border-orange-300'}`}>
                    <div className={`text-2xl font-bold ${isBan ? 'text-red-700' : 'text-orange-700'}`}>
                      {timeRemaining.days}
                    </div>
                    <div className="text-xs text-gray-600">Hari</div>
                  </div>
                  <div className={`p-3 rounded-lg text-center ${isBan ? 'bg-red-100 border border-red-300' : 'bg-orange-100 border border-orange-300'}`}>
                    <div className={`text-2xl font-bold ${isBan ? 'text-red-700' : 'text-orange-700'}`}>
                      {timeRemaining.hours}
                    </div>
                    <div className="text-xs text-gray-600">Jam</div>
                  </div>
                  <div className={`p-3 rounded-lg text-center ${isBan ? 'bg-red-100 border border-red-300' : 'bg-orange-100 border border-orange-300'}`}>
                    <div className={`text-2xl font-bold ${isBan ? 'text-red-700' : 'text-orange-700'}`}>
                      {timeRemaining.minutes}
                    </div>
                    <div className="text-xs text-gray-600">Menit</div>
                  </div>
                  <div className={`p-3 rounded-lg text-center ${isBan ? 'bg-red-100 border border-red-300' : 'bg-orange-100 border border-orange-300'}`}>
                    <div className={`text-2xl font-bold ${isBan ? 'text-red-700' : 'text-orange-700'}`}>
                      {timeRemaining.seconds}
                    </div>
                    <div className="text-xs text-gray-600">Detik</div>
                  </div>
                </div>
              </div>

              {/* End Date */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-900">
                  <strong>Berakhir pada:</strong><br />
                  {formatDate(banData.endDate as string)}
                </p>
              </div>
            </>
          )}

          {/* Admin Info */}
          <div className="pt-4 border-t">
            <p className="text-xs text-gray-500">
              Di-{isBan ? 'ban' : 'suspend'} oleh: <strong>{banData.bannedByName}</strong><br />
              Tanggal: {formatDate(banData.bannedAt)}
            </p>
          </div>

          {/* Info */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-900">
              ℹ️ Jika Anda merasa ini adalah kesalahan, silakan hubungi administrator untuk banding.
            </p>
          </div>
        </div>

        <div className="flex justify-center">
          <Button onClick={onClose} variant="outline">
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