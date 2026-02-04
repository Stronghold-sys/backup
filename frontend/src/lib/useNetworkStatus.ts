/**
 * NETWORK STATUS HOOK
 * Custom hook untuk monitoring status jaringan dan handling errors
 */

import { useState, useEffect, useCallback } from 'react';

interface NetworkStatus {
  isOnline: boolean;
  isSlowConnection: boolean;
  connectionType: string;
}

export function useNetworkStatus() {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: navigator.onLine,
    isSlowConnection: false,
    connectionType: 'unknown',
  });

  useEffect(() => {
    const updateOnlineStatus = () => {
      setNetworkStatus((prev) => ({
        ...prev,
        isOnline: navigator.onLine,
      }));
    };

    const checkConnectionSpeed = () => {
      // @ts-ignore - Navigator.connection is experimental
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      
      if (connection) {
        const slowTypes = ['slow-2g', '2g', '3g'];
        const isSlowConnection = slowTypes.includes(connection.effectiveType);
        
        setNetworkStatus((prev) => ({
          ...prev,
          isSlowConnection,
          connectionType: connection.effectiveType || 'unknown',
        }));
      }
    };

    // Event listeners
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Check connection speed on mount and when connection changes
    checkConnectionSpeed();
    
    // @ts-ignore
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection) {
      connection.addEventListener('change', checkConnectionSpeed);
    }

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      
      if (connection) {
        connection.removeEventListener('change', checkConnectionSpeed);
      }
    };
  }, []);

  return networkStatus;
}

/**
 * API CALL WITH RETRY HOOK
 * Hook untuk API call dengan automatic retry dan error handling
 */

interface UseApiOptions {
  maxRetries?: number;
  retryDelay?: number;
  onError?: (error: Error) => void;
  onSuccess?: (data: any) => void;
}

export function useApiCall<T = any>(
  apiFunction: () => Promise<T>,
  options: UseApiOptions = {}
) {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    onError,
    onSuccess,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const execute = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await apiFunction();
        setData(result);
        setIsLoading(false);
        setRetryCount(0);
        
        if (onSuccess) {
          onSuccess(result);
        }
        
        return result;
      } catch (err: any) {
        lastError = err;
        console.error(`API call failed (attempt ${attempt + 1}/${maxRetries + 1}):`, err);

        // Don't retry on 4xx errors (client errors)
        if (err.status && err.status >= 400 && err.status < 500) {
          break;
        }

        // Wait before retrying
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)));
          setRetryCount(attempt + 1);
        }
      }
    }

    // All retries failed
    setError(lastError || new Error('Gagal memuat data'));
    setIsLoading(false);
    
    if (onError && lastError) {
      onError(lastError);
    }

    return null;
  }, [apiFunction, maxRetries, retryDelay, onError, onSuccess]);

  const retry = useCallback(() => {
    setRetryCount(0);
    execute();
  }, [execute]);

  return {
    data,
    isLoading,
    error,
    retryCount,
    execute,
    retry,
  };
}

/**
 * LOADING STATE MANAGER HOOK
 * Hook untuk mengelola berbagai state loading
 */

export function useLoadingState() {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

  const setLoading = useCallback((key: string, isLoading: boolean) => {
    setLoadingStates((prev) => ({
      ...prev,
      [key]: isLoading,
    }));
  }, []);

  const isLoading = useCallback((key: string) => {
    return loadingStates[key] || false;
  }, [loadingStates]);

  const isAnyLoading = useCallback(() => {
    return Object.values(loadingStates).some((loading) => loading);
  }, [loadingStates]);

  return {
    setLoading,
    isLoading,
    isAnyLoading,
  };
}

/**
 * SLOW LOADING DETECTOR HOOK
 * Detect ketika loading terlalu lama dan tampilkan warning
 */

export function useSlowLoadingDetector(isLoading: boolean, threshold = 3000) {
  const [showSlowWarning, setShowSlowWarning] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setShowSlowWarning(false);
      return;
    }

    const timer = setTimeout(() => {
      setShowSlowWarning(true);
    }, threshold);

    return () => {
      clearTimeout(timer);
      setShowSlowWarning(false);
    };
  }, [isLoading, threshold]);

  return showSlowWarning;
}

/**
 * DEBOUNCED SEARCH HOOK
 * Hook untuk search dengan debounce untuk mengurangi API calls
 */

export function useDebounce<T>(value: T, delay = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * POLLING HOOK
 * Hook untuk polling data secara periodik dengan handling network error
 */

export function usePolling(
  pollFunction: () => Promise<any>,
  interval = 5000,
  enabled = true
) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<Error | null>(null);
  const { isOnline } = useNetworkStatus();

  useEffect(() => {
    if (!enabled || !isOnline) return;

    const poll = async () => {
      try {
        const result = await pollFunction();
        setData(result);
        setError(null);
      } catch (err: any) {
        console.error('Polling error:', err);
        setError(err);
      }
    };

    // Initial poll
    poll();

    // Set up interval
    const intervalId = setInterval(poll, interval);

    return () => {
      clearInterval(intervalId);
    };
  }, [pollFunction, interval, enabled, isOnline]);

  return { data, error };
}
