import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from './index';

interface FavoritesState {
  favorites: string[]; // Array of restaurant IDs
  lastUpdated: string | null;
}

const initialState: FavoritesState = {
  favorites: [],
  lastUpdated: null,
};

// Load favorites from localStorage
const loadFavoritesFromStorage = (): string[] => {
  try {
    const stored = localStorage.getItem('nomikai_favorites');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load favorites from localStorage:', error);
    return [];
  }
};

// Save favorites to localStorage
const saveFavoritesToStorage = (favorites: string[]) => {
  try {
    localStorage.setItem('nomikai_favorites', JSON.stringify(favorites));
  } catch (error) {
    console.error('Failed to save favorites to localStorage:', error);
  }
};

const favoritesSlice = createSlice({
  name: 'favorites',
  initialState: {
    ...initialState,
    favorites: loadFavoritesFromStorage(),
  },
  reducers: {
    addToFavorites: (state, action: PayloadAction<string>) => {
      const restaurantId = action.payload;
      if (!state.favorites.includes(restaurantId)) {
        state.favorites.push(restaurantId);
        state.lastUpdated = new Date().toISOString();
        saveFavoritesToStorage(state.favorites);
      }
    },

    removeFromFavorites: (state, action: PayloadAction<string>) => {
      const restaurantId = action.payload;
      state.favorites = state.favorites.filter(id => id !== restaurantId);
      state.lastUpdated = new Date().toISOString();
      saveFavoritesToStorage(state.favorites);
    },

    toggleFavorite: (state, action: PayloadAction<string>) => {
      const restaurantId = action.payload;
      const index = state.favorites.indexOf(restaurantId);
      
      if (index > -1) {
        // Remove from favorites
        state.favorites.splice(index, 1);
      } else {
        // Add to favorites
        state.favorites.push(restaurantId);
      }
      
      state.lastUpdated = new Date().toISOString();
      saveFavoritesToStorage(state.favorites);
    },

    clearFavorites: (state) => {
      state.favorites = [];
      state.lastUpdated = new Date().toISOString();
      saveFavoritesToStorage(state.favorites);
    },

    loadFavorites: (state) => {
      state.favorites = loadFavoritesFromStorage();
      state.lastUpdated = new Date().toISOString();
    },

    syncFavorites: (state, action: PayloadAction<string[]>) => {
      // For syncing with server in the future
      state.favorites = action.payload;
      state.lastUpdated = new Date().toISOString();
      saveFavoritesToStorage(state.favorites);
    },
  },
});

export const {
  addToFavorites,
  removeFromFavorites,
  toggleFavorite,
  clearFavorites,
  loadFavorites,
  syncFavorites,
} = favoritesSlice.actions;

// Selectors
export const selectFavorites = (state: RootState) => state.favorites.favorites;

export const selectIsFavorite = (state: RootState, restaurantId: string) =>
  state.favorites.favorites.includes(restaurantId);

export const selectFavoritesCount = (state: RootState) => state.favorites.favorites.length;

export const selectLastUpdated = (state: RootState) => state.favorites.lastUpdated;

export default favoritesSlice.reducer;