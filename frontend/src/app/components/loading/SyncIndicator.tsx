import { RefreshCw } from 'lucide-react';
import { cn } from '@/app/components/ui/utils';

interface SyncIndicatorProps {
  message?: string;
  className?: string;
}

/**
 * Real-time sync indicator
 * Menampilkan status sinkronisasi data real-time
 */
export function SyncIndicator({ message = 'Menyinkronkan data...', className }: SyncIndicatorProps) {
  return (
    <div className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}>
      <RefreshCw className="h-4 w-4 animate-spin" />
      <span>{message}</span>
    </div>
  );
}
