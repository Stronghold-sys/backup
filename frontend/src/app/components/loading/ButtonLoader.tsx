import { Loader2 } from 'lucide-react';

interface ButtonLoaderProps {
  size?: 'sm' | 'md';
}

/**
 * Button loading spinner
 * Digunakan di dalam tombol saat proses sedang berjalan
 */
export function ButtonLoader({ size = 'sm' }: ButtonLoaderProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
  };

  return <Loader2 className={`${sizeClasses[size]} animate-spin`} />;
}
