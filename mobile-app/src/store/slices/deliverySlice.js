import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import deliveryService from '../../services/deliveryService';

const initialState = {
  currentLocation: null,
  trackingOrder: null,
  deliveryStatus: null,
  eta: null,
  etaPayload: null,
  loading: false,
  error: null,
};

const STATUS_RANK = {
  pending: 0,
  confirmed: 1,
  preparing: 2,
  ready_for_pickup: 3,
  out_for_delivery: 4,
  delivered: 5,
  cancelled: 6,
};

const latestStatus = (currentStatus, nextStatus) => {
  const current = String(currentStatus || '').toLowerCase();
  const next = String(nextStatus || '').toLowerCase();
  return (STATUS_RANK[current] ?? -1) > (STATUS_RANK[next] ?? -1) ? current : next;
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
      state.etaPayload = null;
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
        const previousStatus = state.trackingOrder?.id === p.order_id ? state.trackingOrder?.status : null;
        const displayStatus = latestStatus(previousStatus, p.status);
        // API returns flat shape: order_id, status, eta_minutes, …
        state.trackingOrder = p.order ?? {
          id: p.order_id,
          status: displayStatus,
          order_type: p.order_type,
          priority_level: p.priority_level,
          priority_score: p.priority_score,
        };
        state.trackingOrder.status = latestStatus(state.trackingOrder.status, displayStatus);
        state.deliveryStatus = state.trackingOrder.status;
        state.eta = p.eta_minutes ?? p.eta;
        state.etaPayload = { ...p, status: state.trackingOrder.status };
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
