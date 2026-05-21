import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import paymentService from '../../services/paymentService';

/**
 * PaymentMethod Interface
 * @typedef {Object} PaymentMethod
 * @property {string} id - Unique payment method identifier
 * @property {string} user_id - User ID who owns this payment method
 * @property {string} card_token - Tokenized card (never full card number)
 * @property {string} card_brand - Card brand (visa, mastercard, amex, etc.)
 * @property {string} last_four_digits - Last 4 digits of card
 * @property {string} expiration_date - Expiration date in MM/YY format
 * @property {boolean} is_default - Whether this is the default payment method
 * @property {string} created_at - ISO8601 timestamp of creation
 * @property {string} updated_at - ISO8601 timestamp of last update
 */

const initialState = {
  payment_methods: [],
  default_payment_id: null,
  loading: false,
  error: null,
  cache_timestamp: null,
};

/**
 * Async thunk to fetch all payment methods for the current user
 * Validates: Requirements 5.1, 9.4, 19.1
 */
export const fetchPaymentMethods = createAsyncThunk(
  'payment_methods/fetchPaymentMethods',
  async (_, { rejectWithValue, getState }) => {
    try {
      const userId = getState().auth.user?.id;
      if (!userId) {
        return rejectWithValue('User not authenticated');
      }
      const response = await paymentService.getPaymentMethods(userId);
      return {
        payment_methods: response.data,
        cache_timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch payment methods');
    }
  }
);

/**
 * Async thunk to add a new payment method
 * Validates: Requirements 5.4, 5.5, 5.6, 9.4, 15.1
 * Property 6: Payment Token Idempotence - ensures same card returns same token
 */
export const addPaymentMethod = createAsyncThunk(
  'payment_methods/addPaymentMethod',
  async (cardData, { rejectWithValue }) => {
    try {
      const response = await paymentService.addPaymentMethod(cardData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to add payment method');
    }
  }
);

/**
 * Async thunk to delete a payment method
 * Validates: Requirements 5.7, 9.4
 */
export const deletePaymentMethod = createAsyncThunk(
  'payment_methods/deletePaymentMethod',
  async (id, { rejectWithValue }) => {
    try {
      await paymentService.deletePaymentMethod(id);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to delete payment method');
    }
  }
);

/**
 * Async thunk to set a payment method as default
 * Validates: Requirements 5.8, 9.4
 * Property 3: Payment Method Default Consistency - ensures exactly one default payment method
 */
export const setDefaultPaymentMethod = createAsyncThunk(
  'payment_methods/setDefaultPaymentMethod',
  async (id, { rejectWithValue }) => {
    try {
      const response = await paymentService.setDefaultPaymentMethod(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to set default payment method');
    }
  }
);

const paymentMethodsSlice = createSlice({
  name: 'payment_methods',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearPaymentMethods: (state) => {
      state.payment_methods = [];
      state.default_payment_id = null;
      state.cache_timestamp = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch payment methods
    builder
      .addCase(fetchPaymentMethods.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPaymentMethods.fulfilled, (state, action) => {
        state.loading = false;
        state.payment_methods = action.payload.payment_methods;
        state.cache_timestamp = action.payload.cache_timestamp;
        // Find and set the default payment method ID
        const defaultPayment = action.payload.payment_methods.find((pm) => pm.is_default);
        state.default_payment_id = defaultPayment?.id || null;
      })
      .addCase(fetchPaymentMethods.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Add payment method
    builder
      .addCase(addPaymentMethod.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addPaymentMethod.fulfilled, (state, action) => {
        state.loading = false;
        state.payment_methods.push(action.payload);
        // If this is the first payment method or marked as default, set it as default
        if (state.payment_methods.length === 1 || action.payload.is_default) {
          state.default_payment_id = action.payload.id;
        }
      })
      .addCase(addPaymentMethod.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Delete payment method
    builder
      .addCase(deletePaymentMethod.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deletePaymentMethod.fulfilled, (state, action) => {
        state.loading = false;
        const deletedId = action.payload;
        state.payment_methods = state.payment_methods.filter((pm) => pm.id !== deletedId);
        // If deleted payment method was default, set another as default
        if (state.default_payment_id === deletedId) {
          const newDefault = state.payment_methods.find((pm) => pm.is_default);
          state.default_payment_id = newDefault?.id || (state.payment_methods.length > 0 ? state.payment_methods[0].id : null);
        }
      })
      .addCase(deletePaymentMethod.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Set default payment method
    builder
      .addCase(setDefaultPaymentMethod.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(setDefaultPaymentMethod.fulfilled, (state, action) => {
        state.loading = false;
        // Update all payment methods to reflect new default status
        state.payment_methods = state.payment_methods.map((pm) => ({
          ...pm,
          is_default: pm.id === action.payload.id,
        }));
        state.default_payment_id = action.payload.id;
      })
      .addCase(setDefaultPaymentMethod.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, clearPaymentMethods } = paymentMethodsSlice.actions;
export default paymentMethodsSlice.reducer;
