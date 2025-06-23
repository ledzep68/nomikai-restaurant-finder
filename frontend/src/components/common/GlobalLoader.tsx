import React, { useEffect, useState } from 'react';
import {
  Backdrop,
  CircularProgress,
  Typography,
  Box,
  Fade,
  LinearProgress,
} from '@mui/material';
import { useAppSelector } from '@store/index';

interface GlobalLoaderProps {
  /** グローバルローディング状態を手動で制御する場合 */
  open?: boolean;
  /** ローディングメッセージ */
  message?: string;
  /** ローディングタイプ */
  variant?: 'circular' | 'linear' | 'determinate';
  /** プログレス値（0-100） */
  progress?: number;
}

export const GlobalLoader: React.FC<GlobalLoaderProps> = ({
  open: forcedOpen,
  message,
  variant = 'circular',
  progress = 0,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');

  // Redux状態からローディング状態を取得
  const searchLoading = useAppSelector((state) => state.search.loading);
  const authLoading = useAppSelector((state) => state.auth.loading);
  
  // グローバルローディング状態の判定
  const isLoading = forcedOpen !== undefined ? forcedOpen : searchLoading || authLoading;

  useEffect(() => {
    if (isLoading) {
      setIsVisible(true);
      setCurrentMessage(message || getLoadingMessage());
    } else {
      // フェードアウト時間を考慮して遅延
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isLoading, message]);

  const getLoadingMessage = (): string => {
    if (searchLoading) return 'レストランを検索中...';
    if (authLoading) return '認証処理中...';
    return '処理中...';
  };

  const renderProgress = () => {
    switch (variant) {
      case 'linear':
        return (
          <Box sx={{ width: '300px', mt: 2 }}>
            <LinearProgress 
              variant={progress > 0 ? 'determinate' : 'indeterminate'} 
              value={progress} 
            />
            {progress > 0 && (
              <Typography variant="caption" sx={{ mt: 1, textAlign: 'center', display: 'block' }}>
                {Math.round(progress)}%
              </Typography>
            )}
          </Box>
        );
      case 'determinate':
        return (
          <Box sx={{ position: 'relative', display: 'inline-flex' }}>
            <CircularProgress
              variant="determinate"
              value={progress}
              size={60}
              thickness={4}
            />
            <Box
              sx={{
                top: 0,
                left: 0,
                bottom: 0,
                right: 0,
                position: 'absolute',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography variant="caption" component="div" color="primary">
                {`${Math.round(progress)}%`}
              </Typography>
            </Box>
          </Box>
        );
      default:
        return <CircularProgress size={60} thickness={4} />;
    }
  };

  return (
    <Backdrop
      sx={{
        color: '#fff',
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(4px)',
      }}
      open={isVisible}
    >
      <Fade in={isLoading} timeout={300}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            p: 4,
            borderRadius: 2,
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}
        >
          {renderProgress()}
          
          {currentMessage && (
            <Typography
              variant="h6"
              sx={{
                textAlign: 'center',
                fontWeight: 500,
                textShadow: '0 1px 3px rgba(0,0,0,0.3)',
              }}
            >
              {currentMessage}
            </Typography>
          )}
        </Box>
      </Fade>
    </Backdrop>
  );
};

// ローディング状態を管理するHook
export const useGlobalLoader = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const [variant, setVariant] = useState<'circular' | 'linear' | 'determinate'>('circular');

  const showLoader = (
    loadingMessage?: string, 
    loaderVariant: 'circular' | 'linear' | 'determinate' = 'circular'
  ) => {
    setIsLoading(true);
    setMessage(loadingMessage || '');
    setVariant(loaderVariant);
    setProgress(0);
  };

  const hideLoader = () => {
    setIsLoading(false);
    setMessage('');
    setProgress(0);
  };

  const updateProgress = (newProgress: number) => {
    setProgress(Math.max(0, Math.min(100, newProgress)));
  };

  const updateMessage = (newMessage: string) => {
    setMessage(newMessage);
  };

  return {
    isLoading,
    message,
    progress,
    variant,
    showLoader,
    hideLoader,
    updateProgress,
    updateMessage,
  };
};