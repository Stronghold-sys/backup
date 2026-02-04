import { ReactNode, useEffect, useState } from 'react';

interface AdminPageWrapperProps {
  children: ReactNode;
}

/**
 * Wrapper component untuk halaman admin yang mencegah flicker/berkedip
 * saat navigasi antar halaman dengan smooth fade-in animation
 */
export default function AdminPageWrapper({ children }: AdminPageWrapperProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Delay sedikit untuk smooth fade-in
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div 
      style={{
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.2s ease-in-out',
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {children}
    </div>
  );
}
