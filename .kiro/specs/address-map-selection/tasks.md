# Implementation Plan: Address Map Selection

## Overview

This implementation plan creates a simple map-based address selection feature for the React Native food delivery app. Users can tap on an interactive Mapbox map to drop a pin, view coordinates, and save the location to their profile. The implementation uses TypeScript with existing libraries (Mapbox GL, expo-location, Redux Toolkit) and follows the established project patterns.

## Tasks

- [ ] 1. Set up Redux slice and TypeScript types
  - Create `mapSelectionSlice.ts` with state, actions, and async thunk for saving location
  - Create `map.types.ts` with Coordinates, MapSelectionState, and MapConfig interfaces
  - Add coordinate validation utility functions
  - _Requirements: 1.5, 3.5, 4.1-4.5, 5.1-5.7_

- [ ] 2. Implement location and token services
  - Create `locationService.ts` with GPS permission handling and location retrieval
  - Create `tokenService.ts` to read Mapbox token from environment variables
  - Implement 10-second timeout for GPS requests
  - Add error handling for permission denial and GPS failures
  - _Requirements: 1.1-1.5, 6.1-6.5, 7.1-7.5_

- [ ] 3. Create coordinate display and formatting utilities
  - Create `coordinateUtils.ts` with formatting functions (6 decimal places)
  - Create `CoordinateDisplay.tsx` component to show latitude/longitude
  - Handle null state with "Tap on the map to select a location" message
  - _Requirements: 4.1-4.5_

- [ ] 4. Implement map components
  - Create `PinMarker.tsx` component using Mapbox PointAnnotation
  - Create `MapView.tsx` wrapper component for Mapbox GL
  - Configure map with zoom levels, style URL, and gesture support
  - Implement single-pin logic (remove previous pin when new one is placed)
  - _Requirements: 2.1-2.5, 3.1-3.5_

- [ ] 5. Build MapSelectionScreen
  - Create `MapSelectionScreen.tsx` with map, coordinate display, and save button
  - Implement `handleMapPress` to capture tap coordinates and place pin
  - Implement `handleSaveLocation` to dispatch Redux thunk
  - Request GPS permissions on mount and center map on user location
  - Disable save button when no pin is placed
  - _Requirements: 1.1-1.5, 2.1-2.5, 3.1-3.5, 4.1-4.5, 5.1-5.7_

- [ ] 6. Implement error handling and user feedback
  - Add error message display for GPS failures (permission denied, timeout, unavailable)
  - Add error message display for API failures (network, timeout, server errors)
  - Add success message display after successful save
  - Add loading indicators during GPS requests and API calls
  - Implement retry functionality for failed operations
  - _Requirements: 7.1-7.5, 8.1-8.5_

- [ ] 7. Integrate with navigation and backend API
  - Add navigation route for MapSelectionScreen
  - Add "Select on Map" button in address management screen
  - Implement POST request to `/api/users/address` with auth token
  - Navigate back to address management after successful save
  - _Requirements: 5.1-5.7, 9.1-9.5_

- [ ] 8. Configure environment and test setup
  - Add `.env.example` with `EXPO_PUBLIC_MAPBOX_TOKEN` placeholder
  - Update `.gitignore` to exclude `.env` file
  - Add accessibility labels for screen readers
  - Test on device with various GPS scenarios (permission denied, no signal, etc.)
  - _Requirements: 6.1-6.5, 7.1-7.5, 8.1-8.5_

- [ ] 9. Final checkpoint - Ensure all functionality works
  - Verify GPS location detection and map centering
  - Verify pin placement and coordinate display
  - Verify save functionality with backend API
  - Verify error handling for GPS and API failures
  - Verify navigation flow (to/from address management)
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- This is a **minimal implementation** focused on core functionality
- No reverse geocoding, address preview, or multiple address management
- Uses existing libraries: `@rnmapbox/maps`, `expo-location`, `axios`, Redux Toolkit
- All code examples use TypeScript (as specified in design document)
- Mapbox token must be added to `.env` file before testing
- Test on physical device for accurate GPS behavior
