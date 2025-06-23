export interface PlatformRating {
  platform: 'hotpepper' | 'tabelog' | 'google' | 'retty';
  rating: number;
  reviewCount: number;
  weight: number;
  isAvailable: boolean;
  lastUpdated?: string;
}

export interface ComprehensiveRatingData {
  aggregatedScore: number;
  confidence: number;
  platformRatings: PlatformRating[];
  criteria: {
    rating: number;
    reviewVolume: number;
    recency: number;
    consistency: number;
  };
  lastCalculated: string;
}

export interface ComprehensiveRatingResult {
  success: boolean;
  data: ComprehensiveRatingData;
  meta: {
    restaurantId: string;
    calculationTime: number;
    dataFreshness: 'fresh' | 'cached' | 'stale';
  };
}

export interface UnifiedRating {
  value: number;
  maxValue: number;
  confidence: number;
  sourceCount: number;
  aggregatedScore?: number;
  platforms?: PlatformRating[];
  dataCompleteness?: number;
}

export interface RatingDisplayOptions {
  showDetails?: boolean;
  size?: 'small' | 'medium' | 'large';
  variant?: 'compact' | 'detailed';
  showPlatformBreakdown?: boolean;
  showConfidenceScore?: boolean;
  showDataQuality?: boolean;
  showProcessingTime?: boolean;
  format?: string;
}

export interface PlatformRatingData {
  platform: string;
  rating: number;
  reviewCount: number;
  weight: number;
  isAvailable: boolean;
}

export interface UnifiedRatingDisplayProps {
  rating: number;
  maxRating?: number;
  showDetails?: boolean;
  size?: 'small' | 'medium' | 'large';
  platforms?: PlatformRating[];
}

export interface PlatformAttribution {
  platform: string;
  attribution: string;
  url?: string;
  legalNotice?: string;
  dataUsagePolicy?: string;
}

export interface PlatformAttributionProps {
  platforms: string[];
  variant?: 'compact' | 'detailed';
}