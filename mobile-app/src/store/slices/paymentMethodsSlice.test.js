// Mock the service before importing the slice
jest.mock('../../services/paymentService', () => ({
  default: {
    getPaymentMethods: jest.fn(),
    addPaymentMethod: jest.fn(),
    deletePaymentMethod: jest.fn(),
    setDefaultPaymentMethod: jest.fn(),
  },
}));

import paymentMethodsReducer, {
  fetchPaymentMethods,
  addPaymentMethod,
  deletePaymentMethod,
  setDefaultPaymentMethod,
  clearError,
  clearPaymentMethods,
} from './paymentMethodsSlice';

/**
 * Payment Methods Slice Tests
 * Validates: Requirements 5.1, 9.4, 15.1
 * Properties: 3 (Payment Method Default Consistency), 14 (Payment Method Expiration Validation)
 */

describe('paymentMethodsSlice', () => {
  const initialState = {
    payment_methods: [],
    default_payment_id: null,
    loading: false,
    error: null,
    cache_timestamp: null,
  };

  const mockPaymentMethod = {
    id: '1',
    user_id: 'user123',
    card_token: 'tok_visa_1234',
    card_brand: 'visa',
    last_four_digits: '4242',
    expiration_date: '12/25',
    is_default: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  const mockPaymentMethod2 = {
    id: '2',
    user_id: 'user123',
    card_token: 'tok_mastercard_5678',
    card_brand: 'mastercard',
    last_four_digits: '5555',
    expiration_date: '06/26',
    is_default: false,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  };

  describe('Initial State', () => {
    it('should return the initial state', () => {
      expect(paymentMethodsReducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });
  });

  describe('Reducers', () => {
    it('should handle clearError', () => {
      const state = {
        ...initialState,
        error: 'Some error',
      };
      const result = paymentMethodsReducer(state, clearError());
      expect(result.error).toBeNull();
    });

    it('should handle clearPaymentMethods', () => {
      const state = {
        payment_methods: [mockPaymentMethod],
        default_payment_id: '1',
        loading: false,
        error: null,
        cache_timestamp: '2024-01-01T00:00:00Z',
      };
      const result = paymentMethodsReducer(state, clearPaymentMethods());
      expect(result).toEqual(initialState);
    });
  });

  describe('Async Thunks - fetchPaymentMethods', () => {
    it('should handle fetchPaymentMethods.pending', () => {
      const action = { type: fetchPaymentMethods.pending.type };
      const result = paymentMethodsReducer(initialState, action);
      expect(result.loading).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should handle fetchPaymentMethods.fulfilled', () => {
      const payload = {
        payment_methods: [mockPaymentMethod, mockPaymentMethod2],
        cache_timestamp: '2024-01-01T00:00:00Z',
      };
      const action = {
        type: fetchPaymentMethods.fulfilled.type,
        payload,
      };
      const result = paymentMethodsReducer(initialState, action);
      expect(result.loading).toBe(false);
      expect(result.payment_methods).toEqual(payload.payment_methods);
      expect(result.cache_timestamp).toBe(payload.cache_timestamp);
      expect(result.default_payment_id).toBe('1');
    });

    it('should handle fetchPaymentMethods.rejected', () => {
      const error = 'Failed to fetch payment methods';
      const action = {
        type: fetchPaymentMethods.rejected.type,
        payload: error,
      };
      const result = paymentMethodsReducer(initialState, action);
      expect(result.loading).toBe(false);
      expect(result.error).toBe(error);
    });
  });

  describe('Async Thunks - addPaymentMethod', () => {
    it('should handle addPaymentMethod.pending', () => {
      const action = { type: addPaymentMethod.pending.type };
      const result = paymentMethodsReducer(initialState, action);
      expect(result.loading).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should handle addPaymentMethod.fulfilled', () => {
      const action = {
        type: addPaymentMethod.fulfilled.type,
        payload: mockPaymentMethod,
      };
      const result = paymentMethodsReducer(initialState, action);
      expect(result.loading).toBe(false);
      expect(result.payment_methods).toContainEqual(mockPaymentMethod);
      expect(result.default_payment_id).toBe('1');
    });

    it('should handle addPaymentMethod.rejected', () => {
      const error = 'Failed to add payment method';
      const action = {
        type: addPaymentMethod.rejected.type,
        payload: error,
      };
      const result = paymentMethodsReducer(initialState, action);
      expect(result.loading).toBe(false);
      expect(result.error).toBe(error);
    });
  });

  describe('Async Thunks - deletePaymentMethod', () => {
    it('should handle deletePaymentMethod.pending', () => {
      const action = { type: deletePaymentMethod.pending.type };
      const result = paymentMethodsReducer(initialState, action);
      expect(result.loading).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should handle deletePaymentMethod.fulfilled', () => {
      const state = {
        payment_methods: [mockPaymentMethod, mockPaymentMethod2],
        default_payment_id: '1',
        loading: false,
        error: null,
        cache_timestamp: '2024-01-01T00:00:00Z',
      };
      const action = {
        type: deletePaymentMethod.fulfilled.type,
        payload: '1',
      };
      const result = paymentMethodsReducer(state, action);
      expect(result.loading).toBe(false);
      expect(result.payment_methods).toHaveLength(1);
      expect(result.payment_methods[0].id).toBe('2');
    });

    it('should handle deletePaymentMethod.rejected', () => {
      const error = 'Failed to delete payment method';
      const action = {
        type: deletePaymentMethod.rejected.type,
        payload: error,
      };
      const result = paymentMethodsReducer(initialState, action);
      expect(result.loading).toBe(false);
      expect(result.error).toBe(error);
    });
  });

  describe('Async Thunks - setDefaultPaymentMethod', () => {
    it('should handle setDefaultPaymentMethod.pending', () => {
      const action = { type: setDefaultPaymentMethod.pending.type };
      const result = paymentMethodsReducer(initialState, action);
      expect(result.loading).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should handle setDefaultPaymentMethod.fulfilled', () => {
      const state = {
        payment_methods: [mockPaymentMethod, mockPaymentMethod2],
        default_payment_id: '1',
        loading: false,
        error: null,
        cache_timestamp: '2024-01-01T00:00:00Z',
      };
      const updatedPaymentMethod2 = {
        ...mockPaymentMethod2,
        is_default: true,
      };
      const action = {
        type: setDefaultPaymentMethod.fulfilled.type,
        payload: updatedPaymentMethod2,
      };
      const result = paymentMethodsReducer(state, action);
      expect(result.loading).toBe(false);
      expect(result.default_payment_id).toBe('2');
      // Verify exactly one payment method is default (Property 3)
      const defaultCount = result.payment_methods.filter((pm) => pm.is_default).length;
      expect(defaultCount).toBe(1);
    });

    it('should handle setDefaultPaymentMethod.rejected', () => {
      const error = 'Failed to set default payment method';
      const action = {
        type: setDefaultPaymentMethod.rejected.type,
        payload: error,
      };
      const result = paymentMethodsReducer(initialState, action);
      expect(result.loading).toBe(false);
      expect(result.error).toBe(error);
    });
  });

  describe('Property 3: Payment Method Default Consistency', () => {
    it('should ensure exactly one payment method is default after setDefaultPaymentMethod', () => {
      const state = {
        payment_methods: [mockPaymentMethod, mockPaymentMethod2],
        default_payment_id: '1',
        loading: false,
        error: null,
        cache_timestamp: '2024-01-01T00:00:00Z',
      };
      const updatedPaymentMethod2 = {
        ...mockPaymentMethod2,
        is_default: true,
      };
      const action = {
        type: setDefaultPaymentMethod.fulfilled.type,
        payload: updatedPaymentMethod2,
      };
      const result = paymentMethodsReducer(state, action);
      
      const defaultPayments = result.payment_methods.filter((pm) => pm.is_default);
      expect(defaultPayments).toHaveLength(1);
      expect(defaultPayments[0].id).toBe('2');
    });

    it('should maintain exactly one default payment method when deleting non-default', () => {
      const state = {
        payment_methods: [mockPaymentMethod, mockPaymentMethod2],
        default_payment_id: '1',
        loading: false,
        error: null,
        cache_timestamp: '2024-01-01T00:00:00Z',
      };
      const action = {
        type: deletePaymentMethod.fulfilled.type,
        payload: '2',
      };
      const result = paymentMethodsReducer(state, action);
      
      const defaultPayments = result.payment_methods.filter((pm) => pm.is_default);
      expect(defaultPayments).toHaveLength(1);
      expect(defaultPayments[0].id).toBe('1');
    });
  });

  describe('Property 14: Payment Method Expiration Validation', () => {
    it('should store payment methods with valid expiration dates', () => {
      const action = {
        type: addPaymentMethod.fulfilled.type,
        payload: mockPaymentMethod,
      };
      const result = paymentMethodsReducer(initialState, action);
      
      expect(result.payment_methods[0].expiration_date).toBe('12/25');
      // Expiration date should be in MM/YY format
      expect(result.payment_methods[0].expiration_date).toMatch(/^\d{2}\/\d{2}$/);
    });

    it('should handle multiple payment methods with different expiration dates', () => {
      const state = {
        payment_methods: [mockPaymentMethod],
        default_payment_id: '1',
        loading: false,
        error: null,
        cache_timestamp: '2024-01-01T00:00:00Z',
      };
      const action = {
        type: addPaymentMethod.fulfilled.type,
        payload: mockPaymentMethod2,
      };
      const result = paymentMethodsReducer(state, action);
      
      expect(result.payment_methods).toHaveLength(2);
      result.payment_methods.forEach((pm) => {
        expect(pm.expiration_date).toMatch(/^\d{2}\/\d{2}$/);
      });
    });
  });
});
