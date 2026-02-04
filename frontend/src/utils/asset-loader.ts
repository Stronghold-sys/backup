/**
 * ================================================================
 * ENVIRONMENT-AWARE ASSET LOADER
 * ================================================================
 * 
 * Automatically handles asset imports for both environments:
 * - Figma Make: Uses figma:asset virtual module
 * - VS Code: Uses fallback placeholder images
 * 
 * Usage:
 * import { loadAsset } from '@/utils/asset-loader';
 * const image = loadAsset('figma:asset/abc123.png', '/placeholder.png');
 */

/**
 * Detect if running in Figma Make environment
 */
export const isFigmaMakeEnvironment = (): boolean => {
  // Check if we're in Figma Make by looking for specific env variables
  return (
    import.meta.env.VITE_FIGMA_MAKE === 'true' ||
    window.location.hostname.includes('figma') ||
    // Check if figma:asset imports are supported
    typeof (import.meta as any).glob === 'function'
  );
};

/**
 * Load asset with environment detection
 * @param figmaAssetPath - Path for Figma Make (e.g., 'figma:asset/abc123.png')
 * @param fallbackPath - Path for VS Code (e.g., '/placeholder.png' or URL)
 * @returns Asset URL string
 */
export const loadAsset = (
  figmaAssetPath: string,
  fallbackPath: string = '/placeholder.png'
): string => {
  // In VS Code, always use fallback
  if (!isFigmaMakeEnvironment()) {
    return fallbackPath;
  }

  // In Figma Make, try to use figma:asset
  // This is handled by Vite's virtual module system
  return figmaAssetPath;
};

/**
 * Preload multiple assets
 */
export const loadAssets = (
  assets: Array<{ figma: string; fallback: string }>
): Record<string, string> => {
  return assets.reduce((acc, asset, index) => {
    acc[`asset_${index}`] = loadAsset(asset.figma, asset.fallback);
    return acc;
  }, {} as Record<string, string>);
};

/**
 * Asset configuration type
 */
export interface AssetConfig {
  figmaAsset?: string;
  fallbackUrl?: string;
  alt?: string;
}

/**
 * Get asset URL with config object
 */
export const getAssetUrl = (config: AssetConfig): string => {
  return loadAsset(
    config.figmaAsset || '',
    config.fallbackUrl || '/placeholder.png'
  );
};

/**
 * Common placeholders for different asset types
 */
export const PLACEHOLDER_IMAGES = {
  product: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop',
  avatar: 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=200&h=200&fit=crop',
  banner: 'https://images.unsplash.com/photo-1557821552-17105176677c?w=1200&h=400&fit=crop',
  logo: '/logo.svg',
  icon: '/icon.svg',
} as const;

/**
 * Helper to get typed placeholder
 */
export const getPlaceholder = (
  type: keyof typeof PLACEHOLDER_IMAGES
): string => {
  return PLACEHOLDER_IMAGES[type];
};
