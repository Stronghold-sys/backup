import '@/disableConsole';

import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router';
import { Toaster } from 'sonner';
import { useAuthStore } from '@/lib/store';
import { useProducts } from '@/lib/useProducts';
import { useAuthListener } from '@/lib/useAuthListener';
import { useRealTimeSync } from '@/lib/unifiedRealTimeSync'; // ✅ FIXED: Use unified version
import { projectId, publicAnonKey } from '/utils/supabase/info';
import logger from '@/lib/logger';
import { useMaintenanceSync } from '@/lib/maintenanceSync';
import { GlobalNetworkStatus } from '@/app/components/network/GlobalNetworkStatus';
import { SafePageTransitionBar } from '@/app/components/SafePageTransition';
import { PageLoader } from '@/app/components/loading/PageLoader';
import SplashScreen from '@/app/components/SplashScreen'; // ✅ ADDED: Splash screen import

// Lazy load pages
const HomePage = lazy(() => import('@/app/pages/HomePage'));
const TestPage = lazy(() => import('@/app/pages/TestPage'));
const MinimalTest = lazy(() => import('@/app/pages/MinimalTest')); // ✅ NEW: Minimal test page
const ProductsPage = lazy(() => import('@/app/pages/ProductsPage'));
const ProductDetailPage = lazy(() => import('@/app/pages/ProductDetailPage'));
const CartPage = lazy(() => import('@/app/pages/CartPage'));
const CheckoutPage = lazy(() => import('@/app/pages/CheckoutPage'));
const OrdersPage = lazy(() => import('@/app/pages/OrdersPage'));
const OrderDetailPage = lazy(() => import('@/app/pages/OrderDetailPage'));
const RefundRequestPage = lazy(() => import('@/app/pages/RefundRequestPage'));
const ProfilePage = lazy(() => import('@/app/pages/ProfilePage'));
const LoginPage = lazy(() => import('@/app/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/app/pages/RegisterPage'));
const VerifyEmailPage = lazy(() => import('@/app/pages/VerifyEmailPage'));
const ForgotPasswordPage = lazy(() => import('@/app/pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/app/pages/ResetPasswordPage'));
const NotificationsPage = lazy(() => import('@/app/pages/NotificationsPage'));
const TermsAndConditions = lazy(() => import('@/app/pages/TermsAndConditions'));
const PrivacyPolicy = lazy(() => import('@/app/pages/PrivacyPolicy'));
const SystemTestPage = lazy(() => import('@/app/pages/SystemTestPage')); // ✅ NEW: System test page
const ChatPage = lazy(() => import('@/app/pages/ChatPage'));
const PaymentStatusPage = lazy(() => import('@/app/pages/PaymentStatusPage'));

// User Refund Pages
const UserRefundsPage = lazy(() => import('@/app/components/user/UserRefundsPage'));
const CreateRefundPage = lazy(() => import('@/app/components/user/CreateRefundPage'));

// Admin Pages
const AdminDashboard = lazy(() => import('@/app/pages/admin/AdminDashboard'));
const AdminProducts = lazy(() => import('@/app/pages/admin/AdminProducts'));
const AdminOrders = lazy(() => import('@/app/pages/admin/AdminOrders'));
const AdminUsers = lazy(() => import('@/app/pages/admin/AdminUsers'));
const AdminRefunds = lazy(() => import('@/app/pages/admin/AdminRefunds'));
const AdminCategories = lazy(() => import('@/app/pages/admin/AdminCategories'));
const AdminVouchers = lazy(() => import('@/app/pages/admin/AdminVouchers'));
const AdminFlashSale = lazy(() => import('@/app/pages/admin/AdminFlashSale'));
const AdminSettings = lazy(() => import('@/app/pages/admin/AdminSettings'));
const AdminReports = lazy(() => import('@/app/pages/admin/AdminReports'));
const AdminChat = lazy(() => import('@/app/pages/admin/AdminChat'));
const AdminProfile = lazy(() => import('@/app/pages/admin/AdminProfile'));
const AdminResetData = lazy(() => import('@/app/pages/admin/AdminResetData'));
const RefundDebugPage = lazy(() => import('@/app/pages/RefundDebugPage')); // ✅ NEW: Refund debug tool

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const location = useLocation();
  const { isAuthenticated, user, accessToken } = useAuthStore();

  // ✅ FIX v16.8: SIMPLIFIED - No async checks, just trust the store
  // useAuthListener already handles session restoration
  logger.debug('[ProtectedRoute] Auth check:', {
    path: location.pathname,
    isAuthenticated,
    hasUser: !!user,
    hasToken: !!accessToken,
    userRole: user?.role,
  });

  // ✅ Simple synchronous check - no loading, no async
  if (!isAuthenticated || !user || !accessToken) {
    logger.info('[ProtectedRoute] No session found, redirecting to login page');
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // ✅ Check admin access
  if (adminOnly && user?.role !== 'admin') {
    logger.info('[ProtectedRoute] Non-admin user accessing admin route, redirecting to home');
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

// ✅ Track app load time for initialization phase detection
if (typeof window !== 'undefined' && !(window as any).__appLoadTime) {
  (window as any).__appLoadTime = Date.now();
}

// ✅ NEW: Router-dependent components wrapper
// This ensures all components that use router hooks are inside BrowserRouter
function RouterDependentComponents() {
  return (
    <>
      {/* Global Network Status Monitor */}
      <GlobalNetworkStatus />

      {/* Page Transition Loading Bar - Using Safe wrapper to prevent SSR errors */}
      <SafePageTransitionBar />
    </>
  );
}

export default function App() {
  const { restoreSession } = useAuthStore();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isRestoringSession, setIsRestoringSession] = useState(true); // ✅ NEW: Track session restore
  const [showSplash, setShowSplash] = useState(true); // ✅ NEW: Track splash screen visibility

  //  CRITICAL: Initialize auth state listener to monitor session changes
  useAuthListener();

  // ✅ CRITICAL: Initialize unified real-time sync for ALL features
  useRealTimeSync();

  // ✅ NEW: Initialize maintenance mode real-time sync
  useMaintenanceSync();

  // CRITICAL: Load products MUST be called before any conditional returns
  // to maintain consistent hook order across renders
  const { reloadProducts } = useProducts();

  // ✅ CRITICAL: Restore session from Supabase Auth on app init - SYNCHRONOUS
  useEffect(() => {
    const doRestore = async () => {
      logger.debug('App.tsx: Attempting to restore session from Supabase Auth...');

      // ✅ OPTIMIZED: Add timeout to prevent hanging
      const timeoutPromise = new Promise<boolean>((resolve) => {
        setTimeout(() => {
          logger.warn('⏱️ App.tsx: Session restore timeout after 3s, continuing anyway...');
          resolve(false);
        }, 3000); // 3 second timeout
      });

      const restorePromise = restoreSession();

      // Race between restore and timeout
      const success = await Promise.race([restorePromise, timeoutPromise]);

      if (success) {
        logger.info('App.tsx: Session restored successfully from Supabase Auth');
      } else {
        logger.info('App.tsx: No active Supabase session found (user needs to login)');
      }

      // ✅ FIXED v18.1: Wait for actual restore completion, not fixed timeout
      // This prevents race condition where routes render before session is restored
      setIsRestoringSession(false);
    };

    doRestore();
  }, []); // Run only once on mount

  // ✅ Auto-initialize backend on first load - USE SESSIONSTORAGE
  useEffect(() => {
    const initializeBackend = async () => {
      // ✅ FIXED: Use sessionStorage instead of in-memory (survives page refresh but not browser close)
      const hasInitialized = sessionStorage.getItem('backend_initialized');

      if (hasInitialized === 'true') {
        logger.debug('Backend already initialized in this browser session');
        setIsInitialized(true);
        return;
      }

      logger.info('First time load - Initializing backend...');

      try {
        // ✅ OPTIMIZED: Add timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
        }, 5000); // 5 second timeout

        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-adb995ba/init`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json',
            },
            signal: controller.signal,
          }
        );

        clearTimeout(timeoutId);

        const data = await response.json();

        if (data.success) {
          logger.info('Backend initialized successfully!');

          // ✅ Store flag in sessionStorage (survives page refresh but not browser close)
          sessionStorage.setItem('backend_initialized', 'true');
          setIsInitialized(true);

          // Reload products after initialization
          setTimeout(() => {
            logger.debug('Auto-loading products...');
            reloadProducts();
          }, 1000);
        } else {
          logger.error('Backend initialization failed:', data.error);
          sessionStorage.setItem('backend_initialized', 'true'); // Mark as attempted
          setIsInitialized(true); // Continue anyway
        }
      } catch (error: any) {
        // ✅ FIXED: Handle AbortError gracefully without logging it as error
        if (error.name === 'AbortError') {
          logger.info('⏱️ Backend init timeout after 5s, continuing anyway...');
        } else {
          logger.error('Error initializing backend:', error.message);
        }
        sessionStorage.setItem('backend_initialized', 'true'); // Mark as attempted
        setIsInitialized(true); // Continue anyway
      }
    };

    initializeBackend();
    // ✅ FIXED: Only run once on mount, remove reloadProducts and isInitialized from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ✅ Empty array = run only once on mount

  // ✅ REMOVED: Invalid session check that was causing unnecessary logouts
  // The auth listener now handles session validation properly

  // ✅ NEW: Show splash screen on first load
  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  // ✅ NEW: Show minimal loader while restoring session (only for ~100-300ms)
  if (isRestoringSession) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-orange-50 to-pink-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <RouterDependentComponents />

      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/test" element={<TestPage />} />
          <Route path="/minimal-test" element={<MinimalTest />} /> {/* ✅ NEW: Minimal test page */}
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/system-test" element={<SystemTestPage />} /> {/* ✅ NEW: System test page */}

          {/* Protected User Routes */}
          <Route
            path="/cart"
            element={
              <ProtectedRoute>
                <CartPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/checkout"
            element={
              <ProtectedRoute>
                <CheckoutPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <OrdersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders/:id"
            element={
              <ProtectedRoute>
                <OrderDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders/:orderId/refund-request"
            element={
              <ProtectedRoute>
                <RefundRequestPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/refund-request/:orderId"
            element={
              <ProtectedRoute>
                <RefundRequestPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <ChatPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <NotificationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payment-status"
            element={
              <ProtectedRoute>
                <PaymentStatusPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user-refunds"
            element={
              <ProtectedRoute>
                <UserRefundsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/create-refund"
            element={
              <ProtectedRoute>
                <CreateRefundPage />
              </ProtectedRoute>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/products"
            element={
              <ProtectedRoute adminOnly>
                <AdminProducts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/orders"
            element={
              <ProtectedRoute adminOnly>
                <AdminOrders />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute adminOnly>
                <AdminUsers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/refunds"
            element={
              <ProtectedRoute adminOnly>
                <AdminRefunds />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/categories"
            element={
              <ProtectedRoute adminOnly>
                <AdminCategories />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/vouchers"
            element={
              <ProtectedRoute adminOnly>
                <AdminVouchers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/flash-sale"
            element={
              <ProtectedRoute adminOnly>
                <AdminFlashSale />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute adminOnly>
                <AdminSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <ProtectedRoute adminOnly>
                <AdminReports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/chat"
            element={
              <ProtectedRoute adminOnly>
                <AdminChat />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/profile"
            element={
              <ProtectedRoute adminOnly>
                <AdminProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/reset-data"
            element={
              <ProtectedRoute adminOnly>
                <AdminResetData />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/refund-debug"
            element={
              <ProtectedRoute adminOnly>
                <RefundDebugPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Suspense>
      <Toaster position="top-center" richColors />
    </BrowserRouter>
  );
}