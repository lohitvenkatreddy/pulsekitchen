/**
 * Coordinate formatting and validation utilities
 */

/**
 * Format latitude to 6 decimal places
 * @param {number} latitude
 * @returns {string}
 */
export const formatLatitude = (latitude) => {
  if (typeof latitude !== 'number' || isNaN(latitude) || !isFinite(latitude)) {
    return '0.000000';
  }
  return latitude.toFixed(6);
};

/**
 * Format longitude to 6 decimal places
 * @param {number} longitude
 * @returns {string}
 */
export const formatLongitude = (longitude) => {
  if (typeof longitude !== 'number' || isNaN(longitude) || !isFinite(longitude)) {
    return '0.000000';
  }
  return longitude.toFixed(6);
};

/**
 * Validate coordinates
 * @param {number} latitude
 * @param {number} longitude
 * @returns {{valid: boolean, error: string|null}}
 */
export const validateCoordinates = (latitude, longitude) => {
  if (typeof latitude !== 'number' || isNaN(latitude) || !isFinite(latitude)) {
    return { valid: false, error: 'Invalid latitude value' };
  }
  
  if (typeof longitude !== 'number' || isNaN(longitude) || !isFinite(longitude)) {
    return { valid: false, error: 'Invalid longitude value' };
  }
  
  if (latitude < -90 || latitude > 90) {
    return { valid: false, error: 'Latitude must be between -90 and 90' };
  }
  
  if (longitude < -180 || longitude > 180) {
    return { valid: false, error: 'Longitude must be between -180 and 180' };
  }
  
  return { valid: true, error: null };
};

/**
 * Format coordinates for display
 * @param {Object} coordinates
 * @param {number} coordinates.latitude
 * @param {number} coordinates.longitude
 * @returns {string}
 */
export const formatCoordinatesForDisplay = (coordinates) => {
  if (!coordinates || !coordinates.latitude || !coordinates.longitude) {
    return 'No location selected';
  }
  
  const lat = formatLatitude(coordinates.latitude);
  const lng = formatLongitude(coordinates.longitude);
  
  return `${lat}, ${lng}`;
};
