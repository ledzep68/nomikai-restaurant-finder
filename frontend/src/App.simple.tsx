import React from 'react';
import { Box, Typography } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
  },
});

const SimpleApp: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '100vh',
          flexDirection: 'column',
          gap: 2 
        }}
      >
        <Typography variant="h3" component="h1" color="primary">
          🍽️ Nomikai
        </Typography>
        <Typography variant="h6" color="text.secondary">
          レストランファインダー
        </Typography>
        <Typography variant="body1" color="text.secondary">
          アプリケーションが正常に動作しています
        </Typography>
      </Box>
    </ThemeProvider>
  );
};

export default SimpleApp;