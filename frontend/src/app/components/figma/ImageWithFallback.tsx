import React, { useState } from 'react'
import { Package } from 'lucide-react'

// Better fallback for e-commerce product images
const ERROR_IMG_SRC =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg=='

// Reliable placeholder images for e-commerce
const FALLBACK_IMAGES = [
  'https://placehold.co/500x500/f0f0f0/666666?text=Produk',
  'https://via.placeholder.com/500x500/f0f0f0/666666?text=Produk',
  ERROR_IMG_SRC
]

export function ImageWithFallback(props: React.ImgHTMLAttributes<HTMLImageElement> & { fallbackSrc?: string }) {
  const [didError, setDidError] = useState(false)
  const [fallbackIndex, setFallbackIndex] = useState(0)
  const [retryCount, setRetryCount] = useState(0)

  const handleError = () => {
    // Try to fix common Unsplash URL issues first
    if (retryCount === 0 && src && typeof src === 'string' && src.includes('unsplash.com')) {
      // Retry with updated URL parameters
      const url = new URL(src)
      url.searchParams.set('auto', 'format')
      url.searchParams.set('fit', 'crop')
      url.searchParams.set('q', '80')
      
      const newSrc = url.toString()
      if (newSrc !== src) {
        setRetryCount(1)
        // Force re-render with new URL
        const img = new Image()
        img.onload = () => {
          // Image loaded successfully with new params
          setRetryCount(0)
        }
        img.onerror = () => {
          // Still failed, show fallback
          setDidError(true)
        }
        img.src = newSrc
        return
      }
    }
    
    setDidError(true)
  }

  const { src, alt, style, className, fallbackSrc, ...rest } = props

  // If error occurred, show fallback
  if (didError) {
    const currentFallback = fallbackSrc || FALLBACK_IMAGES[fallbackIndex]
    
    // If it's the last fallback (SVG), show a nice placeholder component
    if (currentFallback === ERROR_IMG_SRC) {
      return (
        <div
          className={`inline-flex items-center justify-center w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 ${className ?? ''}`}
          style={style}
        >
          <div className="flex flex-col items-center justify-center gap-2 text-gray-400">
            <Package className="w-12 h-12" />
            <span className="text-xs">Gambar tidak tersedia</span>
          </div>
        </div>
      )
    }
    
    // Try next fallback if current one fails
    return (
      <img 
        src={currentFallback} 
        alt={alt || "Produk"} 
        className={className} 
        style={style} 
        {...rest} 
        onError={() => {
          if (fallbackIndex < FALLBACK_IMAGES.length - 1) {
            setFallbackIndex(fallbackIndex + 1)
          }
        }}
      />
    )
  }

  return (
    <img src={src} alt={alt} className={className} style={style} {...rest} onError={handleError} />
  )
}