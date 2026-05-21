// Mock the service before importing the slice
jest.mock('../../services/settingsService', () => ({
  default: {
    getSettings: jest.fn(),
    updateNotifications: jest.fn(),
    updatePrivacy: jest.fn(),
    updateLanguage: jest.fn(),
    changePassword: jest.fn(),
    deleteAccount: jest.fn(),
  },
}));

import appSettingsReducer, {
  fetchSettings,
  updateNotifications,
  updatePrivacy,
  updateLanguage,
  clearError,
  resetSettings,
} from './appSettingsSlice';

/**
 * App Settings Slice Tests
 * Validates: Requirements 7.1, 9.5, 17.1, 18.1
 * Property: 7 (Notification Preference Consistency)
 */

describe('appSettingsSlice', () => {
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

  const mockSettings = {
    notifications: {
      push_enabled: false,
      sms_enabled: true,
      email_enabled: false,
    },
    privacy: {
      share_location: true,
      share_analytics: false,
      marketing_communications: true,
    },
    language: 'es',
  };

  describe('Initial State', () => {
    it('should return the initial state', () => {
      expect(appSettingsReducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    it('should have default notification preferences enabled', () => {
      const state = appSettingsReducer(undefined, { type: 'unknown' });
      expect(state.notifications.push_enabled).toBe(true);
      expect(state.notifications.sms_enabled).toBe(true);
      expect(state.notifications.email_enabled).toBe(true);
    });

    it('should have default privacy preferences disabled', () => {
      const state = appSettingsReducer(undefined, { type: 'unknown' });
      expect(state.privacy.share_location).toBe(false);
      expect(state.privacy.share_analytics).toBe(false);
      expect(state.privacy.marketing_communications).toBe(false);
    });

    it('should have default language set to English', () => {
      const state = appSettingsReducer(undefined, { type: 'unknown' });
      expect(state.language).toBe('en');
    });
  });

  describe('Reducers', () => {
    it('should handle clearError', () => {
      const state = {
        ...initialState,
        error: 'Some error',
      };
      const result = appSettingsReducer(state, clearError());
      expect(result.error).toBeNull();
    });

    it('should handle resetSettings', () => {
      const state = {
        notifications: mockSettings.notifications,
        privacy: mockSettings.privacy,
        language: 'es',
        loading: false,
        error: null,
        cache_timestamp: '2024-01-01T00:00:00Z',
      };
      const result = appSettingsReducer(state, resetSettings());
      expect(result).toEqual(initialState);
    });
  });

  describe('Async Thunks - fetchSettings', () => {
    it('should handle fetchSettings.pending', () => {
      const action = { type: fetchSettings.pending.type };
      const result = appSettingsReducer(initialState, action);
      expect(result.loading).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should handle fetchSettings.fulfilled', () => {
      const payload = {
        settings: mockSettings,
        cache_timestamp: '2024-01-01T00:00:00Z',
      };
      const action = {
        type: fetchSettings.fulfilled.type,
        payload,
      };
      const result = appSettingsReducer(initialState, action);
      expect(result.loading).toBe(false);
      expect(result.notifications).toEqual(mockSettings.notifications);
      expect(result.privacy).toEqual(mockSettings.privacy);
      expect(result.language).toBe('es');
      expect(result.cache_timestamp).toBe(payload.cache_timestamp);
    });

    it('should handle fetchSettings.rejected', () => {
      const error = 'Failed to fetch settings';
      const action = {
        type: fetchSettings.rejected.type,
        payload: error,
      };
      const result = appSettingsReducer(initialState, action);
      expect(result.loading).toBe(false);
      expect(result.error).toBe(error);
    });
  });

  describe('Async Thunks - updateNotifications', () => {
    it('should handle updateNotifications.pending', () => {
      const action = { type: updateNotifications.pending.type };
      const result = appSettingsReducer(initialState, action);
      expect(result.loading).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should handle updateNotifications.fulfilled', () => {
      const payload = {
        notifications: mockSettings.notifications,
      };
      const action = {
        type: updateNotifications.fulfilled.type,
        payload,
      };
      const result = appSettingsReducer(initialState, action);
      expect(result.loading).toBe(false);
      expect(result.notifications).toEqual(mockSettings.notifications);
    });

    it('should handle updateNotifications.rejected', () => {
      const error = 'Failed to update notifications';
      const action = {
        type: updateNotifications.rejected.type,
        payload: error,
      };
      const result = appSettingsReducer(initialState, action);
      expect(result.loading).toBe(false);
      expect(result.error).toBe(error);
    });
  });

  describe('Async Thunks - updatePrivacy', () => {
    it('should handle updatePrivacy.pending', () => {
      const action = { type: updatePrivacy.pending.type };
      const result = appSettingsReducer(initialState, action);
      expect(result.loading).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should handle updatePrivacy.fulfilled', () => {
      const payload = {
        privacy: mockSettings.privacy,
      };
      const action = {
        type: updatePrivacy.fulfilled.type,
        payload,
      };
      const result = appSettingsReducer(initialState, action);
      expect(result.loading).toBe(false);
      expect(result.privacy).toEqual(mockSettings.privacy);
    });

    it('should handle updatePrivacy.rejected', () => {
      const error = 'Failed to update privacy';
      const action = {
        type: updatePrivacy.rejected.type,
        payload: error,
      };
      const result = appSettingsReducer(initialState, action);
      expect(result.loading).toBe(false);
      expect(result.error).toBe(error);
    });
  });

  describe('Async Thunks - updateLanguage', () => {
    it('should handle updateLanguage.pending', () => {
      const action = { type: updateLanguage.pending.type };
      const result = appSettingsReducer(initialState, action);
      expect(result.loading).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should handle updateLanguage.fulfilled', () => {
      const payload = {
        language: 'fr',
      };
      const action = {
        type: updateLanguage.fulfilled.type,
        payload,
      };
      const result = appSettingsReducer(initialState, action);
      expect(result.loading).toBe(false);
      expect(result.language).toBe('fr');
    });

    it('should handle updateLanguage.rejected', () => {
      const error = 'Failed to update language';
      const action = {
        type: updateLanguage.rejected.type,
        payload: error,
      };
      const result = appSettingsReducer(initialState, action);
      expect(result.loading).toBe(false);
      expect(result.error).toBe(error);
    });
  });

  describe('Property 7: Notification Preference Consistency', () => {
    it('should persist notification preferences after update', () => {
      const state = initialState;
      const newNotifications = {
        push_enabled: false,
        sms_enabled: false,
        email_enabled: true,
      };
      const payload = {
        notifications: newNotifications,
      };
      const action = {
        type: updateNotifications.fulfilled.type,
        payload,
      };
      const result = appSettingsReducer(state, action);
      
      expect(result.notifications).toEqual(newNotifications);
    });

    it('should maintain notification preferences across multiple updates', () => {
      let state = initialState;
      
      // First update
      const firstUpdate = {
        notifications: {
          push_enabled: false,
          sms_enabled: true,
          email_enabled: true,
        },
      };
      state = appSettingsReducer(state, {
        type: updateNotifications.fulfilled.type,
        payload: firstUpdate,
      });
      expect(state.notifications).toEqual(firstUpdate.notifications);
      
      // Second update
      const secondUpdate = {
        notifications: {
          push_enabled: false,
          sms_enabled: false,
          email_enabled: true,
        },
      };
      state = appSettingsReducer(state, {
        type: updateNotifications.fulfilled.type,
        payload: secondUpdate,
      });
      expect(state.notifications).toEqual(secondUpdate.notifications);
    });

    it('should handle toggling individual notification preferences', () => {
      let state = initialState;
      
      // Toggle push notifications off
      state = appSettingsReducer(state, {
        type: updateNotifications.fulfilled.type,
        payload: {
          notifications: {
            push_enabled: false,
            sms_enabled: true,
            email_enabled: true,
          },
        },
      });
      expect(state.notifications.push_enabled).toBe(false);
      
      // Toggle SMS notifications off
      state = appSettingsReducer(state, {
        type: updateNotifications.fulfilled.type,
        payload: {
          notifications: {
            push_enabled: false,
            sms_enabled: false,
            email_enabled: true,
          },
        },
      });
      expect(state.notifications.sms_enabled).toBe(false);
      expect(state.notifications.push_enabled).toBe(false);
    });
  });

  describe('Language Support', () => {
    it('should support English language', () => {
      const action = {
        type: updateLanguage.fulfilled.type,
        payload: { language: 'en' },
      };
      const result = appSettingsReducer(initialState, action);
      expect(result.language).toBe('en');
    });

    it('should support Spanish language', () => {
      const action = {
        type: updateLanguage.fulfilled.type,
        payload: { language: 'es' },
      };
      const result = appSettingsReducer(initialState, action);
      expect(result.language).toBe('es');
    });

    it('should support French language', () => {
      const action = {
        type: updateLanguage.fulfilled.type,
        payload: { language: 'fr' },
      };
      const result = appSettingsReducer(initialState, action);
      expect(result.language).toBe('fr');
    });

    it('should support Chinese language', () => {
      const action = {
        type: updateLanguage.fulfilled.type,
        payload: { language: 'zh' },
      };
      const result = appSettingsReducer(initialState, action);
      expect(result.language).toBe('zh');
    });
  });
});
