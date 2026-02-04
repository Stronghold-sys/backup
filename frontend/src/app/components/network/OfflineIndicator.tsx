import { WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/app/components/ui/alert';

interface OfflineIndicatorProps {
  onRetry?: () => void;
}

/**
 * Banner indicator saat koneksi terputus
 * Muncul di bagian atas halaman
 */
export function OfflineIndicatorBanner({ onRetry }: OfflineIndicatorProps) {
  return (
    <Alert variant="destructive" className="rounded-none border-x-0 border-t-0">
      <WifiOff className="h-4 w-4" />
      <AlertTitle>Koneksi Terputus</AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span>Periksa koneksi internet Anda</span>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="ml-4"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Coba Lagi
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

/**
 * Full screen offline state
 * Untuk halaman yang tidak bisa dimuat sama sekali tanpa koneksi
 */
export function OfflineScreen({ onRetry }: OfflineIndicatorProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <div className="text-center space-y-6 px-4">
        <div className="flex justify-center">
          <div className="rounded-full bg-destructive/10 p-6">
            <WifiOff className="h-16 w-16 text-destructive" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Koneksi Internet Terputus</h2>
          <p className="text-muted-foreground max-w-md">
            Sepertinya Anda sedang offline. Periksa koneksi internet Anda dan coba lagi.
          </p>
        </div>
        {onRetry && (
          <Button onClick={onRetry} size="lg">
            <RefreshCw className="h-5 w-5 mr-2" />
            Coba Lagi
          </Button>
        )}
      </div>
    </div>
  );
}
