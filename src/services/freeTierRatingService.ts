import { 
  PlatformRatingData, 
  UnifiedRating, 
  AggregationResult,
  Platform,
  PlatformError
} from '@/types/platformAggregation';
import { SearchQuery } from '@/types/search';
import { HotpepperApiClient } from './externalApi/hotpepperApiClient';
import { TabelogScrapingClient } from './externalApi/tabelogScrapingClient';
import { MultiPlatformCacheService } from './cache/multiPlatformCacheService';

/**
 * Free Tier Rating Service - HotPepper中心の無料構成
 * 完全無料での持続可能な運用を実現する軽量版統合評価サービス
 */
export class FreeTierRatingService {
  private hotpepperClient: HotpepperApiClient;
  private tabelogClient: TabelogScrapingClient | null = null;
  private cacheService: MultiPlatformCacheService;
  
  // 無料利用制限
  private readonly rateLimits = {
    hotpepper: {
      requestsPerMinute: parseInt(process.env.HOTPEPPER_FREE_TIER_RPM || '2', 10),
      requestsPerHour: parseInt(process.env.HOTPEPPER_FREE_TIER_RPH || '50', 10),
      requestsPerDay: parseInt(process.env.HOTPEPPER_FREE_TIER_RPD || '300', 10),
    },
    tabelog: {
      weeklyLimit: parseInt(process.env.TABELOG_FREE_TIER_WEEKLY_LIMIT || '50', 10),
      requestInterval: 30000, // 30秒間隔
    }
  };

  // HotPepper中心の重み設定
  private readonly weights = {
    hotpepper: parseFloat(process.env.PLATFORM_WEIGHTS_HOTPEPPER || '0.70'),
    tabelog: parseFloat(process.env.PLATFORM_WEIGHTS_TABELOG || '0.20'),
    google: parseFloat(process.env.PLATFORM_WEIGHTS_GOOGLE || '0.10'),
  };

  private requestCounts = {
    hotpepper: { minute: 0, hour: 0, day: 0, lastReset: { minute: 0, hour: 0, day: 0 } },
    tabelog: { week: 0, lastReset: 0 }
  };

  constructor() {
    this.hotpepperClient = new HotpepperApiClient();
    this.cacheService = new MultiPlatformCacheService();
    
    // 食べログは無料Tier設定時のみ有効化
    if (process.env.ENABLE_TABELOG === 'true' && process.env.ENABLE_FREE_TIER_MODE === 'true') {
      this.tabelogClient = new TabelogScrapingClient();
    }

    // レート制限カウンターのリセット処理
    this.startRateLimitResetScheduler();
  }

  /**
   * HotPepper中心の統合評価取得
   */
  public async getUnifiedRating(restaurantId: string): Promise<AggregationResult> {
    const startTime = Date.now();
    const platformData: PlatformRatingData[] = [];
    const errors: PlatformError[] = [];

    // 1. キャッシュチェック（最優先）
    const cachedUnified = this.cacheService.getUnifiedRating(restaurantId);
    if (cachedUnified) {
      return {
        unifiedRating: cachedUnified,
        errors: [],
        partialData: false,
        processingTime: Date.now() - startTime,
        cacheHit: true,
      };
    }

    // 2. HotPepper API（メイン・必須）
    try {
      if (this.canMakeHotpepperRequest()) {
        const hotpepperData = await this.fetchWithCache(
          'hotpepper',
          restaurantId,
          () => this.hotpepperClient.getRatingData(restaurantId)
        );
        
        if (hotpepperData) {
          platformData.push(hotpepperData);
          this.incrementHotpepperCount();
        }
      } else {
        // レート制限に達している場合はキャッシュから取得を試行
        const cachedData = this.cacheService.getPlatformRatingData('hotpepper', restaurantId);
        if (cachedData) {
          platformData.push(cachedData);
        } else {
          errors.push({
            platform: 'hotpepper',
            error: 'Rate limit exceeded, no cached data available',
            code: 'RATE_LIMIT_EXCEEDED',
            severity: 'high',
            timestamp: new Date(),
            retryable: true,
          });
        }
      }
    } catch (error) {
      errors.push({
        platform: 'hotpepper',
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'FETCH_ERROR',
        severity: 'high',
        timestamp: new Date(),
        retryable: true,
      });
    }

    // 3. 食べログ（補助・週次制限）
    if (this.tabelogClient && this.canMakeTabelogRequest()) {
      try {
        const tabelogData = await this.fetchWithCache(
          'tabelog',
          restaurantId,
          () => this.tabelogClient!.getRatingData(restaurantId)
        );
        
        if (tabelogData) {
          platformData.push(tabelogData);
          this.incrementTabelogCount();
        }
      } catch (error) {
        // 食べログのエラーは警告レベル（オプショナル）
        errors.push({
          platform: 'tabelog',
          error: error instanceof Error ? error.message : 'Unknown error',
          code: 'FETCH_ERROR',
          severity: 'low',
          timestamp: new Date(),
          retryable: true,
        });
      }
    }

    // 4. 統合評価の計算
    const unifiedRating = this.calculateFreeTierUnifiedRating(restaurantId, platformData);
    
    // 5. 結果をキャッシュ
    if (unifiedRating) {
      this.cacheService.setUnifiedRating(restaurantId, unifiedRating);
    }

    return {
      unifiedRating,
      errors,
      partialData: errors.some(e => e.severity === 'high'),
      processingTime: Date.now() - startTime,
      cacheHit: false,
    };
  }

  /**
   * HotPepper中心の検索
   */
  public async searchUnifiedRatings(query: SearchQuery): Promise<AggregationResult[]> {
    const startTime = Date.now();
    
    // クエリハッシュ生成
    const queryHash = this.generateQueryHash(query);
    
    // キャッシュチェック
    const cachedResults = this.cacheService.getSearchResults('hotpepper', queryHash);
    if (cachedResults) {
      return cachedResults.map(data => ({
        unifiedRating: this.platformDataToSimpleUnified(data),
        errors: [],
        partialData: false,
        processingTime: Date.now() - startTime,
        cacheHit: true,
      }));
    }

    // HotPepper検索（制限チェック）
    if (!this.canMakeHotpepperRequest()) {
      return [{
        unifiedRating: null,
        errors: [{
          platform: 'hotpepper',
          error: 'Rate limit exceeded for search',
          code: 'RATE_LIMIT_EXCEEDED',
          severity: 'high',
          timestamp: new Date(),
          retryable: true,
        }],
        partialData: true,
        processingTime: Date.now() - startTime,
        cacheHit: false,
      }];
    }

    try {
      const hotpepperResults = await this.hotpepperClient.searchForRatingData(query);
      this.incrementHotpepperCount();
      
      // 検索結果をキャッシュ
      this.cacheService.setSearchResults('hotpepper', queryHash, hotpepperResults);
      
      // 各結果を統合評価に変換
      return hotpepperResults.map(data => ({
        unifiedRating: this.platformDataToSimpleUnified(data),
        errors: [],
        partialData: false,
        processingTime: Date.now() - startTime,
        cacheHit: false,
      }));
      
    } catch (error) {
      return [{
        unifiedRating: null,
        errors: [{
          platform: 'hotpepper',
          error: error instanceof Error ? error.message : 'Search failed',
          code: 'SEARCH_ERROR',
          severity: 'high',
          timestamp: new Date(),
          retryable: true,
        }],
        partialData: true,
        processingTime: Date.now() - startTime,
        cacheHit: false,
      }];
    }
  }

  /**
   * HotPepper中心の統合評価計算
   */
  private calculateFreeTierUnifiedRating(
    restaurantId: string,
    platformData: PlatformRatingData[]
  ): UnifiedRating | null {
    if (platformData.length === 0) {
      return null;
    }

    // HotPepperデータが存在することを優先
    const hotpepperData = platformData.find(d => d.platform === 'hotpepper');
    if (!hotpepperData) {
      return null; // HotPepperデータが必須
    }

    // 重み付き平均計算（HotPepper中心）
    let totalScore = 0;
    let totalWeight = 0;

    platformData.forEach(data => {
      const weight = this.weights[data.platform] || 0;
      const adjustedWeight = weight * data.confidence * data.dataQuality;
      
      totalScore += data.rating * adjustedWeight;
      totalWeight += adjustedWeight;
    });

    const aggregatedScore = totalWeight > 0 
      ? Math.round((totalScore / totalWeight) * 10) / 10 
      : hotpepperData.rating; // フォールバック: HotPepperの評価をそのまま使用

    return {
      restaurantId,
      aggregatedScore,
      confidence: this.calculateFreeTierConfidence(platformData),
      platforms: platformData,
      totalReviews: platformData.reduce((sum, data) => sum + data.reviewCount, 0),
      dataCompleteness: platformData.length / 2, // HotPepper + 食べログで完全性100%
      reliabilityScore: platformData.length > 1 ? 0.8 : 0.6, // 複数プラットフォームなら高信頼性
      aggregationMetadata: {
        algorithm: 'hotpepper_centric_weighted_average',
        weights: this.weights,
        timestamp: new Date(),
        version: '1.0.0-free-tier',
      },
      lastUpdated: new Date(),
    };
  }

  /**
   * 無料Tier向け信頼度計算
   */
  private calculateFreeTierConfidence(data: PlatformRatingData[]): number {
    if (data.length === 0) return 0;

    // HotPepperのベース信頼度を重視
    const hotpepperData = data.find(d => d.platform === 'hotpepper');
    let confidence = hotpepperData ? hotpepperData.confidence : 0.5;

    // 食べログデータがある場合は信頼度向上
    const tabelogData = data.find(d => d.platform === 'tabelog');
    if (tabelogData) {
      confidence += 0.1;
    }

    return Math.min(1.0, confidence);
  }

  /**
   * プラットフォームデータを簡易統合評価に変換（検索結果用）
   */
  private platformDataToSimpleUnified(data: PlatformRatingData): UnifiedRating {
    return {
      restaurantId: data.restaurantId,
      aggregatedScore: data.rating,
      confidence: data.confidence,
      platforms: [data],
      totalReviews: data.reviewCount,
      dataCompleteness: 0.5, // 単一プラットフォーム
      reliabilityScore: 0.6,
      aggregationMetadata: {
        algorithm: 'single_platform',
        weights: this.weights,
        timestamp: new Date(),
        version: '1.0.0-free-tier',
      },
      lastUpdated: data.lastUpdated,
    };
  }

  /**
   * キャッシュ付きデータ取得
   */
  private async fetchWithCache(
    platform: Platform,
    restaurantId: string,
    fetcher: () => Promise<PlatformRatingData>
  ): Promise<PlatformRatingData | null> {
    // キャッシュチェック
    const cached = this.cacheService.getPlatformRatingData(platform, restaurantId);
    if (cached) {
      return cached;
    }

    // API呼び出し
    try {
      const data = await fetcher();
      this.cacheService.setPlatformRatingData(platform, restaurantId, data);
      return data;
    } catch (error) {
      console.error(`Failed to fetch ${platform} data for ${restaurantId}:`, error);
      return null;
    }
  }

  /**
   * レート制限チェック・管理
   */
  private canMakeHotpepperRequest(): boolean {
    this.resetCountersIfNeeded();
    
    return (
      this.requestCounts.hotpepper.minute < this.rateLimits.hotpepper.requestsPerMinute &&
      this.requestCounts.hotpepper.hour < this.rateLimits.hotpepper.requestsPerHour &&
      this.requestCounts.hotpepper.day < this.rateLimits.hotpepper.requestsPerDay
    );
  }

  private canMakeTabelogRequest(): boolean {
    const now = Date.now();
    const weekInMs = 7 * 24 * 60 * 60 * 1000;
    
    if (now - this.requestCounts.tabelog.lastReset > weekInMs) {
      this.requestCounts.tabelog.week = 0;
      this.requestCounts.tabelog.lastReset = now;
    }
    
    return this.requestCounts.tabelog.week < this.rateLimits.tabelog.weeklyLimit;
  }

  private incrementHotpepperCount(): void {
    this.requestCounts.hotpepper.minute++;
    this.requestCounts.hotpepper.hour++;
    this.requestCounts.hotpepper.day++;
  }

  private incrementTabelogCount(): void {
    this.requestCounts.tabelog.week++;
  }

  private resetCountersIfNeeded(): void {
    const now = Date.now();
    
    // 分単位リセット
    if (now - this.requestCounts.hotpepper.lastReset.minute > 60000) {
      this.requestCounts.hotpepper.minute = 0;
      this.requestCounts.hotpepper.lastReset.minute = now;
    }
    
    // 時間単位リセット
    if (now - this.requestCounts.hotpepper.lastReset.hour > 3600000) {
      this.requestCounts.hotpepper.hour = 0;
      this.requestCounts.hotpepper.lastReset.hour = now;
    }
    
    // 日単位リセット
    if (now - this.requestCounts.hotpepper.lastReset.day > 86400000) {
      this.requestCounts.hotpepper.day = 0;
      this.requestCounts.hotpepper.lastReset.day = now;
    }
  }

  private startRateLimitResetScheduler(): void {
    // 毎分カウンターリセットチェック
    setInterval(() => {
      this.resetCountersIfNeeded();
    }, 60000);
  }

  private generateQueryHash(query: SearchQuery): string {
    return Buffer.from(JSON.stringify(query)).toString('base64');
  }

  /**
   * 使用状況レポート取得
   */
  public getUsageReport(): {
    hotpepper: typeof this.requestCounts.hotpepper;
    tabelog: typeof this.requestCounts.tabelog;
    limits: typeof this.rateLimits;
    cacheStats: ReturnType<MultiPlatformCacheService['getCacheStats']>;
  } {
    return {
      hotpepper: { ...this.requestCounts.hotpepper },
      tabelog: { ...this.requestCounts.tabelog },
      limits: this.rateLimits,
      cacheStats: this.cacheService.getCacheStats(),
    };
  }

  /**
   * リソースクリーンアップ
   */
  public destroy(): void {
    this.cacheService.destroy();
  }
}