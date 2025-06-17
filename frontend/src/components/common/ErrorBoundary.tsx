import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { ErrorOutline } from '@mui/icons-material';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="400px"
          padding={3}
        >
          <Paper elevation={3} sx={{ padding: 4, textAlign: 'center', maxWidth: 500 }}>
            <ErrorOutline color="error" sx={{ fontSize: 64, mb: 2 }} />
            <Typography variant="h5" component="h2" gutterBottom>
              エラーが発生しました
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              申し訳ございません。予期しないエラーが発生しました。
              ページを再読み込みしてもう一度お試しください。
            </Typography>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <Typography variant="body2" color="error" sx={{ mt: 2, fontFamily: 'monospace' }}>
                {this.state.error.message}
              </Typography>
            )}
            <Button
              variant="contained"
              color="primary"
              onClick={this.handleReload}
              sx={{ mt: 3 }}
            >
              ページを再読み込み
            </Button>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;