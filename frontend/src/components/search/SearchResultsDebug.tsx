import React from 'react';
import { Box, Typography, Button, Alert } from '@mui/material';
import { useAppSelector } from '@store/index';

export const SearchResultsDebug: React.FC = () => {
  const { results, loading, error } = useAppSelector((state) => state.search);

  const handleShowData = () => {
    console.log('=== SEARCH RESULTS DEBUG ===');
    console.log('Loading:', loading);
    console.log('Error:', error);
    console.log('Results:', results);
    
    if (results?.restaurants) {
      console.log('First restaurant:', results.restaurants[0]);
      console.log('Restaurant count:', results.restaurants.length);
      
      results.restaurants.forEach((restaurant, index) => {
        console.log(`Restaurant ${index}:`, {
          id: restaurant.id || restaurant.restaurantId,
          name: restaurant.name || restaurant.restaurantName,
          structure: Object.keys(restaurant),
        });
      });
    }
  };

  return (
    <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
      <Typography variant="subtitle2" gutterBottom>
        デバッグ情報
      </Typography>
      <Button 
        variant="outlined" 
        size="small" 
        onClick={handleShowData}
        sx={{ mr: 2 }}
      >
        コンソールにデータ表示
      </Button>
      
      {results && (
        <Alert severity="info" sx={{ mt: 2 }}>
          検索結果: {results.restaurants?.length || 0}件
          {results.restaurants?.[0] && (
            <br />
          )}
          最初のレストランID: {results.restaurants?.[0]?.id || results.restaurants?.[0]?.restaurantId || 'なし'}
        </Alert>
      )}
    </Box>
  );
};