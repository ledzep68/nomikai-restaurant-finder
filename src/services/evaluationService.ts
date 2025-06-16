import { NormalizedRestaurant } from '@/types/externalApi';
import { 
  EvaluationCriteria, 
  EvaluationResult, 
  PlatformWeight,
  SearchConditions 
} from '@/types/evaluation';

export class EvaluationService {
  private readonly platformWeights: PlatformWeight = {
    tabelog: 0.35,      // 食べログ: 高い信頼性、日本での評価基準
    hotpepper: 0.15,    // ホットペッパー: 予約情報と空席情報
    googlePlaces: 0.30, // Google: グローバル基準、レビュー数多
    retty: 0.20,        // Retty: 実名レビュー、推奨率
  };

  public calculateTotalScore(
    restaurants: NormalizedRestaurant[],
    conditions: SearchConditions
  ): EvaluationResult {
    if (restaurants.length === 0) {
      throw new Error('No restaurant data available for evaluation');
    }

    const restaurantName = restaurants[0].name;
    const restaurantId = this.generateCompositeId(restaurants);

    // 各プラットフォームのスコアを計算
    const platformScores = restaurants.map(restaurant => {
      const criteria = this.evaluateCriteria(restaurant, conditions);
      const score = this.calculatePlatformScore(criteria);
      const weight = this.platformWeights[restaurant.platform];

      return {
        platform: restaurant.platform,
        score,
        weight,
        available: true,
        criteria,
      };
    });

    // 利用可能なプラットフォームの重みを正規化
    const availableWeightSum = platformScores.reduce((sum, ps) => sum + ps.weight, 0);
    const normalizedScores = platformScores.map(ps => ({
      ...ps,
      weight: ps.weight / availableWeightSum,
    }));

    // 総合スコアを計算
    const totalScore = normalizedScores.reduce(
      (sum, ps) => sum + ps.score * ps.weight,
      0
    );

    // 統合された評価基準を計算
    const aggregatedCriteria = this.aggregateCriteria(
      normalizedScores.map(ps => ps.criteria!),
      normalizedScores.map(ps => ps.weight)
    );

    // 信頼度を計算（利用可能なプラットフォーム数に基づく）
    const confidence = restaurants.length / 4; // 4 platforms total

    // 推奨レベルを決定
    const recommendation = this.getRecommendationLevel(totalScore, confidence);

    return {
      restaurantId,
      restaurantName,
      totalScore: Math.round(totalScore * 100) / 100,
      criteria: aggregatedCriteria,
      platformScores: normalizedScores.map(ps => ({
        platform: ps.platform,
        score: Math.round(ps.score * 100) / 100,
        weight: Math.round(ps.weight * 100) / 100,
        available: ps.available,
      })),
      confidence,
      recommendation,
    };
  }

  private evaluateCriteria(
    restaurant: NormalizedRestaurant,
    conditions: SearchConditions
  ): EvaluationCriteria {
    // 基本評価点（0-100）
    const rating = this.normalizeRating(restaurant.rating, restaurant.platform);

    // レビュー数重み（0-100）
    const reviewCount = this.calculateReviewWeight(restaurant.reviewCount, restaurant.platform);

    // 最新性重み（0-100）
    const recency = this.calculateRecencyScore(restaurant.fetchedAt);

    // 価格適合度（0-100）
    const priceMatch = this.calculatePriceMatch(
      restaurant.priceRange.category,
      conditions.priceRange
    );

    // 条件適合度（0-100）
    const conditionMatch = this.calculateConditionMatch(restaurant, conditions);

    return {
      rating,
      reviewCount,
      recency,
      priceMatch,
      conditionMatch,
    };
  }

  private normalizeRating(rating: number, platform: string): number {
    // 各プラットフォームの評価を0-100に正規化
    const normalizers: Record<string, (rating: number) => number> = {
      tabelog: (r) => (r / 5) * 100,          // 0-5 → 0-100
      hotpepper: () => 50,                     // 評価なし → 中立値
      googlePlaces: (r) => (r / 5) * 100,     // 0-5 → 0-100
      retty: (r) => r,                         // Already 0-100
    };

    return normalizers[platform]?.(rating) || 50;
  }

  private calculateReviewWeight(reviewCount: number, platform: string): number {
    // プラットフォームごとの基準値
    const benchmarks: Record<string, number> = {
      tabelog: 100,
      hotpepper: 50,
      googlePlaces: 200,
      retty: 80,
    };

    const benchmark = benchmarks[platform] || 100;
    
    // ログスケールで正規化（レビュー数が多いほど信頼性が高い）
    const normalizedCount = Math.log10(reviewCount + 1) / Math.log10(benchmark + 1);
    return Math.min(normalizedCount * 100, 100);
  }

  private calculateRecencyScore(fetchedAt: Date): number {
    const now = new Date();
    const hoursSinceFetch = (now.getTime() - fetchedAt.getTime()) / (1000 * 60 * 60);
    
    // 24時間以内: 100点、1週間で50点、1ヶ月で0点
    if (hoursSinceFetch <= 24) return 100;
    if (hoursSinceFetch <= 168) return 100 - ((hoursSinceFetch - 24) / 144) * 50;
    return Math.max(0, 50 - ((hoursSinceFetch - 168) / 552) * 50);
  }

  private calculatePriceMatch(
    restaurantPrice: 'low' | 'medium' | 'high',
    desiredPrice?: 'low' | 'medium' | 'high'
  ): number {
    if (!desiredPrice) return 100; // 価格指定なしは全て適合

    const priceMap = { low: 1, medium: 2, high: 3 };
    const difference = Math.abs(priceMap[restaurantPrice] - priceMap[desiredPrice]);
    
    // 完全一致: 100点、1段階差: 70点、2段階差: 40点
    return 100 - (difference * 30);
  }

  private calculateConditionMatch(
    restaurant: NormalizedRestaurant,
    conditions: SearchConditions
  ): number {
    let matchScore = 100;
    let conditionCount = 0;

    // ジャンルマッチ
    if (conditions.genre) {
      conditionCount++;
      if (restaurant.genre.toLowerCase().includes(conditions.genre.toLowerCase())) {
        // Full match, no penalty
      } else {
        matchScore -= 20;
      }
    }

    // 場所マッチ（簡易版）
    if (conditions.location && restaurant.address) {
      conditionCount++;
      if (restaurant.address.includes(conditions.location)) {
        // Location match, no penalty
      } else {
        matchScore -= 15;
      }
    }

    // 営業時間（簡易チェック）
    if (conditions.datetime && restaurant.openingHours) {
      conditionCount++;
      // Simplified check - in real implementation, parse hours properly
      if (restaurant.openingHours.toLowerCase().includes('open')) {
        // Open, no penalty
      } else {
        matchScore -= 10;
      }
    }

    return Math.max(0, matchScore);
  }

  private calculatePlatformScore(criteria: EvaluationCriteria): number {
    // 各基準の重み付け
    const weights = {
      rating: 0.40,        // 評価が最も重要
      reviewCount: 0.25,   // レビュー数（信頼性）
      recency: 0.10,       // データの新しさ
      priceMatch: 0.15,    // 価格適合度
      conditionMatch: 0.10 // その他条件適合度
    };

    return (
      criteria.rating * weights.rating +
      criteria.reviewCount * weights.reviewCount +
      criteria.recency * weights.recency +
      criteria.priceMatch * weights.priceMatch +
      criteria.conditionMatch * weights.conditionMatch
    );
  }

  private aggregateCriteria(
    criteriaList: EvaluationCriteria[],
    weights: number[]
  ): EvaluationCriteria {
    const aggregated: EvaluationCriteria = {
      rating: 0,
      reviewCount: 0,
      recency: 0,
      priceMatch: 0,
      conditionMatch: 0,
    };

    criteriaList.forEach((criteria, index) => {
      aggregated.rating += criteria.rating * weights[index];
      aggregated.reviewCount += criteria.reviewCount * weights[index];
      aggregated.recency += criteria.recency * weights[index];
      aggregated.priceMatch += criteria.priceMatch * weights[index];
      aggregated.conditionMatch += criteria.conditionMatch * weights[index];
    });

    // Round values
    Object.keys(aggregated).forEach(key => {
      aggregated[key as keyof EvaluationCriteria] = 
        Math.round(aggregated[key as keyof EvaluationCriteria] * 100) / 100;
    });

    return aggregated;
  }

  private getRecommendationLevel(
    score: number,
    confidence: number
  ): 'highly_recommended' | 'recommended' | 'suitable' | 'not_recommended' {
    // 信頼度が低い場合はスコアを調整
    const adjustedScore = score * (0.5 + confidence * 0.5);

    if (adjustedScore >= 80) return 'highly_recommended';
    if (adjustedScore >= 65) return 'recommended';
    if (adjustedScore >= 50) return 'suitable';
    return 'not_recommended';
  }

  private generateCompositeId(restaurants: NormalizedRestaurant[]): string {
    // Create a composite ID from all platform IDs
    const platformIds = restaurants
      .map(r => `${r.platform}:${r.externalId}`)
      .sort()
      .join('|');
    
    // Simple hash function for shorter ID
    let hash = 0;
    for (let i = 0; i < platformIds.length; i++) {
      const char = platformIds.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    return `composite_${Math.abs(hash)}`;
  }
}