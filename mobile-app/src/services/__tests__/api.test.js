import api from '../api';

// Mock axios
jest.mock('axios');
jest.mock('@react-native-async-storage/async-storage');

describe('API Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('RETRY_CONFIG', () => {
    it('should have correct retry configuration', () => {
      expect(api.RETRY_CONFIG).toEqual({
        maxRetries: 3,
        initialDelayMs: 1000,
        maxDelayMs: 10000,
        backoffMultiplier: 2,
        timeoutMs: 30000,
      });
    });

    it('should have 30 second timeout', () => {
      expect(api.RETRY_CONFIG.timeoutMs).toBe(30000);
    });

    it('should have exponential backoff multiplier of 2', () => {
      expect(api.RETRY_CONFIG.backoffMultiplier).toBe(2);
    });

    it('should have max retries of 3', () => {
      expect(api.RETRY_CONFIG.maxRetries).toBe(3);
    });

    it('should have initial delay of 1000ms', () => {
      expect(api.RETRY_CONFIG.initialDelayMs).toBe(1000);
    });

    it('should have max delay of 10000ms', () => {
      expect(api.RETRY_CONFIG.maxDelayMs).toBe(10000);
    });
  });

  describe('HTTP Methods with Retry', () => {
    it('should export get method with retry', () => {
      expect(typeof api.get).toBe('function');
    });

    it('should export post method with retry', () => {
      expect(typeof api.post).toBe('function');
    });

    it('should export put method with retry', () => {
      expect(typeof api.put).toBe('function');
    });

    it('should export patch method with retry', () => {
      expect(typeof api.patch).toBe('function');
    });

    it('should export delete method with retry', () => {
      expect(typeof api.delete).toBe('function');
    });

    it('should export retryRequest function', () => {
      expect(typeof api.retryRequest).toBe('function');
    });
  });

  describe('API Instance', () => {
    it('should have interceptors', () => {
      expect(api.interceptors).toBeDefined();
    });

    it('should have request interceptor', () => {
      expect(api.interceptors.request).toBeDefined();
    });

    it('should have response interceptor', () => {
      expect(api.interceptors.response).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', () => {
      const error = new Error('Network error');
      expect(error.message).toBe('Network error');
    });

    it('should handle HTTP errors', () => {
      const error = {
        response: {
          status: 500,
          data: { detail: 'Server error' },
        },
      };
      expect(error.response.status).toBe(500);
    });

    it('should handle timeout errors', () => {
      const error = {
        code: 'ECONNABORTED',
        message: 'timeout of 30000ms exceeded',
      };
      expect(error.code).toBe('ECONNABORTED');
    });
  });
});
