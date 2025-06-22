/**
 * 3-Platform Rating Aggregation System Type Definitions
 * Phase 7: Multi-platform rating aggregation implementation
 */

export type Platform = 'hotpepper' | 'google' | 'tabelog';

export interface PlatformConfig {
  name: string;
  enabled: boolean;
  weight: number;
  apiEndpoint?: string;
  cacheTTL: number;
  rateLimit: number;
  timeout: number;
}

export interface PlatformRatingData {
  platform: Platform;
  restaurantId: string;
  rating: number;              // 0-5 scale (normalized)
  reviewCount: number;
  confidence: number;          // 0-1 data confidence score
  dataQuality: number;         // 0-1 data quality score
  priceInfo?: {
    min?: number;
    max?: number;
    level?: number;            // Google Places price level (0-4)
    dinner?: string;           // Tabelog dinner price
    lunch?: string;            // Tabelog lunch price
  };
  location?: {
    latitude: number;
    longitude: number;
  };
  additionalInfo?: {
    [key: string]: any;        // Platform-specific additional data
  };
  lastUpdated: Date;
  source: string;              // Original data source identifier
}

export interface UnifiedRating {
  restaurantId: string;
  aggregatedScore: number;     // 0-5 scale unified score
  confidence: number;          // 0-1 overall confidence level
  platforms: PlatformRatingData[];
  totalReviews: number;
  dataCompleteness: number;    // 0-1 data completeness score
  reliabilityScore: number;    // 0-1 cross-platform reliability
  aggregationMetadata: {
    algorithm: string;
    weights: Record<Platform, number>;
    timestamp: Date;
    version: string;
  };
  lastUpdated: Date;
}

export interface AggregationConfig {
  weights: Record<Platform, number>;
  algorithm: 'weighted_average' | 'bayesian' | 'machine_learning';
  qualityThreshold: number;    // Minimum quality score to include in aggregation
  confidenceThreshold: number; // Minimum confidence to include in aggregation
  enableDynamicWeights: boolean; // Adjust weights based on data quality
}

export interface PlatformError {
  platform: Platform;
  error: string;
  code: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: Date;
  retryable: boolean;
}

export interface AggregationResult {
  unifiedRating: UnifiedRating | null;
  errors: PlatformError[];
  partialData: boolean;        // True if some platforms failed
  processingTime: number;      // Time taken for aggregation (ms)
  cacheHit: boolean;
}

export interface RatingDisplayOptions {
  showPlatformBreakdown: boolean;
  showConfidenceScore: boolean;
  showDataQuality: boolean;
  showProcessingTime: boolean;
  format: 'compact' | 'detailed' | 'comparison';
}

export interface PlatformAttribution {
  platform: Platform;
  attribution: string;
  legalNotice: string;
  dataUsagePolicy: string;
}

export interface CacheEntry {
  key: string;
  data: PlatformRatingData | UnifiedRating;
  ttl: number;
  platform: Platform;
  timestamp: Date;
}

export interface AggregationAnalytics {
  totalRequests: number;
  successfulAggregations: number;
  partialFailures: number;
  completeFailures: number;
  averageProcessingTime: number;
  platformSuccessRates: Record<Platform, number>;
  cacheHitRates: Record<Platform, number>;
  errorsByPlatform: Record<Platform, PlatformError[]>;
}

// Personal use compliance types
export interface PersonalUseConfig {
  purposeDeclaration: string;
  nonCommercialUse: boolean;
  respectfulAccess: boolean;
  dataScope: 'basic_info_only' | 'aggregated_stats_only' | 'full_access';
  attributionRequired: boolean;
}

export interface ScrapingConfig {
  baseUrl: string;
  requestDelay: number;        // Milliseconds between requests
  maxRetries: number;
  timeout: number;
  respectRobotsTxt: boolean;
  userAgent: string;
  personalUse: PersonalUseConfig;
}

// Error handling types
export interface PlatformServiceError extends Error {
  platform: Platform;
  code: string;
  retryable: boolean;
  details?: any;
}

export interface AggregationServiceError extends Error {
  code: string;
  platformErrors?: PlatformError[];
  partialData?: UnifiedRating;
}

// Validation types
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface PlatformDataValidator {
  validateRatingData(data: PlatformRatingData): ValidationResult;
  validateAggregationConfig(config: AggregationConfig): ValidationResult;
  validateUnifiedRating(rating: UnifiedRating): ValidationResult;
}

export interface DataNormalizationOptions {
  sourceScale: {
    min: number;
    max: number;
  };
  targetScale: {
    min: number;
    max: number;
  };
  method: 'linear' | 'logarithmic' | 'custom';
}