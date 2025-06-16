import { BaseApiClient } from './baseApiClient';
import { TabelogResponse, TabelogRestaurant, NormalizedRestaurant } from '@/types/externalApi';
import { config } from '@/utils/config';

export class TabelogApiClient extends BaseApiClient {
  constructor() {
    super({
      config: {
        endpoint: config.externalApis.tabelog.endpoint,
        apiKey: config.externalApis.tabelog.apiKey,
        rateLimit: config.externalApis.tabelog.rateLimit,
        timeout: config.externalApis.tabelog.timeout,
      },
      name: 'Tabelog',
    });
  }

  protected getDefaultHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-API-Key': this.config.apiKey || '',
      'User-Agent': 'Nomikai-Restaurant-Finder/1.0',
    };
  }

  public async searchRestaurants(params: {
    keyword?: string;
    area?: string;
    genre?: string;
    priceRange?: string;
    limit?: number;
    offset?: number;
  }): Promise<TabelogResponse> {
    try {
      const response = await this.client.get<TabelogResponse>('/restaurants/search', {
        params: {
          keyword: params.keyword,
          area: params.area,
          category: params.genre,
          price_range: params.priceRange,
          limit: params.limit || 20,
          offset: params.offset || 0,
        },
      });

      return response.data;
    } catch (error) {
      console.error('Tabelog search error:', error);
      throw error;
    }
  }

  public async getRestaurantDetail(restaurantId: string): Promise<TabelogRestaurant> {
    try {
      const response = await this.client.get<{ restaurant: TabelogRestaurant }>(
        `/restaurants/${restaurantId}`
      );

      return response.data.restaurant;
    } catch (error) {
      console.error('Tabelog detail fetch error:', error);
      throw error;
    }
  }

  public normalizeRestaurant(restaurant: TabelogRestaurant): NormalizedRestaurant {
    return {
      externalId: restaurant.id,
      platform: 'tabelog',
      name: restaurant.name,
      genre: restaurant.category,
      address: restaurant.address,
      priceRange: this.normalizePriceRange(restaurant.priceRange),
      rating: restaurant.rating,
      reviewCount: restaurant.reviewCount,
      openingHours: restaurant.openingHours,
      url: restaurant.url,
      imageUrl: restaurant.imageUrl,
      fetchedAt: new Date(),
    };
  }

  private normalizePriceRange(priceRange: string): {
    min: number;
    max: number;
    category: 'low' | 'medium' | 'high';
  } {
    // Tabelog price format: "¥1,000～¥2,000"
    const matches = priceRange.match(/¥([\d,]+)～¥([\d,]+)/);
    
    if (matches) {
      const min = parseInt(matches[1].replace(/,/g, ''), 10);
      const max = parseInt(matches[2].replace(/,/g, ''), 10);
      
      let category: 'low' | 'medium' | 'high';
      if (max <= 1500) {
        category = 'low';
      } else if (max <= 3000) {
        category = 'medium';
      } else {
        category = 'high';
      }

      return { min, max, category };
    }

    // Default fallback
    return { min: 0, max: 3000, category: 'medium' };
  }
}