import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';
import { reverseGeocodeLocation } from '../../services/locationService';

const initialState = {
  userLocation: null,
  selectedLocation: null,
  isLoading: false,
  error: null,
  isSaving: false,
  saveSuccess: false,
};

/**
 * Save selected location to user profile
 */
export const saveLocationToProfile = createAsyncThunk(
  'mapSelection/saveLocation',
  async (coordinates, { rejectWithValue }) => {
    try {
      const place = coordinates.place || await reverseGeocodeLocation(coordinates);
      const response = await api.post('/users/me/addresses', {
        label: 'Selected Location',
        line1: place.name || place.formattedAddress || 'Selected map location',
        line2: null,
        city: place.city || null,
        region: place.region || null,
        postal_code: place.postalCode || null,
        country: place.country || 'US',
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        is_default: true,
      });
      return response.data;
    } catch (error) {
      // Handle validation errors (422) which return an array of error objects
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        // If detail is an array of validation errors, extract the messages
        if (Array.isArray(detail)) {
          const errorMessages = detail.map(err => err.msg || JSON.stringify(err)).join(', ');
          return rejectWithValue(errorMessages);
        }
        // If detail is a string, return it directly
        return rejectWithValue(detail);
      }
      return rejectWithValue('Failed to save location');
    }
  }
);

const mapSelectionSlice = createSlice({
  name: 'mapSelection',
  initialState,
  reducers: {
    setUserLocation: (state, action) => {
      state.userLocation = action.payload;
    },
    setSelectedLocation: (state, action) => {
      state.selectedLocation = action.payload;
      state.saveSuccess = false; // Reset save success when new location is selected
    },
    clearSelectedLocation: (state) => {
      state.selectedLocation = null;
      state.saveSuccess = false;
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    resetState: (state) => {
      state.userLocation = null;
      state.selectedLocation = null;
      state.isLoading = false;
      state.error = null;
      state.isSaving = false;
      state.saveSuccess = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(saveLocationToProfile.pending, (state) => {
        state.isSaving = true;
        state.error = null;
        state.saveSuccess = false;
      })
      .addCase(saveLocationToProfile.fulfilled, (state) => {
        state.isSaving = false;
        state.saveSuccess = true;
        state.error = null;
      })
      .addCase(saveLocationToProfile.rejected, (state, action) => {
        state.isSaving = false;
        state.saveSuccess = false;
        state.error = action.payload;
      });
  },
});

export const {
  setUserLocation,
  setSelectedLocation,
  clearSelectedLocation,
  setLoading,
  setError,
  resetState,
} = mapSelectionSlice.actions;

export default mapSelectionSlice.reducer;
