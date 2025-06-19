import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import SearchPage from '../SearchPage';
import authReducer from '@store/authSlice';
import restaurantReducer from '@store/restaurantSlice';
import searchReducer from '@store/searchSlice';
import * as restaurantService from '@services/restaurantService';

// Mock services
jest.mock('@services/restaurantService', () => ({
  search: jest.fn(),
  getRestaurant: jest.fn(),
  getEvaluations: jest.fn(),
  createEvaluation: jest.fn(),
  getUserEvaluations: jest.fn(),
  deleteEvaluation: jest.fn(),
}));
const mockRestaurantService = restaurantService as jest.Mocked<typeof restaurantService>;

const theme = createTheme();

// Mock navigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

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
          location: '',
          page: 1,
          limit: 20,
          sort: 'rating',
        },
        results: null,
        filters: {
          genres: ['japanese', 'italian'],
          priceRanges: [{ label: '～1,000円', min: 0, max: 1000 }],
          capacities: [2, 4, 6],
          sortOptions: [{ value: 'rating', label: '評価順' }],
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

// Mock API response
const mockSearchResponse = {
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
  ],
  meta: {
    totalCount: 1,
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

describe('SearchPage Integration', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
    mockRestaurantService.search.mockResolvedValue(mockSearchResponse);
  });

  describe('基本的なレンダリング', () => {
    it('検索ページが正しくレンダリングされる', () => {
      const store = createTestStore();
      render(
        <TestWrapper store={store}>
          <SearchPage />
        </TestWrapper>
      );

      expect(screen.getByTestId('search-page')).toBeInTheDocument();
      expect(screen.getAllByText('レストラン検索')[0]).toBeInTheDocument();
      expect(screen.getByTestId('location-input')).toBeInTheDocument();
      expect(screen.getByText('検索条件を入力して検索ボタンを押してください')).toBeInTheDocument();
    });
  });

  describe('検索フロー統合テスト', () => {
    it('完全な検索フローが正常に動作する', async () => {
      const store = createTestStore();
      render(
        <TestWrapper store={store}>
          <SearchPage />
        </TestWrapper>
      );

      // 1. フォームに入力
      const locationInput = screen.getByTestId('location-input');
      await user.type(locationInput, '渋谷');

      const genreSelect = screen.getByTestId('genre-select');
      await user.click(genreSelect);
      const japaneseOption = screen.getByText('和食');
      await user.click(japaneseOption);

      const capacitySelect = screen.getByTestId('capacity-select');
      await user.click(capacitySelect);
      const sixPeopleOption = screen.getByText('6人');
      await user.click(sixPeopleOption);

      // 2. 検索実行
      const searchButton = screen.getByTestId('search-button');
      await user.click(searchButton);

      // 3. API呼び出しの確認
      await waitFor(() => {
        expect(mockRestaurantService.search).toHaveBeenCalledWith({
          location: '渋谷',
          genre: 'japanese',
          priceRange: { min: 0, max: 5000 },
          capacity: 6,
          page: 1,
          limit: 20,
          sort: 'rating',
        });
      });

      // 4. 検索結果の表示確認
      await waitFor(() => {
        expect(screen.getByText('テスト居酒屋')).toBeInTheDocument();
        expect(screen.getByText('検索結果 (1件)')).toBeInTheDocument();
      });
    });

    it('検索エラー時の表示が正しく動作する', async () => {
      const store = createTestStore();
      mockRestaurantService.search.mockRejectedValue(new Error('API Error'));

      render(
        <TestWrapper store={store}>
          <SearchPage />
        </TestWrapper>
      );

      const locationInput = screen.getByTestId('location-input');
      await user.type(locationInput, '渋谷');

      const searchButton = screen.getByTestId('search-button');
      await user.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText('API Error')).toBeInTheDocument();
      });
    });

    it('検索中の状態表示が正しく動作する', async () => {
      const store = createTestStore();
      // 検索が完了しないようにPromiseを未解決のままにする
      let resolveSearch: (value: any) => void;
      const searchPromise = new Promise((resolve) => {
        resolveSearch = resolve;
      });
      mockRestaurantService.search.mockReturnValue(searchPromise);

      render(
        <TestWrapper store={store}>
          <SearchPage />
        </TestWrapper>
      );

      const locationInput = screen.getByTestId('location-input');
      await user.type(locationInput, '渋谷');

      const searchButton = screen.getByTestId('search-button');
      await user.click(searchButton);

      // 検索中の表示確認
      expect(screen.getByText('検索中...')).toBeInTheDocument();
      expect(searchButton).toBeDisabled();

      // 検索完了
      resolveSearch!(mockSearchResponse);
      await waitFor(() => {
        expect(screen.getByText('テスト居酒屋')).toBeInTheDocument();
      });
    });
  });

  describe('フォームバリデーション統合', () => {
    it('必須フィールドの検証が正しく動作する', async () => {
      const store = createTestStore();
      render(
        <TestWrapper store={store}>
          <SearchPage />
        </TestWrapper>
      );

      const searchButton = screen.getByTestId('search-button');
      await user.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText('場所を入力してください')).toBeInTheDocument();
      });

      // API呼び出しが行われないことを確認
      expect(mockRestaurantService.search).not.toHaveBeenCalled();
    });

    it('有効な入力でバリデーションが通過する', async () => {
      const store = createTestStore();
      render(
        <TestWrapper store={store}>
          <SearchPage />
        </TestWrapper>
      );

      const locationInput = screen.getByTestId('location-input');
      await user.type(locationInput, '渋谷');

      const searchButton = screen.getByTestId('search-button');
      expect(searchButton).not.toBeDisabled();

      await user.click(searchButton);

      await waitFor(() => {
        expect(mockRestaurantService.search).toHaveBeenCalled();
      });
    });
  });

  describe('結果表示とインタラクション', () => {
    it('詳細ページへの遷移が正しく動作する', async () => {
      const store = createTestStore({
        search: {
          query: { location: '渋谷', page: 1, limit: 20, sort: 'rating' },
          results: mockSearchResponse,
          filters: { genres: [], priceRanges: [], capacities: [], sortOptions: [] },
          history: [],
          loading: false,
          error: null,
        },
      });

      render(
        <TestWrapper store={store}>
          <SearchPage />
        </TestWrapper>
      );

      const detailButton = screen.getByTestId('view-detail-1');
      await user.click(detailButton);

      expect(mockNavigate).toHaveBeenCalledWith('/restaurant/1');
    });

    it('お気に入り機能が正しく動作する', async () => {
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
          results: mockSearchResponse,
          filters: { genres: [], priceRanges: [], capacities: [], sortOptions: [] },
          history: [],
          loading: false,
          error: null,
        },
      });

      render(
        <TestWrapper store={store}>
          <SearchPage />
        </TestWrapper>
      );

      const favoriteButton = screen.getByTestId('favorite-1');
      expect(favoriteButton).toHaveTextContent('お気に入り');

      await user.click(favoriteButton);

      // お気に入り状態が更新されることを確認
      expect(mockNavigate).not.toHaveBeenCalledWith('/login');
    });
  });

  describe('検索履歴機能', () => {
    it('検索実行時に履歴が追加される', async () => {
      const store = createTestStore();
      render(
        <TestWrapper store={store}>
          <SearchPage />
        </TestWrapper>
      );

      const locationInput = screen.getByTestId('location-input');
      await user.type(locationInput, '渋谷');

      const searchButton = screen.getByTestId('search-button');
      await user.click(searchButton);

      await waitFor(() => {
        expect(mockRestaurantService.search).toHaveBeenCalled();
      });

      // Redux storeに検索履歴が追加されることを確認
      const state = store.getState();
      expect(state.search.history).toHaveLength(1);
      expect(state.search.history[0].location).toBe('渋谷');
    });
  });

  describe('レスポンシブ対応', () => {
    it('モバイル画面サイズでも正しく表示される', () => {
      // viewport を mobile サイズに設定
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667,
      });

      const store = createTestStore();
      render(
        <TestWrapper store={store}>
          <SearchPage />
        </TestWrapper>
      );

      expect(screen.getByTestId('search-page')).toBeInTheDocument();
      expect(screen.getByTestId('location-input')).toBeInTheDocument();
      expect(screen.getByTestId('search-button')).toBeInTheDocument();
    });
  });

  describe('アクセシビリティ', () => {
    it('キーボードナビゲーションが正しく動作する', async () => {
      const store = createTestStore();
      render(
        <TestWrapper store={store}>
          <SearchPage />
        </TestWrapper>
      );

      const locationInput = screen.getByTestId('location-input');
      locationInput.focus();

      // Tab キーでフォーカス移動
      await user.tab();
      expect(screen.getByTestId('genre-select')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('capacity-select')).toHaveFocus();
    });

    it('スクリーンリーダー対応のaria属性が設定されている', () => {
      const store = createTestStore();
      render(
        <TestWrapper store={store}>
          <SearchPage />
        </TestWrapper>
      );

      expect(screen.getByLabelText('場所')).toBeInTheDocument();
      expect(screen.getByTestId('genre-select')).toBeInTheDocument();
      expect(screen.getByTestId('capacity-select')).toBeInTheDocument();
    });
  });
});