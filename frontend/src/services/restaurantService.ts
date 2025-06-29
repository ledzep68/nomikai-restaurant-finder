import { apiService } from './api';
import { mockApiService } from './mockApiService';
import { ratingCache, generateQueryHash } from '@utils/cache';
import { IntegratedSearchResult, Restaurant, Evaluation, EvaluationResult } from '@types/restaurant';
import { SearchQuery } from '@types/search';

// 実API使用の判定 - 環境変数で制御
const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true';

// デバッグ情報追加
console.log('🔍 Environment Debug:');
console.log('VITE_USE_MOCK_API:', import.meta.env.VITE_USE_MOCK_API);
console.log('VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);
console.log('USE_MOCK_API:', USE_MOCK_API);
console.log('All import.meta.env:', import.meta.env);

export const restaurantService = {
  /**
   * Get comprehensive rating for a restaurant
   */
  async getComprehensiveRating(restaurantId: string, refresh?: boolean): Promise<any> {
    if (USE_MOCK_API) {
      // モックデータを返す
      return {
        restaurantId,
        restaurantName: 'Mock Restaurant',
        aggregatedScore: 4.2,
        confidence: 0.85,
        totalReviews: 235,
        platformRatings: [
          {
            platform: 'hotpepper',
            rating: 4.3,
            reviewCount: 150,
            maxRating: 5,
            normalizedScore: 0.86,
            weight: 0.85,
            lastUpdated: new Date().toISOString(),
            url: `https://www.hotpepper.jp/str${restaurantId}/`,
            isAvailable: true,
          },
          {
            platform: 'tabelog',
            rating: 3.8,
            reviewCount: 85,
            maxRating: 5,
            normalizedScore: 0.76,
            weight: 0.15,
            lastUpdated: new Date().toISOString(),
            url: `https://tabelog.com/tokyo/A1234/${restaurantId}/`,
            isAvailable: true,
          },
          {
            platform: 'google',
            rating: 0,
            reviewCount: 0,
            maxRating: 5,
            normalizedScore: 0,
            weight: 0,
            lastUpdated: new Date().toISOString(),
            isAvailable: false,
          },
        ],
        criteria: {
          rating: 82,
          reviewVolume: 78,
          recency: 85,
          consistency: 88,
        },
        recommendation: 'recommended',
        lastCalculated: new Date().toISOString(),
        reviewHighlights: {
          mostMentioned: ['美味しい', '雰囲気が良い', 'コスパが良い'],
          strengths: ['料理の質', 'サービス', '立地'],
          improvements: ['混雑時の対応', '予約の取りづらさ'],
        },
      };
    }

    const params = new URLSearchParams();
    if (refresh) params.append('refresh', 'true');
    
    const response = await apiService.get(
      `/restaurants/${restaurantId}/comprehensive-rating?${params.toString()}`
    );
    return response.data;
  },
  async search(query: SearchQuery): Promise<IntegratedSearchResult> {
    console.log('🔍 Search called with query:', query);
    console.log('🔍 USE_MOCK_API:', USE_MOCK_API);
    
    // 開発環境でモックAPIを使用
    if (USE_MOCK_API) {
      console.log('✅ Using mock API for restaurant search');
      const mockResults = await mockApiService.searchRestaurants(query);
      
      // IntegratedSearchResult形式に変換
      return {
        restaurants: mockResults,
        pagination: {
          currentPage: query.page || 1,
          totalPages: Math.ceil(mockResults.length / (query.limit || 50)),
          totalItems: mockResults.length,
          hasNext: false,
          hasPrev: (query.page || 1) > 1,
        },
        searchQuery: query,
        searchTime: Date.now(),
        filters: {
          availableGenres: ['居酒屋', 'イタリアン', '中華料理', 'フレンチ', 'カフェ', '寿司', 'ラーメン', '焼肉'],
          priceRange: { min: 500, max: 15000 },
          areas: ['東京駅', '新宿', '渋谷', '池袋', '銀座', '品川', '上野', '六本木'],
        },
      };
    }

    // 本番環境では実際のAPIを使用
    console.log('✅ Using real API for restaurant search');
    const params = new URLSearchParams();
    
    if (query.location) params.append('location', query.location);
    if (query.genre) params.append('genre', query.genre);
    if (query.priceRange) {
      params.append('priceMin', query.priceRange.min.toString());
      params.append('priceMax', query.priceRange.max.toString());
    }
    if (query.capacity) params.append('capacity', query.capacity.toString());
    if (query.page) params.append('page', query.page.toString());
    if (query.limit) params.append('limit', query.limit.toString());
    if (query.sort) params.append('sort', query.sort);

    const apiUrl = `/restaurants/integrated-search?${params.toString()}`;
    console.log('🌐 API URL:', apiUrl);
    console.log('🌐 Full URL:', window.location.origin + '/api' + apiUrl);
    
    const response = await apiService.get<any>(apiUrl);
    console.log('🌐 API Response:', response.data);
    
    // APIレスポンスをIntegratedSearchResult形式に変換
    const apiData = response.data;
    return {
      restaurants: apiData.data?.restaurants || [],
      pagination: {
        currentPage: apiData.data?.meta?.page || query.page || 1,
        totalPages: Math.ceil((apiData.data?.meta?.totalCount || 0) / (query.limit || 20)),
        totalItems: apiData.data?.meta?.totalCount || 0,
        hasNext: (apiData.data?.meta?.page || 1) < Math.ceil((apiData.data?.meta?.totalCount || 0) / (query.limit || 20)),
        hasPrev: (apiData.data?.meta?.page || 1) > 1,
      },
      searchQuery: query,
      searchTime: apiData.data?.meta?.searchTime || Date.now(),
      filters: {
        availableGenres: ['居酒屋', 'イタリアン', '中華料理', 'フレンチ', 'カフェ', '寿司', 'ラーメン', '焼肉'],
        priceRange: { min: 500, max: 15000 },
        areas: ['東京駅', '新宿', '渋谷', '池袋', '銀座', '品川', '上野', '六本木'],
      },
    };
  },

  async getRestaurant(id: string): Promise<Restaurant> {
    const response = await apiService.get<Restaurant>(`/restaurants/${id}`);
    return response.data;
  },

  async evaluateRestaurant(
    id: string,
    evaluation: { rating: number; comment: string }
  ): Promise<Evaluation> {
    const response = await apiService.post<Evaluation>(
      `/restaurants/${id}/evaluate`,
      evaluation
    );
    return response.data;
  },

  async getRestaurantEvaluations(id: string): Promise<Evaluation[]> {
    const response = await apiService.get<Evaluation[]>(
      `/restaurants/${id}/evaluations`
    );
    return response.data;
  },

  async getFavorites(): Promise<Restaurant[]> {
    const response = await apiService.get<Restaurant[]>('/restaurants/favorites');
    return response.data;
  },

  async addToFavorites(id: string): Promise<void> {
    await apiService.post(`/restaurants/${id}/favorite`);
  },

  async removeFromFavorites(id: string): Promise<void> {
    await apiService.delete(`/restaurants/${id}/favorite`);
  },
};