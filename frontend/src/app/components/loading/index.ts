/**
 * LOADING COMPONENTS - CENTRALIZED EXPORTS
 * Import all loading components from one place
 */

// Skeleton Loaders
export {
  Skeleton,
  ProductCardSkeleton,
  ProductGridSkeleton,
  ProductDetailSkeleton,
  OrderCardSkeleton,
  OrderListSkeleton,
  TableRowSkeleton,
  TableSkeleton,
  StatsCardSkeleton,
  CartItemSkeleton,
  AddressCardSkeleton,
  ReviewCardSkeleton,
  FormSkeleton,
  RefundCardSkeleton,
  ChatMessageSkeleton,
  SkeletonStyles,
} from '@/app/components/skeleton/SkeletonLoader';

// Loading States
export {
  PageLoadingOverlay,
  SectionLoading,
  InlineLoading,
  ButtonLoading,
  SyncIndicator,
  NetworkStatusBanner,
  OfflineScreen,
  ErrorState,
  EmptyState,
  SlowLoadingWarning,
  SuccessToast,
  ProgressBar,
  PulseDot,
} from './LoadingStates';

// Page Loader (untuk Suspense fallback)
export { PageLoader } from './PageLoader';

// Loading Button
export { LoadingButton } from '@/app/components/ui/loading-button';

// Button Loader (spinner untuk button)
export { ButtonLoader } from './ButtonLoader';

// Action Buttons
export { RefreshButton } from './RefreshButton';
export { ActionButton } from './ActionButton';

// Network Components
export { GlobalNetworkStatus, LoadingBarrier } from '@/app/components/network/GlobalNetworkStatus';

// Hooks
export {
  useNetworkStatus,
  useApiCall,
  useLoadingState,
  useSlowLoadingDetector,
  useDebounce,
  usePolling,
} from '@/lib/useNetworkStatus';