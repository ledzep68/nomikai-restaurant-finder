import { Component, ErrorInfo, ReactNode } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Paper, 
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Chip,
  Stack,
} from '@mui/material';
import { 
  ErrorOutline, 
  Refresh, 
  Home, 
  ExpandMore,
  BugReport,
  Code,
} from '@mui/icons-material';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  level?: 'page' | 'component';
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId?: string;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    const errorId = `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return { 
      hasError: true, 
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({ errorInfo });
    
    // 外部エラーレポートサービスに送信（例：Sentry）
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // ローカルストレージにエラーログを保存
    try {
      const errorLog = {
        timestamp: new Date().toISOString(),
        errorId: this.state.errorId,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        userAgent: navigator.userAgent,
        url: window.location.href,
      };
      
      const existingLogs = JSON.parse(localStorage.getItem('nomikai_error_logs') || '[]');
      const newLogs = [errorLog, ...existingLogs].slice(0, 10); // 最新10件を保持
      localStorage.setItem('nomikai_error_logs', JSON.stringify(newLogs));
    } catch (storageError) {
      console.error('Failed to save error log:', storageError);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  getErrorCategory = (error: Error): string => {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch')) {
      return 'ネットワークエラー';
    }
    if (message.includes('chunk') || message.includes('loading')) {
      return 'リソース読み込みエラー';
    }
    if (message.includes('permission') || message.includes('unauthorized')) {
      return '権限エラー';
    }
    if (message.includes('not found') || message.includes('404')) {
      return 'リソース未発見エラー';
    }
    
    return 'システムエラー';
  };

  getErrorSeverity = (error: Error): 'error' | 'warning' | 'info' => {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('temporary')) {
      return 'warning';
    }
    if (message.includes('chunk') || message.includes('loading')) {
      return 'info';
    }
    
    return 'error';
  };

  render() {
    if (this.state.hasError) {
      // カスタムフォールバックがある場合
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorInfo, errorId } = this.state;
      const isComponentLevel = this.props.level === 'component';
      const errorCategory = error ? this.getErrorCategory(error) : 'システムエラー';
      const severity = error ? this.getErrorSeverity(error) : 'error';

      return (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight={isComponentLevel ? "200px" : "400px"}
          padding={3}
        >
          <Paper 
            elevation={3} 
            sx={{ 
              padding: 4, 
              textAlign: 'center', 
              maxWidth: 600,
              width: '100%',
            }}
          >
            <ErrorOutline 
              color="error" 
              sx={{ fontSize: isComponentLevel ? 48 : 64, mb: 2 }} 
            />
            
            <Typography 
              variant={isComponentLevel ? "h6" : "h5"} 
              component="h2" 
              gutterBottom
            >
              {isComponentLevel ? 'コンポーネントエラー' : 'エラーが発生しました'}
            </Typography>

            <Chip 
              label={errorCategory}
              color={severity}
              icon={<BugReport />}
              sx={{ mb: 2 }}
            />

            <Typography variant="body1" color="text.secondary" paragraph>
              申し訳ございません。予期しないエラーが発生しました。
              {isComponentLevel 
                ? '他の機能は正常に動作します。' 
                : 'ページを再読み込みしてもう一度お試しください。'
              }
            </Typography>

            {errorId && (
              <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
                <Typography variant="caption">
                  エラーID: {errorId}
                </Typography>
              </Alert>
            )}

            <Stack 
              direction={{ xs: 'column', sm: 'row' }} 
              spacing={2} 
              justifyContent="center"
              sx={{ mb: 3 }}
            >
              {isComponentLevel ? (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={this.handleRetry}
                  startIcon={<Refresh />}
                >
                  再試行
                </Button>
              ) : (
                <>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={this.handleReload}
                    startIcon={<Refresh />}
                  >
                    ページを再読み込み
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={this.handleGoHome}
                    startIcon={<Home />}
                  >
                    ホームに戻る
                  </Button>
                </>
              )}
            </Stack>

            {/* 開発環境でのみエラー詳細を表示 */}
            {process.env.NODE_ENV === 'development' && error && (
              <Accordion sx={{ mt: 2, textAlign: 'left' }}>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Code fontSize="small" />
                    <Typography variant="subtitle2">
                      開発者向け情報
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        エラーメッセージ:
                      </Typography>
                      <Typography 
                        variant="body2" 
                        color="error" 
                        sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
                      >
                        {error.message}
                      </Typography>
                    </Box>
                    
                    {error.stack && (
                      <Box>
                        <Typography variant="subtitle2" gutterBottom>
                          スタックトレース:
                        </Typography>
                        <Typography 
                          variant="body2" 
                          color="error" 
                          sx={{ 
                            fontFamily: 'monospace', 
                            fontSize: '0.75rem',
                            whiteSpace: 'pre-wrap',
                            maxHeight: '200px',
                            overflow: 'auto',
                            backgroundColor: 'grey.100',
                            p: 1,
                            borderRadius: 1,
                          }}
                        >
                          {error.stack}
                        </Typography>
                      </Box>
                    )}
                    
                    {errorInfo?.componentStack && (
                      <Box>
                        <Typography variant="subtitle2" gutterBottom>
                          コンポーネントスタック:
                        </Typography>
                        <Typography 
                          variant="body2" 
                          color="text.secondary" 
                          sx={{ 
                            fontFamily: 'monospace', 
                            fontSize: '0.75rem',
                            whiteSpace: 'pre-wrap',
                            maxHeight: '150px',
                            overflow: 'auto',
                            backgroundColor: 'grey.100',
                            p: 1,
                            borderRadius: 1,
                          }}
                        >
                          {errorInfo.componentStack}
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </AccordionDetails>
              </Accordion>
            )}
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;