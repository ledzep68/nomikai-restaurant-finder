import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme, useTheme } from '@mui/material/styles';
import { CssBaseline, Container, useMediaQuery } from '@mui/material';
import { Provider } from 'react-redux';
import { store, useAppDispatch } from '@store/index';
import { checkAuth } from '@store/authSlice';
import { ROUTES } from '@utils/constants';
import ErrorBoundary from '@components/common/ErrorBoundary';
import Header from '@components/common/Header';
import { SkipToContent } from '@components/common/SkipToContent';
import { GlobalLoader } from '@components/common/GlobalLoader';
import { NetworkErrorHandler, useNetworkErrorHandler } from '@components/common/NetworkErrorHandler';
import { LazyComponentWrapper } from '@components/common/LazyComponentWrapper';
import { SEOProvider } from '@components/seo/SEOHead';
// import { useRealtime } from '@utils/realtime';
import { useDataManager } from '@utils/dataManager';
import { registerSW } from '@utils/serviceWorker';
import { analytics } from '@utils/analytics';
import { preloader, preloadFonts } from '@utils/preloader';
import { MobileLayout } from '@components/mobile/MobileLayout';

// Lazy load pages for better performance
import {
  LazyHomePage,
  LazySearchPage,
  LazyLoginPage,
  LazyRegisterPage,
  LazyFavoritesPage,
  LazyHistoryPage,
  LazyRestaurantDetailPage,
  LazyUserFeedback,
} from '@utils/lazyComponents';

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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { error, isRetrying, clearError, retry } = useNetworkErrorHandler();
  // WebSocket機能は完全無効化済み
  const { cacheStats } = useDataManager();

  useEffect(() => {
    dispatch(checkAuth());
    
    // Initialize service worker (現在無効化中)
    if (import.meta.env.VITE_ENABLE_SERVICE_WORKER === 'true') {
      registerSW({
        onSuccess: (registration) => {
          console.log('SW registered: ', registration);
        },
        onUpdate: (registration) => {
          console.log('SW updated: ', registration);
        },
      });
    }

    // Preload critical resources (開発環境のみ)
    if (import.meta.env.DEV) {
      try {
        preloadFonts();
        preloader.preloadCriticalResources('home');
      } catch (error) {
        console.warn('Preloader failed:', error);
      }
    }

    // Track page view
    analytics.trackPageView(window.location.pathname);
  }, [dispatch]);

  // キャッシュ統計をコンソールに出力（開発用）
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('Cache stats:', cacheStats);
    }
  }, [cacheStats]);

  // Track route changes
  useEffect(() => {
    const handleRouteChange = () => {
      analytics.trackPageView(window.location.pathname);
    };

    window.addEventListener('popstate', handleRouteChange);
    return () => window.removeEventListener('popstate', handleRouteChange);
  }, []);

  const MainContent = isMobile ? MobileLayout : React.Fragment;
  const contentProps = isMobile ? { title: 'Nomikai' } : {};

  return (
    <Router>
      <ErrorBoundary>
        <SkipToContent />
        
        <MainContent {...contentProps}>
          {!isMobile && <Header />}
          
          <Container 
            maxWidth="lg" 
            sx={{ 
              mt: isMobile ? 0 : 4, 
              mb: 4,
              px: isMobile ? 0 : 2,
            }}
            id="main-content"
            tabIndex={-1}
          >
            <Routes>
              <Route 
                path={ROUTES.HOME} 
                element={
                  <LazyComponentWrapper>
                    <LazyHomePage />
                  </LazyComponentWrapper>
                } 
              />
              <Route 
                path={ROUTES.SEARCH} 
                element={
                  <LazyComponentWrapper>
                    <LazySearchPage />
                  </LazyComponentWrapper>
                } 
              />
              <Route 
                path={ROUTES.LOGIN} 
                element={
                  <LazyComponentWrapper>
                    <LazyLoginPage />
                  </LazyComponentWrapper>
                } 
              />
              <Route 
                path={ROUTES.REGISTER} 
                element={
                  <LazyComponentWrapper>
                    <LazyRegisterPage />
                  </LazyComponentWrapper>
                } 
              />
              <Route 
                path={ROUTES.FAVORITES} 
                element={
                  <LazyComponentWrapper>
                    <LazyFavoritesPage />
                  </LazyComponentWrapper>
                } 
              />
              <Route 
                path={ROUTES.HISTORY} 
                element={
                  <LazyComponentWrapper>
                    <LazyHistoryPage />
                  </LazyComponentWrapper>
                } 
              />
              <Route 
                path={ROUTES.RESTAURANT_DETAIL} 
                element={
                  <LazyComponentWrapper>
                    <LazyRestaurantDetailPage />
                  </LazyComponentWrapper>
                } 
              />
            </Routes>
          </Container>
        </MainContent>
        
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
        <LazyComponentWrapper fallback={null}>
          <LazyUserFeedback />
        </LazyComponentWrapper>
      </ErrorBoundary>
    </Router>
  );
};

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <SEOProvider>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <AppContent />
        </ThemeProvider>
      </SEOProvider>
    </Provider>
  );
};

export default App;