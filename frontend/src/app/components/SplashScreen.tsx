import { useEffect, useState } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, Zap } from 'lucide-react';
import { Button } from '@/app/components/ui/button';

interface SplashScreenProps {
  onComplete: () => void;
}

type LoadingStage = 'initial' | 'checking' | 'loading' | 'ready' | 'error';

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [stage, setStage] = useState<LoadingStage>('initial');
  const [progress, setProgress] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [fadeOut, setFadeOut] = useState(false);

  // Check network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Splash screen loading sequence
  useEffect(() => {
    const sequence = async () => {
      // Stage 1: Initial animation (0.3s) - REDUCED from 1s
      setStage('initial');
      await sleep(300);

      // Stage 2: Checking connection (0.4s) - REDUCED from 1.5s
      setStage('checking');
      setProgress(30);
      await sleep(200);

      // Check if online
      if (!navigator.onLine) {
        setStage('error');
        return;
      }

      setProgress(60);
      await sleep(200);

      // Stage 3: Loading resources (0.5s) - REDUCED from 2s
      setStage('loading');
      setProgress(80);
      await sleep(300);

      setProgress(95);
      await sleep(200);

      // Stage 4: Ready (0.2s) - REDUCED from 0.5s
      setStage('ready');
      setProgress(100);
      await sleep(200);

      // Fade out and complete (0.3s) - REDUCED from 0.5s
      setFadeOut(true);
      await sleep(300);
      onComplete();
    };

    sequence();
  }, [onComplete]);

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const handleRetry = () => {
    window.location.reload();
  };

  // Error state - No connection
  if (stage === 'error') {
    return (
      <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center space-y-6 px-4 animate-fadeIn">
          {/* Error Icon */}
          <div className="relative mx-auto w-24 h-24">
            <div className="absolute inset-0 bg-red-100 rounded-full animate-ping opacity-20"></div>
            <div className="relative bg-gradient-to-br from-red-500 to-orange-600 rounded-full w-24 h-24 flex items-center justify-center shadow-2xl">
              <WifiOff className="w-12 h-12 text-white animate-pulse" />
            </div>
          </div>

          {/* Error Message */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">
              Tidak Ada Koneksi
            </h1>
            <p className="text-gray-600 max-w-md mx-auto">
              Sepertinya Anda sedang offline. Periksa koneksi internet Anda dan coba lagi.
            </p>
          </div>

          {/* Retry Button */}
          <Button
            onClick={handleRetry}
            className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white px-8 py-6 h-auto text-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
          >
            <RefreshCw className="w-5 h-5 mr-2" />
            Coba Lagi
          </Button>

          {/* Connection Status */}
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
            <span>{isOnline ? 'Online' : 'Offline'}</span>
          </div>
        </div>
      </div>
    );
  }

  // Main splash screen
  return (
    <div 
      className={`fixed inset-0 z-[9999] bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center transition-opacity duration-500 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="text-center space-y-8 px-4">
        {/* Logo Animation */}
        <div className="relative">
          {/* Pulse Background */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`w-32 h-32 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full blur-3xl opacity-30 ${
              stage === 'initial' ? 'animate-pulse-slow' : ''
            }`}></div>
          </div>

          {/* Rotating Ring */}
          {stage === 'checking' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-40 h-40 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
            </div>
          )}

          {/* Logo */}
          <div className={`relative transition-all duration-700 ${
            stage === 'initial' ? 'scale-0 rotate-180' : 'scale-100 rotate-0'
          }`}>
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl w-28 h-28 mx-auto flex items-center justify-center shadow-2xl transform transition-transform duration-300 hover:scale-110">
              <span className="text-white font-bold text-5xl">M</span>
            </div>
          </div>

          {/* Success Checkmark */}
          {stage === 'ready' && (
            <div className="absolute -top-2 -right-2 bg-green-500 rounded-full p-2 shadow-lg animate-bounceIn">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
          )}
        </div>

        {/* Brand Name */}
        <div className={`transition-all duration-700 delay-300 ${
          stage === 'initial' ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
        }`}>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            MarketHub
          </h1>
          <p className="text-gray-600 mt-2 text-lg">
            Marketplace Terpercaya Indonesia
          </p>
        </div>

        {/* Loading Status */}
        <div className={`space-y-4 transition-all duration-500 ${
          stage === 'initial' ? 'opacity-0' : 'opacity-100'
        }`}>
          {/* Progress Bar */}
          <div className="w-64 mx-auto">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-500 ease-out relative"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 bg-white/30 animate-shimmer"></div>
              </div>
            </div>
          </div>

          {/* Status Text */}
          <div className="flex items-center justify-center gap-3 min-h-[32px]">
            {stage === 'checking' && (
              <>
                <Wifi className="w-5 h-5 text-green-600 animate-pulse" />
                <span className="text-gray-700 font-medium animate-pulse">
                  Memeriksa koneksi...
                </span>
              </>
            )}
            {stage === 'loading' && (
              <>
                <Zap className="w-5 h-5 text-green-600 animate-bounce" />
                <span className="text-gray-700 font-medium">
                  Memuat aplikasi...
                </span>
              </>
            )}
            {stage === 'ready' && (
              <>
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="text-green-600 font-semibold">
                  Siap digunakan!
                </span>
              </>
            )}
          </div>

          {/* Progress Percentage */}
          <div className="text-sm text-gray-500 font-mono">
            {progress}%
          </div>
        </div>

        {/* Connection Indicator */}
        <div className={`transition-all duration-500 ${
          stage === 'initial' ? 'opacity-0' : 'opacity-100'
        }`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-md">
            <div className={`w-2 h-2 rounded-full ${
              isOnline ? 'bg-green-500' : 'bg-red-500'
            } animate-pulse`}></div>
            <span className="text-xs font-medium text-gray-600">
              {isOnline ? 'Koneksi Stabil' : 'Offline'}
            </span>
            {stage === 'checking' && (
              <RefreshCw className="w-3 h-3 text-gray-400 animate-spin ml-1" />
            )}
          </div>
        </div>

        {/* Loading Dots Animation */}
        <div className={`flex justify-center gap-2 transition-all duration-500 ${
          stage === 'ready' ? 'opacity-0' : 'opacity-100'
        }`}>
          <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>

        {/* Version Info */}
        <div className={`text-xs text-gray-400 transition-all duration-500 delay-500 ${
          stage === 'initial' ? 'opacity-0' : 'opacity-100'
        }`}>
          Version 1.0.0
        </div>
      </div>
    </div>
  );
}