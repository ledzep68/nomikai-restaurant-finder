export interface Restaurant {
  id: string;
  name: string;
  address: string;
  phone: string;
  genre: string;
  priceRange: {
    min: number;
    max: number;
  };
  location: {
    lat: number;
    lng: number;
  };
  openingHours: {
    [key: string]: string;
  };
  images: string[];
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformScore {
  platform: 'hotpepper' | 'googlePlaces';
  score: number;
  reviewCount: number;
  url?: string;
}

export interface EvaluationResult {
  restaurant: Restaurant;
  totalScore: number;
  confidence: number;
  recommendation: 'highly_recommended' | 'recommended' | 'suitable';
  platformScores: PlatformScore[];
  reviewCount: number;
  lastUpdated: string;
}

export interface IntegratedSearchResult {
  restaurants: EvaluationResult[];
  meta: {
    totalCount: number;
    page: number;
    limit: number;
    platformsUsed: string[];
    searchTime: number;
    cached: boolean;
    integratedSearch: boolean;
  };
  attributions: {
    [platform: string]: string;
  };
  legalNotices: {
    dataUsage: string;
    privacyPolicy: string;
  };
}

export interface Evaluation {
  id: string;
  userId: string;
  restaurantId: string;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
}

export interface RestaurantState {
  current: Restaurant | null;
  searchResults: IntegratedSearchResult | null;
  evaluations: Evaluation[];
  favorites: Restaurant[];
  loading: boolean;
  error: string | null;
}