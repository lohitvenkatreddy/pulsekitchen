import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Animated,
  Easing,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useDispatch, useSelector } from 'react-redux';
import { cancelOrder, createOrder } from '../store/slices/orderSlice';
import { clearCart, updateCartItemQuantity } from '../store/slices/cartSlice';
import { fetchAddresses } from '../store/slices/userAddressesSlice';
import { fetchPaymentMethods } from '../store/slices/paymentMethodsSlice';
import paymentService from '../services/paymentService';
import orderService from '../services/orderService';
import { formatCurrency } from '../utils/currency';

const PRIORITY_OPTIONS = [
  {
    type: 'normal',
    name: 'Normal Delivery',
    fee: 0.0,
    icon: '🚚',
    description: 'Standard delivery time',
    color: '#4CAF50',
  },
  {
    type: 'student_urgent',
    name: 'Student (Time-bound)',
    fee: 30.0,
    icon: '🎓',
    description: 'Between classes or exams',
    color: '#2196F3',
  },
  {
    type: 'travel_emergency',
    name: 'Travel Emergency',
    fee: 40.0,
    icon: '✈️',
    description: 'Catching a flight/train',
    color: '#FF9800',
  },
  {
    type: 'hospital_emergency',
    name: 'Hospital Emergency',
    fee: 50.0,
    icon: '🚨',
    description: 'Urgent medical situation',
    color: '#f44336',
  },
  {
    type: 'vip',
    name: 'VIP Priority',
    fee: 60.0,
    icon: '⭐',
    description: 'Fastest delivery available',
    color: '#9C27B0',
  },
];

const EMERGENCY_PRIORITY_TYPES = ['travel_emergency', 'hospital_emergency'];

export default function CartScreen({ navigation }) {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { items: cartItems, restaurant } = useSelector((state) => state.cart);
  const { addresses, default_address_id } = useSelector((state) => state.user_addresses);
  const { payment_methods, default_payment_id } = useSelector((state) => state.payment_methods);

  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('normal');
  const [showPriorityOptions, setShowPriorityOptions] = useState(false);
  const [successState, setSuccessState] = useState(null);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [selectedPaymentId, setSelectedPaymentId] = useState(null);
  const [studentIdImage, setStudentIdImage] = useState(null);
  const [studentVerification, setStudentVerification] = useState(null);
  const [isVerifyingStudentId, setIsVerifyingStudentId] = useState(false);
  const [emergencyDocumentImage, setEmergencyDocumentImage] = useState(null);
  const [emergencyVerification, setEmergencyVerification] = useState(null);
  const [isVerifyingEmergency, setIsVerifyingEmergency] = useState(false);

  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.88)).current;
  const checkScale = useRef(new Animated.Value(0.4)).current;
  const checkRotate = useRef(new Animated.Value(-18)).current;
  const pulseRing = useRef(new Animated.Value(0.2)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const shimmerTranslate = useRef(new Animated.Value(-220)).current;
  const sparkAnimations = useRef(
    Array.from({ length: 6 }, () => ({
      translateY: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0.5),
    }))
  ).current;

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = 3.99;
  const priorityOption = PRIORITY_OPTIONS.find((p) => p.type === selectedPriority);
  const priorityFee = priorityOption?.fee || 0;
  const total = subtotal + deliveryFee + priorityFee;
  const selectedAddress = addresses.find((a) => a.id === selectedAddressId) || null;
  const selectedPaymentMethod = payment_methods.find((m) => m.id === selectedPaymentId) || null;
  const isEmergencyPriority = EMERGENCY_PRIORITY_TYPES.includes(selectedPriority);
  const selectedEmergencyType =
    selectedPriority === 'travel_emergency' ? 'travel' : 'hospital';

  useEffect(() => {
    dispatch(fetchAddresses());
    dispatch(fetchPaymentMethods());
  }, [dispatch]);

  useEffect(() => {
    if (!selectedAddressId && default_address_id) {
      setSelectedAddressId(default_address_id);
    }
  }, [default_address_id, selectedAddressId]);

  useEffect(() => {
    if (!selectedPaymentId && default_payment_id) {
      setSelectedPaymentId(default_payment_id);
    }
  }, [default_payment_id, selectedPaymentId]);

  useEffect(() => {
    if (!successState) {
      return undefined;
    }

    overlayOpacity.setValue(0);
    cardScale.setValue(0.88);
    checkScale.setValue(0.4);
    checkRotate.setValue(-18);
    pulseRing.setValue(0.2);
    glowOpacity.setValue(0);
    shimmerTranslate.setValue(-220);
    sparkAnimations.forEach((spark) => {
      spark.translateY.setValue(0);
      spark.opacity.setValue(0);
      spark.scale.setValue(0.5);
    });

    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(cardScale, {
        toValue: 1,
        friction: 7,
        tension: 70,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(120),
        Animated.spring(checkScale, {
          toValue: 1,
          friction: 5,
          tension: 110,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(120),
        Animated.timing(checkRotate, {
          toValue: 0,
          duration: 320,
          easing: Easing.out(Easing.back(1.8)),
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(100),
        Animated.timing(glowOpacity, {
          toValue: 1,
          duration: 350,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(200),
        Animated.timing(shimmerTranslate, {
          toValue: 220,
          duration: 900,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseRing, {
            toValue: 1,
            duration: 1200,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pulseRing, {
            toValue: 0.2,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
        { iterations: 2 }
      ),
      ...sparkAnimations.map((spark, index) =>
        Animated.sequence([
          Animated.delay(180 + index * 55),
          Animated.parallel([
            Animated.timing(spark.opacity, {
              toValue: 1,
              duration: 140,
              useNativeDriver: true,
            }),
            Animated.spring(spark.scale, {
              toValue: 1,
              friction: 5,
              tension: 110,
              useNativeDriver: true,
            }),
            Animated.timing(spark.translateY, {
              toValue: -34 - index * 4,
              duration: 540,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(spark.opacity, {
            toValue: 0,
            duration: 180,
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();

    const navigationTimer = setTimeout(() => {
      navigation.replace('OrderTracking', { orderId: successState.orderId });
    }, 2100);

    return () => clearTimeout(navigationTimer);
  }, [
    successState,
    navigation,
    overlayOpacity,
    cardScale,
    checkScale,
    checkRotate,
    pulseRing,
    glowOpacity,
    shimmerTranslate,
    sparkAnimations,
  ]);

  const handleCheckout = async () => {
    if (!selectedAddress && !deliveryAddress) {
      Alert.alert('Error', 'Please select or enter a delivery address');
      return;
    }
    if (!selectedPaymentMethod) {
      Alert.alert('Payment Required', 'Please select a payment method before placing the order.');
      return;
    }
    if (!user?.id) {
      Alert.alert('Error', 'Please sign in to place an order.');
      return;
    }
    if (!restaurant?.id || cartItems.length === 0) {
      Alert.alert('Error', 'Your cart is empty.');
      return;
    }
    if (selectedPriority === 'student_urgent' && !studentVerification?.verified) {
      Alert.alert('Student ID Required', 'Please verify your college ID card before using Student priority.');
      return;
    }
    if (isEmergencyPriority && emergencyVerification?.status !== 'approved') {
      Alert.alert(
        'Emergency Verification Required',
        'Please verify your travel or hospital document before using emergency priority.'
      );
      return;
    }

    try {
      const resolvedAddress = selectedAddress
        ? [
            selectedAddress.line1,
            selectedAddress.line2,
            selectedAddress.city,
            selectedAddress.region,
            selectedAddress.postal_code,
            selectedAddress.country,
          ]
            .filter(Boolean)
            .join(', ')
        : deliveryAddress;
      const orderData = {
        user_id: user.id,
        restaurant_id: restaurant.id,
        items: cartItems.map((item) => ({
          item_id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
        total_amount: total,
        delivery_address: {
          address: resolvedAddress,
          latitude: selectedAddress?.latitude,
          longitude: selectedAddress?.longitude,
        },
        special_instructions: specialInstructions,
        order_type: selectedPriority,
        student_verification_id:
          selectedPriority === 'student_urgent'
            ? studentVerification?.verification_id
            : undefined,
        emergency_verification_id:
          isEmergencyPriority
            ? emergencyVerification?.verification_id
            : undefined,
        is_vip: user?.role === 'vip' || selectedPriority === 'vip',
        user_type: selectedPriority === 'hospital_emergency' ? 'hospital' : 'regular',
        pickup_location:
          restaurant.latitude != null && restaurant.longitude != null
            ? { latitude: restaurant.latitude, longitude: restaurant.longitude }
            : undefined,
      };

      const result = await dispatch(createOrder(orderData)).unwrap();
      try {
        await paymentService.processPayment({
          order_id: result.id,
          user_id: user.id,
          amount: subtotal + deliveryFee,
          payment_method: selectedPaymentMethod.method_type || 'card',
          priority_type: selectedPriority,
        });
      } catch (paymentError) {
        await dispatch(cancelOrder(result.id)).unwrap().catch(() => null);
        throw paymentError;
      }
      const score =
        typeof result.priority_score === 'number'
          ? result.priority_score.toFixed(1)
          : String(result.priority_score ?? '');
      const level = String(result.priority_level ?? '');
      dispatch(clearCart());
      setSuccessState({
        orderId: result.id,
        level,
        score,
      });
    } catch (err) {
      const message =
        typeof err === 'string'
          ? err
          : err != null && typeof err === 'object' && 'message' in err
            ? String(err.message)
            : 'Could not place order. Please try again.';
      Alert.alert('Error', message);
    }
  };

  const handleSelectPriority = (priorityType) => {
    const emergencyTypeChanged =
      EMERGENCY_PRIORITY_TYPES.includes(priorityType) &&
      EMERGENCY_PRIORITY_TYPES.includes(selectedPriority) &&
      priorityType !== selectedPriority;

    setSelectedPriority(priorityType);
    if (priorityType !== 'student_urgent') {
      setStudentIdImage(null);
      setStudentVerification(null);
      setIsVerifyingStudentId(false);
    }
    if (!EMERGENCY_PRIORITY_TYPES.includes(priorityType) || emergencyTypeChanged) {
      setEmergencyDocumentImage(null);
      setEmergencyVerification(null);
      setIsVerifyingEmergency(false);
    }
  };

  const handlePickStudentId = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'Please sign in before verifying your student ID.');
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Please allow photo access to upload your student ID card.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    const image = result.assets[0];
    setStudentIdImage(image);
    setStudentVerification(null);
    setIsVerifyingStudentId(true);

    try {
      const response = await orderService.verifyStudentIdCard({
        userId: user.id,
        image,
      });
      const verification = response.data;
      setStudentVerification(verification);
      if (verification.verified) {
        Alert.alert(
          'Student ID Verified',
          `Your college ID template matched with score ${Number(verification.score || 0).toFixed(2)}.`
        );
      } else {
        Alert.alert('Verification Failed', verification.message || 'ID card template did not match.');
      }
    } catch (error) {
      const message = error.response?.data?.detail || 'Could not verify this ID card. Please try again.';
      setStudentVerification({
        verified: false,
        score: 0,
        verification_id: null,
        message,
      });
      Alert.alert('Verification Error', message);
    } finally {
      setIsVerifyingStudentId(false);
    }
  };

  const handlePickEmergencyDocument = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'Please sign in before verifying your emergency document.');
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Please allow photo access to upload your emergency document.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    const image = result.assets[0];
    const customerName =
      user?.name ||
      user?.full_name ||
      user?.fullName ||
      [user?.first_name, user?.last_name].filter(Boolean).join(' ') ||
      user?.email ||
      '';

    setEmergencyDocumentImage(image);
    setEmergencyVerification(null);
    setIsVerifyingEmergency(true);

    try {
      const response = await orderService.verifyEmergencyDocument({
        userId: user.id,
        image,
        emergencyType: selectedEmergencyType,
        customerName,
      });
      const verification = response.data;
      setEmergencyVerification(verification);

      if (verification.status === 'approved') {
        Alert.alert('Emergency Verified', verification.message);
      } else if (verification.status === 'pending') {
        Alert.alert('Manual Review', verification.message);
      } else {
        Alert.alert(
          'Verification Failed',
          verification.reasons?.join('\n') || verification.message || 'Document could not be verified.'
        );
      }
    } catch (error) {
      const message = error.response?.data?.detail || 'Could not verify this document. Please try again.';
      setEmergencyVerification({
        status: 'rejected',
        message,
        reasons: [message],
        verification_id: null,
        result: {},
      });
      Alert.alert('Verification Error', message);
    } finally {
      setIsVerifyingEmergency(false);
    }
  };

  const updateQuantity = (id, delta) => {
    const current = cartItems.find((item) => item.id === id);
    if (!current) {
      return;
    }
    dispatch(updateCartItemQuantity({ id, quantity: current.quantity + delta }));
  };

  if (cartItems.length === 0 && !successState) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>Your cart is empty</Text>
        <Text style={styles.emptyText}>Add some delicious items to get started!</Text>
        <TouchableOpacity
          style={styles.browseButton}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.browseButtonText}>Browse Restaurants</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={cartItems}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.cartItem}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemPrice}>{formatCurrency(item.price)}</Text>
            </View>
            <View style={styles.quantityContainer}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => updateQuantity(item.id, -1)}
              >
                <Text style={styles.quantityButtonText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.quantity}>{item.quantity}</Text>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => updateQuantity(item.id, 1)}
              >
                <Text style={styles.quantityButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListFooterComponent={
          <View style={styles.footer}>
            {restaurant && (
              <View style={styles.restaurantBanner}>
                <Text style={styles.restaurantBannerTitle}>{restaurant.name}</Text>
                <Text style={styles.restaurantBannerSubtitle}>{restaurant.address}</Text>
              </View>
            )}

            <View style={styles.addressContainer}>
              <Text style={styles.sectionTitle}>Delivery Address</Text>
              {selectedAddress && (
                <View style={styles.selectionCard}>
                  <Text style={styles.selectionTitle}>{selectedAddress.label || 'Selected Address'}</Text>
                  <Text style={styles.selectionSubtext}>
                    {[selectedAddress.line1, selectedAddress.city, selectedAddress.region, selectedAddress.postal_code]
                      .filter(Boolean)
                      .join(', ')}
                  </Text>
                </View>
              )}
              <View style={styles.pickerList}>
                {addresses.map((address) => (
                  <TouchableOpacity
                    key={address.id}
                    style={[
                      styles.pickerOption,
                      selectedAddressId === address.id && styles.pickerOptionSelected,
                    ]}
                    onPress={() => {
                      setSelectedAddressId(address.id);
                      setDeliveryAddress('');
                    }}
                  >
                    <Text style={styles.pickerOptionTitle}>{address.label || 'Address'}</Text>
                    <Text style={styles.pickerOptionText}>
                      {[address.line1, address.city, address.region, address.postal_code].filter(Boolean).join(', ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={styles.manageButton}
                onPress={() => navigation.navigate('SavedAddresses')}
              >
                <Text style={styles.manageButtonText}>Manage Saved Addresses</Text>
              </TouchableOpacity>
              <TextInput
                style={styles.addressInput}
                placeholder="Or enter one-time address"
                value={deliveryAddress}
                onChangeText={setDeliveryAddress}
                multiline
              />
            </View>

            <View style={styles.addressContainer}>
              <Text style={styles.sectionTitle}>Payment Method</Text>
              {selectedPaymentMethod ? (
                <View style={styles.selectionCard}>
                  <Text style={styles.selectionTitle}>
                    {String(selectedPaymentMethod.card_brand || selectedPaymentMethod.method_type || 'CARD').toUpperCase()}
                  </Text>
                  <Text style={styles.selectionSubtext}>
                    •••• {selectedPaymentMethod.card_last_four || '----'}
                  </Text>
                </View>
              ) : (
                <Text style={styles.emptySelection}>No payment method selected.</Text>
              )}
              <View style={styles.pickerList}>
                {payment_methods.map((method) => (
                  <TouchableOpacity
                    key={method.id}
                    style={[
                      styles.pickerOption,
                      selectedPaymentId === method.id && styles.pickerOptionSelected,
                    ]}
                    onPress={() => setSelectedPaymentId(method.id)}
                  >
                    <Text style={styles.pickerOptionTitle}>
                      {String(method.card_brand || method.method_type || 'CARD').toUpperCase()}
                    </Text>
                    <Text style={styles.pickerOptionText}>
                      •••• {method.card_last_four || method.last_four_digits || '----'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={styles.manageButton}
                onPress={() => navigation.navigate('PaymentMethods')}
              >
                <Text style={styles.manageButtonText}>Manage Payment Methods</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.priorityContainer}>
              <View style={styles.priorityHeader}>
                <Text style={styles.sectionTitle}>Priority Delivery</Text>
                <TouchableOpacity onPress={() => setShowPriorityOptions(!showPriorityOptions)}>
                  <Text style={styles.seeAllText}>
                    {showPriorityOptions ? 'Hide' : 'See All Options'}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.selectedPriorityCard}
                onPress={() => setShowPriorityOptions(!showPriorityOptions)}
              >
                <View style={styles.selectedPriorityInfo}>
                  <Text style={styles.selectedPriorityIcon}>{priorityOption?.icon}</Text>
                  <View>
                    <Text style={styles.selectedPriorityName}>{priorityOption?.name}</Text>
                    <Text style={styles.selectedPriorityDesc}>{priorityOption?.description}</Text>
                  </View>
                </View>
                <Text style={styles.selectedPriorityFee}>+{formatCurrency(priorityFee)}</Text>
              </TouchableOpacity>

              {showPriorityOptions && (
                <View style={styles.priorityOptions}>
                  {PRIORITY_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.type}
                      style={[
                        styles.priorityOption,
                        selectedPriority === option.type && [
                          styles.priorityOptionSelected,
                          { borderColor: option.color },
                        ],
                      ]}
                      onPress={() => handleSelectPriority(option.type)}
                    >
                      <View style={styles.priorityOptionLeft}>
                        <View style={[styles.radioCircle, { borderColor: option.color }]}>
                          {selectedPriority === option.type && (
                            <View style={[styles.radioFill, { backgroundColor: option.color }]} />
                          )}
                        </View>
                        <Text style={styles.priorityOptionIcon}>{option.icon}</Text>
                        <View style={styles.priorityOptionText}>
                          <Text style={styles.priorityOptionName}>{option.name}</Text>
                          <Text style={styles.priorityOptionDesc}>{option.description}</Text>
                        </View>
                      </View>
                      <Text style={styles.priorityOptionFee}>+{formatCurrency(option.fee)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {selectedPriority === 'student_urgent' && (
                <View style={styles.studentVerificationBox}>
                  <View style={styles.studentVerificationHeader}>
                    <View style={styles.verificationCopy}>
                      <Text style={styles.studentVerificationTitle}>Student ID Verification</Text>
                      <Text style={styles.studentVerificationText}>
                        Upload your college ID so we can match its layout with the saved template.
                      </Text>
                    </View>
                    {studentVerification?.verified && (
                      <Text style={styles.studentVerifiedBadge} numberOfLines={1}>Verified</Text>
                    )}
                  </View>
                  {studentIdImage && (
                    <Text style={styles.studentFileName}>
                      {studentIdImage.fileName || 'Selected ID card photo'}
                    </Text>
                  )}
                  {studentVerification && !studentVerification.verified && (
                    <Text style={styles.studentVerificationError}>
                      {studentVerification.message || 'ID card could not be verified.'}
                    </Text>
                  )}
                  <TouchableOpacity
                    style={[
                      styles.studentUploadButton,
                      isVerifyingStudentId && styles.studentUploadButtonDisabled,
                    ]}
                    onPress={handlePickStudentId}
                    disabled={isVerifyingStudentId}
                  >
                    <Text style={styles.studentUploadButtonText}>
                      {isVerifyingStudentId
                        ? 'Verifying...'
                        : studentVerification?.verified
                          ? 'Upload Different ID'
                          : 'Upload Student ID'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {isEmergencyPriority && (
                <View style={styles.emergencyVerificationBox}>
                  <View style={styles.studentVerificationHeader}>
                    <View style={styles.verificationCopy}>
                      <Text style={styles.emergencyVerificationTitle}>
                        {selectedPriority === 'travel_emergency'
                          ? 'Travel Emergency Verification'
                          : 'Hospital Emergency Verification'}
                      </Text>
                      <Text style={styles.studentVerificationText}>
                        {selectedPriority === 'travel_emergency'
                          ? 'Upload a current ticket or booking for today or tomorrow.'
                          : 'Upload a recent hospital or medical document from the last 7 days.'}
                      </Text>
                    </View>
                    {emergencyVerification?.status === 'approved' && (
                      <Text style={styles.studentVerifiedBadge} numberOfLines={1}>Verified</Text>
                    )}
                  </View>
                  {emergencyDocumentImage && (
                    <Text style={styles.studentFileName}>
                      {emergencyDocumentImage.fileName || 'Selected emergency document'}
                    </Text>
                  )}
                  {emergencyVerification?.status === 'pending' && (
                    <Text style={styles.emergencyVerificationPending}>
                      {emergencyVerification.message || 'Your document is under review.'}
                    </Text>
                  )}
                  {emergencyVerification?.status === 'rejected' && (
                    <Text style={styles.studentVerificationError}>
                      {emergencyVerification.reasons?.join('\n') ||
                        emergencyVerification.message ||
                        'Document could not be verified.'}
                    </Text>
                  )}
                  <TouchableOpacity
                    style={[
                      styles.emergencyUploadButton,
                      isVerifyingEmergency && styles.studentUploadButtonDisabled,
                    ]}
                    onPress={handlePickEmergencyDocument}
                    disabled={isVerifyingEmergency}
                  >
                    <Text style={styles.studentUploadButtonText}>
                      {isVerifyingEmergency
                        ? 'Verifying...'
                        : emergencyVerification?.status === 'approved'
                          ? 'Upload Different Document'
                          : 'Upload Document'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.priorityInfoBox}>
                <Text style={styles.priorityInfoTitle}>Priority Queue</Text>
                <Text style={styles.priorityInfoText}>
                  Higher priority orders move up in the processing queue based on urgency,
                  distance, and waiting time.
                </Text>
              </View>
            </View>

            <View style={styles.instructionsContainer}>
              <Text style={styles.sectionTitle}>Special Instructions</Text>
              <TextInput
                style={styles.instructionsInput}
                placeholder="Any special requests?"
                value={specialInstructions}
                onChangeText={setSpecialInstructions}
                multiline
              />
            </View>

            <View style={styles.summaryContainer}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>{formatCurrency(subtotal)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Delivery Fee</Text>
                <Text style={styles.summaryValue}>{formatCurrency(deliveryFee)}</Text>
              </View>
              {priorityFee > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Priority Fee</Text>
                  <Text style={styles.summaryValue}>{formatCurrency(priorityFee)}</Text>
                </View>
              )}
              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.checkoutButton,
                { backgroundColor: priorityOption?.color || '#000' },
                successState && styles.checkoutButtonDisabled,
              ]}
              onPress={handleCheckout}
              disabled={Boolean(successState)}
            >
              <Text style={styles.checkoutButtonText}>Place Order - {formatCurrency(total)}</Text>
            </TouchableOpacity>
          </View>
        }
      />
      {successState && (
        <Animated.View style={[styles.successOverlay, { opacity: overlayOpacity }]}>
          <Animated.View style={[styles.successCard, { transform: [{ scale: cardScale }] }]}>
            <View style={styles.successTopRow}>
              <Text style={styles.successEyebrow}>PulseKitchen</Text>
              <Text style={styles.successEyebrow}>Order Confirmed</Text>
            </View>

            <View style={styles.successVisual}>
              <Animated.View
                style={[
                  styles.successPulseRing,
                  {
                    opacity: pulseRing.interpolate({
                      inputRange: [0.2, 1],
                      outputRange: [0.55, 0],
                    }),
                    transform: [
                      {
                        scale: pulseRing.interpolate({
                          inputRange: [0.2, 1],
                          outputRange: [0.8, 1.7],
                        }),
                      },
                    ],
                  },
                ]}
              />
              <Animated.View style={[styles.successGlow, { opacity: glowOpacity }]} />
              <Animated.View
                style={[
                  styles.successBadge,
                  {
                    transform: [
                      { scale: checkScale },
                      {
                        rotate: checkRotate.interpolate({
                          inputRange: [-18, 0],
                          outputRange: ['-18deg', '0deg'],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Text style={styles.successBadgeText}>✓</Text>
                <Animated.View
                  style={[
                    styles.successShimmer,
                    { transform: [{ translateX: shimmerTranslate }, { rotate: '22deg' }] },
                  ]}
                />
              </Animated.View>
              {sparkAnimations.map((spark, index) => (
                <Animated.View
                  key={`spark-${index}`}
                  style={[
                    styles.spark,
                    index % 2 === 0 ? styles.sparkLeft : styles.sparkRight,
                    {
                      top: 20 + (index % 3) * 20,
                      opacity: spark.opacity,
                      transform: [
                        { translateY: spark.translateY },
                        { scale: spark.scale },
                      ],
                    },
                  ]}
                />
              ))}
            </View>

            <Text style={styles.successTitle}>Order placed!</Text>
            <Text style={styles.successSubtitle}>
              Your kitchen is firing up the order and we&apos;re lining up delivery now.
            </Text>

            <View style={styles.successMetaRow}>
              <View style={styles.successMetaPill}>
                <Text style={styles.successMetaLabel}>Priority</Text>
                <Text style={styles.successMetaValue}>{successState.level.toUpperCase()}</Text>
              </View>
              <View style={styles.successMetaPill}>
                <Text style={styles.successMetaLabel}>Score</Text>
                <Text style={styles.successMetaValue}>{successState.score}</Text>
              </View>
            </View>

            <Text style={styles.successFootnote}>Opening live order tracking...</Text>
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
  browseButton: {
    backgroundColor: '#000',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
  },
  browseButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: 10,
    padding: 15,
    borderRadius: 12,
    elevation: 2,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  itemPrice: {
    fontSize: 14,
    color: '#000',
    marginTop: 4,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  quantity: {
    marginHorizontal: 12,
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    padding: 15,
    paddingBottom: 30,
  },
  restaurantBanner: {
    backgroundColor: '#fff',
    marginBottom: 16,
    padding: 14,
    borderRadius: 12,
  },
  restaurantBannerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  restaurantBannerSubtitle: {
    color: '#666',
    marginTop: 4,
  },
  addressContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  addressInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  selectionCard: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    backgroundColor: '#fafafa',
  },
  selectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#222',
  },
  selectionSubtext: {
    marginTop: 4,
    fontSize: 13,
    color: '#666',
  },
  emptySelection: {
    fontSize: 13,
    color: '#666',
    marginBottom: 10,
  },
  manageButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#000',
    borderRadius: 8,
    marginBottom: 10,
  },
  manageButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  pickerList: {
    gap: 8,
    marginBottom: 10,
  },
  pickerOption: {
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#fff',
  },
  pickerOptionSelected: {
    borderColor: '#000',
    backgroundColor: '#f2f2f2',
  },
  pickerOptionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#222',
  },
  pickerOptionText: {
    marginTop: 3,
    fontSize: 12,
    color: '#666',
  },
  priorityContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
  },
  priorityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  seeAllText: {
    color: '#000',
    fontWeight: '600',
  },
  selectedPriorityCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f2f2f2',
  },
  selectedPriorityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  selectedPriorityIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  selectedPriorityName: {
    fontWeight: 'bold',
    color: '#333',
  },
  selectedPriorityDesc: {
    color: '#666',
    marginTop: 2,
  },
  selectedPriorityFee: {
    fontWeight: 'bold',
    color: '#333',
  },
  priorityOptions: {
    marginTop: 12,
    gap: 10,
  },
  priorityOption: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priorityOptionSelected: {
    backgroundColor: '#f7f7f7',
  },
  priorityOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  radioFill: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  priorityOptionIcon: {
    fontSize: 22,
    marginRight: 10,
  },
  priorityOptionText: {
    flex: 1,
  },
  priorityOptionName: {
    fontWeight: 'bold',
    color: '#333',
  },
  priorityOptionDesc: {
    color: '#666',
    marginTop: 2,
  },
  priorityOptionFee: {
    fontWeight: 'bold',
    color: '#333',
  },
  priorityInfoBox: {
    marginTop: 12,
    backgroundColor: '#f2f2f2',
    padding: 12,
    borderRadius: 12,
  },
  studentVerificationBox: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#d7e7ff',
    backgroundColor: '#f6faff',
    padding: 12,
    borderRadius: 12,
  },
  emergencyVerificationBox: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#ffd7bd',
    backgroundColor: '#fff8f3',
    padding: 12,
    borderRadius: 12,
  },
  studentVerificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  verificationCopy: {
    flex: 1,
    minWidth: 0,
  },
  studentVerificationTitle: {
    color: '#173b70',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  emergencyVerificationTitle: {
    color: '#8a3d00',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  studentVerificationText: {
    color: '#48627f',
    lineHeight: 18,
    flexShrink: 1,
  },
  studentVerifiedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#1f8f4d',
    color: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: '700',
    maxWidth: 90,
  },
  studentFileName: {
    marginTop: 10,
    color: '#173b70',
    fontSize: 12,
    fontWeight: '600',
  },
  studentVerificationError: {
    marginTop: 10,
    color: '#c62828',
    fontSize: 12,
    lineHeight: 18,
  },
  emergencyVerificationPending: {
    marginTop: 10,
    color: '#8a5a00',
    fontSize: 12,
    lineHeight: 18,
  },
  studentUploadButton: {
    alignSelf: 'flex-start',
    marginTop: 12,
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  emergencyUploadButton: {
    alignSelf: 'flex-start',
    marginTop: 12,
    backgroundColor: '#FF9800',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  studentUploadButtonDisabled: {
    opacity: 0.65,
  },
  studentUploadButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  priorityInfoTitle: {
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  priorityInfoText: {
    color: '#666',
    lineHeight: 20,
  },
  instructionsContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
  },
  instructionsInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  summaryContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: {
    color: '#666',
  },
  summaryValue: {
    color: '#333',
    fontWeight: '600',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  checkoutButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  checkoutButtonDisabled: {
    opacity: 0.8,
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#111',
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: 'center',
    overflow: 'hidden',
  },
  successTopRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  successEyebrow: {
    color: 'rgba(255, 255, 255, 0.72)',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  successVisual: {
    width: 180,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  successPulseRing: {
    position: 'absolute',
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  successGlow: {
    position: 'absolute',
    width: 138,
    height: 138,
    borderRadius: 69,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  successBadge: {
    width: 94,
    height: 94,
    borderRadius: 47,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  successBadgeText: {
    fontSize: 40,
    fontWeight: '900',
    color: '#000',
  },
  successShimmer: {
    position: 'absolute',
    width: 28,
    height: 140,
    backgroundColor: 'rgba(255,255,255,0.34)',
  },
  spark: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  sparkLeft: {
    left: 28,
  },
  sparkRight: {
    right: 28,
  },
  successTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    marginTop: 8,
  },
  successSubtitle: {
    color: 'rgba(255,255,255,0.74)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    marginTop: 10,
  },
  successMetaRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  successMetaPill: {
    minWidth: 110,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  successMetaLabel: {
    color: 'rgba(255,255,255,0.64)',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  successMetaValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
  },
  successFootnote: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 18,
  },
});
