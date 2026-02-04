import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { OfflineIndicatorBanner } from './OfflineIndicator';
import { SlowNetworkIndicator } from './SlowNetworkIndicator';

interface NetworkStatusContextType {
  isOnline: boolean;
  isSlowNetwork: boolean;
  setSlowNetwork: (slow: boolean) => void;
}

const NetworkStatusContext = createContext<NetworkStatusContextType | undefined>(undefined);

export function useNetworkStatusContext() {
  const context = useContext(NetworkStatusContext);
  if (!context) {
    throw new Error('useNetworkStatusContext must be used within NetworkStatusProvider');
  }
  return context;
}

interface NetworkStatusProviderProps {
  children: ReactNode;
}

/**
 * Provider untuk monitoring status jaringan secara global
 * Menampilkan indicator offline/slow network di seluruh aplikasi
 */
export function NetworkStatusProvider({ children }: NetworkStatusProviderProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSlowNetwork, setIsSlowNetwork] = useState(false);
  const [showOfflineRetry, setShowOfflineRetry] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineRetry(false);
      // Dispatch event untuk trigger refetch data
      window.dispatchEvent(new CustomEvent('network-restored'));
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineRetry(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = () => {
    // Force check online status
    if (navigator.onLine) {
      setIsOnline(true);
      setShowOfflineRetry(false);
      // ✅ FIXED: JANGAN auto-reload! Biarkan user yang decide
      // window.location.reload(); // ❌ REMOVED: Sangat mengganggu!
      console.info('🌐 Network restored. Dispatching event for refetch...');
    }
  };

  return (
    <NetworkStatusContext.Provider
      value={{
        isOnline,
        isSlowNetwork,
        setSlowNetwork: setIsSlowNetwork,
      }}
    >
      {/* Slow network indicator */}
      {isSlowNetwork && <SlowNetworkIndicator />}
      
      {/* Offline indicator */}
      {!isOnline && showOfflineRetry && (
        <OfflineIndicatorBanner onRetry={handleRetry} />
      )}
      
      {children}
    </NetworkStatusContext.Provider>
  );
}