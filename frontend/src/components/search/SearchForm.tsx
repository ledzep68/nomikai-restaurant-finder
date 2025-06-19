import React, { useState } from 'react';
import {
  Box,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Grid,
  Typography,
  Slider,
  Chip,
  Alert,
} from '@mui/material';
import { Search, Clear } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '@store/index';
import { setQuery, searchRestaurants, addToHistory } from '@store/searchSlice';
import { SearchFormData } from '@types/search';
import { GENRES, PRICE_RANGES, CAPACITIES } from '@utils/constants';
import { formatPrice } from '@utils/helpers';

interface SearchFormProps {
  onSearch?: () => void;
}

const SearchForm: React.FC<SearchFormProps> = ({ onSearch }) => {
  const dispatch = useAppDispatch();
  const { query, loading, error } = useAppSelector((state) => state.search);
  const [priceRange, setPriceRange] = useState<number[]>([0, 5000]);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
    watch,
  } = useForm<SearchFormData>({
    defaultValues: {
      location: query.location || '',
      genre: query.genre || '',
      priceMin: query.priceRange?.min || 0,
      priceMax: query.priceRange?.max || 5000,
      capacity: query.capacity || 4,
    },
  });

  const watchedLocation = watch('location');

  const onSubmit = async (data: SearchFormData) => {
    const searchQuery = {
      location: data.location,
      genre: data.genre || undefined,
      priceRange: {
        min: data.priceMin,
        max: data.priceMax,
      },
      capacity: data.capacity,
      page: 1,
      limit: 20,
      sort: 'rating' as const,
    };

    // Update Redux state
    dispatch(setQuery(searchQuery));
    
    // Add to search history
    dispatch(addToHistory(searchQuery));

    try {
      // Execute search
      await dispatch(searchRestaurants(searchQuery)).unwrap();
      onSearch?.();
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const handleClear = () => {
    reset({
      location: '',
      genre: '',
      priceMin: 0,
      priceMax: 5000,
      capacity: 4,
    });
    setPriceRange([0, 5000]);
  };

  const handlePriceRangeChange = (_: Event, newValue: number | number[]) => {
    const range = newValue as number[];
    setPriceRange(range);
  };

  return (
    <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        レストラン検索
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={3}>
          {/* Location Field */}
          <Grid item xs={12} md={6}>
            <Controller
              name="location"
              control={control}
              rules={{
                required: '場所を入力してください',
                minLength: {
                  value: 2,
                  message: '場所は2文字以上で入力してください',
                },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="場所"
                  placeholder="例: 渋谷, 新宿, 東京駅"
                  error={!!errors.location}
                  helperText={errors.location?.message}
                  InputProps={{
                    'data-testid': 'location-input',
                  }}
                />
              )}
            />
          </Grid>

          {/* Genre Field */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>ジャンル</InputLabel>
              <Controller
                name="genre"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    label="ジャンル"
                    data-testid="genre-select"
                  >
                    <MenuItem value="">すべて</MenuItem>
                    {GENRES.map((genre) => (
                      <MenuItem key={genre.value} value={genre.value}>
                        {genre.label}
                      </MenuItem>
                    ))}
                  </Select>
                )}
              />
            </FormControl>
          </Grid>

          {/* Price Range */}
          <Grid item xs={12} md={6}>
            <Typography gutterBottom>
              価格帯: {formatPrice(priceRange[0])} ～ {formatPrice(priceRange[1])}
            </Typography>
            <Controller
              name="priceMin"
              control={control}
              render={({ field: { onChange } }) => (
                <Controller
                  name="priceMax"
                  control={control}
                  render={({ field: { onChange: onMaxChange } }) => (
                    <Slider
                      value={priceRange}
                      onChange={(e, newValue) => {
                        handlePriceRangeChange(e, newValue);
                        const range = newValue as number[];
                        onChange(range[0]);
                        onMaxChange(range[1]);
                      }}
                      valueLabelDisplay="auto"
                      valueLabelFormat={(value) => formatPrice(value)}
                      min={0}
                      max={10000}
                      step={500}
                      data-testid="price-range-slider"
                    />
                  )}
                />
              )}
            />
          </Grid>

          {/* Capacity Field */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>人数</InputLabel>
              <Controller
                name="capacity"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    label="人数"
                    data-testid="capacity-select"
                  >
                    {CAPACITIES.map((capacity) => (
                      <MenuItem key={capacity} value={capacity}>
                        {capacity}人
                      </MenuItem>
                    ))}
                  </Select>
                )}
              />
            </FormControl>
          </Grid>

          {/* Quick Filter Chips */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              よく使われる条件
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {PRICE_RANGES.slice(0, 4).map((range) => (
                <Chip
                  key={`${range.min}-${range.max}`}
                  label={range.label}
                  clickable
                  onClick={() => {
                    setPriceRange([range.min, range.max]);
                  }}
                  size="small"
                  data-testid={`price-chip-${range.min}-${range.max}`}
                />
              ))}
            </Box>
          </Grid>

          {/* Action Buttons */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                type="button"
                variant="outlined"
                startIcon={<Clear />}
                onClick={handleClear}
                disabled={loading}
                data-testid="clear-button"
              >
                クリア
              </Button>
              <Button
                type="submit"
                variant="contained"
                startIcon={<Search />}
                disabled={loading || !watchedLocation}
                data-testid="search-button"
              >
                {loading ? '検索中...' : '検索'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};

export default SearchForm;