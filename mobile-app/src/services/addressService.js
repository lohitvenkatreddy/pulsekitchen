import apiClient from './api';

/**
 * Address Service
 * Handles all API calls related to user addresses
 * Validates: Requirements 4.1, 4.4, 4.5, 4.6, 4.7, 4.8
 * 
 * Error Handling:
 * - Implements exponential backoff for failed requests
 * - 30-second timeout for all requests
 * - Handles specific HTTP status codes (400, 401, 403, 404, 500)
 */

/**
 * Address Service
 * Handles all API calls related to user addresses
 * Validates: Requirements 4.1, 4.4, 4.5, 4.6, 4.7, 4.8
 * 
 * WARNING: Backend endpoints not yet implemented!
 * The user-service currently only has GET/PATCH /api/v1/users/{user_id}
 * Address management endpoints need to be added to the backend.
 * 
 * Error Handling:
 * - Implements exponential backoff for failed requests
 * - 30-second timeout for all requests
 * - Handles specific HTTP status codes (400, 401, 403, 404, 500)
 */

const addressService = {
  /**
   * Fetch all addresses for the current user
   * @returns {Promise} Response with array of addresses
   * @throws {Error} If request fails after retries
   */
  getAddresses: async () => {
    try {
      console.log('[AddressService] Fetching addresses');
      const response = await apiClient.get('/users/me/addresses');
      console.log('[AddressService] Successfully fetched addresses');
      return response;
    } catch (error) {
      console.error('[AddressService] Error fetching addresses:', error.message);
      handleAddressServiceError(error);
      throw error;
    }
  },

  /**
   * Add a new address
   * @param {Object} addressData - Address data to add
   * @returns {Promise} Response with created address
   * @throws {Error} If request fails after retries
   */
  addAddress: async (addressData) => {
    try {
      console.log('[AddressService] Adding new address');
      const response = await apiClient.post('/users/me/addresses', addressData);
      console.log('[AddressService] Successfully added address');
      return response;
    } catch (error) {
      console.error('[AddressService] Error adding address:', error.message);
      handleAddressServiceError(error);
      throw error;
    }
  },

  /**
   * Update an existing address
   * @param {string} id - Address ID
   * @param {Object} addressData - Updated address data
   * @returns {Promise} Response with updated address
   * @throws {Error} If request fails after retries
   */
  updateAddress: async (id, addressData) => {
    try {
      console.log(`[AddressService] Updating address ${id}`);
      const response = await apiClient.patch(`/users/me/addresses/${id}`, addressData);
      console.log(`[AddressService] Successfully updated address ${id}`);
      return response;
    } catch (error) {
      console.error(`[AddressService] Error updating address ${id}:`, error.message);
      handleAddressServiceError(error);
      throw error;
    }
  },

  /**
   * Delete an address
   * @param {string} id - Address ID
   * @returns {Promise} Response confirming deletion
   * @throws {Error} If request fails after retries
   */
  deleteAddress: async (id) => {
    try {
      console.log(`[AddressService] Deleting address ${id}`);
      const response = await apiClient.delete(`/users/me/addresses/${id}`);
      console.log(`[AddressService] Successfully deleted address ${id}`);
      return response;
    } catch (error) {
      console.error(`[AddressService] Error deleting address ${id}:`, error.message);
      handleAddressServiceError(error);
      throw error;
    }
  },

  /**
   * Set an address as the default address
   * @param {string} id - Address ID to set as default
   * @returns {Promise} Response with updated address
   * @throws {Error} If request fails after retries
   */
  setDefaultAddress: async (id) => {
    try {
      console.log(`[AddressService] Setting address ${id} as default`);
      const response = await apiClient.patch(`/users/me/addresses/${id}/set-default`);
      console.log(`[AddressService] Successfully set address ${id} as default`);
      return response;
    } catch (error) {
      console.error(`[AddressService] Error setting default address ${id}:`, error.message);
      handleAddressServiceError(error);
      throw error;
    }
  },
};

/**
 * Handle errors from address service API calls
 * @param {Error} error - The error object
 */
const handleAddressServiceError = (error) => {
  if (!error.response) {
    console.error('[AddressService] Network error - no response from server');
    return;
  }

  const status = error.response.status;
  const detail = error.response.data?.detail;
  // Safely convert detail to a string for logging
  const detailStr = Array.isArray(detail)
    ? detail.map((e) => e.msg || JSON.stringify(e)).join(', ')
    : (typeof detail === 'string' ? detail : error.message);

  switch (status) {
    case 400:
      console.error('[AddressService] Bad Request (400):', detailStr);
      break;
    case 401:
      console.error('[AddressService] Unauthorized (401) - Token may have expired');
      break;
    case 403:
      console.error('[AddressService] Forbidden (403) - Permission denied');
      break;
    case 404:
      console.error('[AddressService] Not Found (404):', detailStr);
      break;
    case 422:
      console.error('[AddressService] Validation Error (422):', detailStr);
      break;
    case 500:
      console.error('[AddressService] Server Error (500):', detailStr);
      break;
    default:
      console.error(`[AddressService] Error (${status}):`, detailStr);
  }
};

export default addressService;

