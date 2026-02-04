import { Loader2 } from 'lucide-react';

interface SectionLoaderProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Section loading indicator
 * Digunakan untuk loading sebagian konten dalam halaman
 */
export function SectionLoader({ message = 'Memuat data...', size = 'md' }: SectionLoaderProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <Loader2 className={`${sizeClasses[size]} animate-spin text-primary`} />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
