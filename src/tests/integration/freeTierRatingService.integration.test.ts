import { FreeTierRatingService } from '../../services/freeTierRatingService';
import { MultiPlatformCacheService } from '../../services/cache/multiPlatformCacheService';
import { HotpepperApiClient } from '../../services/externalApi/hotpepperApiClient';
import { TabelogScrapingClient } from '../../services/externalApi/tabelogScrapingClient';

// モック設定
jest.mock('../../services/externalApi/hotpepperApiClient');
jest.mock('../../services/externalApi/tabelogScrapingClient');
jest.mock('../../services/cache/multiPlatformCacheService');

describe('FreeTierRatingService Integration Tests', () => {
  let service: FreeTierRatingService;
  let mockHotpepperClient: jest.Mocked<HotpepperApiClient>;
  let mockTabelogClient: jest.Mocked<TabelogScrapingClient>;
  let mockCacheService: jest.Mocked<MultiPlatformCacheService>;

  beforeEach(() => {
    // 環境変数設定
    process.env.ENABLE_FREE_TIER_MODE = 'true';
    process.env.ENABLE_HOTPEPPER = 'true';
    process.env.ENABLE_TABELOG = 'true';
    process.env.HOTPEPPER_FREE_TIER_RPM = '2';
    process.env.HOTPEPPER_FREE_TIER_RPH = '50';
    process.env.HOTPEPPER_FREE_TIER_RPD = '300';
    process.env.TABELOG_FREE_TIER_WEEKLY_LIMIT = '50';

    service = new FreeTierRatingService();
    
    // モックインスタンス取得
    mockHotpepperClient = service['hotpepperClient'] as jest.Mocked<HotpepperApiClient>;
    mockTabelogClient = service['tabelogClient'] as jest.Mocked<TabelogScrapingClient>;
    mockCacheService = service['cacheService'] as jest.Mocked<MultiPlatformCacheService>;
  });

  afterEach(() => {
    service.destroy();
    jest.clearAllMocks();
  });

  describe('統合評価取得テスト', () => {
    const mockRestaurantId = 'test-restaurant-123';
    
    const mockHotpepperData = {
      platform: 'hotpepper' as const,
      restaurantId: mockRestaurantId,
      rating: 4.2,
      reviewCount: 150,
      confidence: 0.8,
      dataQuality: 0.9,
      lastUpdated: new Date(),
      source: `hotpepper:${mockRestaurantId}`,
    };

    const mockTabelogData = {
      platform: 'tabelog' as const,
      restaurantId: mockRestaurantId,
      rating: 4.0,
      reviewCount: 89,
      confidence: 0.7,
      dataQuality: 0.8,
      lastUpdated: new Date(),
      source: `tabelog:${mockRestaurantId}`,
    };

    it('キャッシュヒット時の動作確認', async () => {
      // キャッシュヒットをモック
      const mockUnifiedRating = {
        restaurantId: mockRestaurantId,
        aggregatedScore: 4.1,
        confidence: 0.8,
        platforms: [mockHotpepperData],
        totalReviews: 150,
        dataCompleteness: 0.5,
        reliabilityScore: 0.6,
        aggregationMetadata: {
          algorithm: 'hotpepper_centric_weighted_average',
          weights: { hotpepper: 0.7, tabelog: 0.2, google: 0.1 },
          timestamp: new Date(),
          version: '1.0.0-free-tier',
        },
        lastUpdated: new Date(),
      };

      mockCacheService.getUnifiedRating.mockReturnValue(mockUnifiedRating);

      const result = await service.getUnifiedRating(mockRestaurantId);

      expect(result.cacheHit).toBe(true);
      expect(result.unifiedRating).toEqual(mockUnifiedRating);
      expect(result.errors).toHaveLength(0);
      expect(mockHotpepperClient.getRatingData).not.toHaveBeenCalled();
    });

    it('HotPepperデータのみでの統合評価', async () => {
      // キャッシュミス
      mockCacheService.getUnifiedRating.mockReturnValue(null);
      mockCacheService.getPlatformRatingData.mockReturnValue(null);
      
      // HotPepperデータ取得成功
      mockHotpepperClient.getRatingData.mockResolvedValue(mockHotpepperData);
      
      // 食べログは制限に引っかかる想定
      jest.spyOn(service as any, 'canMakeTabelogRequest').mockReturnValue(false);

      const result = await service.getUnifiedRating(mockRestaurantId);

      expect(result.cacheHit).toBe(false);
      expect(result.unifiedRating).not.toBeNull();
      expect(result.unifiedRating!.platforms).toHaveLength(1);
      expect(result.unifiedRating!.platforms[0].platform).toBe('hotpepper');
      expect(result.unifiedRating!.aggregatedScore).toBe(4.2); // HotPepperの評価をそのまま使用
      expect(mockCacheService.setUnifiedRating).toHaveBeenCalled();
    });

    it('HotPepper + 食べログ両方のデータでの統合評価', async () => {
      // キャッシュミス
      mockCacheService.getUnifiedRating.mockReturnValue(null);
      mockCacheService.getPlatformRatingData.mockReturnValue(null);
      
      // 両方のAPI呼び出し成功
      mockHotpepperClient.getRatingData.mockResolvedValue(mockHotpepperData);
      mockTabelogClient!.getRatingData.mockResolvedValue(mockTabelogData);
      
      // レート制限は大丈夫
      jest.spyOn(service as any, 'canMakeHotpepperRequest').mockReturnValue(true);
      jest.spyOn(service as any, 'canMakeTabelogRequest').mockReturnValue(true);

      const result = await service.getUnifiedRating(mockRestaurantId);

      expect(result.cacheHit).toBe(false);
      expect(result.unifiedRating).not.toBeNull();
      expect(result.unifiedRating!.platforms).toHaveLength(2);
      
      // 重み付き平均の検証 (HotPepper: 70%, 食べログ: 20%)
      const expectedScore = (4.2 * 0.7 * 0.8 * 0.9 + 4.0 * 0.2 * 0.7 * 0.8) / 
                           (0.7 * 0.8 * 0.9 + 0.2 * 0.7 * 0.8);
      expect(result.unifiedRating!.aggregatedScore).toBeCloseTo(expectedScore, 1);
      expect(result.unifiedRating!.dataCompleteness).toBe(1.0); // 2/2 = 100%
    });

    it('レート制限到達時のフォールバック動作', async () => {
      // キャッシュミス
      mockCacheService.getUnifiedRating.mockReturnValue(null);
      mockCacheService.getPlatformRatingData.mockReturnValue(null);
      
      // レート制限に引っかかる
      jest.spyOn(service as any, 'canMakeHotpepperRequest').mockReturnValue(false);

      const result = await service.getUnifiedRating(mockRestaurantId);

      expect(result.unifiedRating).toBeNull();
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('RATE_LIMIT_EXCEEDED');
      expect(result.errors[0].platform).toBe('hotpepper');
      expect(result.partialData).toBe(true);
    });

    it('API障害時のエラーハンドリング', async () => {
      // キャッシュミス
      mockCacheService.getUnifiedRating.mockReturnValue(null);
      mockCacheService.getPlatformRatingData.mockReturnValue(null);
      
      // HotPepper API障害
      mockHotpepperClient.getRatingData.mockRejectedValue(new Error('API Error'));
      
      jest.spyOn(service as any, 'canMakeHotpepperRequest').mockReturnValue(true);

      const result = await service.getUnifiedRating(mockRestaurantId);

      expect(result.unifiedRating).toBeNull();
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('FETCH_ERROR');
      expect(result.errors[0].platform).toBe('hotpepper');
    });
  });

  describe('検索機能テスト', () => {
    const mockSearchQuery = {
      location: '東京駅',
      genre: '居酒屋',
      limit: 10,
    };

    const mockSearchResults = [
      {
        platform: 'hotpepper' as const,
        restaurantId: 'search-result-1',
        rating: 4.1,
        reviewCount: 120,
        confidence: 0.8,
        dataQuality: 0.9,
        lastUpdated: new Date(),
        source: 'hotpepper:search-result-1',
      },
      {
        platform: 'hotpepper' as const,
        restaurantId: 'search-result-2',
        rating: 3.8,
        reviewCount: 95,
        confidence: 0.7,
        dataQuality: 0.8,
        lastUpdated: new Date(),
        source: 'hotpepper:search-result-2',
      },
    ];

    it('検索結果のキャッシュヒット', async () => {
      mockCacheService.getSearchResults.mockReturnValue(mockSearchResults);

      const results = await service.searchUnifiedRatings(mockSearchQuery);

      expect(results).toHaveLength(2);
      expect(results[0].cacheHit).toBe(true);
      expect(results[0].unifiedRating!.aggregatedScore).toBe(4.1);
      expect(mockHotpepperClient.searchForRatingData).not.toHaveBeenCalled();
    });

    it('新規検索とキャッシュ保存', async () => {
      // キャッシュミス
      mockCacheService.getSearchResults.mockReturnValue(null);
      
      // HotPepper検索成功
      mockHotpepperClient.searchForRatingData.mockResolvedValue(mockSearchResults);
      jest.spyOn(service as any, 'canMakeHotpepperRequest').mockReturnValue(true);

      const results = await service.searchUnifiedRatings(mockSearchQuery);

      expect(results).toHaveLength(2);
      expect(results[0].cacheHit).toBe(false);
      expect(mockCacheService.setSearchResults).toHaveBeenCalled();
      expect(mockHotpepperClient.searchForRatingData).toHaveBeenCalledWith(mockSearchQuery);
    });

    it('検索時のレート制限エラー', async () => {
      mockCacheService.getSearchResults.mockReturnValue(null);
      jest.spyOn(service as any, 'canMakeHotpepperRequest').mockReturnValue(false);

      const results = await service.searchUnifiedRatings(mockSearchQuery);

      expect(results).toHaveLength(1);
      expect(results[0].unifiedRating).toBeNull();
      expect(results[0].errors[0].code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('レート制限管理テスト', () => {
    beforeEach(() => {
      // レート制限カウンターをリセット
      service['requestCounts'] = {
        hotpepper: { minute: 0, hour: 0, day: 0, lastReset: { minute: 0, hour: 0, day: 0 } },
        tabelog: { week: 0, lastReset: 0 }
      };
    });

    it('HotPepper レート制限チェック', () => {
      const canMakeRequest = service['canMakeHotpepperRequest']();
      expect(canMakeRequest).toBe(true);

      // 制限まで使い切る
      service['requestCounts'].hotpepper.minute = 2;
      service['requestCounts'].hotpepper.hour = 50;
      service['requestCounts'].hotpepper.day = 300;

      const canMakeRequestAfterLimit = service['canMakeHotpepperRequest']();
      expect(canMakeRequestAfterLimit).toBe(false);
    });

    it('食べログ週次制限チェック', () => {
      const canMakeRequest = service['canMakeTabelogRequest']();
      expect(canMakeRequest).toBe(true);

      // 週次制限まで使い切る
      service['requestCounts'].tabelog.week = 50;
      service['requestCounts'].tabelog.lastReset = Date.now();

      const canMakeRequestAfterLimit = service['canMakeTabelogRequest']();
      expect(canMakeRequestAfterLimit).toBe(false);
    });

    it('使用状況レポート取得', () => {
      service['requestCounts'].hotpepper.day = 150;
      service['requestCounts'].tabelog.week = 25;

      const report = service.getUsageReport();

      expect(report.hotpepper.day).toBe(150);
      expect(report.tabelog.week).toBe(25);
      expect(report.limits.hotpepper.requestsPerDay).toBe(300);
      expect(report.limits.tabelog.weeklyLimit).toBe(50);
    });
  });

  describe('キャッシュ統合テスト', () => {
    it('キャッシュサービスとの連携確認', async () => {
      const restaurantId = 'cache-test-restaurant';
      const mockData = {
        platform: 'hotpepper' as const,
        restaurantId,
        rating: 4.5,
        reviewCount: 200,
        confidence: 0.9,
        dataQuality: 0.95,
        lastUpdated: new Date(),
        source: `hotpepper:${restaurantId}`,
      };

      // 初回はキャッシュミス
      mockCacheService.getUnifiedRating.mockReturnValue(null);
      mockCacheService.getPlatformRatingData.mockReturnValue(null);
      mockHotpepperClient.getRatingData.mockResolvedValue(mockData);
      jest.spyOn(service as any, 'canMakeHotpepperRequest').mockReturnValue(true);

      await service.getUnifiedRating(restaurantId);

      // キャッシュ保存が呼ばれることを確認
      expect(mockCacheService.setPlatformRatingData).toHaveBeenCalledWith(
        'hotpepper', 
        restaurantId, 
        mockData
      );
      expect(mockCacheService.setUnifiedRating).toHaveBeenCalled();
    });
  });

  describe('無料Tier特有の機能テスト', () => {
    it('重み設定の検証', () => {
      const weights = service['weights'];
      
      expect(weights.hotpepper).toBe(0.7);
      expect(weights.tabelog).toBe(0.2);
      expect(weights.google).toBe(0.1);
      
      // 重みの合計が1.0であることを確認
      const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
      expect(totalWeight).toBeCloseTo(1.0, 2);
    });

    it('Google Places APIが無効化されていることを確認', () => {
      // Google Places関連の呼び出しが一切ないことを確認
      expect(service['googlePlacesClient']).toBeUndefined();
    });

    it('食べログが個人利用モードで動作することを確認', () => {
      const tabelogClient = service['tabelogClient'];
      
      if (tabelogClient) {
        const complianceStatus = tabelogClient.getComplianceStatus();
        expect(complianceStatus.personalUseOnly).toBe(true);
        expect(complianceStatus.respectfulAccess).toBe(true);
        expect(complianceStatus.basicInfoOnly).toBe(true);
      }
    });
  });
});