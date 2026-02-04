import { useEffect, useState } from 'react';
import { Loader2, Wifi, WifiOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { useRealTimeSync } from '@/lib/useRealTimeSync';
import { motion, AnimatePresence } from 'motion/react';

/**
 * ================================================================
 * SYNC INDICATOR COMPONENT
 * ================================================================
 * 
 * Real-time sync status indicator yang muncul di pojok kanan bawah.
 * Menampilkan status koneksi dan sinkronisasi real-time.
 */

export default function SyncIndicator() {
  const { isConnected, isSyncing, lastSyncTime, error } = useRealTimeSync();
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<'syncing' | 'synced' | 'error' | 'offline'>('synced');

  useEffect(() => {
    if (isSyncing) {
      setStatus('syncing');
      setVisible(true);
    } else if (error) {
      setStatus('error');
      setVisible(true);
      // Auto-hide error after 5 seconds
      const timer = setTimeout(() => setVisible(false), 5000);
      return () => clearTimeout(timer);
    } else if (!isConnected) {
      setStatus('offline');
      setVisible(true);
    } else if (lastSyncTime) {
      setStatus('synced');
      setVisible(true);
      // Auto-hide synced status after 2 seconds
      const timer = setTimeout(() => setVisible(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isSyncing, error, isConnected, lastSyncTime]);

  const getStatusConfig = () => {
    switch (status) {
      case 'syncing':
        return {
          icon: Loader2,
          text: 'Menyinkronkan...',
          color: 'bg-blue-500',
          textColor: 'text-blue-900',
          bgColor: 'bg-blue-50',
          animate: true,
        };
      case 'synced':
        return {
          icon: CheckCircle2,
          text: 'Tersinkronisasi',
          color: 'bg-green-500',
          textColor: 'text-green-900',
          bgColor: 'bg-green-50',
          animate: false,
        };
      case 'error':
        return {
          icon: AlertCircle,
          text: 'Gagal sinkronisasi',
          color: 'bg-red-500',
          textColor: 'text-red-900',
          bgColor: 'bg-red-50',
          animate: false,
        };
      case 'offline':
        return {
          icon: WifiOff,
          text: 'Offline',
          color: 'bg-gray-500',
          textColor: 'text-gray-900',
          bgColor: 'bg-gray-50',
          animate: false,
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-20 right-4 z-40 md:bottom-4"
        >
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg border ${config.bgColor} ${config.textColor} border-gray-200`}
          >
            <Icon
              className={`w-4 h-4 ${config.animate ? 'animate-spin' : ''}`}
              strokeWidth={2}
            />
            <span className="text-sm font-medium">{config.text}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Mini version for inline use
 */
export function SyncIndicatorMini({ 
  message = 'Menyinkronkan...',
  className = '' 
}: { 
  message?: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2 text-blue-600 ${className}`}>
      <Loader2 className="w-4 h-4 animate-spin" />
      <span className="text-sm">{message}</span>
    </div>
  );
}
