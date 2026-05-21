# Map Feature Setup Guide

## Current Status
The map selection feature has been implemented but requires proper configuration to display maps.

## Issue
The map appears empty because:
1. No map provider API key is configured
2. The app needs to be restarted after installing `react-native-maps`

## Quick Fix (No API Key Required)

I've updated the code to use the default map provider, which works without an API key:
- **iOS**: Uses Apple Maps (no configuration needed)
- **Android**: Uses OpenStreetMap-based maps (no API key needed in Expo Go)

### Steps to Test:

1. **Stop the Metro bundler** (if running):
   ```bash
   # Press Ctrl+C in the terminal where Metro is running
   ```

2. **Clear cache and restart**:
   ```bash
   cd mobile-app
   npm start -- --clear
   ```

3. **Reload the app**:
   - In Expo Go, shake your device and tap "Reload"
   - Or close and reopen the app

4. **Test the feature**:
   - Go to Profile → Saved Addresses
   - Tap "+ Add New Address"
   - Tap "🗺️ Select on Map"
   - Grant location permission when prompted
   - The map should now display with your current location

## Optional: Add Google Maps (Better Performance)

If you want to use Google Maps for better performance and features:

### 1. Get Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable "Maps SDK for Android" and "Maps SDK for iOS"
4. Create credentials → API Key
5. Restrict the API key to your app (recommended for production)

### 2. Configure app.json

Add the API key to `mobile-app/app.json`:

```json
{
  "expo": {
    "name": "PulseKitchen",
    "slug": "pulsekitchen",
    "version": "1.0.0",
    "orientation": "portrait",
    "userInterfaceStyle": "light",
    "assetBundlePatterns": ["**/*"],
    "ios": {
      "supportsTablet": true,
      "config": {
        "googleMapsApiKey": "YOUR_IOS_API_KEY_HERE"
      }
    },
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#ffffff"
      },
      "config": {
        "googleMaps": {
          "apiKey": "YOUR_ANDROID_API_KEY_HERE"
        }
      }
    },
    "scheme": "pulsekitchen"
  }
}
```

### 3. Update MapSelectionScreen.js

Uncomment the Google Maps provider:

```javascript
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

// In the MapView component:
<MapView
  style={styles.map}
  region={mapRegion}
  onPress={handleMapPress}
  provider={PROVIDER_GOOGLE}  // Add this line back
  showsUserLocation={true}
  showsMyLocationButton={true}
  showsCompass={true}
  loadingEnabled={true}
>
```

### 4. Rebuild the app

After adding API keys, you need to rebuild:
```bash
cd mobile-app
npm start -- --clear
```

## Troubleshooting

### Map still not showing?

1. **Check location permissions**:
   - iOS: Settings → PulseKitchen → Location → "While Using the App"
   - Android: Settings → Apps → PulseKitchen → Permissions → Location

2. **Check console for errors**:
   ```bash
   # Look for errors in Metro bundler terminal
   ```

3. **Verify react-native-maps installation**:
   ```bash
   cd mobile-app
   npm list react-native-maps
   # Should show: react-native-maps@1.10.0
   ```

4. **Clear all caches**:
   ```bash
   cd mobile-app
   rm -rf node_modules
   npm install
   npm start -- --clear
   ```

### Location permission denied?

The app will show an error message with a "Retry" button. Grant permission in device settings and tap Retry.

### Map loads but shows ocean (0,0 coordinates)?

This means GPS location is not being retrieved. Check:
- Location services are enabled on device
- App has location permission
- You're testing on a physical device (simulator GPS can be unreliable)

## Testing Checklist

- [ ] Map displays after app restart
- [ ] Current location marker appears (blue dot)
- [ ] Can tap on map to place red pin
- [ ] Coordinates display at bottom when pin is placed
- [ ] "Save Location" button becomes enabled after placing pin
- [ ] Can save location and it appears in Saved Addresses
- [ ] Location permission prompt appears on first use
- [ ] Error message shows if permission denied

## Next Steps

Once the map is working:
1. Test the full flow: Profile → Saved Addresses → Add New → Select on Map
2. Verify saved locations appear correctly
3. Test on both iOS and Android if possible
4. Consider adding Google Maps API key for production use
