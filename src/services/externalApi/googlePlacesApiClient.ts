import { BaseApiClient } from './baseApiClient';
import { GooglePlacesResponse, GooglePlace, NormalizedRestaurant } from '@/types/externalApi';
import { PlatformRatingData, Platform } from '@/types/platformAggregation';
import { SearchQuery } from '@/types/search';
import { config } from '@/utils/config';

export class GooglePlacesApiClient extends BaseApiClient {
  private platform: Platform = 'google';

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

  // Phase 7: 3-Platform Aggregation Methods

  /**
   * Phase 7: 統一評価データ取得
   */
  public async getRatingData(placeId: string): Promise<PlatformRatingData> {
    try {
      const placeDetail = await this.getPlaceDetails(placeId);
      return this.transformToRatingData(placeDetail);
    } catch (error) {
      console.error(`Google Places rating data fetch failed for ${placeId}:`, error);
      // フォールバック: モックデータを返す
      return this.getMockRatingData(placeId);
    }
  }

  /**
   * Phase 7: 検索結果を統一評価データに変換
   */
  public async searchForRatingData(query: SearchQuery): Promise<PlatformRatingData[]> {
    try {
      const searchParams = {
        query: `${query.location} ${query.genre || 'restaurant'}`,
        type: 'restaurant',
        language: 'ja',
      };

      const response = await this.searchRestaurants(searchParams);
      return response.results.map(place => this.transformToRatingData(place));
    } catch (error) {
      console.error('Google Places search for rating data failed:', error);
      // フォールバック: モックデータを返す
      return this.getMockSearchRatingData(query);
    }
  }

  /**
   * Phase 7: Google PlaceデータをPlatformRatingDataに変換
   */
  private transformToRatingData(place: GooglePlace): PlatformRatingData {
    const dataQuality = this.calculateDataQuality(place);
    const confidence = this.calculateConfidence(place);

    return {
      platform: this.platform,
      restaurantId: place.place_id,
      rating: place.rating || 0,
      reviewCount: place.user_ratings_total || 0,
      confidence,
      dataQuality,
      priceInfo: {
        level: place.price_level,
        min: this.estimateMinPrice(place.price_level),
        max: this.estimateMaxPrice(place.price_level),
      },
      location: {
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
      },
      additionalInfo: {
        googleSpecific: {
          placeId: place.place_id,
          types: place.types,
          businessStatus: place.business_status,
          openingHours: place.opening_hours,
          photos: place.photos?.map(photo => ({
            photoReference: photo.photo_reference,
            width: photo.width,
            height: photo.height,
            url: this.getPhotoUrl(photo.photo_reference)
          })),
          vicinity: place.vicinity,
          formattedAddress: place.formatted_address,
          website: place.website,
          internationalPhoneNumber: place.international_phone_number,
        }
      },
      lastUpdated: new Date(),
      source: `google:${place.place_id}`,
    };
  }

  /**
   * Phase 7: データ品質スコア算出
   */
  private calculateDataQuality(place: GooglePlace): number {
    let qualityScore = 0;
    let maxScore = 0;

    const checks = [
      { field: place.name, weight: 1 },
      { field: place.formatted_address || place.vicinity, weight: 1 },
      { field: place.rating, weight: 0.9 },
      { field: place.user_ratings_total, weight: 0.8 },
      { field: place.geometry?.location, weight: 0.7 },
      { field: place.price_level !== undefined, weight: 0.6 },
      { field: place.photos?.length, weight: 0.5 },
      { field: place.opening_hours, weight: 0.4 },
      { field: place.website, weight: 0.3 },
      { field: place.international_phone_number, weight: 0.3 },
    ];

    checks.forEach(check => {
      maxScore += check.weight;
      if (check.field) {
        qualityScore += check.weight;
      }
    });

    return qualityScore / maxScore;
  }

  /**
   * Phase 7: 信頼度スコア算出
   */
  private calculateConfidence(place: GooglePlace): number {
    let confidence = 0.6; // Base confidence for Google Places

    // レビュー数による信頼度調整
    if (place.user_ratings_total) {
      if (place.user_ratings_total > 100) confidence += 0.3;
      else if (place.user_ratings_total > 50) confidence += 0.2;
      else if (place.user_ratings_total > 10) confidence += 0.1;
    }

    // 評価がある場合の信頼度向上
    if (place.rating && place.rating > 0) {
      confidence += 0.1;
    }

    // ビジネスステータスによる調整
    if (place.business_status === 'OPERATIONAL') {
      confidence += 0.1;
    }

    return Math.min(1.0, confidence);
  }

  /**
   * Phase 7: 価格レベルから最低価格を推定
   */
  private estimateMinPrice(priceLevel?: number): number {
    if (priceLevel === undefined) return 0;
    
    const priceMap = {
      0: 0,     // Free
      1: 500,   // Inexpensive
      2: 1500,  // Moderate
      3: 3000,  // Expensive
      4: 5000,  // Very Expensive
    };
    
    return priceMap[priceLevel] || 0;
  }

  /**
   * Phase 7: 価格レベルから最高価格を推定
   */
  private estimateMaxPrice(priceLevel?: number): number {
    if (priceLevel === undefined) return 0;
    
    const priceMap = {
      0: 0,     // Free
      1: 1500,  // Inexpensive
      2: 3000,  // Moderate
      3: 6000,  // Expensive
      4: 10000, // Very Expensive
    };
    
    return priceMap[priceLevel] || 0;
  }

  /**
   * Phase 7: モック評価データ生成（開発用）
   */
  private getMockRatingData(placeId: string): PlatformRatingData {
    return {
      platform: this.platform,
      restaurantId: placeId,
      rating: 3.8 + Math.random() * 1.2,
      reviewCount: Math.floor(Math.random() * 200) + 50,
      confidence: 0.85,
      dataQuality: 0.9,
      priceInfo: {
        level: Math.floor(Math.random() * 4) + 1,
        min: 1500,
        max: 4000,
      },
      location: {
        latitude: 35.6812,
        longitude: 139.7671,
      },
      additionalInfo: {
        googleSpecific: {
          placeId,
          types: ['restaurant'],
          businessStatus: 'OPERATIONAL',
        }
      },
      lastUpdated: new Date(),
      source: `google_mock:${placeId}`,
    };
  }

  /**
   * Phase 7: モック検索評価データ生成（開発用）
   */
  private getMockSearchRatingData(query: SearchQuery): PlatformRatingData[] {
    return Array.from({ length: query.limit || 5 }, (_, index) => ({
      platform: this.platform,
      restaurantId: `google_mock_${index + 1}`,
      rating: 3.8 + Math.random() * 1.2,
      reviewCount: Math.floor(Math.random() * 200) + 50,
      confidence: 0.85,
      dataQuality: 0.9,
      priceInfo: {
        level: Math.floor(Math.random() * 4) + 1,
        min: 1500 + Math.floor(Math.random() * 1000),
        max: 3000 + Math.floor(Math.random() * 2000),
      },
      location: {
        latitude: 35.6812 + (Math.random() - 0.5) * 0.1,
        longitude: 139.7671 + (Math.random() - 0.5) * 0.1,
      },
      additionalInfo: {
        googleSpecific: {
          placeId: `google_mock_${index + 1}`,
          types: ['restaurant'],
          businessStatus: 'OPERATIONAL',
        }
      },
      lastUpdated: new Date(),
      source: `google_mock:${index + 1}`,
    }));
  }
}