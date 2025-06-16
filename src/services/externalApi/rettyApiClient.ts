import { BaseApiClient } from './baseApiClient';
import { RettyResponse, RettyRestaurant, NormalizedRestaurant } from '@/types/externalApi';
import { config } from '@/utils/config';

export class RettyApiClient extends BaseApiClient {
  constructor() {
    super({
      config: {
        endpoint: config.externalApis.retty.endpoint,
        apiKey: config.externalApis.retty.apiKey,
        rateLimit: config.externalApis.retty.rateLimit,
        timeout: config.externalApis.retty.timeout,
      },
      name: 'Retty',
    });
  }

  protected getDefaultHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`,
      'User-Agent': 'Nomikai-Restaurant-Finder/1.0',
    };
  }

  public async searchRestaurants(params: {
    q?: string;
    area?: string;
    category?: string;
    priceMin?: number;
    priceMax?: number;
    recommendationRate?: number;
    page?: number;
    perPage?: number;
  }): Promise<RettyResponse> {
    try {
      const response = await this.client.get<RettyResponse>('/restaurants', {
        params: {
          q: params.q,
          area: params.area,
          category: params.category,
          price_min: params.priceMin,
          price_max: params.priceMax,
          recommendation_rate_min: params.recommendationRate,
          page: params.page || 1,
          per_page: params.perPage || 20,
        },
      });

      return response.data;
    } catch (error) {
      console.error('Retty search error:', error);
      throw error;
    }
  }

  public async getRestaurantDetail(restaurantId: string): Promise<RettyRestaurant> {
    try {
      const response = await this.client.get<{ restaurant: RettyRestaurant }>(
        `/restaurants/${restaurantId}`
      );

      return response.data.restaurant;
    } catch (error) {
      console.error('Retty detail fetch error:', error);
      throw error;
    }
  }

  public normalizeRestaurant(restaurant: RettyRestaurant): NormalizedRestaurant {
    const priceRange = this.normalizePriceRange(restaurant.price_range);

    return {
      externalId: restaurant.restaurant_id,
      platform: 'retty',
      name: restaurant.name,
      genre: restaurant.categories[0] || 'Restaurant',
      address: restaurant.address,
      priceRange,
      rating: restaurant.rating.average,
      reviewCount: restaurant.rating.count,
      url: restaurant.url,
      imageUrl: restaurant.images[0],
      fetchedAt: new Date(),
    };
  }

  private normalizePriceRange(priceRange: { min: number; max: number }): {
    min: number;
    max: number;
    category: 'low' | 'medium' | 'high';
  } {
    const avg = (priceRange.min + priceRange.max) / 2;
    
    let category: 'low' | 'medium' | 'high';
    if (avg <= 1500) {
      category = 'low';
    } else if (avg <= 3000) {
      category = 'medium';
    } else {
      category = 'high';
    }

    return {
      min: priceRange.min,
      max: priceRange.max,
      category,
    };
  }

  public async getRecommendedRestaurants(params: {
    area?: string;
    category?: string;
    occasion?: string;
    groupSize?: number;
  }): Promise<RettyResponse> {
    try {
      const response = await this.client.get<RettyResponse>('/restaurants/recommended', {
        params: {
          area: params.area,
          category: params.category,
          occasion: params.occasion || 'nomikai',
          group_size: params.groupSize,
        },
      });

      return response.data;
    } catch (error) {
      console.error('Retty recommendations error:', error);
      throw error;
    }
  }
}