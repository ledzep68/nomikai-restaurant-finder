import React, { useState, useEffect } from 'react';
import {
  Snackbar,
  Alert,
  AlertTitle,
  Button,
  Box,
  Typography,
  IconButton,
  Collapse,
  LinearProgress,
} from '@mui/material';
import {
  Close,
  WifiOff,
  Refresh,
  ExpandMore,
  ExpandLess,
  SignalWifiStatusbarConnectedNoInternet4,
} from '@mui/icons-material';

interface NetworkErrorHandlerProps {
  /** エラー状態 */
  error?: Error | null;
  /** エラーをクリアする関数 */
  onClearError?: () => void;
  /** リトライ関数 */
  onRetry?: () => void;
  /** リトライ中状態 */
  isRetrying?: boolean;
}

export const NetworkErrorHandler: React.FC<NetworkErrorHandlerProps> = ({
  error,
  onClearError,
  onRetry,
  isRetrying = false,
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showDetails, setShowDetails] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [autoRetryTimer, setAutoRetryTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (error && onRetry) {
        // オンラインに戻ったら自動でリトライ
        setTimeout(() => {
          onRetry();
        }, 1000);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (autoRetryTimer) {
        clearTimeout(autoRetryTimer);
      }
    };
  }, [error, onRetry, autoRetryTimer]);

  const getErrorType = (error: Error): 'network' | 'timeout' | 'server' | 'client' | 'unknown' => {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch') || !isOnline) {
      return 'network';
    }
    if (message.includes('timeout') || message.includes('aborted')) {
      return 'timeout';
    }
    if (message.includes('500') || message.includes('503') || message.includes('502')) {
      return 'server';
    }
    if (message.includes('400') || message.includes('401') || message.includes('403') || message.includes('404')) {
      return 'client';
    }
    
    return 'unknown';
  };

  const getErrorIcon = (type: string) => {
    switch (type) {
      case 'network':
        return isOnline ? <SignalWifiStatusbarConnectedNoInternet4 /> : <WifiOff />;
      case 'timeout':
        return <Refresh />;
      case 'server':
        return <SignalWifiStatusbarConnectedNoInternet4 />;
      default:
        return <WifiOff />;
    }
  };

  const getErrorMessage = (type: string): { title: string; description: string } => {
    switch (type) {
      case 'network':
        return {
          title: isOnline ? 'ネットワーク接続エラー' : 'インターネット接続がありません',
          description: isOnline 
            ? 'サーバーに接続できません。しばらく待ってから再試行してください。'
            : 'インターネット接続を確認してから再試行してください。',
        };
      case 'timeout':
        return {
          title: 'タイムアウトエラー',
          description: 'リクエストがタイムアウトしました。ネットワーク状況を確認して再試行してください。',
        };
      case 'server':
        return {
          title: 'サーバーエラー',
          description: 'サーバーで問題が発生しています。しばらく時間をおいて再試行してください。',
        };
      case 'client':
        return {
          title: 'リクエストエラー',
          description: 'リクエストに問題があります。ページを再読み込みして再試行してください。',
        };
      default:
        return {
          title: '接続エラー',
          description: '予期しないエラーが発生しました。再試行してください。',
        };
    }
  };

  const handleRetry = () => {
    if (onRetry) {
      setRetryCount(prev => prev + 1);
      onRetry();
    }
  };

  const handleAutoRetry = () => {
    if (retryCount < 3) {
      const delay = Math.min(1000 * Math.pow(2, retryCount), 10000); // 指数バックオフ
      const timer = setTimeout(() => {
        handleRetry();
      }, delay);
      setAutoRetryTimer(timer);
    }
  };

  if (!error) {
    // オンライン状態の通知
    return (
      <Snackbar
        open={!isOnline}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          severity="warning" 
          icon={<WifiOff />}
          sx={{ width: '100%' }}
        >
          <AlertTitle>オフライン</AlertTitle>
          インターネット接続がありません
        </Alert>
      </Snackbar>
    );
  }

  const errorType = getErrorType(error);
  const errorMessage = getErrorMessage(errorType);

  return (
    <Snackbar
      open={!!error}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      sx={{ maxWidth: '600px' }}
    >
      <Alert
        severity="error"
        icon={getErrorIcon(errorType)}
        sx={{ width: '100%' }}
        action={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton
              size="small"
              onClick={() => setShowDetails(!showDetails)}
              sx={{ color: 'inherit' }}
            >
              {showDetails ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
            <IconButton
              size="small"
              onClick={onClearError}
              sx={{ color: 'inherit' }}
            >
              <Close />
            </IconButton>
          </Box>
        }
      >
        <AlertTitle>{errorMessage.title}</AlertTitle>
        <Typography variant="body2" sx={{ mb: 1 }}>
          {errorMessage.description}
        </Typography>

        {isRetrying && (
          <Box sx={{ mb: 1 }}>
            <LinearProgress />
            <Typography variant="caption" sx={{ mt: 0.5, display: 'block' }}>
              再試行中...
            </Typography>
          </Box>
        )}

        <Collapse in={showDetails}>
          <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary">
              エラー詳細: {error.message}
            </Typography>
            {retryCount > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                再試行回数: {retryCount}
              </Typography>
            )}
          </Box>
        </Collapse>

        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
          <Button
            size="small"
            variant="outlined"
            onClick={handleRetry}
            disabled={isRetrying}
            startIcon={<Refresh />}
            sx={{ 
              color: 'inherit', 
              borderColor: 'currentColor',
              '&:hover': {
                borderColor: 'currentColor',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              }
            }}
          >
            再試行
          </Button>
          
          {retryCount < 3 && !isRetrying && (
            <Button
              size="small"
              variant="text"
              onClick={handleAutoRetry}
              sx={{ color: 'inherit' }}
            >
              自動再試行
            </Button>
          )}
        </Box>
      </Alert>
    </Snackbar>
  );
};

// ネットワークエラーハンドリングのHook
export const useNetworkErrorHandler = () => {
  const [error, setError] = useState<Error | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleError = (err: Error) => {
    setError(err);
    setIsRetrying(false);
  };

  const clearError = () => {
    setError(null);
    setIsRetrying(false);
  };

  const retry = async (retryFn: () => Promise<void>) => {
    setIsRetrying(true);
    try {
      await retryFn();
      clearError();
    } catch (err) {
      handleError(err as Error);
    } finally {
      setIsRetrying(false);
    }
  };

  return {
    error,
    isRetrying,
    handleError,
    clearError,
    retry,
  };
};