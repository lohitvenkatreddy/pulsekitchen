import api from './api';

const orderService = {
  createOrder: async (orderData) => {
    const response = await api.post('/orders/', orderData);
    return response;
  },

  getOrders: async () => {
    const response = await api.get('/orders/');
    return response;
  },

  getOrderById: async (orderId) => {
    const response = await api.get(`/orders/${orderId}`);
    return response;
  },

  getPriorityQueue: async () => {
    const response = await api.get('/orders/queue/pending');
    return response;
  },

  updateOrderStatus: async (orderId, status) => {
    const response = await api.patch(`/orders/${orderId}/status`, { status });
    return response;
  },

  cancelOrder: async (orderId) => {
    const response = await api.patch(`/orders/${orderId}/status`, {
      status: 'cancelled',
    });
    return response;
  },
};

export default orderService;
