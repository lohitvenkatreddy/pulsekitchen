import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { fetchRestaurants, setFilters, clearFilters } from '../store/slices/restaurantSlice';
import { fetchOrders } from '../store/slices/orderSlice';
import { fetchAddresses } from '../store/slices/userAddressesSlice';
import { getPriorityDisplay } from '../utils/orderPresentation';
import deliveryService from '../services/deliveryService';

export default function HomeScreen({ navigation }) {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { filteredRestaurants, loading } = useSelector((state) => state.restaurants);
  const { orders } = useSelector((state) => state.orders);
  const { addresses, default_address_id } = useSelector((state) => state.user_addresses);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCuisine, setSelectedCuisine] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeOrderEta, setActiveOrderEta] = useState(null);

  useEffect(() => {
    dispatch(fetchRestaurants());
    dispatch(fetchOrders());
    dispatch(fetchAddresses());
  }, []);

  useFocusEffect(
    useCallback(() => {
      dispatch(fetchAddresses());
    }, [dispatch])
  );

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    Promise.all([
      dispatch(fetchRestaurants()),
      dispatch(fetchOrders()),
      dispatch(fetchAddresses()),
    ]).then(() => setRefreshing(false));
  }, []);

  const activeOrder = orders.find(o =>
    ['pending', 'confirmed', 'preparing', 'ready_for_pickup', 'out_for_delivery'].includes(o.status)
  );

  useEffect(() => {
    let isMounted = true;
    if (!activeOrder?.id) {
      setActiveOrderEta(null);
      return () => {
        isMounted = false;
      };
    }

    deliveryService
      .getETA(activeOrder.id)
      .then((response) => {
        if (isMounted) {
          setActiveOrderEta(response.data);
        }
      })
      .catch(() => {
        if (isMounted) {
          setActiveOrderEta(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeOrder?.id]);

  // Cuisine categories with icons
  const cuisineCategories = [
    { name: 'All', icon: '🍽️', value: null },
    { name: 'Italian', icon: '🍝', value: 'Italian' },
    { name: 'Chinese', icon: '🥡', value: 'Chinese' },
    { name: 'Indian', icon: '🍛', value: 'Indian' },
    { name: 'Mexican', icon: '🌮', value: 'Mexican' },
    { name: 'American', icon: '🍔', value: 'American' },
    { name: 'Thai', icon: '🍜', value: 'Thai' },
  ];

  const handleCuisineSelect = (cuisineValue) => {
    setSelectedCuisine(cuisineValue);
    if (cuisineValue === null) {
      dispatch(clearFilters());
    } else {
      dispatch(setFilters({ cuisine: cuisineValue }));
    }
  };

  const selectedAddress =
    addresses.find((address) => address.id === default_address_id) || addresses[0];

  const formatSelectedAddress = (address) => {
    if (!address) {
      return 'Select Address';
    }

    const line1 = address.street_address_1 || address.line1 || address.address;
    const city = address.city;
    const region = address.region_state || address.region;
    const postalCode = address.postal_code;
    const coordinateLabel =
      address.latitude && address.longitude
        ? `${Number(address.latitude).toFixed(5)}, ${Number(address.longitude).toFixed(5)}`
        : null;

    return [line1, city, region, postalCode].filter(Boolean).join(', ') || coordinateLabel || 'Selected Address';
  };

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const displayedRestaurants = filteredRestaurants.filter((restaurant) => {
    if (!normalizedSearchQuery) {
      return true;
    }

    return [restaurant.name, restaurant.cuisine_type, restaurant.address]
      .concat((restaurant.menu_items || []).flatMap((item) => [item.name, item.description]))
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(normalizedSearchQuery));
  });
  const restaurantsToShow = normalizedSearchQuery
    ? displayedRestaurants
    : displayedRestaurants.slice(0, 5);

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
        
        {/* Address Selection */}
        <TouchableOpacity 
          style={styles.addressButton}
          onPress={() => navigation.navigate('MapSelection')}
        >
          <Text style={styles.addressIcon}>📍</Text>
          <View style={styles.addressTextContainer}>
            <Text style={styles.addressLabel}>Deliver to</Text>
            <Text style={styles.addressText} numberOfLines={1}>
              {formatSelectedAddress(selectedAddress)}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search restaurants or cuisines..."
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
      </View>

      {/* Cuisine Type Filter */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.cuisineFilter}
        contentContainerStyle={styles.cuisineFilterContent}
      >
        {cuisineCategories.map((cuisine) => (
          <TouchableOpacity
            key={cuisine.name}
            style={[
              styles.cuisineChip,
              selectedCuisine === cuisine.value && styles.cuisineChipActive
            ]}
            onPress={() => handleCuisineSelect(cuisine.value)}
          >
            <Text style={styles.cuisineIcon}>{cuisine.icon}</Text>
            <Text style={[
              styles.cuisineText,
              selectedCuisine === cuisine.value && styles.cuisineTextActive
            ]}>
              {cuisine.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Active Order Card with Map and ETA */}
      {activeOrder && (
        <TouchableOpacity
          style={styles.activeOrderCard}
          onPress={() => navigation.navigate('OrderTracking', { orderId: activeOrder.id })}
        >
          <View style={styles.activeOrderHeader}>
            <View>
              <Text style={styles.activeOrderTitle}>Active Order</Text>
              <Text style={styles.activeOrderStatus}>
                {activeOrder.status.replace('_', ' ').toUpperCase()}
              </Text>
            </View>
            <View style={styles.priorityBadge}>
              <Text style={styles.priorityText}>
                {getPriorityDisplay(activeOrder).toUpperCase()}
              </Text>
            </View>
          </View>
          
          {/* Map Icon and ETA Display */}
          <View style={styles.mapEtaContainer}>
            <View style={styles.mapIconContainer}>
              <Text style={styles.mapIcon}>🗺️</Text>
              <Text style={styles.mapLabel}>Track on Map</Text>
            </View>
            <View style={styles.etaContainer}>
              <Text style={styles.etaLabel}>
                {formatEtaSavings(activeOrderEta) ? 'Priority ETA' : 'Estimated Delivery'}
              </Text>
              <Text style={styles.etaTime}>
                {formatEta(activeOrderEta)}
              </Text>
              {formatEtaSavings(activeOrderEta) ? (
                <Text style={styles.priorityBenefit}>
                  {formatEtaSavings(activeOrderEta)}
                </Text>
              ) : activeOrderEta?.distance_km > 0 && (
                <Text style={styles.priorityBenefit}>
                  {Number(activeOrderEta.distance_km).toFixed(1)} km from restaurant
                </Text>
              )}
            </View>
          </View>
          
          <Text style={styles.viewMapText}>Tap to view full map and route →</Text>
        </TouchableOpacity>
      )}

      {/* Popular Restaurants */}
      <Text style={styles.sectionTitle}>
        {normalizedSearchQuery ? 'Search Results' : 'Popular Near You'}
      </Text>
      {loading ? (
        <Text style={styles.loadingText}>Loading restaurants...</Text>
      ) : restaurantsToShow.length === 0 ? (
        <Text style={styles.loadingText}>No restaurants found</Text>
      ) : (
        restaurantsToShow.map((restaurant, index) => (
          <TouchableOpacity
            key={`home-restaurant-${restaurant.id ?? restaurant.name}-${index}`}
            style={styles.restaurantCard}
            onPress={() => navigation.navigate('RestaurantDetail', { id: restaurant.id })}
          >
            <View style={styles.restaurantInfo}>
              <Text style={styles.restaurantName}>{restaurant.name}</Text>
              <Text style={styles.restaurantCuisine}>{restaurant.cuisine_type}</Text>
              {normalizedSearchQuery && restaurant.menu_items?.some((item) =>
                [item.name, item.description]
                  .filter(Boolean)
                  .some((value) => value.toLowerCase().includes(normalizedSearchQuery))
              ) && (
                <Text style={styles.restaurantMatch} numberOfLines={1}>
                  Matches: {restaurant.menu_items
                    .filter((item) =>
                      [item.name, item.description]
                        .filter(Boolean)
                        .some((value) => value.toLowerCase().includes(normalizedSearchQuery))
                    )
                    .map((item) => item.name)
                    .join(', ')}
                </Text>
              )}
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

function formatEta(etaPayload) {
  if (!etaPayload) {
    return 'Calculating...';
  }

  const minutes = Number(etaPayload?.eta_minutes);
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return 'ETA unavailable';
  }
  return `${minutes} min`;
}

function formatEtaSavings(etaPayload) {
  if (!etaPayload) {
    return '';
  }

  const standard = Number(etaPayload?.standard_eta_minutes);
  const priority = Number(etaPayload?.eta_minutes);
  const savings = Number(etaPayload?.eta_savings_minutes);

  if (
    Number.isFinite(standard) &&
    Number.isFinite(priority) &&
    Number.isFinite(savings) &&
    standard > priority &&
    savings > 0
  ) {
    return `Standard ${standard} min - saved ${savings} min`;
  }

  return '';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#000',
    padding: 20,
    paddingTop: 50,
    paddingBottom: 20,
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
  addressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 12,
    borderRadius: 8,
    marginTop: 15,
  },
  addressIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  addressTextContainer: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 11,
    color: '#fff',
    opacity: 0.7,
  },
  addressText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    marginTop: 2,
  },
  searchContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 10,
  },
  searchInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111',
  },
  cuisineFilter: {
    backgroundColor: '#fff',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  cuisineFilterContent: {
    paddingHorizontal: 15,
  },
  cuisineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cuisineChipActive: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  cuisineIcon: {
    fontSize: 18,
    marginRight: 6,
  },
  cuisineText: {
    color: '#333',
    fontWeight: '600',
    fontSize: 14,
  },
  cuisineTextActive: {
    color: '#fff',
  },
  activeOrderCard: {
    backgroundColor: '#4CAF50',
    margin: 15,
    padding: 18,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  activeOrderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
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
  priorityBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  priorityText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  mapEtaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  mapIconContainer: {
    alignItems: 'center',
  },
  mapIcon: {
    fontSize: 32,
  },
  mapLabel: {
    color: '#fff',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
  etaContainer: {
    flex: 1,
    marginLeft: 15,
  },
  etaLabel: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.9,
  },
  etaTime: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 2,
  },
  priorityBenefit: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  viewMapText: {
    color: '#fff',
    fontSize: 13,
    textAlign: 'center',
    opacity: 0.9,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    margin: 15,
    marginTop: 25,
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
  restaurantMatch: {
    fontSize: 12,
    color: '#111',
    marginTop: 4,
    fontWeight: '600',
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
