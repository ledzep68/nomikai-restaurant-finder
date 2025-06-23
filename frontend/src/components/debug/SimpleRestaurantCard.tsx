import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Button,
  Typography,
  Box,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

interface SimpleRestaurantCardProps {
  restaurant: any; // 任意のデータ構造を受け入れ
}

export const SimpleRestaurantCard: React.FC<SimpleRestaurantCardProps> = ({ restaurant }) => {
  const navigate = useNavigate();

  // レストランIDを取得する関数
  const getRestaurantId = (data: any): string => {
    return (
      data.id ||
      data.restaurantId ||
      data.restaurant?.id ||
      data.restaurant?.restaurantId ||
      'unknown'
    );
  };

  // レストラン名を取得する関数
  const getRestaurantName = (data: any): string => {
    return (
      data.name ||
      data.restaurantName ||
      data.restaurant?.name ||
      data.restaurant?.restaurantName ||
      'Unknown Restaurant'
    );
  };

  const restaurantId = getRestaurantId(restaurant);
  const restaurantName = getRestaurantName(restaurant);

  const handleDetailClick = () => {
    console.log('Clicking detail button:', {
      restaurantId,
      restaurantName,
      originalData: restaurant,
    });
    navigate(`/restaurant/${restaurantId}`);
  };

  return (
    <Card sx={{ maxWidth: 345, m: 2 }}>
      <CardContent>
        <Typography variant="h6" component="h2" gutterBottom>
          {restaurantName}
        </Typography>
        
        <Typography variant="body2" color="text.secondary">
          ID: {restaurantId}
        </Typography>
        
        <Box sx={{ mt: 2, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
          <Typography variant="caption" component="div">
            データ構造:
          </Typography>
          <Typography variant="caption" component="pre" sx={{ fontSize: '0.7rem' }}>
            {JSON.stringify(
              {
                hasId: !!restaurant.id,
                hasRestaurantId: !!restaurant.restaurantId,
                hasRestaurant: !!restaurant.restaurant,
                hasRestaurantName: !!restaurant.name || !!restaurant.restaurantName,
                keys: Object.keys(restaurant),
              },
              null,
              2
            )}
          </Typography>
        </Box>
      </CardContent>
      
      <CardActions>
        <Button 
          size="small" 
          variant="contained" 
          onClick={handleDetailClick}
          disabled={restaurantId === 'unknown'}
        >
          詳細を見る
        </Button>
        <Button 
          size="small" 
          onClick={() => console.log('Full restaurant data:', restaurant)}
        >
          ログ出力
        </Button>
      </CardActions>
    </Card>
  );
};