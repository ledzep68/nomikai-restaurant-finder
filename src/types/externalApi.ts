export interface ExternalAPIConfig {
  endpoint: string;
  apiKey?: string;
  rateLimit: number;
  timeout: number;
}

export interface ExternalAPIs {
  tabelog: ExternalAPIConfig;
  hotpepper: ExternalAPIConfig;
  googlePlaces: ExternalAPIConfig;
  retty: ExternalAPIConfig;
}

export interface TabelogResponse {
  restaurants: TabelogRestaurant[];
  total: number;
  status: string;
}

export interface TabelogRestaurant {
  id: string;
  name: string;
  category: string;
  area: string;
  address: string;
  tel: string;
  openingHours: string;
  priceRange: string;
  rating: number;
  reviewCount: number;
  url: string;
  imageUrl: string;
}

export interface HotpepperResponse {
  results: {
    shop: HotpepperShop[];
    results_available: number;
    results_returned: number;
  };
}

export interface HotpepperShop {
  id: string;
  name: string;
  genre: {
    name: string;
    code: string;
  };
  address: string;
  lat: number;
  lng: number;
  budget: {
    code: string;
    name: string;
    average: string;
  };
  open: string;
  close: string;
  party_capacity: number;
  urls: {
    pc: string;
  };
  photo: {
    pc: {
      l: string;
    };
  };
}

export interface GooglePlacesResponse {
  results: GooglePlace[];
  status: string;
  next_page_token?: string;
}

export interface GooglePlace {
  place_id: string;
  name: string;
  rating: number;
  user_ratings_total: number;
  price_level: number;
  vicinity: string;
  types: string[];
  opening_hours?: {
    open_now: boolean;
  };
  photos?: Array<{
    photo_reference: string;
  }>;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

export interface RettyResponse {
  restaurants: RettyRestaurant[];
  total_entries: number;
  page: number;
}

export interface RettyRestaurant {
  restaurant_id: string;
  name: string;
  categories: string[];
  address: string;
  tel: string;
  price_range: {
    min: number;
    max: number;
  };
  rating: {
    average: number;
    count: number;
  };
  recommendation_rate: number;
  url: string;
  images: string[];
}

export interface NormalizedRestaurant {
  externalId: string;
  platform: 'tabelog' | 'hotpepper' | 'googlePlaces' | 'retty';
  name: string;
  genre: string;
  address: string;
  priceRange: {
    min: number;
    max: number;
    category: 'low' | 'medium' | 'high';
  };
  rating: number;
  reviewCount: number;
  coordinates?: {
    lat: number;
    lng: number;
  };
  openingHours?: string;
  capacity?: number;
  url: string;
  imageUrl?: string;
  fetchedAt: Date;
}