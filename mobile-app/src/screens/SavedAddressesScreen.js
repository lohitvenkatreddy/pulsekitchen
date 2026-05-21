import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import * as Location from 'expo-location';
import {
  fetchAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from '../store/slices/userAddressesSlice';

export default function SavedAddressesScreen({ navigation }) {
  const dispatch = useDispatch();
  const { addresses, loading, error } = useSelector((state) => state.user_addresses);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    label: '',
    street_address_1: '',
    street_address_2: '',
    city: '',
    region_state: '',
    postal_code: '',
    country: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  useEffect(() => {
    dispatch(fetchAddresses());
  }, [dispatch]);

  const validateForm = useCallback(() => {
    const errors = {};
    if (!formData.label.trim()) errors.label = 'Label is required';
    if (!formData.street_address_1.trim()) errors.street_address_1 = 'Street address is required';
    if (!formData.city.trim()) errors.city = 'City is required';
    if (!formData.postal_code.trim()) errors.postal_code = 'Postal code is required';
    if (!formData.country.trim()) errors.country = 'Country is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  const handleSaveAddress = useCallback(async () => {
    if (!validateForm()) return;

    try {
      if (isEditing && selectedAddress) {
        await dispatch(updateAddress({ id: selectedAddress.id, ...formData }));
      } else {
        await dispatch(addAddress(formData));
      }
      resetForm();
      setShowAddressForm(false);
    } catch (err) {
      Alert.alert('Error', 'Failed to save address');
    }
  }, [formData, isEditing, selectedAddress, dispatch, validateForm]);

  const handleDeleteAddress = useCallback((addressId) => {
    Alert.alert('Delete Address', 'Are you sure you want to delete this address?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          dispatch(deleteAddress(addressId));
        },
      },
    ]);
  }, [dispatch]);

  const handleSetDefault = useCallback((addressId) => {
    dispatch(setDefaultAddress(addressId));
  }, [dispatch]);

  const handleUseCurrentLocation = useCallback(async () => {
    try {
      setIsLoadingLocation(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to use this feature');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      // Reverse geocoding - in a real app, you'd use a geocoding service
      // For now, we'll just populate with coordinates as placeholder
      setFormData((prev) => ({
        ...prev,
        street_address_1: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
      }));
    } catch (err) {
      Alert.alert('Error', 'Failed to get current location');
    } finally {
      setIsLoadingLocation(false);
    }
  }, []);

  const resetForm = useCallback(() => {
    setFormData({
      label: '',
      street_address_1: '',
      street_address_2: '',
      city: '',
      region_state: '',
      postal_code: '',
      country: '',
    });
    setFormErrors({});
    setSelectedAddress(null);
    setIsEditing(false);
  }, []);

  const handleEditAddress = useCallback((address) => {
    setSelectedAddress(address);
    setFormData({
      label: address.label,
      street_address_1: address.street_address_1,
      street_address_2: address.street_address_2 || '',
      city: address.city,
      region_state: address.region_state,
      postal_code: address.postal_code,
      country: address.country,
    });
    setIsEditing(true);
    setShowAddressForm(true);
  }, []);

  const handleAddNewAddress = useCallback(() => {
    resetForm();
    setShowAddressForm(true);
  }, [resetForm]);

  const renderAddressCard = ({ item }) => (
    <View style={styles.addressCard}>
      <View style={styles.addressHeader}>
        <View style={styles.addressInfo}>
          <Text style={styles.addressLabel}>{item.label}</Text>
          {item.is_default && <Text style={styles.defaultBadge}>Default</Text>}
        </View>
        <TouchableOpacity onPress={() => handleEditAddress(item)}>
          <Text style={styles.actionButton}>✎</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.addressText}>{item.street_address_1}</Text>
      {item.street_address_2 && <Text style={styles.addressText}>{item.street_address_2}</Text>}
      <Text style={styles.addressText}>
        {item.city}, {item.region_state} {item.postal_code}
      </Text>
      <Text style={styles.addressText}>{item.country}</Text>

      <View style={styles.addressActions}>
        {!item.is_default && (
          <TouchableOpacity
            style={styles.actionLink}
            onPress={() => handleSetDefault(item.id)}
          >
            <Text style={styles.actionLinkText}>Set as Default</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.actionLink}
          onPress={() => handleDeleteAddress(item.id)}
        >
          <Text style={[styles.actionLinkText, { color: '#f44336' }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderAddressForm = () => (
    <Modal
      visible={showAddressForm}
      animationType="slide"
      transparent={false}
      onRequestClose={() => {
        setShowAddressForm(false);
        resetForm();
      }}
    >
      <View style={styles.formContainer}>
        <View style={styles.formHeader}>
          <TouchableOpacity
            style={styles.closeButtonTouchable}
            hitSlop={{ top: 16, right: 16, bottom: 16, left: 16 }}
            onPress={() => {
              setShowAddressForm(false);
              resetForm();
            }}
          >
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.formTitle}>{isEditing ? 'Edit Address' : 'Add Address'}</Text>
          <View style={{ width: 30 }} />
        </View>

        <ScrollView style={styles.formContent}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Label *</Text>
            <TextInput
              style={[styles.input, formErrors.label && styles.inputError]}
              placeholder="e.g., Home, Work"
              value={formData.label}
              onChangeText={(text) => {
                setFormData((prev) => ({ ...prev, label: text }));
                if (formErrors.label) setFormErrors((prev) => ({ ...prev, label: '' }));
              }}
            />
            {formErrors.label && <Text style={styles.errorText}>{formErrors.label}</Text>}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Street Address 1 *</Text>
            <TextInput
              style={[styles.input, formErrors.street_address_1 && styles.inputError]}
              placeholder="Street address"
              value={formData.street_address_1}
              onChangeText={(text) => {
                setFormData((prev) => ({ ...prev, street_address_1: text }));
                if (formErrors.street_address_1) setFormErrors((prev) => ({ ...prev, street_address_1: '' }));
              }}
            />
            {formErrors.street_address_1 && (
              <Text style={styles.errorText}>{formErrors.street_address_1}</Text>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Street Address 2</Text>
            <TextInput
              style={styles.input}
              placeholder="Apartment, suite, etc. (optional)"
              value={formData.street_address_2}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, street_address_2: text }))
              }
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>City *</Text>
            <TextInput
              style={[styles.input, formErrors.city && styles.inputError]}
              placeholder="City"
              value={formData.city}
              onChangeText={(text) => {
                setFormData((prev) => ({ ...prev, city: text }));
                if (formErrors.city) setFormErrors((prev) => ({ ...prev, city: '' }));
              }}
            />
            {formErrors.city && <Text style={styles.errorText}>{formErrors.city}</Text>}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Region/State *</Text>
            <TextInput
              style={[styles.input, formErrors.region_state && styles.inputError]}
              placeholder="Region or state"
              value={formData.region_state}
              onChangeText={(text) => {
                setFormData((prev) => ({ ...prev, region_state: text }));
                if (formErrors.region_state) setFormErrors((prev) => ({ ...prev, region_state: '' }));
              }}
            />
            {formErrors.region_state && (
              <Text style={styles.errorText}>{formErrors.region_state}</Text>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Postal Code *</Text>
            <TextInput
              style={[styles.input, formErrors.postal_code && styles.inputError]}
              placeholder="Postal code"
              value={formData.postal_code}
              onChangeText={(text) => {
                setFormData((prev) => ({ ...prev, postal_code: text }));
                if (formErrors.postal_code) setFormErrors((prev) => ({ ...prev, postal_code: '' }));
              }}
            />
            {formErrors.postal_code && (
              <Text style={styles.errorText}>{formErrors.postal_code}</Text>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Country *</Text>
            <TextInput
              style={[styles.input, formErrors.country && styles.inputError]}
              placeholder="Country"
              value={formData.country}
              onChangeText={(text) => {
                setFormData((prev) => ({ ...prev, country: text }));
                if (formErrors.country) setFormErrors((prev) => ({ ...prev, country: '' }));
              }}
            />
            {formErrors.country && <Text style={styles.errorText}>{formErrors.country}</Text>}
          </View>

          <TouchableOpacity
            style={styles.locationButton}
            onPress={handleUseCurrentLocation}
            disabled={isLoadingLocation}
          >
            {isLoadingLocation ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.locationButtonText}>📍 Use Current Location</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.mapButton}
            onPress={() => {
              setShowAddressForm(false);
              navigation.navigate('MapSelection');
            }}
          >
            <Text style={styles.mapButtonText}>🗺️ Select on Map</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSaveAddress}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>
                {isEditing ? 'Update Address' : 'Add Address'}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );

  if (loading && addresses.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (error && addresses.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>
          {typeof error === 'string' ? error : 'An error occurred'}
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => dispatch(fetchAddresses())}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={addresses}
        keyExtractor={(item, index) => `saved-address-${item.id ?? item.label}-${index}`}
        renderItem={renderAddressCard}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No saved addresses</Text>
            <Text style={styles.emptyText}>Add your first address to get started</Text>
          </View>
        }
        ListFooterComponent={
          <TouchableOpacity style={styles.addButton} onPress={handleAddNewAddress}>
            <Text style={styles.addButtonText}>+ Add New Address</Text>
          </TouchableOpacity>
        }
      />
      {renderAddressForm()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  addressCard: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: 10,
    padding: 15,
    borderRadius: 12,
    elevation: 2,
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  addressInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  addressLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  defaultBadge: {
    backgroundColor: '#4CAF50',
    color: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  actionButton: {
    fontSize: 20,
    color: '#2196F3',
  },
  addressText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  addressActions: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionLink: {
    marginRight: 15,
  },
  actionLinkText: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 50,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  addButton: {
    backgroundColor: '#000',
    marginHorizontal: 15,
    marginVertical: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#f44336',
    fontSize: 12,
    marginTop: 4,
  },
  retryButton: {
    backgroundColor: '#000',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
    marginTop: 20,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  formContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  closeButton: {
    fontSize: 24,
    color: '#333',
    fontWeight: 'bold',
  },
  closeButtonTouchable: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  formContent: {
    flex: 1,
    padding: 15,
  },
  formGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#333',
  },
  inputError: {
    borderColor: '#f44336',
  },
  locationButton: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  locationButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  mapButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
  },
  mapButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: '#000',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
