# Implementation Plan: Restaurant Mapping and ETA Feature

## Overview

This implementation plan breaks down the restaurant mapping and ETA feature into discrete coding tasks. The feature integrates GPS-based location tracking, Mapbox GL mapping, real-time route calculation via Mapbox Directions API, and ETA display into the existing React Native food delivery app.

The implementation follows a bottom-up approach: core utilities first, then services, state management, and finally UI components. Each task builds incrementally with validation checkpoints to ensure functionality before proceeding.

## Tasks

- [ ] 1. Set up Mapbox GL SDK and environment configuration
  - Install `@rnmapbox/maps` package via npm
  - Configure Mapbox access token in `.env` file
  - Add `.env` to `.gitignore` if not already present
  - Create `mobile-app/src/config/mapbox.js` to export token from environment variables
  - Add error handling for missing token configuration
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 2. Implement Location Manager utility
  - [ ] 2.1 Create `mobile-app/src/utils/locationManager.js`
    - Implement `requestLocationPermission()` function using `expo-location`
    - Implement `getCurrentLocation()` function with high accuracy mode
    - Add timeout handling for GPS requests (10 seconds)
    - Return standardized location object with `{ latitude, longitude, error }`
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 1.6_
  
  - [ ]* 2.2 Write unit tests for Location Manager
    - Test permission request flow
    - Test successful location retrieval
    - Test GPS timeout scenarios
    - Test permission denied scenarios
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 3. Implement Token Manager utility
  - [ ] 3.1 Create `mobile-app/src/utils/tokenManager.js`
    - Implement `getMapboxToken()` function to retrieve token from config
    - Add validation to ensure token exists and is non-empty
    - Return error object when token is missing
    - _Requirements: 9.1, 9.2, 9.4, 9.5_
  
  - [ ]* 3.2 Write unit tests for Token Manager
    - Test successful token retrieval
    - Test missing token error handling
    - Test empty token validation
    - _Requirements: 9.1, 9.5_

- [ ] 4. Implement Session Cache utility
  - [ ] 4.1 Create `mobile-app/src/utils/sessionCache.js`
    - Implement in-memory cache using JavaScript Map
    - Implement `generateCacheKey(userLoc, restaurantLoc)` function
    - Implement `getCachedRoute(userLoc, restaurantLoc)` function
    - Implement `setCachedRoute(userLoc, restaurantLoc, routeData)` function
    - Implement `clearCache()` function
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_
  
  - [ ]* 4.2 Write unit tests for Session Cache
    - Test cache key generation with same coordinates
    - Test cache hit scenario
    - Test cache miss scenario
    - Test cache clearing
    - _Requirements: 8.1, 8.2, 8.3, 8.6_

- [ ] 5. Implement Route Calculator service
  - [ ] 5.1 Create `mobile-app/src/services/routeService.js`
    - Implement `calculateRoute(userLocation, restaurantLocation)` function
    - Check session cache before making API call
    - Build Mapbox Directions API URL with coordinates and token
    - Use existing `axios` service with retry logic for API call
    - Request driving profile from Directions API
    - Extract route geometry, distance, and duration from API response
    - Store successful response in session cache
    - Return standardized route object: `{ geometry, distance, duration, error }`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.7, 4.8, 6.1, 6.5, 7.1, 7.6, 8.1, 8.6_
  
  - [ ] 5.2 Add error handling to Route Calculator
    - Handle HTTP errors with status codes
    - Handle network timeout errors
    - Handle "no routes found" responses
    - Handle network connectivity errors
    - Return descriptive error messages for each failure type
    - _Requirements: 11.1, 11.2, 11.3, 11.4_
  
  - [ ]* 5.3 Write unit tests for Route Calculator
    - Test successful route calculation
    - Test cache hit scenario (no API call made)
    - Test HTTP error handling
    - Test timeout error handling
    - Test no routes found scenario
    - Test network error handling
    - Mock axios and session cache
    - _Requirements: 4.1, 4.5, 4.6, 8.6, 11.1, 11.2, 11.3, 11.4_

- [ ] 6. Implement ETA Calculator utility
  - [ ] 6.1 Create `mobile-app/src/utils/etaCalculator.js`
    - Implement `calculateETA(durationInSeconds)` function
    - Convert seconds to minutes
    - Round to nearest whole minute
    - Return ETA in minutes as integer
    - _Requirements: 7.1, 7.2, 7.4, 7.5, 7.6, 7.7_
  
  - [ ]* 6.2 Write unit tests for ETA Calculator
    - Test seconds to minutes conversion
    - Test rounding behavior (e.g., 90 seconds → 2 minutes)
    - Test edge cases (0 seconds, very large values)
    - _Requirements: 7.1, 7.2, 7.7_

- [ ] 7. Implement coordinate validation utility
  - [ ] 7.1 Create `mobile-app/src/utils/coordinateValidator.js`
    - Implement `validateCoordinates(latitude, longitude)` function
    - Check latitude is between -90 and 90
    - Check longitude is between -180 and 180
    - Return validation result with error message if invalid
    - _Requirements: 2.4, 2.5_
  
  - [ ]* 7.2 Write unit tests for coordinate validator
    - Test valid coordinates
    - Test invalid latitude (out of range)
    - Test invalid longitude (out of range)
    - Test edge cases (exactly -90, 90, -180, 180)
    - _Requirements: 2.4, 2.5_

- [ ] 8. Checkpoint - Ensure all utility and service tests pass
  - Run `npm test` to verify all unit tests pass
  - Ensure all tests pass, ask the user if questions arise

- [ ] 9. Implement Map Redux slice
  - [ ] 9.1 Create `mobile-app/src/store/slices/mapSlice.js`
    - Define initial state: `{ userLocation, restaurantLocation, route, distance, eta, loading, error }`
    - Implement `setUserLocation` reducer
    - Implement `setRestaurantLocation` reducer
    - Implement `setRoute` reducer to store geometry, distance, duration
    - Implement `setLoading` reducer
    - Implement `setError` reducer
    - Implement `clearMapData` reducer
    - Create async thunk `fetchUserLocation` using Location Manager
    - Create async thunk `fetchRoute` using Route Calculator and ETA Calculator
    - Export actions and reducer
    - _Requirements: 1.1, 1.2, 4.1, 6.1, 7.1_
  
  - [ ]* 9.2 Write unit tests for Map slice
    - Test initial state
    - Test setUserLocation action
    - Test setRestaurantLocation action
    - Test setRoute action
    - Test fetchUserLocation thunk (success and error cases)
    - Test fetchRoute thunk (success and error cases)
    - Mock Location Manager and Route Calculator
    - _Requirements: 1.1, 1.2, 4.1, 6.1_

- [ ] 10. Register Map slice in Redux store
  - [ ] 10.1 Update `mobile-app/src/store/store.js`
    - Import mapSlice reducer
    - Add `map` reducer to store configuration
    - _Requirements: 1.1, 4.1_
  
  - [ ]* 10.2 Write integration test for store with map slice
    - Test that map slice is accessible from store
    - Test dispatching map actions updates state correctly
    - _Requirements: 1.1, 4.1_

- [ ] 11. Implement Map Renderer component
  - [ ] 11.1 Create `mobile-app/src/components/MapRenderer.js`
    - Import Mapbox GL components from `@rnmapbox/maps`
    - Accept props: `userLocation`, `restaurantLocation`, `routeGeometry`
    - Render MapView component with Mapbox token
    - Render green PointAnnotation for user location
    - Render red PointAnnotation for restaurant location
    - Decode route geometry polyline and render ShapeSource with LineLayer
    - Adjust camera to fit both markers when both locations available
    - Support pan and zoom interactions
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [ ]* 11.2 Write component tests for Map Renderer
    - Test component renders with user and restaurant locations
    - Test markers are displayed correctly
    - Test route polyline is rendered when geometry provided
    - Test camera adjustment when both locations present
    - Mock Mapbox GL components
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 5.2, 5.5_

- [ ] 12. Implement Map Screen component
  - [ ] 12.1 Create `mobile-app/src/screens/MapScreen.js`
    - Connect to Redux store using `useSelector` and `useDispatch`
    - Accept navigation params for restaurant data
    - Dispatch `fetchUserLocation` on component mount
    - Extract restaurant location from navigation params
    - Validate restaurant coordinates using coordinate validator
    - Dispatch `fetchRoute` when both user and restaurant locations available
    - Render MapRenderer component with location and route data
    - Display distance in kilometers (formatted to 2 decimal places)
    - Display ETA in minutes
    - Display loading indicator while fetching location or route
    - Display error messages for GPS failures (permission denied, GPS unavailable, timeout)
    - Display error messages for API failures (HTTP errors, timeout, no route, network error)
    - Provide retry button for GPS and API failures
    - Add back navigation button to return to previous screen
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.3, 2.4, 2.5, 3.1, 4.1, 5.1, 6.2, 6.3, 7.2, 7.3, 10.1, 10.2, 10.3, 10.4, 10.5, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_
  
  - [ ]* 12.2 Write component tests for Map Screen
    - Test component renders loading state initially
    - Test user location fetch on mount
    - Test route fetch when both locations available
    - Test error message display for GPS permission denied
    - Test error message display for GPS unavailable
    - Test error message display for API timeout
    - Test error message display for no route found
    - Test retry button functionality
    - Test distance and ETA display formatting
    - Mock Redux store and navigation
    - _Requirements: 1.3, 6.2, 6.3, 7.3, 10.1, 10.2, 10.3, 10.4, 11.5, 11.6_

- [ ] 13. Integrate Map Screen into navigation
  - [ ] 13.1 Update `mobile-app/src/navigation/AppNavigator.js`
    - Import MapScreen component
    - Add MapScreen to navigation stack
    - Configure screen options (title, header style)
    - _Requirements: 12.3_
  
  - [ ] 13.2 Add navigation to Map Screen from Order Tracking
    - Update `mobile-app/src/screens/OrderTrackingScreen.js`
    - Add "View Map" button or link
    - Pass restaurant location data via navigation params
    - _Requirements: 12.1, 12.2_
  
  - [ ]* 13.3 Write integration test for navigation flow
    - Test navigation from Order Tracking to Map Screen
    - Test restaurant data is passed correctly
    - Test back navigation returns to Order Tracking
    - Mock navigation and restaurant data
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

- [ ] 14. Checkpoint - Ensure all tests pass and manual testing
  - Run `npm test` to verify all unit and component tests pass
  - Test Map Screen manually in Expo Go or simulator
  - Verify GPS permission flow works correctly
  - Verify map displays with markers and route
  - Verify distance and ETA are calculated and displayed
  - Verify error messages display correctly for various failure scenarios
  - Verify retry functionality works
  - Verify navigation to and from Map Screen works
  - Ensure all tests pass, ask the user if questions arise

- [ ] 15. Add environment variable documentation
  - [ ] 15.1 Update `.env.example` file
    - Add `MAPBOX_ACCESS_TOKEN=your_mapbox_token_here` entry
    - Add comment explaining how to obtain Mapbox token
    - _Requirements: 9.2_
  
  - [ ] 15.2 Update project README
    - Add section on Mapbox setup
    - Document how to create `.env` file from `.env.example`
    - Document how to obtain Mapbox access token
    - _Requirements: 9.2_

- [ ] 16. Final checkpoint - Complete feature validation
  - Run full test suite: `npm test`
  - Test complete user flow: Order Tracking → Map Screen → View route → Back navigation
  - Test with various restaurant locations
  - Test error scenarios: denied permissions, no GPS, API failures
  - Test cache functionality by viewing same route multiple times
  - Verify no API token is hardcoded in source files
  - Ensure all tests pass, ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- The implementation uses JavaScript (React Native with Expo)
- Mapbox GL SDK (`@rnmapbox/maps`) is the primary new dependency
- All other dependencies (expo-location, axios, Redux Toolkit) are already installed
- Session cache is in-memory only and clears on app restart
- API token must be configured in `.env` file before testing
- Checkpoints ensure incremental validation at key milestones
- Unit tests validate individual utilities and services
- Component tests validate UI components in isolation
- Integration tests validate navigation and data flow between components
