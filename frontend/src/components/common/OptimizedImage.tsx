import React, { useState, useRef, useEffect } from 'react';
import { Box, Skeleton } from '@mui/material';
import { styled } from '@mui/material/styles';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number | string;
  height?: number | string;
  className?: string;
  lazy?: boolean;
  webpSupport?: boolean;
  quality?: number;
  blur?: boolean;
  onLoad?: () => void;
  onError?: () => void;
}

const ImageContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  overflow: 'hidden',
  backgroundColor: theme.palette.grey[100],
  
  '& img': {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transition: 'opacity 0.3s ease-in-out, filter 0.3s ease-in-out',
  },
}));

const BlurredImage = styled('img')<{ $loaded: boolean; $blur: boolean }>(
  ({ $loaded, $blur }) => ({
    filter: $blur && !$loaded ? 'blur(10px)' : 'none',
    opacity: $loaded ? 1 : 0,
    transform: $loaded ? 'scale(1)' : 'scale(1.1)',
  })
);

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  className,
  lazy = true,
  webpSupport = true,
  quality = 80,
  blur = true,
  onLoad,
  onError,
}) => {
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(!lazy);
  const [error, setError] = useState(false);
  const [webpUrl, setWebpUrl] = useState<string>('');
  const imgRef = useRef<HTMLImageElement>(null);

  // Check WebP support
  useEffect(() => {
    if (!webpSupport) return;

    const checkWebPSupport = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    };

    if (checkWebPSupport()) {
      // Convert URL to WebP if supported
      const convertToWebP = (url: string) => {
        // This is a simplified example - in a real app, you'd use a service like Cloudinary
        if (url.includes('cloudinary.com')) {
          return url.replace(/\.(jpg|jpeg|png)/, '.webp').replace(/q_\d+/, `q_${quality}`);
        }
        return url;
      };
      
      setWebpUrl(convertToWebP(src));
    }
  }, [src, webpSupport, quality]);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || inView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px',
        threshold: 0.1,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [lazy, inView]);

  const handleLoad = () => {
    setLoaded(true);
    setError(false);
    onLoad?.();
  };

  const handleError = () => {
    setError(true);
    setLoaded(false);
    onError?.();
  };

  const imageSrc = webpUrl || src;

  return (
    <ImageContainer
      ref={imgRef}
      className={className}
      sx={{
        width: width || '100%',
        height: height || 'auto',
        aspectRatio: width && height ? `${width}/${height}` : undefined,
      }}
    >
      {/* Loading skeleton */}
      {!loaded && !error && (
        <Skeleton
          variant="rectangular"
          width="100%"
          height="100%"
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: 1,
          }}
        />
      )}

      {/* Error placeholder */}
      {error && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'grey.200',
            color: 'text.secondary',
            fontSize: '14px',
          }}
        >
          画像を読み込めませんでした
        </Box>
      )}

      {/* Actual image */}
      {inView && (
        <>
          {/* Low quality placeholder for blur effect */}
          {blur && !loaded && (
            <img
              src={`${imageSrc}?w=20&q=10`} // Very low quality placeholder
              alt=""
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                filter: 'blur(10px)',
                transform: 'scale(1.1)',
              }}
            />
          )}

          {/* Main image */}
          <BlurredImage
            src={imageSrc}
            alt={alt}
            $loaded={loaded}
            $blur={blur}
            onLoad={handleLoad}
            onError={handleError}
            loading={lazy ? 'lazy' : 'eager'}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
            }}
          />
        </>
      )}
    </ImageContainer>
  );
};