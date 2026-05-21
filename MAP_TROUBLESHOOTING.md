# Map Not Showing - Troubleshooting Guide

## Issue: Address Selection Map is Empty/Not Showing

### Step 1: Restart Metro Bundler (MOST COMMON FIX)

The new MapSelectionScreen won't load without restarting the server.

**Stop the current Expo server:**
- Press `Ctrl+C` in the terminal where Expo is running

**Clear cache and restart:**
```bash
cd mobile-app
npm start -- --clear
```

**Or just restart:**
```bash
cd mobile-app
npm start
```

Then reload the app:
- Shake your device
- Tap "Reload"

---

### Step 2: Verify Navigation Path

Make sure you're following the correct path:

1. Open the app
2. Go to **Profile** tab (bottom navigation)
3. Tap **"Saved Addresses"** (or similar)
4. Tap **"+ Add New Address"** button
5. In the form modal, tap **"🗺️ Select on Map"** button (green button)
6. The MapSelectionScreen should open

**Screenshot of where the button should be:**
- It's in the address form modal
- Below the "📍 Use Current Location" button (blue)
- Green button with text "🗺️ Select on Map"

---

### Step 3: Check for Errors

**In Expo:**
- Shake your device
- Tap "Show Dev Menu"
- Tap "Debug Remote JS"
- Open browser console (Chrome DevTools)
- Look for errors

**Common errors:**
- `MapView is not defined` → react-native-maps not installed
- `Cannot read property 'mapSelection' of undefined` → Redux store not updated
- Permission errors → GPS permission issues

---

### Step 4: Verify Installation

Check if react-native-maps is installed:

```bash
cd mobile-app
npm list react-native-maps
```

Should show:
```
react-native-maps@1.x.x
```

If not installed:
```bash
npx expo install react-native-maps
```

---

### Step 5: Check Redux Store

The mapSelection slice might not be registered. Verify:

**File:** `mobile-app/src/store/store.js`

Should have:
```javascript
import mapSelectionReducer from './slices/mapSelectionSlice';

export const store = configureStore({
  reducer: {
    // ... other reducers
    mapSelection: mapSelectionReducer,  // ← This line must exist
  },
});
```

---

### Step 6: Platform-Specific Issues

#### iOS:
- Maps should work out of the box (uses Apple Maps)
- No API key needed

#### Android:
- Uses Google Maps
- Should work without API key for basic usage
- If map is blank, you might need to add Google Maps API key

**To add Google Maps API key (optional):**

1. Get API key from https://console.cloud.google.com/
2. Enable "Maps SDK for Android"
3. Add to `mobile-app/app.json`:

```json
{
  "expo": {
    "android": {
      "config": {
        "googleMaps": {
          "apiKey": "YOUR_API_KEY_HERE"
        }
      }
    }
  }
}
```

---

### Step 7: Check Expo Go Version

Make sure you're using a recent version of Expo Go:
- iOS: Update from App Store
- Android: Update from Play Store

Minimum version: Expo Go 2.28.0+

---

### Step 8: Test with Simple Map

If still not working, let's test if react-native-maps works at all.

Create a test file: `mobile-app/src/screens/TestMapScreen.js`

```javascript
import React from 'react';
import { View, StyleSheet } from 'react-native';
import MapView from 'react-native-maps';

export default function TestMapScreen() {
  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 37.78825,
          longitude: -122.4324,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
});
```

Add to navigation and test. If this doesn't work, the issue is with react-native-maps installation.

---

### Step 9: Check Console Logs

Look for these log messages in the console:

**Success:**
- `[LocationService] Permission granted`
- `[LocationService] Got location: {latitude: ..., longitude: ...}`

**Errors:**
- `[LocationService] Permission denied`
- `[LocationService] Location request timed out`
- `[MapSelectionScreen] Location error: ...`

---

### Step 10: Verify File Structure

Make sure all files exist:

```
mobile-app/src/
├── components/
│   └── CoordinateDisplay.js          ← Must exist
├── screens/
│   └── MapSelectionScreen.js         ← Must exist
├── services/
│   └── locationService.js            ← Must exist
├── store/
│   ├── store.js                      ← Must have mapSelection
│   └── slices/
│       └── mapSelectionSlice.js      ← Must exist
├── types/
│   └── map.types.js                  ← Must exist
└── utils/
    └── coordinateUtils.js            ← Must exist
```

Check:
```bash
cd mobile-app/src
ls -la screens/MapSelectionScreen.js
ls -la components/CoordinateDisplay.js
ls -la store/slices/mapSelectionSlice.js
```

---

## Quick Fix Checklist

Try these in order:

1. ☐ Restart Metro bundler with `npm start -- --clear`
2. ☐ Reload app (shake device → Reload)
3. ☐ Check you're navigating to the right screen
4. ☐ Check console for errors
5. ☐ Verify react-native-maps is installed
6. ☐ Verify Redux store has mapSelection reducer
7. ☐ Try on different device/simulator
8. ☐ Update Expo Go app

---

## Still Not Working?

**Share these details:**

1. **Platform:** iOS or Android?
2. **Expo Go version:** Check in app settings
3. **Error messages:** Any errors in console?
4. **What you see:** Blank screen? Error message? Loading forever?
5. **Navigation:** Can you reach the MapSelectionScreen at all?
6. **Console logs:** Copy any error messages

**Quick test:**
```bash
cd mobile-app
npm start -- --clear
```

Then in the app:
1. Go to Profile → Saved Addresses
2. Tap "+ Add New Address"
3. Look for "🗺️ Select on Map" button (green)
4. Tap it
5. What happens?

---

## Expected Behavior

When working correctly:

1. Tap "Select on Map" button
2. Screen transitions to MapSelectionScreen
3. Loading overlay appears: "Getting your location..."
4. Permission dialog appears (first time only)
5. After granting permission, map loads and centers on your location
6. You see a map with your blue dot
7. Tap anywhere to drop a red pin
8. Coordinates appear at bottom
9. "Save Location" button becomes enabled
10. Tap to save

If any step fails, note which step and share the error message.
