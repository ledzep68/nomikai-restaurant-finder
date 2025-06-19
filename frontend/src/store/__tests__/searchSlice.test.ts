import { configureStore } from '@reduxjs/toolkit';
import searchReducer, {
  setQuery,
  clearQuery,
  clearResults,
  clearError,
  addToHistory,
  clearHistory,
  searchRestaurants,
} from '../searchSlice';
import * as restaurantService from '@services/restaurantService';
import { SearchQuery, SearchState } from '@types/search';
import { IntegratedSearchResult } from '@types/restaurant';

// Mock the restaurant service
jest.mock('@services/restaurantService');
const mockRestaurantService = restaurantService.restaurantService as jest.Mocked<typeof restaurantService.restaurantService>;

// Mock search result
const mockSearchResult: IntegratedSearchResult = {
  restaurants: [
    {
      restaurant: {
        id: '1',
        name: 'テストレストラン',
        address: '東京都渋谷区',
        phone: '03-1234-5678',
        genre: '和食',
        priceRange: { min: 1000, max: 3000 },
        location: { lat: 35.6581, lng: 139.7414 },
        openingHours: {},
        images: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      totalScore: 4.5,
      confidence: 0.85,
      recommendation: 'highly_recommended' as const,
      platformScores: [],
      reviewCount: 100,
      lastUpdated: '2024-01-01T00:00:00Z',
    },
  ],
  meta: {
    totalCount: 1,
    page: 1,
    limit: 20,
    platformsUsed: ['hotpepper'],
    searchTime: 1000,
    cached: false,
    integratedSearch: true,
  },
  attributions: {},
  legalNotices: {
    dataUsage: 'データ利用に関する注意事項',
    privacyPolicy: '/privacy',
  },
};

describe('searchSlice', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        search: searchReducer,
      },
    });
    jest.clearAllMocks();
  });

  describe('初期状態', () => {
    it('正しい初期状態を持つ', () => {
      const state = store.getState().search;
      expect(state.query.location).toBe('');
      expect(state.query.page).toBe(1);
      expect(state.query.limit).toBe(20);
      expect(state.query.sort).toBe('rating');
      expect(state.results).toBeNull();
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.history).toEqual([]);
    });
  });

  describe('同期アクション', () => {
    it('setQuery: 検索クエリを設定する', () => {
      const newQuery: Partial<SearchQuery> = {
        location: '渋谷',
        genre: 'japanese',
        capacity: 4,
      };

      store.dispatch(setQuery(newQuery));
      const state = store.getState().search;

      expect(state.query.location).toBe('渋谷');
      expect(state.query.genre).toBe('japanese');
      expect(state.query.capacity).toBe(4);
    });

    it('clearQuery: 検索クエリをリセットする', () => {
      // まずクエリを設定
      store.dispatch(setQuery({ location: '渋谷', genre: 'italian' }));
      
      // クエリをクリア
      store.dispatch(clearQuery());
      const state = store.getState().search;

      expect(state.query.location).toBe('');
      expect(state.query.genre).toBeUndefined();
      expect(state.query.page).toBe(1);
    });

    it('clearResults: 検索結果をクリアする', () => {
      // 結果を設定するために非同期アクションを実行
      store.dispatch(searchRestaurants.fulfilled(mockSearchResult, 'requestId', {} as SearchQuery));
      
      // 結果をクリア
      store.dispatch(clearResults());
      const state = store.getState().search;

      expect(state.results).toBeNull();
    });

    it('clearError: エラーをクリアする', () => {
      // エラーを設定
      store.dispatch(searchRestaurants.rejected({ message: 'エラー' } as any, 'requestId', {} as SearchQuery));
      
      // エラーをクリア
      store.dispatch(clearError());
      const state = store.getState().search;

      expect(state.error).toBeNull();
    });

    it('addToHistory: 検索履歴に追加する', () => {
      const query: SearchQuery = {
        location: '渋谷',
        page: 1,
        limit: 20,
        sort: 'rating',
      };

      store.dispatch(addToHistory(query));
      const state = store.getState().search;

      expect(state.history).toHaveLength(1);
      expect(state.history[0].location).toBe('渋谷');
      expect(state.history[0].timestamp).toBeDefined();
    });

    it('addToHistory: 最大10件まで保持する', () => {
      // 11件の履歴を追加
      for (let i = 0; i < 11; i++) {
        const query: SearchQuery = {
          location: `場所${i}`,
          page: 1,
          limit: 20,
          sort: 'rating',
        };
        store.dispatch(addToHistory(query));
      }

      const state = store.getState().search;
      expect(state.history).toHaveLength(10);
      expect(state.history[0].location).toBe('場所10'); // 最新のものが先頭
      expect(state.history[9].location).toBe('場所1'); // 最古のものが最後
    });

    it('clearHistory: 検索履歴をクリアする', () => {
      // 履歴を追加
      store.dispatch(addToHistory({ location: '渋谷', page: 1, limit: 20, sort: 'rating' }));
      store.dispatch(addToHistory({ location: '新宿', page: 1, limit: 20, sort: 'rating' }));

      // 履歴をクリア
      store.dispatch(clearHistory());
      const state = store.getState().search;

      expect(state.history).toEqual([]);
    });
  });

  describe('非同期アクション - searchRestaurants', () => {
    const searchQuery: SearchQuery = {
      location: '渋谷',
      page: 1,
      limit: 20,
      sort: 'rating',
    };

    it('検索成功時の状態遷移', async () => {
      mockRestaurantService.search.mockResolvedValue(mockSearchResult);

      // 検索実行
      const resultAction = await store.dispatch(searchRestaurants(searchQuery));
      const state = store.getState().search;

      expect(searchRestaurants.fulfilled.match(resultAction)).toBe(true);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.results).toEqual(mockSearchResult);
      expect(mockRestaurantService.search).toHaveBeenCalledWith(searchQuery);
    });

    it('検索中の状態', () => {
      mockRestaurantService.search.mockReturnValue(new Promise(() => {})); // 永遠に待つPromise

      store.dispatch(searchRestaurants(searchQuery));
      const state = store.getState().search;

      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('検索失敗時の状態遷移', async () => {
      const errorMessage = 'APIエラー';
      mockRestaurantService.search.mockRejectedValue(new Error(errorMessage));

      const resultAction = await store.dispatch(searchRestaurants(searchQuery));
      const state = store.getState().search;

      expect(searchRestaurants.rejected.match(resultAction)).toBe(true);
      expect(state.loading).toBe(false);
      expect(state.error).toBe(errorMessage);
      expect(state.results).toBeNull();
    });

    it('Axiosエラーの場合のエラーメッセージ処理', async () => {
      const axiosError = {
        response: {
          data: {
            message: 'サーバーエラー',
          },
        },
      };
      mockRestaurantService.search.mockRejectedValue(axiosError);

      await store.dispatch(searchRestaurants(searchQuery));
      const state = store.getState().search;

      expect(state.error).toBe('サーバーエラー');
    });

    it('エラーオブジェクトがない場合のフォールバック', async () => {
      mockRestaurantService.search.mockRejectedValue('文字列エラー');

      await store.dispatch(searchRestaurants(searchQuery));
      const state = store.getState().search;

      expect(state.error).toBe('文字列エラー');
    });
  });

  describe('フィルター初期値', () => {
    it('フィルターの初期値が正しく設定されている', () => {
      const state = store.getState().search;

      expect(state.filters.genres).toBeDefined();
      expect(state.filters.priceRanges).toBeDefined();
      expect(state.filters.capacities).toBeDefined();
      expect(state.filters.sortOptions).toBeDefined();
      
      // 配列が空でないことを確認
      expect(state.filters.genres.length).toBeGreaterThan(0);
      expect(state.filters.priceRanges.length).toBeGreaterThan(0);
      expect(state.filters.capacities.length).toBeGreaterThan(0);
      expect(state.filters.sortOptions.length).toBeGreaterThan(0);
    });
  });

  describe('複合的なシナリオ', () => {
    const testSearchQuery: SearchQuery = {
      location: '渋谷',
      page: 1,
      limit: 20,
      sort: 'rating',
    };

    it('検索→エラー→リトライの流れ', async () => {
      // 1. 最初の検索が失敗
      mockRestaurantService.search.mockRejectedValueOnce(new Error('一時的なエラー'));
      await store.dispatch(searchRestaurants(testSearchQuery));
      
      let state = store.getState().search;
      expect(state.error).toBe('一時的なエラー');

      // 2. エラーをクリア
      store.dispatch(clearError());
      
      // 3. リトライが成功
      mockRestaurantService.search.mockResolvedValueOnce(mockSearchResult);
      await store.dispatch(searchRestaurants(testSearchQuery));
      
      state = store.getState().search;
      expect(state.error).toBeNull();
      expect(state.results).toEqual(mockSearchResult);
    });

    it('ページネーション処理', async () => {
      mockRestaurantService.search.mockResolvedValue(mockSearchResult);

      // 1ページ目を検索
      await store.dispatch(searchRestaurants(testSearchQuery));
      
      // 2ページ目に移動
      const page2Query = { ...testSearchQuery, page: 2 };
      store.dispatch(setQuery(page2Query));
      await store.dispatch(searchRestaurants(page2Query));

      const state = store.getState().search;
      expect(state.query.page).toBe(2);
      expect(mockRestaurantService.search).toHaveBeenCalledTimes(2);
      expect(mockRestaurantService.search).toHaveBeenLastCalledWith(page2Query);
    });
  });
});