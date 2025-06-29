import React from 'react';
import { Breadcrumbs, Link, Typography, Box } from '@mui/material';
import { NavigateNext, Home } from '@mui/icons-material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { generateBreadcrumbJsonLd } from '@utils/seo';
import { SEOHead } from './SEOHead';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbNavigationProps {
  items: BreadcrumbItem[];
}

export const BreadcrumbNavigation: React.FC<BreadcrumbNavigationProps> = ({ items }) => {
  const location = useLocation();
  
  // ホームページを先頭に追加
  const allItems = [
    { label: 'ホーム', href: '/' },
    ...items
  ];

  // JSON-LD用のデータ生成
  const breadcrumbData = allItems.map((item, index) => ({
    name: item.label,
    url: item.href || location.pathname
  }));

  const jsonLd = generateBreadcrumbJsonLd(breadcrumbData);

  return (
    <Box sx={{ mb: 2 }}>
      <SEOHead config={{
        title: '',
        description: '',
        jsonLd
      }} />
      
      <Breadcrumbs
        separator={<NavigateNext fontSize="small" />}
        aria-label="breadcrumb"
        sx={{
          '& .MuiBreadcrumbs-ol': {
            flexWrap: 'nowrap',
            overflowX: 'auto',
            '&::-webkit-scrollbar': {
              display: 'none'
            },
            msOverflowStyle: 'none',
            scrollbarWidth: 'none'
          }
        }}
      >
        {allItems.map((item, index) => {
          const isLast = index === allItems.length - 1;
          const isHome = index === 0;

          if (isLast) {
            return (
              <Typography
                key={index}
                color="text.primary"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '0.875rem',
                  fontWeight: 500
                }}
              >
                {isHome && <Home sx={{ mr: 0.5, fontSize: '1rem' }} />}
                {item.label}
              </Typography>
            );
          }

          return (
            <Link
              key={index}
              component={RouterLink}
              to={item.href || '/'}
              underline="hover"
              color="inherit"
              sx={{
                display: 'flex',
                alignItems: 'center',
                fontSize: '0.875rem',
                '&:hover': {
                  color: 'primary.main'
                }
              }}
            >
              {isHome && <Home sx={{ mr: 0.5, fontSize: '1rem' }} />}
              {item.label}
            </Link>
          );
        })}
      </Breadcrumbs>
    </Box>
  );
};