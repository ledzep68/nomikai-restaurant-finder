import { BaseApiClient } from './baseApiClient';
import { GooglePlacesResponse, GooglePlace, NormalizedRestaurant } from '@/types/externalApi';
import { config } from '@/utils/config';

export class GooglePlacesApiClient extends BaseApiClient {
  constructor() {
    super({
      config: {
        endpoint: config.externalApis.googlePlaces.endpoint,
        apiKey: config.externalApis.googlePlaces.apiKey,
        rateLimit: config.externalApis.googlePlaces.rateLimit,
        timeout: config.externalApis.googlePlaces.timeout,
      },
      name: 'GooglePlaces',
    });
  }

  protected getDefaultHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'User-Agent': 'Nomikai-Restaurant-Finder/1.0',
    };
  }

  public async searchRestaurants(params: {
    query?: string;
    location?: { lat: number; lng: number };
    radius?: number;
    type?: string;
    minPrice?: number;
    maxPrice?: number;
    openNow?: boolean;
    pageToken?: string;
  }): Promise<GooglePlacesResponse> {
    try {
      const searchParams: Record<string, unknown> = {
        key: this.config.apiKey,
        type: 'restaurant',
        language: 'ja',
      };

      if (params.query) {
        // Text search
        const response = await this.client.get<GooglePlacesResponse>('/textsearch/json', {
          params: {
            ...searchParams,
            query: params.query,
            minprice: params.minPrice,
            maxprice: params.maxPrice,
            opennow: params.openNow,
            pagetoken: params.pageToken,
          },
        });
        return response.data;
      } else if (params.location) {
        // Nearby search
        const response = await this.client.get<GooglePlacesResponse>('/nearbysearch/json', {
          params: {
            ...searchParams,
            location: `${params.location.lat},${params.location.lng}`,
            radius: params.radius || 1000,
            minprice: params.minPrice,
            maxprice: params.maxPrice,
            opennow: params.openNow,
            pagetoken: params.pageToken,
          },
        });
        return response.data;
      } else {
        throw new Error('Either query or location is required');
      }
    } catch (error) {
      console.error('Google Places search error:', error);
      throw error;
    }
  }

  public async getPlaceDetails(placeId: string): Promise<GooglePlace & { formatted_phone_number?: string }> {
    try {
      const response = await this.client.get<{
        result: GooglePlace & { formatted_phone_number?: string };
        status: string;
      }>('/details/json', {
        params: {
          key: this.config.apiKey,
          place_id: placeId,
          fields: 'name,rating,user_ratings_total,price_level,vicinity,formatted_phone_number,opening_hours,photos,geometry,types',
          language: 'ja',
        },
      });

      if (response.data.status !== 'OK') {
        throw new Error(`Place details fetch failed: ${response.data.status}`);
      }

      return response.data.result;
    } catch (error) {
      console.error('Google Places detail fetch error:', error);
      throw error;
    }
  }

  public normalizeRestaurant(place: GooglePlace): NormalizedRestaurant {
    const priceRange = this.normalizePriceLevel(place.price_level);

    return {
      externalId: place.place_id,
      platform: 'googlePlaces',
      name: place.name,
      genre: this.extractGenre(place.types),
      address: place.vicinity,
      priceRange,
      rating: place.rating || 0,
      reviewCount: place.user_ratings_total || 0,
      coordinates: {
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng,
      },
      openingHours: place.opening_hours?.open_now ? 'Open Now' : undefined,
      url: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
      imageUrl: place.photos?.[0]
        ? this.getPhotoUrl(place.photos[0].photo_reference)
        : undefined,
      fetchedAt: new Date(),
    };
  }

  private normalizePriceLevel(priceLevel?: number): {
    min: number;
    max: number;
    category: 'low' | 'medium' | 'high';
  } {
    // Google price_level: 0 = Free, 1 = Inexpensive, 2 = Moderate, 3 = Expensive, 4 = Very Expensive
    switch (priceLevel) {
      case 0:
      case 1:
        return { min: 0, max: 1500, category: 'low' };
      case 2:
        return { min: 1500, max: 3000, category: 'medium' };
      case 3:
      case 4:
        return { min: 3000, max: 10000, category: 'high' };
      default:
        return { min: 0, max: 3000, category: 'medium' };
    }
  }

  private extractGenre(types: string[]): string {
    const genreMap: Record<string, string> = {
      'japanese_restaurant': 'Japanese',
      'italian_restaurant': 'Italian',
      'chinese_restaurant': 'Chinese',
      'korean_restaurant': 'Korean',
      'western_restaurant': 'Western',
      'bar': 'Izakaya',
      'restaurant': 'Restaurant',
    };

    for (const type of types) {
      if (genreMap[type]) {
        return genreMap[type];
      }
    }

    return 'Restaurant';
  }

  private getPhotoUrl(photoReference: string, maxWidth: number = 400): string {
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photoreference=${photoReference}&key=${this.config.apiKey}`;
  }
}