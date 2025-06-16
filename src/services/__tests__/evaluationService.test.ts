import { EvaluationService } from '../evaluationService';
import { NormalizedRestaurant } from '@/types/externalApi';
import { SearchConditions } from '@/types/evaluation';

describe('EvaluationService', () => {
  let service: EvaluationService;

  beforeEach(() => {
    service = new EvaluationService();
  });

  describe('calculateTotalScore', () => {
    test('複数プラットフォームの評価を正しく統合する', () => {
      const restaurants: NormalizedRestaurant[] = [
        {
          externalId: 'tb1',
          platform: 'tabelog',
          name: 'Test Restaurant',
          genre: 'Japanese',
          address: 'Tokyo',
          priceRange: { min: 2000, max: 3000, category: 'medium' },
          rating: 4.2,
          reviewCount: 150,
          url: 'https://tabelog.com/test',
          fetchedAt: new Date(),
        },
        {
          externalId: 'gp1',
          platform: 'googlePlaces',
          name: 'Test Restaurant',
          genre: 'Japanese',
          address: 'Tokyo',
          priceRange: { min: 2000, max: 3000, category: 'medium' },
          rating: 4.0,
          reviewCount: 200,
          coordinates: { lat: 35.6762, lng: 139.6503 },
          url: 'https://maps.google.com/test',
          fetchedAt: new Date(),
        },
      ];

      const conditions: SearchConditions = {
        location: 'Tokyo',
        genre: 'Japanese',
        priceRange: 'medium',
      };

      const result = service.calculateTotalScore(restaurants, conditions);

      expect(result.restaurantName).toBe('Test Restaurant');
      expect(result.totalScore).toBeGreaterThan(70); // High score expected
      expect(result.platformScores).toHaveLength(2);
      expect(result.platformScores.find(p => p.platform === 'tabelog')).toBeDefined();
      expect(result.platformScores.find(p => p.platform === 'googlePlaces')).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0.4); // 2 out of 4 platforms
      expect(result.recommendation).toBe('recommended');
    });

    test('単一プラットフォームでも評価を計算する', () => {
      const restaurants: NormalizedRestaurant[] = [
        {
          externalId: 'gp1',
          platform: 'googlePlaces',
          name: 'Solo Restaurant',
          genre: 'Italian',
          address: 'Shibuya',
          priceRange: { min: 3000, max: 4000, category: 'high' },
          rating: 4.8,
          reviewCount: 300,
          coordinates: { lat: 35.6762, lng: 139.6503 },
          url: 'https://maps.google.com/solo',
          fetchedAt: new Date(),
        },
      ];

      const conditions: SearchConditions = {
        location: 'Shibuya',
        genre: 'Italian',
        priceRange: 'high',
      };

      const result = service.calculateTotalScore(restaurants, conditions);

      expect(result.totalScore).toBeGreaterThan(85); // Very high score expected
      expect(result.platformScores).toHaveLength(1);
      expect(result.confidence).toBe(0.25); // 1 out of 4 platforms
      expect(result.recommendation).toBe('highly_recommended');
    });

    test('価格範囲不一致時にスコアが減少する', () => {
      const restaurants: NormalizedRestaurant[] = [
        {
          externalId: 'hp1',
          platform: 'hotpepper',
          name: 'Expensive Restaurant',
          genre: 'French',
          address: 'Ginza',
          priceRange: { min: 8000, max: 12000, category: 'high' },
          rating: 4.5,
          reviewCount: 80,
          url: 'https://hotpepper.jp/expensive',
          fetchedAt: new Date(),
        },
      ];

      const conditions: SearchConditions = {
        location: 'Ginza',
        genre: 'French',
        priceRange: 'low', // Mismatch: restaurant is high, user wants low
      };

      const result = service.calculateTotalScore(restaurants, conditions);

      expect(result.criteria.priceMatch).toBeLessThan(100);
      expect(result.totalScore).toBeLessThan(80); // Lower due to price mismatch
    });

    test('レビュー数が少ない場合のスコア調整', () => {
      const restaurants: NormalizedRestaurant[] = [
        {
          externalId: 'rt1',
          platform: 'retty',
          name: 'New Restaurant',
          genre: 'Korean',
          address: 'Shinjuku',
          priceRange: { min: 1500, max: 2500, category: 'medium' },
          rating: 4.9, // Very high rating but...
          reviewCount: 5, // Very few reviews
          url: 'https://retty.me/new',
          fetchedAt: new Date(),
        },
      ];

      const conditions: SearchConditions = {
        location: 'Shinjuku',
        genre: 'Korean',
        priceRange: 'medium',
      };

      const result = service.calculateTotalScore(restaurants, conditions);

      expect(result.criteria.reviewCount).toBeLessThan(50); // Low review weight
      expect(result.totalScore).toBeLessThan(85); // Despite high rating, total is lower
      expect(result.confidence).toBe(0.25); // Low confidence due to single platform
    });

    test('古いデータの場合は最新性スコアが低下する', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 30); // 30 days ago

      const restaurants: NormalizedRestaurant[] = [
        {
          externalId: 'tb2',
          platform: 'tabelog',
          name: 'Old Data Restaurant',
          genre: 'Chinese',
          address: 'Akasaka',
          priceRange: { min: 2000, max: 3000, category: 'medium' },
          rating: 4.0,
          reviewCount: 100,
          url: 'https://tabelog.com/old',
          fetchedAt: oldDate, // Old data
        },
      ];

      const conditions: SearchConditions = {
        location: 'Akasaka',
        genre: 'Chinese',
      };

      const result = service.calculateTotalScore(restaurants, conditions);

      expect(result.criteria.recency).toBeLessThan(50); // Low recency score
    });
  });

  describe('推奨レベル判定', () => {
    test('高スコア・高信頼度で highly_recommended', () => {
      const service = new EvaluationService();
      const recommendation = service['getRecommendationLevel'](90, 0.8);
      expect(recommendation).toBe('highly_recommended');
    });

    test('中スコア・中信頼度で recommended', () => {
      const service = new EvaluationService();
      const recommendation = service['getRecommendationLevel'](75, 0.6);
      expect(recommendation).toBe('recommended');
    });

    test('低スコアで not_recommended', () => {
      const service = new EvaluationService();
      const recommendation = service['getRecommendationLevel'](40, 0.5);
      expect(recommendation).toBe('not_recommended');
    });

    test('高スコアでも低信頼度では推奨レベルが下がる', () => {
      const service = new EvaluationService();
      const recommendation = service['getRecommendationLevel'](85, 0.3);
      expect(recommendation).toBe('recommended'); // Should be lower than highly_recommended
    });
  });
});