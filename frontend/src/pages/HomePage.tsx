import React from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
} from '@mui/material';
import { RestaurantMenu, Search, Star } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@utils/constants';

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Search fontSize="large" />,
      title: '統合検索',
      description: '複数のプラットフォームから最適なレストランを検索',
    },
    {
      icon: <Star fontSize="large" />,
      title: '評価統合',
      description: '各プラットフォームの評価を統合して信頼度の高いスコアを算出',
    },
    {
      icon: <RestaurantMenu fontSize="large" />,
      title: '詳細情報',
      description: 'レストランの詳細情報、レビュー、写真を一覧表示',
    },
  ];

  return (
    <Box>
      {/* Hero Section */}
      <Paper
        elevation={3}
        sx={{
          p: 6,
          mb: 4,
          background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
          color: 'white',
          textAlign: 'center',
        }}
      >
        <RestaurantMenu sx={{ fontSize: 64, mb: 2 }} />
        <Typography variant="h3" component="h1" gutterBottom>
          Nomikai Restaurant Finder
        </Typography>
        <Typography variant="h6" component="p" paragraph>
          飲み会に最適なレストランを見つけよう
        </Typography>
        <Typography variant="body1" paragraph>
          複数のプラットフォームから情報を統合し、あなたにぴったりのお店をご提案します
        </Typography>
        <Button
          variant="contained"
          size="large"
          color="secondary"
          startIcon={<Search />}
          onClick={() => navigate(ROUTES.SEARCH)}
          sx={{ mt: 2 }}
        >
          レストランを検索
        </Button>
      </Paper>

      {/* Features Section */}
      <Typography variant="h4" component="h2" gutterBottom textAlign="center" mb={4}>
        サービスの特徴
      </Typography>
      
      <Grid container spacing={4} mb={6}>
        {features.map((feature, index) => (
          <Grid item xs={12} md={4} key={index}>
            <Card sx={{ height: '100%', textAlign: 'center' }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ color: 'primary.main', mb: 2 }}>
                  {feature.icon}
                </Box>
                <Typography variant="h6" component="h3" gutterBottom>
                  {feature.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {feature.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* CTA Section */}
      <Paper elevation={2} sx={{ p: 4, textAlign: 'center', bgcolor: 'grey.50' }}>
        <Typography variant="h5" component="h3" gutterBottom>
          今すぐ始めよう
        </Typography>
        <Typography variant="body1" paragraph color="text.secondary">
          無料でアカウントを作成して、お気に入りのレストランを管理しましょう
        </Typography>
        <Box sx={{ mt: 3 }}>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate(ROUTES.REGISTER)}
            sx={{ mr: 2 }}
          >
            新規登録
          </Button>
          <Button
            variant="outlined"
            size="large"
            onClick={() => navigate(ROUTES.LOGIN)}
          >
            ログイン
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default HomePage;