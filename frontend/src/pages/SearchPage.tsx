import React from 'react';
import { Box, Typography } from '@mui/material';
import SearchForm from '@components/search/SearchForm';
import SearchResults from '@components/search/SearchResults';
import { SearchResultsDebug } from '@components/search/SearchResultsDebug';
import { TestSearchResults } from '@components/search/TestSearchResults';
import { SEOHead } from '@components/seo/SEOHead';
import { generateSearchSEO } from '@utils/seo';
import { useAppSelector } from '@store/index';

const SearchPage: React.FC = () => {
  const { currentQuery, results } = useAppSelector((state) => state.search);
  
  return (
    <Box data-testid="search-page">
      <SEOHead config={generateSearchSEO(currentQuery || {}, results?.pagination?.totalItems)} />
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