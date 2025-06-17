export interface SearchQuery {
  location: string;
  genre?: string;
  priceRange?: {
    min: number;
    max: number;
  };
  capacity?: number;
  page?: number;
  limit?: number;
  sort?: 'rating' | 'price' | 'distance';
}

export interface SearchFilters {
  genres: string[];
  priceRanges: Array<{
    label: string;
    min: number;
    max: number;
  }>;
  capacities: number[];
  sortOptions: Array<{
    value: string;
    label: string;
  }>;
}

export interface SearchState {
  query: SearchQuery;
  results: IntegratedSearchResult | null;
  filters: SearchFilters;
  history: SearchQuery[];
  loading: boolean;
  error: string | null;
}

export interface SearchFormData {
  location: string;
  genre: string;
  priceMin: number;
  priceMax: number;
  capacity: number;
}