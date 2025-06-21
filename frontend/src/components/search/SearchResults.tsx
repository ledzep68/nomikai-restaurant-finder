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
  CardMedia,
} from '@mui/material';
import {
  LocationOn,
  Phone,
  Restaurant,
  Star,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@store/index';
import { setQuery, searchRestaurants } from '@store/searchSlice';
import { toggleFavorite, selectIsFavorite } from '@store/favoritesSlice';
import { EvaluationResult } from '@types/restaurant';
import { LazyImage } from '@components/common/LazyImage';
import { FavoriteButton } from '@components/common/FavoriteButton';
import {
  formatPriceRange,
  getRecommendationLabel,
  getPlatformLabel,
  truncateText,
} from '@utils/helpers';
import { RECOMMENDATION_LABELS } from '@utils/constants';

const SearchResults: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { results, loading, query } = useAppSelector((state) => state.search);
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  const handlePageChange = async (event: React.ChangeEvent<unknown>, page: number) => {
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

  const totalPages = Math.ceil(results.meta.totalCount / results.meta.limit);

  return (
    <Box data-testid="search-results">
      {/* Results Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          検索結果 ({results.meta.totalCount}件)
        </Typography>
        <Typography variant="body2" color="text.secondary">
          使用プラットフォーム: {results.meta.platformsUsed.join(', ')} |
          検索時間: {results.meta.searchTime}ms |
          {results.meta.cached ? 'キャッシュ' : 'リアルタイム'}
        </Typography>
      </Box>

      {/* Restaurant Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {results.restaurants.map((result: EvaluationResult) => {
          
          return (
            <Grid item xs={12} md={6} lg={4} key={result.restaurant.id}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  '&:hover': { boxShadow: 4 }
                }}
                data-testid={`restaurant-card-${result.restaurant.id}`}
              >
                {/* Restaurant Image */}
                <Box sx={{ position: 'relative' }}>
                  <LazyImage
                    src={result.restaurant.images?.[0]}
                    alt={result.restaurant.name}
                    height={200}
                    fallbackSrc="/images/restaurant-placeholder.jpg"
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
                      restaurantId={result.restaurant.id}
                      size="small"
                    />
                  </Box>
                </Box>

                <CardContent sx={{ flexGrow: 1 }}>
                  {/* Restaurant Name */}
                  <Typography variant="h6" component="h3" gutterBottom>
                    {truncateText(result.restaurant.name, 30)}
                  </Typography>

                  {/* Recommendation Chip */}
                  <Box sx={{ mb: 2 }}>
                    <Chip
                      label={getRecommendationLabel(result.recommendation)}
                      color={getRecommendationColor(result.recommendation)}
                      size="small"
                      icon={<Star />}
                    />
                  </Box>

                  {/* Rating */}
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Rating value={result.totalScore} precision={0.1} readOnly size="small" />
                    <Typography variant="body2" sx={{ ml: 1 }}>
                      {result.totalScore.toFixed(1)} (信頼度: {(result.confidence * 100).toFixed(0)}%)
                    </Typography>
                  </Box>

                  {/* Location */}
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <LocationOn fontSize="small" color="action" />
                    <Typography variant="body2" sx={{ ml: 1 }}>
                      {truncateText(result.restaurant.address, 40)}
                    </Typography>
                  </Box>

                  {/* Price Range */}
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Restaurant fontSize="small" color="action" />
                    <Typography variant="body2" sx={{ ml: 1 }}>
                      {formatPriceRange(
                        result.restaurant.priceRange.min,
                        result.restaurant.priceRange.max
                      )}
                    </Typography>
                  </Box>

                  {/* Genre */}
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {result.restaurant.genre}
                  </Typography>

                  {/* Platform Scores */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary" gutterBottom>
                      プラットフォーム別評価:
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {result.platformScores.map((platform) => (
                        <Chip
                          key={platform.platform}
                          label={`${getPlatformLabel(platform.platform)}: ${platform.score.toFixed(1)}`}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </Box>
                </CardContent>

                <CardActions>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => navigate(`/restaurant/${result.restaurant.id}`)}
                    data-testid={`view-detail-${result.restaurant.id}`}
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
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination
            count={totalPages}
            page={results.meta.page}
            onChange={handlePageChange}
            color="primary"
            size="large"
            data-testid="pagination"
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
            {Object.entries(results.attributions).map(([platform, attribution]) => (
              <Typography key={platform} variant="caption" color="text.secondary" display="block">
                {attribution}
              </Typography>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default SearchResults;