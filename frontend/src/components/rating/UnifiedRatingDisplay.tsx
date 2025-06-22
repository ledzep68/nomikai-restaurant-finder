import React from 'react';
import { 
  UnifiedRating, 
  RatingDisplayOptions, 
  PlatformRatingData 
} from '@/types/platformAggregation';

interface UnifiedRatingDisplayProps {
  unifiedRating: UnifiedRating;
  options?: RatingDisplayOptions;
  className?: string;
}

export const UnifiedRatingDisplay: React.FC<UnifiedRatingDisplayProps> = ({
  unifiedRating,
  options = {
    showPlatformBreakdown: true,
    showConfidenceScore: false,
    showDataQuality: false,
    showProcessingTime: false,
    format: 'detailed',
  },
  className = '',
}) => {
  const renderStars = (rating: number, size: 'sm' | 'md' | 'lg' = 'md') => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    const sizeClass = {
      sm: 'w-3 h-3',
      md: 'w-4 h-4',
      lg: 'w-5 h-5',
    }[size];

    return (
      <div className="flex items-center gap-1">
        {/* Full stars */}
        {Array.from({ length: fullStars }).map((_, i) => (
          <svg
            key={`full-${i}`}
            className={`${sizeClass} text-yellow-400 fill-current`}
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
        
        {/* Half star */}
        {hasHalfStar && (
          <div className="relative">
            <svg
              className={`${sizeClass} text-gray-300 fill-current`}
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <div className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
              <svg
                className={`${sizeClass} text-yellow-400 fill-current`}
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
          </div>
        )}
        
        {/* Empty stars */}
        {Array.from({ length: emptyStars }).map((_, i) => (
          <svg
            key={`empty-${i}`}
            className={`${sizeClass} text-gray-300 fill-current`}
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    );
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'hotpepper':
        return (
          <div className="w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">H</span>
          </div>
        );
      case 'tabelog':
        return (
          <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">T</span>
          </div>
        );
      case 'google':
        return (
          <div className="w-4 h-4 bg-gray-400 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">G</span>
          </div>
        );
      default:
        return null;
    }
  };

  const getPlatformName = (platform: string) => {
    switch (platform) {
      case 'hotpepper':
        return 'ホットペッパー';
      case 'tabelog':
        return '食べログ';
      case 'google':
        return 'Google (無効)';
      default:
        return platform;
    }
  };

  const renderPlatformBreakdown = () => {
    if (!options.showPlatformBreakdown) return null;

    return (
      <div className="mt-4 space-y-2">
        <h4 className="text-sm font-medium text-gray-700">プラットフォーム別評価</h4>
        <div className="space-y-2">
          {unifiedRating.platforms.map((platformData: PlatformRatingData) => (
            <div key={platformData.platform} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getPlatformIcon(platformData.platform)}
                <span className="text-sm text-gray-600">
                  {getPlatformName(platformData.platform)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {renderStars(platformData.rating, 'sm')}
                <span className="text-sm font-medium">
                  {platformData.rating.toFixed(1)}
                </span>
                {platformData.reviewCount > 0 && (
                  <span className="text-xs text-gray-500">
                    ({platformData.reviewCount}件)
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderMetrics = () => {
    if (!options.showConfidenceScore && !options.showDataQuality) return null;

    return (
      <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
        {options.showConfidenceScore && (
          <div className="text-center">
            <div className="text-gray-500">信頼度</div>
            <div className="font-medium">
              {Math.round(unifiedRating.confidence * 100)}%
            </div>
          </div>
        )}
        {options.showDataQuality && (
          <div className="text-center">
            <div className="text-gray-500">データ完全性</div>
            <div className="font-medium">
              {Math.round(unifiedRating.dataCompleteness * 100)}%
            </div>
          </div>
        )}
      </div>
    );
  };

  if (options.format === 'compact') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {renderStars(unifiedRating.aggregatedScore, 'sm')}
        <span className="text-sm font-medium">
          {unifiedRating.aggregatedScore.toFixed(1)}
        </span>
        <span className="text-xs text-gray-500">
          ({unifiedRating.totalReviews}件)
        </span>
      </div>
    );
  }

  if (options.format === 'comparison') {
    return (
      <div className={`border rounded-lg p-4 ${className}`}>
        <div className="text-center mb-4">
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {unifiedRating.aggregatedScore.toFixed(1)}
          </div>
          {renderStars(unifiedRating.aggregatedScore, 'lg')}
          <div className="text-sm text-gray-600 mt-1">
            統合評価 ({unifiedRating.totalReviews}件のレビュー)
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4 text-center">
          {unifiedRating.platforms.map((platformData: PlatformRatingData) => (
            <div key={platformData.platform} className="border-l first:border-l-0 pl-4 first:pl-0">
              <div className="flex justify-center mb-1">
                {getPlatformIcon(platformData.platform)}
              </div>
              <div className="text-sm font-medium">
                {platformData.rating.toFixed(1)}
              </div>
              <div className="text-xs text-gray-500">
                {platformData.reviewCount}件
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Detailed format (default)
  return (
    <div className={`bg-white border rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {renderStars(unifiedRating.aggregatedScore, 'md')}
          <div>
            <div className="text-lg font-semibold">
              {unifiedRating.aggregatedScore.toFixed(1)}
            </div>
            <div className="text-sm text-gray-600">
              統合評価
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium">
            {unifiedRating.totalReviews}件
          </div>
          <div className="text-xs text-gray-500">
            レビュー総数
          </div>
        </div>
      </div>

      {renderPlatformBreakdown()}
      {renderMetrics()}

      <div className="mt-4 text-xs text-gray-500">
        最終更新: {new Date(unifiedRating.lastUpdated).toLocaleString('ja-JP')}
      </div>
    </div>
  );
};