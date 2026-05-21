import api from './api';

/**
 * Order Service
 * Handles all API calls related to order history and reorder functionality
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.7, 16.2
 */

const orderService = {
  /**
   * Create a new order
   * @param {Object} orderData - Order data
   * @returns {Promise} Response with created order
   */
  createOrder: async (orderData) => {
    try {
      const response = await api.post('/orders', orderData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  verifyStudentIdCard: async ({ userId, image }) => {
    try {
      const formData = new FormData();
      const fileName = image.fileName || image.uri.split('/').pop() || 'student-id.jpg';
      const fileType =
        image.mimeType ||
        (fileName.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg');

      formData.append('user_id', String(userId));
      formData.append('id_card', {
        uri: image.uri,
        name: fileName,
        type: fileType,
      });

      const response = await api.post('/orders/student-verification/id-card', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  verifyEmergencyDocument: async ({
    userId,
    image,
    emergencyType,
    customerName,
    orderId,
  }) => {
    try {
      const formData = new FormData();
      const fileName = image.fileName || image.uri.split('/').pop() || 'emergency-document.jpg';
      const fileType =
        image.mimeType ||
        (fileName.toLowerCase().endsWith('.png')
          ? 'image/png'
          : fileName.toLowerCase().endsWith('.webp')
            ? 'image/webp'
            : 'image/jpeg');

      formData.append('user_id', String(userId));
      formData.append('emergencyType', emergencyType);
      formData.append('customerId', String(userId));
      if (customerName) {
        formData.append('customerName', customerName);
      }
      if (orderId) {
        formData.append('orderId', String(orderId));
      }
      formData.append('document', {
        uri: image.uri,
        name: fileName,
        type: fileType,
      });

      const response = await api.post('/orders/emergency-verification/document', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Fetch user's order history with pagination
   * @param {number} page - Page number (1-indexed)
   * @param {number} limit - Number of orders per page (default: 10)
   * @returns {Promise} Response with paginated orders
   */
  getOrders: async (page = 1, limit = 10) => {
    try {
      // Calculate skip based on page number (page 1 = skip 0, page 2 = skip 10, etc.)
      const skip = (page - 1) * limit;
      const response = await api.get('/orders', {
        params: {
          skip,
          limit,
        },
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Fetch detailed information for a specific order
   * @param {string} orderId - Order ID
   * @returns {Promise} Response with order details including items, timeline, and delivery address
   */
  getOrderDetail: async (orderId) => {
    try {
      const response = await api.get(`/orders/${orderId}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Backward-compatible alias used by existing redux slices.
  getOrderById: async (orderId) => {
    return orderService.getOrderDetail(orderId);
  },

  /**
   * Reorder items from a previous order
   * Creates a new order with the same items and quantities as the original order
   * @param {string} orderId - Original order ID to reorder from
   * @returns {Promise} Response with new order created from reorder
   */
  reorderItems: async (orderId) => {
    try {
      const response = await api.post(`/orders/${orderId}/reorder`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get priority queue of pending orders (admin/staff use)
   * @returns {Promise} Response with pending orders
   */
  getPriorityQueue: async () => {
    try {
      const response = await api.get('/orders/queue/pending');
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update order status
   * @param {string} orderId - Order ID
   * @param {string} status - New status
   * @returns {Promise} Response with updated order
   */
  updateOrderStatus: async (orderId, status) => {
    try {
      const response = await api.patch(`/orders/${orderId}/status`, { status });
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Cancel an order
   * @param {string} orderId - Order ID to cancel
   * @returns {Promise} Response with cancelled order
   */
  cancelOrder: async (orderId) => {
    try {
      const response = await api.patch(`/orders/${orderId}/status`, {
        status: 'cancelled',
      });
      return response;
    } catch (error) {
      throw error;
    }
  },
};

export default orderService;
