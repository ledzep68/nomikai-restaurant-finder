import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const LoginPage: React.FC = () => {
  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
      <Paper elevation={3} sx={{ p: 4, maxWidth: 400, width: '100%' }}>
        <Typography variant="h4" component="h1" gutterBottom textAlign="center">
          ログイン
        </Typography>
        
        <Typography variant="body1" textAlign="center">
          ログイン機能は現在開発中です。
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          以下の機能を実装予定：
        </Typography>
        <ul>
          <li>メールアドレス・パスワード入力フォーム</li>
          <li>バリデーション機能</li>
          <li>JWT認証</li>
          <li>エラーハンドリング</li>
        </ul>
      </Paper>
    </Box>
  );
};

export default LoginPage;