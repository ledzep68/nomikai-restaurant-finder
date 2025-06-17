import { apiService } from './api';
import { IntegratedSearchResult, Restaurant, Evaluation } from '@types/restaurant';
import { SearchQuery } from '@types/search';

export const restaurantService = {
  async search(query: SearchQuery): Promise<IntegratedSearchResult> {
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