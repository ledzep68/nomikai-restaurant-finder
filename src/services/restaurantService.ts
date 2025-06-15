import { DatabaseConnection } from '@/database/connection';
import { Restaurant, SearchLog } from '@/types/database';
import { createError } from '@/middleware/errorHandler';

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
  private db: DatabaseConnection;

  constructor() {
    this.db = DatabaseConnection.getInstance();
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
    let paramCount = 0;

    if (genre) {
      paramCount++;
      query += ` AND r.genre ILIKE $${paramCount}`;
      queryParams.push(`%${genre}%`);
    }

    if (location) {
      paramCount++;
      query += ` AND r.location ILIKE $${paramCount}`;
      queryParams.push(`%${location}%`);
    }

    if (priceRange) {
      paramCount++;
      query += ` AND r.price_range = $${paramCount}`;
      queryParams.push(priceRange);
    }

    query += `
      GROUP BY r.id, r.name, r.genre, r.location, r.price_range, r.created_at
      ORDER BY avg_rating DESC, total_reviews DESC
    `;

    paramCount++;
    query += ` LIMIT $${paramCount}`;
    queryParams.push(limit);

    paramCount++;
    query += ` OFFSET $${paramCount}`;
    queryParams.push(offset);

    const result = await this.db.query(query, queryParams);
    const restaurants = (result as { rows: RestaurantWithReviews[] }).rows;

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
      WHERE r.id = $1
      GROUP BY r.id, r.name, r.genre, r.location, r.price_range, r.created_at
    `;

    const result = await this.db.query(query, [id]);
    const restaurants = (result as { rows: RestaurantWithReviews[] }).rows;

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
        'INSERT INTO search_logs (user_session, search_params, results) VALUES ($1, $2, $3)',
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
      'SELECT * FROM search_logs WHERE user_session = $1 ORDER BY timestamp DESC LIMIT 10',
      [userSession]
    );

    return (result as { rows: SearchLog[] }).rows;
  }
}