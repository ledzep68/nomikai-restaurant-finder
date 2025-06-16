import { ApiIntegrationService } from '../apiIntegrationService';
import { TestUtils } from '@/test/testUtils';

// Mock external API clients
jest.mock('../externalApi/tabelogApiClient');
jest.mock('../externalApi/hotpepperApiClient');
jest.mock('../externalApi/googlePlacesApiClient');
jest.mock('../externalApi/rettyApiClient');
jest.mock('../cacheService');

describe('ApiIntegrationService', () => {
  let service: ApiIntegrationService;

  beforeAll(async () => {
    await TestUtils.setupTestDatabase();
  });

  afterAll(async () => {
    await TestUtils.teardownTestDatabase();
  });

  beforeEach(() => {
    service = new ApiIntegrationService();
    jest.clearAllMocks();
  });

  describe('searchAndEvaluate', () => {
    test('外部APIから統合データを正常に取得・評価する', async () => {
      // Mock successful API responses
      const mockTabelogData = {
        restaurants: [{
          id: 'tb1',
          name: 'Test Izakaya',
          category: 'Japanese',
          area: 'Shibuya',
          address: 'Shibuya, Tokyo',
          tel: '03-1234-5678',
          openingHours: '17:00-24:00',
          priceRange: '¥2,000～¥3,000',
          rating: 4.2,
          reviewCount: 150,
          url: 'https://tabelog.com/test',
          imageUrl: 'https://tabelog.com/test.jpg',
        }],
        total: 1,
        status: 'OK',
      };

      // Set up mocks to return test data
      jest.spyOn(service as any, 'fetchFromTabelog').mockResolvedValue([
        {
          externalId: 'tb1',
          platform: 'tabelog',
          name: 'Test Izakaya',
          genre: 'Japanese',
          address: 'Shibuya, Tokyo',
          priceRange: { min: 2000, max: 3000, category: 'medium' },
          rating: 4.2,
          reviewCount: 150,
          url: 'https://tabelog.com/test',
          fetchedAt: new Date(),
        },
      ]);

      const params = {
        location: 'Shibuya',
        genre: 'Japanese',
        priceRange: 'medium' as const,
        limit: 20,
        offset: 0,
      };

      const result = await service.searchAndEvaluate(params);

      expect(result).toBeDefined();
      expect(result.restaurants).toHaveLength(1);
      expect(result.restaurants[0].restaurantName).toBe('Test Izakaya');
      expect(result.restaurants[0].totalScore).toBeGreaterThan(0);
      expect(result.platformsUsed).toContain('tabelog');
      expect(result.searchTime).toBeGreaterThan(0);
    }, 15000);

    test('部分的API失敗時にフォールバック機能が動作する', async () => {
      // Mock some APIs to fail
      jest.spyOn(service as any, 'fetchFromTabelog').mockRejectedValue(new Error('API Error'));
      jest.spyOn(service as any, 'fetchFromHotpepper').mockResolvedValue([]);
      jest.spyOn(service as any, 'fetchFromGooglePlaces').mockResolvedValue([
        {
          externalId: 'gp1',
          platform: 'googlePlaces',
          name: 'Fallback Restaurant',
          genre: 'Japanese',
          address: 'Tokyo',
          priceRange: { min: 1000, max: 2000, category: 'low' },
          rating: 3.8,
          reviewCount: 80,
          coordinates: { lat: 35.6762, lng: 139.6503 },
          url: 'https://maps.google.com/test',
          fetchedAt: new Date(),
        },
      ]);
      jest.spyOn(service as any, 'fetchFromRetty').mockRejectedValue(new Error('API Error'));

      const params = {
        location: 'Tokyo',
        genre: 'Japanese',
        limit: 10,
      };

      const result = await service.searchAndEvaluate(params);

      expect(result.restaurants).toHaveLength(1);
      expect(result.restaurants[0].restaurantName).toBe('Fallback Restaurant');
      expect(result.platformsUsed).toContain('googlePlaces');
      expect(result.platformsUsed).not.toContain('tabelog');
    }, 15000);

    test('全API失敗時にエラーが発生する', async () => {
      // Mock all APIs to fail
      jest.spyOn(service as any, 'fetchFromTabelog').mockRejectedValue(new Error('API Error'));
      jest.spyOn(service as any, 'fetchFromHotpepper').mockRejectedValue(new Error('API Error'));
      jest.spyOn(service as any, 'fetchFromGooglePlaces').mockRejectedValue(new Error('API Error'));
      jest.spyOn(service as any, 'fetchFromRetty').mockRejectedValue(new Error('API Error'));

      const params = {
        location: 'Tokyo',
        genre: 'Japanese',
      };

      await expect(service.searchAndEvaluate(params)).rejects.toThrow();
    });

    test('キャッシュ機能が正常に動作する', async () => {
      const mockCacheService = service['cacheService'];
      
      // Mock cache miss initially
      jest.spyOn(mockCacheService, 'get').mockResolvedValueOnce(null);
      jest.spyOn(mockCacheService, 'set').mockResolvedValue();

      // Mock successful API call
      jest.spyOn(service as any, 'fetchFromGooglePlaces').mockResolvedValue([
        {
          externalId: 'cached1',
          platform: 'googlePlaces',
          name: 'Cached Restaurant',
          genre: 'Japanese',
          address: 'Tokyo',
          priceRange: { min: 2000, max: 3000, category: 'medium' },
          rating: 4.0,
          reviewCount: 100,
          url: 'https://maps.google.com/cached',
          fetchedAt: new Date(),
        },
      ]);

      const params = {
        location: 'Tokyo',
        genre: 'Japanese',
      };

      await service.searchAndEvaluate(params);

      // Verify cache was called
      expect(mockCacheService.get).toHaveBeenCalled();
      expect(mockCacheService.set).toHaveBeenCalled();
    });
  });

  describe('レストラン類似性判定', () => {
    test('類似レストランを正しくグループ化する', () => {
      const restaurants = [
        {
          externalId: '1',
          platform: 'tabelog' as const,
          name: '居酒屋 さくら',
          genre: 'Japanese',
          address: '東京都渋谷区',
          priceRange: { min: 2000, max: 3000, category: 'medium' as const },
          rating: 4.0,
          reviewCount: 100,
          url: 'https://example.com/1',
          fetchedAt: new Date(),
        },
        {
          externalId: '2',
          platform: 'googlePlaces' as const,
          name: 'さくら居酒屋',
          genre: 'Japanese',
          address: '東京都渋谷区',
          priceRange: { min: 1800, max: 3200, category: 'medium' as const },
          rating: 4.1,
          reviewCount: 95,
          coordinates: { lat: 35.6762, lng: 139.6503 },
          url: 'https://example.com/2',
          fetchedAt: new Date(),
        },
        {
          externalId: '3',
          platform: 'hotpepper' as const,
          name: '別の店',
          genre: 'Italian',
          address: '東京都新宿区',
          priceRange: { min: 3000, max: 4000, category: 'high' as const },
          rating: 3.5,
          reviewCount: 50,
          url: 'https://example.com/3',
          fetchedAt: new Date(),
        },
      ];

      const groups = service['groupSimilarRestaurants'](restaurants);

      expect(groups).toHaveLength(2);
      expect(groups[0]).toHaveLength(2); // さくら関連
      expect(groups[1]).toHaveLength(1); // 別の店
    });
  });
});