import settingsService from '../settingsService';
import apiClient from '../api';

// Mock the API client
jest.mock('../api');

describe('settingsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSettings', () => {
    it('should fetch settings successfully', async () => {
      const userId = 123;
      const mockSettings = {
        notifications: {
          push_enabled: true,
          sms_enabled: false,
          email_enabled: true,
        },
        privacy: {
          share_location: true,
          share_analytics: false,
          marketing_communications: true,
        },
        language: 'en',
      };

      apiClient.get.mockResolvedValue({ data: mockSettings });

      const result = await settingsService.getSettings(userId);

      expect(apiClient.get).toHaveBeenCalledWith(`/users/${userId}/settings`);
      expect(result.data).toEqual(mockSettings);
    });

    it('should handle network errors', async () => {
      const userId = 123;
      const error = new Error('Network error');
      apiClient.get.mockRejectedValue(error);

      await expect(settingsService.getSettings(userId)).rejects.toThrow('Network error');
    });

    it('should handle 401 unauthorized error', async () => {
      const userId = 123;
      const error = {
        response: {
          status: 401,
          data: { detail: 'Token expired' },
        },
      };
      apiClient.get.mockRejectedValue(error);

      await expect(settingsService.getSettings(userId)).rejects.toEqual(error);
    });
  });

  describe('updateNotifications', () => {
    it('should update notification preferences successfully', async () => {
      const userId = 123;
      const notificationPrefs = {
        push_enabled: false,
        sms_enabled: true,
        email_enabled: true,
      };

      const mockResponse = {
        notifications: notificationPrefs,
      };

      apiClient.put.mockResolvedValue({ data: mockResponse });

      const result = await settingsService.updateNotifications(userId, notificationPrefs);

      expect(apiClient.put).toHaveBeenCalledWith(`/users/${userId}/settings/notifications`, notificationPrefs);
      expect(result.data).toEqual(mockResponse);
    });

    it('should handle validation errors', async () => {
      const userId = 123;
      const invalidPrefs = {
        push_enabled: 'invalid', // Should be boolean
      };

      const error = {
        response: {
          status: 400,
          data: { detail: 'Invalid preference value' },
        },
      };

      apiClient.put.mockRejectedValue(error);

      await expect(settingsService.updateNotifications(userId, invalidPrefs)).rejects.toEqual(error);
    });
  });

  describe('updatePrivacy', () => {
    it('should update privacy preferences successfully', async () => {
      const userId = 123;
      const privacyPrefs = {
        share_location: false,
        share_analytics: true,
        marketing_communications: false,
      };

      const mockResponse = {
        privacy: privacyPrefs,
      };

      apiClient.put.mockResolvedValue({ data: mockResponse });

      const result = await settingsService.updatePrivacy(userId, privacyPrefs);

      expect(apiClient.put).toHaveBeenCalledWith(`/users/${userId}/settings/privacy`, privacyPrefs);
      expect(result.data).toEqual(mockResponse);
    });

    it('should handle server errors', async () => {
      const userId = 123;
      const privacyPrefs = {
        share_location: false,
        share_analytics: true,
        marketing_communications: false,
      };

      const error = {
        response: {
          status: 500,
          data: { detail: 'Internal server error' },
        },
      };

      apiClient.put.mockRejectedValue(error);

      await expect(settingsService.updatePrivacy(userId, privacyPrefs)).rejects.toEqual(error);
    });
  });

  describe('updateLanguage', () => {
    it('should update language preference successfully', async () => {
      const userId = 123;
      const language = 'es';
      const mockResponse = {
        language: language,
      };

      apiClient.put.mockResolvedValue({ data: mockResponse });

      const result = await settingsService.updateLanguage(userId, language);

      expect(apiClient.put).toHaveBeenCalledWith(`/users/${userId}/settings/language`, { language });
      expect(result.data).toEqual(mockResponse);
    });

    it('should handle invalid language code', async () => {
      const userId = 123;
      const invalidLanguage = 'invalid_lang';

      const error = {
        response: {
          status: 400,
          data: { detail: 'Invalid language code' },
        },
      };

      apiClient.put.mockRejectedValue(error);

      await expect(settingsService.updateLanguage(userId, invalidLanguage)).rejects.toEqual(error);
    });

    it('should support multiple languages', async () => {
      const userId = 123;
      const languages = ['en', 'es', 'fr', 'zh'];

      for (const lang of languages) {
        apiClient.put.mockResolvedValue({ data: { language: lang } });
        const result = await settingsService.updateLanguage(userId, lang);
        expect(result.data.language).toBe(lang);
      }
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const userId = 123;
      const passwordData = {
        current_password: 'oldPassword123',
        new_password: 'newPassword456',
      };

      const mockResponse = {
        message: 'Password changed successfully',
      };

      apiClient.put.mockResolvedValue({ data: mockResponse });

      const result = await settingsService.changePassword(userId, passwordData);

      expect(apiClient.put).toHaveBeenCalledWith('/auth/change-password', passwordData);
      expect(result.data).toEqual(mockResponse);
    });

    it('should handle incorrect current password', async () => {
      const userId = 123;
      const passwordData = {
        current_password: 'wrongPassword',
        new_password: 'newPassword456',
      };

      const error = {
        response: {
          status: 400,
          data: { detail: 'Current password is incorrect' },
        },
      };

      apiClient.put.mockRejectedValue(error);

      await expect(settingsService.changePassword(userId, passwordData)).rejects.toEqual(error);
    });

    it('should handle weak password', async () => {
      const userId = 123;
      const passwordData = {
        current_password: 'oldPassword123',
        new_password: 'weak', // Too weak
      };

      const error = {
        response: {
          status: 400,
          data: { detail: 'Password does not meet security requirements' },
        },
      };

      apiClient.put.mockRejectedValue(error);

      await expect(settingsService.changePassword(userId, passwordData)).rejects.toEqual(error);
    });
  });

  describe('deleteAccount', () => {
    it('should delete account successfully', async () => {
      const userId = 123;
      const mockResponse = {
        message: 'Account deleted successfully',
      };

      apiClient.delete.mockResolvedValue({ data: mockResponse });

      const result = await settingsService.deleteAccount(userId);

      expect(apiClient.delete).toHaveBeenCalledWith(`/users/${userId}/account`);
      expect(result.data).toEqual(mockResponse);
    });

    it('should handle 401 unauthorized error', async () => {
      const userId = 123;
      const error = {
        response: {
          status: 401,
          data: { detail: 'Token expired' },
        },
      };

      apiClient.delete.mockRejectedValue(error);

      await expect(settingsService.deleteAccount(userId)).rejects.toEqual(error);
    });

    it('should handle server errors', async () => {
      const userId = 123;
      const error = {
        response: {
          status: 500,
          data: { detail: 'Internal server error' },
        },
      };

      apiClient.delete.mockRejectedValue(error);

      await expect(settingsService.deleteAccount(userId)).rejects.toEqual(error);
    });
  });
});
