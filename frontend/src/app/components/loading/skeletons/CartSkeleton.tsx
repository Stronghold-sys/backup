import { Skeleton } from '@/app/components/ui/skeleton';
import { Card } from '@/app/components/ui/card';

/**
 * Skeleton untuk item di keranjang
 */
export function CartItemSkeleton() {
  return (
    <Card className="p-4">
      <div className="flex gap-4">
        {/* Checkbox skeleton */}
        <Skeleton className="h-5 w-5 rounded" />
        
        {/* Image skeleton */}
        <Skeleton className="h-20 w-20 rounded" />
        
        {/* Content skeleton */}
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-5 w-24" />
          <div className="flex items-center justify-between mt-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      </div>
    </Card>
  );
}

/**
 * Skeleton untuk halaman keranjang lengkap
 */
export function CartPageSkeleton() {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cart items skeleton */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-6 w-32" />
          </div>
          {[1, 2, 3].map((i) => (
            <CartItemSkeleton key={i} />
          ))}
        </div>

        {/* Summary skeleton */}
        <div className="lg:col-span-1">
          <Card className="p-6 space-y-4 sticky top-4">
            <Skeleton className="h-6 w-40" />
            <div className="space-y-3">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
            <Skeleton className="h-px w-full" />
            <div className="flex justify-between">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-24" />
            </div>
            <Skeleton className="h-12 w-full" />
          </Card>
        </div>
      </div>
    </div>
  );
}
