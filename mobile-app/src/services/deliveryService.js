import api from './api';

const deliveryService = {
  startTracking: async (orderId) => {
    const response = await api.post(`/delivery/${orderId}/track`);
    return response;
  },

  updateLocation: async (location) => {
    const response = await api.post('/delivery/location', location);
    return response;
  },

  getDeliveryStatus: async (orderId) => {
    const response = await api.get(`/delivery/${orderId}/status`);
    return response;
  },

  getETA: async (orderId) => {
    const response = await api.get(`/delivery/${orderId}/eta`);
    return response;
  },

  assignDeliveryPartner: async (orderId, partnerId) => {
    const response = await api.post(`/delivery/${orderId}/assign`, { partnerId });
    return response;
  },
};

export default deliveryService;
