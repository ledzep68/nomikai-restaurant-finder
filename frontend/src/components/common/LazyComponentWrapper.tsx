import React, { Suspense } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import ErrorBoundary from './ErrorBoundary';

interface LazyComponentWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  minHeight?: string | number;
}

const DefaultFallback: React.FC = () => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 200,
      gap: 2,
    }}
  >
    <CircularProgress size={40} />
    <Typography variant="body2" color="text.secondary">
      読み込み中...
    </Typography>
  </Box>
);

export const LazyComponentWrapper: React.FC<LazyComponentWrapperProps> = ({
  children,
  fallback,
  minHeight,
}) => {
  return (
    <ErrorBoundary>
      <Suspense fallback={fallback || <DefaultFallback />}>
        <Box sx={{ minHeight }}>
          {children}
        </Box>
      </Suspense>
    </ErrorBoundary>
  );
};