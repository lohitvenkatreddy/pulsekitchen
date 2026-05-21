import { createSlice } from '@reduxjs/toolkit';

/**
 * UI State for Profile Screens
 * Manages loading, error, and offline states across all profile-related screens
 * Validates: Requirements 10.1, 12.1
 */

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

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    /**
     * Set loading state for a specific screen
     * @param {string} screenName - Name of the screen (e.g., 'profile', 'orderHistory')
     * @param {boolean} isLoading - Loading state
     */
    setScreenLoading: (state, action) => {
      const { screenName, isLoading } = action.payload;
      if (state.screens[screenName]) {
        state.screens[screenName].loading = isLoading;
      }
    },

    /**
     * Set error state for a specific screen
     * @param {string} screenName - Name of the screen
     * @param {string|null} error - Error message or null to clear
     */
    setScreenError: (state, action) => {
      const { screenName, error } = action.payload;
      if (state.screens[screenName]) {
        state.screens[screenName].error = error;
      }
    },

    /**
     * Set offline status for a specific screen
     * @param {string} screenName - Name of the screen
     * @param {boolean} isOffline - Offline status
     */
    setScreenOfflineStatus: (state, action) => {
      const { screenName, isOffline } = action.payload;
      if (state.screens[screenName]) {
        state.screens[screenName].offline = isOffline;
      }
    },

    /**
     * Set global offline status
     * @param {boolean} isOffline - Global offline status
     */
    setGlobalOfflineStatus: (state, action) => {
      state.global.offline = action.payload;
      // Update all screens with global offline status
      Object.keys(state.screens).forEach((screenName) => {
        state.screens[screenName].offline = action.payload;
      });
    },

    /**
     * Clear error for a specific screen
     * @param {string} screenName - Name of the screen
     */
    clearScreenError: (state, action) => {
      const screenName = action.payload;
      if (state.screens[screenName]) {
        state.screens[screenName].error = null;
      }
    },

    /**
     * Reset UI state for a specific screen to initial state
     * @param {string} screenName - Name of the screen
     */
    resetScreenUI: (state, action) => {
      const screenName = action.payload;
      if (state.screens[screenName]) {
        state.screens[screenName] = {
          loading: false,
          error: null,
          offline: state.global.offline,
        };
      }
    },

    /**
     * Reset all UI state to initial state
     */
    resetAllUI: (state) => {
      Object.keys(state.screens).forEach((screenName) => {
        state.screens[screenName] = {
          loading: false,
          error: null,
          offline: state.global.offline,
        };
      });
    },
  },
});

export const {
  setScreenLoading,
  setScreenError,
  setScreenOfflineStatus,
  setGlobalOfflineStatus,
  clearScreenError,
  resetScreenUI,
  resetAllUI,
} = uiSlice.actions;

export default uiSlice.reducer;
