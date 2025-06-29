import { lazy } from 'react';

// Pages - Lazy loaded for code splitting
export const LazyHomePage = lazy(() => 
  import('@pages/HomePage').then(module => ({ default: module.default }))
);

export const LazySearchPage = lazy(() => 
  import('@pages/SearchPage').then(module => ({ default: module.default }))
);

export const LazyRestaurantDetailPage = lazy(() => 
  import('@pages/RestaurantDetailPage').then(module => ({ default: module.RestaurantDetailPage }))
);

export const LazyFavoritesPage = lazy(() => 
  import('@pages/FavoritesPage').then(module => ({ default: module.default }))
);

export const LazyHistoryPage = lazy(() => 
  import('@pages/HistoryPage').then(module => ({ default: module.default }))
);

export const LazyLoginPage = lazy(() => 
  import('@pages/LoginPage').then(module => ({ default: module.default }))
);

export const LazyRegisterPage = lazy(() => 
  import('@pages/RegisterPage').then(module => ({ default: module.default }))
);

// Heavy components - Lazy loaded when needed
export const LazyComprehensiveRating = lazy(() =>
  import('@components/restaurant/ComprehensiveRating').then(module => ({ 
    default: module.ComprehensiveRating 
  }))
);

export const LazyAdvancedFilters = lazy(() =>
  import('@components/search/AdvancedFilters').then(module => ({ 
    default: module.AdvancedFilters 
  }))
);

export const LazyUserFeedback = lazy(() =>
  import('@components/common/UserFeedback').then(module => ({ 
    default: module.UserFeedback 
  }))
);

export const LazyApiUsageDashboard = lazy(() =>
  import('@components/admin/ApiUsageDashboard').then(module => ({ 
    default: module.ApiUsageDashboard 
  }))
);

// Mobile components
export const LazyMobileSearchForm = lazy(() =>
  import('@components/mobile/MobileSearchForm').then(module => ({ 
    default: module.MobileSearchForm 
  }))
);

export const LazyMobileLayout = lazy(() =>
  import('@components/mobile/MobileLayout').then(module => ({ 
    default: module.MobileLayout 
  }))
);