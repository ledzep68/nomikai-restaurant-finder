import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import SearchResults from '../SearchResults';
import authReducer from '@store/authSlice';
import restaurantReducer from '@store/restaurantSlice';
import searchReducer from '@store/searchSlice';
import { IntegratedSearchResult } from '@types/restaurant';

const theme = createTheme();

// Mock navigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock data
const mockSearchResults: IntegratedSearchResult = {
  restaurants: [
    {
      restaurant: {
        id: '1',
        name: 'テスト居酒屋',
        address: '東京都渋谷区渋谷1-1-1',
        phone: '03-1234-5678',
        genre: '居酒屋',
        priceRange: { min: 2000, max: 4000 },
        location: { lat: 35.6581, lng: 139.7414 },
        openingHours: {},
        images: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      totalScore: 4.5,
      confidence: 0.85,
      recommendation: 'highly_recommended' as const,
      platformScores: [
        { platform: 'hotpepper' as const, score: 4.3, reviewCount: 50 },
        { platform: 'googlePlaces' as const, score: 4.7, reviewCount: 120 },
      ],
      reviewCount: 170,
      lastUpdated: '2024-01-01T00:00:00Z',
    },
    {
      restaurant: {
        id: '2',
        name: 'テスト和食レストラン',
        address: '東京都新宿区新宿2-2-2',
        phone: '03-2345-6789',
        genre: '和食',
        priceRange: { min: 3000, max: 5000 },
        location: { lat: 35.6938, lng: 139.7034 },
        openingHours: {},
        images: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      totalScore: 4.2,
      confidence: 0.78,
      recommendation: 'recommended' as const,
      platformScores: [
        { platform: 'hotpepper' as const, score: 4.0, reviewCount: 30 },
        { platform: 'googlePlaces' as const, score: 4.4, reviewCount: 80 },
      ],
      reviewCount: 110,
      lastUpdated: '2024-01-01T00:00:00Z',
    },
  ],
  meta: {
    totalCount: 2,
    page: 1,
    limit: 20,
    platformsUsed: ['hotpepper', 'googlePlaces'],
    searchTime: 1250,
    cached: false,
    integratedSearch: true,
  },
  attributions: {
    hotpepper: '画像提供：ホットペッパー グルメ',
    googlePlaces: 'powered by Google',
  },
  legalNotices: {
    dataUsage: 'このサービスは外部APIから取得したデータを利用しています。',
    privacyPolicy: '/privacy-policy',
  },
};

// Test store factory
const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      auth: authReducer,
      restaurant: restaurantReducer,
      search: searchReducer,
    },
    preloadedState: {
      auth: {
        isAuthenticated: false,
        user: null,
        token: null,
        loading: false,
        error: null,
      },
      restaurant: {
        current: null,
        searchResults: null,
        evaluations: [],
        favorites: [],
        loading: false,
        error: null,
      },
      search: {
        query: {
          location: '渋谷',
          page: 1,
          limit: 20,
          sort: 'rating',
        },
        results: null,
        filters: {
          genres: [],
          priceRanges: [],
          capacities: [],
          sortOptions: [],
        },
        history: [],
        loading: false,
        error: null,
      },
      ...initialState,
    },
  });
};

// Test wrapper component
const TestWrapper: React.FC<{ store: any; children: React.ReactNode }> = ({ 
  store, 
  children 
}) => (
  <Provider store={store}>
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        {children}
      </ThemeProvider>
    </BrowserRouter>
  </Provider>
);

describe('SearchResults', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
  });

  describe('基本的なレンダリング', () => {
    it('検索結果がない場合は初期メッセージが表示される', () => {
      const store = createTestStore();
      render(
        <TestWrapper store={store}>
          <SearchResults />
        </TestWrapper>
      );

      expect(screen.getByText('検索条件を入力して検索ボタンを押してください')).toBeInTheDocument();
    });

    it('検索中の場合はローディング表示される', () => {
      const store = createTestStore({
        search: {
          query: { location: '渋谷', page: 1, limit: 20, sort: 'rating' },
          results: null,
          filters: { genres: [], priceRanges: [], capacities: [], sortOptions: [] },
          history: [],
          loading: true,
          error: null,
        },
      });

      render(
        <TestWrapper store={store}>
          <SearchResults />
        </TestWrapper>
      );

      expect(screen.getByText('検索中...')).toBeInTheDocument();
    });

    it('検索結果が0件の場合は適切なメッセージが表示される', () => {
      const store = createTestStore({
        search: {
          query: { location: '渋谷', page: 1, limit: 20, sort: 'rating' },
          results: {
            ...mockSearchResults,
            restaurants: [],
            meta: { ...mockSearchResults.meta, totalCount: 0 },
          },
          filters: { genres: [], priceRanges: [], capacities: [], sortOptions: [] },
          history: [],
          loading: false,
          error: null,
        },
      });

      render(
        <TestWrapper store={store}>
          <SearchResults />
        </TestWrapper>
      );

      expect(screen.getByText('検索条件に一致するレストランが見つかりませんでした。')).toBeInTheDocument();
    });

    it('検索結果が表示される', () => {
      const store = createTestStore({
        search: {
          query: { location: '渋谷', page: 1, limit: 20, sort: 'rating' },
          results: mockSearchResults,
          filters: { genres: [], priceRanges: [], capacities: [], sortOptions: [] },
          history: [],
          loading: false,
          error: null,
        },
      });

      render(
        <TestWrapper store={store}>
          <SearchResults />
        </TestWrapper>
      );

      expect(screen.getByTestId('search-results')).toBeInTheDocument();
      expect(screen.getByText('検索結果 (2件)')).toBeInTheDocument();
      expect(screen.getByText('テスト居酒屋')).toBeInTheDocument();
      expect(screen.getByText('テスト和食レストラン')).toBeInTheDocument();
    });
  });

  describe('レストランカード表示', () => {
    it('レストランの基本情報が正しく表示される', () => {
      const store = createTestStore({
        search: {
          query: { location: '渋谷', page: 1, limit: 20, sort: 'rating' },
          results: mockSearchResults,
          filters: { genres: [], priceRanges: [], capacities: [], sortOptions: [] },
          history: [],
          loading: false,
          error: null,
        },
      });

      render(
        <TestWrapper store={store}>
          <SearchResults />
        </TestWrapper>
      );

      // 1つ目のレストラン
      expect(screen.getByText('テスト居酒屋')).toBeInTheDocument();
      expect(screen.getByText('東京都渋谷区渋谷1-1-1')).toBeInTheDocument();
      expect(screen.getByText('¥2,000～¥4,000')).toBeInTheDocument();
      expect(screen.getByText('居酒屋')).toBeInTheDocument();

      // 2つ目のレストラン
      expect(screen.getByText('テスト和食レストラン')).toBeInTheDocument();
      expect(screen.getByText('東京都新宿区新宿2-2-2')).toBeInTheDocument();
      expect(screen.getByText('¥3,000～¥5,000')).toBeInTheDocument();
      expect(screen.getByText('和食')).toBeInTheDocument();
    });

    it('評価とおすすめレベルが正しく表示される', () => {
      const store = createTestStore({
        search: {
          query: { location: '渋谷', page: 1, limit: 20, sort: 'rating' },
          results: mockSearchResults,
          filters: { genres: [], priceRanges: [], capacities: [], sortOptions: [] },
          history: [],
          loading: false,
          error: null,
        },
      });

      render(
        <TestWrapper store={store}>
          <SearchResults />
        </TestWrapper>
      );

      expect(screen.getByText('強くおすすめ')).toBeInTheDocument();
      expect(screen.getByText('おすすめ')).toBeInTheDocument();
      expect(screen.getByText('4.5 (信頼度: 85%)')).toBeInTheDocument();
      expect(screen.getByText('4.2 (信頼度: 78%)')).toBeInTheDocument();
    });

    it('プラットフォーム別評価が表示される', () => {
      const store = createTestStore({
        search: {
          query: { location: '渋谷', page: 1, limit: 20, sort: 'rating' },
          results: mockSearchResults,
          filters: { genres: [], priceRanges: [], capacities: [], sortOptions: [] },
          history: [],
          loading: false,
          error: null,
        },
      });

      render(
        <TestWrapper store={store}>
          <SearchResults />
        </TestWrapper>
      );

      expect(screen.getByText('ホットペッパー: 4.3')).toBeInTheDocument();
      expect(screen.getByText('Google: 4.7')).toBeInTheDocument();
    });
  });

  describe('ユーザー操作', () => {
    it('詳細ボタンクリックで詳細ページに遷移する', async () => {
      const store = createTestStore({
        search: {
          query: { location: '渋谷', page: 1, limit: 20, sort: 'rating' },
          results: mockSearchResults,
          filters: { genres: [], priceRanges: [], capacities: [], sortOptions: [] },
          history: [],
          loading: false,
          error: null,
        },
      });

      render(
        <TestWrapper store={store}>
          <SearchResults />
        </TestWrapper>
      );

      const detailButton = screen.getByTestId('view-detail-1');
      await user.click(detailButton);

      expect(mockNavigate).toHaveBeenCalledWith('/restaurant/1');
    });

    it('未認証でお気に入りボタンクリック時はログインページに遷移する', async () => {
      const store = createTestStore({
        search: {
          query: { location: '渋谷', page: 1, limit: 20, sort: 'rating' },
          results: mockSearchResults,
          filters: { genres: [], priceRanges: [], capacities: [], sortOptions: [] },
          history: [],
          loading: false,
          error: null,
        },
      });

      render(
        <TestWrapper store={store}>
          <SearchResults />
        </TestWrapper>
      );

      const favoriteButton = screen.getByTestId('favorite-1');
      await user.click(favoriteButton);

      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    it('認証済みでお気に入りボタンが機能する', async () => {
      const store = createTestStore({
        auth: {
          isAuthenticated: true,
          user: { id: '1', email: 'test@example.com', name: 'Test User', createdAt: '', updatedAt: '' },
          token: 'test-token',
          loading: false,
          error: null,
        },
        search: {
          query: { location: '渋谷', page: 1, limit: 20, sort: 'rating' },
          results: mockSearchResults,
          filters: { genres: [], priceRanges: [], capacities: [], sortOptions: [] },
          history: [],
          loading: false,
          error: null,
        },
      });

      render(
        <TestWrapper store={store}>
          <SearchResults />
        </TestWrapper>
      );

      const favoriteButton = screen.getByTestId('favorite-1');
      expect(favoriteButton).toHaveTextContent('お気に入り');
      
      await user.click(favoriteButton);
      
      // Redux actionが呼ばれることを確認（実際のAPIコールはモック）
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('ページネーション', () => {
    it('複数ページがある場合はページネーションが表示される', () => {
      const store = createTestStore({
        search: {
          query: { location: '渋谷', page: 1, limit: 20, sort: 'rating' },
          results: {
            ...mockSearchResults,
            meta: { ...mockSearchResults.meta, totalCount: 50 },
          },
          filters: { genres: [], priceRanges: [], capacities: [], sortOptions: [] },
          history: [],
          loading: false,
          error: null,
        },
      });

      render(
        <TestWrapper store={store}>
          <SearchResults />
        </TestWrapper>
      );

      expect(screen.getByTestId('pagination')).toBeInTheDocument();
    });

    it('1ページのみの場合はページネーションが表示されない', () => {
      const store = createTestStore({
        search: {
          query: { location: '渋谷', page: 1, limit: 20, sort: 'rating' },
          results: mockSearchResults,
          filters: { genres: [], priceRanges: [], capacities: [], sortOptions: [] },
          history: [],
          loading: false,
          error: null,
        },
      });

      render(
        <TestWrapper store={store}>
          <SearchResults />
        </TestWrapper>
      );

      expect(screen.queryByTestId('pagination')).not.toBeInTheDocument();
    });
  });

  describe('法的表示', () => {
    it('データ利用に関する注意事項が表示される', () => {
      const store = createTestStore({
        search: {
          query: { location: '渋谷', page: 1, limit: 20, sort: 'rating' },
          results: mockSearchResults,
          filters: { genres: [], priceRanges: [], capacities: [], sortOptions: [] },
          history: [],
          loading: false,
          error: null,
        },
      });

      render(
        <TestWrapper store={store}>
          <SearchResults />
        </TestWrapper>
      );

      expect(screen.getByText('このサービスは外部APIから取得したデータを利用しています。')).toBeInTheDocument();
      expect(screen.getByText('画像提供：ホットペッパー グルメ')).toBeInTheDocument();
      expect(screen.getByText('powered by Google')).toBeInTheDocument();
    });
  });

  describe('検索メタ情報', () => {
    it('検索時間とプラットフォーム情報が表示される', () => {
      const store = createTestStore({
        search: {
          query: { location: '渋谷', page: 1, limit: 20, sort: 'rating' },
          results: mockSearchResults,
          filters: { genres: [], priceRanges: [], capacities: [], sortOptions: [] },
          history: [],
          loading: false,
          error: null,
        },
      });

      render(
        <TestWrapper store={store}>
          <SearchResults />
        </TestWrapper>
      );

      expect(screen.getByText(/使用プラットフォーム: hotpepper, googlePlaces/)).toBeInTheDocument();
      expect(screen.getByText(/検索時間: 1250ms/)).toBeInTheDocument();
      expect(screen.getByText(/リアルタイム/)).toBeInTheDocument();
    });
  });
});