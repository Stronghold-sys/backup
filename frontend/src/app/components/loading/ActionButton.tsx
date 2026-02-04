import { ReactNode } from 'react';
import { Button, ButtonProps } from '@/app/components/ui/button';
import { ButtonLoader } from './ButtonLoader';

interface ActionButtonProps extends ButtonProps {
  isLoading?: boolean;
  loadingText?: string;
  icon?: ReactNode;
  children: ReactNode;
}

/**
 * Generic action button dengan loading state
 * Untuk any action yang memerlukan loading feedback
 */
export function ActionButton({
  isLoading = false,
  loadingText = 'Memproses...',
  icon,
  children,
  disabled,
  ...props
}: ActionButtonProps) {
  return (
    <Button {...props} disabled={disabled || isLoading}>
      {isLoading ? (
        <>
          <ButtonLoader size="sm" />
          <span className="ml-2">{loadingText}</span>
        </>
      ) : (
        <>
          {icon && <span className="mr-2">{icon}</span>}
          {children}
        </>
      )}
    </Button>
  );
}
