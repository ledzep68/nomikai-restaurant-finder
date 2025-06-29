import React, { useState, useCallback } from 'react';
import {
  Box,
  TextField,
  Autocomplete,
  Fab,
  Collapse,
  IconButton,
  Paper,
  Typography,
  InputAdornment,
} from '@mui/material';
import {
  Search,
  FilterList,
  Close,
  LocationOn,
  Category,
} from '@mui/icons-material';
import { TouchButton } from './TouchButton';
import { TOKYO_AREAS, GENRES } from '@utils/constants';

interface MobileSearchFormProps {
  onSearch: (query: any) => void;
  isLoading?: boolean;
}

export const MobileSearchForm: React.FC<MobileSearchFormProps> = ({
  onSearch,
  isLoading = false,
}) => {
  const [location, setLocation] = useState('');
  const [genre, setGenre] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [capacity, setCapacity] = useState<number | null>(null);

  const handleQuickSearch = useCallback((searchQuery: string) => {
    onSearch({
      location: searchQuery,
      genre: '',
      capacity: null,
    });
  }, [onSearch]);

  const handleAdvancedSearch = useCallback(() => {
    onSearch({
      location,
      genre,
      capacity,
    });
  }, [location, genre, capacity, onSearch]);

  const popularSearches = [
    '渋谷 居酒屋',
    '新宿 イタリアン',
    '銀座 寿司',
    '六本木 焼肉',
  ];

  return (
    <Box sx={{ width: '100%', px: 2 }}>
      {/* Quick Search */}
      <Paper elevation={2} sx={{ mb: 2, borderRadius: 3, overflow: 'hidden' }}>
        <TextField
          fullWidth
          placeholder="エリア・ジャンルで検索"
          variant="outlined"
          size="medium"
          sx={{
            '& .MuiOutlinedInput-root': {
              fontSize: '16px', // Prevents zoom on iOS
              borderRadius: 3,
              '& fieldset': {
                border: 'none',
              },
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search color="action" />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowFilters(!showFilters)}
                  size="small"
                  sx={{ 
                    minWidth: '44px',
                    minHeight: '44px',
                  }}
                >
                  <FilterList color={showFilters ? 'primary' : 'action'} />
                </IconButton>
              </InputAdornment>
            ),
          }}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleQuickSearch((e.target as HTMLInputElement).value);
            }
          }}
        />
      </Paper>

      {/* Popular Searches */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
          人気の検索
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {popularSearches.map((search, index) => (
            <TouchButton
              key={index}
              variant="outlined"
              size="small"
              onClick={() => handleQuickSearch(search)}
              sx={{
                borderRadius: 2,
                fontSize: '14px',
                textTransform: 'none',
              }}
            >
              {search}
            </TouchButton>
          ))}
        </Box>
      </Box>

      {/* Advanced Filters */}
      <Collapse in={showFilters}>
        <Paper elevation={1} sx={{ p: 2, borderRadius: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              詳細検索
            </Typography>
            <IconButton
              onClick={() => setShowFilters(false)}
              size="small"
              sx={{ minWidth: '44px', minHeight: '44px' }}
            >
              <Close />
            </IconButton>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Location */}
            <Autocomplete
              options={TOKYO_AREAS}
              getOptionLabel={(option) => option.label}
              value={TOKYO_AREAS.find(area => area.value === location) || null}
              onChange={(_, newValue) => setLocation(newValue?.value || '')}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="エリア"
                  variant="outlined"
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <InputAdornment position="start">
                        <LocationOn color="action" />
                      </InputAdornment>
                    ),
                    style: { fontSize: '16px' },
                  }}
                />
              )}
            />

            {/* Genre */}
            <Autocomplete
              options={GENRES}
              getOptionLabel={(option) => option.label}
              value={GENRES.find(g => g.value === genre) || null}
              onChange={(_, newValue) => setGenre(newValue?.value || '')}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="ジャンル"
                  variant="outlined"
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <InputAdornment position="start">
                        <Category color="action" />
                      </InputAdornment>
                    ),
                    style: { fontSize: '16px' },
                  }}
                />
              )}
            />

            {/* Capacity */}
            <TextField
              label="人数"
              type="number"
              value={capacity || ''}
              onChange={(e) => setCapacity(Number(e.target.value) || null)}
              variant="outlined"
              inputProps={{
                min: 1,
                max: 50,
                style: { fontSize: '16px' },
              }}
            />

            <TouchButton
              variant="contained"
              onClick={handleAdvancedSearch}
              disabled={isLoading}
              fullWidth
              sx={{ mt: 1 }}
            >
              {isLoading ? '検索中...' : '検索'}
            </TouchButton>
          </Box>
        </Paper>
      </Collapse>

      {/* Floating Search Button */}
      {!showFilters && (
        <Fab
          color="primary"
          onClick={() => setShowFilters(true)}
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            zIndex: 1000,
          }}
        >
          <Search />
        </Fab>
      )}
    </Box>
  );
};