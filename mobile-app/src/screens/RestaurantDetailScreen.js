import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useDispatch } from 'react-redux';
import { addItemToCart } from '../store/slices/cartSlice';
import restaurantService from '../services/restaurantService';

export default function RestaurantDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const [restaurant, setRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const dispatch = useDispatch();

  useEffect(() => {
    let mounted = true;

    const loadRestaurant = async () => {
      try {
        const [restaurantResponse, menuResponse] = await Promise.all([
          restaurantService.getRestaurantById(id),
          restaurantService.getMenu(id),
        ]);

        if (!mounted) {
          return;
        }

        setRestaurant(restaurantResponse.data);
        setMenuItems(menuResponse.data);
      } catch (_error) {
        if (mounted) {
          Alert.alert('Error', 'Could not load restaurant details.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadRestaurant();

    return () => {
      mounted = false;
    };
  }, [id]);

  const addToCart = (item) => {
    if (!restaurant) {
      return;
    }
    dispatch(addItemToCart({ restaurant, item }));
    Alert.alert('Added to cart', `${item.name} added!`);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  if (!restaurant) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Restaurant not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.restaurantName}>{restaurant.name}</Text>
          <Text style={styles.restaurantDescription}>{restaurant.address}</Text>
          <View style={styles.ratingRow}>
            <Text style={styles.rating}>★ {Number(restaurant.rating || 0).toFixed(1)}</Text>
            <Text style={styles.deliveryTime}>{restaurant.cuisine_type || 'Restaurant'}</Text>
          </View>
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Menu</Text>
          {menuItems.length === 0 && (
            <Text style={styles.emptyMenuText}>No menu items available right now.</Text>
          )}
          {menuItems.map((item) => (
            <View key={item.id} style={styles.menuItem}>
              <View style={styles.menuItemInfo}>
                <Text style={styles.menuItemName}>{item.name}</Text>
                <Text style={styles.menuItemDescription}>{item.description}</Text>
                <Text style={styles.menuItemPrice}>${item.price.toFixed(2)}</Text>
              </View>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => addToCart(item)}
              >
                <Text style={styles.addButtonText}>ADD</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.cartSummary}>
        <TouchableOpacity
          style={styles.checkoutButton}
          onPress={() => navigation.navigate('Cart')}
        >
          <Text style={styles.checkoutButtonText}>Go to Cart</Text>
        </TouchableOpacity>
      </View>
    </View>
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
  content: {
    flex: 1,
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
  },
  restaurantName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  restaurantDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  ratingRow: {
    flexDirection: 'row',
    marginTop: 10,
    alignItems: 'center',
  },
  rating: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFB800',
    marginRight: 15,
  },
  deliveryTime: {
    fontSize: 14,
    color: '#666',
  },
  menuSection: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  emptyMenuText: {
    color: '#666',
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  menuItemInfo: {
    flex: 1,
  },
  menuItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  menuItemDescription: {
    fontSize: 13,
    color: '#999',
    marginTop: 4,
  },
  menuItemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginTop: 8,
  },
  addButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  cartSummary: {
    backgroundColor: '#fff',
    padding: 15,
    borderTopWidth: 1,
    elevation: 5,
  },
  checkoutButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  checkoutButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
