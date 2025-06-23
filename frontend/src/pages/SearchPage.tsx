import React from 'react';
import { Box, Typography } from '@mui/material';
import SearchForm from '@components/search/SearchForm';
import SearchResults from '@components/search/SearchResults';
import { SearchResultsDebug } from '@components/search/SearchResultsDebug';
import { TestSearchResults } from '@components/search/TestSearchResults';

const SearchPage: React.FC = () => {
  return (
    <Box data-testid="search-page">
      <Typography variant="h4" component="h1" gutterBottom>
        レストラン検索
      </Typography>
      
      <SearchForm />
      <SearchResultsDebug />
      <TestSearchResults />
      <SearchResults />
    </Box>
  );
};

export default SearchPage;