import { DatabaseConnection } from '@/database/connection';
import { HashService } from '@/utils/hash';
import { JwtService } from '@/utils/jwt';

export class TestUtils {
  private static db: DatabaseConnection;

  public static async setupTestDatabase(): Promise<void> {
    this.db = DatabaseConnection.getInstance();
    
    await this.db.query('DELETE FROM search_logs');
    await this.db.query('DELETE FROM reviews');
    await this.db.query('DELETE FROM restaurants');
    await this.db.query('DELETE FROM users');
  }

  public static async teardownTestDatabase(): Promise<void> {
    if (this.db) {
      await this.db.close();
    }
  }

  public static async createTestUser(email = 'test@example.com', password = 'TestPass123'): Promise<{
    id: number;
    email: string;
    token: string;
  }> {
    const hashedPassword = await HashService.hashPassword(password);
    
    const result = await this.db.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [email, hashedPassword]
    );

    const user = (result as { rows: Array<{ id: number; email: string }> }).rows[0];
    const token = JwtService.generateToken({
      userId: user.id,
      email: user.email,
    });

    return {
      id: user.id,
      email: user.email,
      token,
    };
  }

  public static async createTestRestaurant(data: {
    name?: string;
    genre?: string;
    location?: string;
    priceRange?: string;
  } = {}): Promise<{ id: number; name: string; genre: string; location: string; price_range: string }> {
    const {
      name = 'Test Restaurant',
      genre = 'Japanese',
      location = 'Tokyo',
      priceRange = 'medium',
    } = data;

    const result = await this.db.query(
      'INSERT INTO restaurants (name, genre, location, price_range) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, genre, location, priceRange]
    );

    return (result as { rows: Array<{ id: number; name: string; genre: string; location: string; price_range: string }> }).rows[0];
  }

  public static async createTestReview(restaurantId: number, data: {
    platform?: string;
    rating?: number;
    reviewCount?: number;
  } = {}): Promise<void> {
    const {
      platform = 'tabelog',
      rating = 4.5,
      reviewCount = 100,
    } = data;

    await this.db.query(
      'INSERT INTO reviews (restaurant_id, platform, rating, review_count) VALUES ($1, $2, $3, $4)',
      [restaurantId, platform, rating, reviewCount]
    );
  }

  public static getAuthHeader(token: string): { authorization: string } {
    return {
      authorization: `Bearer ${token}`,
    };
  }
}