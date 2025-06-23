import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Rating,
  LinearProgress,
  Chip,
  Grid,
  Alert,
  Skeleton,
  Tooltip,
  IconButton,
  Collapse,
} from '@mui/material';
import {
  Star,
  TrendingUp,
  Info,
  ExpandMore,
  ExpandLess,
  Refresh,
} from '@mui/icons-material';
import { restaurantService } from '@services/restaurantService';
import { formatDistanceToNow } from '@utils/dateUtils';

interface PlatformRating {
  platform: 'hotpepper' | 'tabelog' | 'google' | 'retty';
  rating: number;
  reviewCount: number;
  maxRating: number;
  normalizedScore: number;
  weight: number;
  lastUpdated: string;
  url?: string;
  isAvailable: boolean;
}

interface ComprehensiveRatingData {
  aggregatedScore: number;
  confidence: number;
  totalReviews: number;
  platformRatings: PlatformRating[];
  criteria: {
    rating: number;
    reviewVolume: number;
    recency: number;
    consistency: number;
  };
  recommendation: 'highly_recommended' | 'recommended' | 'suitable' | 'not_recommended';
  lastCalculated: string;
}

interface ComprehensiveRatingProps {
  restaurantId: string;
  showDetails?: boolean;
  onRefresh?: () => void;
}

const PLATFORM_CONFIG = {
  hotpepper: {
    label: 'HotPepper',
    color: '#FF6B6B',
    icon: '🌶️',
  },
  tabelog: {
    label: '食べログ',
    color: '#FF9F40',
    icon: '🍽️',
  },
  google: {
    label: 'Google',
    color: '#4285F4',
    icon: '🌐',
  },
  retty: {
    label: 'Retty',
    color: '#00BFA5',
    icon: '📝',
  },
};

export const ComprehensiveRating: React.FC<ComprehensiveRatingProps> = ({
  restaurantId,
  showDetails = true,
  onRefresh,
}) => {
  const [ratingData, setRatingData] = useState<ComprehensiveRatingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchRatingData();
  }, [restaurantId]);

  const fetchRatingData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await restaurantService.getComprehensiveRating(restaurantId);
      setRatingData(data);
    } catch (err) {
      setError('評価データの取得に失敗しました');
      console.error('Failed to fetch rating data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchRatingData();
    setRefreshing(false);
    onRefresh?.();
  };

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'highly_recommended':
        return 'error';
      case 'recommended':
        return 'warning';
      case 'suitable':
        return 'success';
      default:
        return 'default';
    }
  };

  const getRecommendationLabel = (recommendation: string) => {
    switch (recommendation) {
      case 'highly_recommended':
        return '特におすすめ';
      case 'recommended':
        return 'おすすめ';
      case 'suitable':
        return '良い選択';
      default:
        return '要検討';
    }
  };

  if (loading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Skeleton variant="text" height={32} width="60%" sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={60} sx={{ mb: 2 }} />
        <Skeleton variant="text" height={24} />
        <Skeleton variant="text" height={24} />
      </Paper>
    );
  }

  if (error || !ratingData) {
    return (
      <Paper sx={{ p: 3 }}>
        <Alert severity="error">{error || '評価データがありません'}</Alert>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h6" component="h2">
          総合評価
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="最終更新">
            <Typography variant="caption" color="text.secondary">
              {formatDistanceToNow(ratingData.lastCalculated)}前
            </Typography>
          </Tooltip>
          <IconButton 
            size="small" 
            onClick={handleRefresh} 
            disabled={refreshing}
            aria-label="評価を更新"
          >
            <Refresh className={refreshing ? 'rotating' : ''} />
          </IconButton>
        </Box>
      </Box>

      {/* Main Score */}
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 1 }}>
          <Typography variant="h3" component="div" fontWeight="bold">
            {ratingData.aggregatedScore.toFixed(1)}
          </Typography>
          <Typography variant="h5" color="text.secondary">
            / 5.0
          </Typography>
        </Box>
        
        <Rating 
          value={ratingData.aggregatedScore} 
          precision={0.1} 
          readOnly 
          size="large"
          sx={{ mb: 1 }}
        />
        
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
          <Chip
            label={getRecommendationLabel(ratingData.recommendation)}
            color={getRecommendationColor(ratingData.recommendation)}
            icon={<Star />}
            size="small"
          />
          <Typography variant="body2" color="text.secondary">
            {ratingData.totalReviews.toLocaleString()}件のレビュー
          </Typography>
        </Box>

        {/* Confidence Indicator */}
        <Box sx={{ mt: 2, px: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="caption" color="text.secondary">
              信頼度
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {(ratingData.confidence * 100).toFixed(0)}%
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={ratingData.confidence * 100} 
            sx={{ height: 6, borderRadius: 3 }}
          />
        </Box>
      </Box>

      {/* Platform Breakdown */}
      {showDetails && (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold">
              プラットフォーム別評価
            </Typography>
            <IconButton size="small" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>

          <Collapse in={expanded}>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {ratingData.platformRatings.map((platform) => (
                <Grid item xs={12} sm={6} key={platform.platform}>
                  <Box
                    sx={{
                      p: 2,
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 2,
                      opacity: platform.isAvailable ? 1 : 0.5,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" fontWeight="bold">
                          {PLATFORM_CONFIG[platform.platform].icon} {PLATFORM_CONFIG[platform.platform].label}
                        </Typography>
                        {!platform.isAvailable && (
                          <Chip label="利用不可" size="small" color="default" />
                        )}
                      </Box>
                      <Typography variant="body2" fontWeight="bold">
                        {platform.rating.toFixed(1)}/{platform.maxRating}
                      </Typography>
                    </Box>
                    
                    <Rating 
                      value={platform.normalizedScore * 5} 
                      precision={0.1} 
                      readOnly 
                      size="small"
                      sx={{ mb: 1 }}
                    />
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="text.secondary">
                        {platform.reviewCount.toLocaleString()}件
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        重み: {(platform.weight * 100).toFixed(0)}%
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>

            {/* Evaluation Criteria */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                評価基準
              </Typography>
              {Object.entries(ratingData.criteria).map(([key, value]) => (
                <Box key={key} sx={{ mb: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      {key === 'rating' && '評価スコア'}
                      {key === 'reviewVolume' && 'レビュー数'}
                      {key === 'recency' && '最新性'}
                      {key === 'consistency' && '一貫性'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {value}%
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={value} 
                    sx={{ height: 4, borderRadius: 2 }}
                  />
                </Box>
              ))}
            </Box>
          </Collapse>
        </>
      )}

      {/* Info Notice */}
      <Alert severity="info" icon={<Info />} sx={{ mt: 2 }}>
        <Typography variant="caption">
          複数のグルメサイトの評価を独自のアルゴリズムで総合的に分析しています。
          Google Placesは将来的に統合予定です。
        </Typography>
      </Alert>
    </Paper>
  );
};

export default ComprehensiveRating;