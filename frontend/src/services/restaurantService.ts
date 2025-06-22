import { apiService } from './api';
import { mockApiService } from './mockApiService';
import { IntegratedSearchResult, Restaurant, Evaluation, EvaluationResult } from '@types/restaurant';
import { SearchQuery } from '@types/search';

// 開発環境でモックAPIを使用するかどうかの判定
const USE_MOCK_API = process.env.NODE_ENV === 'development' && 
  (process.env.REACT_APP_USE_MOCK_API === 'true' || !process.env.REACT_APP_API_URL);

export const restaurantService = {
  async search(query: SearchQuery): Promise<IntegratedSearchResult> {
    // 開発環境でモックAPIを使用
    if (USE_MOCK_API) {
      console.log('Using mock API for restaurant search');
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

    const response = await apiService.get<IntegratedSearchResult>(
      `/restaurants/search?${params.toString()}`
    );
    return response.data;
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