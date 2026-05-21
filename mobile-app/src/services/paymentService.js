import apiClient from './api';

/**
 * Payment Service
 * Handles all API calls related to payment methods
 * Validates: Requirements 5.1, 5.4, 5.5, 5.6, 5.7, 5.8, 15.2, 15.3
 * 
 * SECURITY NOTE: This service never stores or transmits full card numbers.
 * Card tokenization is handled by the Payment Service backend.
 * Only card tokens are stored in Redux and transmitted in subsequent requests.
 * 
 * Error Handling:
 * - Implements exponential backoff for failed requests
 * - 30-second timeout for all requests
 * - Handles specific HTTP status codes (400, 401, 403, 404, 500)
 */

const paymentService = {
  normalizePaymentMethod: (pm) => ({
    ...pm,
    last_four_digits: pm.last_four_digits || pm.card_last_four,
    expiration_date:
      pm.expiration_date
      || (pm.card_exp_month && pm.card_exp_year ? `${String(pm.card_exp_month).padStart(2, '0')}/${String(pm.card_exp_year).slice(-2)}` : ''),
  }),

  processPayment: async (paymentData) => {
    try {
      const response = await apiClient.post('/payment/', paymentData);
      return response;
    } catch (error) {
      handlePaymentServiceError(error);
      throw error;
    }
  },

  /**
   * Fetch all payment methods for the current user
   * @param {number} userId - User ID to fetch payment methods for
   * @returns {Promise} Response with array of payment methods (tokens only, no full card numbers)
   * @throws {Error} If request fails after retries
   */
  getPaymentMethods: async (userId) => {
    try {
      console.log('[PaymentService] Fetching payment methods');
      const response = await apiClient.get(`/payment/saved-methods/${userId}`);
      response.data = Array.isArray(response.data)
        ? response.data.map(paymentService.normalizePaymentMethod)
        : response.data;
      console.log('[PaymentService] Successfully fetched payment methods');
      return response;
    } catch (error) {
      console.error('[PaymentService] Error fetching payment methods:', error.message);
      handlePaymentServiceError(error);
      throw error;
    }
  },

  /**
   * Add a new payment method
   * Sends card data to Payment Service for tokenization
   * @param {Object} cardData - Card data including user_id, card_last_four, card_brand, card_exp_month, card_exp_year, card_token, is_default
   * @returns {Promise} Response with tokenized payment method (no full card number)
   * @throws {Error} If request fails after retries
   */
  addPaymentMethod: async (cardData) => {
    try {
      console.log('[PaymentService] Adding new payment method');
      // Card data is sent to Payment Service for tokenization
      // The response contains only the token, not the full card number
      const response = await apiClient.post('/payment/saved-methods', cardData);
      response.data = paymentService.normalizePaymentMethod(response.data);
      console.log('[PaymentService] Successfully added payment method');
      return response;
    } catch (error) {
      console.error('[PaymentService] Error adding payment method:', error.message);
      handlePaymentServiceError(error);
      throw error;
    }
  },

  /**
   * Delete a payment method
   * @param {string} id - Payment method ID
   * @returns {Promise} Response confirming deletion
   * @throws {Error} If request fails after retries
   */
  deletePaymentMethod: async (id) => {
    try {
      console.log(`[PaymentService] Deleting payment method ${id}`);
      const response = await apiClient.delete(`/payment/saved-methods/${id}`);
      console.log(`[PaymentService] Successfully deleted payment method ${id}`);
      return response;
    } catch (error) {
      console.error(`[PaymentService] Error deleting payment method ${id}:`, error.message);
      handlePaymentServiceError(error);
      throw error;
    }
  },

  /**
   * Set a payment method as the default payment method
   * @param {string} id - Payment method ID to set as default
   * @returns {Promise} Response with updated payment method
   * @throws {Error} If request fails after retries
   */
  setDefaultPaymentMethod: async (id) => {
    try {
      console.log(`[PaymentService] Setting payment method ${id} as default`);
      const response = await apiClient.put(`/payment/saved-methods/${id}/set-default`);
      console.log(`[PaymentService] Successfully set payment method ${id} as default`);
      return response;
    } catch (error) {
      console.error(`[PaymentService] Error setting default payment method ${id}:`, error.message);
      handlePaymentServiceError(error);
      throw error;
    }
  },
};

/**
 * Handle errors from payment service API calls
 * @param {Error} error - The error object
 */
const handlePaymentServiceError = (error) => {
  if (!error.response) {
    // Network error
    console.error('[PaymentService] Network error - no response from server');
    return;
  }

  const status = error.response.status;
  const detail = error.response.data?.detail || error.message;

  switch (status) {
    case 400:
      console.error('[PaymentService] Bad Request (400):', detail);
      break;
    case 401:
      console.error('[PaymentService] Unauthorized (401) - Token may have expired');
      break;
    case 403:
      console.error('[PaymentService] Forbidden (403) - Permission denied');
      break;
    case 404:
      console.error('[PaymentService] Not Found (404):', detail);
      break;
    case 500:
      console.error('[PaymentService] Server Error (500):', detail);
      break;
    default:
      console.error(`[PaymentService] Error (${status}):`, detail);
  }
};

export default paymentService;
