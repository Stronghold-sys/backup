/**
 * LOADING STATE COMPONENTS
 * Berbagai state loading untuk feedback user yang jelas
 */

import React from 'react';
import { Loader2, Wifi, WifiOff, AlertCircle, RefreshCw, CheckCircle } from 'lucide-react';
import { Button } from '@/app/components/ui/button';

// Full Page Loading Overlay
export const PageLoadingOverlay = ({ message = 'Memuat halaman…' }: { message?: string }) => {
  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-orange-500 mx-auto" />
        <p className="text-gray-700 font-medium">{message}</p>
      </div>
    </div>
  );
};

// Section Loading (untuk bagian halaman tertentu)
export const SectionLoading = ({ message = 'Memuat data…' }: { message?: string }) => {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center space-y-3">
        <Loader2 className="w-10 h-10 animate-spin text-orange-500 mx-auto" />
        <p className="text-gray-600 text-sm">{message}</p>
      </div>
    </div>
  );
};

// Inline Loading (untuk area kecil)
export const InlineLoading = ({ message = 'Memuat…' }: { message?: string }) => {
  return (
    <div className="flex items-center justify-center gap-2 py-4">
      <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
      <span className="text-sm text-gray-600">{message}</span>
    </div>
  );
};

// Button Loading State
export const ButtonLoading = ({ 
  isLoading, 
  children, 
  loadingText = 'Memproses…',
  ...props 
}: any) => {
  return (
    <Button disabled={isLoading} {...props}>
      {isLoading ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          {loadingText}
        </>
      ) : (
        children
      )}
    </Button>
  );
};

// Real-time Sync Indicator
export const SyncIndicator = ({ 
  isSyncing, 
  lastSyncTime 
}: { 
  isSyncing: boolean; 
  lastSyncTime?: Date;
}) => {
  return (
    <div className="flex items-center gap-2 text-xs text-gray-500">
      {isSyncing ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
          <span className="text-blue-600">Menyinkronkan data…</span>
        </>
      ) : (
        <>
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span className="text-green-600">
            Sinkron {lastSyncTime ? `pada ${lastSyncTime.toLocaleTimeString('id-ID')}` : 'berhasil'}
          </span>
        </>
      )}
    </div>
  );
};

// Network Status Banner
export const NetworkStatusBanner = ({ 
  isOnline, 
  isSlowConnection 
}: { 
  isOnline: boolean; 
  isSlowConnection?: boolean;
}) => {
  if (isOnline && !isSlowConnection) return null;

  return (
    <div 
      className={`fixed top-0 left-0 right-0 z-50 py-2 px-4 text-center text-sm font-medium ${
        !isOnline 
          ? 'bg-red-500 text-white' 
          : 'bg-yellow-500 text-gray-900'
      }`}
    >
      {!isOnline ? (
        <div className="flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4" />
          <span>Koneksi internet terputus. Periksa jaringan Anda.</span>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2">
          <Wifi className="w-4 h-4" />
          <span>Jaringan Anda sedang lambat. Mohon tunggu sebentar…</span>
        </div>
      )}
    </div>
  );
};

// Offline Full Screen State
export const OfflineScreen = ({ onRetry }: { onRetry?: () => void }) => {
  return (
    <div className="fixed inset-0 bg-gray-50 z-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md space-y-6">
        <div className="bg-red-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
          <WifiOff className="w-10 h-10 text-red-600" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">
            Koneksi Internet Terputus
          </h2>
          <p className="text-gray-600">
            Periksa koneksi internet Anda dan coba lagi.
          </p>
        </div>

        {onRetry && (
          <Button 
            onClick={onRetry}
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
          >
            <RefreshCw className="w-5 h-5 mr-2" />
            Coba Lagi
          </Button>
        )}
      </div>
    </div>
  );
};

// Error State with Retry
export const ErrorState = ({ 
  title = 'Terjadi Kesalahan',
  message = 'Gagal memuat data. Silakan coba lagi.',
  onRetry,
  showRetry = true
}: { 
  title?: string;
  message?: string;
  onRetry?: () => void;
  showRetry?: boolean;
}) => {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center max-w-md space-y-4">
        <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8 text-red-600" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600">{message}</p>
        </div>

        {showRetry && onRetry && (
          <Button 
            onClick={onRetry}
            variant="outline"
            className="border-orange-500 text-orange-600 hover:bg-orange-50"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Coba Lagi
          </Button>
        )}
      </div>
    </div>
  );
};

// Empty State
export const EmptyState = ({ 
  title = 'Tidak Ada Data',
  message = 'Belum ada data yang tersedia.',
  icon: Icon = AlertCircle,
  action,
  actionLabel
}: { 
  title?: string;
  message?: string;
  icon?: any;
  action?: () => void;
  actionLabel?: string;
}) => {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center max-w-md space-y-4">
        <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
          <Icon className="w-8 h-8 text-gray-400" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600">{message}</p>
        </div>

        {action && actionLabel && (
          <Button 
            onClick={action}
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
          >
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
};

// Slow Loading Warning (setelah 3 detik)
export const SlowLoadingWarning = () => {
  return (
    <div className="fixed bottom-4 right-4 bg-yellow-50 border border-yellow-200 rounded-lg shadow-lg p-4 max-w-sm z-40 animate-in slide-in-from-bottom-5">
      <div className="flex items-start gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-yellow-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-yellow-900">
            Sedang memuat data
          </p>
          <p className="text-xs text-yellow-700 mt-1">
            Koneksi Anda mungkin lambat. Mohon tunggu sebentar…
          </p>
        </div>
      </div>
    </div>
  );
};

// Success Toast Animation
export const SuccessToast = ({ message }: { message: string }) => {
  return (
    <div className="fixed bottom-4 right-4 bg-green-50 border border-green-200 rounded-lg shadow-lg p-4 max-w-sm z-40 animate-in slide-in-from-bottom-5">
      <div className="flex items-center gap-3">
        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
        <p className="text-sm font-medium text-green-900">{message}</p>
      </div>
    </div>
  );
};

// Loading Progress Bar (untuk upload/download)
export const ProgressBar = ({ 
  progress, 
  label 
}: { 
  progress: number; 
  label?: string;
}) => {
  return (
    <div className="w-full space-y-2">
      {label && (
        <div className="flex justify-between text-sm">
          <span className="text-gray-700">{label}</span>
          <span className="text-gray-600 font-medium">{progress}%</span>
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div 
          className="bg-gradient-to-r from-orange-500 to-red-500 h-full rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

// Pulse Dot Indicator (untuk live updates)
export const PulseDot = () => {
  return (
    <span className="relative flex h-3 w-3">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
    </span>
  );
};
