import React from 'react';
import { Button } from '@mui/material';

export const SkipToContent: React.FC = () => {
  const handleSkipToContent = () => {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.focus();
      mainContent.scrollIntoView();
    }
  };

  return (
    <Button
      onClick={handleSkipToContent}
      sx={{
        position: 'absolute',
        left: '-9999px',
        zIndex: 9999,
        '&:focus': {
          left: '6px',
          top: '6px',
          position: 'fixed',
        }
      }}
      variant="contained"
      color="primary"
    >
      メインコンテンツへスキップ
    </Button>
  );
};