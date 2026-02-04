/**
 * GLOBAL NETWORK STATUS COMPONENT
 * Komponen global untuk menampilkan status jaringan di seluruh aplikasi
 */

import { useEffect, useState } from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { useNetworkStatus } from '@/lib/useNetworkStatus';
import { Button } from '@/app/components/ui/button';

export function GlobalNetworkStatus() {
  const { isOnline, isSlowConnection } = useNetworkStatus();
  const [showOfflineScreen, setShowOfflineScreen] = useState(false);
  const [showSlowBanner, setShowSlowBanner] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      // Tampilkan offline screen setelah 2 detik tidak ada koneksi
      const timer = setTimeout(() => {
        setShowOfflineScreen(true);
      }, 2000);
      return () => clearTimeout(timer);
    } else {
      setShowOfflineScreen(false);
    }
  }, [isOnline]);

  useEffect(() => {
    if (isSlowConnection && isOnline) {
      setShowSlowBanner(true);
      // Auto hide after 5 seconds
      const timer = setTimeout(() => {
        setShowSlowBanner(false);
      }, 5000);
      return () => clearTimeout(timer);
    } else {
      setShowSlowBanner(false);
    }
  }, [isSlowConnection, isOnline]);

  // Offline Full Screen
  if (showOfflineScreen) {
    return (
      <div className="fixed inset-0 bg-white z-[9999] flex items-center justify-center p-4">
        <div className="text-center max-w-md space-y-6">
          <div className="bg-red-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto">
            <WifiOff className="w-12 h-12 text-red-600" />
          </div>
          
          <div className="space-y-3">
            <h2 className="text-3xl font-bold text-gray-900">
              Koneksi Internet Terputus
            </h2>
            <p className="text-gray-600 text-lg">
              Periksa koneksi internet Anda dan coba lagi.
            </p>
          </div>

          <Button 
            onClick={() => window.location.reload()}
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-8 py-6 text-lg"
          >
            <RefreshCw className="w-6 h-6 mr-3" />
            Coba Lagi
          </Button>

          <p className="text-sm text-gray-500 mt-6">
            Halaman akan otomatis dimuat ulang saat koneksi kembali
          </p>
        </div>
      </div>
    );
  }

  // Slow Connection Banner
  if (showSlowBanner) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[9998] bg-yellow-500 text-gray-900 py-3 px-4 shadow-lg">
        <div className="container mx-auto flex items-center justify-center gap-3">
          <Wifi className="w-5 h-5 animate-pulse" />
          <p className="text-sm font-medium">
            Jaringan Anda sedang lambat. Mohon tunggu sebentar…
          </p>
          <button 
            onClick={() => setShowSlowBanner(false)}
            className="ml-auto text-gray-900 hover:text-gray-700 font-bold"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  return null;
}

/**
 * LOADING BARRIER
 * Prevent user interaction saat ada proses penting
 */
export function LoadingBarrier({ 
  isVisible, 
  message = 'Memproses…' 
}: { 
  isVisible: boolean; 
  message?: string;
}) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[9997] flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-sm mx-4 text-center space-y-4">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
        </div>
        <p className="text-gray-800 font-semibold text-lg">{message}</p>
        <p className="text-gray-600 text-sm">Mohon jangan tutup halaman ini</p>
      </div>
    </div>
  );
}
