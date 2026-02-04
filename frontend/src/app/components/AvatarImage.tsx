import { useState, useEffect } from 'react';

interface AvatarImageProps {
  src: string | undefined;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
}

export function AvatarImage({ src, alt, className = '', fallback }: AvatarImageProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setImageError(false);
    setIsLoading(true);
  }, [src]);

  if (!src || imageError) {
    return <>{fallback}</>;
  }

  return (
    <>
      <img
        src={src}
        alt={alt}
        className={className}
        onLoad={() => {
          setIsLoading(false);
        }}
        onError={() => {
          setImageError(true);
          setIsLoading(false);
        }}
        style={{
          display: imageError ? 'none' : 'block',
          opacity: isLoading ? 0.5 : 1,
          transition: 'opacity 0.3s ease-in-out'
        }}
      />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      )}
    </>
  );
}
