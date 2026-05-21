import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import restaurantService from '../../services/restaurantService';

const initialState = {
  restaurants: [],
  filteredRestaurants: [],
  loading: false,
  error: null,
  filters: {
    cuisine: null,
    minRating: 0,
    maxDistance: null,
  },
};

const normalizeRestaurantList = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (Array.isArray(payload?.restaurants)) {
    return payload.restaurants;
  }
  return [];
};

export const fetchRestaurants = createAsyncThunk(
  'restaurants/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const response = await restaurantService.getRestaurants();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch restaurants');
    }
  }
);

const restaurantSlice = createSlice({
  name: 'restaurants',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
      // Apply filters
      let filtered = state.restaurants;

      if (state.filters.cuisine) {
        filtered = filtered.filter(r => r.cuisine_type === state.filters.cuisine);
      }
      if (state.filters.minRating > 0) {
        filtered = filtered.filter(r => r.rating >= state.filters.minRating);
      }
      if (state.filters.maxDistance) {
        filtered = filtered.filter(r => (r.distance_km ?? Number.MAX_SAFE_INTEGER) <= state.filters.maxDistance);
      }

      state.filteredRestaurants = filtered;
    },
    clearFilters: (state) => {
      state.filters = {
        cuisine: null,
        minRating: 0,
        maxDistance: null,
      };
      state.filteredRestaurants = state.restaurants;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRestaurants.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRestaurants.fulfilled, (state, action) => {
        state.loading = false;
        const restaurants = normalizeRestaurantList(action.payload);
        state.restaurants = restaurants;
        state.filteredRestaurants = restaurants;
      })
      .addCase(fetchRestaurants.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { setFilters, clearFilters } = restaurantSlice.actions;
export default restaurantSlice.reducer;
