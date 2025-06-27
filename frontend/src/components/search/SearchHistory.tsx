import React, { useState } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  Divider,
  Tooltip,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  ExpandMore,
  History,
  Delete,
  Clear,
  Search,
  Schedule,
  LocationOn,
  Restaurant,
  AttachMoney,
} from '@mui/icons-material';
import { useAppSelector, useAppDispatch } from '@store/index';
import { setQuery, searchRestaurants, clearHistory } from '@store/searchSlice';
import type { SearchHistoryItem } from '@types/search';
import { formatPrice } from '@utils/helpers';
import { responsiveSpacing } from '@utils/responsive';

interface SearchHistoryProps {
  onSearch?: () => void;
  isExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  maxItems?: number;
}

export const SearchHistory: React.FC<SearchHistoryProps> = ({
  onSearch,
  isExpanded = false,
  onExpandedChange,
  maxItems = 5,
}) => {
  const dispatch = useAppDispatch();
  const { history = [] } = useAppSelector((state) => state.search);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  const handleHistoryItemClick = async (historyItem: SearchHistoryItem) => {
    const { timestamp, ...searchQuery } = historyItem;
    dispatch(setQuery(searchQuery));
    
    try {
      await dispatch(searchRestaurants(searchQuery)).unwrap();
      onSearch?.();
    } catch (error) {
      console.error('Search from history failed:', error);
    }
  };

  const handleClearHistory = () => {
    dispatch(clearHistory());
    setClearDialogOpen(false);
  };

  const formatHistoryDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'たった今';
    if (diffMinutes < 60) return `${diffMinutes}分前`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}時間前`;
    if (diffMinutes < 10080) return `${Math.floor(diffMinutes / 1440)}日前`;
    return date.toLocaleDateString('ja-JP');
  };

  const getSearchSummary = (item: SearchHistoryItem) => {
    const parts: string[] = [];
    
    if (item.location) parts.push(item.location);
    if (item.genre) parts.push(item.genre);
    if (item.priceRange && (item.priceRange.min > 0 || item.priceRange.max < 999999)) {
      parts.push(`${formatPrice(item.priceRange.min)}～${formatPrice(item.priceRange.max)}`);
    }
    
    return parts.join(' • ') || '条件なし';
  };

  const getSearchDetails = (item: SearchHistoryItem) => {
    const details: Array<{ icon: React.ReactNode; text: string }> = [];
    
    if (item.location) {
      details.push({ icon: <LocationOn fontSize="small" />, text: item.location });
    }
    
    if (item.genre) {
      details.push({ icon: <Restaurant fontSize="small" />, text: item.genre });
    }
    
    if (item.priceRange && (item.priceRange.min > 0 || item.priceRange.max < 999999)) {
      details.push({ 
        icon: <AttachMoney fontSize="small" />, 
        text: `${formatPrice(item.priceRange.min)}～${formatPrice(item.priceRange.max)}`
      });
    }
    
    if (item.capacity && item.capacity > 0) {
      details.push({ 
        icon: <span style={{ fontSize: '16px' }}>👥</span>, 
        text: `${item.capacity}人${typeof item.capacity === 'string' && item.capacity.includes('+') ? '以上' : ''}`
      });
    }

    return details;
  };

  if (history.length === 0) {
    return (
      <Paper 
        elevation={1} 
        sx={{ 
          mt: responsiveSpacing.medium,
          p: 3,
          textAlign: 'center',
          border: '1px solid',
          borderColor: 'divider'
        }}
      >
        <History sx={{ fontSize: 48, color: 'grey.300', mb: 1 }} />
        <Typography variant="body2" color="text.secondary">
          検索履歴はまだありません
        </Typography>
      </Paper>
    );
  }

  const displayedHistory = history.slice(0, maxItems);
  const hasMore = history.length > maxItems;

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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
            <History color="primary" />
            <Typography 
              variant="h6" 
              sx={{ 
                fontSize: { xs: '1rem', sm: '1.25rem' },
                fontWeight: 600 
              }}
            >
              検索履歴
            </Typography>
            <Chip 
              label={history.length} 
              size="small" 
              color="primary" 
              variant="outlined"
            />
            {history.length > 0 && (
              <Box sx={{ ml: 'auto' }}>
                <Tooltip title="履歴をすべて削除">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setClearDialogOpen(true);
                    }}
                    sx={{ color: 'text.secondary' }}
                  >
                    <Clear fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            )}
          </Box>
        </AccordionSummary>

        <AccordionDetails sx={{ p: 0 }}>
          <List sx={{ py: 0 }}>
            {displayedHistory.map((item, index) => (
              <React.Fragment key={`${item.location}-${item.timestamp}`}>
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={() => handleHistoryItemClick(item)}
                    sx={{
                      px: responsiveSpacing.medium,
                      py: 1.5,
                      '&:hover': {
                        backgroundColor: 'action.hover',
                      },
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Search fontSize="small" color="action" />
                          <Typography 
                            variant="subtitle2" 
                            sx={{ 
                              fontSize: { xs: '0.875rem', sm: '1rem' },
                              fontWeight: 500
                            }}
                          >
                            {getSearchSummary(item)}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Box component="span" sx={{ display: 'block' }}>
                          {/* 検索条件の詳細 */}
                          <Box component="span" sx={{ 
                            display: 'flex', 
                            gap: 1, 
                            mt: 1,
                            mb: 1,
                            flexWrap: 'wrap'
                          }}>
                            {getSearchDetails(item).map((detail, idx) => (
                              <Chip
                                key={idx}
                                icon={detail.icon}
                                label={detail.text}
                                size="small"
                                variant="outlined"
                                sx={{ 
                                  fontSize: '0.75rem',
                                  height: 24
                                }}
                              />
                            ))}
                          </Box>
                          
                          {/* タイムスタンプ */}
                          <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Schedule 
                              fontSize="small" 
                              sx={{ color: 'text.disabled', fontSize: 14 }}
                            />
                            <Typography 
                              component="span"
                              variant="caption" 
                              color="text.secondary"
                              sx={{ fontSize: '0.75rem' }}
                            >
                              {formatHistoryDate(item.timestamp)}
                            </Typography>
                          </Box>
                        </Box>
                      }
                      secondaryTypographyProps={{
                        component: 'div'
                      }}
                    />
                  </ListItemButton>
                </ListItem>
                {index < displayedHistory.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>

          {hasMore && (
            <Box sx={{ p: 2, textAlign: 'center', borderTop: '1px solid', borderColor: 'divider' }}>
              <Typography variant="caption" color="text.secondary">
                あと{history.length - maxItems}件の履歴があります
              </Typography>
            </Box>
          )}

          {history.length > 0 && (
            <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Clear />}
                onClick={() => setClearDialogOpen(true)}
                size="small"
                color="error"
              >
                履歴をすべて削除
              </Button>
            </Box>
          )}
        </AccordionDetails>
      </Accordion>

      {/* 削除確認ダイアログ */}
      <Dialog
        open={clearDialogOpen}
        onClose={() => setClearDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>検索履歴を削除</DialogTitle>
        <DialogContent>
          <Typography>
            本当にすべての検索履歴（{history.length}件）を削除しますか？
            この操作は取り消すことができません。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClearDialogOpen(false)}>
            キャンセル
          </Button>
          <Button
            onClick={handleClearHistory}
            color="error"
            variant="contained"
          >
            削除
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};