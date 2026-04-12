import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { createOrder } from '../store/slices/orderSlice';
import { clearCart, updateCartItemQuantity } from '../store/slices/cartSlice';

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
    fee: 3.0,
    icon: '🎓',
    description: 'Between classes or exams',
    color: '#2196F3',
  },
  {
    type: 'travel_emergency',
    name: 'Travel Emergency',
    fee: 4.0,
    icon: '✈️',
    description: 'Catching a flight/train',
    color: '#FF9800',
  },
  {
    type: 'hospital_emergency',
    name: 'Hospital Emergency',
    fee: 5.0,
    icon: '🚨',
    description: 'Urgent medical situation',
    color: '#f44336',
  },
  {
    type: 'vip',
    name: 'VIP Priority',
    fee: 6.0,
    icon: '⭐',
    description: 'Fastest delivery available',
    color: '#9C27B0',
  },
];

export default function CartScreen({ navigation }) {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { items: cartItems, restaurant } = useSelector((state) => state.cart);

  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('normal');
  const [showPriorityOptions, setShowPriorityOptions] = useState(false);

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = 3.99;
  const priorityOption = PRIORITY_OPTIONS.find((p) => p.type === selectedPriority);
  const priorityFee = priorityOption?.fee || 0;
  const total = subtotal + deliveryFee + priorityFee;

  const handleCheckout = async () => {
    if (!deliveryAddress) {
      Alert.alert('Error', 'Please enter delivery address');
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

    try {
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
        delivery_address: { address: deliveryAddress },
        special_instructions: specialInstructions,
        order_type: selectedPriority,
        is_vip: user?.role === 'vip' || selectedPriority === 'vip',
        user_type: selectedPriority === 'hospital_emergency' ? 'hospital' : 'regular',
        pickup_location:
          restaurant.latitude != null && restaurant.longitude != null
            ? { latitude: restaurant.latitude, longitude: restaurant.longitude }
            : undefined,
      };

      const result = await dispatch(createOrder(orderData)).unwrap();
      const score =
        typeof result.priority_score === 'number'
          ? result.priority_score.toFixed(1)
          : String(result.priority_score ?? '');
      const level = String(result.priority_level ?? '');
      dispatch(clearCart());
      Alert.alert('Order Placed!', `Priority: ${level}\nScore: ${score}`);
      navigation.navigate('OrderTracking', { orderId: result.id });
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

  const updateQuantity = (id, delta) => {
    const current = cartItems.find((item) => item.id === id);
    if (!current) {
      return;
    }
    dispatch(updateCartItemQuantity({ id, quantity: current.quantity + delta }));
  };

  if (cartItems.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>Your cart is empty</Text>
        <Text style={styles.emptyText}>Add some delicious items to get started!</Text>
        <TouchableOpacity
          style={styles.browseButton}
          onPress={() => navigation.navigate('Restaurants')}
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
              <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
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
              <TextInput
                style={styles.addressInput}
                placeholder="Enter your delivery address"
                value={deliveryAddress}
                onChangeText={setDeliveryAddress}
                multiline
              />
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
                <Text style={styles.selectedPriorityFee}>+${priorityFee.toFixed(2)}</Text>
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
                      onPress={() => setSelectedPriority(option.type)}
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
                      <Text style={styles.priorityOptionFee}>+${option.fee.toFixed(2)}</Text>
                    </TouchableOpacity>
                  ))}
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
                <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Delivery Fee</Text>
                <Text style={styles.summaryValue}>${deliveryFee.toFixed(2)}</Text>
              </View>
              {priorityFee > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Priority Fee</Text>
                  <Text style={styles.summaryValue}>${priorityFee.toFixed(2)}</Text>
                </View>
              )}
              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.checkoutButton,
                { backgroundColor: priorityOption?.color || '#FF6B35' },
              ]}
              onPress={handleCheckout}
            >
              <Text style={styles.checkoutButtonText}>Place Order - ${total.toFixed(2)}</Text>
            </TouchableOpacity>
          </View>
        }
      />
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
    backgroundColor: '#FF6B35',
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
    color: '#FF6B35',
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
    backgroundColor: '#FF6B35',
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
    color: '#FF6B35',
    fontWeight: '600',
  },
  selectedPriorityCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#faf6f2',
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
    backgroundColor: '#fff7f3',
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
    backgroundColor: '#faf6f2',
    padding: 12,
    borderRadius: 12,
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
  checkoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
