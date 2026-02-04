import { useState, useEffect } from 'react';
import { useAuthStore, useCartStore, useOrderStore } from '@/lib/store';
import { useNotificationStore } from '@/lib/notificationStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { toast } from 'sonner';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  User,
  ShoppingCart,
  Package,
  Bell,
  Database,
  Wifi,
  WifiOff,
} from 'lucide-react';

export default function SystemTestPage() {
  const { user, accessToken, isAuthenticated } = useAuthStore();
  const { items: cartItems, getTotalItems } = useCartStore();
  const { orders } = useOrderStore();
  const { banNotification, deletedNotification } = useNotificationStore();

  const [testResults, setTestResults] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [apiStatus, setApiStatus] = useState<'online' | 'offline' | 'checking'>('checking');

  // Check API status
  useEffect(() => {
    checkAPIStatus();
  }, []);

  const checkAPIStatus = async () => {
    setApiStatus('checking');
    try {
      const response = await fetch(
        'https://dazsblmccvxtewtmaljf.supabase.co/functions/v1/make-server-adb995ba/products'
      );
      setApiStatus(response.ok ? 'online' : 'offline');
    } catch (error) {
      setApiStatus('offline');
    }
  };

  const runTest = async (name: string, testFn: () => Promise<boolean>, description?: string) => {
    const startTime = Date.now();
    try {
      const passed = await testFn();
      const duration = Date.now() - startTime;
      
      setTestResults((prev) => [
        ...prev,
        {
          name,
          description,
          passed,
          duration,
          timestamp: new Date().toISOString(),
        },
      ]);
      
      return passed;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      // ✅ FIX: Better error logging for debugging
      console.error(`❌ [${name}] Check error:`, error);
      
      setTestResults((prev) => [
        ...prev,
        {
          name,
          description,
          passed: false,
          error: error.message,
          duration,
          timestamp: new Date().toISOString(),
        },
      ]);
      
      return false;
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);

    toast.info('Starting system tests...');

    // Test 1: Authentication
    await runTest(
      'Authentication',
      async () => {
        return isAuthenticated && !!user && !!accessToken;
      },
      'Check if user is logged in with valid token'
    );

    // Test 2: User Data
    await runTest(
      'User Data',
      async () => {
        return !!user?.email && !!user?.name && !!user?.id;
      },
      'Verify user data is complete'
    );

    // Test 3: Cart Store
    await runTest(
      'Cart Store',
      async () => {
        return cartItems !== undefined && typeof getTotalItems === 'function';
      },
      'Check cart store is initialized'
    );

    // Test 4: Order Store
    await runTest(
      'Order Store',
      async () => {
        return Array.isArray(orders);
      },
      'Check order store is initialized'
    );

    // Test 5: Notification Store
    await runTest(
      'Notification Store',
      async () => {
        return (
          banNotification !== undefined && deletedNotification !== undefined
        );
      },
      'Check notification store is initialized'
    );

    // Test 6: API Connectivity
    await runTest(
      'API Connectivity',
      async () => {
        const response = await fetch(
          'https://dazsblmccvxtewtmaljf.supabase.co/functions/v1/make-server-adb995ba/products'
        );
        return response.ok;
      },
      'Test backend API connection'
    );

    // Test 7: User Status Check
    if (accessToken) {
      await runTest(
        'UserStatus',
        async () => {
          const response = await fetch(
            'https://dazsblmccvxtewtmaljf.supabase.co/functions/v1/make-server-adb995ba/auth/check-status',
            {
              headers: {
                'X-Session-Token': accessToken,
              },
            }
          );
          
          // ✅ FIX: Handle 401/403 as expected behavior (not errors)
          if (response.status === 401) {
            console.info('ℹ️ [UserStatus] Token expired or invalid (expected)');
            return false;
          }
          
          if (response.status === 403) {
            const errorData = await response.json().catch(() => ({}));
            if (errorData.banned) {
              console.info('ℹ️ [UserStatus] User is banned/suspended (expected)');
            } else if (errorData.deleted) {
              console.info('ℹ️ [UserStatus] User was deleted (expected)');
            } else {
              console.info('ℹ️ [UserStatus] User account inactive (expected)');
            }
            return false;
          }
          
          if (!response.ok) {
            console.error('❌ [UserStatus] Unexpected error:', response.status);
            return false;
          }
          
          const data = await response.json();
          return data.success === true;
        },
        'Verify user account status is active'
      );
    }

    // Test 8: LocalStorage
    await runTest(
      'LocalStorage',
      async () => {
        try {
          localStorage.setItem('__test__', 'test');
          const value = localStorage.getItem('__test__');
          localStorage.removeItem('__test__');
          return value === 'test';
        } catch {
          return false;
        }
      },
      'Check localStorage is accessible'
    );

    setIsRunning(false);
    toast.success('All tests completed!');
  };

  const passedTests = testResults.filter((t) => t.passed).length;
  const failedTests = testResults.filter((t) => !t.passed).length;
  const totalTests = testResults.length;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🔧 System Test Page
          </h1>
          <p className="text-gray-600">
            Comprehensive system diagnostics and testing
          </p>
        </div>

        {/* API Status */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {apiStatus === 'online' && <Wifi className="w-5 h-5 text-green-600" />}
              {apiStatus === 'offline' && <WifiOff className="w-5 h-5 text-red-600" />}
              {apiStatus === 'checking' && <RefreshCw className="w-5 h-5 animate-spin" />}
              API Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Badge variant={apiStatus === 'online' ? 'default' : 'destructive'}>
                  {apiStatus.toUpperCase()}
                </Badge>
                <p className="text-sm text-gray-600 mt-2">
                  {apiStatus === 'online' && 'Backend is responding normally'}
                  {apiStatus === 'offline' && 'Backend is not accessible'}
                  {apiStatus === 'checking' && 'Checking connection...'}
                </p>
              </div>
              <Button onClick={checkAPIStatus} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Current State */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <User className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">User</p>
                  <p className="text-lg font-bold">
                    {isAuthenticated ? 'Logged In' : 'Not Logged In'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <ShoppingCart className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Cart Items</p>
                  <p className="text-lg font-bold">{getTotalItems()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Package className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Orders</p>
                  <p className="text-lg font-bold">{orders.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Bell className="w-8 h-8 text-orange-600" />
                <div>
                  <p className="text-sm text-gray-600">Notifications</p>
                  <p className="text-lg font-bold">
                    {banNotification || deletedNotification ? 'Active' : 'None'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Test Controls */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Run System Tests</CardTitle>
            <CardDescription>
              Execute comprehensive tests to verify all features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Button
                onClick={runAllTests}
                disabled={isRunning}
                className="gap-2"
              >
                {isRunning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Running Tests...
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4" />
                    Run All Tests
                  </>
                )}
              </Button>

              {totalTests > 0 && (
                <div className="flex gap-4">
                  <Badge variant="default" className="gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {passedTests} Passed
                  </Badge>
                  <Badge variant="destructive" className="gap-1">
                    <XCircle className="w-3 h-3" />
                    {failedTests} Failed
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Test Results */}
        {testResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
              <CardDescription>
                {passedTests} of {totalTests} tests passed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {testResults.map((result, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${
                      result.passed
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        {result.passed ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">
                            {result.name}
                          </h4>
                          {result.description && (
                            <p className="text-sm text-gray-600 mt-1">
                              {result.description}
                            </p>
                          )}
                          {result.error && (
                            <p className="text-sm text-red-700 mt-2 font-mono">
                              Error: {result.error}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className="ml-4">
                        {result.duration}ms
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* User Info (Debug) */}
        {isAuthenticated && user && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>User Information (Debug)</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-xs">
                {JSON.stringify(user, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}