import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchOrderById } from '../store/slices/orderSlice';
import { formatCurrency } from '../utils/currency';
import { getPriorityDisplay } from '../utils/orderPresentation';

export default function OrderConfirmationScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const { currentOrder, loading } = useSelector((state) => state.orders);
  const orderId = route.params?.orderId || currentOrder?.id;
  const order =
    currentOrder?.id != null && String(currentOrder.id) === String(orderId)
      ? currentOrder
      : null;

  useEffect(() => {
    if (orderId) {
      dispatch(fetchOrderById(orderId));
    }
  }, [dispatch, orderId]);

  if (!orderId) {
    return (
      <View style={styles.container}>
        <Text style={styles.icon}>!</Text>
        <Text style={styles.title}>Order not found</Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('Main', { screen: 'Home' })}
        >
          <Text style={styles.primaryButtonText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading && !order?.id) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#111" />
        <Text style={styles.loadingText}>Confirming your order...</Text>
      </View>
    );
  }

  const status = String(order?.status || 'pending').replace(/_/g, ' ');

  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>✓</Text>
      </View>

      <Text style={styles.title}>Order Confirmed</Text>
      <Text style={styles.subtitle}>
        Your order has been placed successfully. Track it live as the restaurant prepares it.
      </Text>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Order ID</Text>
          <Text style={styles.value}>#{orderId}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Status</Text>
          <Text style={styles.value}>{status.toUpperCase()}</Text>
        </View>
        {order?.total_amount != null && (
          <View style={styles.row}>
            <Text style={styles.label}>Total</Text>
            <Text style={styles.value}>{formatCurrency(order.total_amount)}</Text>
          </View>
        )}
        {order && (
          <View style={styles.row}>
            <Text style={styles.label}>Priority</Text>
            <Text style={styles.value}>{getPriorityDisplay(order).toUpperCase()}</Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => navigation.replace('OrderTracking', { orderId })}
      >
        <Text style={styles.primaryButtonText}>Track Order</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigation.navigate('Main', { screen: 'Home' })}
      >
        <Text style={styles.secondaryButtonText}>Back to Home</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f7f9',
    justifyContent: 'center',
    padding: 24,
  },
  badge: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },
  badgeText: {
    color: '#fff',
    fontSize: 46,
    fontWeight: '800',
  },
  icon: {
    fontSize: 46,
    fontWeight: '800',
    color: '#111',
    textAlign: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#111',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 24,
  },
  loadingText: {
    marginTop: 12,
    textAlign: 'center',
    color: '#555',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  label: {
    color: '#666',
    fontSize: 14,
  },
  value: {
    color: '#111',
    fontSize: 14,
    fontWeight: '800',
  },
  primaryButton: {
    backgroundColor: '#111',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d9dde3',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#111',
    fontSize: 16,
    fontWeight: '700',
  },
});
