import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Container } from '@mui/material';
import { Provider } from 'react-redux';
import { store, useAppDispatch } from '@store/index';
import { checkAuth } from '@store/authSlice';
import { ROUTES } from '@utils/constants';
import ErrorBoundary from '@components/common/ErrorBoundary';
import Header from '@components/common/Header';
import { GlobalLoader } from '@components/common/GlobalLoader';
import { NetworkErrorHandler, useNetworkErrorHandler } from '@components/common/NetworkErrorHandler';
import { UserFeedback } from '@components/common/UserFeedback';
import { useRealtime } from '@utils/realtime';
import { useDataManager } from '@utils/dataManager';
import HomePage from '@pages/HomePage';
import SearchPage from '@pages/SearchPage';
import LoginPage from '@pages/LoginPage';
import RegisterPage from '@pages/RegisterPage';
import FavoritesPage from '@pages/FavoritesPage';
import HistoryPage from '@pages/HistoryPage';
import { RestaurantDetailPage } from '@pages/RestaurantDetailPage';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    fontFamily: [
      'Roboto',
      'Noto Sans JP',
      '-apple-system',
      'BlinkMacSystemFont',
      'sans-serif',
    ].join(','),
  },
});

const AppContent: React.FC = () => {
  const dispatch = useAppDispatch();
  const { error, isRetrying, handleError, clearError, retry } = useNetworkErrorHandler();
  const { connectionState, isConnected } = useRealtime();
  const { cacheStats } = useDataManager();

  useEffect(() => {
    dispatch(checkAuth());
  }, [dispatch]);

  // キャッシュ統計をコンソールに出力（開発用）
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Cache stats:', cacheStats);
    }
  }, [cacheStats]);

  return (
    <Router>
      <ErrorBoundary>
        <Header />
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <Routes>
            <Route path={ROUTES.HOME} element={<HomePage />} />
            <Route path={ROUTES.SEARCH} element={<SearchPage />} />
            <Route path={ROUTES.LOGIN} element={<LoginPage />} />
            <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
            <Route path={ROUTES.FAVORITES} element={<FavoritesPage />} />
            <Route path={ROUTES.HISTORY} element={<HistoryPage />} />
            <Route path={ROUTES.RESTAURANT_DETAIL} element={<RestaurantDetailPage />} />
            {/* Add more routes as needed */}
          </Routes>
        </Container>
        
        {/* グローバルコンポーネント */}
        <GlobalLoader />
        <NetworkErrorHandler
          error={error}
          onClearError={clearError}
          onRetry={() => retry(async () => {
            // 最後に失敗したリクエストの再試行ロジック
            console.log('Retrying failed request...');
          })}
          isRetrying={isRetrying}
        />
        <UserFeedback />
      </ErrorBoundary>
    </Router>
  );
};

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AppContent />
      </ThemeProvider>
    </Provider>
  );
};

export default App;