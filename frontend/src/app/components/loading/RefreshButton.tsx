import { RefreshCw } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { ButtonLoader } from './ButtonLoader';

interface RefreshButtonProps {
  onRefresh: () => void | Promise<void>;
  isRefreshing?: boolean;
  label?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

/**
 * Refresh button dengan loading state
 * Berguna untuk admin tables dan lists yang perlu manual refresh
 */
export function RefreshButton({
  onRefresh,
  isRefreshing = false,
  label = 'Muat Ulang',
  variant = 'outline',
  size = 'default',
}: RefreshButtonProps) {
  return (
    <Button
      onClick={onRefresh}
      disabled={isRefreshing}
      variant={variant}
      size={size}
    >
      {isRefreshing ? (
        <>
          <ButtonLoader size="sm" />
          {size !== 'icon' && <span className="ml-2">Memperbarui...</span>}
        </>
      ) : (
        <>
          <RefreshCw className="h-4 w-4" />
          {size !== 'icon' && <span className="ml-2">{label}</span>}
        </>
      )}
    </Button>
  );
}
