import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { figmaAssetsPlugin } from './vite-plugin-figma-assets'

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
    // Handle figma:asset imports in VS Code (auto-disables in Figma Make)
    figmaAssetsPlugin({
      fallbackImage: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop',
      debug: false, // Set to true to see plugin activity
    }),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },
  // ✅ FIXED: Force dependency optimization on startup to prevent reload
  optimizeDeps: {
    // Force pre-optimization on startup
    force: true, // ✅ CRITICAL v2.0: Force rebuild to clear maintenanceGuard.ts cache
    // Include ALL dependencies to prevent runtime discovery
    include: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'react-router', // ✅ FIXED v17.2: Only react-router (v7), NOT react-router-dom
      '@supabase/supabase-js',
      'lucide-react',
      'sonner',
      'motion/react',
      'date-fns',
      'clsx',
      'tailwind-merge',
      'class-variance-authority',
      // Radix UI components
      '@radix-ui/react-tabs',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-label',
      '@radix-ui/react-slot',
      '@radix-ui/react-separator',
      '@radix-ui/react-avatar',
      '@radix-ui/react-accordion',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-popover',
      '@radix-ui/react-progress',
      '@radix-ui/react-radio-group',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-switch',
      '@radix-ui/react-toggle',
      '@radix-ui/react-tooltip',
      '@radix-ui/react-aspect-ratio',
      '@radix-ui/react-collapsible',
      '@radix-ui/react-context-menu',
      '@radix-ui/react-hover-card',
      '@radix-ui/react-menubar',
      '@radix-ui/react-navigation-menu',
      '@radix-ui/react-slider',
      '@radix-ui/react-toggle-group',
      // Embla Carousel - ✅ CRITICAL: Add these to prevent reload!
      'embla-carousel-react',
      'embla-carousel-autoplay',
      // Other dependencies
      'react-hook-form',
      'input-otp',
      'cmdk',
      'vaul',
      'qrcode.react',
      '@emailjs/browser',
      'react-day-picker',
      'next-themes',
    ],
    // Exclude Vite internals
    exclude: ['@vite/client', '@vite/env'],
  },
  // Optimize for dynamic imports
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined, // Let Vite handle chunking automatically
      },
    },
  },
  // ✅ FIXED: Disable dependency discovery in development
  server: {
    fs: {
      strict: false,
    },
    // ✅ NEW v17.1: Force no-cache headers in development to prevent stale code issues
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  },
})