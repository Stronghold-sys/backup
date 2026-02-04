import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { projectId, publicAnonKey } from '/utils/supabase'; // ✅ FIXED: Corrected import path
import { RefreshCw } from 'lucide-react';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-adb995ba`;

/**
 * 🔍 REFUND DEBUG PAGE
 * 
 * Untuk debugging kenapa refund data tidak muncul
 */
export default function RefundDebugPage() {
  const { user, accessToken } = useAuthStore();
  const [logs, setLogs] = useState<string[]>([]);
  const [refundData, setRefundData] = useState<any>(null);
  const [kvData, setKvData] = useState<any>(null);
  const [testOrder, setTestOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.info(message);
  };

  // Test 1: Check if user is authenticated
  const testAuth = () => {
    addLog('=== TEST 1: AUTHENTICATION ===');
    addLog(`User: ${user ? user.email : 'NOT LOGGED IN'}`);
    addLog(`Role: ${user?.role || 'N/A'}`);
    addLog(`Token: ${accessToken ? 'YES (' + accessToken.substring(0, 20) + '...)' : 'NO'}`);
  };

  // Test 2: Fetch all refunds
  const testFetchRefunds = async () => {
    addLog('=== TEST 2: FETCH REFUNDS ===');
    setIsLoading(true);
    
    try {
      if (!accessToken) {
        addLog('❌ No access token available');
        return;
      }

      addLog('Fetching from: ' + API_URL + '/refunds');
      
      const response = await fetch(`${API_URL}/refunds`, {
        method: 'GET',
        headers: {
          'X-Session-Token': accessToken,
          'Content-Type': 'application/json',
        },
      });

      addLog(`Response status: ${response.status} ${response.statusText}`);
      
      const data = await response.json();
      addLog(`Response data: ${JSON.stringify(data, null, 2)}`);
      
      setRefundData(data);
      
      if (data.success) {
        addLog(`✅ SUCCESS: Found ${data.refunds?.length || 0} refunds`);
      } else {
        addLog(`❌ ERROR: ${data.error}`);
      }
    } catch (error: any) {
      addLog(`❌ EXCEPTION: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Test 3: Check KV store directly
  const testKvStore = async () => {
    addLog('=== TEST 3: CHECK KV STORE ===');
    setIsLoading(true);
    
    try {
      if (!accessToken) {
        addLog('❌ No access token available');
        return;
      }

      // Try to get refund data from KV store
      addLog('Checking KV store for refund: prefix...');
      
      // This would require a special endpoint to check KV directly
      addLog('⚠️ Direct KV check requires backend support');
      addLog('Check Supabase Dashboard → Table Editor → kv_store_adb995ba');
      addLog('Look for keys starting with "refund:"');
      
    } catch (error: any) {
      addLog(`❌ EXCEPTION: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Test 4: Create test refund
  const testCreateRefund = async () => {
    addLog('=== TEST 4: CREATE TEST REFUND ===');
    setIsLoading(true);
    
    try {
      if (!accessToken || !user) {
        addLog('❌ Not authenticated');
        return;
      }

      // First, check if we have a delivered order
      addLog('Fetching user orders...');
      const ordersResponse = await fetch(`${API_URL}/orders/user`, {
        headers: { 'X-Session-Token': accessToken }
      });
      
      const ordersData = await ordersResponse.json();
      addLog(`Found ${ordersData.orders?.length || 0} orders`);
      
      const deliveredOrder = ordersData.orders?.find((o: any) => o.status === 'delivered');
      
      if (!deliveredOrder) {
        addLog('❌ No delivered orders found. Need a delivered order to test refund.');
        addLog('Please create an order and set it to delivered status first.');
        return;
      }
      
      addLog(`Found delivered order: ${deliveredOrder.id}`);
      setTestOrder(deliveredOrder);
      
      // Check if refund already exists
      const existingRefundResponse = await fetch(`${API_URL}/refunds/order/${deliveredOrder.id}`, {
        headers: { 'X-Session-Token': accessToken }
      });
      
      const existingRefundData = await existingRefundResponse.json();
      if (existingRefundData.success && existingRefundData.refund) {
        addLog('⚠️ Refund already exists for this order: ' + existingRefundData.refund.id);
        return;
      }
      
      // Create test refund
      addLog('Creating test refund...');
      const refundPayload = {
        orderId: deliveredOrder.id,
        type: 'user_request',
        reason: 'Test refund - Debugging data not showing',
        description: 'This is a test refund created from RefundDebugPage',
        amount: deliveredOrder.totalAmount,
        evidence: [
          {
            id: 'TEST-EV-1',
            type: 'image',
            url: 'data:image/png;base64,test',
            fileName: 'test.png',
            fileSize: 1024,
            uploadedAt: new Date().toISOString()
          }
        ]
      };
      
      addLog('Payload: ' + JSON.stringify(refundPayload, null, 2));
      
      const response = await fetch(`${API_URL}/refunds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Token': accessToken,
        },
        body: JSON.stringify(refundPayload),
      });

      addLog(`Response status: ${response.status} ${response.statusText}`);
      
      const data = await response.json();
      addLog(`Response: ${JSON.stringify(data, null, 2)}`);
      
      if (data.success) {
        addLog(`✅ SUCCESS: Refund created with ID: ${data.refund.id}`);
        addLog('Now try fetching refunds again to see if it appears');
      } else {
        addLog(`❌ ERROR: ${data.error}`);
      }
      
    } catch (error: any) {
      addLog(`❌ EXCEPTION: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-run auth test on mount
  useEffect(() => {
    if (user && accessToken) {
      testAuth();
    }
  }, [user, accessToken]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🔍 Refund Debug Console
          </h1>
          <p className="text-gray-600">
            Diagnostic tool untuk debugging kenapa refund data tidak muncul
          </p>
        </div>

        {/* Test Buttons */}
        <Card>
          <CardHeader>
            <CardTitle>Test Suite</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button onClick={testAuth} variant="outline">
                1. Check Auth
              </Button>
              <Button onClick={testFetchRefunds} variant="outline" disabled={isLoading}>
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
                2. Fetch Refunds
              </Button>
              <Button onClick={testKvStore} variant="outline" disabled={isLoading}>
                3. Check KV Store
              </Button>
              <Button onClick={testCreateRefund} variant="outline" disabled={isLoading}>
                4. Create Test Refund
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Current Data Display */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Refund Data */}
          <Card>
            <CardHeader>
              <CardTitle>Refund Data Response</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto max-h-96 text-xs">
                {refundData ? JSON.stringify(refundData, null, 2) : 'No data yet. Click "Fetch Refunds" to test.'}
              </pre>
            </CardContent>
          </Card>

          {/* Test Order */}
          <Card>
            <CardHeader>
              <CardTitle>Test Order (for creating refund)</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto max-h-96 text-xs">
                {testOrder ? JSON.stringify(testOrder, null, 2) : 'No order loaded yet. Click "Create Test Refund" to find an order.'}
              </pre>
            </CardContent>
          </Card>
        </div>

        {/* Console Logs */}
        <Card>
          <CardHeader>
            <CardTitle>Console Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {logs.length === 0 ? (
                <p className="text-gray-500">No logs yet. Run tests to see logs.</p>
              ) : (
                logs.map((log, index) => (
                  <div
                    key={index}
                    className={`text-sm font-mono ${
                      log.includes('✅') 
                        ? 'text-green-600' 
                        : log.includes('❌') 
                        ? 'text-red-600' 
                        : log.includes('⚠️')
                        ? 'text-yellow-600'
                        : log.includes('===')
                        ? 'text-blue-600 font-bold'
                        : 'text-gray-700'
                    }`}
                  >
                    {log}
                  </div>
                ))
              )}
            </div>
            
            {logs.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLogs([])}
                className="mt-4"
              >
                Clear Logs
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">How to use this debug tool:</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                <li>
                  <strong>Check Auth:</strong> Verify you're logged in with correct role
                </li>
                <li>
                  <strong>Fetch Refunds:</strong> Try to fetch all refunds from backend
                </li>
                <li>
                  <strong>Check KV Store:</strong> Instructions to manually check database
                </li>
                <li>
                  <strong>Create Test Refund:</strong> Create a test refund to verify system works
                </li>
              </ol>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">Expected Results:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
                <li>Test 1 should show your user email and role</li>
                <li>Test 2 should return success with array of refunds</li>
                <li>Test 4 should create a refund successfully</li>
                <li>After Test 4, Test 2 should show at least 1 refund</li>
              </ul>
            </div>

            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-semibold text-yellow-900 mb-2">Common Issues:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-yellow-800">
                <li>401 Error: Token expired or invalid - try logout and login again</li>
                <li>403 Error: User is not admin - make sure you're logged in as admin</li>
                <li>Empty refunds array: No refunds created yet - use Test 4 to create one</li>
                <li>No delivered orders: Create an order and set status to delivered first</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}