import request from 'supertest';
import { App } from '@/app';
import { TestUtils } from '@/test/testUtils';

// Mock external API services for integration tests
jest.mock('@/services/apiIntegrationService');

describe('Restaurant Controller Integration Tests', () => {
  let app: App;
  let server: Express.Application;

  beforeAll(async () => {
    await TestUtils.setupTestDatabase();
    app = new App();
    server = app.getApp();
  });

  afterAll(async () => {
    await TestUtils.teardownTestDatabase();
  });

  beforeEach(async () => {
    await TestUtils.setupTestDatabase();
  });

  describe('GET /api/restaurants/search - Integrated Search', () => {
    test('統合検索が正常に動作する', async () => {
      // Mock the API integration service
      const mockApiIntegrationService = require('@/services/apiIntegrationService').ApiIntegrationService;
      mockApiIntegrationService.prototype.searchAndEvaluate.mockResolvedValue({
        restaurants: [
          {
            restaurantId: 'integrated_123',
            restaurantName: 'Mock Integrated Restaurant',
            totalScore: 87.5,
            criteria: {
              rating: 84,
              reviewCount: 75,
              recency: 95,
              priceMatch: 100,
              conditionMatch: 90,
            },
            platformScores: [
              { platform: 'tabelog', score: 85, weight: 0.35, available: true },
              { platform: 'googlePlaces', score: 90, weight: 0.30, available: true },
            ],
            confidence: 0.65,
            recommendation: 'highly_recommended',
          },
        ],
        totalAvailable: 1,
        platformsUsed: ['tabelog', 'googlePlaces'],
        searchTime: 1250,
        cached: false,
      });

      const response = await request(server)
        .get('/api/restaurants/search')
        .query({
          location: 'Shibuya',
          genre: 'Japanese',
          priceRange: 'medium',
        })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('integrated search');
      expect(response.body.data.restaurants).toHaveLength(1);
      expect(response.body.data.restaurants[0].restaurantName).toBe('Mock Integrated Restaurant');
      expect(response.body.data.restaurants[0].totalScore).toBe(87.5);
      expect(response.body.data.meta.integratedSearch).toBe(true);
      expect(response.body.data.meta.platformsUsed).toEqual(['tabelog', 'googlePlaces']);
      expect(response.body.data.meta.searchTime).toBe(1250);
      expect(response.body.data.meta.cached).toBe(false);
    });

    test('統合検索失敗時にローカル検索にフォールバックする', async () => {
      // Create a test restaurant in local database
      const restaurant = await TestUtils.createTestRestaurant({
        name: 'Local Fallback Restaurant',
        genre: 'Japanese',
        location: 'Tokyo',
        priceRange: 'medium',
      });

      await TestUtils.createTestReview(restaurant.id, {
        platform: 'local',
        rating: 4.0,
        reviewCount: 50,
      });

      // Mock API integration service to throw error
      const mockApiIntegrationService = require('@/services/apiIntegrationService').ApiIntegrationService;
      mockApiIntegrationService.prototype.searchAndEvaluate.mockRejectedValue(
        new Error('All external APIs failed')
      );

      const response = await request(server)
        .get('/api/restaurants/search')
        .query({
          location: 'Tokyo',
          genre: 'Japanese',
          priceRange: 'medium',
        })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.restaurants).toHaveLength(1);
      expect(response.body.data.restaurants[0].restaurantName).toBe('Local Fallback Restaurant');
      expect(response.body.data.meta.platformsUsed).toEqual(['local']);
      expect(response.body.data.meta.integratedSearch).toBe(false);
    });

    test('useIntegrated=falseでローカル検索のみ使用', async () => {
      const restaurant = await TestUtils.createTestRestaurant({
        name: 'Local Only Restaurant',
        genre: 'Italian',
        location: 'Ginza',
        priceRange: 'high',
      });

      const response = await request(server)
        .get('/api/restaurants/search')
        .query({
          location: 'Ginza',
          genre: 'Italian',
          useIntegrated: 'false',
        })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('local search');
      expect(response.body.data.meta.integratedSearch).toBe(false);
      expect(response.body.data.meta.platformsUsed).toEqual(['local']);
    });

    test('location未指定時は自動的にローカル検索を使用', async () => {
      const restaurant = await TestUtils.createTestRestaurant({
        name: 'No Location Restaurant',
        genre: 'Korean',
      });

      const response = await request(server)
        .get('/api/restaurants/search')
        .query({
          genre: 'Korean',
          // location is not provided
        })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('local search');
      expect(response.body.data.meta.integratedSearch).toBe(false);
    });
  });

  describe('パフォーマンステスト', () => {
    test('統合検索のレスポンス時間が適切である', async () => {
      const mockApiIntegrationService = require('@/services/apiIntegrationService').ApiIntegrationService;
      mockApiIntegrationService.prototype.searchAndEvaluate.mockResolvedValue({
        restaurants: Array.from({ length: 20 }, (_, i) => ({
          restaurantId: `perf_${i}`,
          restaurantName: `Performance Test Restaurant ${i}`,
          totalScore: 80 + i,
          criteria: {
            rating: 80,
            reviewCount: 70,
            recency: 90,
            priceMatch: 95,
            conditionMatch: 85,
          },
          platformScores: [
            { platform: 'tabelog', score: 80, weight: 0.35, available: true },
          ],
          confidence: 0.35,
          recommendation: 'recommended',
        })),
        totalAvailable: 100,
        platformsUsed: ['tabelog'],
        searchTime: 800,
        cached: false,
      });

      const startTime = Date.now();

      const response = await request(server)
        .get('/api/restaurants/search')
        .query({
          location: 'Tokyo',
          genre: 'Japanese',
          limit: 20,
        })
        .expect(200);

      const responseTime = Date.now() - startTime;

      expect(responseTime).toBeLessThan(5000); // Should respond within 5 seconds
      expect(response.body.data.restaurants).toHaveLength(20);
      expect(response.body.data.meta.searchTime).toBe(800);
    });

    test('大量データ処理でもタイムアウトしない', async () => {
      const mockApiIntegrationService = require('@/services/apiIntegrationService').ApiIntegrationService;
      mockApiIntegrationService.prototype.searchAndEvaluate.mockResolvedValue({
        restaurants: Array.from({ length: 100 }, (_, i) => ({
          restaurantId: `bulk_${i}`,
          restaurantName: `Bulk Test Restaurant ${i}`,
          totalScore: Math.random() * 100,
          criteria: {
            rating: 75,
            reviewCount: 60,
            recency: 85,
            priceMatch: 90,
            conditionMatch: 80,
          },
          platformScores: [
            { platform: 'googlePlaces', score: 75, weight: 1.0, available: true },
          ],
          confidence: 0.25,
          recommendation: 'suitable',
        })),
        totalAvailable: 500,
        platformsUsed: ['googlePlaces'],
        searchTime: 2500,
        cached: false,
      });

      const response = await request(server)
        .get('/api/restaurants/search')
        .query({
          location: 'Tokyo',
          limit: 100,
        })
        .expect(200);

      expect(response.body.data.restaurants).toHaveLength(100);
      expect(response.body.data.totalAvailable).toBe(500);
    }, 10000); // Extended timeout for bulk data test
  });

  describe('エラーハンドリング', () => {
    test('無効なクエリパラメータでバリデーションエラー', async () => {
      const response = await request(server)
        .get('/api/restaurants/search')
        .query({
          limit: -1, // Invalid limit
          offset: 'invalid', // Invalid offset
        })
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Validation failed');
    });

    test('サービス内部エラーでも適切にレスポンスする', async () => {
      const mockApiIntegrationService = require('@/services/apiIntegrationService').ApiIntegrationService;
      mockApiIntegrationService.prototype.searchAndEvaluate.mockImplementation(() => {
        throw new Error('Unexpected service error');
      });

      // Also mock the fallback to fail
      const mockRestaurantService = jest.spyOn(require('@/services/restaurantService').RestaurantService.prototype, 'searchRestaurants');
      mockRestaurantService.mockRejectedValue(new Error('Database error'));

      const response = await request(server)
        .get('/api/restaurants/search')
        .query({
          location: 'Tokyo',
          genre: 'Japanese',
        })
        .expect(500);

      expect(response.body.status).toBe('error');
    });
  });
});