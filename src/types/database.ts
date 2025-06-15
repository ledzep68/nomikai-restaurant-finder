export interface Restaurant {
  id: number;
  name: string;
  genre: string;
  location: string;
  price_range: string;
  created_at: Date;
}

export interface Review {
  id: number;
  restaurant_id: number;
  platform: string;
  rating: number;
  review_count: number;
  updated_at: Date;
}

export interface SearchLog {
  id: number;
  user_session: string;
  search_params: string;
  results: string;
  timestamp: Date;
}

export interface User {
  id: number;
  email: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
}