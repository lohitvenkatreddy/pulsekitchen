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
import {
  fetchPaymentMethods,
  addPaymentMethod,
  deletePaymentMethod,
  setDefaultPaymentMethod,
} from '../store/slices/paymentMethodsSlice';

// Luhn algorithm for card validation
const luhnCheck = (cardNumber) => {
  const digits = cardNumber.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;

  let sum = 0;
  let isEven = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i], 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
};

export default function PaymentMethodsScreen({ navigation }) {
  const dispatch = useDispatch();
  const { payment_methods, loading, error } = useSelector((state) => state.payment_methods);
  const { user } = useSelector((state) => state.auth);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [formData, setFormData] = useState({
    card_number: '',
    cardholder_name: '',
    expiration_date: '',
    cvv: '',
  });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    dispatch(fetchPaymentMethods());
  }, [dispatch]);

  const validateCardNumber = useCallback((cardNumber) => {
    const cleaned = cardNumber.replace(/\D/g, '');
    return luhnCheck(cleaned);
  }, []);

  const validateExpirationDate = useCallback((expirationDate) => {
    const [month, year] = expirationDate.split('/');
    if (!month || !year) return false;

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear() % 100;
    const currentMonth = currentDate.getMonth() + 1;

    const expYear = parseInt(year, 10);
    const expMonth = parseInt(month, 10);

    if (expYear < currentYear) return false;
    if (expYear === currentYear && expMonth < currentMonth) return false;

    return expMonth >= 1 && expMonth <= 12;
  }, []);

  const validateCVV = useCallback((cvv) => {
    const cleaned = cvv.replace(/\D/g, '');
    return cleaned.length >= 3 && cleaned.length <= 4;
  }, []);

  const validateForm = useCallback(() => {
    const errors = {};

    if (!formData.card_number.trim()) {
      errors.card_number = 'Card number is required';
    } else if (!validateCardNumber(formData.card_number)) {
      errors.card_number = 'Invalid card number';
    }

    if (!formData.cardholder_name.trim()) {
      errors.cardholder_name = 'Cardholder name is required';
    }

    if (!formData.expiration_date.trim()) {
      errors.expiration_date = 'Expiration date is required';
    } else if (!validateExpirationDate(formData.expiration_date)) {
      errors.expiration_date = 'Invalid or expired date (MM/YY)';
    }

    if (!formData.cvv.trim()) {
      errors.cvv = 'CVV is required';
    } else if (!validateCVV(formData.cvv)) {
      errors.cvv = 'CVV must be 3-4 digits';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData, validateCardNumber, validateExpirationDate, validateCVV]);

  const handleSavePaymentMethod = useCallback(async () => {
    if (!validateForm()) return;

    try {
      // Extract last 4 digits
      const lastFour = formData.card_number.replace(/\D/g, '').slice(-4);

      // In a real app, this would be tokenized by the payment service
      // For now, we'll just store the token reference
      await dispatch(
        addPaymentMethod({
          user_id: user?.id,
          card_token: `tok_${Date.now()}_${lastFour}`,
          card_last_four: lastFour,
          card_brand: 'card',
          card_exp_month: Number(formData.expiration_date.split('/')[0]),
          card_exp_year: Number(`20${formData.expiration_date.split('/')[1]}`),
          is_default: payment_methods.length === 0,
        })
      );

      resetForm();
      setShowPaymentForm(false);
      Alert.alert('Success', 'Payment method added successfully');
    } catch (err) {
      Alert.alert('Error', 'Failed to save payment method');
    }
  }, [formData, dispatch, validateForm]);

  const handleDeletePaymentMethod = useCallback((methodId) => {
    Alert.alert('Delete Payment Method', 'Are you sure you want to delete this payment method?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          dispatch(deletePaymentMethod(methodId));
        },
      },
    ]);
  }, [dispatch]);

  const handleSetDefault = useCallback((methodId) => {
    dispatch(setDefaultPaymentMethod(methodId));
  }, [dispatch]);

  const resetForm = useCallback(() => {
    setFormData({
      card_number: '',
      cardholder_name: '',
      expiration_date: '',
      cvv: '',
    });
    setFormErrors({});
  }, []);

  const handleExpirationDateChange = useCallback((text) => {
    // Auto-format MM/YY
    const cleaned = text.replace(/\D/g, '');
    let formatted = cleaned;

    if (cleaned.length >= 2) {
      formatted = cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4);
    }

    setFormData((prev) => ({ ...prev, expiration_date: formatted }));
    if (formErrors.expiration_date) {
      setFormErrors((prev) => ({ ...prev, expiration_date: '' }));
    }
  }, [formErrors.expiration_date]);

  const handleCardNumberChange = useCallback((text) => {
    // Format card number with spaces
    const cleaned = text.replace(/\D/g, '');
    const formatted = cleaned.replace(/(\d{4})/g, '$1 ').trim();

    setFormData((prev) => ({ ...prev, card_number: formatted }));
    if (formErrors.card_number) {
      setFormErrors((prev) => ({ ...prev, card_number: '' }));
    }
  }, [formErrors.card_number]);

  const renderPaymentCard = ({ item }) => (
    <View style={styles.paymentCard}>
      <View style={styles.cardHeader}>
        <View style={styles.cardInfo}>
          <Text style={styles.cardBrand}>{item.card_brand?.toUpperCase() || 'CARD'}</Text>
          <Text style={styles.cardNumber}>•••• •••• •••• {item.last_four_digits}</Text>
          {item.is_default && <Text style={styles.defaultBadge}>Default</Text>}
        </View>
        <TouchableOpacity onPress={() => handleDeletePaymentMethod(item.id)}>
          <Text style={styles.deleteButton}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.cardDetails}>
        <Text style={styles.cardholderName}>{item.cardholder_name || 'Cardholder'}</Text>
        <Text style={styles.expirationDate}>Expires: {item.expiration_date}</Text>
      </View>

      {!item.is_default && (
        <TouchableOpacity
          style={styles.setDefaultLink}
          onPress={() => handleSetDefault(item.id)}
        >
          <Text style={styles.setDefaultText}>Set as Default</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderPaymentForm = () => (
    <Modal
      visible={showPaymentForm}
      animationType="slide"
      transparent={false}
      onRequestClose={() => {
        setShowPaymentForm(false);
        resetForm();
      }}
    >
      <View style={styles.formContainer}>
        <View style={styles.formHeader}>
          <TouchableOpacity
            style={styles.closeButtonTouchable}
            hitSlop={{ top: 16, right: 16, bottom: 16, left: 16 }}
            onPress={() => {
              setShowPaymentForm(false);
              resetForm();
            }}
          >
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.formTitle}>Add Payment Method</Text>
          <View style={{ width: 30 }} />
        </View>

        <ScrollView style={styles.formContent}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Card Number *</Text>
            <TextInput
              style={[styles.input, formErrors.card_number && styles.inputError]}
              placeholder="1234 5678 9012 3456"
              value={formData.card_number}
              onChangeText={handleCardNumberChange}
              keyboardType="numeric"
              maxLength={19}
            />
            {formErrors.card_number && (
              <Text style={styles.errorText}>{formErrors.card_number}</Text>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Cardholder Name *</Text>
            <TextInput
              style={[styles.input, formErrors.cardholder_name && styles.inputError]}
              placeholder="John Doe"
              value={formData.cardholder_name}
              onChangeText={(text) => {
                setFormData((prev) => ({ ...prev, cardholder_name: text }));
                if (formErrors.cardholder_name)
                  setFormErrors((prev) => ({ ...prev, cardholder_name: '' }));
              }}
            />
            {formErrors.cardholder_name && (
              <Text style={styles.errorText}>{formErrors.cardholder_name}</Text>
            )}
          </View>

          <View style={styles.rowContainer}>
            <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.label}>Expiration Date *</Text>
              <TextInput
                style={[styles.input, formErrors.expiration_date && styles.inputError]}
                placeholder="MM/YY"
                value={formData.expiration_date}
                onChangeText={handleExpirationDateChange}
                keyboardType="numeric"
                maxLength={5}
              />
              {formErrors.expiration_date && (
                <Text style={styles.errorText}>{formErrors.expiration_date}</Text>
              )}
            </View>

            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.label}>CVV *</Text>
              <TextInput
                style={[styles.input, formErrors.cvv && styles.inputError]}
                placeholder="123"
                value={formData.cvv}
                onChangeText={(text) => {
                  const cleaned = text.replace(/\D/g, '').slice(0, 4);
                  setFormData((prev) => ({ ...prev, cvv: cleaned }));
                  if (formErrors.cvv) setFormErrors((prev) => ({ ...prev, cvv: '' }));
                }}
                keyboardType="numeric"
                maxLength={4}
                secureTextEntry
              />
              {formErrors.cvv && <Text style={styles.errorText}>{formErrors.cvv}</Text>}
            </View>
          </View>

          <View style={styles.securityNote}>
            <Text style={styles.securityText}>
              🔒 Your card information is secure and encrypted. We never store full card details.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSavePaymentMethod}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Add Payment Method</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );

  if (loading && payment_methods.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (error && payment_methods.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => dispatch(fetchPaymentMethods())}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={payment_methods}
        keyExtractor={(item, index) => `payment-method-${item.id ?? item.payment_token ?? item.card_last_four}-${index}`}
        renderItem={renderPaymentCard}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No payment methods</Text>
            <Text style={styles.emptyText}>Add a payment method to get started</Text>
          </View>
        }
        ListFooterComponent={
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowPaymentForm(true)}
          >
            <Text style={styles.addButtonText}>+ Add Payment Method</Text>
          </TouchableOpacity>
        }
      />
      {renderPaymentForm()}
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
  paymentCard: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: 10,
    padding: 15,
    borderRadius: 12,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardBrand: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  cardNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginTop: 4,
    letterSpacing: 2,
  },
  defaultBadge: {
    backgroundColor: '#4CAF50',
    color: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  deleteButton: {
    fontSize: 20,
    color: '#f44336',
    fontWeight: 'bold',
  },
  cardDetails: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  cardholderName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  expirationDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  setDefaultLink: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  setDefaultText: {
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
  rowContainer: {
    flexDirection: 'row',
  },
  securityNote: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  securityText: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '500',
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
