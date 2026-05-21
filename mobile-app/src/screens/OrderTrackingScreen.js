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
import { formatCurrency } from '../utils/currency';
import { getPriorityDisplay } from '../utils/orderPresentation';

const STATUS_RANK = {
  pending: 0,
  confirmed: 1,
  preparing: 2,
  ready_for_pickup: 3,
  out_for_delivery: 4,
  delivered: 5,
  cancelled: 6,
};

const latestStatus = (currentStatus, nextStatus) => {
  const current = String(currentStatus || '').toLowerCase();
  const next = String(nextStatus || '').toLowerCase();
  return (STATUS_RANK[current] ?? -1) > (STATUS_RANK[next] ?? -1) ? current : next;
};

export default function OrderTrackingScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const { currentOrder } = useSelector((state) => state.orders);
  const { trackingOrder, eta, etaPayload } = useSelector((state) => state.delivery);
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
  }, [route.params?.orderId, currentOrder?.id, dispatch]);

  useEffect(() => {
    const merged = { ...(currentOrder || {}), ...(trackingOrder || {}) };
    if (merged.id) {
      setOrder((previousOrder) => ({
        ...(previousOrder || {}),
        ...merged,
        status: latestStatus(
          latestStatus(previousOrder?.status, currentOrder?.status),
          trackingOrder?.status || merged.status
        ),
      }));
    }
  }, [trackingOrder, currentOrder]);

  if (!order) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
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
    hospital_emergency: '#f44336',
    vip: '#9C27B0',
    travel_emergency: '#FF9800',
    student_urgent: '#2196F3',
    critical: '#FF0000',
    high: '#000',
    normal: '#4CAF50',
    low: '#9E9E9E',
  };
  const statusKey = String(order.status ?? 'pending');
  const priorityType = String(order.order_type || order.priority_type || 'normal').toLowerCase();
  const priorityLevel = String(order.priority_level ?? 'normal').toLowerCase();
  const priorityLabel = getPriorityDisplay(order);
  const etaMinutes = Number(eta);
  const hasEta = Number.isFinite(etaMinutes) && etaMinutes > 0;
  const standardEtaMinutes = Number(etaPayload?.standard_eta_minutes ?? order.standard_eta_minutes);
  const etaSavingsMinutes = Number(etaPayload?.eta_savings_minutes ?? order.eta_savings_minutes);
  const hasPrioritySavings =
    Number.isFinite(standardEtaMinutes) &&
    Number.isFinite(etaSavingsMinutes) &&
    standardEtaMinutes > etaMinutes &&
    etaSavingsMinutes > 0;
  const handleBackPress = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate('Main', { screen: 'Home' });
  };

  return (
    <ScrollView style={styles.container}>
      {/* Priority Badge */}
      <View style={[styles.priorityBadge, { backgroundColor: priorityColors[priorityType] || priorityColors[priorityLevel] || '#9E9E9E' }]}>
        <Text style={styles.priorityText}>
          {priorityLabel.toUpperCase()} PRIORITY
        </Text>
      </View>

      {/* Status Header */}
      <View style={styles.statusHeader}>
        <Text style={styles.statusIcon}>{getStatusIcon(statusKey)}</Text>
        <Text style={styles.statusTitle}>{statusKey.replace(/_/g, ' ').toUpperCase()}</Text>
        <Text style={styles.statusMessage}>{getStatusMessage(statusKey)}</Text>
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
            {Number.isFinite(Number(order.total_amount)) ? formatCurrency(order.total_amount) : '—'}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Placed At:</Text>
          <Text style={styles.detailValue}>
            {order.placed_at ? new Date(order.placed_at).toLocaleString() : '—'}
          </Text>
        </View>

        {hasEta && (
          <View style={styles.etaCard}>
            <View style={styles.etaRow}>
              <Text style={styles.etaLabel}>
                {hasPrioritySavings ? 'Priority ETA:' : 'Estimated Delivery:'}
              </Text>
              <Text style={styles.etaValue}>{etaMinutes} mins</Text>
            </View>
            {hasPrioritySavings && (
              <Text style={styles.etaSavings}>
                Standard ETA {standardEtaMinutes} mins - saved {etaSavingsMinutes} mins
              </Text>
            )}
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
        onPress={handleBackPress}
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
  etaCard: {
    paddingVertical: 15,
    backgroundColor: '#f2f2f2',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginTop: 10,
  },
  etaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  etaLabel: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
  },
  etaValue: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  etaSavings: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
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
