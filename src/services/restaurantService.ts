import { SQLiteConnection } from '@/database/sqlite-connection';
import { Restaurant, SearchLog } from '@/types/database';
import { createError } from '@/middleware/errorHandler';
import { ApiIntegrationService } from './apiIntegrationService';
import { EvaluationResult } from '@/types/evaluation';

export interface RestaurantSearchParams {
  genre?: string;
  location?: string;
  priceRange?: string;
  limit?: number;
  offset?: number;
}

export interface RestaurantWithReviews extends Restaurant {
  avgRating?: number;
  totalReviews?: number;
}

export class RestaurantService {
  private db: SQLiteConnection;
  private apiIntegrationService: ApiIntegrationService;

  constructor() {
    this.db = SQLiteConnection.getInstance();
    this.apiIntegrationService = new ApiIntegrationService();
  }

  public async searchRestaurantsIntegrated(
    params: RestaurantSearchParams,
    userSession?: string
  ): Promise<{
    restaurants: EvaluationResult[];
    totalAvailable: number;
    platformsUsed: string[];
    searchTime: number;
    cached: boolean;
  }> {
    try {
      const result = await this.apiIntegrationService.searchAndEvaluate({
        location: params.location!,
        genre: params.genre,
        priceRange: params.priceRange as 'low' | 'medium' | 'high',
        limit: params.limit,
        offset: params.offset,
      });

      // Log the search if user session is provided
      if (userSession) {
        await this.logIntegratedSearch(userSession, params, result);
      }

      return result;
    } catch (error) {
      console.error('Integrated search error:', error);
      
      // Fallback to local database search
      console.log('Falling back to local database search');
      const localResults = await this.searchRestaurants(params, userSession);
      
      return {
        restaurants: localResults.map(r => this.convertToEvaluationResult(r)),
        totalAvailable: localResults.length,
        platformsUsed: ['local'],
        searchTime: 0,
        cached: false,
      };
    }
  }

  public async searchRestaurants(
    params: RestaurantSearchParams,
    userSession?: string
  ): Promise<RestaurantWithReviews[]> {
    const { genre, location, priceRange, limit = 20, offset = 0 } = params;

    let query = `
      SELECT 
        r.*,
        COALESCE(AVG(rv.rating), 0) as avg_rating,
        COALESCE(SUM(rv.review_count), 0) as total_reviews
      FROM restaurants r
      LEFT JOIN reviews rv ON r.id = rv.restaurant_id
      WHERE 1=1
    `;

    const queryParams: unknown[] = [];

    if (genre) {
      query += ` AND r.genre LIKE ?`;
      queryParams.push(`%${genre}%`);
    }

    if (location) {
      query += ` AND r.location LIKE ?`;
      queryParams.push(`%${location}%`);
    }

    if (priceRange) {
      // Handle price range as min/max values
      const priceRanges: { [key: string]: { min: number; max: number } } = {
        'low': { min: 0, max: 2000 },
        'medium': { min: 2000, max: 5000 },
        'high': { min: 5000, max: 999999 }
      };
      
      const range = priceRanges[priceRange] || priceRanges['medium'];
      query += ` AND r.price_range_min >= ? AND r.price_range_max <= ?`;
      queryParams.push(range.min, range.max);
    }

    query += `
      GROUP BY r.id, r.name, r.genre, r.location, r.address, r.phone, 
               r.price_range_min, r.price_range_max, r.latitude, r.longitude, r.created_at, r.updated_at
      ORDER BY avg_rating DESC, total_reviews DESC
      LIMIT ? OFFSET ?
    `;

    queryParams.push(limit, offset);

    const result = await this.db.query(query, queryParams);
    const restaurants = result as RestaurantWithReviews[];

    if (userSession) {
      await this.logSearch(userSession, params, restaurants);
    }

    return restaurants;
  }

  public async getRestaurantById(id: number): Promise<RestaurantWithReviews | null> {
    const query = `
      SELECT 
        r.*,
        COALESCE(AVG(rv.rating), 0) as avg_rating,
        COALESCE(SUM(rv.review_count), 0) as total_reviews
      FROM restaurants r
      LEFT JOIN reviews rv ON r.id = rv.restaurant_id
      WHERE r.id = ?
      GROUP BY r.id, r.name, r.genre, r.location, r.address, r.phone, 
               r.price_range_min, r.price_range_max, r.latitude, r.longitude, r.created_at, r.updated_at
    `;

    const result = await this.db.query(query, [id]);
    const restaurants = result as RestaurantWithReviews[];

    return restaurants.length > 0 ? restaurants[0] : null;
  }

  public async evaluateRestaurant(
    id: number,
    userId?: number
  ): Promise<{ restaurantId: number; evaluationScore: number }> {
    const restaurant = await this.getRestaurantById(id);
    
    if (!restaurant) {
      throw createError('Restaurant not found', 404);
    }

    const evaluationScore = this.calculateEvaluationScore(restaurant);

    return {
      restaurantId: id,
      evaluationScore,
    };
  }

  private calculateEvaluationScore(restaurant: RestaurantWithReviews): number {
    const avgRating = restaurant.avgRating || 0;
    const totalReviews = restaurant.totalReviews || 0;

    const baseScore = avgRating * 20;
    const reviewWeight = Math.min(totalReviews / 100, 1) * 10;
    const recencyBonus = 5;

    return Math.round((baseScore + reviewWeight + recencyBonus) * 100) / 100;
  }

  private async logSearch(
    userSession: string,
    searchParams: RestaurantSearchParams,
    results: RestaurantWithReviews[]
  ): Promise<void> {
    try {
      await this.db.query(
        'INSERT INTO search_logs (user_session, search_params, results) VALUES (?, ?, ?)',
        [
          userSession,
          JSON.stringify(searchParams),
          JSON.stringify(results.map(r => ({ id: r.id, name: r.name, avgRating: r.avgRating }))),
        ]
      );
    } catch (error) {
      console.error('Failed to log search:', error);
    }
  }

  public async getSearchHistory(userSession: string): Promise<SearchLog[]> {
    const result = await this.db.query(
      'SELECT * FROM search_logs WHERE user_session = ? ORDER BY timestamp DESC LIMIT 10',
      [userSession]
    );

    return result as SearchLog[];
  }

  private async logIntegratedSearch(
    userSession: string,
    searchParams: RestaurantSearchParams,
    results: {
      restaurants: EvaluationResult[];
      totalAvailable: number;
      platformsUsed: string[];
      searchTime: number;
      cached: boolean;
    }
  ): Promise<void> {
    try {
      await this.db.query(
        'INSERT INTO search_logs (user_session, search_params, results) VALUES (?, ?, ?)',
        [
          userSession,
          JSON.stringify({
            ...searchParams,
            type: 'integrated',
            platformsUsed: results.platformsUsed,
            searchTime: results.searchTime,
            cached: results.cached,
          }),
          JSON.stringify({
            totalAvailable: results.totalAvailable,
            restaurants: results.restaurants.map(r => ({
              id: r.restaurantId,
              name: r.restaurantName,
              totalScore: r.totalScore,
              recommendation: r.recommendation,
              platformScores: r.platformScores,
            })),
          }),
        ]
      );
    } catch (error) {
      console.error('Failed to log integrated search:', error);
    }
  }

  private convertToEvaluationResult(restaurant: RestaurantWithReviews): EvaluationResult {
    return {
      restaurantId: restaurant.id.toString(),
      restaurantName: restaurant.name,
      totalScore: (restaurant.avgRating || 0) * 20, // Convert 0-5 to 0-100
      criteria: {
        rating: (restaurant.avgRating || 0) * 20,
        reviewCount: Math.min((restaurant.totalReviews || 0) / 10, 100),
        recency: 80, // Assume local data is somewhat recent
        priceMatch: 100, // Local data matches search criteria
        conditionMatch: 90, // Assume good condition match for local data
      },
      platformScores: [{
        platform: 'local',
        score: (restaurant.avgRating || 0) * 20,
        weight: 1.0,
        available: true,
      }],
      confidence: 0.6, // Lower confidence for local-only data
      recommendation: this.getLocalRecommendation(restaurant.avgRating || 0),
    };
  }

  private getLocalRecommendation(rating: number): 'highly_recommended' | 'recommended' | 'suitable' | 'not_recommended' {
    if (rating >= 4.0) return 'highly_recommended';
    if (rating >= 3.5) return 'recommended';
    if (rating >= 2.5) return 'suitable';
    return 'not_recommended';
  }
}