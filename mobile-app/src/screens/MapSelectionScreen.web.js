import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  setUserLocation,
  setSelectedLocation,
  setLoading,
  setError,
  saveLocationToProfile,
  resetState,
} from '../store/slices/mapSelectionSlice';
import { validateCoordinates } from '../utils/coordinateUtils';
import CoordinateDisplay from '../components/CoordinateDisplay';
import { MAP_CONFIG } from '../types/map.types';

export default function MapSelectionScreen({ navigation }) {
  const dispatch = useDispatch();
  const { userLocation, selectedLocation, isLoading, error, isSaving, saveSuccess } =
    useSelector((state) => state.mapSelection);

  const initialLatitude = String(MAP_CONFIG.defaultCenter.latitude);
  const initialLongitude = String(MAP_CONFIG.defaultCenter.longitude);
  const [latitude, setLatitude] = useState(initialLatitude);
  const [longitude, setLongitude] = useState(initialLongitude);

  useEffect(() => {
    requestBrowserLocation();

    return () => {
      dispatch(resetState());
    };
  }, []);

  useEffect(() => {
    if (userLocation) {
      setLatitude(String(userLocation.latitude));
      setLongitude(String(userLocation.longitude));
      dispatch(setSelectedLocation(userLocation));
    }
  }, [userLocation]);

  useEffect(() => {
    if (saveSuccess) {
      Alert.alert('Success', 'Location saved successfully', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    }
  }, [saveSuccess]);

  const requestBrowserLocation = () => {
    dispatch(setLoading(true));
    dispatch(setError(null));

    if (!navigator?.geolocation) {
      dispatch(setError('Browser location is unavailable. Enter coordinates manually.'));
      dispatch(setLoading(false));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        dispatch(
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          })
        );
        dispatch(setLoading(false));
      },
      () => {
        dispatch(setError('Allow location access or enter coordinates manually.'));
        dispatch(setLoading(false));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  const handleUseCoordinates = () => {
    const parsedLatitude = Number(latitude);
    const parsedLongitude = Number(longitude);
    const validation = validateCoordinates(parsedLatitude, parsedLongitude);

    if (!validation.valid) {
      Alert.alert('Invalid Location', validation.error);
      return;
    }

    dispatch(
      setSelectedLocation({
        latitude: parsedLatitude,
        longitude: parsedLongitude,
      })
    );
  };

  const handleSaveLocation = () => {
    if (!selectedLocation) {
      Alert.alert('No Location Selected', 'Please choose or enter a location first');
      return;
    }

    dispatch(saveLocationToProfile(selectedLocation));
  };

  return (
    <View style={styles.container}>
      <View style={styles.selector}>
        <Text style={styles.title}>Select Location</Text>
        <Text style={styles.helpText}>
          Browser maps are not available in this build. Use your current location or enter
          coordinates manually.
        </Text>

        <View style={styles.inputRow}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Latitude</Text>
            <TextInput
              style={styles.input}
              value={latitude}
              onChangeText={setLatitude}
              keyboardType="decimal-pad"
              inputMode="decimal"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Longitude</Text>
            <TextInput
              style={styles.input}
              value={longitude}
              onChangeText={setLongitude}
              keyboardType="decimal-pad"
              inputMode="decimal"
            />
          </View>
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={handleUseCoordinates}>
          <Text style={styles.primaryButtonText}>Use These Coordinates</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={requestBrowserLocation}>
          <Text style={styles.secondaryButtonText}>Use My Browser Location</Text>
        </TouchableOpacity>
      </View>

      {isLoading && (
        <View style={styles.statusPanel}>
          <ActivityIndicator size="small" color="#000" />
          <Text style={styles.statusText}>Getting your location...</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.bottomPanel}>
        <CoordinateDisplay coordinates={selectedLocation} />

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

        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f7f9',
  },
  selector: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d9dde3',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111',
  },
  primaryButton: {
    backgroundColor: '#000',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d9dde3',
  },
  secondaryButtonText: {
    color: '#111',
    fontSize: 16,
    fontWeight: '600',
  },
  statusPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  statusText: {
    fontSize: 14,
    color: '#333',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
  },
  bottomPanel: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
