import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  Rating,
  Divider,
  IconButton,
  Alert,
  Skeleton,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
} from '@mui/material';
import {
  ArrowBack,
  LocationOn,
  Phone,
  Schedule,
  AttachMoney,
  Restaurant,
  Star,
  Info,
  Reviews,
  Map,
  Share,
} from '@mui/icons-material';
import { LazyImage } from '@components/common/LazyImage';
import { FavoriteButton } from '@components/common/FavoriteButton';
import { LoadingSpinner } from '@components/common/LoadingSpinner';
import { restaurantService } from '@services/restaurantService';
import { Restaurant as RestaurantType } from '@types/restaurant';
import {
  formatPriceRange,
  getRecommendationLabel,
  formatAddress,
} from '@utils/helpers';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div hidden={value !== index} role="tabpanel">
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export const RestaurantDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<RestaurantType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    const fetchRestaurant = async () => {
      if (!id) {
        setError('レストランIDが見つかりません');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await restaurantService.getRestaurant(id);
        setRestaurant(data);
      } catch (err) {
        setError('レストラン情報の取得に失敗しました');
        console.error('Failed to fetch restaurant:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurant();
  }, [id]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleShare = async () => {
    if (navigator.share && restaurant) {
      try {
        await navigator.share({
          title: restaurant.name,
          text: `${restaurant.name} - ${formatAddress(restaurant.address)}`,
          url: window.location.href,
        });
      } catch (err) {
        console.error('Share failed:', err);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('URLをクリップボードにコピーしました');
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <LoadingSpinner message="レストラン情報を読み込み中..." />
        <Box sx={{ mt: 4 }}>
          <Skeleton variant="rectangular" height={300} sx={{ mb: 2 }} />
          <Skeleton variant="text" height={40} width="60%" sx={{ mb: 1 }} />
          <Skeleton variant="text" height={20} width="40%" sx={{ mb: 2 }} />
          <Grid container spacing={2}>
            <Grid item xs={12} md={8}>
              <Skeleton variant="rectangular" height={400} />
            </Grid>
            <Grid item xs={12} md={4}>
              <Skeleton variant="rectangular" height={400} />
            </Grid>
          </Grid>
        </Box>
      </Container>
    );
  }

  if (error || !restaurant) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || 'レストラン情報が見つかりません'}
        </Alert>
        <Button
          variant="contained"
          onClick={() => navigate(-1)}
          startIcon={<ArrowBack />}
        >
          戻る
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton onClick={() => navigate(-1)} color="primary">
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
          {restaurant.name}
        </Typography>
        <FavoriteButton restaurantId={restaurant.id} size="large" />
        <IconButton onClick={handleShare} color="primary">
          <Share />
        </IconButton>
      </Box>

      {/* Main Image */}
      <Card sx={{ mb: 4 }}>
        <LazyImage
          src={restaurant.images?.[0]}
          alt={restaurant.name}
          height={400}
          fallbackSrc="/images/restaurant-placeholder.jpg"
        />
      </Card>

      <Grid container spacing={4}>
        {/* Main Content */}
        <Grid item xs={12} md={8}>
          <Card>
            <Tabs value={tabValue} onChange={handleTabChange}>
              <Tab icon={<Info />} label="基本情報" />
              <Tab icon={<Reviews />} label="レビュー" />
              <Tab icon={<Map />} label="アクセス" />
            </Tabs>
            
            <TabPanel value={tabValue} index={0}>
              {/* Basic Information */}
              <List>
                <ListItem>
                  <ListItemIcon>
                    <LocationOn color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="住所"
                    secondary={formatAddress(restaurant.address)}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <Phone color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="電話番号"
                    secondary={restaurant.phone || '情報なし'}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <Restaurant color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="料理ジャンル"
                    secondary={restaurant.genre}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <AttachMoney color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="価格帯"
                    secondary={formatPriceRange(
                      restaurant.priceRange.min,
                      restaurant.priceRange.max
                    )}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <Schedule color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="営業時間"
                    secondary={restaurant.openingHours ? 
                      Object.entries(restaurant.openingHours).map(([day, hours]) => 
                        `${day}: ${hours}`
                      ).join(', ') : '情報なし'
                    }
                  />
                </ListItem>
              </List>
            </TabPanel>
            
            <TabPanel value={tabValue} index={1}>
              <Alert severity="info" sx={{ mb: 2 }}>
                レビュー機能は今後実装予定です
              </Alert>
            </TabPanel>
            
            <TabPanel value={tabValue} index={2}>
              <Alert severity="info" sx={{ mb: 2 }}>
                地図機能は今後実装予定です
              </Alert>
              <Typography variant="body1">
                住所: {formatAddress(restaurant.address)}
              </Typography>
            </TabPanel>
          </Card>
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              レストラン評価
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Rating value={4.2} precision={0.1} readOnly />
              <Typography variant="body1" sx={{ ml: 1 }}>
                4.2
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              基于外部平台的综合评价
            </Typography>
          </Paper>

          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              アクションパネル
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button
                variant="contained"
                fullWidth
                startIcon={<Phone />}
                href={`tel:${restaurant.phone}`}
                disabled={!restaurant.phone}
              >
                電話予約
              </Button>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<Map />}
                onClick={() => {
                  const query = encodeURIComponent(restaurant.address);
                  window.open(`https://maps.google.com/maps?q=${query}`, '_blank');
                }}
              >
                地図で見る
              </Button>
            </Box>
          </Paper>

          {/* Additional Images */}
          {restaurant.images && restaurant.images.length > 1 && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                その他の写真
              </Typography>
              <Grid container spacing={1}>
                {restaurant.images.slice(1, 5).map((image, index) => (
                  <Grid item xs={6} key={index}>
                    <LazyImage
                      src={image}
                      alt={`${restaurant.name} 写真 ${index + 2}`}
                      height={100}
                      fallbackSrc="/images/restaurant-placeholder.jpg"
                    />
                  </Grid>
                ))}
              </Grid>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Container>
  );
};