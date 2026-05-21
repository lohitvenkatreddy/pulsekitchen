import apiClient from './api';
import FormData from 'form-data';

/**
 * Support Service
 * Handles all API calls related to help, support requests, and issue reporting
 * Validates: Requirements 6.4, 6.5, 6.6, 6.7
 * 
 * Error Handling:
 * - Implements exponential backoff for failed requests
 * - 30-second timeout for all requests
 * - Handles specific HTTP status codes (400, 401, 403, 404, 500)
 */

const supportService = {
  /**
   * Submit a support request
   * @param {Object} requestData - Support request data
   * @param {string} requestData.subject - Subject of the support request
   * @param {string} requestData.message - Message/description of the issue
   * @param {File} [requestData.attachment] - Optional attachment file
   * @returns {Promise} Response with support ticket number and confirmation
   * @throws {Error} If request fails after retries
   */
  submitSupportRequest: async (requestData) => {
    try {
      console.log('[SupportService] Submitting support request');
      // If there's an attachment, use FormData for multipart upload
      if (requestData.attachment) {
        const formData = new FormData();
        formData.append('subject', requestData.subject);
        formData.append('message', requestData.message);
        formData.append('attachment', requestData.attachment);

        const response = await apiClient.post('/support/requests', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        console.log('[SupportService] Successfully submitted support request');
        return response;
      } else {
        // No attachment, send as JSON
        const response = await apiClient.post('/support/requests', {
          subject: requestData.subject,
          message: requestData.message,
        });
        console.log('[SupportService] Successfully submitted support request');
        return response;
      }
    } catch (error) {
      console.error('[SupportService] Error submitting support request:', error.message);
      handleSupportServiceError(error);
      throw error;
    }
  },

  /**
   * Submit an issue report
   * @param {Object} reportData - Issue report data
   * @param {string} reportData.issue_type - Type of issue (dropdown value)
   * @param {string} reportData.description - Description of the issue
   * @param {File} [reportData.screenshot] - Optional screenshot file
   * @returns {Promise} Response with issue report confirmation
   * @throws {Error} If request fails after retries
   */
  submitIssueReport: async (reportData) => {
    try {
      console.log('[SupportService] Submitting issue report');
      // If there's a screenshot, use FormData for multipart upload
      if (reportData.screenshot) {
        const formData = new FormData();
        formData.append('issue_type', reportData.issue_type);
        formData.append('description', reportData.description);
        formData.append('screenshot', reportData.screenshot);

        const response = await apiClient.post('/support/issues', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        console.log('[SupportService] Successfully submitted issue report');
        return response;
      } else {
        // No screenshot, send as JSON
        const response = await apiClient.post('/support/issues', {
          issue_type: reportData.issue_type,
          description: reportData.description,
        });
        console.log('[SupportService] Successfully submitted issue report');
        return response;
      }
    } catch (error) {
      console.error('[SupportService] Error submitting issue report:', error.message);
      handleSupportServiceError(error);
      throw error;
    }
  },

  /**
   * Fetch FAQ data
   * @returns {Promise} Response with FAQ items organized by category
   * @throws {Error} If request fails after retries
   */
  getFAQ: async () => {
    try {
      console.log('[SupportService] Fetching FAQ');
      const response = await apiClient.get('/support/faq');
      console.log('[SupportService] Successfully fetched FAQ');
      return response;
    } catch (error) {
      console.error('[SupportService] Error fetching FAQ:', error.message);
      handleSupportServiceError(error);
      throw error;
    }
  },
};

/**
 * Handle errors from support service API calls
 * @param {Error} error - The error object
 */
const handleSupportServiceError = (error) => {
  if (!error.response) {
    // Network error
    console.error('[SupportService] Network error - no response from server');
    return;
  }

  const status = error.response.status;
  const detail = error.response.data?.detail || error.message;

  switch (status) {
    case 400:
      console.error('[SupportService] Bad Request (400):', detail);
      break;
    case 401:
      console.error('[SupportService] Unauthorized (401) - Token may have expired');
      break;
    case 403:
      console.error('[SupportService] Forbidden (403) - Permission denied');
      break;
    case 404:
      console.error('[SupportService] Not Found (404):', detail);
      break;
    case 500:
      console.error('[SupportService] Server Error (500):', detail);
      break;
    default:
      console.error(`[SupportService] Error (${status}):`, detail);
  }
};

export default supportService;

