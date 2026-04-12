import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchOrderById, cancelOrder } from '../store/slices/orderSlice';
import { startTracking, stopTracking } from '../store/slices/deliverySlice';

export default function OrderTrackingScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const { currentOrder } = useSelector((state) => state.orders);
  const { trackingOrder, eta } = useSelector((state) => state.delivery);
  const [order, setOrder] = useState(null);

  useEffect(() => {
    const orderId = route.params?.orderId || currentOrder?.id;
    if (orderId) {
      dispatch(fetchOrderById(orderId));
      dispatch(startTracking(orderId));
      const poller = setInterval(() => {
        dispatch(fetchOrderById(orderId));
        dispatch(startTracking(orderId));
      }, 15000);
      return () => {
        clearInterval(poller);
        dispatch(stopTracking());
      };
    }
  }, []);

  useEffect(() => {
    const merged = { ...(currentOrder || {}), ...(trackingOrder || {}) };
    if (merged.id) {
      setOrder(merged);
    }
  }, [trackingOrder, currentOrder]);

  if (!order) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Loading order details...</Text>
      </View>
    );
  }

  const getStatusIcon = (status) => {
    const icons = {
      pending: '🕐',
      confirmed: '✓',
      preparing: '👨‍🍳',
      ready_for_pickup: '📦',
      out_for_delivery: '🚴',
      delivered: '✅',
      cancelled: '❌',
    };
    return icons[status] || '📍';
  };

  const getStatusMessage = (status) => {
    const messages = {
      pending: 'Finding the best delivery partner...',
      confirmed: 'Order confirmed! Restaurant is preparing your food.',
      preparing: 'Your food is being prepared with care.',
      ready_for_pickup: 'Ready for pickup! Delivery partner is on the way.',
      out_for_delivery: 'On the way! Your food is coming to you.',
      delivered: 'Enjoy your meal!',
      cancelled: 'Order has been cancelled.',
    };
    return messages[status] || 'Processing...';
  };

  const priorityColors = {
    critical: '#FF0000',
    high: '#FF6B35',
    normal: '#4CAF50',
    low: '#9E9E9E',
  };

  const statusKey = String(order.status ?? 'pending');
  const priorityKey = String(order.priority_level ?? 'normal').toLowerCase();
  const scoreNum = Number(order.priority_score);
  const scoreLabel = Number.isFinite(scoreNum) ? scoreNum.toFixed(1) : '—';

  return (
    <ScrollView style={styles.container}>
      {/* Priority Badge */}
      <View style={[styles.priorityBadge, { backgroundColor: priorityColors[priorityKey] || '#9E9E9E' }]}>
        <Text style={styles.priorityText}>
          {priorityKey.toUpperCase()} PRIORITY
        </Text>
        <Text style={styles.priorityScore}>Score: {scoreLabel}</Text>
      </View>

      {/* Status Header */}
      <View style={styles.statusHeader}>
        <Text style={styles.statusIcon}>{getStatusIcon(statusKey)}</Text>
        <Text style={styles.statusTitle}>{statusKey.replace(/_/g, ' ').toUpperCase()}</Text>
        <Text style={styles.statusMessage}>{getStatusMessage(statusKey)}</Text>
      </View>

      {/* Map: native MapView is omitted here — it often crashes in Expo Go without extra native / API setup */}
      <View style={styles.mapContainer}>
        <View style={styles.mapPlaceholder}>
          <Text style={styles.mapPlaceholderText}>Delivery map</Text>
          <Text style={styles.mapPlaceholderSub}>Route preview (enable a dev build + maps config for live map)</Text>
        </View>
      </View>

      {/* Order Details */}
      <View style={styles.detailsCard}>
        <Text style={styles.cardTitle}>Order Details</Text>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Order ID:</Text>
          <Text style={styles.detailValue}>#{order.id}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Total Amount:</Text>
          <Text style={styles.detailValue}>
            ${Number.isFinite(Number(order.total_amount)) ? Number(order.total_amount).toFixed(2) : '—'}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Placed At:</Text>
          <Text style={styles.detailValue}>
            {order.placed_at ? new Date(order.placed_at).toLocaleString() : '—'}
          </Text>
        </View>

        {eta && (
          <View style={styles.etaRow}>
            <Text style={styles.etaLabel}>Estimated Delivery:</Text>
            <Text style={styles.etaValue}>{eta} mins</Text>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      {statusKey === 'pending' && (
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={async () => {
            try {
              await dispatch(cancelOrder(order.id)).unwrap();
              Alert.alert('Order Cancelled', 'Your order has been cancelled.');
            } catch (error) {
              Alert.alert('Error', String(error));
            }
          }}
        >
          <Text style={styles.cancelButtonText}>Cancel Order</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backButtonText}>Back to Home</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  priorityBadge: {
    margin: 15,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  priorityText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  priorityScore: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.9,
    marginTop: 4,
  },
  statusHeader: {
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center',
  },
  statusIcon: {
    fontSize: 48,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 10,
    color: '#333',
  },
  statusMessage: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
  mapContainer: {
    height: 200,
    margin: 15,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: '#E8EAF6',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  mapPlaceholderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3949AB',
  },
  mapPlaceholderSub: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  detailsCard: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 15,
    borderRadius: 12,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    color: '#666',
    fontSize: 14,
  },
  detailValue: {
    color: '#333',
    fontSize: 14,
    fontWeight: '500',
  },
  etaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 15,
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginTop: 10,
  },
  etaLabel: {
    color: '#FF6B35',
    fontSize: 14,
    fontWeight: '600',
  },
  etaValue: {
    color: '#FF6B35',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#f44336',
    margin: 15,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 15,
    borderRadius: 12,
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
