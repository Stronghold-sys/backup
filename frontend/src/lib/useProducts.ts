import { useState, useEffect, useCallback } from 'react';
import { useProductStore, Product } from './store'; // ✅ FIXED: Import from store.ts
import { ProductSync } from './syncManager';

/**
 * Utility function to check if product has valid image
 * Filters out products with placeholder or invalid images
 */
export function hasValidImage(product: Product): boolean {
  const imageUrl = product.images?.[0] || product.image || '';
  
  // Filter out empty images or default placeholder images
  if (!imageUrl || imageUrl.trim() === '') {
    return false;
  }
  
  // Filter out the default Unsplash placeholder image
  if (imageUrl.includes('photo-1505740420928-5e560c06d30e')) {
    return false;
  }
  
  return true;
}

/**
 * Utility function to filter products with valid images
 */
export function filterProductsWithValidImages(products: Product[]): Product[] {
  return products.filter(hasValidImage);
}

/**
 * Custom hook untuk load dan manage products
 * Menggunakan centralized sync manager untuk konsistensi
 */
export function useProducts() {
  const { products, setProducts } = useProductStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedOnMount, setHasLoadedOnMount] = useState(false);

  console.info('🔄 [useProducts] Hook called - products:', products.length, 'hasLoaded:', hasLoadedOnMount);

  const reloadProducts = useCallback(async () => {
    console.info('🔄 [useProducts] Reloading products...');
    setIsLoading(true);
    setError(null);

    try {
      await ProductSync.loadProducts();
      console.info('✅ [useProducts] Products reloaded successfully');
    } catch (err: any) {
      console.error('❌ [useProducts] Error loading products:', err);
      
      // Better error messages
      let errorMessage = 'Error loading products';
      if (err.message.includes('Failed to fetch')) {
        errorMessage = 'Backend server not responding. Please wait for initialization...';
      } else if (err.message.includes('HTTP')) {
        errorMessage = `Server error: ${err.message}`;
      } else {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []); // No dependencies needed - ProductSync is stable

  // ✅ FIX: Auto-load products on mount if empty
  useEffect(() => {
    // Only run once on mount
    if (!hasLoadedOnMount && products.length === 0) {
      console.info('📦 [useProducts] Auto-loading products on mount...');
      setHasLoadedOnMount(true);
      
      // Add small delay to allow backend to initialize
      const timer = setTimeout(() => {
        reloadProducts();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
    // ✅ FIXED: Empty deps to run only once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ✅ Empty array = run only once on mount

  return {
    products,
    isLoading,
    error,
    reloadProducts,
  };
}