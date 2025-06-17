import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const RegisterPage: React.FC = () => {
  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
      <Paper elevation={3} sx={{ p: 4, maxWidth: 400, width: '100%' }}>
        <Typography variant="h4" component="h1" gutterBottom textAlign="center">
          新規登録
        </Typography>
        
        <Typography variant="body1" textAlign="center">
          新規登録機能は現在開発中です。
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          以下の機能を実装予定：
        </Typography>
        <ul>
          <li>名前・メールアドレス・パスワード入力フォーム</li>
          <li>パスワード確認機能</li>
          <li>バリデーション機能</li>
          <li>アカウント作成処理</li>
        </ul>
      </Paper>
    </Box>
  );
};

export default RegisterPage;