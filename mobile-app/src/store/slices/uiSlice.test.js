import uiReducer, {
  setScreenLoading,
  setScreenError,
  setScreenOfflineStatus,
  setGlobalOfflineStatus,
  clearScreenError,
  resetScreenUI,
  resetAllUI,
} from './uiSlice';

/**
 * UI Slice Tests
 * Validates: Requirements 10.1, 12.1
 */

describe('uiSlice', () => {
  const initialState = {
    screens: {
      profile: {
        loading: false,
        error: null,
        offline: false,
      },
      orderHistory: {
        loading: false,
        error: null,
        offline: false,
      },
      savedAddresses: {
        loading: false,
        error: null,
        offline: false,
      },
      paymentMethods: {
        loading: false,
        error: null,
        offline: false,
      },
      helpSupport: {
        loading: false,
        error: null,
        offline: false,
      },
      settings: {
        loading: false,
        error: null,
        offline: false,
      },
    },
    global: {
      offline: false,
    },
  };

  describe('Initial State', () => {
    it('should return the initial state', () => {
      expect(uiReducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    it('should have all required screens initialized', () => {
      const state = uiReducer(undefined, { type: 'unknown' });
      expect(state.screens).toHaveProperty('profile');
      expect(state.screens).toHaveProperty('orderHistory');
      expect(state.screens).toHaveProperty('savedAddresses');
      expect(state.screens).toHaveProperty('paymentMethods');
      expect(state.screens).toHaveProperty('helpSupport');
      expect(state.screens).toHaveProperty('settings');
    });

    it('should have all screens with correct initial state', () => {
      const state = uiReducer(undefined, { type: 'unknown' });
      Object.values(state.screens).forEach((screenState) => {
        expect(screenState).toEqual({
          loading: false,
          error: null,
          offline: false,
        });
      });
    });
  });

  describe('setScreenLoading', () => {
    it('should set loading state for a specific screen', () => {
      const action = setScreenLoading({ screenName: 'profile', isLoading: true });
      const result = uiReducer(initialState, action);
      expect(result.screens.profile.loading).toBe(true);
      expect(result.screens.orderHistory.loading).toBe(false);
    });

    it('should toggle loading state', () => {
      let state = initialState;
      state = uiReducer(state, setScreenLoading({ screenName: 'profile', isLoading: true }));
      expect(state.screens.profile.loading).toBe(true);
      
      state = uiReducer(state, setScreenLoading({ screenName: 'profile', isLoading: false }));
      expect(state.screens.profile.loading).toBe(false);
    });

    it('should handle multiple screens independently', () => {
      let state = initialState;
      state = uiReducer(state, setScreenLoading({ screenName: 'profile', isLoading: true }));
      state = uiReducer(state, setScreenLoading({ screenName: 'orderHistory', isLoading: true }));
      
      expect(state.screens.profile.loading).toBe(true);
      expect(state.screens.orderHistory.loading).toBe(true);
      expect(state.screens.savedAddresses.loading).toBe(false);
    });
  });

  describe('setScreenError', () => {
    it('should set error state for a specific screen', () => {
      const action = setScreenError({ screenName: 'profile', error: 'Failed to load' });
      const result = uiReducer(initialState, action);
      expect(result.screens.profile.error).toBe('Failed to load');
      expect(result.screens.orderHistory.error).toBeNull();
    });

    it('should clear error by setting to null', () => {
      let state = initialState;
      state = uiReducer(state, setScreenError({ screenName: 'profile', error: 'Some error' }));
      expect(state.screens.profile.error).toBe('Some error');
      
      state = uiReducer(state, setScreenError({ screenName: 'profile', error: null }));
      expect(state.screens.profile.error).toBeNull();
    });

    it('should handle multiple screens independently', () => {
      let state = initialState;
      state = uiReducer(state, setScreenError({ screenName: 'profile', error: 'Error 1' }));
      state = uiReducer(state, setScreenError({ screenName: 'orderHistory', error: 'Error 2' }));
      
      expect(state.screens.profile.error).toBe('Error 1');
      expect(state.screens.orderHistory.error).toBe('Error 2');
      expect(state.screens.savedAddresses.error).toBeNull();
    });
  });

  describe('setScreenOfflineStatus', () => {
    it('should set offline status for a specific screen', () => {
      const action = setScreenOfflineStatus({ screenName: 'profile', isOffline: true });
      const result = uiReducer(initialState, action);
      expect(result.screens.profile.offline).toBe(true);
      expect(result.screens.orderHistory.offline).toBe(false);
    });

    it('should toggle offline status', () => {
      let state = initialState;
      state = uiReducer(state, setScreenOfflineStatus({ screenName: 'profile', isOffline: true }));
      expect(state.screens.profile.offline).toBe(true);
      
      state = uiReducer(state, setScreenOfflineStatus({ screenName: 'profile', isOffline: false }));
      expect(state.screens.profile.offline).toBe(false);
    });
  });

  describe('setGlobalOfflineStatus', () => {
    it('should set global offline status and update all screens', () => {
      const action = setGlobalOfflineStatus(true);
      const result = uiReducer(initialState, action);
      
      expect(result.global.offline).toBe(true);
      Object.values(result.screens).forEach((screenState) => {
        expect(screenState.offline).toBe(true);
      });
    });

    it('should restore online status for all screens', () => {
      let state = initialState;
      state = uiReducer(state, setGlobalOfflineStatus(true));
      expect(state.global.offline).toBe(true);
      
      state = uiReducer(state, setGlobalOfflineStatus(false));
      expect(state.global.offline).toBe(false);
      Object.values(state.screens).forEach((screenState) => {
        expect(screenState.offline).toBe(false);
      });
    });
  });

  describe('clearScreenError', () => {
    it('should clear error for a specific screen', () => {
      let state = initialState;
      state = uiReducer(state, setScreenError({ screenName: 'profile', error: 'Some error' }));
      expect(state.screens.profile.error).toBe('Some error');
      
      state = uiReducer(state, clearScreenError('profile'));
      expect(state.screens.profile.error).toBeNull();
    });

    it('should not affect other screens', () => {
      let state = initialState;
      state = uiReducer(state, setScreenError({ screenName: 'profile', error: 'Error 1' }));
      state = uiReducer(state, setScreenError({ screenName: 'orderHistory', error: 'Error 2' }));
      
      state = uiReducer(state, clearScreenError('profile'));
      expect(state.screens.profile.error).toBeNull();
      expect(state.screens.orderHistory.error).toBe('Error 2');
    });
  });

  describe('resetScreenUI', () => {
    it('should reset UI state for a specific screen', () => {
      let state = initialState;
      state = uiReducer(state, setScreenLoading({ screenName: 'profile', isLoading: true }));
      state = uiReducer(state, setScreenError({ screenName: 'profile', error: 'Some error' }));
      
      state = uiReducer(state, resetScreenUI('profile'));
      expect(state.screens.profile).toEqual({
        loading: false,
        error: null,
        offline: false,
      });
    });

    it('should not affect other screens', () => {
      let state = initialState;
      state = uiReducer(state, setScreenLoading({ screenName: 'profile', isLoading: true }));
      state = uiReducer(state, setScreenLoading({ screenName: 'orderHistory', isLoading: true }));
      
      state = uiReducer(state, resetScreenUI('profile'));
      expect(state.screens.profile.loading).toBe(false);
      expect(state.screens.orderHistory.loading).toBe(true);
    });

    it('should preserve global offline status when resetting screen', () => {
      let state = initialState;
      state = uiReducer(state, setGlobalOfflineStatus(true));
      state = uiReducer(state, setScreenLoading({ screenName: 'profile', isLoading: true }));
      
      state = uiReducer(state, resetScreenUI('profile'));
      expect(state.screens.profile.offline).toBe(true);
      expect(state.global.offline).toBe(true);
    });
  });

  describe('resetAllUI', () => {
    it('should reset UI state for all screens', () => {
      let state = initialState;
      state = uiReducer(state, setScreenLoading({ screenName: 'profile', isLoading: true }));
      state = uiReducer(state, setScreenLoading({ screenName: 'orderHistory', isLoading: true }));
      state = uiReducer(state, setScreenError({ screenName: 'savedAddresses', error: 'Error' }));
      
      state = uiReducer(state, resetAllUI());
      Object.values(state.screens).forEach((screenState) => {
        expect(screenState.loading).toBe(false);
        expect(screenState.error).toBeNull();
      });
    });

    it('should preserve global offline status when resetting all', () => {
      let state = initialState;
      state = uiReducer(state, setGlobalOfflineStatus(true));
      state = uiReducer(state, setScreenLoading({ screenName: 'profile', isLoading: true }));
      
      state = uiReducer(state, resetAllUI());
      expect(state.global.offline).toBe(true);
      Object.values(state.screens).forEach((screenState) => {
        expect(screenState.offline).toBe(true);
      });
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle loading and error states simultaneously', () => {
      let state = initialState;
      state = uiReducer(state, setScreenLoading({ screenName: 'profile', isLoading: true }));
      state = uiReducer(state, setScreenError({ screenName: 'profile', error: 'Network error' }));
      
      expect(state.screens.profile.loading).toBe(true);
      expect(state.screens.profile.error).toBe('Network error');
    });

    it('should handle offline status with loading and error', () => {
      let state = initialState;
      state = uiReducer(state, setGlobalOfflineStatus(true));
      state = uiReducer(state, setScreenLoading({ screenName: 'profile', isLoading: true }));
      state = uiReducer(state, setScreenError({ screenName: 'profile', error: 'Offline' }));
      
      expect(state.screens.profile.offline).toBe(true);
      expect(state.screens.profile.loading).toBe(true);
      expect(state.screens.profile.error).toBe('Offline');
    });

    it('should handle multiple screens with different states', () => {
      let state = initialState;
      state = uiReducer(state, setScreenLoading({ screenName: 'profile', isLoading: true }));
      state = uiReducer(state, setScreenError({ screenName: 'orderHistory', error: 'Error' }));
      state = uiReducer(state, setScreenOfflineStatus({ screenName: 'savedAddresses', isOffline: true }));
      
      expect(state.screens.profile.loading).toBe(true);
      expect(state.screens.orderHistory.error).toBe('Error');
      expect(state.screens.savedAddresses.offline).toBe(true);
    });
  });
});
