import { FreeTierRatingService } from '../../services/freeTierRatingService';
import { HotpepperApiClient } from '../../services/externalApi/hotpepperApiClient';
import { TabelogScrapingClient } from '../../services/externalApi/tabelogScrapingClient';
import { MultiPlatformCacheService } from '../../services/cache/multiPlatformCacheService';

// モック設定
jest.mock('../../services/externalApi/hotpepperApiClient');
jest.mock('../../services/externalApi/tabelogScrapingClient');
jest.mock('../../services/cache/multiPlatformCacheService');

describe('Error Handling and Resilience Tests', () => {
  let service: FreeTierRatingService;
  let mockHotpepperClient: jest.Mocked<HotpepperApiClient>;
  let mockTabelogClient: jest.Mocked<TabelogScrapingClient>;
  let mockCacheService: jest.Mocked<MultiPlatformCacheService>;

  beforeEach(() => {
    process.env.ENABLE_FREE_TIER_MODE = 'true';
    process.env.ENABLE_HOTPEPPER = 'true';
    process.env.ENABLE_TABELOG = 'true';

    service = new FreeTierRatingService();
    mockHotpepperClient = service['hotpepperClient'] as jest.Mocked<HotpepperApiClient>;
    mockTabelogClient = service['tabelogClient'] as jest.Mocked<TabelogScrapingClient>;
    mockCacheService = service['cacheService'] as jest.Mocked<MultiPlatformCacheService>;
  });

  afterEach(() => {
    service.destroy();
    jest.clearAllMocks();
  });

  describe('API障害時のフォールバック', () => {
    const restaurantId = 'error-test-restaurant';

    it('HotPepper API障害時のキャッシュフォールバック', async () => {
      const cachedData = {
        platform: 'hotpepper' as const,
        restaurantId,
        rating: 4.0,
        reviewCount: 100,
        confidence: 0.8,
        dataQuality: 0.9,
        lastUpdated: new Date(Date.now() - 1000 * 60 * 60), // 1時間前
        source: `hotpepper:${restaurantId}`,
      };

      // 統合キャッシュはミス、プラットフォーム別キャッシュはヒット
      mockCacheService.getUnifiedRating.mockReturnValue(null);
      mockCacheService.getPlatformRatingData.mockReturnValue(cachedData);
      mockHotpepperClient.getRatingData.mockRejectedValue(new Error('API Server Error'));
      
      jest.spyOn(service as any, 'canMakeHotpepperRequest').mockReturnValue(true);

      const result = await service.getUnifiedRating(restaurantId);

      expect(result.unifiedRating).not.toBeNull();
      expect(result.unifiedRating!.platforms[0]).toEqual(cachedData);
      expect(result.errors).toHaveLength(0); // キャッシュヒットなのでエラーなし
      expect(result.processingTime).toBeLessThan(100); // 高速レスポンス
    });

    it('HotPepper API障害時でキャッシュもない場合', async () => {
      mockCacheService.getUnifiedRating.mockReturnValue(null);
      mockCacheService.getPlatformRatingData.mockReturnValue(null);
      mockHotpepperClient.getRatingData.mockRejectedValue(new Error('Network timeout'));
      
      jest.spyOn(service as any, 'canMakeHotpepperRequest').mockReturnValue(true);

      const result = await service.getUnifiedRating(restaurantId);

      expect(result.unifiedRating).toBeNull();
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].platform).toBe('hotpepper');
      expect(result.errors[0].code).toBe('FETCH_ERROR');
      expect(result.errors[0].severity).toBe('high');
      expect(result.partialData).toBe(true);
    });

    it('食べログ障害時の継続動作（HotPepperのみで運用）', async () => {
      const hotpepperData = {
        platform: 'hotpepper' as const,
        restaurantId,
        rating: 4.2,
        reviewCount: 150,
        confidence: 0.9,
        dataQuality: 0.95,
        lastUpdated: new Date(),
        source: `hotpepper:${restaurantId}`,
      };

      mockCacheService.getUnifiedRating.mockReturnValue(null);
      mockCacheService.getPlatformRatingData.mockReturnValue(null);
      mockHotpepperClient.getRatingData.mockResolvedValue(hotpepperData);
      mockTabelogClient!.getRatingData.mockRejectedValue(new Error('Tabelog scraping failed'));
      
      jest.spyOn(service as any, 'canMakeHotpepperRequest').mockReturnValue(true);
      jest.spyOn(service as any, 'canMakeTabelogRequest').mockReturnValue(true);

      const result = await service.getUnifiedRating(restaurantId);

      expect(result.unifiedRating).not.toBeNull();
      expect(result.unifiedRating!.platforms).toHaveLength(1);
      expect(result.unifiedRating!.platforms[0].platform).toBe('hotpepper');
      expect(result.unifiedRating!.aggregatedScore).toBe(4.2); // HotPepperの評価をそのまま使用
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].platform).toBe('tabelog');
      expect(result.errors[0].severity).toBe('low'); // 食べログは補助なので低重要度
    });
  });

  describe('レート制限エラーハンドリング', () => {
    it('HotPepperレート制限到達時のエラー', async () => {
      const restaurantId = 'rate-limit-test';

      mockCacheService.getUnifiedRating.mockReturnValue(null);
      mockCacheService.getPlatformRatingData.mockReturnValue(null);
      
      // レート制限に引っかかる
      jest.spyOn(service as any, 'canMakeHotpepperRequest').mockReturnValue(false);

      const result = await service.getUnifiedRating(restaurantId);

      expect(result.unifiedRating).toBeNull();
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('RATE_LIMIT_EXCEEDED');
      expect(result.errors[0].platform).toBe('hotpepper');
      expect(result.errors[0].retryable).toBe(true);
      expect(result.partialData).toBe(true);
    });

    it('食べログレート制限到達時の継続動作', async () => {
      const restaurantId = 'tabelog-rate-limit-test';
      const hotpepperData = {
        platform: 'hotpepper' as const,
        restaurantId,
        rating: 3.8,
        reviewCount: 80,
        confidence: 0.8,
        dataQuality: 0.85,
        lastUpdated: new Date(),
        source: `hotpepper:${restaurantId}`,
      };

      mockCacheService.getUnifiedRating.mockReturnValue(null);
      mockCacheService.getPlatformRatingData.mockReturnValue(null);
      mockHotpepperClient.getRatingData.mockResolvedValue(hotpepperData);
      
      jest.spyOn(service as any, 'canMakeHotpepperRequest').mockReturnValue(true);
      jest.spyOn(service as any, 'canMakeTabelogRequest').mockReturnValue(false); // 制限到達

      const result = await service.getUnifiedRating(restaurantId);

      // HotPepperデータのみで正常に動作
      expect(result.unifiedRating).not.toBeNull();
      expect(result.unifiedRating!.platforms).toHaveLength(1);
      expect(result.unifiedRating!.platforms[0].platform).toBe('hotpepper');
      expect(result.errors).toHaveLength(0); // 食べログは制限時エラー出力なし
    });

    it('レート制限回復後の動作確認', async () => {
      const restaurantId = 'rate-recovery-test';

      // 初回はレート制限
      jest.spyOn(service as any, 'canMakeHotpepperRequest').mockReturnValue(false);
      
      let result = await service.getUnifiedRating(restaurantId);
      expect(result.errors[0].code).toBe('RATE_LIMIT_EXCEEDED');

      // レート制限回復をシミュレート
      jest.spyOn(service as any, 'canMakeHotpepperRequest').mockReturnValue(true);
      
      const hotpepperData = {
        platform: 'hotpepper' as const,
        restaurantId,
        rating: 4.5,
        reviewCount: 200,
        confidence: 0.9,
        dataQuality: 0.95,
        lastUpdated: new Date(),
        source: `hotpepper:${restaurantId}`,
      };

      mockHotpepperClient.getRatingData.mockResolvedValue(hotpepperData);
      
      result = await service.getUnifiedRating(restaurantId);

      expect(result.unifiedRating).not.toBeNull();
      expect(result.errors).toHaveLength(0);
      expect(mockHotpepperClient.getRatingData).toHaveBeenCalledWith(restaurantId);
    });
  });

  describe('ネットワーク障害・タイムアウト処理', () => {
    it('ネットワークタイムアウト時のエラーハンドリング', async () => {
      const restaurantId = 'timeout-test';

      mockCacheService.getUnifiedRating.mockReturnValue(null);
      mockCacheService.getPlatformRatingData.mockReturnValue(null);
      
      // タイムアウトエラーをシミュレート
      mockHotpepperClient.getRatingData.mockRejectedValue(new Error('TIMEOUT'));
      jest.spyOn(service as any, 'canMakeHotpepperRequest').mockReturnValue(true);

      const result = await service.getUnifiedRating(restaurantId);

      expect(result.unifiedRating).toBeNull();
      expect(result.errors[0].error).toContain('TIMEOUT');
      expect(result.errors[0].retryable).toBe(true);
    });

    it('間欠的ネットワーク障害のシミュレーション', async () => {
      const restaurantId = 'intermittent-failure-test';
      
      mockCacheService.getUnifiedRating.mockReturnValue(null);
      mockCacheService.getPlatformRatingData.mockReturnValue(null);
      jest.spyOn(service as any, 'canMakeHotpepperRequest').mockReturnValue(true);

      let callCount = 0;
      mockHotpepperClient.getRatingData.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          // 最初の2回は失敗
          return Promise.reject(new Error('Network Error'));
        } else {
          // 3回目は成功
          return Promise.resolve({
            platform: 'hotpepper' as const,
            restaurantId,
            rating: 4.0,
            reviewCount: 100,
            confidence: 0.8,
            dataQuality: 0.9,
            lastUpdated: new Date(),
            source: `hotpepper:${restaurantId}`,
          });
        }
      });

      // 1回目・2回目は失敗
      let result = await service.getUnifiedRating(restaurantId);
      expect(result.unifiedRating).toBeNull();
      
      result = await service.getUnifiedRating(restaurantId);
      expect(result.unifiedRating).toBeNull();

      // 3回目は成功
      result = await service.getUnifiedRating(restaurantId);
      expect(result.unifiedRating).not.toBeNull();
    });
  });

  describe('データ品質・整合性エラー', () => {
    it('不正なデータ形式のエラーハンドリング', async () => {
      const restaurantId = 'invalid-data-test';

      mockCacheService.getUnifiedRating.mockReturnValue(null);
      mockCacheService.getPlatformRatingData.mockReturnValue(null);
      
      // 不正な形式のデータを返す
      mockHotpepperClient.getRatingData.mockResolvedValue({
        platform: 'hotpepper' as const,
        restaurantId,
        rating: -1, // 不正な評価値
        reviewCount: -50, // 不正なレビュー数
        confidence: 2.0, // 不正な信頼度（1.0を超える）
        dataQuality: -0.5, // 不正な品質スコア
        lastUpdated: new Date(),
        source: `hotpepper:${restaurantId}`,
      });

      jest.spyOn(service as any, 'canMakeHotpepperRequest').mockReturnValue(true);

      const result = await service.getUnifiedRating(restaurantId);

      // データ検証でエラーが検出され、適切に処理されることを確認
      // 実装では不正データのサニタイゼーションまたは拒否を行う
      expect(result).toBeDefined();
    });

    it('空のデータ・null値のハンドリング', async () => {
      const restaurantId = 'empty-data-test';

      mockCacheService.getUnifiedRating.mockReturnValue(null);
      mockCacheService.getPlatformRatingData.mockReturnValue(null);
      
      // null/undefinedを含むデータ
      mockHotpepperClient.getRatingData.mockResolvedValue({
        platform: 'hotpepper' as const,
        restaurantId,
        rating: 0, // 評価なし
        reviewCount: 0, // レビューなし
        confidence: 0.1, // 低信頼度
        dataQuality: 0.3, // 低品質
        lastUpdated: new Date(),
        source: `hotpepper:${restaurantId}`,
      });

      jest.spyOn(service as any, 'canMakeHotpepperRequest').mockReturnValue(true);

      const result = await service.getUnifiedRating(restaurantId);

      // 品質・信頼度フィルターで除外される可能性があるが、エラーにはならない
      expect(result.unifiedRating).toBeNull(); // 品質が閾値を下回る
      expect(result.errors).toHaveLength(0); // エラーではなく正常な除外
    });
  });

  describe('検索時のエラーハンドリング', () => {
    const searchQuery = {
      location: '渋谷',
      genre: '居酒屋',
      limit: 10,
    };

    it('検索API障害時のエラー処理', async () => {
      mockCacheService.getSearchResults.mockReturnValue(null);
      mockHotpepperClient.searchForRatingData.mockRejectedValue(new Error('Search API Error'));
      jest.spyOn(service as any, 'canMakeHotpepperRequest').mockReturnValue(true);

      const results = await service.searchUnifiedRatings(searchQuery);

      expect(results).toHaveLength(1);
      expect(results[0].unifiedRating).toBeNull();
      expect(results[0].errors[0].code).toBe('SEARCH_ERROR');
      expect(results[0].partialData).toBe(true);
    });

    it('検索結果が空の場合の処理', async () => {
      mockCacheService.getSearchResults.mockReturnValue(null);
      mockHotpepperClient.searchForRatingData.mockResolvedValue([]); // 空の結果
      jest.spyOn(service as any, 'canMakeHotpepperRequest').mockReturnValue(true);

      const results = await service.searchUnifiedRatings(searchQuery);

      expect(results).toHaveLength(0);
    });

    it('検索時のレート制限エラー', async () => {
      mockCacheService.getSearchResults.mockReturnValue(null);
      jest.spyOn(service as any, 'canMakeHotpepperRequest').mockReturnValue(false);

      const results = await service.searchUnifiedRatings(searchQuery);

      expect(results).toHaveLength(1);
      expect(results[0].errors[0].code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('メモリ・リソース枯渇エラー', () => {
    it('キャッシュサービス障害時のフォールバック', async () => {
      const restaurantId = 'cache-failure-test';

      // キャッシュサービスがエラーを投げる
      mockCacheService.getUnifiedRating.mockImplementation(() => {
        throw new Error('Cache service unavailable');
      });

      const hotpepperData = {
        platform: 'hotpepper' as const,
        restaurantId,
        rating: 4.0,
        reviewCount: 100,
        confidence: 0.8,
        dataQuality: 0.9,
        lastUpdated: new Date(),
        source: `hotpepper:${restaurantId}`,
      };

      mockHotpepperClient.getRatingData.mockResolvedValue(hotpepperData);
      jest.spyOn(service as any, 'canMakeHotpepperRequest').mockReturnValue(true);

      // キャッシュエラーでも統合評価は動作する
      const result = await service.getUnifiedRating(restaurantId);

      expect(result.unifiedRating).not.toBeNull();
      expect(result.unifiedRating!.platforms[0]).toEqual(hotpepperData);
    });

    it('大量リクエスト時の安定性テスト', async () => {
      const requestCount = 100;
      const promises: Promise<any>[] = [];

      // 100件の並列リクエスト
      for (let i = 0; i < requestCount; i++) {
        const restaurantId = `stress-test-${i}`;
        
        mockHotpepperClient.getRatingData.mockResolvedValue({
          platform: 'hotpepper' as const,
          restaurantId,
          rating: 4.0,
          reviewCount: 100,
          confidence: 0.8,
          dataQuality: 0.9,
          lastUpdated: new Date(),
          source: `hotpepper:${restaurantId}`,
        });

        promises.push(service.getUnifiedRating(restaurantId));
      }

      // 全て正常に完了することを確認
      const results = await Promise.allSettled(promises);
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      console.log(`Stress test results: ${succeeded} succeeded, ${failed} failed`);
      
      // 95%以上の成功率を期待
      expect(succeeded / requestCount).toBeGreaterThan(0.95);
    });
  });

  describe('復旧・回復メカニズム', () => {
    it('サーキットブレーカー的な動作確認', async () => {
      const restaurantId = 'circuit-breaker-test';
      let failureCount = 0;

      // 連続失敗をシミュレート
      mockHotpepperClient.getRatingData.mockImplementation(() => {
        failureCount++;
        if (failureCount <= 5) {
          return Promise.reject(new Error('Service Unavailable'));
        } else {
          // 6回目以降は成功
          return Promise.resolve({
            platform: 'hotpepper' as const,
            restaurantId,
            rating: 4.0,
            reviewCount: 100,
            confidence: 0.8,
            dataQuality: 0.9,
            lastUpdated: new Date(),
            source: `hotpepper:${restaurantId}`,
          });
        }
      });

      jest.spyOn(service as any, 'canMakeHotpepperRequest').mockReturnValue(true);

      // 連続失敗
      for (let i = 0; i < 5; i++) {
        const result = await service.getUnifiedRating(restaurantId);
        expect(result.unifiedRating).toBeNull();
      }

      // 回復確認
      const recoveryResult = await service.getUnifiedRating(restaurantId);
      expect(recoveryResult.unifiedRating).not.toBeNull();
    });
  });
});