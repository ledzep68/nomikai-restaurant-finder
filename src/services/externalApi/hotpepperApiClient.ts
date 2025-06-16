import { BaseApiClient } from './baseApiClient';
import { HotpepperResponse, HotpepperShop, NormalizedRestaurant } from '@/types/externalApi';
import { config } from '@/utils/config';

export class HotpepperApiClient extends BaseApiClient {
  constructor() {
    super({
      config: {
        endpoint: config.externalApis.hotpepper.endpoint,
        apiKey: config.externalApis.hotpepper.apiKey,
        rateLimit: config.externalApis.hotpepper.rateLimit,
        timeout: config.externalApis.hotpepper.timeout,
      },
      name: 'Hotpepper',
    });
  }

  protected getDefaultHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'User-Agent': 'Nomikai-Restaurant-Finder/1.0',
    };
  }

  public async searchRestaurants(params: {
    keyword?: string;
    address?: string;
    genre?: string;
    budget?: string;
    partyCapacity?: number;
    lat?: number;
    lng?: number;
    range?: number;
    count?: number;
    start?: number;
  }): Promise<HotpepperResponse> {
    try {
      const response = await this.client.get<HotpepperResponse>('/gourmet/v1/', {
        params: {
          key: this.config.apiKey,
          keyword: params.keyword,
          address: params.address,
          genre: this.mapGenreCode(params.genre),
          budget: this.mapBudgetCode(params.budget),
          party_capacity: params.partyCapacity,
          lat: params.lat,
          lng: params.lng,
          range: params.range || 3, // Default 1km range
          count: params.count || 20,
          start: params.start || 1,
          format: 'json',
        },
      });

      return response.data;
    } catch (error) {
      console.error('Hotpepper search error:', error);
      throw error;
    }
  }

  public async getRestaurantDetail(shopId: string): Promise<HotpepperShop> {
    try {
      const response = await this.client.get<HotpepperResponse>('/gourmet/v1/', {
        params: {
          key: this.config.apiKey,
          id: shopId,
          format: 'json',
        },
      });

      if (response.data.results.shop.length === 0) {
        throw new Error('Restaurant not found');
      }

      return response.data.results.shop[0];
    } catch (error) {
      console.error('Hotpepper detail fetch error:', error);
      throw error;
    }
  }

  public normalizeRestaurant(shop: HotpepperShop): NormalizedRestaurant {
    const priceRange = this.normalizeBudget(shop.budget);

    return {
      externalId: shop.id,
      platform: 'hotpepper',
      name: shop.name,
      genre: shop.genre.name,
      address: shop.address,
      priceRange,
      rating: 0, // Hotpepper doesn't provide ratings
      reviewCount: 0,
      coordinates: {
        lat: shop.lat,
        lng: shop.lng,
      },
      openingHours: shop.open,
      capacity: shop.party_capacity,
      url: shop.urls.pc,
      imageUrl: shop.photo.pc.l,
      fetchedAt: new Date(),
    };
  }

  private mapGenreCode(genre?: string): string | undefined {
    if (!genre) return undefined;

    const genreMap: Record<string, string> = {
      'Japanese': 'G001',
      'Italian': 'G006',
      'Chinese': 'G007',
      'Korean': 'G017',
      'Western': 'G005',
      'Izakaya': 'G001',
    };

    return genreMap[genre];
  }

  private mapBudgetCode(budget?: string): string | undefined {
    if (!budget) return undefined;

    const budgetMap: Record<string, string> = {
      'low': 'B001,B002', // Under 2000 yen
      'medium': 'B003,B004', // 2000-4000 yen
      'high': 'B005,B006,B007,B008', // Over 4000 yen
    };

    return budgetMap[budget];
  }

  private normalizeBudget(budget: HotpepperShop['budget']): {
    min: number;
    max: number;
    category: 'low' | 'medium' | 'high';
  } {
    const avgString = budget.average || '0';
    const avg = parseInt(avgString.replace(/[¥,円]/g, ''), 10);

    let category: 'low' | 'medium' | 'high';
    let min: number;
    let max: number;

    if (avg <= 2000) {
      category = 'low';
      min = 0;
      max = 2000;
    } else if (avg <= 4000) {
      category = 'medium';
      min = 2000;
      max = 4000;
    } else {
      category = 'high';
      min = 4000;
      max = 10000;
    }

    return { min, max, category };
  }
}