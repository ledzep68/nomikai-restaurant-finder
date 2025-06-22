import React, { useState, useRef, useEffect } from 'react';
import { Box, Skeleton } from '@mui/material';
import { Restaurant as RestaurantIcon } from '@mui/icons-material';

interface LazyImageProps {
  src?: string;
  alt: string;
  width?: number | string;
  height?: number | string;
  fallbackSrc?: string;
  placeholder?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onLoad?: () => void;
  onError?: () => void;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  width = '100%',
  height = 200,
  fallbackSrc,
  placeholder,
  className,
  style,
  onLoad,
  onError,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleImageLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleImageError = () => {
    setIsError(true);
    onError?.();
  };

  const getImageSrc = () => {
    if (!src || isError) {
      // フォールバック画像がない場合はプレースホルダー用のdata URLを使用
      return fallbackSrc || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+CiAgPHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzk5OTk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuODrOOCueODiOODqeODs+eUu+WDhzwvdGV4dD4KPC9zdmc+';
    }
    return src;
  };

  const defaultPlaceholder = (
    <Box
      sx={{
        width,
        height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'grey.100',
        color: 'grey.400',
      }}
    >
      <RestaurantIcon sx={{ fontSize: 40 }} />
    </Box>
  );

  return (
    <Box
      ref={containerRef}
      className={className}
      style={style}
      sx={{
        width,
        height,
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 1,
      }}
    >
      {!isInView ? (
        <Skeleton
          variant="rectangular"
          width={width}
          height={height}
          animation="wave"
        />
      ) : (
        <>
          {!isLoaded && (placeholder || defaultPlaceholder)}
          <Box
            component="img"
            ref={imgRef}
            src={getImageSrc()}
            alt={alt}
            onLoad={handleImageLoad}
            onError={handleImageError}
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: isLoaded ? 1 : 0,
              transition: 'opacity 0.3s ease-in-out',
              position: isLoaded ? 'static' : 'absolute',
              top: 0,
              left: 0,
            }}
          />
        </>
      )}
    </Box>
  );
};