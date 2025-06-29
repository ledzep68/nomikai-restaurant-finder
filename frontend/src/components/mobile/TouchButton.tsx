import React from 'react';
import { Button, ButtonProps } from '@mui/material';
import { styled } from '@mui/material/styles';

interface TouchButtonProps extends ButtonProps {
  touchOptimized?: boolean;
}

const StyledTouchButton = styled(Button, {
  shouldForwardProp: (prop) => prop !== 'touchOptimized',
})<{ touchOptimized?: boolean }>(({ theme, touchOptimized }) => ({
  ...(touchOptimized && {
    minHeight: '44px', // Apple's recommended touch target size
    minWidth: '44px',
    padding: theme.spacing(1.5, 2),
    fontSize: '16px', // Prevents zoom on iOS
    borderRadius: '8px',
    transition: 'all 0.2s ease-in-out',
    
    // Enhanced touch feedback
    '&:active': {
      transform: 'scale(0.98)',
      backgroundColor: theme.palette.action.selected,
    },
    
    // Better spacing for mobile
    '&:not(:last-child)': {
      marginBottom: theme.spacing(1),
    },
    
    // Ensure visibility on mobile
    '&:focus-visible': {
      outline: `2px solid ${theme.palette.primary.main}`,
      outlineOffset: '2px',
    },
  }),
}));

export const TouchButton: React.FC<TouchButtonProps> = ({
  touchOptimized = true,
  children,
  ...props
}) => {
  return (
    <StyledTouchButton touchOptimized={touchOptimized} {...props}>
      {children}
    </StyledTouchButton>
  );
};