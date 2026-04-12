import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchRestaurants } from '../store/slices/restaurantSlice';
import { fetchOrders } from '../store/slices/orderSlice';

export default function HomeScreen({ navigation }) {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { filteredRestaurants, loading } = useSelector((state) => state.restaurants);
  const { orders } = useSelector((state) => state.orders);
  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => {
    dispatch(fetchRestaurants());
    dispatch(fetchOrders());
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    Promise.all([
      dispatch(fetchRestaurants()),
      dispatch(fetchOrders()),
    ]).then(() => setRefreshing(false));
  }, []);

  const activeOrder = orders.find(o =>
    ['pending', 'confirmed', 'preparing', 'out_for_delivery'].includes(o.status)
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.full_name?.split(' ')[0] || 'Guest'}!</Text>
          <Text style={styles.subGreeting}>What would you like to eat today?</Text>
        </View>
      </View>

      {/* Active Order Card */}
      {activeOrder && (
        <TouchableOpacity
          style={styles.activeOrderCard}
          onPress={() => navigation.navigate('OrderTracking')}
        >
          <Text style={styles.activeOrderTitle}>Active Order</Text>
          <Text style={styles.activeOrderStatus}>{activeOrder.status.replace('_', ' ').toUpperCase()}</Text>
          <Text style={styles.activeOrderETA}>
            Priority: {activeOrder.priority_level?.toUpperCase()}
          </Text>
        </TouchableOpacity>
      )}

      {/* Categories */}
      <Text style={styles.sectionTitle}>Categories</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categories}>
        {['Pizza', 'Burgers', 'Chinese', 'Indian', 'Healthy', 'Desserts'].map((cat) => (
          <TouchableOpacity key={cat} style={styles.categoryChip}>
            <Text style={styles.categoryText}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Popular Restaurants */}
      <Text style={styles.sectionTitle}>Popular Near You</Text>
      {loading ? (
        <Text style={styles.loadingText}>Loading restaurants...</Text>
      ) : (
        filteredRestaurants.slice(0, 5).map((restaurant) => (
          <TouchableOpacity
            key={restaurant.id}
            style={styles.restaurantCard}
            onPress={() => navigation.navigate('RestaurantDetail', { id: restaurant.id })}
          >
            <View style={styles.restaurantInfo}>
              <Text style={styles.restaurantName}>{restaurant.name}</Text>
              <Text style={styles.restaurantCuisine}>{restaurant.cuisine_type}</Text>
              <View style={styles.ratingRow}>
                <Text style={styles.rating}>★ {restaurant.rating?.toFixed(1) || 'N/A'}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#FF6B35',
    padding: 20,
    paddingTop: 50,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subGreeting: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginTop: 4,
  },
  activeOrderCard: {
    backgroundColor: '#4CAF50',
    margin: 15,
    padding: 15,
    borderRadius: 12,
    elevation: 3,
  },
  activeOrderTitle: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.9,
  },
  activeOrderStatus: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 5,
  },
  activeOrderETA: {
    color: '#fff',
    fontSize: 14,
    marginTop: 5,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    margin: 15,
    marginTop: 25,
  },
  categories: {
    paddingHorizontal: 15,
  },
  categoryChip: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    elevation: 2,
  },
  categoryText: {
    color: '#333',
    fontWeight: '500',
  },
  restaurantCard: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginBottom: 10,
    padding: 15,
    borderRadius: 12,
    elevation: 2,
  },
  restaurantInfo: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  restaurantCuisine: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  rating: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFB800',
  },
  loadingText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 20,
  },
});
