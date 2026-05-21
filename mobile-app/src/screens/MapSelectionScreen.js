import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useDispatch, useSelector } from 'react-redux';
import {
  setUserLocation,
  setSelectedLocation,
  clearSelectedLocation,
  setLoading,
  setError,
  saveLocationToProfile,
  resetState,
} from '../store/slices/mapSelectionSlice';
import {
  requestLocationPermission,
  getCurrentLocation,
  reverseGeocodeLocation,
  getLocationErrorMessage,
} from '../services/locationService';
import { validateCoordinates } from '../utils/coordinateUtils';
import CoordinateDisplay from '../components/CoordinateDisplay';
import { MAP_CONFIG } from '../types/map.types';

export default function MapSelectionScreen({ navigation }) {
  const dispatch = useDispatch();
  const { userLocation, selectedLocation, isLoading, error, isSaving, saveSuccess } =
    useSelector((state) => state.mapSelection);
  const [isResolvingPlace, setIsResolvingPlace] = useState(false);

  const [mapRegion, setMapRegion] = useState({
    latitude: MAP_CONFIG.defaultCenter.latitude,
    longitude: MAP_CONFIG.defaultCenter.longitude,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  useEffect(() => {
    requestUserLocation();
    
    return () => {
      // Clean up on unmount
      dispatch(resetState());
    };
  }, []);

  useEffect(() => {
    if (userLocation) {
      // Center map on user location
      setMapRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    }
  }, [userLocation]);

  useEffect(() => {
    if (saveSuccess) {
      Alert.alert(
        'Success',
        'Location saved successfully',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    }
  }, [saveSuccess]);

  useEffect(() => {
    // Show error alert when save fails (but not for location permission errors)
    if (error && !isLoading && isSaving === false && !saveSuccess) {
      // Only show alert for save errors, not location errors
      // Location errors are shown inline in the UI
      const errorString = typeof error === 'string' ? error : JSON.stringify(error);
      if (errorString.includes('save') || errorString.includes('address')) {
        Alert.alert('Error', errorString);
      }
    }
  }, [error, isLoading, isSaving, saveSuccess]);

  const requestUserLocation = async () => {
    dispatch(setLoading(true));
    dispatch(setError(null));

    try {
      // Request permission
      const permission = await requestLocationPermission();
      
      if (!permission.granted) {
        dispatch(setError(getLocationErrorMessage('permission_denied')));
        dispatch(setLoading(false));
        return;
      }

      // Get current location
      const location = await getCurrentLocation();
      
      if (location) {
        dispatch(setUserLocation(location));
      } else {
        dispatch(setError(getLocationErrorMessage('timeout')));
      }
    } catch (err) {
      console.error('[MapSelectionScreen] Location error:', err);
      dispatch(setError(getLocationErrorMessage('error')));
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleMapPress = async (event) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    
    // Validate coordinates
    const validation = validateCoordinates(latitude, longitude);
    if (!validation.valid) {
      Alert.alert('Invalid Location', validation.error);
      return;
    }

    const coordinates = { latitude, longitude };
    dispatch(setSelectedLocation(coordinates));
    setIsResolvingPlace(true);

    try {
      const place = await reverseGeocodeLocation(coordinates);
      dispatch(setSelectedLocation({ ...coordinates, place }));
    } catch (err) {
      console.log('[MapSelectionScreen] Reverse geocode error:', err);
    } finally {
      setIsResolvingPlace(false);
    }
  };

  const handleSaveLocation = () => {
    if (!selectedLocation) {
      Alert.alert('No Location Selected', 'Please tap on the map to select a location');
      return;
    }

    dispatch(saveLocationToProfile(selectedLocation));
  };

  const handleRetry = () => {
    requestUserLocation();
  };

  return (
    <View style={styles.container}>
      {/* Map View */}
      <MapView
        style={styles.map}
        region={mapRegion}
        onPress={handleMapPress}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
        loadingEnabled={true}
      >
        {/* Selected Location Marker */}
        {selectedLocation && (
          <Marker
            coordinate={selectedLocation}
            pinColor="red"
            title={selectedLocation.place?.name || 'Selected Location'}
            description={selectedLocation.place?.formattedAddress || 'Resolving place name...'}
          />
        )}
      </MapView>

      {/* Loading Overlay */}
      {(isLoading || isResolvingPlace) && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>
            {isResolvingPlace ? 'Finding place name...' : 'Getting your location...'}
          </Text>
        </View>
      )}

      {/* Error Message */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom Panel */}
      <View style={styles.bottomPanel}>
        {/* Coordinate Display */}
        <CoordinateDisplay coordinates={selectedLocation} />

        {/* Save Button */}
        <TouchableOpacity
          style={[
            styles.saveButton,
            (!selectedLocation || isSaving) && styles.saveButtonDisabled,
          ]}
          onPress={handleSaveLocation}
          disabled={!selectedLocation || isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Location</Text>
          )}
        </TouchableOpacity>

        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
  errorContainer: {
    position: 'absolute',
    top: 60,
    left: 15,
    right: 15,
    backgroundColor: '#ffebee',
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorText: {
    flex: 1,
    color: '#c62828',
    fontSize: 14,
  },
  retryButton: {
    backgroundColor: '#f44336',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 4,
    marginLeft: 10,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomPanel: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  saveButton: {
    backgroundColor: '#000',
    margin: 15,
    marginTop: 10,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  backButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
});
