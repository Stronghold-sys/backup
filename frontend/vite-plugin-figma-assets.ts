/**
 * ================================================================
 * VITE PLUGIN: FIGMA ASSETS COMPATIBILITY
 * ================================================================
 * 
 * This plugin handles figma:asset imports in VS Code environment
 * by replacing them with placeholder images from Unsplash
 * 
 * IMPORTANT: Only activates in non-Figma Make environments
 */

import type { Plugin } from 'vite';

interface FigmaAssetPluginOptions {
  /**
   * Placeholder image for unknown assets
   */
  fallbackImage?: string;
  
  /**
   * Enable debug logging
   */
  debug?: boolean;
}

/**
 * Detect if running in Figma Make environment
 */
function isFigmaMakeEnvironment(): boolean {
  // Check if we're in Figma Make by looking at hostname or env vars
  return (
    process.env.FIGMA_MAKE === 'true' ||
    process.env.NODE_ENV === 'figma-make' ||
    // Check if figma-specific env vars exist
    typeof process.env.VITE_FIGMA_PROJECT_ID !== 'undefined'
  );
}

export function figmaAssetsPlugin(
  options: FigmaAssetPluginOptions = {}
): Plugin {
  const {
    fallbackImage = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop',
    debug = false,
  } = options;

  // If in Figma Make, disable the plugin completely
  const isFigma = isFigmaMakeEnvironment();
  
  if (isFigma && debug) {
    console.log('[figma-assets] Running in Figma Make - plugin disabled');
  }

  return {
    name: 'vite-plugin-figma-assets',
    
    enforce: 'pre',
    
    resolveId(id: string) {
      // Skip if in Figma Make environment
      if (isFigma) {
        return null;
      }
      
      // Handle figma:asset imports
      if (id.startsWith('figma:asset/')) {
        if (debug) {
          console.log(`[figma-assets] Intercepting: ${id}`);
        }
        // Return a virtual module ID
        return `\0figma-asset:${id}`;
      }
      return null;
    },
    
    load(id: string) {
      // Skip if in Figma Make environment
      if (isFigma) {
        return null;
      }
      
      // Load virtual module
      if (id.startsWith('\0figma-asset:')) {
        const assetPath = id.replace('\0figma-asset:figma:asset/', '');
        
        if (debug) {
          console.log(`[figma-assets] Loading virtual module for: ${assetPath}`);
        }
        
        // Return the fallback image URL as the module's default export
        return `export default "${fallbackImage}";`;
      }
      return null;
    },
    
    transform(code: string, id: string) {
      // Skip if in Figma Make environment
      if (isFigma) {
        return null;
      }
      
      // Only process .tsx and .ts files
      if (!id.endsWith('.tsx') && !id.endsWith('.ts')) {
        return null;
      }
      
      // Skip node_modules
      if (id.includes('node_modules')) {
        return null;
      }
      
      // Skip if no figma:asset imports
      if (!code.includes('figma:asset')) {
        return null;
      }
      
      // Find all figma:asset imports
      const figmaAssetRegex = /import\s+(\w+)\s+from\s+['"]figma:asset\/([^'"]+)['"]/g;
      
      let hasChanges = false;
      const newCode = code.replace(figmaAssetRegex, (match, varName, assetPath) => {
        hasChanges = true;
        
        if (debug) {
          console.log(`[figma-assets] Transforming import in ${id}: ${varName} from ${assetPath}`);
        }
        
        // Replace with inline constant
        return `const ${varName} = "${fallbackImage}"; // Replaced figma:asset/${assetPath}`;
      });
      
      if (hasChanges) {
        return {
          code: newCode,
          map: null,
        };
      }
      
      return null;
    },
  };
}

/**
 * Default export for convenience
 */
export default figmaAssetsPlugin;