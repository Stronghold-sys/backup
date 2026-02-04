import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2 } from 'lucide-react';

export function PageTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    // Show loading when location changes
    setIsNavigating(true);
    
    // Hide loading after a short delay to allow the page to render
    const timer = setTimeout(() => {
      setIsNavigating(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <>
      {/* Top Loading Bar */}
      <AnimatePresence>
        {isNavigating && (
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            exit={{ scaleX: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-pink-500 to-orange-500 z-[9999] origin-left"
            style={{
              boxShadow: '0 0 10px rgba(249, 115, 22, 0.5)',
            }}
          />
        )}
      </AnimatePresence>

      {/* Full Page Overlay (Optional - for smoother transitions) */}
      <AnimatePresence mode="wait">
        {isNavigating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[9998] flex items-center justify-center"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
                <div className="absolute inset-0 w-12 h-12 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 opacity-20 blur-xl animate-pulse" />
              </div>
              <p className="text-sm text-gray-600 font-medium">Memuat halaman...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Content with Fade Animation */}
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.1 }}
      >
        {children}
      </motion.div>
    </>
  );
}

// Lightweight version - only top bar (for better performance)
export function PageTransitionBar() {
  const location = useLocation();
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    setIsNavigating(true);
    
    const timer = setTimeout(() => {
      setIsNavigating(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <AnimatePresence>
      {isNavigating && (
        <>
          {/* Animated Progress Bar */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            exit={{ scaleX: 1, opacity: 0 }}
            transition={{ 
              scaleX: { duration: 0.4, ease: 'easeOut' },
              opacity: { duration: 0.2, delay: 0.2 }
            }}
            className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-pink-500 to-orange-500 z-[9999] origin-left"
            style={{
              boxShadow: '0 0 10px rgba(249, 115, 22, 0.5)',
            }}
          />
          
          {/* Shimmer Effect */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: '200%' }}
            transition={{ 
              duration: 0.8,
              ease: 'easeInOut',
              repeat: Infinity
            }}
            className="fixed top-0 left-0 w-1/3 h-1 bg-gradient-to-r from-transparent via-white to-transparent opacity-40 z-[10000]"
          />
        </>
      )}
    </AnimatePresence>
  );
}
