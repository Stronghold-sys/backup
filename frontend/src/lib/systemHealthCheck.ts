// ✅ SYSTEM HEALTH CHECK UTILITY
// Run this from browser console to diagnose issues

export async function runSystemHealthCheck() {
  console.info('🏥 ═══════════════════════════════════════════════════════');
  console.info('🏥 MARKETHUB SYSTEM HEALTH CHECK');
  console.info('🏥 ═══════════════════════════════════════════════════════');
  console.info('');

  const results = {
    timestamp: new Date().toISOString(),
    checks: [] as any[],
    passed: 0,
    failed: 0,
    warnings: 0,
  };

  // Helper function
  const check = (name: string, passed: boolean, details?: string, warning?: boolean) => {
    const status = passed ? '✅' : (warning ? '⚠️' : '❌');
    const result = { name, passed, details, warning };
    results.checks.push(result);
    
    if (passed) results.passed++;
    else if (warning) results.warnings++;
    else results.failed++;

    console.info(`${status} ${name}`);
    if (details) console.info(`   ${details}`);
  };

  console.info('1️⃣ ENVIRONMENT CHECKS');
  console.info('─────────────────────────────────────────────────────────');
  
  // Check if we're in browser
  check('Browser Environment', typeof window !== 'undefined');
  
  // Check localStorage
  try {
    localStorage.setItem('__test__', 'test');
    localStorage.removeItem('__test__');
    check('LocalStorage Available', true);
  } catch (e) {
    check('LocalStorage Available', false, 'LocalStorage not accessible');
  }

  // Check Supabase env vars
  try {
    const { projectId, publicAnonKey } = await import('/utils/supabase/info');
    check('Supabase Config', !!projectId && !!publicAnonKey, 
      `Project: ${projectId?.substring(0, 10)}...`);
  } catch (e) {
    check('Supabase Config', false, 'Failed to load Supabase config');
  }

  console.info('');
  console.info('2️⃣ STORE CHECKS');
  console.info('─────────────────────────────────────────────────────────');

  try {
    const { useAuthStore } = await import('@/lib/store');
    const authState = useAuthStore.getState();
    check('Auth Store', true, 
      `User: ${authState.user?.email || 'Not logged in'} | Token: ${authState.accessToken ? 'Present' : 'Missing'}`);
    
    const { useCartStore } = await import('@/lib/store');
    const cartState = useCartStore.getState();
    check('Cart Store', true, 
      `Items: ${cartState.items.length} | Total: Rp ${cartState.getTotalPrice().toLocaleString()}`);

    const { useOrderStore } = await import('@/lib/store');
    const orderState = useOrderStore.getState();
    check('Order Store', true, 
      `Orders: ${orderState.orders.length}`);

    const { useNotificationStore } = await import('@/lib/notificationStore');
    const notifState = useNotificationStore.getState();
    check('Notification Store', true, 
      `Ban Notif: ${notifState.banNotification ? 'SET' : 'None'} | Delete Notif: ${notifState.deletedNotification ? 'SET' : 'None'}`);

  } catch (e: any) {
    check('Store Initialization', false, e.message);
  }

  console.info('');
  console.info('3️⃣ API CONNECTIVITY');
  console.info('─────────────────────────────────────────────────────────');

  try {
    const { api } = await import('@/lib/supabase');
    
    // Test ping endpoint (if exists) or a safe GET endpoint
    try {
      const response = await fetch('https://dazsblmccvxtewtmaljf.supabase.co/functions/v1/make-server-adb995ba/products', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhenNibG1jY3Z4dGV3dG1hbGpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY1NzAwOTEsImV4cCI6MjA1MjE0NjA5MX0.t_V2pVYuHiJoD-8MShvLKG-1YL5MgBRTwjMoMu0QDZk'
        }
      });
      check('Backend Connectivity', response.ok, 
        `Status: ${response.status} ${response.statusText}`);
    } catch (e: any) {
      check('Backend Connectivity', false, e.message);
    }

  } catch (e: any) {
    check('API Module', false, e.message);
  }

  console.info('');
  console.info('4️⃣ DATA INTEGRITY');
  console.info('─────────────────────────────────────────────────────────');

  try {
    const { useCartStore } = await import('@/lib/store');
    const cartState = useCartStore.getState();
    
    // Check cart items have valid product data
    const hasInvalidItems = cartState.items.some(item => !item.product || !item.product.id);
    check('Cart Items Valid', !hasInvalidItems, 
      hasInvalidItems ? 'Some cart items missing product data' : 'All cart items have valid product data',
      hasInvalidItems);

    // Check for orphaned items
    const hasOrphanedItems = cartState.items.some(item => 
      !item.productId || item.productId !== item.product?.id
    );
    check('No Orphaned Cart Items', !hasOrphanedItems,
      hasOrphanedItems ? 'Some items have mismatched IDs' : undefined,
      hasOrphanedItems);

  } catch (e: any) {
    check('Data Integrity', false, e.message);
  }

  console.info('');
  console.info('5️⃣ BROWSER COMPATIBILITY');
  console.info('─────────────────────────────────────────────────────────');

  check('Fetch API', typeof fetch !== 'undefined');
  check('Promise Support', typeof Promise !== 'undefined');
  check('LocalStorage', typeof localStorage !== 'undefined');
  check('SessionStorage', typeof sessionStorage !== 'undefined');
  check('Web Crypto API', typeof crypto !== 'undefined' && !!crypto.randomUUID);

  console.info('');
  console.info('6️⃣ PERFORMANCE CHECKS');
  console.info('─────────────────────────────────────────────────────────');

  // Check localStorage size
  try {
    let totalSize = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        totalSize += localStorage[key].length + key.length;
      }
    }
    const sizeKB = (totalSize / 1024).toFixed(2);
    const sizeWarning = totalSize > 4 * 1024 * 1024; // 4MB warning
    check('LocalStorage Size', !sizeWarning, 
      `${sizeKB} KB used`,
      sizeWarning);
  } catch (e) {
    check('LocalStorage Size', false, 'Unable to calculate');
  }

  // Check for console errors
  const errorWarning = results.failed > 0;
  check('No Critical Errors', !errorWarning, 
    errorWarning ? `${results.failed} checks failed` : 'All checks passed',
    errorWarning);

  console.info('');
  console.info('🏥 ═══════════════════════════════════════════════════════');
  console.info('🏥 SUMMARY');
  console.info('🏥 ═══════════════════════════════════════════════════════');
  console.info(`✅ Passed: ${results.passed}`);
  console.info(`⚠️  Warnings: ${results.warnings}`);
  console.info(`❌ Failed: ${results.failed}`);
  console.info(`📊 Total: ${results.checks.length} checks`);
  console.info('');

  if (results.failed === 0 && results.warnings === 0) {
    console.info('🎉 All systems operational!');
  } else if (results.failed === 0) {
    console.info('⚠️  System operational with warnings');
  } else {
    console.info('❌ System has critical issues that need attention');
  }

  console.info('');
  console.info('💡 TIP: Run this check periodically to monitor system health');
  console.info('');

  return results;
}

// Make it globally available
if (typeof window !== 'undefined') {
  (window as any).runSystemHealthCheck = runSystemHealthCheck;
  console.info('🏥 System Health Check loaded! Run `runSystemHealthCheck()` in console');
}
