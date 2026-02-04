import { useState, useEffect } from 'react';

/**
 * Hook untuk manage page-level loading state
 * dengan debounce untuk mencegah flicker
 */
export function usePageLoading(isDataLoading: boolean, minLoadingTime = 300) {
  const [isLoading, setIsLoading] = useState(true);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (isDataLoading) {
      setIsLoading(true);
      setShowContent(false);
    } else {
      // Debounce untuk mencegah flicker jika loading terlalu cepat
      const timer = setTimeout(() => {
        setIsLoading(false);
        setShowContent(true);
      }, minLoadingTime);

      return () => clearTimeout(timer);
    }
  }, [isDataLoading, minLoadingTime]);

  return { isLoading, showContent };
}

/**
 * Hook untuk detect slow loading (> 3 detik)
 */
export function useSlowLoadingDetection(threshold = 3000) {
  const [isSlowLoading, setIsSlowLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsSlowLoading(true);
    }, threshold);

    return () => {
      clearTimeout(timer);
      setIsSlowLoading(false);
    };
  }, [threshold]);

  return isSlowLoading;
}
