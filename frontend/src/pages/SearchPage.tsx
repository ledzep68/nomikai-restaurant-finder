import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const SearchPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        レストラン検索
      </Typography>
      
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="body1">
          検索機能は現在開発中です。
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          以下の機能を実装予定：
        </Typography>
        <ul>
          <li>検索フォーム（場所、ジャンル、価格帯、人数）</li>
          <li>リアルタイム検索結果表示</li>
          <li>フィルター・ソート機能</li>
          <li>ページネーション</li>
        </ul>
      </Paper>
    </Box>
  );
};

export default SearchPage;