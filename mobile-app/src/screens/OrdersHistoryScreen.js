import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchOrders } from '../store/slices/orderSlice';
import { addItemToCart } from '../store/slices/cartSlice';
import restaurantService from '../services/restaurantService';
import { formatCurrency } from '../utils/currency';
import { getPriorityDisplay, normalizeOrderItems } from '../utils/orderPresentation';

export default function OrdersHistoryScreen({ navigation }) {
  const dispatch = useDispatch();
  const { orders, loading, error } = useSelector((state) => state.orders);
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratedOrderIds, setRatedOrderIds] = useState({});

  const ORDERS_PER_PAGE = 10;

  useEffect(() => {
    dispatch(fetchOrders({ page: 1, limit: ORDERS_PER_PAGE }));
  }, [dispatch]);

  const handleLoadMore = useCallback(() => {
    if (!isLoadingMore && !loading && orders.length >= ORDERS_PER_PAGE * page) {
      setIsLoadingMore(true);
      const nextPage = page + 1;
      dispatch(fetchOrders({ page: nextPage, limit: ORDERS_PER_PAGE })).finally(() => {
        setIsLoadingMore(false);
        setPage(nextPage);
      });
    }
  }, [page, isLoadingMore, loading, orders.length, dispatch]);

  const handleReorder = useCallback(() => {
    if (!selectedOrder) {
      Alert.alert('Error', 'Unable to reorder this item');
      return;
    }

    try {
      const items = normalizeOrderItems(selectedOrder.items);

      if (!Array.isArray(items) || items.length === 0) {
        Alert.alert('Error', 'No items found in this order');
        return;
      }

      const unavailableItems = [];
      const itemsToAdd = [];
      const restaurant = {
        id: selectedOrder.restaurant_id || selectedOrder.restaurant?.id || 'previous-order',
        name: selectedOrder.restaurant_name || selectedOrder.restaurant?.name || 'Previous restaurant',
      };

      items.forEach((item) => {
        if (item.available === false) {
          unavailableItems.push(item.name);
        } else {
          itemsToAdd.push({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
          });
        }
      });

      if (unavailableItems.length > 0) {
        Alert.alert(
          'Some Items Unavailable',
          `The following items are no longer available: ${unavailableItems.join(', ')}`
        );
      }

      if (itemsToAdd.length > 0) {
        itemsToAdd.forEach((item) => {
          dispatch(addItemToCart({ restaurant, item }));
        });
        setShowDetailModal(false);
        Alert.alert('Success', 'Items added to cart', [
          { text: 'Continue Shopping', onPress: () => {} },
          {
            text: 'Go to Checkout',
            onPress: () => navigation.navigate('Cart'),
          },
        ]);
      }
    } catch (error) {
      console.error('[OrdersHistoryScreen] Error parsing order items:', error);
      Alert.alert('Error', 'Unable to process reorder. Please try again.');
    }
  }, [selectedOrder, dispatch, navigation]);

  const handleOpenOrder = useCallback((order) => {
    setSelectedOrder(order);
    setRatingValue(5);
    setRatingComment('');
    setShowDetailModal(true);
  }, []);

  const handleSubmitRating = useCallback(async () => {
    if (!selectedOrder?.restaurant_id) {
      Alert.alert('Rating unavailable', 'This order is missing restaurant details.');
      return;
    }

    try {
      setSubmittingRating(true);
      await restaurantService.createReview(selectedOrder.restaurant_id, {
        order_id: selectedOrder.id,
        rating: ratingValue,
        comment: ratingComment.trim() || null,
      });
      setRatedOrderIds((current) => ({ ...current, [selectedOrder.id]: true }));
      setRatingComment('');
      Alert.alert('Thanks', 'Your rating has been submitted.');
    } catch (error) {
      Alert.alert('Rating Error', error.response?.data?.detail || 'Unable to submit rating.');
    } finally {
      setSubmittingRating(false);
    }
  }, [selectedOrder, ratingValue, ratingComment]);

  const getStatusColor = (status) => {
    const colors = {
      pending: '#FFA500',
      confirmed: '#2196F3',
      preparing: '#9C27B0',
      ready_for_pickup: '#00BCD4',
      out_for_delivery: '#4CAF50',
      delivered: '#4CAF50',
      cancelled: '#f44336',
    };
    return colors[status] || '#999';
  };

  const renderOrder = ({ item }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => handleOpenOrder(item)}
    >
      <View style={styles.orderHeader}>
        <View>
          <Text style={styles.orderId}>Order #{item.id}</Text>
          <Text style={styles.orderDate}>
            {new Date(item.placed_at).toLocaleDateString()}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status.replace('_', ' ')}</Text>
        </View>
      </View>

      <View style={styles.orderDetails}>
        <Text style={styles.orderItems}>{formatItems(item.items)}</Text>
        <Text style={styles.orderTotal}>Total: {formatCurrency(item.total_amount)}</Text>
      </View>

      <View style={styles.priorityInfo}>
        <Text style={styles.priorityLabel}>Priority Level:</Text>
        <Text style={styles.priorityValue}>{getPriorityDisplay(item).toUpperCase()}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderOrderDetailModal = () => (
    <Modal
      visible={showDetailModal}
      animationType="slide"
      transparent={false}
      onRequestClose={() => setShowDetailModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity
            style={styles.closeButtonTouchable}
            hitSlop={{ top: 16, right: 16, bottom: 16, left: 16 }}
            onPress={() => setShowDetailModal(false)}
            accessibilityRole="button"
            accessibilityLabel="Close order details"
          >
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Order Details</Text>
          <View style={{ width: 30 }} />
        </View>

        <ScrollView style={styles.modalContent}>
          {selectedOrder && (
            <>
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Order Information</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Order ID:</Text>
                  <Text style={styles.detailValue}>{selectedOrder.id}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date:</Text>
                  <Text style={styles.detailValue}>
                    {new Date(selectedOrder.placed_at).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status:</Text>
                  <Text
                    style={[
                      styles.detailValue,
                      { color: getStatusColor(selectedOrder.status) },
                    ]}
                  >
                    {selectedOrder.status.replace('_', ' ')}
                  </Text>
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Items</Text>
                {(() => {
                  try {
                    const items = normalizeOrderItems(selectedOrder.items);
                    
                    if (!Array.isArray(items)) {
                      return <Text style={styles.errorText}>Items unavailable</Text>;
                    }
                    
                    return items.map((item, index) => (
                      <View key={index} style={styles.itemRow}>
                        <View style={styles.itemInfo}>
                          <Text style={styles.itemName}>{item.name}</Text>
                          <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
                        </View>
                        <Text style={styles.itemPrice}>{formatCurrency(item.price * item.quantity)}</Text>
                      </View>
                    ));
                  } catch (error) {
                    return <Text style={styles.errorText}>Unable to load items</Text>;
                  }
                })()}
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Delivery Address</Text>
                {(() => {
                  try {
                    const address = typeof selectedOrder.delivery_address === 'string'
                      ? JSON.parse(selectedOrder.delivery_address)
                      : selectedOrder.delivery_address;
                    
                    if (!address) {
                      return <Text style={styles.errorText}>Address unavailable</Text>;
                    }
                    
                    return (
                      <>
                        <Text style={styles.addressText}>
                          {address.street_address_1 || address.line1 || address.address}
                        </Text>
                        {address.street_address_2 && (
                          <Text style={styles.addressText}>
                            {address.street_address_2}
                          </Text>
                        )}
                        <Text style={styles.addressText}>
                          {[address.city, address.region_state || address.region, address.postal_code]
                            .filter(Boolean)
                            .join(', ')}
                        </Text>
                      </>
                    );
                  } catch (error) {
                    return <Text style={styles.errorText}>Unable to load address</Text>;
                  }
                })()}
              </View>

              {selectedOrder.timeline && selectedOrder.timeline.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Order Timeline</Text>
                  {selectedOrder.timeline.map((event, index) => (
                    <View key={index} style={styles.timelineItem}>
                      <Text style={styles.timelineTime}>
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </Text>
                      <Text style={styles.timelineStatus}>{event.status}</Text>
                      <Text style={styles.timelineDescription}>{event.description}</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.detailSection}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total Amount:</Text>
                  <Text style={styles.totalValue}>{formatCurrency(selectedOrder.total_amount)}</Text>
                </View>
              </View>

              {String(selectedOrder.status).toLowerCase() === 'delivered' && (
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Rate This Order</Text>
                  {ratedOrderIds[selectedOrder.id] ? (
                    <Text style={styles.ratingSubmittedText}>Rating submitted. Thanks for the feedback.</Text>
                  ) : (
                    <>
                      <View style={styles.starRow}>
                        {[1, 2, 3, 4, 5].map((value) => (
                          <TouchableOpacity
                            key={value}
                            style={styles.starButton}
                            onPress={() => setRatingValue(value)}
                            disabled={submittingRating}
                          >
                            <Text style={[styles.starText, value <= ratingValue && styles.starTextActive]}>
                              ★
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <TextInput
                        style={styles.ratingInput}
                        value={ratingComment}
                        onChangeText={setRatingComment}
                        placeholder="Share feedback about the food..."
                        placeholderTextColor="#999"
                        multiline
                      />
                      <TouchableOpacity
                        style={[styles.ratingSubmitButton, submittingRating && styles.ratingSubmitButtonDisabled]}
                        onPress={handleSubmitRating}
                        disabled={submittingRating}
                      >
                        {submittingRating ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.ratingSubmitText}>Submit Rating</Text>
                        )}
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              )}

              <TouchableOpacity style={styles.reorderButton} onPress={handleReorder}>
                <Text style={styles.reorderButtonText}>Reorder</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );

  if (loading && orders.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (error && orders.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => dispatch(fetchOrders({ page: 1, limit: ORDERS_PER_PAGE }))}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderOrder}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isLoadingMore ? <ActivityIndicator size="small" color="#000" style={{ marginVertical: 20 }} /> : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No orders yet</Text>
            <Text style={styles.emptyText}>
              Start ordering from your favorite restaurants!
            </Text>
            <TouchableOpacity
              style={styles.browseButton}
              onPress={() => navigation.navigate('Main', { screen: 'Home' })}
            >
              <Text style={styles.browseButtonText}>Browse Restaurants</Text>
            </TouchableOpacity>
          </View>
        }
      />
      {renderOrderDetailModal()}
    </View>
  );
}

function formatItems(rawItems) {
  try {
    const items = typeof rawItems === 'string' ? JSON.parse(rawItems) : rawItems;
    if (!Array.isArray(items)) {
      return 'Order items unavailable';
    }
    return items.map((item) => `${item.quantity}x ${item.name}`).join(', ');
  } catch (_error) {
    return String(rawItems ?? 'Order items unavailable');
  }
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
  orderCard: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: 10,
    padding: 15,
    borderRadius: 12,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  orderDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  orderDetails: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  orderItems: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  priorityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
  },
  priorityLabel: {
    fontSize: 12,
    color: '#666',
  },
  priorityValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 5,
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
  errorText: {
    fontSize: 16,
    color: '#f44336',
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#000',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
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
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalContent: {
    flex: 1,
    padding: 15,
  },
  detailSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  itemQuantity: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
  },
  addressText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  timelineItem: {
    paddingVertical: 10,
    borderLeftWidth: 2,
    borderLeftColor: '#2196F3',
    paddingLeft: 12,
    marginBottom: 10,
  },
  timelineTime: {
    fontSize: 12,
    color: '#999',
  },
  timelineStatus: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
  },
  timelineDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  starRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  starButton: {
    paddingRight: 8,
    paddingVertical: 4,
  },
  starText: {
    fontSize: 32,
    color: '#d8d8d8',
  },
  starTextActive: {
    color: '#FFB800',
  },
  ratingInput: {
    minHeight: 82,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    textAlignVertical: 'top',
    marginBottom: 12,
    backgroundColor: '#fafafa',
  },
  ratingSubmitButton: {
    backgroundColor: '#000',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  ratingSubmitButtonDisabled: {
    opacity: 0.6,
  },
  ratingSubmitText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  ratingSubmittedText: {
    color: '#2f855a',
    fontWeight: '600',
  },
  reorderButton: {
    backgroundColor: '#000',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  reorderButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
