import { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Bug, Key, RefreshCw, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { api } from '@/lib/supabase';
import { toast } from 'sonner';

export default function DevDebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  const handleInitialize = async () => {
    setIsInitializing(true);
    try {
      console.info('🚀 Triggering app initialization...');
      const response = await api.post('/init', {});
      
      if (response.success) {
        toast.success('Initialization successful!', {
          description: 'Database and admin account have been set up.',
        });
        console.info('✅ Initialization complete:', response);
      } else {
        toast.error('Initialization failed', {
          description: response.error || 'Check console for details',
        });
        console.error('❌ Initialization failed:', response);
      }
    } catch (error: any) {
      console.error('💥 Initialization error:', error);
      toast.error('Initialization error', {
        description: error.message || 'Check console for details',
      });
    } finally {
      setIsInitializing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 w-12 h-12 bg-purple-600 hover:bg-purple-700 rounded-full shadow-lg flex items-center justify-center text-white transition-all duration-200 hover:scale-110"
        title="Open Debug Panel"
      >
        <Bug className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96">
      <Card className="shadow-2xl border-2 border-purple-200">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bug className="w-5 h-5 text-purple-600" />
              <CardTitle className="text-lg">Dev Debug Panel</CardTitle>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
          <CardDescription>
            Development tools for testing authentication
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {/* Initialize Button */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <RefreshCw className="w-4 h-4" />
              <span>Database Setup</span>
            </div>
            <Button
              onClick={handleInitialize}
              disabled={isInitializing}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              {isInitializing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Initializing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Initialize Database
                </>
              )}
            </Button>
            <p className="text-xs text-gray-500">
              Creates admin account and seeds products. Safe to run multiple times.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="space-y-2">
            <div className="text-sm font-semibold text-gray-700">
              Quick Actions
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const email = document.querySelector<HTMLInputElement>('input[type="email"]');
                  const password = document.querySelector<HTMLInputElement>('input[type="password"]');
                  if (email && password) {
                    email.value = 'utskelompok03@gmail.com';
                    password.value = '123456';
                    // Trigger change event
                    email.dispatchEvent(new Event('input', { bubbles: true }));
                    password.dispatchEvent(new Event('input', { bubbles: true }));
                    toast.success('Credentials filled!');
                  }
                }}
                className="text-xs"
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                Fill Form
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  window.location.href = '/register';
                }}
                className="text-xs"
              >
                Go to Register
              </Button>
            </div>
          </div>

          {/* Status Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              <strong>Note:</strong> If you see "Invalid login credentials", it means the admin
              account hasn't been created yet. Click "Initialize Database" above.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}