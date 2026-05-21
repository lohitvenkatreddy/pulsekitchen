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
import {
  requestLocationPermission,
  getCurrentLocation,
  getLocationErrorMessage,
} from '../services/locationService';
import { validateCoordinates } from '../utils/coordinateUtils';
import CoordinateDisplay from '../components/CoordinateDisplay';
import { MAP_CONFIG } from '../types/map.types';

export default function MapSelectionScreen({ navigation }) {
  const dispatch = useDispatch();
  const { userLocation, selectedLocation, isLoading, error, isSaving, saveSuccess } =
    useSelector((state) => state.mapSelection);

  const [latitude, setLatitude] = useState(String(MAP_CONFIG.defaultCenter.latitude));
  const [longitude, setLongitude] = useState(String(MAP_CONFIG.defaultCenter.longitude));
  const [label, setLabel] = useState('Selected Location');

  useEffect(() => {
    requestUserLocation();

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
  }, [userLocation, dispatch]);

  useEffect(() => {
    if (saveSuccess) {
      Alert.alert('Success', 'Location saved successfully', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    }
  }, [saveSuccess, navigation]);

  useEffect(() => {
    if (error && !isLoading && !isSaving && !saveSuccess) {
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
      const permission = await requestLocationPermission();

      if (!permission.granted) {
        dispatch(setError(getLocationErrorMessage('permission_denied')));
        dispatch(setLoading(false));
        return;
      }

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
        place: {
          name: label.trim() || 'Selected Location',
          formattedAddress: label.trim() || 'Selected Location',
          country: 'US',
        },
      })
    );
  };

  const handleSaveLocation = () => {
    if (!selectedLocation) {
      Alert.alert('No Location Selected', 'Please choose your current location or enter coordinates');
      return;
    }

    dispatch(saveLocationToProfile(selectedLocation));
  };

  return (
    <View style={styles.container}>
      <View style={styles.selector}>
        <Text style={styles.title}>Select Address</Text>
        <Text style={styles.helpText}>
          Use your current location or enter coordinates manually. This avoids map rendering issues
          in APK builds and still saves the address to your profile.
        </Text>

        <View style={styles.formGroup}>
          <Text style={styles.inputLabel}>Label</Text>
          <TextInput
            style={styles.input}
            value={label}
            onChangeText={setLabel}
            placeholder="Home, Work, or place name"
          />
        </View>

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

        <TouchableOpacity style={styles.secondaryButton} onPress={requestUserLocation}>
          <Text style={styles.secondaryButtonText}>Use My Current Location</Text>
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
  formGroup: {
    marginBottom: 14,
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
    borderWidth: 1,
    borderColor: '#d9dde3',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#111',
    fontSize: 16,
    fontWeight: '600',
  },
  statusPanel: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  statusText: {
    marginLeft: 8,
    color: '#333',
  },
  errorContainer: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
    textAlign: 'center',
  },
  bottomPanel: {
    backgroundColor: '#fff',
    paddingBottom: 20,
  },
  saveButton: {
    backgroundColor: '#000',
    marginHorizontal: 20,
    marginTop: 10,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#999',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  backButton: {
    backgroundColor: '#f5f5f5',
    marginHorizontal: 20,
    marginTop: 10,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
});
