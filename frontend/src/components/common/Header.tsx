import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  AccountCircle,
  RestaurantMenu,
  Logout,
  Login,
  PersonAdd,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@store/index';
import { logout } from '@store/authSlice';
import { ROUTES } from '@utils/constants';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    dispatch(logout());
    handleClose();
    navigate(ROUTES.HOME);
  };

  const handleProfile = () => {
    handleClose();
    navigate(ROUTES.PROFILE);
  };

  const handleFavorites = () => {
    handleClose();
    navigate(ROUTES.FAVORITES);
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <RestaurantMenu sx={{ mr: 2 }} />
        <Typography
          variant="h6"
          component="div"
          sx={{ flexGrow: 1, cursor: 'pointer' }}
          onClick={() => navigate(ROUTES.HOME)}
        >
          Nomikai Restaurant Finder
        </Typography>

        {isAuthenticated ? (
          <Box>
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenu}
              color="inherit"
            >
              <AccountCircle />
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorEl)}
              onClose={handleClose}
            >
              <MenuItem onClick={handleProfile}>
                <AccountCircle sx={{ mr: 1 }} />
                プロフィール
              </MenuItem>
              <MenuItem onClick={handleFavorites}>
                <RestaurantMenu sx={{ mr: 1 }} />
                お気に入り
              </MenuItem>
              <MenuItem onClick={handleLogout}>
                <Logout sx={{ mr: 1 }} />
                ログアウト
              </MenuItem>
            </Menu>
            <Typography variant="body2" sx={{ ml: 1 }}>
              {user?.name}さん
            </Typography>
          </Box>
        ) : (
          <Box>
            <Button
              color="inherit"
              startIcon={<Login />}
              onClick={() => navigate(ROUTES.LOGIN)}
              sx={{ mr: 1 }}
            >
              ログイン
            </Button>
            <Button
              color="inherit"
              startIcon={<PersonAdd />}
              onClick={() => navigate(ROUTES.REGISTER)}
            >
              新規登録
            </Button>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Header;