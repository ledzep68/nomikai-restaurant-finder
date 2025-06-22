import { 
  PlatformRatingData, 
  UnifiedRating, 
  AggregationConfig, 
  AggregationResult,
  Platform,
  PlatformError,
  ValidationResult
} from '@/types/platformAggregation';
import { SearchQuery } from '@/types/search';
import { HotpepperApiClient } from './externalApi/hotpepperApiClient';
import { GooglePlacesApiClient } from './externalApi/googlePlacesApiClient';
import { TabelogScrapingClient } from './externalApi/tabelogScrapingClient';

/**
 * Unified Rating Service - 3プラットフォーム統合評価システム
 * Phase 7: Multi-platform rating aggregation core service
 */
export class UnifiedRatingService {
  private hotpepperClient: HotpepperApiClient;
  private googlePlacesClient: GooglePlacesApiClient;
  private tabelogClient: TabelogScrapingClient;
  private config: AggregationConfig;

  constructor(config?: Partial<AggregationConfig>) {
    this.hotpepperClient = new HotpepperApiClient();
    this.googlePlacesClient = new GooglePlacesApiClient();
    this.tabelogClient = new TabelogScrapingClient();

    // デフォルト設定: Google(40%), Tabelog(30%), HotPepper(30%)
    this.config = {
      weights: {
        google: parseFloat(process.env.PLATFORM_WEIGHTS_GOOGLE || '0.40'),
        tabelog: parseFloat(process.env.PLATFORM_WEIGHTS_TABELOG || '0.30'),
        hotpepper: parseFloat(process.env.PLATFORM_WEIGHTS_HOTPEPPER || '0.30'),
      },
      algorithm: 'weighted_average',
      qualityThreshold: 0.5,
      confidenceThreshold: 0.3,
      enableDynamicWeights: true,
      ...config,
    };

    // 重みの正規化
    this.normalizeWeights();
  }

  /**
   * Phase 7: 統合評価データ取得
   */
  public async getUnifiedRating(restaurantId: string): Promise<AggregationResult> {
    const startTime = Date.now();
    const platformData: PlatformRatingData[] = [];
    const errors: PlatformError[] = [];

    // 並列でデータ取得
    const promises = [
      this.fetchPlatformData('google', () => 
        this.googlePlacesClient.getRatingData(restaurantId)
      ),
      this.fetchPlatformData('tabelog', () => 
        this.tabelogClient.getRatingData(restaurantId)
      ),
      this.fetchPlatformData('hotpepper', () => 
        this.hotpepperClient.getRatingData(restaurantId)
      ),
    ];

    const results = await Promise.allSettled(promises);

    // 結果の処理
    results.forEach((result, index) => {
      const platforms: Platform[] = ['google', 'tabelog', 'hotpepper'];
      const platform = platforms[index];

      if (result.status === 'fulfilled') {
        if (result.value.success) {
          platformData.push(result.value.data);
        } else {
          errors.push(result.value.error);
        }
      } else {
        errors.push({
          platform,
          error: result.reason?.message || 'Unknown error',
          code: 'FETCH_FAILED',
          severity: 'medium',
          timestamp: new Date(),
          retryable: true,
        });
      }
    });

    // 統合評価の計算
    const unifiedRating = await this.calculateUnifiedRating(restaurantId, platformData);
    const processingTime = Date.now() - startTime;

    return {
      unifiedRating,
      errors,
      partialData: errors.length > 0,
      processingTime,
      cacheHit: false, // TODO: キャッシュ実装後に更新
    };
  }

  /**
   * Phase 7: 検索ベース統合評価取得
   */
  public async searchUnifiedRatings(query: SearchQuery): Promise<AggregationResult[]> {
    const startTime = Date.now();
    
    // 各プラットフォームから検索結果を取得
    const promises = [
      this.fetchSearchData('google', () => 
        this.googlePlacesClient.searchForRatingData(query)
      ),
      this.fetchSearchData('tabelog', () => 
        this.tabelogClient.searchForRatingData(query)
      ),
      this.fetchSearchData('hotpepper', () => 
        this.hotpepperClient.searchForRatingData(query)
      ),
    ];

    const results = await Promise.allSettled(promises);
    
    // レストランIDでグループ化
    const restaurantGroups = this.groupByRestaurant(results);
    
    // 各レストランの統合評価を計算
    const aggregationResults: AggregationResult[] = [];
    
    for (const [restaurantId, platformDataList] of restaurantGroups) {
      const errors: PlatformError[] = [];
      const validData = platformDataList.filter(data => data !== null);
      
      if (validData.length > 0) {
        const unifiedRating = await this.calculateUnifiedRating(restaurantId, validData);
        
        aggregationResults.push({
          unifiedRating,
          errors,
          partialData: validData.length < 3,
          processingTime: Date.now() - startTime,
          cacheHit: false,
        });
      }
    }

    // 統合スコア順でソート
    return aggregationResults.sort((a, b) => 
      (b.unifiedRating?.aggregatedScore || 0) - (a.unifiedRating?.aggregatedScore || 0)
    );
  }

  /**
   * Phase 7: 統合評価計算のコア実装
   */
  private async calculateUnifiedRating(
    restaurantId: string, 
    platformData: PlatformRatingData[]
  ): Promise<UnifiedRating | null> {
    if (platformData.length === 0) {
      return null;
    }

    // データ品質フィルタリング
    const qualifiedData = platformData.filter(data => 
      data.dataQuality >= this.config.qualityThreshold &&
      data.confidence >= this.config.confidenceThreshold
    );

    if (qualifiedData.length === 0) {
      return null;
    }

    // 動的重み調整
    const adjustedWeights = this.config.enableDynamicWeights 
      ? this.calculateDynamicWeights(qualifiedData)
      : this.config.weights;

    // 重み付き平均スコア計算
    const aggregatedScore = this.calculateWeightedAverage(qualifiedData, adjustedWeights);
    
    // 信頼度計算
    const confidence = this.calculateUnifiedConfidence(qualifiedData, adjustedWeights);
    
    // データ完全性計算
    const dataCompleteness = this.calculateDataCompleteness(qualifiedData);
    
    // クロスプラットフォーム信頼性計算
    const reliabilityScore = this.calculateReliabilityScore(qualifiedData);

    return {
      restaurantId,
      aggregatedScore,
      confidence,
      platforms: qualifiedData,
      totalReviews: qualifiedData.reduce((sum, data) => sum + data.reviewCount, 0),
      dataCompleteness,
      reliabilityScore,
      aggregationMetadata: {
        algorithm: this.config.algorithm,
        weights: adjustedWeights,
        timestamp: new Date(),
        version: '1.0.0',
      },
      lastUpdated: new Date(),
    };
  }

  /**
   * 重み付き平均スコア計算
   */
  private calculateWeightedAverage(
    data: PlatformRatingData[], 
    weights: Record<Platform, number>
  ): number {
    let totalScore = 0;
    let totalWeight = 0;

    data.forEach(platformData => {
      const weight = weights[platformData.platform] || 0;
      const adjustedWeight = weight * platformData.confidence * platformData.dataQuality;
      
      totalScore += platformData.rating * adjustedWeight;
      totalWeight += adjustedWeight;
    });

    return totalWeight > 0 ? Math.round((totalScore / totalWeight) * 10) / 10 : 0;
  }

  /**
   * 動的重み調整
   */
  private calculateDynamicWeights(data: PlatformRatingData[]): Record<Platform, number> {
    const baseWeights = { ...this.config.weights };
    const adjustedWeights: Record<Platform, number> = { google: 0, tabelog: 0, hotpepper: 0 };

    data.forEach(platformData => {
      const platform = platformData.platform;
      const qualityBonus = (platformData.dataQuality - 0.5) * 0.2;
      const confidenceBonus = (platformData.confidence - 0.5) * 0.1;
      const reviewBonus = Math.min(platformData.reviewCount / 100, 0.1);
      
      adjustedWeights[platform] = baseWeights[platform] + qualityBonus + confidenceBonus + reviewBonus;
    });

    // 正規化
    const totalWeight = Object.values(adjustedWeights).reduce((sum, weight) => sum + weight, 0);
    if (totalWeight > 0) {
      Object.keys(adjustedWeights).forEach(platform => {
        adjustedWeights[platform as Platform] /= totalWeight;
      });
    }

    return adjustedWeights;
  }

  /**
   * 統合信頼度計算
   */
  private calculateUnifiedConfidence(
    data: PlatformRatingData[], 
    weights: Record<Platform, number>
  ): number {
    let totalConfidence = 0;
    let totalWeight = 0;

    data.forEach(platformData => {
      const weight = weights[platformData.platform] || 0;
      totalConfidence += platformData.confidence * weight;
      totalWeight += weight;
    });

    return totalWeight > 0 ? totalConfidence / totalWeight : 0;
  }

  /**
   * データ完全性計算
   */
  private calculateDataCompleteness(data: PlatformRatingData[]): number {
    const availablePlatforms = data.length;
    const totalPlatforms = 3; // Google, Tabelog, HotPepper
    
    return availablePlatforms / totalPlatforms;
  }

  /**
   * クロスプラットフォーム信頼性計算
   */
  private calculateReliabilityScore(data: PlatformRatingData[]): number {
    if (data.length < 2) {
      return 0.5; // 単一プラットフォームは中程度の信頼性
    }

    // 評価の分散を計算
    const ratings = data.map(d => d.rating);
    const avgRating = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
    const variance = ratings.reduce((sum, rating) => sum + Math.pow(rating - avgRating, 2), 0) / ratings.length;
    const standardDeviation = Math.sqrt(variance);

    // 分散が小さいほど信頼性が高い
    const reliabilityFromVariance = Math.max(0, 1 - standardDeviation / 2);
    
    // プラットフォーム数による信頼性向上
    const platformBonus = Math.min(data.length / 3, 1) * 0.2;
    
    return Math.min(1, reliabilityFromVariance + platformBonus);
  }

  /**
   * プラットフォームデータ取得のヘルパー
   */
  private async fetchPlatformData(
    platform: Platform, 
    fetcher: () => Promise<PlatformRatingData>
  ): Promise<{ success: boolean; data?: PlatformRatingData; error?: PlatformError }> {
    try {
      const data = await fetcher();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: {
          platform,
          error: error instanceof Error ? error.message : 'Unknown error',
          code: 'FETCH_ERROR',
          severity: 'medium',
          timestamp: new Date(),
          retryable: true,
        }
      };
    }
  }

  /**
   * 検索データ取得のヘルパー
   */
  private async fetchSearchData(
    platform: Platform,
    fetcher: () => Promise<PlatformRatingData[]>
  ): Promise<PlatformRatingData[]> {
    try {
      return await fetcher();
    } catch (error) {
      console.error(`Search failed for ${platform}:`, error);
      return [];
    }
  }

  /**
   * 検索結果をレストランIDでグループ化
   */
  private groupByRestaurant(
    results: PromiseSettledResult<PlatformRatingData[]>[]
  ): Map<string, PlatformRatingData[]> {
    const groups = new Map<string, PlatformRatingData[]>();

    results.forEach(result => {
      if (result.status === 'fulfilled') {
        result.value.forEach(data => {
          const key = data.restaurantId;
          if (!groups.has(key)) {
            groups.set(key, []);
          }
          groups.get(key)!.push(data);
        });
      }
    });

    return groups;
  }

  /**
   * 重みの正規化
   */
  private normalizeWeights(): void {
    const totalWeight = Object.values(this.config.weights).reduce((sum, weight) => sum + weight, 0);
    
    if (totalWeight !== 1) {
      Object.keys(this.config.weights).forEach(platform => {
        this.config.weights[platform as Platform] /= totalWeight;
      });
    }
  }

  /**
   * 設定の取得
   */
  public getConfig(): AggregationConfig {
    return { ...this.config };
  }

  /**
   * 設定の更新
   */
  public updateConfig(newConfig: Partial<AggregationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.normalizeWeights();
  }

  /**
   * バリデーション
   */
  public validateConfig(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 重みの合計チェック
    const totalWeight = Object.values(this.config.weights).reduce((sum, weight) => sum + weight, 0);
    if (Math.abs(totalWeight - 1) > 0.01) {
      warnings.push(`Weight sum is ${totalWeight}, expected 1.0`);
    }

    // 閾値チェック
    if (this.config.qualityThreshold < 0 || this.config.qualityThreshold > 1) {
      errors.push('Quality threshold must be between 0 and 1');
    }

    if (this.config.confidenceThreshold < 0 || this.config.confidenceThreshold > 1) {
      errors.push('Confidence threshold must be between 0 and 1');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}