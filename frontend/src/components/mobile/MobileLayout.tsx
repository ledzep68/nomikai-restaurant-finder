import React from 'react';
import {
  Box,
  Container,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Menu,
  Home,
  Search,
  Favorite,
  History,
  Person,
  RestaurantMenu,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { ROUTES } from '@utils/constants';

interface MobileLayoutProps {
  children: React.ReactNode;
  title?: string;
  showBackButton?: boolean;
  onBack?: () => void;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({
  children,
  title = 'Nomikai',
  showBackButton: _showBackButton = false,
  onBack: _onBack,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const menuItems = [
    { icon: <Home />, text: 'ホーム', path: ROUTES.HOME },
    { icon: <Search />, text: '検索', path: ROUTES.SEARCH },
    { icon: <Favorite />, text: 'お気に入り', path: ROUTES.FAVORITES },
    { icon: <History />, text: '履歴', path: ROUTES.HISTORY },
    { icon: <Person />, text: 'プロフィール', path: ROUTES.PROFILE },
  ];

  const handleMenuClick = (path: string) => {
    navigate(path);
    setDrawerOpen(false);
  };

  if (!isMobile) {
    // Return desktop layout for non-mobile devices
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {children}
      </Container>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Mobile App Bar */}
      <AppBar 
        position="fixed" 
        sx={{ 
          zIndex: theme.zIndex.drawer + 1,
          background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
        }}
      >
        <Toolbar sx={{ minHeight: '56px !important' }}>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => setDrawerOpen(true)}
            sx={{
              mr: 2,
              minWidth: '44px',
              minHeight: '44px',
            }}
          >
            <Menu />
          </IconButton>
          
          <RestaurantMenu sx={{ mr: 1 }} />
          
          <Typography 
            variant="h6" 
            sx={{ 
              flexGrow: 1,
              fontSize: '18px',
              fontWeight: 600,
            }}
          >
            {title}
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Mobile Navigation Drawer */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{
          '& .MuiDrawer-paper': {
            width: 280,
            backgroundColor: theme.palette.background.default,
          },
        }}
      >
        <Toolbar />
        
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <RestaurantMenu color="primary" sx={{ fontSize: 40 }} />
          <Typography variant="h6" sx={{ mt: 1, color: 'primary.main' }}>
            Nomikai Restaurant Finder
          </Typography>
          <Typography variant="caption" color="text.secondary">
            最適な店舗を見つけよう
          </Typography>
        </Box>

        <Divider />

        <List sx={{ px: 1 }}>
          {menuItems.map((item) => (
            <ListItem
              key={item.path}
              onClick={() => handleMenuClick(item.path)}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                minHeight: '48px',
                '&:hover': {
                  backgroundColor: theme.palette.action.hover,
                },
                '&:active': {
                  backgroundColor: theme.palette.action.selected,
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: '40px' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.text}
                primaryTypographyProps={{
                  fontSize: '16px',
                  fontWeight: 500,
                }}
              />
            </ListItem>
          ))}
        </List>
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          pt: 7, // Account for AppBar height
          pb: 2,
          minHeight: '100vh',
          backgroundColor: theme.palette.background.default,
          // Ensure content is accessible on mobile
          '& *': {
            fontSize: { xs: '16px !important' }, // Prevent zoom on iOS
          },
          '& input, & textarea': {
            fontSize: '16px !important',
          },
        }}
      >
        {children}
      </Box>

      {/* Safe area padding for devices with notches */}
      <style>{`
        @supports (padding: max(0px)) {
          .mobile-safe-area-top {
            padding-top: max(env(safe-area-inset-top), 0px);
          }
          .mobile-safe-area-bottom {
            padding-bottom: max(env(safe-area-inset-bottom), 0px);
          }
        }
      `}</style>
    </Box>
  );
};