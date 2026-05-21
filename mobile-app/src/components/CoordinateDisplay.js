import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
export default function CoordinateDisplay({ coordinates }) {
  const displayText = coordinates
    ? coordinates.place?.name || coordinates.place?.formattedAddress || 'Finding place name...'
    : 'Choose your current location or enter coordinates';

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Selected Location:</Text>
      <Text style={[styles.coordinates, !coordinates && styles.placeholder]} numberOfLines={2}>
        {displayText}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  label: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
    fontWeight: '600',
  },
  coordinates: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  placeholder: {
    color: '#999',
    fontStyle: 'italic',
  },
});
