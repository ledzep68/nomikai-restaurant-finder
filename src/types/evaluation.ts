export interface EvaluationCriteria {
  rating: number;         // 基本評価点 (0-100)
  reviewCount: number;    // レビュー数重み (0-100)
  recency: number;        // 最新性重み (0-100)
  priceMatch: number;     // 価格適合度 (0-100)
  conditionMatch: number; // 条件適合度 (0-100)
}

export interface PlatformWeight {
  tabelog: number;
  hotpepper: number;
  googlePlaces: number;
  retty: number;
}

export interface EvaluationResult {
  restaurantId: string;
  restaurantName: string;
  totalScore: number;
  criteria: EvaluationCriteria;
  platformScores: {
    platform: string;
    score: number;
    weight: number;
    available: boolean;
  }[];
  confidence: number; // 0-1 (based on data availability)
  recommendation: 'highly_recommended' | 'recommended' | 'suitable' | 'not_recommended';
}

export interface SearchConditions {
  location: string;
  genre?: string;
  priceRange?: 'low' | 'medium' | 'high';
  partySize?: number;
  datetime?: Date;
  privateRoom?: boolean;
  smokingAllowed?: boolean;
  allYouCanDrink?: boolean;
}