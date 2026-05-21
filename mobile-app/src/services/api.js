import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const defaultBaseURL =
  Platform.OS === 'web'
    ? '/api/v1'
    : Platform.OS === 'android'
    ? 'http://10.0.2.2:8000/api/v1'
    : 'http://127.0.0.1:8000/api/v1';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || defaultBaseURL;

// Configuration for retry logic
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  timeoutMs: 30000,
};

// HTTP status codes that should trigger a retry
const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
  timeout: RETRY_CONFIG.timeoutMs,
});

/**
 * Calculate exponential backoff delay
 * @param {number} retryCount - Current retry attempt number
 * @returns {number} Delay in milliseconds
 */
const calculateBackoffDelay = (retryCount) => {
  const delay = RETRY_CONFIG.initialDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, retryCount);
  return Math.min(delay, RETRY_CONFIG.maxDelayMs);
};

/**
 * Determine if an error is retryable
 * @param {Error} error - The error to check
 * @returns {boolean} True if the error should be retried
 */
const isRetryableError = (error) => {
  // Network errors (no response from server)
  if (!error.response) {
    return true;
  }

  // Specific HTTP status codes that are retryable
  if (RETRYABLE_STATUS_CODES.includes(error.response.status)) {
    return true;
  }

  return false;
};

/**
 * Retry a request with exponential backoff
 * @param {Function} requestFn - Function that makes the request
 * @param {number} retryCount - Current retry attempt
 * @returns {Promise} Response from the request
 */
const retryRequest = async (requestFn, retryCount = 0) => {
  try {
    return await requestFn();
  } catch (error) {
    if (retryCount < RETRY_CONFIG.maxRetries && isRetryableError(error)) {
      const delay = calculateBackoffDelay(retryCount);
      console.log(
        `[API Retry] Attempt ${retryCount + 1}/${RETRY_CONFIG.maxRetries} after ${delay}ms delay`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      return retryRequest(requestFn, retryCount + 1);
    }
    throw error;
  }
};

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    // Log successful responses
    console.log(`[API Response] ${response.config.method.toUpperCase()} ${response.config.url} - ${response.status}`);
    return response;
  },
  async (error) => {
    // Log error details
    if (error.response) {
      console.error(
        `[API Error] ${error.config?.method?.toUpperCase()} ${error.config?.url} - ${error.response.status}: ${error.response.data?.detail || error.message}`
      );
    } else if (error.request) {
      console.error(`[API Error] No response received: ${error.message}`);
    } else {
      console.error(`[API Error] ${error.message}`);
    }

    // Handle 401 Unauthorized - token expired
    if (error.response?.status === 401) {
      console.log('[API] Token expired, clearing auth data');
      await AsyncStorage.multiRemove(['authToken', 'user']);
      // Could trigger navigation to login here if needed
    }

    return Promise.reject(error);
  }
);

/**
 * Wrapper for GET requests with retry logic
 */
const get = (url, config) => {
  return retryRequest(() => api.get(url, config));
};

/**
 * Wrapper for POST requests with retry logic
 */
const post = (url, data, config) => {
  return retryRequest(() => api.post(url, data, config));
};

/**
 * Wrapper for PUT requests with retry logic
 */
const put = (url, data, config) => {
  return retryRequest(() => api.put(url, data, config));
};

/**
 * Wrapper for PATCH requests with retry logic
 */
const patch = (url, data, config) => {
  return retryRequest(() => api.patch(url, data, config));
};

/**
 * Wrapper for DELETE requests with retry logic
 */
const deleteRequest = (url, config) => {
  return retryRequest(() => api.delete(url, config));
};

// Export both the raw axios instance and wrapped methods with retry logic
export default {
  ...api,
  get,
  post,
  put,
  patch,
  delete: deleteRequest,
  retryRequest,
  RETRY_CONFIG,
};
