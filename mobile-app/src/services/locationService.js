import * as Location from 'expo-location';

/**
 * Location service for GPS operations
 */

/**
 * Request location permissions
 * @returns {Promise<{granted: boolean, status: string}>}
 */
export const requestLocationPermission = async () => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return {
      granted: status === 'granted',
      status,
    };
  } catch (error) {
    console.error('[LocationService] Permission request error:', error);
    return {
      granted: false,
      status: 'error',
    };
  }
};

/**
 * Check if location permission is granted
 * @returns {Promise<boolean>}
 */
export const hasLocationPermission = async () => {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('[LocationService] Permission check error:', error);
    return false;
  }
};

/**
 * Get current location with timeout
 * @param {number} timeout - Timeout in milliseconds (default: 10000)
 * @returns {Promise<{latitude: number, longitude: number}|null>}
 */
export const getCurrentLocation = async (timeout = 10000) => {
  try {
    // Check permission first
    const hasPermission = await hasLocationPermission();
    if (!hasPermission) {
      console.log('[LocationService] Location permission not granted');
      return null;
    }

    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Location request timed out')), timeout);
    });

    // Get location with timeout
    const locationPromise = Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const location = await Promise.race([locationPromise, timeoutPromise]);

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch (error) {
    if (error.message === 'Location request timed out') {
      console.log('[LocationService] Location request timed out');
    } else {
      console.error('[LocationService] Get location error:', error);
    }
    return null;
  }
};

const compactParts = (parts) => parts.filter(Boolean).join(', ');

const normalizeNominatimAddress = (payload) => {
  const address = payload?.address || {};
  const namedDetails = payload?.namedetails || {};
  const primaryName =
    namedDetails.name ||
    payload?.name ||
    address.amenity ||
    address.shop ||
    address.tourism ||
    address.leisure ||
    address.building ||
    address.mall ||
    address.road ||
    address.neighbourhood ||
    address.suburb;

  const city = address.city || address.town || address.village || address.suburb || null;
  const region = address.state || address.county || null;
  const postalCode = address.postcode || null;
  const formattedAddress = payload?.display_name || compactParts([primaryName, city, region]);

  return {
    name: primaryName || formattedAddress || 'Selected map location',
    formattedAddress: formattedAddress || primaryName || 'Selected map location',
    city,
    region,
    postalCode,
    country: address.country || 'US',
  };
};

const normalizeExpoAddress = (entry) => {
  if (!entry) {
    return null;
  }

  const street = compactParts([entry.name, entry.street]);
  const city = entry.city || entry.subregion || null;
  const region = entry.region || null;
  const postalCode = entry.postalCode || null;
  const formattedAddress = compactParts([street, city, region, postalCode, entry.country]);

  return {
    name: street || formattedAddress || 'Selected map location',
    formattedAddress: formattedAddress || street || 'Selected map location',
    city,
    region,
    postalCode,
    country: entry.isoCountryCode || entry.country || 'US',
  };
};

/**
 * Resolve coordinates into a readable place/address label.
 * Nominatim is used first because it can return named places like malls.
 * Expo's reverse geocoder is kept as a native fallback.
 */
export const reverseGeocodeLocation = async ({ latitude, longitude }) => {
  try {
    const url =
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}` +
      `&lon=${longitude}&zoom=18&addressdetails=1&namedetails=1`;
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'en',
      },
    });

    if (response.ok) {
      const payload = await response.json();
      const normalized = normalizeNominatimAddress(payload);
      if (normalized.name) {
        return normalized;
      }
    }
  } catch (error) {
    console.log('[LocationService] Nominatim reverse geocode failed:', error.message);
  }

  try {
    const results = await Location.reverseGeocodeAsync({ latitude, longitude });
    const normalized = normalizeExpoAddress(results?.[0]);
    if (normalized) {
      return normalized;
    }
  } catch (error) {
    console.log('[LocationService] Expo reverse geocode failed:', error.message);
  }

  return {
    name: 'Selected map location',
    formattedAddress: 'Selected map location',
    city: null,
    region: null,
    postalCode: null,
    country: 'US',
  };
};

/**
 * Get location error message for user display
 * @param {string} errorType - Type of error (permission_denied, timeout, unavailable)
 * @returns {string}
 */
export const getLocationErrorMessage = (errorType) => {
  const messages = {
    permission_denied: 'Location permission is required to use the map',
    timeout: 'Location request timed out. Please try again',
    unavailable: 'Unable to determine your location. Please check your GPS settings',
    error: 'An error occurred while getting your location',
  };
  
  return messages[errorType] || messages.error;
};

export default {
  requestLocationPermission,
  hasLocationPermission,
  getCurrentLocation,
  reverseGeocodeLocation,
  getLocationErrorMessage,
};
