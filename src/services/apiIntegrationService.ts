import { HotpepperApiClient } from './externalApi/hotpepperApiClient';
import { GooglePlacesApiClient } from './externalApi/googlePlacesApiClient';
import { EvaluationService } from './evaluationService';
import { CacheService } from './cacheService';
import { NormalizedRestaurant } from '@/types/externalApi';
import { SearchConditions, EvaluationResult } from '@/types/evaluation';
import { createError } from '@/middleware/errorHandler';

export interface IntegratedSearchParams extends SearchConditions {
  limit?: number;
  offset?: number;
}

export interface IntegratedSearchResult {
  restaurants: EvaluationResult[];
  totalAvailable: number;
  platformsUsed: string[];
  searchTime: number;
  cached: boolean;
  attributions: {
    [platform: string]: string;
  };
  legalNotices: {
    dataUsage: string;
    privacyPolicy: string;
  };
}

export class ApiIntegrationService {
  private hotpepperClient: HotpepperApiClient;
  private googlePlacesClient: GooglePlacesApiClient;
  private evaluationService: EvaluationService;
  private cacheService: CacheService;

  // Legal compliance attributions
  private readonly attributions = {
    hotpepper: '画像提供：ホットペッパー グルメ',
    googlePlaces: 'powered by Google',
  };

  // Cache duration settings (compliance with API terms)
  private readonly cacheDurations = {
    hotpepper: 86400,     // 24 hours (max allowed by Hotpepper)
    googlePlaces: 2592000, // 30 days (max allowed by Google)
    default: 3600,        // 1 hour default
  };

  constructor() {
    this.hotpepperClient = new HotpepperApiClient();
    this.googlePlacesClient = new GooglePlacesApiClient();
    this.evaluationService = new EvaluationService();
    this.cacheService = new CacheService();
  }

  public async searchAndEvaluate(
    params: IntegratedSearchParams
  ): Promise<IntegratedSearchResult> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(params);

    // Check cache first
    const cachedResult = await this.cacheService.get<IntegratedSearchResult>(cacheKey);
    if (cachedResult) {
      return { ...cachedResult, cached: true };
    }

    try {
      // Fetch data from all APIs in parallel
      const apiResults = await this.fetchFromAllAPIs(params);
      
      // Group restaurants by similarity
      const groupedRestaurants = this.groupSimilarRestaurants(apiResults.restaurants);
      
      // Evaluate each restaurant group
      const evaluatedRestaurants = groupedRestaurants.map(group => 
        this.evaluationService.calculateTotalScore(group, params)
      );

      // Sort by total score
      evaluatedRestaurants.sort((a, b) => b.totalScore - a.totalScore);

      // Apply pagination
      const paginatedResults = this.applyPagination(
        evaluatedRestaurants,
        params.limit || 20,
        params.offset || 0
      );

      const result: IntegratedSearchResult = {
        restaurants: paginatedResults,
        totalAvailable: evaluatedRestaurants.length,
        platformsUsed: apiResults.platformsUsed,
        searchTime: Date.now() - startTime,
        cached: false,
        attributions: this.getAttributions(apiResults.platformsUsed),
        legalNotices: {
          dataUsage: 'このサービスは外部APIから取得したデータを利用しています。データの正確性については各プラットフォームにお問い合わせください。',
          privacyPolicy: '/privacy-policy',
        },
      };

      // Cache the result with appropriate duration
      const cacheDuration = this.getCacheDuration(apiResults.platformsUsed);
      await this.cacheService.set(cacheKey, result, cacheDuration);

      return result;
    } catch (error) {
      console.error('API integration error:', error);
      
      // Try to return partial results if some APIs failed
      const fallbackResult = await this.handlePartialFailure(params);
      if (fallbackResult) {
        return fallbackResult;
      }
      
      throw error;
    }
  }

  private async fetchFromAllAPIs(params: IntegratedSearchParams): Promise<{
    restaurants: NormalizedRestaurant[];
    platformsUsed: string[];
  }> {
    const apiCalls = [
      this.fetchFromTabelog(params),
      this.fetchFromHotpepper(params),
      this.fetchFromGooglePlaces(params),
      this.fetchFromRetty(params),
    ];

    const results = await Promise.allSettled(apiCalls);
    const restaurants: NormalizedRestaurant[] = [];
    const platformsUsed: string[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        restaurants.push(...result.value);
        platformsUsed.push(['tabelog', 'hotpepper', 'googlePlaces', 'retty'][index]);
      } else if (result.status === 'rejected') {
        console.error(`API call failed:`, result.reason);
      }
    });

    if (restaurants.length === 0) {
      throw createError('No restaurants found from any API', 404);
    }

    return { restaurants, platformsUsed };
  }

  private async fetchFromTabelog(params: IntegratedSearchParams): Promise<NormalizedRestaurant[]> {
    try {
      const response = await this.tabelogClient.searchRestaurants({
        area: params.location,
        genre: params.genre,
        priceRange: params.priceRange,
        limit: 50, // Fetch more for better matching
      });

      return response.restaurants.map(r => this.tabelogClient.normalizeRestaurant(r));
    } catch (error) {
      console.error('Tabelog fetch error:', error);
      return [];
    }
  }

  private async fetchFromHotpepper(params: IntegratedSearchParams): Promise<NormalizedRestaurant[]> {
    try {
      const response = await this.hotpepperClient.searchRestaurants({
        address: params.location,
        genre: params.genre,
        budget: params.priceRange,
        partyCapacity: params.partySize,
        count: 50,
      });

      return response.results.shop.map(s => this.hotpepperClient.normalizeRestaurant(s));
    } catch (error) {
      console.error('Hotpepper fetch error:', error);
      return [];
    }
  }

  private async fetchFromGooglePlaces(params: IntegratedSearchParams): Promise<NormalizedRestaurant[]> {
    try {
      const query = `${params.genre || 'restaurant'} ${params.location}`;
      const priceMap = { low: 1, medium: 2, high: 3 };
      
      const response = await this.googlePlacesClient.searchRestaurants({
        query,
        maxPrice: params.priceRange ? priceMap[params.priceRange] : undefined,
      });

      return response.results.map(p => this.googlePlacesClient.normalizeRestaurant(p));
    } catch (error) {
      console.error('Google Places fetch error:', error);
      return [];
    }
  }

  private async fetchFromRetty(params: IntegratedSearchParams): Promise<NormalizedRestaurant[]> {
    try {
      const priceRanges = {
        low: { min: 0, max: 2000 },
        medium: { min: 2000, max: 4000 },
        high: { min: 4000, max: 10000 },
      };

      const priceRange = params.priceRange ? priceRanges[params.priceRange] : undefined;

      const response = await this.rettyClient.searchRestaurants({
        area: params.location,
        category: params.genre,
        priceMin: priceRange?.min,
        priceMax: priceRange?.max,
        perPage: 50,
      });

      return response.restaurants.map(r => this.rettyClient.normalizeRestaurant(r));
    } catch (error) {
      console.error('Retty fetch error:', error);
      return [];
    }
  }

  private groupSimilarRestaurants(restaurants: NormalizedRestaurant[]): NormalizedRestaurant[][] {
    const groups: NormalizedRestaurant[][] = [];
    const used = new Set<number>();

    restaurants.forEach((restaurant, index) => {
      if (used.has(index)) return;

      const group = [restaurant];
      used.add(index);

      // Find similar restaurants
      restaurants.forEach((other, otherIndex) => {
        if (used.has(otherIndex)) return;

        if (this.areSimilarRestaurants(restaurant, other)) {
          group.push(other);
          used.add(otherIndex);
        }
      });

      groups.push(group);
    });

    return groups;
  }

  private areSimilarRestaurants(a: NormalizedRestaurant, b: NormalizedRestaurant): boolean {
    // Name similarity check
    const nameA = this.normalizeRestaurantName(a.name);
    const nameB = this.normalizeRestaurantName(b.name);
    
    if (this.calculateSimilarity(nameA, nameB) > 0.8) {
      return true;
    }

    // Location proximity check (if coordinates available)
    if (a.coordinates && b.coordinates) {
      const distance = this.calculateDistance(
        a.coordinates.lat,
        a.coordinates.lng,
        b.coordinates.lat,
        b.coordinates.lng
      );
      
      // Within 100 meters and similar genre
      if (distance < 0.1 && a.genre === b.genre) {
        return true;
      }
    }

    return false;
  }

  private normalizeRestaurantName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[店舗支店]/g, '')
      .replace(/[\s　]/g, '')
      .replace(/[・]/g, '')
      .trim();
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.getEditDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private getEditDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private applyPagination<T>(items: T[], limit: number, offset: number): T[] {
    return items.slice(offset, offset + limit);
  }

  private generateCacheKey(params: IntegratedSearchParams): string {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        acc[key] = params[key as keyof IntegratedSearchParams];
        return acc;
      }, {} as Record<string, unknown>);
    
    return `search:${JSON.stringify(sortedParams)}`;
  }

  private async handlePartialFailure(
    params: IntegratedSearchParams
  ): Promise<IntegratedSearchResult | null> {
    // Try to get cached results even if expired
    const cacheKey = this.generateCacheKey(params);
    const staleResult = await this.cacheService.get<IntegratedSearchResult>(
      cacheKey,
      { includeExpired: true }
    );
    
    if (staleResult) {
      console.log('Returning stale cached results due to API failures');
      return { ...staleResult, cached: true };
    }
    
    return null;
  }
}