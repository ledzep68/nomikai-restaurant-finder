import React from 'react';
import {
  Box,
  Typography,
  Grid,
} from '@mui/material';
import { SimpleRestaurantCard } from '@components/debug/SimpleRestaurantCard';

// テスト用のモックデータ
const mockRestaurants = [
  {
    id: 'test-1',
    restaurantId: 'test-1',
    name: 'テスト居酒屋1',
    restaurantName: 'テスト居酒屋1',
    rating: 4.2,
    totalScore: 84,
    address: '東京都渋谷区道玄坂1-1-1',
    location: '渋谷',
    genre: '居酒屋',
    priceRange: { min: 2000, max: 4000 },
    confidence: 0.85,
    recommendation: 'recommended',
    restaurant: {
      id: 'test-1',
      name: 'テスト居酒屋1',
      address: '東京都渋谷区道玄坂1-1-1',
      genre: '居酒屋',
      rating: 4.2,
      priceRange: { min: 2000, max: 4000 },
    },
  },
  {
    id: 'test-2',
    restaurantId: 'test-2',
    name: 'テストイタリアン2',
    restaurantName: 'テストイタリアン2',
    rating: 3.8,
    totalScore: 76,
    address: '東京都新宿区歌舞伎町1-1-1',
    location: '新宿',
    genre: 'イタリアン',
    priceRange: { min: 3000, max: 5000 },
    confidence: 0.75,
    recommendation: 'suitable',
    restaurant: {
      id: 'test-2',
      name: 'テストイタリアン2',
      address: '東京都新宿区歌舞伎町1-1-1',
      genre: 'イタリアン',
      rating: 3.8,
      priceRange: { min: 3000, max: 5000 },
    },
  },
];

export const TestSearchResults: React.FC = () => {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        テスト用検索結果（ボタン動作確認）
      </Typography>
      
      <Grid container spacing={2}>
        {mockRestaurants.map((result, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <SimpleRestaurantCard restaurant={result} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};