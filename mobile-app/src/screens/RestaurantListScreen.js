import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchRestaurants } from '../store/slices/restaurantSlice';

export default function RestaurantListScreen({ navigation }) {
  const dispatch = useDispatch();
  const { filteredRestaurants } = useSelector((state) => state.restaurants);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState(null);

  const cuisines = ['All', 'Italian', 'Chinese', 'Indian', 'Mexican', 'American', 'Thai'];

  useEffect(() => {
    dispatch(fetchRestaurants());
  }, [dispatch]);

  const restaurants = Array.isArray(filteredRestaurants) ? filteredRestaurants : [];
  const filteredData = restaurants.filter((r) => {
    const matchesSearch = r.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCuisine = !selectedCuisine || selectedCuisine === 'All' || r.cuisine_type === selectedCuisine;
    return matchesSearch && matchesCuisine;
  });

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search restaurants..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Cuisine Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
        {cuisines.map((cuisine) => (
          <TouchableOpacity
            key={cuisine}
            style={[
              styles.filterChip,
              selectedCuisine === cuisine && styles.filterChipActive,
            ]}
            onPress={() => setSelectedCuisine(cuisine)}
          >
            <Text
              style={[
                styles.filterText,
                selectedCuisine === cuisine && styles.filterTextActive,
              ]}
            >
              {cuisine}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Restaurant List */}
      <FlatList
        data={filteredData}
        keyExtractor={(item, index) => `restaurant-${item.id ?? item.name}-${index}`}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.restaurantCard}
            onPress={() => navigation.navigate('RestaurantDetail', { id: item.id })}
          >
            <View style={styles.cardContent}>
              <View style={styles.restaurantInfo}>
                <Text style={styles.restaurantName}>{item.name}</Text>
                <Text style={styles.restaurantCuisine}>{item.cuisine_type}</Text>
                <Text style={styles.restaurantAddress}>{item.address}</Text>
              </View>
              <View style={styles.ratingContainer}>
                <Text style={styles.rating}>★ {item.rating?.toFixed(1) || 'N/A'}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No restaurants found</Text>
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
  searchContainer: {
    padding: 15,
    backgroundColor: '#fff',
  },
  searchInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  filterContainer: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#000',
  },
  filterText: {
    color: '#666',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
  },
  restaurantCard: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: 10,
    padding: 15,
    borderRadius: 12,
    elevation: 2,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    color: '#000',
    marginTop: 4,
  },
  restaurantAddress: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  ratingContainer: {
    alignItems: 'center',
  },
  rating: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFB800',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 50,
    fontSize: 16,
  },
});
