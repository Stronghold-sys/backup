/**
 * SAFE PAGE TRANSITION COMPONENT
 * Wrapper yang aman untuk PageTransitionBar yang menghindari error SSR/hydration
 */

import { useEffect, useState } from 'react';
import { PageTransitionBar } from './PageTransition';

/**
 * SafePageTransitionBar - Only renders PageTransitionBar on client-side after mount
 * This prevents "useLocation() outside Router" errors during SSR or initial render
 */
export function SafePageTransitionBar() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Only run on client-side after component is mounted
    setIsMounted(true);
  }, []);

  // Don't render anything during SSR or before mount
  if (!isMounted) {
    return null;
  }

  // Safe to render PageTransitionBar after mount (Router is guaranteed to be ready)
  return <PageTransitionBar />;
}
