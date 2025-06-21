import React from 'react';
import {
  IconButton,
  Tooltip,
  Zoom,
  Badge,
} from '@mui/material';
import {
  Favorite,
  FavoriteBorder,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '@store/index';
import { toggleFavorite, selectIsFavorite, selectFavoritesCount } from '@store/favoritesSlice';

interface FavoriteButtonProps {
  restaurantId: string;
  size?: 'small' | 'medium' | 'large';
  color?: 'default' | 'primary' | 'secondary';
  showBadge?: boolean;
  className?: string;
  onClick?: (event: React.MouseEvent) => void;
}

export const FavoriteButton: React.FC<FavoriteButtonProps> = ({
  restaurantId,
  size = 'medium',
  color = 'default',
  showBadge = false,
  className,
  onClick,
}) => {
  const dispatch = useAppDispatch();
  const isFavorite = useAppSelector((state) => selectIsFavorite(state, restaurantId));
  const favoritesCount = useAppSelector(selectFavoritesCount);

  const handleClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    dispatch(toggleFavorite(restaurantId));
    onClick?.(event);
  };

  const getTooltipText = () => {
    return isFavorite ? 'お気に入りから削除' : 'お気に入りに追加';
  };

  const getFavoriteIcon = () => {
    return isFavorite ? (
      <Favorite 
        color={color === 'default' ? 'error' : color}
        fontSize={size}
      />
    ) : (
      <FavoriteBorder 
        color={color === 'default' ? 'action' : color}
        fontSize={size}
      />
    );
  };

  const favoriteButton = (
    <IconButton
      onClick={handleClick}
      className={className}
      size={size}
      sx={{
        color: isFavorite ? 'error.main' : 'action.active',
        '&:hover': {
          color: isFavorite ? 'error.dark' : 'error.main',
          transform: 'scale(1.1)',
        },
        transition: 'all 0.2s ease-in-out',
      }}
    >
      {getFavoriteIcon()}
    </IconButton>
  );

  const buttonWithTooltip = (
    <Tooltip
      title={getTooltipText()}
      placement="top"
      TransitionComponent={Zoom}
      arrow
    >
      {favoriteButton}
    </Tooltip>
  );

  if (showBadge && favoritesCount > 0) {
    return (
      <Badge
        badgeContent={favoritesCount}
        color="error"
        max={99}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        {buttonWithTooltip}
      </Badge>
    );
  }

  return buttonWithTooltip;
};