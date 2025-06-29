import React, { useState } from 'react';
import { SEOHead } from '@components/seo/SEOHead';
import { generateHistorySEO } from '@utils/seo';
import {
  Container,
  Typography,
  Box,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Button,
  Divider,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Card,
  CardContent,
  Grid,
} from '@mui/material';
import {
  History,
  Delete,
  Clear,
  Search,
  Schedule,
  LocationOn,
  Restaurant,
  AttachMoney,
  TrendingUp,
  Analytics,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@store/index';
import { setQuery, searchRestaurants, clearHistory } from '@store/searchSlice';
import type { SearchHistoryItem } from '@types/search';
import { formatPrice } from '@utils/helpers';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`history-tabpanel-${index}`}
      aria-labelledby={`history-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { history } = useAppSelector((state) => state.search);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleHistoryItemClick = async (historyItem: SearchHistoryItem) => {
    const { timestamp, ...searchQuery } = historyItem;
    dispatch(setQuery(searchQuery));
    
    try {
      await dispatch(searchRestaurants(searchQuery)).unwrap();
      navigate('/search');
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
    return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
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
    const details: Array<{ icon: React.ReactNode; text: string; color?: string }> = [];
    
    if (item.location) {
      details.push({ icon: <LocationOn fontSize="small" />, text: item.location, color: 'primary' });
    }
    
    if (item.genre) {
      details.push({ icon: <Restaurant fontSize="small" />, text: item.genre, color: 'secondary' });
    }
    
    if (item.priceRange && (item.priceRange.min > 0 || item.priceRange.max < 999999)) {
      details.push({ 
        icon: <AttachMoney fontSize="small" />, 
        text: `${formatPrice(item.priceRange.min)}～${formatPrice(item.priceRange.max)}`,
        color: 'warning'
      });
    }
    
    if (item.capacity && item.capacity > 0) {
      details.push({ 
        icon: <span style={{ fontSize: '16px' }}>👥</span>, 
        text: `${item.capacity}人${typeof item.capacity === 'string' && item.capacity.includes('+') ? '以上' : ''}`,
        color: 'info'
      });
    }

    return details;
  };

  // 統計データの計算
  const getSearchStats = () => {
    if (history.length === 0) return null;

    // 最も検索された場所
    const locationCounts = history.reduce((acc, item) => {
      if (item.location) {
        acc[item.location] = (acc[item.location] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // 最も検索されたジャンル
    const genreCounts = history.reduce((acc, item) => {
      if (item.genre) {
        acc[item.genre] = (acc[item.genre] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const topLocation = Object.entries(locationCounts).sort(([,a], [,b]) => b - a)[0];
    const topGenre = Object.entries(genreCounts).sort(([,a], [,b]) => b - a)[0];

    return {
      totalSearches: history.length,
      topLocation: topLocation ? { name: topLocation[0], count: topLocation[1] } : null,
      topGenre: topGenre ? { name: topGenre[0], count: topGenre[1] } : null,
      recentDays: Math.ceil((Date.now() - new Date(history[history.length - 1]?.timestamp || 0).getTime()) / (1000 * 60 * 60 * 24)),
    };
  };

  const stats = getSearchStats();

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <SEOHead config={generateHistorySEO()} />
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          <History sx={{ mr: 1, verticalAlign: 'middle' }} />
          検索履歴
        </Typography>
        
        <Typography variant="subtitle1" color="text.secondary">
          過去の検索条件を確認・再利用できます
        </Typography>
      </Box>

      {history.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <History sx={{ fontSize: 64, color: 'grey.300', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            検索履歴はまだありません
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            レストラン検索を行うと、検索条件がここに保存されます
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate('/search')}
            size="large"
          >
            レストランを検索
          </Button>
        </Paper>
      ) : (
        <>
          {/* タブ */}
          <Paper sx={{ mb: 3 }}>
            <Tabs 
              value={tabValue} 
              onChange={handleTabChange}
              variant="fullWidth"
              sx={{ borderBottom: 1, borderColor: 'divider' }}
            >
              <Tab 
                label={`履歴 (${history.length})`}
                icon={<History />}
                iconPosition="start"
              />
              <Tab 
                label="統計"
                icon={<Analytics />}
                iconPosition="start"
              />
            </Tabs>
          </Paper>

          {/* 履歴タブ */}
          <TabPanel value={tabValue} index={0}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">
                検索履歴 ({history.length}件)
              </Typography>
              <Button
                startIcon={<Clear />}
                variant="outlined"
                color="error"
                onClick={() => setClearDialogOpen(true)}
                size="small"
              >
                すべて削除
              </Button>
            </Box>

            <Paper>
              <List sx={{ py: 0 }}>
                {history.map((item, index) => (
                  <React.Fragment key={`${item.location}-${item.timestamp}`}>
                    <ListItem disablePadding>
                      <ListItemButton
                        onClick={() => handleHistoryItemClick(item)}
                        sx={{ py: 2 }}
                      >
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                              <Search fontSize="small" color="primary" />
                              <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                                {getSearchSummary(item)}
                              </Typography>
                            </Box>
                          }
                          secondary={
                            <Box sx={{ mt: 1 }}>
                              {/* 検索条件の詳細 */}
                              <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                                {getSearchDetails(item).map((detail, idx) => (
                                  <Chip
                                    key={idx}
                                    icon={detail.icon}
                                    label={detail.text}
                                    size="small"
                                    variant="outlined"
                                    color={detail.color as any}
                                    sx={{ fontSize: '0.75rem' }}
                                  />
                                ))}
                              </Box>
                              
                              {/* タイムスタンプ */}
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Schedule fontSize="small" sx={{ color: 'text.disabled' }} />
                                <Typography variant="caption" color="text.secondary">
                                  {formatHistoryDate(item.timestamp)}
                                </Typography>
                              </Box>
                            </Box>
                          }
                        />
                        <ListItemSecondaryAction>
                          <IconButton edge="end" size="small">
                            <Search />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItemButton>
                    </ListItem>
                    {index < history.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          </TabPanel>

          {/* 統計タブ */}
          <TabPanel value={tabValue} index={1}>
            {stats && (
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="primary">
                        {stats.totalSearches}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        総検索回数
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                {stats.topLocation && (
                  <Grid item xs={12} sm={6} md={3}>
                    <Card>
                      <CardContent sx={{ textAlign: 'center' }}>
                        <LocationOn color="primary" sx={{ fontSize: 32, mb: 1 }} />
                        <Typography variant="h6">
                          {stats.topLocation.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          最も検索された場所 ({stats.topLocation.count}回)
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                {stats.topGenre && (
                  <Grid item xs={12} sm={6} md={3}>
                    <Card>
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Restaurant color="secondary" sx={{ fontSize: 32, mb: 1 }} />
                        <Typography variant="h6">
                          {stats.topGenre.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          最も検索されたジャンル ({stats.topGenre.count}回)
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <TrendingUp color="success" sx={{ fontSize: 32, mb: 1 }} />
                      <Typography variant="h6">
                        {stats.recentDays}日
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        利用期間
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}
          </TabPanel>
        </>
      )}

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
    </Container>
  );
};

export default HistoryPage;