import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { SearchState, SearchQuery, SearchFilters, SearchHistoryItem } from '@types/search';
import { IntegratedSearchResult } from '@types/restaurant';
import * as restaurantService from '@services/restaurantService';
import { getErrorMessage } from '@utils/helpers';
import { GENRES, PRICE_RANGES, CAPACITIES, SORT_OPTIONS } from '@utils/constants';

const initialFilters: SearchFilters = {
  genres: GENRES.map(genre => genre.value),
  priceRanges: [...PRICE_RANGES],
  capacities: [...CAPACITIES],
  sortOptions: [...SORT_OPTIONS],
};

const initialState: SearchState = {
  query: {
    location: '',
    page: 1,
    limit: 20,
    sort: 'rating',
  },
  results: null,
  filters: initialFilters,
  history: [],
  loading: false,
  error: null,
};

export const searchRestaurants = createAsyncThunk(
  'search/searchRestaurants',
  async (query: SearchQuery, { rejectWithValue }) => {
    try {
      return await restaurantService.restaurantService.search(query);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {
    setQuery: (state, action: PayloadAction<Partial<SearchQuery>>) => {
      state.query = { ...state.query, ...action.payload };
    },
    clearQuery: (state) => {
      state.query = initialState.query;
    },
    clearResults: (state) => {
      state.results = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    addToHistory: (state, action: PayloadAction<SearchQuery>) => {
      const existingIndex = state.history.findIndex(
        (item) => 
          item.location === action.payload.location &&
          item.genre === action.payload.genre &&
          JSON.stringify(item.priceRange) === JSON.stringify(action.payload.priceRange)
      );
      
      if (existingIndex >= 0) {
        state.history.splice(existingIndex, 1);
      }
      
      const historyItem: SearchHistoryItem = {
        ...action.payload,
        timestamp: new Date().toISOString(),
      };
      
      state.history.unshift(historyItem);
      
      // Keep only last 10 searches
      if (state.history.length > 10) {
        state.history = state.history.slice(0, 10);
      }
    },
    clearHistory: (state) => {
      state.history = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(searchRestaurants.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(searchRestaurants.fulfilled, (state, action) => {
        state.loading = false;
        state.results = action.payload;
        state.error = null;
      })
      .addCase(searchRestaurants.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.results = null;
      });
  },
});

export const {
  setQuery,
  clearQuery,
  clearResults,
  clearError,
  addToHistory,
  clearHistory,
} = searchSlice.actions;

export default searchSlice.reducer;