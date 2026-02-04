import { WifiLow } from 'lucide-react';
import { Alert, AlertDescription } from '@/app/components/ui/alert';

/**
 * Indicator untuk jaringan lambat
 * Muncul sebagai banner saat request memakan waktu lama
 */
export function SlowNetworkIndicator() {
  return (
    <Alert className="rounded-none border-x-0 border-t-0 bg-orange-50 border-orange-200">
      <WifiLow className="h-4 w-4 text-orange-600" />
      <AlertDescription className="text-orange-800">
        Jaringan Anda sedang lambat. Mohon tunggu sebentar...
      </AlertDescription>
    </Alert>
  );
}
