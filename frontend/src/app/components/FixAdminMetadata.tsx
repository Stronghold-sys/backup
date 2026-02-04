import { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '/utils/supabase'; // ✅ FIXED: Corrected import path
import { Wrench, CheckCircle, AlertCircle } from 'lucide-react';

/**
 * 🔧 Fix Admin Metadata Component
 * One-time fix untuk update admin user metadata di Supabase Auth
 */
export default function FixAdminMetadata() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message?: string } | null>(null);

  const handleFix = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      console.info('🔧 Calling fix-metadata endpoint...');
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-adb995ba/admin/fix-metadata`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();
      console.info('📥 Response:', data);

      if (data.success) {
        setResult({ success: true, message: data.message });
        toast.success('✅ Admin metadata berhasil diupdate!', {
          description: 'Silakan logout dan login kembali untuk melihat perubahan.',
          duration: 5000,
        });
      } else {
        setResult({ success: false, message: data.error });
        toast.error('❌ Gagal update metadata', {
          description: data.error,
          duration: 5000,
        });
      }
    } catch (error: any) {
      console.error('❌ Error calling fix-metadata:', error);
      setResult({ success: false, message: error.message });
      toast.error('❌ Terjadi kesalahan', {
        description: 'Gagal memanggil endpoint fix-metadata',
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Wrench className="w-5 h-5 text-orange-600" />
          <CardTitle className="text-orange-900">Fix Admin Metadata</CardTitle>
        </div>
        <CardDescription className="text-orange-700">
          One-time fix untuk update metadata admin user (role, status, dll)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-orange-800 space-y-2">
          <p>
            <strong>Problem:</strong> Admin user tidak punya metadata <code>role: 'admin'</code> di Supabase Auth.
          </p>
          <p>
            <strong>Solution:</strong> Endpoint ini akan update metadata untuk <code>utskelompok03@gmail.com</code>
          </p>
          <p className="text-xs text-orange-600">
            ⚠️ Setelah fix berhasil, <strong>logout dan login kembali</strong> untuk apply changes.
          </p>
        </div>

        <Button
          onClick={handleFix}
          disabled={isLoading}
          className="w-full bg-orange-600 hover:bg-orange-700"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Memproses...
            </>
          ) : (
            <>
              <Wrench className="w-4 h-4 mr-2" />
              Fix Admin Metadata
            </>
          )}
        </Button>

        {result && (
          <div
            className={`p-4 rounded-lg flex items-start gap-3 ${
              result.success
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            {result.success ? (
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p
                className={`font-semibold ${
                  result.success ? 'text-green-900' : 'text-red-900'
                }`}
              >
                {result.success ? 'Berhasil!' : 'Gagal'}
              </p>
              <p
                className={`text-sm ${
                  result.success ? 'text-green-700' : 'text-red-700'
                }`}
              >
                {result.message}
              </p>
              {result.success && (
                <p className="text-xs text-green-600 mt-2">
                  <strong>Next steps:</strong>
                  <br />
                  1. Logout dari aplikasi
                  <br />
                  2. Login kembali dengan email/password yang sama
                  <br />
                  3. Metadata sudah terupdate!
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}