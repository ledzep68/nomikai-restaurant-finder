import { CacheService } from './cacheService';
import { ApiIntegrationService } from './apiIntegrationService';
import { UnifiedRatingService } from './unifiedRatingService';
import { FreeTierRatingService } from './freeTierRatingService';
import { config } from '@/utils/config';

export interface PlatformRatingDetail {
  platform: 'hotpepper' | 'tabelog' | 'google' | 'retty';
  rating: number;
  reviewCount: number;
  maxRating: number;
  normalizedScore: number;
  weight: number;
  lastUpdated: string;
  url?: string;
  isAvailable: boolean;
  reviewSummary?: {
    positive: string[];
    negative: string[];
    keywords: string[];
  };
}

export interface ComprehensiveRatingResult {
  restaurantId: string;
  restaurantName: string;
  aggregatedScore: number;
  confidence: number;
  totalReviews: number;
  platformRatings: PlatformRatingDetail[];
  criteria: {
    rating: number;
    reviewVolume: number;
    recency: number;
    consistency: number;
  };
  recommendation: 'highly_recommended' | 'recommended' | 'suitable' | 'not_recommended';
  lastCalculated: string;
  reviewHighlights?: {
    mostMentioned: string[];
    strengths: string[];
    improvements: string[];
  };
}

export class ComprehensiveRatingService {
  private cache: CacheService;
  private apiIntegrationService: ApiIntegrationService;
  private unifiedRatingService: UnifiedRatingService;
  private freeTierRatingService: FreeTierRatingService;

  constructor() {
    this.cache = new CacheService();
    this.apiIntegrationService = new ApiIntegrationService();
    this.unifiedRatingService = new UnifiedRatingService();
    this.freeTierRatingService = new FreeTierRatingService();
  }

  /**
   * 指定レストランの総合評価データを取得
   */
  public async getComprehensiveRating(
    restaurantId: string,
    forceRefresh: boolean = false
  ): Promise<ComprehensiveRatingResult> {
    const cacheKey = `comprehensive_rating:${restaurantId}`;
    
    if (!forceRefresh) {
      const cached = await this.cache.get<ComprehensiveRatingResult>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      // 複数プラットフォームから評価データを取得
      const ratingData = await this.fetchMultiPlatformRatings(restaurantId);
      
      // 総合評価を計算
      const result = this.calculateComprehensiveRating(restaurantId, ratingData);
      
      // キャッシュに保存（6時間）
      await this.cache.set(cacheKey, result, 21600);
      
      return result;
    } catch (error) {
      console.error('Failed to get comprehensive rating:', error);
      throw new Error('総合評価の取得に失敗しました');
    }
  }

  /**
   * 複数プラットフォームから評価データを取得
   */
  private async fetchMultiPlatformRatings(restaurantId: string): Promise<any[]> {
    const platforms = [
      { 
        name: 'hotpepper', 
        weight: parseFloat(process.env.PLATFORM_WEIGHTS_HOTPEPPER || '0.85'),
        enabled: true 
      },
      { 
        name: 'tabelog', 
        weight: parseFloat(process.env.PLATFORM_WEIGHTS_TABELOG || '0.15'),
        enabled: true 
      },
      { 
        name: 'google', 
        weight: parseFloat(process.env.PLATFORM_WEIGHTS_GOOGLE || '0.00'),
        enabled: parseFloat(process.env.PLATFORM_WEIGHTS_GOOGLE || '0') > 0 
      },
      { 
        name: 'retty', 
        weight: 0,
        enabled: false 
      },
    ];

    const ratingPromises = platforms.map(async (platform) => {
      if (!platform.enabled) {
        return {
          platform: platform.name,
          data: null,
          weight: platform.weight,
          isAvailable: false,
        };
      }

      try {
        const data = await this.fetchPlatformRating(restaurantId, platform.name);
        return {
          platform: platform.name,
          data,
          weight: platform.weight,
          isAvailable: true,
        };
      } catch (error) {
        console.error(`Failed to fetch ${platform.name} rating:`, error);
        return {
          platform: platform.name,
          data: null,
          weight: platform.weight,
          isAvailable: false,
        };
      }
    });

    return Promise.all(ratingPromises);
  }

  /**
   * 特定プラットフォームの評価データを取得
   */
  private async fetchPlatformRating(restaurantId: string, platform: string): Promise<any> {
    // プラットフォーム別の実装
    switch (platform) {
      case 'hotpepper':
        return this.fetchHotPepperRating(restaurantId);
      case 'tabelog':
        return this.fetchTabelogRating(restaurantId);
      case 'google':
        return this.fetchGoogleRating(restaurantId);
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  /**
   * HotPepper評価データ取得
   */
  private async fetchHotPepperRating(restaurantId: string): Promise<any> {
    // 実際のAPIコール（モック実装）
    return {
      rating: 4.2,
      reviewCount: 150,
      maxRating: 5,
      lastUpdated: new Date().toISOString(),
      url: `https://www.hotpepper.jp/str${restaurantId}/`,
      reviews: {
        positive: ['美味しい', '雰囲気が良い', 'コスパ最高'],
        negative: ['混雑', '予約が取りにくい'],
      },
    };
  }

  /**
   * Tabelog評価データ取得
   */
  private async fetchTabelogRating(restaurantId: string): Promise<any> {
    // 実際のスクレイピング/API（モック実装）
    return {
      rating: 3.8,
      reviewCount: 85,
      maxRating: 5,
      lastUpdated: new Date().toISOString(),
      url: `https://tabelog.com/tokyo/A1234/A123456/${restaurantId}/`,
      reviews: {
        positive: ['本格的な味', 'サービスが丁寧'],
        negative: ['価格がやや高め'],
      },
    };
  }

  /**
   * Google評価データ取得（将来実装用）
   */
  private async fetchGoogleRating(restaurantId: string): Promise<any> {
    // Google Places API実装（現在は無効）
    throw new Error('Google ratings are not currently enabled');
  }

  /**
   * 総合評価を計算
   */
  private calculateComprehensiveRating(
    restaurantId: string,
    platformData: any[]
  ): ComprehensiveRatingResult {
    const availablePlatforms = platformData.filter(p => p.isAvailable && p.data);
    
    if (availablePlatforms.length === 0) {
      throw new Error('No rating data available');
    }

    // プラットフォーム別評価を正規化
    const platformRatings: PlatformRatingDetail[] = platformData.map(p => {
      if (!p.data) {
        return {
          platform: p.platform,
          rating: 0,
          reviewCount: 0,
          maxRating: 5,
          normalizedScore: 0,
          weight: p.weight,
          lastUpdated: new Date().toISOString(),
          isAvailable: false,
        };
      }

      const normalizedScore = p.data.rating / p.data.maxRating;
      
      return {
        platform: p.platform,
        rating: p.data.rating,
        reviewCount: p.data.reviewCount,
        maxRating: p.data.maxRating,
        normalizedScore,
        weight: p.weight,
        lastUpdated: p.data.lastUpdated,
        url: p.data.url,
        isAvailable: true,
        reviewSummary: p.data.reviews,
      };
    });

    // 重み付き平均スコアを計算
    const totalWeight = availablePlatforms.reduce((sum, p) => sum + p.weight, 0);
    const weightedScore = availablePlatforms.reduce((sum, p) => {
      const normalizedScore = p.data.rating / p.data.maxRating;
      return sum + (normalizedScore * p.weight);
    }, 0) / totalWeight;

    // 総レビュー数
    const totalReviews = availablePlatforms.reduce((sum, p) => sum + p.data.reviewCount, 0);

    // 評価基準を計算
    const criteria = this.calculateCriteria(availablePlatforms, weightedScore);

    // 推奨レベルを決定
    const recommendation = this.determineRecommendation(weightedScore * 5, criteria);

    // 信頼度を計算
    const confidence = this.calculateConfidence(availablePlatforms, totalReviews);

    // レビューハイライトを抽出
    const reviewHighlights = this.extractReviewHighlights(availablePlatforms);

    return {
      restaurantId,
      restaurantName: 'Restaurant Name', // 実際の実装では別途取得
      aggregatedScore: weightedScore * 5, // 5点満点に変換
      confidence,
      totalReviews,
      platformRatings,
      criteria,
      recommendation,
      lastCalculated: new Date().toISOString(),
      reviewHighlights,
    };
  }

  /**
   * 評価基準を計算
   */
  private calculateCriteria(platforms: any[], weightedScore: number): any {
    // レビュー数による重み
    const totalReviews = platforms.reduce((sum, p) => sum + p.data.reviewCount, 0);
    const reviewVolume = Math.min(totalReviews / 200 * 100, 100);

    // 最新性（ダミー実装）
    const recency = 85;

    // 一貫性（プラットフォーム間の評価のばらつき）
    const scores = platforms.map(p => p.data.rating / p.data.maxRating);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) / scores.length;
    const consistency = Math.max(0, 100 - (variance * 200));

    return {
      rating: weightedScore * 100,
      reviewVolume,
      recency,
      consistency,
    };
  }

  /**
   * 推奨レベルを決定
   */
  private determineRecommendation(
    score: number,
    criteria: any
  ): 'highly_recommended' | 'recommended' | 'suitable' | 'not_recommended' {
    const overallScore = (
      score * 0.6 +
      (criteria.reviewVolume / 100) * 0.2 +
      (criteria.consistency / 100) * 0.2
    );

    if (overallScore >= 4.5) return 'highly_recommended';
    if (overallScore >= 3.8) return 'recommended';
    if (overallScore >= 3.0) return 'suitable';
    return 'not_recommended';
  }

  /**
   * 信頼度を計算
   */
  private calculateConfidence(platforms: any[], totalReviews: number): number {
    // プラットフォーム数による信頼度
    const platformConfidence = Math.min(platforms.length / 3, 1) * 0.4;
    
    // レビュー数による信頼度
    const reviewConfidence = Math.min(totalReviews / 300, 1) * 0.6;
    
    return platformConfidence + reviewConfidence;
  }

  /**
   * レビューハイライトを抽出
   */
  private extractReviewHighlights(platforms: any[]): any {
    const allPositive: string[] = [];
    const allNegative: string[] = [];

    platforms.forEach(p => {
      if (p.data?.reviews) {
        allPositive.push(...(p.data.reviews.positive || []));
        allNegative.push(...(p.data.reviews.negative || []));
      }
    });

    // 重複を除去して頻出順にソート（簡易実装）
    const uniquePositive = [...new Set(allPositive)];
    const uniqueNegative = [...new Set(allNegative)];

    return {
      mostMentioned: uniquePositive.slice(0, 5),
      strengths: uniquePositive.slice(0, 3),
      improvements: uniqueNegative.slice(0, 2),
    };
  }

  /**
   * バッチ更新（管理者用）
   */
  public async batchUpdateRatings(restaurantIds: string[]): Promise<void> {
    const batchSize = 10;
    
    for (let i = 0; i < restaurantIds.length; i += batchSize) {
      const batch = restaurantIds.slice(i, i + batchSize);
      await Promise.all(
        batch.map(id => this.getComprehensiveRating(id, true))
      );
      
      // レート制限を考慮して待機
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}