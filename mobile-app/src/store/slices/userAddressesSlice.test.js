// Mock the service before importing the slice
jest.mock('../../services/addressService', () => ({
  default: {
    getAddresses: jest.fn(),
    addAddress: jest.fn(),
    updateAddress: jest.fn(),
    deleteAddress: jest.fn(),
    setDefaultAddress: jest.fn(),
  },
}));

import userAddressesReducer, {
  fetchAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  clearError,
  clearAddresses,
} from './userAddressesSlice';

/**
 * User Addresses Slice Tests
 * Validates: Requirements 4.1, 9.3, 19.1
 * Properties: 2 (Address List Consistency), 13 (Address Label Uniqueness)
 */

describe('userAddressesSlice', () => {
  const initialState = {
    addresses: [],
    default_address_id: null,
    loading: false,
    error: null,
    cache_timestamp: null,
  };

  const mockAddress = {
    id: '1',
    user_id: 'user123',
    label: 'Home',
    street_address_1: '123 Main St',
    street_address_2: '',
    city: 'Springfield',
    region_state: 'IL',
    postal_code: '62701',
    country: 'USA',
    is_default: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  const mockAddress2 = {
    id: '2',
    user_id: 'user123',
    label: 'Work',
    street_address_1: '456 Oak Ave',
    street_address_2: 'Suite 100',
    city: 'Springfield',
    region_state: 'IL',
    postal_code: '62702',
    country: 'USA',
    is_default: false,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  };

  describe('Initial State', () => {
    it('should return the initial state', () => {
      expect(userAddressesReducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });
  });

  describe('Reducers', () => {
    it('should handle clearError', () => {
      const state = {
        ...initialState,
        error: 'Some error',
      };
      const result = userAddressesReducer(state, clearError());
      expect(result.error).toBeNull();
    });

    it('should handle clearAddresses', () => {
      const state = {
        addresses: [mockAddress],
        default_address_id: '1',
        loading: false,
        error: null,
        cache_timestamp: '2024-01-01T00:00:00Z',
      };
      const result = userAddressesReducer(state, clearAddresses());
      expect(result).toEqual(initialState);
    });
  });

  describe('Async Thunks - fetchAddresses', () => {
    it('should handle fetchAddresses.pending', () => {
      const action = { type: fetchAddresses.pending.type };
      const result = userAddressesReducer(initialState, action);
      expect(result.loading).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should handle fetchAddresses.fulfilled', () => {
      const payload = {
        addresses: [mockAddress, mockAddress2],
        cache_timestamp: '2024-01-01T00:00:00Z',
      };
      const action = {
        type: fetchAddresses.fulfilled.type,
        payload,
      };
      const result = userAddressesReducer(initialState, action);
      expect(result.loading).toBe(false);
      expect(result.addresses).toEqual(payload.addresses);
      expect(result.cache_timestamp).toBe(payload.cache_timestamp);
      expect(result.default_address_id).toBe('1'); // First address is default
    });

    it('should handle fetchAddresses.rejected', () => {
      const error = 'Failed to fetch addresses';
      const action = {
        type: fetchAddresses.rejected.type,
        payload: error,
      };
      const result = userAddressesReducer(initialState, action);
      expect(result.loading).toBe(false);
      expect(result.error).toBe(error);
    });
  });

  describe('Async Thunks - addAddress', () => {
    it('should handle addAddress.pending', () => {
      const action = { type: addAddress.pending.type };
      const result = userAddressesReducer(initialState, action);
      expect(result.loading).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should handle addAddress.fulfilled', () => {
      const action = {
        type: addAddress.fulfilled.type,
        payload: mockAddress,
      };
      const result = userAddressesReducer(initialState, action);
      expect(result.loading).toBe(false);
      expect(result.addresses).toContainEqual(mockAddress);
      expect(result.default_address_id).toBe('1'); // First address becomes default
    });

    it('should handle addAddress.rejected', () => {
      const error = 'Failed to add address';
      const action = {
        type: addAddress.rejected.type,
        payload: error,
      };
      const result = userAddressesReducer(initialState, action);
      expect(result.loading).toBe(false);
      expect(result.error).toBe(error);
    });
  });

  describe('Async Thunks - updateAddress', () => {
    it('should handle updateAddress.pending', () => {
      const action = { type: updateAddress.pending.type };
      const result = userAddressesReducer(initialState, action);
      expect(result.loading).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should handle updateAddress.fulfilled', () => {
      const state = {
        ...initialState,
        addresses: [mockAddress],
      };
      const updatedAddress = {
        ...mockAddress,
        label: 'Home Updated',
      };
      const action = {
        type: updateAddress.fulfilled.type,
        payload: updatedAddress,
      };
      const result = userAddressesReducer(state, action);
      expect(result.loading).toBe(false);
      expect(result.addresses[0].label).toBe('Home Updated');
    });

    it('should handle updateAddress.rejected', () => {
      const error = 'Failed to update address';
      const action = {
        type: updateAddress.rejected.type,
        payload: error,
      };
      const result = userAddressesReducer(initialState, action);
      expect(result.loading).toBe(false);
      expect(result.error).toBe(error);
    });
  });

  describe('Async Thunks - deleteAddress', () => {
    it('should handle deleteAddress.pending', () => {
      const action = { type: deleteAddress.pending.type };
      const result = userAddressesReducer(initialState, action);
      expect(result.loading).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should handle deleteAddress.fulfilled', () => {
      const state = {
        addresses: [mockAddress, mockAddress2],
        default_address_id: '1',
        loading: false,
        error: null,
        cache_timestamp: '2024-01-01T00:00:00Z',
      };
      const action = {
        type: deleteAddress.fulfilled.type,
        payload: '1',
      };
      const result = userAddressesReducer(state, action);
      expect(result.loading).toBe(false);
      expect(result.addresses).toHaveLength(1);
      expect(result.addresses[0].id).toBe('2');
    });

    it('should handle deleteAddress.rejected', () => {
      const error = 'Failed to delete address';
      const action = {
        type: deleteAddress.rejected.type,
        payload: error,
      };
      const result = userAddressesReducer(initialState, action);
      expect(result.loading).toBe(false);
      expect(result.error).toBe(error);
    });
  });

  describe('Async Thunks - setDefaultAddress', () => {
    it('should handle setDefaultAddress.pending', () => {
      const action = { type: setDefaultAddress.pending.type };
      const result = userAddressesReducer(initialState, action);
      expect(result.loading).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should handle setDefaultAddress.fulfilled', () => {
      const state = {
        addresses: [mockAddress, mockAddress2],
        default_address_id: '1',
        loading: false,
        error: null,
        cache_timestamp: '2024-01-01T00:00:00Z',
      };
      const updatedAddress2 = {
        ...mockAddress2,
        is_default: true,
      };
      const action = {
        type: setDefaultAddress.fulfilled.type,
        payload: updatedAddress2,
      };
      const result = userAddressesReducer(state, action);
      expect(result.loading).toBe(false);
      expect(result.default_address_id).toBe('2');
      // Verify exactly one address is default (Property 2: Address List Consistency)
      const defaultCount = result.addresses.filter((addr) => addr.is_default).length;
      expect(defaultCount).toBe(1);
    });

    it('should handle setDefaultAddress.rejected', () => {
      const error = 'Failed to set default address';
      const action = {
        type: setDefaultAddress.rejected.type,
        payload: error,
      };
      const result = userAddressesReducer(initialState, action);
      expect(result.loading).toBe(false);
      expect(result.error).toBe(error);
    });
  });

  describe('Property 2: Address List Consistency', () => {
    it('should ensure exactly one address is default after setDefaultAddress', () => {
      const state = {
        addresses: [mockAddress, mockAddress2],
        default_address_id: '1',
        loading: false,
        error: null,
        cache_timestamp: '2024-01-01T00:00:00Z',
      };
      const updatedAddress2 = {
        ...mockAddress2,
        is_default: true,
      };
      const action = {
        type: setDefaultAddress.fulfilled.type,
        payload: updatedAddress2,
      };
      const result = userAddressesReducer(state, action);
      
      const defaultAddresses = result.addresses.filter((addr) => addr.is_default);
      expect(defaultAddresses).toHaveLength(1);
      expect(defaultAddresses[0].id).toBe('2');
    });

    it('should maintain exactly one default address when deleting non-default address', () => {
      const state = {
        addresses: [mockAddress, mockAddress2],
        default_address_id: '1',
        loading: false,
        error: null,
        cache_timestamp: '2024-01-01T00:00:00Z',
      };
      const action = {
        type: deleteAddress.fulfilled.type,
        payload: '2',
      };
      const result = userAddressesReducer(state, action);
      
      const defaultAddresses = result.addresses.filter((addr) => addr.is_default);
      expect(defaultAddresses).toHaveLength(1);
      expect(defaultAddresses[0].id).toBe('1');
    });
  });
});
