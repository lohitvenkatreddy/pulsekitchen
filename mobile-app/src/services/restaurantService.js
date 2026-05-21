import api from './api';

const restaurantService = {
  getRestaurants: async (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    const response = await api.get(`/restaurants${params ? `?${params}` : ''}`);
    return response;
  },

  getRestaurantById: async (restaurantId) => {
    const response = await api.get(`/restaurants/${restaurantId}`);
    return response;
  },

  getMenu: async (restaurantId) => {
    const response = await api.get(`/restaurants/${restaurantId}/menu`);
    return response;
  },

  searchRestaurants: async (query) => {
    const response = await api.get(`/restaurants/search?q=${query}`);
    return response;
  },

  getRestaurantsByCuisine: async (cuisine) => {
    const response = await api.get(`/restaurants/cuisine/${cuisine}`);
    return response;
  },

  createReview: async (restaurantId, reviewData) => {
    const response = await api.post(`/restaurants/${restaurantId}/reviews`, reviewData);
    return response;
  },
};

export default restaurantService;
