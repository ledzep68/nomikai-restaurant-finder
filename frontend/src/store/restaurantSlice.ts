import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { RestaurantState, Restaurant, Evaluation } from '@types/restaurant';
import { restaurantService } from '@services/restaurantService';
import { getErrorMessage } from '@utils/helpers';

const initialState: RestaurantState = {
  current: null,
  searchResults: null,
  evaluations: [],
  favorites: [],
  loading: false,
  error: null,
};

export const getRestaurant = createAsyncThunk(
  'restaurant/getRestaurant',
  async (id: string, { rejectWithValue }) => {
    try {
      return await restaurantService.getRestaurant(id);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const evaluateRestaurant = createAsyncThunk(
  'restaurant/evaluateRestaurant',
  async (
    { id, evaluation }: { id: string; evaluation: { rating: number; comment: string } },
    { rejectWithValue }
  ) => {
    try {
      return await restaurantService.evaluateRestaurant(id, evaluation);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const getRestaurantEvaluations = createAsyncThunk(
  'restaurant/getEvaluations',
  async (id: string, { rejectWithValue }) => {
    try {
      return await restaurantService.getRestaurantEvaluations(id);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const getFavorites = createAsyncThunk(
  'restaurant/getFavorites',
  async (_, { rejectWithValue }) => {
    try {
      return await restaurantService.getFavorites();
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const addToFavorites = createAsyncThunk(
  'restaurant/addToFavorites',
  async (id: string, { rejectWithValue }) => {
    try {
      await restaurantService.addToFavorites(id);
      return id;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const removeFromFavorites = createAsyncThunk(
  'restaurant/removeFromFavorites',
  async (id: string, { rejectWithValue }) => {
    try {
      await restaurantService.removeFromFavorites(id);
      return id;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

const restaurantSlice = createSlice({
  name: 'restaurant',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrent: (state) => {
      state.current = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Get Restaurant
      .addCase(getRestaurant.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getRestaurant.fulfilled, (state, action) => {
        state.loading = false;
        state.current = action.payload;
      })
      .addCase(getRestaurant.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Evaluate Restaurant
      .addCase(evaluateRestaurant.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(evaluateRestaurant.fulfilled, (state, action) => {
        state.loading = false;
        state.evaluations.push(action.payload);
      })
      .addCase(evaluateRestaurant.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Get Evaluations
      .addCase(getRestaurantEvaluations.fulfilled, (state, action) => {
        state.evaluations = action.payload;
      })
      // Get Favorites
      .addCase(getFavorites.fulfilled, (state, action) => {
        state.favorites = action.payload;
      })
      // Add to Favorites
      .addCase(addToFavorites.fulfilled, (state, action) => {
        if (state.current && state.current.id === action.payload) {
          state.favorites.push(state.current);
        }
      })
      // Remove from Favorites
      .addCase(removeFromFavorites.fulfilled, (state, action) => {
        state.favorites = state.favorites.filter(
          (restaurant) => restaurant.id !== action.payload
        );
      });
  },
});

export const { clearError, clearCurrent } = restaurantSlice.actions;
export default restaurantSlice.reducer;