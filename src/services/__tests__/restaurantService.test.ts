import { RestaurantService } from '../restaurantService';
import { TestUtils } from '@/test/testUtils';

describe('RestaurantService', () => {
  let restaurantService: RestaurantService;

  beforeAll(async () => {
    await TestUtils.setupTestDatabase();
    restaurantService = new RestaurantService();
  });

  afterAll(async () => {
    await TestUtils.teardownTestDatabase();
  });

  beforeEach(async () => {
    await TestUtils.setupTestDatabase();
  });

  describe('searchRestaurants', () => {
    test('正常な検索パラメータで結果を返す', async () => {
      const restaurant = await TestUtils.createTestRestaurant({
        name: 'Test Izakaya',
        genre: 'Japanese',
        location: 'Shibuya',
        priceRange: 'medium',
      });

      await TestUtils.createTestReview(restaurant.id, {
        platform: 'tabelog',
        rating: 4.2,
        reviewCount: 50,
      });

      const results = await restaurantService.searchRestaurants({
        genre: 'Japanese',
        location: 'Shibuya',
      });

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Test Izakaya');
      expect(results[0].avgRating).toBeDefined();
    });

    test('一致しない検索条件で空の結果を返す', async () => {
      await TestUtils.createTestRestaurant({
        name: 'Test Restaurant',
        genre: 'Italian',
        location: 'Tokyo',
      });

      const results = await restaurantService.searchRestaurants({
        genre: 'Chinese',
      });

      expect(results).toHaveLength(0);
    });

    test('limit と offset パラメータが正常に動作する', async () => {
      for (let i = 1; i <= 5; i++) {
        await TestUtils.createTestRestaurant({
          name: `Restaurant ${i}`,
          genre: 'Japanese',
        });
      }

      const results = await restaurantService.searchRestaurants({
        genre: 'Japanese',
        limit: 2,
        offset: 1,
      });

      expect(results).toHaveLength(2);
    });
  });

  describe('getRestaurantById', () => {
    test('有効なIDでレストラン詳細を取得', async () => {
      const restaurant = await TestUtils.createTestRestaurant({
        name: 'Specific Restaurant',
      });

      const result = await restaurantService.getRestaurantById(restaurant.id);

      expect(result).toBeTruthy();
      expect(result?.name).toBe('Specific Restaurant');
    });

    test('存在しないIDでnullを返す', async () => {
      const result = await restaurantService.getRestaurantById(99999);
      expect(result).toBeNull();
    });
  });

  describe('evaluateRestaurant', () => {
    test('有効なレストランIDで評価スコアを返す', async () => {
      const restaurant = await TestUtils.createTestRestaurant();
      await TestUtils.createTestReview(restaurant.id, {
        rating: 4.5,
        reviewCount: 100,
      });

      const result = await restaurantService.evaluateRestaurant(restaurant.id);

      expect(result).toHaveProperty('restaurantId', restaurant.id);
      expect(result).toHaveProperty('evaluationScore');
      expect(typeof result.evaluationScore).toBe('number');
      expect(result.evaluationScore).toBeGreaterThan(0);
    });

    test('存在しないレストランIDでエラーを返す', async () => {
      await expect(
        restaurantService.evaluateRestaurant(99999)
      ).rejects.toThrow('Restaurant not found');
    });
  });
});