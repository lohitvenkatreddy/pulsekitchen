/**
 * Map-related type definitions
 */

/**
 * @typedef {Object} Coordinates
 * @property {number} latitude - Latitude (-90 to 90)
 * @property {number} longitude - Longitude (-180 to 180)
 */

/**
 * @typedef {Object} MapSelectionState
 * @property {Coordinates|null} userLocation - User's current GPS location
 * @property {Coordinates|null} selectedLocation - Selected pin location
 * @property {boolean} isLoading - Loading state for GPS requests
 * @property {string|null} error - Error message
 * @property {boolean} isSaving - Saving state for API requests
 * @property {boolean} saveSuccess - Save success state
 */

/**
 * @typedef {Object} MapConfig
 * @property {number} initialZoom - Initial zoom level
 * @property {number} minZoom - Minimum zoom level
 * @property {number} maxZoom - Maximum zoom level
 * @property {Coordinates} centerCoordinate - Center coordinate
 */

export const MAP_CONFIG = {
  initialZoom: 15,
  minZoom: 10,
  maxZoom: 20,
  defaultCenter: {
    latitude: 37.78825,
    longitude: -122.4324,
  },
};
