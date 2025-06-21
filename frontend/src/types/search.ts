export interface SearchQuery {
  location: string;
  genre?: string;
  priceRange?: {
    min: number;
    max: number;
  };
  capacity?: number | string;
  page?: number;
  limit?: number;
  sort?: 'rating' | 'price' | 'distance';
}

export interface SearchHistoryItem extends SearchQuery {
  timestamp: string;
}

export interface SearchFilters {
  genres: string[];
  priceRanges: Array<{
    label: string;
    min: number;
    max: number;
  }>;
  capacities: (number | string)[];
  sortOptions: Array<{
    value: string;
    label: string;
  }>;
}

export interface SearchState {
  query: SearchQuery;
  results: IntegratedSearchResult | null;
  filters: SearchFilters;
  history: SearchHistoryItem[];
  loading: boolean;
  error: string | null;
}

export interface SearchFormData {
  location: string;
  genre: string;
  priceMin: number;
  priceMax: number;
  capacity: number | string;
}