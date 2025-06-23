import React from 'react';
import { Box, CircularProgress, Typography, Skeleton } from '@mui/material';

interface LoadingSpinnerProps {
  message?: string;
  size?: number;
  variant?: 'circular' | 'skeleton';
  skeletonProps?: {
    width?: string | number;
    height?: string | number;
    lines?: number;
  };
  minHeight?: string | number;
  fullWidth?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  message = '読み込み中...', 
  size = 40,
  variant = 'circular',
  skeletonProps = {},
  minHeight = '200px',
  fullWidth = false,
}) => {
  if (variant === 'skeleton') {
    const { width = '100%', height = 40, lines = 3 } = skeletonProps;
    
    return (
      <Box
        sx={{
          width: fullWidth ? '100%' : 'auto',
          minHeight,
          p: 2,
        }}
      >
        {Array.from({ length: lines }).map((_, index) => (
          <Skeleton
            key={index}
            variant="text"
            width={index === lines - 1 ? '80%' : width}
            height={height}
            sx={{ mb: 1 }}
          />
        ))}
      </Box>
    );
  }

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight={minHeight}
      gap={2}
      width={fullWidth ? '100%' : 'auto'}
    >
      <CircularProgress size={size} />
      {message && (
        <Typography variant="body2" color="text.secondary" textAlign="center">
          {message}
        </Typography>
      )}
    </Box>
  );
};

export default LoadingSpinner;
export { LoadingSpinner };