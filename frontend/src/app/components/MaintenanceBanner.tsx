import { AlertTriangle, Clock, X } from 'lucide-react';
import { useMaintenanceStore } from '@/lib/maintenanceStore';
import { Button } from '@/app/components/ui/button';
import { useState } from 'react';

export default function MaintenanceBanner() {
  const { maintenance, isUnderMaintenance } = useMaintenanceStore();
  const [dismissed, setDismissed] = useState(false);

  const isActive = isUnderMaintenance();

  // Don't show if not in maintenance or dismissed
  if (!isActive || dismissed) return null;

  const getTimeRemaining = () => {
    if (!maintenance.endTime) return null;
    
    const now = new Date();
    const end = new Date(maintenance.endTime);
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) return 'Segera selesai';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `~${hours} jam ${minutes} menit lagi`;
    }
    return `~${minutes} menit lagi`;
  };

  return (
    <div className="fixed top-16 left-0 right-0 z-40 animate-in slide-in-from-top duration-300">
      <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3 gap-4">
            {/* Icon */}
            <div className="flex-shrink-0">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>

            {/* Message */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm sm:text-base">
                Mode Maintenance Aktif
              </p>
              <p className="text-xs sm:text-sm text-white/90 mt-0.5">
                {maintenance.message || 'Sistem sedang dalam pemeliharaan. Transaksi sementara tidak dapat dilakukan.'}
              </p>
              {getTimeRemaining() && (
                <p className="text-xs text-white/80 mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Estimasi selesai: {getTimeRemaining()}
                </p>
              )}
            </div>

            {/* Dismiss Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDismissed(true)}
              className="flex-shrink-0 text-white hover:bg-white/20"
            >
              <X className="w-5 h-5" />
              <span className="sr-only">Tutup</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
