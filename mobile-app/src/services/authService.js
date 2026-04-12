import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

const authService = {
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    if (response.data?.access_token) {
      await AsyncStorage.setItem('authToken', response.data.access_token);
    }
    return response;
  },

  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response;
  },

  logout: async () => {
    await AsyncStorage.multiRemove(['authToken', 'user']);
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

export default authService;
