import apiClient from './api';

/**
 * Settings Service
 * Handles all API calls related to app settings and user preferences
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.9, 7.10, 7.12, 17.1, 18.1
 * 
 * Error Handling:
 * - Implements exponential backoff for failed requests
 * - 30-second timeout for all requests
 * - Handles specific HTTP status codes (400, 401, 403, 404, 500)
 */

const settingsService = {
  /**
   * Fetch app settings for the current user
   * @param {number} userId - User ID to fetch settings for
   * @returns {Promise} Response with user settings (notifications, privacy, language)
   * @throws {Error} If request fails after retries
   */
  getSettings: async (userId) => {
    try {
      console.log('[SettingsService] Fetching settings');
      const response = await apiClient.get(`/users/${userId}/settings`);
      console.log('[SettingsService] Successfully fetched settings');
      return response;
    } catch (error) {
      console.error('[SettingsService] Error fetching settings:', error.message);
      handleSettingsServiceError(error);
      throw error;
    }
  },

  /**
   * Update notification preferences
   * @param {number} userId - User ID
   * @param {Object} notificationPrefs - Notification preferences object
   * @param {boolean} notificationPrefs.push_enabled - Enable/disable push notifications
   * @param {boolean} notificationPrefs.sms_enabled - Enable/disable SMS notifications
   * @param {boolean} notificationPrefs.email_enabled - Enable/disable email notifications
   * @returns {Promise} Response with updated settings
   * @throws {Error} If request fails after retries
   */
  updateNotifications: async (userId, notificationPrefs) => {
    try {
      console.log('[SettingsService] Updating notification preferences');
      const response = await apiClient.put(`/users/${userId}/settings/notifications`, notificationPrefs);
      console.log('[SettingsService] Successfully updated notification preferences');
      return response;
    } catch (error) {
      console.error('[SettingsService] Error updating notification preferences:', error.message);
      handleSettingsServiceError(error);
      throw error;
    }
  },

  /**
   * Update privacy preferences
   * @param {number} userId - User ID
   * @param {Object} privacyPrefs - Privacy preferences object
   * @param {boolean} privacyPrefs.share_location - Enable/disable location sharing
   * @param {boolean} privacyPrefs.share_analytics - Enable/disable analytics sharing
   * @param {boolean} privacyPrefs.marketing_communications - Enable/disable marketing communications
   * @returns {Promise} Response with updated settings
   * @throws {Error} If request fails after retries
   */
  updatePrivacy: async (userId, privacyPrefs) => {
    try {
      console.log('[SettingsService] Updating privacy preferences');
      const response = await apiClient.put(`/users/${userId}/settings/privacy`, privacyPrefs);
      console.log('[SettingsService] Successfully updated privacy preferences');
      return response;
    } catch (error) {
      console.error('[SettingsService] Error updating privacy preferences:', error.message);
      handleSettingsServiceError(error);
      throw error;
    }
  },

  /**
   * Update language preference
   * @param {number} userId - User ID
   * @param {string} language - Language code (en, es, fr, zh)
   * @returns {Promise} Response with updated settings
   * @throws {Error} If request fails after retries
   */
  updateLanguage: async (userId, language) => {
    try {
      console.log(`[SettingsService] Updating language to ${language}`);
      const response = await apiClient.put(`/users/${userId}/settings/language`, { language });
      console.log('[SettingsService] Successfully updated language');
      return response;
    } catch (error) {
      console.error('[SettingsService] Error updating language:', error.message);
      handleSettingsServiceError(error);
      throw error;
    }
  },

  /**
   * Change user password
   * @param {number} userId - User ID
   * @param {Object} passwordData - Password change data
   * @param {string} passwordData.current_password - Current password
   * @param {string} passwordData.new_password - New password
   * @returns {Promise} Response confirming password change
   * @throws {Error} If request fails after retries
   */
  changePassword: async (userId, passwordData) => {
    try {
      console.log('[SettingsService] Changing password');
      const response = await apiClient.put('/auth/change-password', passwordData);
      console.log('[SettingsService] Successfully changed password');
      return response;
    } catch (error) {
      console.error('[SettingsService] Error changing password:', error.message);
      handleSettingsServiceError(error);
      throw error;
    }
  },

  /**
   * Delete user account
   * @param {number} userId - User ID
   * @returns {Promise} Response confirming account deletion
   * @throws {Error} If request fails after retries
   */
  deleteAccount: async (userId) => {
    try {
      console.log('[SettingsService] Deleting account');
      const response = await apiClient.delete(`/users/${userId}/account`);
      console.log('[SettingsService] Successfully deleted account');
      return response;
    } catch (error) {
      console.error('[SettingsService] Error deleting account:', error.message);
      handleSettingsServiceError(error);
      throw error;
    }
  },
};

/**
 * Handle errors from settings service API calls
 * @param {Error} error - The error object
 */
const handleSettingsServiceError = (error) => {
  if (!error.response) {
    // Network error
    console.error('[SettingsService] Network error - no response from server');
    return;
  }

  const status = error.response.status;
  const detail = error.response.data?.detail || error.message;

  switch (status) {
    case 400:
      console.error('[SettingsService] Bad Request (400):', detail);
      break;
    case 401:
      console.error('[SettingsService] Unauthorized (401) - Token may have expired');
      break;
    case 403:
      console.error('[SettingsService] Forbidden (403) - Permission denied');
      break;
    case 404:
      console.error('[SettingsService] Not Found (404):', detail);
      break;
    case 500:
      console.error('[SettingsService] Server Error (500):', detail);
      break;
    default:
      console.error(`[SettingsService] Error (${status}):`, detail);
  }
};

export default settingsService;
