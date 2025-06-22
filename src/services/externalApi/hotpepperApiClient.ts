import { BaseApiClient } from './baseApiClient';
import { HotpepperResponse, HotpepperShop, NormalizedRestaurant } from '@/types/externalApi';
import { PlatformRatingData, Platform } from '@/types/platformAggregation';
import { SearchQuery } from '@/types/search';
import { config } from '@/utils/config';
import { RateLimitService } from '@/services/rateLimitService';

export class HotpepperApiClient extends BaseApiClient {
  private platform: Platform = 'hotpepper';
  private rateLimitService: RateLimitService;

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
    this.rateLimitService = new RateLimitService();
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
    // レート制限チェック
    const rateLimitResult = await this.rateLimitService.executeWithRateLimit(
      'hotpepper',
      async () => {
        return this.performSearch(params);
      }
    );

    if (!rateLimitResult.success) {
      if (rateLimitResult.error?.message.includes('Rate limit exceeded')) {
        console.warn('🔄 HotPepper API rate limit exceeded, using fallback');
        return this.getFallbackResponse(params);
      }
      throw rateLimitResult.error;
    }

    return rateLimitResult.data!;
  }

  private async performSearch(params: {
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
      // 検索パラメータを最適化
      const searchParams: any = {
        key: this.config.apiKey,
        format: 'json',
        count: params.count || 50, // より多くの結果を取得
        start: params.start || 1,
      };

      // キーワード検索を優先
      if (params.keyword) {
        searchParams.keyword = params.keyword;
      }

      // エリア検索
      if (params.address) {
        searchParams.address = params.address;
      }

      // 座標検索
      if (params.lat && params.lng) {
        searchParams.lat = params.lat;
        searchParams.lng = params.lng;
        searchParams.range = params.range || 5; // より広い範囲で検索
      }

      // ジャンル制限（制限しすぎないよう調整）
      const genreCode = this.mapGenreCode(params.genre);
      if (genreCode) {
        searchParams.genre = genreCode;
      }

      // 予算制限（制限しすぎないよう調整）
      const budgetCode = this.mapBudgetCode(params.budget);
      if (budgetCode) {
        searchParams.budget = budgetCode;
      }

      // パーティー人数（制限しすぎないよう調整）
      if (params.partyCapacity && params.partyCapacity > 0) {
        searchParams.party_capacity = params.partyCapacity;
      }

      console.log('HotPepper search params:', searchParams);

      const response = await this.client.get<HotpepperResponse>('/gourmet/v1/', {
        params: searchParams,
      });

      console.log(`HotPepper API response: ${response.data.results.shop?.length || 0} shops found`);
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

    // より包括的なジャンルマッピング
    const genreMap: Record<string, string> = {
      // 日本料理系
      'Japanese': 'G001',
      'Izakaya': 'G001,G002,G003',
      '居酒屋': 'G001,G002,G003',
      '和食': 'G001',
      '寿司': 'G001',
      'sushi': 'G001',
      
      // 洋食系
      'Italian': 'G006',
      'イタリアン': 'G006',
      'French': 'G005',
      'フレンチ': 'G005',
      'Western': 'G005,G006',
      '洋食': 'G005,G006',
      
      // アジア系
      'Chinese': 'G007',
      '中華': 'G007',
      '中華料理': 'G007',
      'Korean': 'G017',
      '韓国料理': 'G017',
      'Asian': 'G007,G017',
      
      // その他
      'Yakiniku': 'G008',
      '焼肉': 'G008',
      'Ramen': 'G013',
      'ラーメン': 'G013',
      'Cafe': 'G014',
      'カフェ': 'G014',
      'Bar': 'G015',
      'バー': 'G015',
    };

    // 部分マッチも試行
    const lowerGenre = genre.toLowerCase();
    for (const [key, value] of Object.entries(genreMap)) {
      if (key.toLowerCase().includes(lowerGenre) || lowerGenre.includes(key.toLowerCase())) {
        return value;
      }
    }

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

  // Phase 7: 3-Platform Aggregation Methods
  
  /**
   * Phase 7: 統一評価データ取得
   */
  public async getRatingData(restaurantId: string): Promise<PlatformRatingData> {
    try {
      const shopDetail = await this.getRestaurantDetail(restaurantId);
      return this.transformToRatingData(shopDetail);
    } catch (error) {
      console.error(`HotPepper rating data fetch failed for ${restaurantId}:`, error);
      // フォールバック: モックデータを返す
      return this.getMockRatingData(restaurantId);
    }
  }

  /**
   * Phase 7: 検索結果を統一評価データに変換
   */
  public async searchForRatingData(query: SearchQuery): Promise<PlatformRatingData[]> {
    try {
      // より柔軟な検索パラメータを構築
      const searchParams = {
        keyword: query.location,
        address: query.location, // エリア検索も追加
        genre: query.genre,
        partyCapacity: typeof query.capacity === 'number' ? query.capacity : undefined,
        count: Math.min(query.limit || 50, 100), // より多くの結果を取得（最大100）
        start: ((query.page || 1) - 1) * (query.limit || 50) + 1,
      };

      console.log('Searching HotPepper with params:', searchParams);

      const response = await this.searchRestaurants(searchParams);
      
      if (!response.results || !response.results.shop || response.results.shop.length === 0) {
        console.warn('No shops found in HotPepper response, trying fallback search...');
        
        // フォールバック: より緩い条件で再検索
        const fallbackParams = {
          keyword: query.location,
          count: 50,
        };
        
        const fallbackResponse = await this.searchRestaurants(fallbackParams);
        
        if (fallbackResponse.results && fallbackResponse.results.shop && fallbackResponse.results.shop.length > 0) {
          console.log(`Fallback search found ${fallbackResponse.results.shop.length} shops`);
          return fallbackResponse.results.shop.map(shop => this.transformToRatingData(shop));
        }
        
        console.warn('Fallback search also failed, returning mock data');
        return this.getMockSearchRatingData(query);
      }

      console.log(`HotPepper search successful: ${response.results.shop.length} shops found`);
      return response.results.shop.map(shop => this.transformToRatingData(shop));
    } catch (error) {
      console.error('HotPepper search for rating data failed:', error);
      // フォールバック: モックデータを返す
      console.warn('Returning mock data due to API error');
      return this.getMockSearchRatingData(query);
    }
  }

  /**
   * Phase 7: HotPepperショップデータを統一評価形式に変換
   */
  private transformToRatingData(shop: HotpepperShop): PlatformRatingData {
    const dataQuality = this.calculateDataQuality(shop);
    const estimatedRating = this.estimateRatingFromShopData(shop);
    const priceRange = this.normalizeBudget(shop.budget);

    return {
      platform: this.platform,
      restaurantId: shop.id,
      rating: estimatedRating,
      reviewCount: 0, // HotPepperはレビュー数を提供しない
      confidence: 0.7, // API提供データなので中程度の信頼性
      dataQuality,
      priceInfo: {
        min: priceRange.min,
        max: priceRange.max,
      },
      location: {
        latitude: shop.lat,
        longitude: shop.lng,
      },
      additionalInfo: {
        hotpepperSpecific: {
          capacity: shop.party_capacity,
          genre: shop.genre.name,
          food: shop.food?.name,
          access: shop.access,
          wifi: shop.wifi,
          privateRoom: shop.private_room,
          nonSmoking: shop.non_smoking,
          budgetMemo: shop.budget_memo,
          urls: shop.urls,
          photos: shop.photo,
          openingHours: shop.open,
        }
      },
      lastUpdated: new Date(),
      source: `hotpepper:${shop.id}`,
    };
  }

  /**
   * Phase 7: 店舗データから推定評価を算出
   */
  private estimateRatingFromShopData(shop: HotpepperShop): number {
    let score = 3.0; // Base score

    // 情報充実度による調整
    if (shop.catch && shop.catch.length > 20) score += 0.3;
    if (shop.photo?.pc?.l) score += 0.2;
    if (shop.access && shop.access.length > 10) score += 0.2;
    if (shop.wifi === '利用可') score += 0.1;
    if (shop.private_room === 'あり') score += 0.1;
    if (shop.non_smoking === '全面禁煙') score += 0.1;
    if (shop.party_capacity && shop.party_capacity > 20) score += 0.1;

    return Math.min(5.0, Math.max(1.0, score));
  }

  /**
   * Phase 7: データ品質スコア算出
   */
  private calculateDataQuality(shop: HotpepperShop): number {
    let qualityScore = 0;
    let maxScore = 0;

    // 必須情報の存在確認
    const checks = [
      { field: shop.name, weight: 1 },
      { field: shop.address, weight: 1 },
      { field: shop.genre?.name, weight: 0.8 },
      { field: shop.budget?.average, weight: 0.8 },
      { field: shop.lat && shop.lng, weight: 0.6 },
      { field: shop.access, weight: 0.6 },
      { field: shop.photo?.pc?.l, weight: 0.4 },
      { field: shop.open, weight: 0.4 },
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
   * Phase 7: モック評価データ生成（開発用）
   */
  private getMockRatingData(restaurantId: string): PlatformRatingData {
    return {
      platform: this.platform,
      restaurantId,
      rating: 3.5 + Math.random() * 1.5,
      reviewCount: 0, // HotPepper doesn't provide review counts
      confidence: 0.7,
      dataQuality: 0.8,
      priceInfo: {
        min: 2000,
        max: 5000,
      },
      location: {
        latitude: 35.6812,
        longitude: 139.7671,
      },
      additionalInfo: {
        hotpepperSpecific: {
          capacity: 50,
          genre: '居酒屋',
        }
      },
      lastUpdated: new Date(),
      source: `hotpepper_mock:${restaurantId}`,
    };
  }

  /**
   * Phase 7: モック検索評価データ生成（開発用）
   */
  private getMockSearchRatingData(query: SearchQuery): PlatformRatingData[] {
    // より多くのモックデータを生成（開発・テスト用）
    const mockCount = Math.min(query.limit || 20, 50);
    
    const locations = [
      { name: '東京駅', lat: 35.6812, lng: 139.7671 },
      { name: '新宿', lat: 35.6896, lng: 139.6917 },
      { name: '渋谷', lat: 35.6598, lng: 139.7006 },
      { name: '池袋', lat: 35.7295, lng: 139.7109 },
      { name: '銀座', lat: 35.6762, lng: 139.7653 },
    ];
    
    const genres = ['居酒屋', 'イタリアン', '中華料理', '寿司', 'ラーメン', 'カフェ', '焼肉', 'フレンチ'];
    const restaurants = [
      '美味しい', 'おいしい', '人気の', '評判の', '老舗', '新しい', '隠れ家', '話題の',
      '本格', '絶品', '有名', '定番', 'おすすめ', '地元の', '創業', 'こだわり'
    ];

    return Array.from({ length: mockCount }, (_, index) => {
      const location = locations[index % locations.length];
      const genre = query.genre || genres[index % genres.length];
      const restaurant = restaurants[index % restaurants.length];
      
      return {
        platform: this.platform,
        restaurantId: `hotpepper_mock_${query.location}_${index + 1}`,
        rating: 3.5 + Math.random() * 1.5,
        reviewCount: Math.floor(Math.random() * 200) + 10,
        confidence: 0.6 + Math.random() * 0.3,
        dataQuality: 0.7 + Math.random() * 0.3,
        priceInfo: {
          min: 1500 + Math.floor(Math.random() * 2000),
          max: 3000 + Math.floor(Math.random() * 4000),
        },
        location: {
          latitude: location.lat + (Math.random() - 0.5) * 0.02,
          longitude: location.lng + (Math.random() - 0.5) * 0.02,
        },
        additionalInfo: {
          hotpepperSpecific: {
            capacity: 20 + Math.floor(Math.random() * 80),
            genre: genre,
            name: `${restaurant}${genre} ${location.name}店`,
            description: `${query.location}エリアで人気の${genre}店です。`,
            access: `${location.name}から徒歩${1 + Math.floor(Math.random() * 10)}分`,
            wifi: Math.random() > 0.5 ? '利用可' : '利用不可',
            privateRoom: Math.random() > 0.7 ? 'あり' : 'なし',
            nonSmoking: Math.random() > 0.6 ? '全面禁煙' : '分煙',
          }
        },
        lastUpdated: new Date(),
        source: `hotpepper_mock:${index + 1}`,
      };
    });
  }

  /**
   * レート制限時のフォールバックレスポンス
   */
  private getFallbackResponse(params: any): HotpepperResponse {
    console.warn('⚠️ Using HotPepper fallback response due to rate limiting');
    
    return {
      results: {
        api_version: '1.30',
        results_available: 0,
        results_returned: '0',
        results_start: 1,
        shop: [],
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'API rate limit exceeded. Please try again later.',
          suggestion: 'Consider using cached data or alternative data sources.'
        }
      }
    };
  }

  /**
   * API使用状況を取得
   */
  public async getApiUsageStatus(): Promise<{
    platform: string;
    rateLimitInfo: any;
    canUseApi: boolean;
  }> {
    const rateLimitCheck = await this.rateLimitService.checkRateLimit('hotpepper');
    
    return {
      platform: 'hotpepper',
      rateLimitInfo: rateLimitCheck,
      canUseApi: rateLimitCheck.allowed
    };
  }
}