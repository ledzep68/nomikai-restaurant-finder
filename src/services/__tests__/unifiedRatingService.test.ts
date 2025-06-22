import { UnifiedRatingService } from '../unifiedRatingService';
import { PlatformRatingData, AggregationConfig } from '@/types/platformAggregation';
import { SearchQuery } from '@/types/search';

// Mock the API clients
jest.mock('../externalApi/hotpepperApiClient');
jest.mock('../externalApi/googlePlacesApiClient');
jest.mock('../externalApi/tabelogScrapingClient');

describe('UnifiedRatingService', () => {
  let service: UnifiedRatingService;
  let mockConfig: AggregationConfig;

  beforeEach(() => {
    mockConfig = {
      weights: {
        google: 0.4,
        tabelog: 0.3,
        hotpepper: 0.3,
      },
      algorithm: 'weighted_average',
      qualityThreshold: 0.5,
      confidenceThreshold: 0.3,
      enableDynamicWeights: false,
    };

    service = new UnifiedRatingService(mockConfig);
  });

  describe('Configuration', () => {
    it('should normalize weights to sum to 1', () => {
      const configWithUnnormalizedWeights = {
        weights: {
          google: 0.6,
          tabelog: 0.6,
          hotpepper: 0.6,
        },
        algorithm: 'weighted_average' as const,
        qualityThreshold: 0.5,
        confidenceThreshold: 0.3,
        enableDynamicWeights: false,
      };

      const testService = new UnifiedRatingService(configWithUnnormalizedWeights);
      const config = testService.getConfig();
      
      const totalWeight = Object.values(config.weights).reduce((sum, weight) => sum + weight, 0);
      expect(Math.abs(totalWeight - 1)).toBeLessThan(0.001);
    });

    it('should validate configuration correctly', () => {
      const result = service.validateConfig();
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid configuration', () => {
      service.updateConfig({
        qualityThreshold: 1.5,
        confidenceThreshold: -0.1,
      });

      const result = service.validateConfig();
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Weighted Average Calculation', () => {
    it('should calculate weighted average correctly', () => {
      const mockPlatformData: PlatformRatingData[] = [
        {
          platform: 'google',
          restaurantId: 'test-1',
          rating: 4.0,
          reviewCount: 100,
          confidence: 0.9,
          dataQuality: 0.8,
          lastUpdated: new Date(),
          source: 'google:test-1',
        },
        {
          platform: 'tabelog',
          restaurantId: 'test-1',
          rating: 3.5,
          reviewCount: 50,
          confidence: 0.7,
          dataQuality: 0.7,
          lastUpdated: new Date(),
          source: 'tabelog:test-1',
        },
        {
          platform: 'hotpepper',
          restaurantId: 'test-1',
          rating: 4.5,
          reviewCount: 20,
          confidence: 0.6,
          dataQuality: 0.6,
          lastUpdated: new Date(),
          source: 'hotpepper:test-1',
        },
      ];

      // Access private method for testing
      const calculateUnifiedRating = (service as any).calculateUnifiedRating.bind(service);
      
      return calculateUnifiedRating('test-1', mockPlatformData).then((result: any) => {
        expect(result).not.toBeNull();
        expect(result.aggregatedScore).toBeGreaterThan(3.5);
        expect(result.aggregatedScore).toBeLessThan(4.5);
        expect(result.platforms).toHaveLength(3);
        expect(result.totalReviews).toBe(170);
      });
    });

    it('should filter out low quality data', () => {
      const mockPlatformData: PlatformRatingData[] = [
        {
          platform: 'google',
          restaurantId: 'test-2',
          rating: 4.0,
          reviewCount: 100,
          confidence: 0.9,
          dataQuality: 0.8,
          lastUpdated: new Date(),
          source: 'google:test-2',
        },
        {
          platform: 'tabelog',
          restaurantId: 'test-2',
          rating: 3.5,
          reviewCount: 50,
          confidence: 0.2, // Below confidence threshold
          dataQuality: 0.7,
          lastUpdated: new Date(),
          source: 'tabelog:test-2',
        },
        {
          platform: 'hotpepper',
          restaurantId: 'test-2',
          rating: 4.5,
          reviewCount: 20,
          confidence: 0.6,
          dataQuality: 0.3, // Below quality threshold
          lastUpdated: new Date(),
          source: 'hotpepper:test-2',
        },
      ];

      const calculateUnifiedRating = (service as any).calculateUnifiedRating.bind(service);
      
      return calculateUnifiedRating('test-2', mockPlatformData).then((result: any) => {
        expect(result).not.toBeNull();
        expect(result.platforms).toHaveLength(1); // Only Google data should pass
        expect(result.platforms[0].platform).toBe('google');
      });
    });
  });

  describe('Dynamic Weight Adjustment', () => {
    beforeEach(() => {
      service.updateConfig({ enableDynamicWeights: true });
    });

    it('should adjust weights based on data quality', () => {
      const mockPlatformData: PlatformRatingData[] = [
        {
          platform: 'google',
          restaurantId: 'test-3',
          rating: 4.0,
          reviewCount: 200, // High review count
          confidence: 0.95, // High confidence
          dataQuality: 0.9, // High quality
          lastUpdated: new Date(),
          source: 'google:test-3',
        },
        {
          platform: 'tabelog',
          restaurantId: 'test-3',
          rating: 3.5,
          reviewCount: 10, // Low review count
          confidence: 0.5, // Medium confidence
          dataQuality: 0.5, // Medium quality
          lastUpdated: new Date(),
          source: 'tabelog:test-3',
        },
      ];

      const calculateDynamicWeights = (service as any).calculateDynamicWeights.bind(service);
      const adjustedWeights = calculateDynamicWeights(mockPlatformData);

      // Google should get a higher weight due to better quality metrics
      expect(adjustedWeights.google).toBeGreaterThan(adjustedWeights.tabelog);
    });
  });

  describe('Confidence and Reliability Calculation', () => {
    it('should calculate unified confidence correctly', () => {
      const mockPlatformData: PlatformRatingData[] = [
        {
          platform: 'google',
          restaurantId: 'test-4',
          rating: 4.0,
          reviewCount: 100,
          confidence: 0.9,
          dataQuality: 0.8,
          lastUpdated: new Date(),
          source: 'google:test-4',
        },
        {
          platform: 'tabelog',
          restaurantId: 'test-4',
          rating: 4.1,
          reviewCount: 50,
          confidence: 0.7,
          dataQuality: 0.7,
          lastUpdated: new Date(),
          source: 'tabelog:test-4',
        },
      ];

      const calculateUnifiedConfidence = (service as any).calculateUnifiedConfidence.bind(service);
      const weights = { google: 0.6, tabelog: 0.4, hotpepper: 0 };
      
      const confidence = calculateUnifiedConfidence(mockPlatformData, weights);
      expect(confidence).toBeGreaterThan(0.7);
      expect(confidence).toBeLessThan(0.9);
    });

    it('should calculate reliability score based on rating variance', () => {
      const calculateReliabilityScore = (service as any).calculateReliabilityScore.bind(service);
      
      // Low variance case (high reliability)
      const lowVarianceData: PlatformRatingData[] = [
        {
          platform: 'google',
          restaurantId: 'test-5',
          rating: 4.0,
          reviewCount: 100,
          confidence: 0.9,
          dataQuality: 0.8,
          lastUpdated: new Date(),
          source: 'google:test-5',
        },
        {
          platform: 'tabelog',
          restaurantId: 'test-5',
          rating: 4.1,
          reviewCount: 50,
          confidence: 0.7,
          dataQuality: 0.7,
          lastUpdated: new Date(),
          source: 'tabelog:test-5',
        },
      ];

      // High variance case (low reliability)
      const highVarianceData: PlatformRatingData[] = [
        {
          platform: 'google',
          restaurantId: 'test-6',
          rating: 5.0,
          reviewCount: 100,
          confidence: 0.9,
          dataQuality: 0.8,
          lastUpdated: new Date(),
          source: 'google:test-6',
        },
        {
          platform: 'tabelog',
          restaurantId: 'test-6',
          rating: 2.5,
          reviewCount: 50,
          confidence: 0.7,
          dataQuality: 0.7,
          lastUpdated: new Date(),
          source: 'tabelog:test-6',
        },
      ];

      const lowVarianceReliability = calculateReliabilityScore(lowVarianceData);
      const highVarianceReliability = calculateReliabilityScore(highVarianceData);

      expect(lowVarianceReliability).toBeGreaterThan(highVarianceReliability);
    });
  });

  describe('Data Completeness', () => {
    it('should calculate data completeness correctly', () => {
      const calculateDataCompleteness = (service as any).calculateDataCompleteness.bind(service);
      
      // All platforms available
      const completeData: PlatformRatingData[] = [
        {
          platform: 'google',
          restaurantId: 'test-7',
          rating: 4.0,
          reviewCount: 100,
          confidence: 0.9,
          dataQuality: 0.8,
          lastUpdated: new Date(),
          source: 'google:test-7',
        },
        {
          platform: 'tabelog',
          restaurantId: 'test-7',
          rating: 3.5,
          reviewCount: 50,
          confidence: 0.7,
          dataQuality: 0.7,
          lastUpdated: new Date(),
          source: 'tabelog:test-7',
        },
        {
          platform: 'hotpepper',
          restaurantId: 'test-7',
          rating: 4.5,
          reviewCount: 20,
          confidence: 0.6,
          dataQuality: 0.6,
          lastUpdated: new Date(),
          source: 'hotpepper:test-7',
        },
      ];

      // Only Google available
      const partialData: PlatformRatingData[] = [
        {
          platform: 'google',
          restaurantId: 'test-8',
          rating: 4.0,
          reviewCount: 100,
          confidence: 0.9,
          dataQuality: 0.8,
          lastUpdated: new Date(),
          source: 'google:test-8',
        },
      ];

      expect(calculateDataCompleteness(completeData)).toBe(1.0);
      expect(calculateDataCompleteness(partialData)).toBeCloseTo(0.33, 1);
    });
  });

  describe('Error Handling', () => {
    it('should handle empty platform data gracefully', () => {
      const calculateUnifiedRating = (service as any).calculateUnifiedRating.bind(service);
      
      return calculateUnifiedRating('test-empty', []).then((result: any) => {
        expect(result).toBeNull();
      });
    });

    it('should handle all platforms failing quality thresholds', () => {
      const mockPlatformData: PlatformRatingData[] = [
        {
          platform: 'google',
          restaurantId: 'test-fail',
          rating: 4.0,
          reviewCount: 100,
          confidence: 0.1, // Below threshold
          dataQuality: 0.1, // Below threshold
          lastUpdated: new Date(),
          source: 'google:test-fail',
        },
      ];

      const calculateUnifiedRating = (service as any).calculateUnifiedRating.bind(service);
      
      return calculateUnifiedRating('test-fail', mockPlatformData).then((result: any) => {
        expect(result).toBeNull();
      });
    });
  });

  describe('Integration Tests', () => {
    it('should process a realistic restaurant rating successfully', () => {
      const realisticData: PlatformRatingData[] = [
        {
          platform: 'google',
          restaurantId: 'realistic-test',
          rating: 4.2,
          reviewCount: 156,
          confidence: 0.85,
          dataQuality: 0.9,
          priceInfo: {
            level: 2,
            min: 1500,
            max: 3000,
          },
          location: {
            latitude: 35.6812,
            longitude: 139.7671,
          },
          lastUpdated: new Date(),
          source: 'google:realistic-test',
        },
        {
          platform: 'tabelog',
          restaurantId: 'realistic-test',
          rating: 3.8,
          reviewCount: 89,
          confidence: 0.75,
          dataQuality: 0.7,
          priceInfo: {
            dinner: '¥3,000~¥3,999',
            lunch: '¥1,000~¥1,999',
          },
          location: {
            latitude: 35.6812,
            longitude: 139.7671,
          },
          lastUpdated: new Date(),
          source: 'tabelog:realistic-test',
        },
        {
          platform: 'hotpepper',
          restaurantId: 'realistic-test',
          rating: 4.1,
          reviewCount: 0, // HotPepper doesn't provide review counts
          confidence: 0.7,
          dataQuality: 0.8,
          priceInfo: {
            min: 2000,
            max: 4000,
          },
          location: {
            latitude: 35.6812,
            longitude: 139.7671,
          },
          lastUpdated: new Date(),
          source: 'hotpepper:realistic-test',
        },
      ];

      const calculateUnifiedRating = (service as any).calculateUnifiedRating.bind(service);
      
      return calculateUnifiedRating('realistic-test', realisticData).then((result: any) => {
        expect(result).not.toBeNull();
        expect(result.aggregatedScore).toBeGreaterThan(3.8);
        expect(result.aggregatedScore).toBeLessThan(4.3);
        expect(result.confidence).toBeGreaterThan(0.7);
        expect(result.dataCompleteness).toBe(1.0);
        expect(result.reliabilityScore).toBeGreaterThan(0.5);
        expect(result.totalReviews).toBe(245);
        expect(result.platforms).toHaveLength(3);
      });
    });
  });
});