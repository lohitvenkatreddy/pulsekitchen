import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import addressService from '../../services/addressService';

/**
 * Address Interface
 * @typedef {Object} Address
 * @property {string} id - Unique address identifier
 * @property {string} user_id - User ID who owns this address
 * @property {string} label - User-defined label (e.g., "Home", "Work")
 * @property {string} street_address_1 - Primary street address
 * @property {string} [street_address_2] - Secondary street address (optional)
 * @property {string} city - City name
 * @property {string} region_state - Region or state
 * @property {string} postal_code - Postal/ZIP code
 * @property {string} country - Country name
 * @property {boolean} is_default - Whether this is the default address
 * @property {string} created_at - ISO8601 timestamp of creation
 * @property {string} updated_at - ISO8601 timestamp of last update
 */

const initialState = {
  addresses: [],
  default_address_id: null,
  loading: false,
  error: null,
  cache_timestamp: null,
};

/**
 * Map frontend form fields to backend API fields
 * Frontend uses: street_address_1, street_address_2, region_state
 * Backend expects: line1, line2, region
 */
const toBackendFields = (addressData) => ({
  label: addressData.label,
  line1: addressData.street_address_1 || addressData.line1,
  line2: addressData.street_address_2 || addressData.line2 || null,
  city: addressData.city || null,
  region: addressData.region_state || addressData.region || null,
  postal_code: addressData.postal_code || null,
  country: addressData.country || 'US',
  latitude: addressData.latitude || null,
  longitude: addressData.longitude || null,
  is_default: addressData.is_default || false,
});

const normalizeAddress = (address) => ({
  ...address,
  street_address_1: address.street_address_1 || address.line1 || '',
  street_address_2: address.street_address_2 || address.line2 || '',
  region_state: address.region_state || address.region || '',
});

const normalizeAddressList = (payload) => {
  if (!Array.isArray(payload)) {
    return [];
  }
  return payload.map(normalizeAddress);
};

/**
 * Extract a string error message from a backend error response
 */
const extractErrorMessage = (error, fallback) => {
  const detail = error.response?.data?.detail;
  if (!detail) return fallback;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((e) => e.msg || JSON.stringify(e)).join(', ');
  }
  return fallback;
};

/**
 * Async thunk to fetch all addresses for the current user
 * Validates: Requirements 4.1, 9.3, 19.1
 */
export const fetchAddresses = createAsyncThunk(
  'user_addresses/fetchAddresses',
  async (_, { rejectWithValue }) => {
    try {
      const response = await addressService.getAddresses();
      return {
        addresses: normalizeAddressList(response.data),
        cache_timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to fetch addresses'));
    }
  }
);

/**
 * Async thunk to add a new address
 * Validates: Requirements 4.4, 4.5, 9.3
 */
export const addAddress = createAsyncThunk(
  'user_addresses/addAddress',
  async (addressData, { rejectWithValue }) => {
    try {
      const response = await addressService.addAddress(toBackendFields(addressData));
      return normalizeAddress(response.data);
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to add address'));
    }
  }
);

/**
 * Async thunk to update an existing address
 * Validates: Requirements 4.6, 9.3
 */
export const updateAddress = createAsyncThunk(
  'user_addresses/updateAddress',
  async ({ id, ...addressData }, { rejectWithValue }) => {
    try {
      const response = await addressService.updateAddress(id, toBackendFields(addressData));
      return normalizeAddress(response.data);
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to update address'));
    }
  }
);

/**
 * Async thunk to delete an address
 * Validates: Requirements 4.7, 9.3
 */
export const deleteAddress = createAsyncThunk(
  'user_addresses/deleteAddress',
  async (id, { rejectWithValue }) => {
    try {
      await addressService.deleteAddress(id);
      return id;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to delete address'));
    }
  }
);

/**
 * Async thunk to set an address as default
 * Validates: Requirements 4.8, 9.3
 * Property 2: Address List Consistency - ensures exactly one default address
 */
export const setDefaultAddress = createAsyncThunk(
  'user_addresses/setDefaultAddress',
  async (id, { rejectWithValue }) => {
    try {
      const response = await addressService.setDefaultAddress(id);
      return normalizeAddress(response.data);
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to set default address'));
    }
  }
);

const userAddressesSlice = createSlice({
  name: 'user_addresses',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearAddresses: (state) => {
      state.addresses = [];
      state.default_address_id = null;
      state.cache_timestamp = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch addresses
    builder
      .addCase(fetchAddresses.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAddresses.fulfilled, (state, action) => {
        state.loading = false;
        state.addresses = action.payload.addresses;
        state.cache_timestamp = action.payload.cache_timestamp;
        // Find and set the default address ID
        const defaultAddr = action.payload.addresses.find((addr) => addr.is_default);
        state.default_address_id = defaultAddr?.id || null;
      })
      .addCase(fetchAddresses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Add address
    builder
      .addCase(addAddress.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addAddress.fulfilled, (state, action) => {
        state.loading = false;
        state.addresses.push(action.payload);
        // If this is the first address or marked as default, set it as default
        if (state.addresses.length === 1 || action.payload.is_default) {
          state.default_address_id = action.payload.id;
        }
      })
      .addCase(addAddress.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Update address
    builder
      .addCase(updateAddress.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateAddress.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.addresses.findIndex((addr) => addr.id === action.payload.id);
        if (index !== -1) {
          state.addresses[index] = action.payload;
        }
      })
      .addCase(updateAddress.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Delete address
    builder
      .addCase(deleteAddress.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteAddress.fulfilled, (state, action) => {
        state.loading = false;
        const deletedId = action.payload;
        state.addresses = state.addresses.filter((addr) => addr.id !== deletedId);
        // If deleted address was default, set another as default
        if (state.default_address_id === deletedId) {
          const newDefault = state.addresses.find((addr) => addr.is_default);
          state.default_address_id = newDefault?.id || (state.addresses.length > 0 ? state.addresses[0].id : null);
        }
      })
      .addCase(deleteAddress.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Set default address
    builder
      .addCase(setDefaultAddress.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(setDefaultAddress.fulfilled, (state, action) => {
        state.loading = false;
        // Update all addresses to reflect new default status
        state.addresses = state.addresses.map((addr) => ({
          ...addr,
          is_default: addr.id === action.payload.id,
        }));
        state.default_address_id = action.payload.id;
      })
      .addCase(setDefaultAddress.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, clearAddresses } = userAddressesSlice.actions;
export default userAddressesSlice.reducer;
