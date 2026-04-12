import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import deliveryService from '../../services/deliveryService';

const initialState = {
  currentLocation: null,
  trackingOrder: null,
  deliveryStatus: null,
  eta: null,
  loading: false,
  error: null,
};

export const startTracking = createAsyncThunk(
  'delivery/startTracking',
  async (orderId, { rejectWithValue }) => {
    try {
      const response = await deliveryService.startTracking(orderId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to start tracking');
    }
  }
);

export const updateLocation = createAsyncThunk(
  'delivery/updateLocation',
  async (location, { rejectWithValue }) => {
    try {
      const response = await deliveryService.updateLocation(location);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to update location');
    }
  }
);

const deliverySlice = createSlice({
  name: 'delivery',
  initialState,
  reducers: {
    setLocation: (state, action) => {
      state.currentLocation = action.payload;
    },
    stopTracking: (state) => {
      state.trackingOrder = null;
      state.deliveryStatus = null;
      state.eta = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(startTracking.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(startTracking.fulfilled, (state, action) => {
        state.loading = false;
        const p = action.payload;
        // API returns flat shape: order_id, status, eta_minutes, …
        state.trackingOrder = p.order ?? {
          id: p.order_id,
          status: p.status,
          priority_level: p.priority_level,
          priority_score: p.priority_score,
        };
        state.deliveryStatus = p.status;
        state.eta = p.eta_minutes ?? p.eta;
      })
      .addCase(startTracking.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateLocation.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateLocation.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(updateLocation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { setLocation, stopTracking } = deliverySlice.actions;
export default deliverySlice.reducer;
