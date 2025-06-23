import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Button,
  Card,
  CardContent,
  CardActions,
  CardMedia,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Favorite,
  Star,
  LocationOn,
  Phone,
  Language,
  Delete,
  Clear,
  Share,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@store/index';
import {
  selectFavorites,
  selectFavoritesCount,
  removeFromFavorites,
  clearFavorites,
} from '@store/favoritesSlice';
import { FavoriteButton } from '@components/common/FavoriteButton';
import { LoadingSpinner } from '@components/common/LoadingSpinner';
import type { Restaurant } from '@types/restaurant';

interface FavoriteRestaurant extends Restaurant {
  // 追加のお気に入り関連データ
  addedAt?: string;
}

const FavoritesPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const favoriteIds = useAppSelector(selectFavorites);
  const favoritesCount = useAppSelector(selectFavoritesCount);
  
  const [favoriteRestaurants, setFavoriteRestaurants] = useState<FavoriteRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  // お気に入りレストランの詳細データを取得
  useEffect(() => {
    const fetchFavoriteRestaurants = async () => {
      if (favoriteIds.length === 0) {
        setFavoriteRestaurants([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // モックデータ（実際はAPIから取得）
        const mockFavorites: FavoriteRestaurant[] = favoriteIds.map((id, index) => ({
          id,
          name: `お気に入りレストラン ${index + 1}`,
          genre: '和食',
          address: '東京都渋谷区',
          phone: '03-1234-5678',
          website: 'https://example.com',
          rating: 4.2 + (index * 0.1),
          priceRange: {
            min: 2000 + (index * 500),
            max: 4000 + (index * 1000),
          },
          images: [`https://via.placeholder.com/400x200?text=Restaurant+${index + 1}`],
          capacity: 20 + (index * 10),
          openingHours: {
            monday: { open: '11:00', close: '22:00' },
            tuesday: { open: '11:00', close: '22:00' },
            wednesday: { open: '11:00', close: '22:00' },
            thursday: { open: '11:00', close: '22:00' },
            friday: { open: '11:00', close: '22:00' },
            saturday: { open: '11:00', close: '22:00' },
            sunday: { open: '11:00', close: '21:00' },
          },
          features: ['個室あり', 'WiFi', 'カード決済'],
          description: `美味しい料理とサービスが自慢のレストランです。`,
          addedAt: new Date(Date.now() - index * 24 * 60 * 60 * 1000).toISOString(),
        }));

        setFavoriteRestaurants(mockFavorites);
      } catch (err) {
        setError('お気に入りレストランの取得に失敗しました');
        console.error('Failed to fetch favorite restaurants:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFavoriteRestaurants();
  }, [favoriteIds]);

  const handleRestaurantClick = (restaurantId: string) => {
    navigate(`/restaurant/${restaurantId}`);
  };

  const handleRemoveFavorite = (restaurantId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    dispatch(removeFromFavorites(restaurantId));
  };

  const handleClearAllFavorites = () => {
    dispatch(clearFavorites());
    setClearDialogOpen(false);
  };

  const handleShareFavorites = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'お気に入りレストラン',
          text: `${favoritesCount}件のお気に入りレストランをチェック！`,
          url: window.location.href,
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(window.location.href);
        alert('URLをクリップボードにコピーしました');
      }
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const formatAddedDate = (dateString?: string) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return '今日追加';
    if (diffDays === 1) return '昨日追加';
    if (diffDays < 7) return `${diffDays}日前に追加`;
    return date.toLocaleDateString('ja-JP');
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <LoadingSpinner message="お気に入りを読み込み中..." />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          <Favorite sx={{ mr: 1, verticalAlign: 'middle' }} />
          お気に入りレストラン
        </Typography>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="subtitle1" color="text.secondary">
            {favoritesCount}件のレストランがお気に入りに登録されています
          </Typography>
          
          {favoritesCount > 0 && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                startIcon={<Share />}
                variant="outlined"
                onClick={handleShareFavorites}
                size="small"
              >
                共有
              </Button>
              <Button
                startIcon={<Clear />}
                variant="outlined"
                color="error"
                onClick={() => setClearDialogOpen(true)}
                size="small"
              >
                すべて削除
              </Button>
            </Box>
          )}
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {favoritesCount === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Favorite sx={{ fontSize: 64, color: 'grey.300', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            お気に入りレストランはまだありません
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            レストラン検索でお気に入りのお店を見つけて、ハートマークをクリックしてください
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate('/search')}
            size="large"
          >
            レストランを探す
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {favoriteRestaurants.map((restaurant) => (
            <Grid item xs={12} sm={6} md={4} key={restaurant.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 4,
                  },
                  transition: 'all 0.2s ease-in-out',
                }}
                onClick={() => handleRestaurantClick(restaurant.id)}
              >
                <CardMedia
                  component="img"
                  height="200"
                  image={restaurant.images?.[0] || 'https://via.placeholder.com/400x200'}
                  alt={restaurant.name}
                />
                
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="h6" component="h3" sx={{ fontSize: '1.1rem' }}>
                      {restaurant.name}
                    </Typography>
                    <FavoriteButton
                      restaurantId={restaurant.id}
                      size="small"
                      onClick={(event) => handleRemoveFavorite(restaurant.id, event)}
                    />
                  </Box>

                  <Chip
                    label={restaurant.genre}
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{ mb: 1 }}
                  />

                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Star sx={{ fontSize: 16, color: 'warning.main', mr: 0.5 }} />
                    <Typography variant="body2">
                      {restaurant.rating.toFixed(1)}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <LocationOn sx={{ fontSize: 16, color: 'text.secondary', mr: 0.5 }} />
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {restaurant.address}
                    </Typography>
                  </Box>

                  <Typography variant="caption" color="text.secondary">
                    {formatAddedDate(restaurant.addedAt)}
                  </Typography>
                </CardContent>

                <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                  <Button size="small" variant="outlined">
                    詳細を見る
                  </Button>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={(event) => handleRemoveFavorite(restaurant.id, event)}
                    sx={{ ml: 'auto' }}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* 全削除確認ダイアログ */}
      <Dialog
        open={clearDialogOpen}
        onClose={() => setClearDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>すべてのお気に入りを削除</DialogTitle>
        <DialogContent>
          <Typography>
            本当にすべてのお気に入りレストラン（{favoritesCount}件）を削除しますか？
            この操作は取り消すことができません。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClearDialogOpen(false)}>
            キャンセル
          </Button>
          <Button
            onClick={handleClearAllFavorites}
            color="error"
            variant="contained"
          >
            削除
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default FavoritesPage;