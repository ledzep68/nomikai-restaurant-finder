import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Slider,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Switch,
  Stack,
} from '@mui/material';
import {
  ExpandMore,
  TuneRounded,
  StarRate,
  AccessTime,
  LocalParking,
  Wifi,
  CreditCard,
} from '@mui/icons-material';
import { Controller, useFormContext } from 'react-hook-form';
import { SORT_OPTIONS, TOKYO_AREAS, RESTAURANT_FEATURES } from '@utils/constants';
import { responsiveSpacing, responsiveFontSizes } from '@utils/responsive';
import type { SearchFormData } from '@types/search';

interface AdvancedFiltersProps {
  onFiltersChange?: (filters: Partial<SearchFormData>) => void;
  isExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}

export const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  onFiltersChange,
  isExpanded = false,
  onExpandedChange,
}) => {
  const { control, watch, setValue } = useFormContext<SearchFormData>();
  const [ratingRange, setRatingRange] = useState<number[]>([0, 5]);

  const watchedFeatures = watch('features') || [];

  const handleRatingChange = (event: Event, newValue: number | number[]) => {
    const range = newValue as number[];
    setRatingRange(range);
    setValue('ratingMin', range[0]);
    setValue('ratingMax', range[1]);
    onFiltersChange?.({
      ratingMin: range[0],
      ratingMax: range[1],
    });
  };

  const handleFeatureToggle = (feature: string) => {
    const currentFeatures = watchedFeatures;
    const newFeatures = currentFeatures.includes(feature)
      ? currentFeatures.filter(f => f !== feature)
      : [...currentFeatures, feature];
    
    setValue('features', newFeatures);
    onFiltersChange?.({ features: newFeatures });
  };

  const handleQuickFilterToggle = (field: keyof SearchFormData) => (checked: boolean) => {
    setValue(field, checked);
    onFiltersChange?.({ [field]: checked });
  };

  return (
    <Paper 
      elevation={2} 
      sx={{ 
        mt: responsiveSpacing.medium,
        border: '1px solid',
        borderColor: 'divider'
      }}
    >
      <Accordion 
        expanded={isExpanded} 
        onChange={(_, expanded) => onExpandedChange?.(expanded)}
        sx={{ boxShadow: 'none' }}
      >
        <AccordionSummary 
          expandIcon={<ExpandMore />}
          sx={{ 
            px: responsiveSpacing.medium,
            py: { xs: 1, sm: 1.5 }
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TuneRounded color="primary" />
            <Typography 
              variant="h6" 
              sx={{ 
                fontSize: responsiveFontSizes.large,
                fontWeight: 600 
              }}
            >
              詳細フィルター
            </Typography>
          </Box>
        </AccordionSummary>

        <AccordionDetails sx={{ p: responsiveSpacing.medium }}>
          <Stack spacing={3}>
            {/* ソート順 */}
            <Box>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                並び順
              </Typography>
              <Controller
                name="sortBy"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth size="small">
                    <Select
                      {...field}
                      displayEmpty
                      onChange={(e) => {
                        field.onChange(e);
                        onFiltersChange?.({ sortBy: e.target.value });
                      }}
                    >
                      {SORT_OPTIONS.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />
            </Box>

            <Divider />

            {/* 評価フィルター */}
            <Box>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                <StarRate fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                評価範囲
              </Typography>
              <Box sx={{ px: 2, pt: 1 }}>
                <Slider
                  value={ratingRange}
                  onChange={handleRatingChange}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(value) => `${value.toFixed(1)}★`}
                  min={0}
                  max={5}
                  step={0.1}
                  marks={[
                    { value: 0, label: '0★' },
                    { value: 1, label: '1★' },
                    { value: 2, label: '2★' },
                    { value: 3, label: '3★' },
                    { value: 4, label: '4★' },
                    { value: 5, label: '5★' },
                  ]}
                  sx={{
                    '& .MuiSlider-markLabel': {
                      fontSize: '0.75rem',
                    },
                  }}
                />
              </Box>
            </Box>

            <Divider />

            {/* クイックフィルター */}
            <Box>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                クイックフィルター
              </Typography>
              <Stack spacing={1}>
                <Controller
                  name="openNow"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch 
                          {...field}
                          checked={field.value}
                          onChange={(e) => handleQuickFilterToggle('openNow')(e.target.checked)}
                          size="small"
                        />
                      }
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <AccessTime fontSize="small" />
                          <Typography variant="body2">営業中のみ</Typography>
                        </Box>
                      }
                    />
                  )}
                />

                <Controller
                  name="hasParking"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch 
                          {...field}
                          checked={field.value}
                          onChange={(e) => handleQuickFilterToggle('hasParking')(e.target.checked)}
                          size="small"
                        />
                      }
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LocalParking fontSize="small" />
                          <Typography variant="body2">駐車場あり</Typography>
                        </Box>
                      }
                    />
                  )}
                />

                <Controller
                  name="hasWiFi"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch 
                          {...field}
                          checked={field.value}
                          onChange={(e) => handleQuickFilterToggle('hasWiFi')(e.target.checked)}
                          size="small"
                        />
                      }
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Wifi fontSize="small" />
                          <Typography variant="body2">WiFiあり</Typography>
                        </Box>
                      }
                    />
                  )}
                />

                <Controller
                  name="acceptsCards"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch 
                          {...field}
                          checked={field.value}
                          onChange={(e) => handleQuickFilterToggle('acceptsCards')(e.target.checked)}
                          size="small"
                        />
                      }
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CreditCard fontSize="small" />
                          <Typography variant="body2">カード決済</Typography>
                        </Box>
                      }
                    />
                  )}
                />
              </Stack>
            </Box>

            <Divider />

            {/* 設備・特徴 */}
            <Box>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                設備・特徴
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {RESTAURANT_FEATURES.map((feature) => (
                  <Chip
                    key={feature.value}
                    label={feature.label}
                    clickable
                    color={watchedFeatures.includes(feature.value) ? 'primary' : 'default'}
                    variant={watchedFeatures.includes(feature.value) ? 'filled' : 'outlined'}
                    size="small"
                    onClick={() => handleFeatureToggle(feature.value)}
                    sx={{
                      fontSize: '0.8rem',
                      '&:hover': {
                        backgroundColor: 'primary.light',
                        color: 'white',
                      },
                    }}
                  />
                ))}
              </Box>
            </Box>

            {/* エリア選択 */}
            <Box>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                対象エリア
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {TOKYO_AREAS.slice(0, 8).map((area) => (
                  <Chip
                    key={area.value}
                    label={area.label}
                    clickable
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      // エリア選択ロジックは今後実装
                      console.log('Area selected:', area.value);
                    }}
                    sx={{
                      fontSize: '0.8rem',
                      '&:hover': {
                        backgroundColor: 'secondary.light',
                        color: 'white',
                      },
                    }}
                  />
                ))}
              </Box>
            </Box>
          </Stack>
        </AccordionDetails>
      </Accordion>
    </Paper>
  );
};