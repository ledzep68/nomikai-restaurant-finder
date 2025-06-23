import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Rating,
  Pagination,
  Alert,
  Skeleton,
} from '@mui/material';
import {
  LocationOn,
  Restaurant,
  Star,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@store/index';
import { setQuery, searchRestaurants } from '@store/searchSlice';
import { LazyImage } from '@components/common/LazyImage';
import { FavoriteButton } from '@components/common/FavoriteButton';
import { SimpleRestaurantCard } from '@components/debug/SimpleRestaurantCard';
import {
  formatPriceRange,
  getRecommendationLabel,
  getPlatformLabel,
  truncateText,
} from '@utils/helpers';
import { RECOMMENDATION_LABELS } from '@utils/constants';
import { 
  responsiveSpacing, 
  responsiveFontSizes, 
  responsiveBreakpoints,
  mobileFirstStyles,
  hiddenOnMobile,
  hiddenOnDesktop 
} from '@utils/responsive';

const SearchResults: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { results, loading, query } = useAppSelector((state) => state.search);

  const handlePageChange = async (_event: React.ChangeEvent<unknown>, page: number) => {
    const newQuery = { ...query, page };
    dispatch(setQuery(newQuery));
    await dispatch(searchRestaurants(newQuery));
  };


  const getRecommendationColor = (recommendation: keyof typeof RECOMMENDATION_LABELS) => {
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

  if (loading) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          検索中...
        </Typography>
        <Grid container spacing={3}>
          {[...Array(6)].map((_, index) => (
            <Grid item xs={12} md={6} lg={4} key={index}>
              <Card>
                <Skeleton variant="rectangular" height={200} />
                <CardContent>
                  <Skeleton variant="text" height={32} />
                  <Skeleton variant="text" height={24} />
                  <Skeleton variant="text" height={24} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  if (!results) {
    return (
      <Alert severity="info">
        検索条件を入力して検索ボタンを押してください
      </Alert>
    );
  }

  if (results.restaurants.length === 0) {
    return (
      <Alert severity="warning">
        検索条件に一致するレストランが見つかりませんでした。
        条件を変更して再度検索してください。
      </Alert>
    );
  }

  const totalPages = results.pagination?.totalPages || Math.ceil(results.restaurants.length / (query.limit || 20));
  const totalCount = results.pagination?.totalItems || results.restaurants.length;

  return (
    <Box data-testid="search-results">
      {/* Results Header */}
      <Box sx={{ 
        mb: responsiveSpacing.medium,
        px: { xs: 1, sm: 0 }
      }}>
        <Typography 
          variant={{ xs: 'h6', sm: 'h5' }} 
          gutterBottom
          sx={{ fontSize: responsiveFontSizes.xlarge }}
        >
          検索結果 ({totalCount}件)
        </Typography>
        <Typography 
          variant="body2" 
          color="text.secondary"
          sx={{ fontSize: responsiveFontSizes.small }}
        >
          {results.restaurants.length}件表示中
          {results.pagination && (
            <Box component="span" sx={{ display: { xs: 'block', sm: 'inline' } }}>
              {` | ページ ${results.pagination.currentPage}/${results.pagination.totalPages}`}
            </Box>
          )}
        </Typography>
      </Box>

      {/* Debug Cards - Hidden in production */}
      {process.env.NODE_ENV === 'development' && (
        <Box sx={{ mb: 3, display: 'none' }}>
          <Typography variant="subtitle1" gutterBottom>
            デバッグ用簡易表示
          </Typography>
          <Grid container spacing={2}>
            {results.restaurants.slice(0, 3).map((result: any, index: number) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <SimpleRestaurantCard restaurant={result} />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Restaurant Cards */}
      <Grid container spacing={responsiveSpacing.medium} sx={{ mb: 4 }}>
        {results.restaurants.map((result: any) => {
          // デバッグ用ログ
          console.log('Restaurant result:', result);
          
          // データ構造の調整
          const restaurant = result.restaurant || result;
          const restaurantId = (restaurant.id || restaurant.restaurantId || result.restaurantId || 'unknown') as string;
          
          return (
            <Grid item xs={12} sm={6} md={6} lg={4} key={restaurantId}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  ...mobileFirstStyles.card,
                  '&:hover': { boxShadow: 4 },
                  transition: 'box-shadow 0.2s ease-in-out'
                }}
                data-testid={`restaurant-card-${restaurantId}`}
              >
                {/* Restaurant Image */}
                <Box sx={{ 
                  position: 'relative',
                  width: { xs: 120, sm: '100%' },
                  height: { xs: 120, sm: 200 },
                  flexShrink: 0
                }}>
                  <LazyImage
                    src={restaurant.imageUrl || restaurant.images?.[0]}
                    alt={restaurant.name}
                    height={200}
                    fallbackSrc="/images/restaurant-placeholder.jpg"
                    sx={{
                      height: { xs: 120, sm: 200 },
                      objectFit: 'cover',
                      width: '100%'
                    }}
                  />
                  {/* Favorite Button Overlay */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      borderRadius: '50%',
                      padding: '4px',
                    }}
                  >
                    <FavoriteButton 
                      restaurantId={restaurantId}
                      size="small"
                    />
                  </Box>
                </Box>

                <CardContent sx={{ 
                  flexGrow: 1,
                  padding: { xs: 1.5, sm: 2 },
                  '&:last-child': { paddingBottom: { xs: 1.5, sm: 2 } }
                }}>
                  {/* Restaurant Name */}
                  <Typography 
                    variant={{ xs: 'subtitle1', sm: 'h6' }} 
                    component="h3" 
                    gutterBottom
                    sx={{ 
                      fontSize: { xs: '1rem', sm: '1.25rem' },
                      lineHeight: { xs: 1.3, sm: 1.4 }
                    }}
                  >
                    {truncateText(restaurant.name || restaurant.restaurantName, 30)}
                  </Typography>

                  {/* Recommendation Chip */}
                  <Box sx={{ mb: { xs: 1, sm: 2 } }}>
                    <Chip
                      label={getRecommendationLabel(result.recommendation)}
                      color={getRecommendationColor(result.recommendation)}
                      size="small"
                      icon={<Star />}
                      sx={{ fontSize: { xs: '0.75rem', sm: '0.8125rem' } }}
                    />
                  </Box>

                  {/* Rating */}
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    mb: { xs: 0.5, sm: 1 },
                    flexWrap: { xs: 'wrap', sm: 'nowrap' }
                  }}>
                    <Rating 
                      value={result.totalScore ? result.totalScore / 20 : restaurant.rating || 0} 
                      precision={0.1} 
                      readOnly 
                      size={{ xs: 'small', sm: 'small' }}
                      sx={{ mr: 1 }}
                    />
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontSize: { xs: '0.75rem', sm: '0.875rem' },
                        color: 'text.secondary'
                      }}
                    >
                      {(result.totalScore ? result.totalScore / 20 : restaurant.rating || 0).toFixed(1)}
                      {result.confidence && (
                        <Box component="span" sx={{ display: { xs: 'block', sm: 'inline' } }}>
                          {` (信頼度: ${(result.confidence * 100).toFixed(0)}%)`}
                        </Box>
                      )}
                    </Typography>
                  </Box>

                  {/* Location */}
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    mb: { xs: 0.5, sm: 1 }
                  }}>
                    <LocationOn 
                      fontSize="small" 
                      color="action" 
                      sx={{ mt: 0.2, flexShrink: 0 }}
                    />
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        ml: 1,
                        fontSize: { xs: '0.75rem', sm: '0.875rem' },
                        lineHeight: 1.3
                      }}
                    >
                      {truncateText(
                        restaurant.address || restaurant.location, 
                        40
                      )}
                    </Typography>
                  </Box>

                  {/* Price Range */}
                  <Box sx={{ 
                    display: { xs: 'none', sm: 'flex' }, 
                    alignItems: 'center', 
                    mb: 1 
                  }}>
                    <Restaurant fontSize="small" color="action" />
                    <Typography variant="body2" sx={{ ml: 1 }}>
                      {restaurant.priceRange ? formatPriceRange(
                        restaurant.priceRange.min,
                        restaurant.priceRange.max
                      ) : '情報なし'}
                    </Typography>
                  </Box>

                  {/* Mobile: Compact Price & Genre */}
                  <Box sx={{ 
                    display: { xs: 'flex', sm: 'none' },
                    alignItems: 'center',
                    gap: 1,
                    mb: 1,
                    flexWrap: 'wrap'
                  }}>
                    <Chip 
                      label={restaurant.genre}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: '0.7rem' }}
                    />
                    {restaurant.priceRange && (
                      <Chip 
                        label={formatPriceRange(
                          restaurant.priceRange.min,
                          restaurant.priceRange.max
                        )}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.7rem' }}
                      />
                    )}
                  </Box>

                  {/* Genre - Desktop Only */}
                  <Typography 
                    variant="body2" 
                    color="text.secondary" 
                    sx={{ 
                      mb: { xs: 1, sm: 2 },
                      display: { xs: 'none', sm: 'block' }
                    }}
                  >
                    {restaurant.genre}
                  </Typography>

                  {/* Platform Scores - Desktop Only */}
                  {result.platformScores && (
                    <Box sx={{ 
                      mb: 2,
                      display: { xs: 'none', md: 'block' }
                    }}>
                      <Typography variant="caption" color="text.secondary" gutterBottom>
                        プラットフォーム別評価:
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {result.platformScores.map((platform: any) => (
                          <Chip
                            key={platform.platform}
                            label={`${getPlatformLabel(platform.platform)}: ${platform.score.toFixed(1)}`}
                            size="small"
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    </Box>
                  )}
                </CardContent>

                <CardActions sx={{
                  padding: { xs: 1, sm: 2 },
                  justifyContent: { xs: 'stretch', sm: 'flex-start' }
                }}>
                  <Button
                    size={{ xs: 'medium', sm: 'small' }}
                    variant="contained"
                    onClick={() => navigate(`/restaurant/${restaurantId}`)}
                    data-testid={`view-detail-${restaurantId}`}
                    sx={{
                      width: { xs: '100%', sm: 'auto' },
                      fontSize: { xs: '0.875rem', sm: '0.8125rem' },
                      padding: { xs: '8px 16px', sm: '6px 16px' }
                    }}
                  >
                    詳細を見る
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          mt: { xs: 3, sm: 4 },
          px: { xs: 1, sm: 0 }
        }}>
          <Pagination
            count={totalPages}
            page={results.meta.page}
            onChange={handlePageChange}
            color="primary"
            size={{ xs: 'medium', sm: 'large' }}
            data-testid="pagination"
            sx={{
              '& .MuiPaginationItem-root': {
                fontSize: { xs: '0.8rem', sm: '0.875rem' },
                minWidth: { xs: 32, sm: 40 },
                height: { xs: 32, sm: 40 }
              }
            }}
          />
        </Box>
      )}

      {/* Legal Notices */}
      {results.legalNotices && (
        <Box sx={{ mt: 4, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {results.legalNotices.dataUsage}
          </Typography>
          <Box sx={{ mt: 1 }}>
            {results.attributions && Object.entries(results.attributions).map(([platform, attribution]) => (
              <Typography key={platform} variant="caption" color="text.secondary" display="block">
                {String(attribution)}
              </Typography>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default SearchResults;