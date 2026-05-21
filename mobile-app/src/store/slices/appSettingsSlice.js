import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import settingsService from '../../services/settingsService';

/**
 * AppSettings Interface
 * @typedef {Object} AppSettings
 * @property {string} user_id - User ID who owns these settings
 * @property {Object} notifications - Notification preferences
 * @property {boolean} notifications.push_enabled - Push notifications enabled
 * @property {boolean} notifications.sms_enabled - SMS notifications enabled
 * @property {boolean} notifications.email_enabled - Email notifications enabled
 * @property {Object} privacy - Privacy preferences
 * @property {boolean} privacy.share_location - Share location data
 * @property {boolean} privacy.share_analytics - Share usage analytics
 * @property {boolean} privacy.marketing_communications - Receive marketing communications
 * @property {string} language - Preferred language (en, es, fr, zh)
 * @property {string} updated_at - ISO8601 timestamp of last update
 */

const initialState = {
  notifications: {
    push_enabled: true,
    sms_enabled: true,
    email_enabled: true,
  },
  privacy: {
    share_location: false,
    share_analytics: false,
    marketing_communications: false,
  },
  language: 'en',
  loading: false,
  error: null,
  cache_timestamp: null,
};

/**
 * Async thunk to fetch app settings for the current user
 * Validates: Requirements 7.1, 9.5, 19.1
 */
export const fetchSettings = createAsyncThunk(
  'app_settings/fetchSettings',
  async (_, { rejectWithValue, getState }) => {
    try {
      const userId = getState().auth.user?.id;
      if (!userId) {
        return rejectWithValue('User not authenticated');
      }
      const response = await settingsService.getSettings(userId);
      return {
        settings: response.data,
        cache_timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch settings');
    }
  }
);

/**
 * Async thunk to update notification preferences
 * Validates: Requirements 7.2, 7.3, 17.1, 17.2, 17.3, 17.4, 17.5
 * Property 7: Notification Preference Consistency - ensures preferences persist correctly
 */
export const updateNotifications = createAsyncThunk(
  'app_settings/updateNotifications',
  async (notificationPrefs, { rejectWithValue, getState }) => {
    try {
      const userId = getState().auth.user?.id;
      if (!userId) {
        return rejectWithValue('User not authenticated');
      }
      const response = await settingsService.updateNotifications(userId, notificationPrefs);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to update notification preferences');
    }
  }
);

/**
 * Async thunk to update privacy preferences
 * Validates: Requirements 7.4, 7.5, 9.5
 */
export const updatePrivacy = createAsyncThunk(
  'app_settings/updatePrivacy',
  async (privacyPrefs, { rejectWithValue, getState }) => {
    try {
      const userId = getState().auth.user?.id;
      if (!userId) {
        return rejectWithValue('User not authenticated');
      }
      const response = await settingsService.updatePrivacy(userId, privacyPrefs);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to update privacy preferences');
    }
  }
);

/**
 * Async thunk to update language preference
 * Validates: Requirements 7.6, 18.1, 18.2, 18.3, 18.4, 18.5
 */
export const updateLanguage = createAsyncThunk(
  'app_settings/updateLanguage',
  async (language, { rejectWithValue, getState }) => {
    try {
      const userId = getState().auth.user?.id;
      if (!userId) {
        return rejectWithValue('User not authenticated');
      }
      const response = await settingsService.updateLanguage(userId, language);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to update language preference');
    }
  }
);

const appSettingsSlice = createSlice({
  name: 'app_settings',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    resetSettings: (state) => {
      state.notifications = initialState.notifications;
      state.privacy = initialState.privacy;
      state.language = initialState.language;
      state.cache_timestamp = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch settings
    builder
      .addCase(fetchSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSettings.fulfilled, (state, action) => {
        state.loading = false;
        const settings = action.payload.settings;
        state.notifications = settings.notifications || initialState.notifications;
        state.privacy = settings.privacy || initialState.privacy;
        state.language = settings.language || initialState.language;
        state.cache_timestamp = action.payload.cache_timestamp;
      })
      .addCase(fetchSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Update notifications
    builder
      .addCase(updateNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.notifications = action.payload.notifications || state.notifications;
      })
      .addCase(updateNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Update privacy
    builder
      .addCase(updatePrivacy.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updatePrivacy.fulfilled, (state, action) => {
        state.loading = false;
        state.privacy = action.payload.privacy || state.privacy;
      })
      .addCase(updatePrivacy.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Update language
    builder
      .addCase(updateLanguage.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateLanguage.fulfilled, (state, action) => {
        state.loading = false;
        state.language = action.payload.language || state.language;
      })
      .addCase(updateLanguage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, resetSettings } = appSettingsSlice.actions;
export default appSettingsSlice.reducer;
