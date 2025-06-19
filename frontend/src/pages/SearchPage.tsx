import React from 'react';
import { Box, Typography } from '@mui/material';
import SearchForm from '@components/search/SearchForm';
import SearchResults from '@components/search/SearchResults';

const SearchPage: React.FC = () => {
  return (
    <Box data-testid="search-page">
      <Typography variant="h4" component="h1" gutterBottom>
        レストラン検索
      </Typography>
      
      <SearchForm />
      <SearchResults />
    </Box>
  );
};

export default SearchPage;