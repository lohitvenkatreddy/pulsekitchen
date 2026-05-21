# Map Feature Diagnostic Guide

## Why is the map empty?

The map appears empty because `react-native-maps` requires the app to be fully restarted after installation. Simply reloading in Expo Go is not enough.

## Fix Steps (Do these in order)

### Step 1: Stop Everything
```bash
# In the terminal where Metro bundler is running, press Ctrl+C
```

### Step 2: Clear Cache and Restart
```bash
cd mobile-app
npm start -- --clear
```

### Step 3: Completely Close and Reopen Expo Go
- **Don't just reload** - completely close the Expo Go app
- Reopen Expo Go
- Scan the QR code again

### Step 4: Test the Map
1. Open the app
2. Go to **Profile** tab (bottom right)
3. Tap **Saved Addresses**
4. Tap **+ Add New Address**
5. Tap **🗺️ Select on Map** button
6. Grant location permission when prompted
7. **The map should now appear!**

## What You Should See

✅ **Success indicators:**
- Map tiles loading (showing streets, buildings)
- Blue dot showing your current location
- Map centered on your location
- Can tap anywhere to place a red pin
- Coordinates display at bottom when pin placed
- "Save Location" button enabled after placing pin

❌ **Problem indicators:**
- Blank/white screen where map should be
- Gray tiles with no map data
- No blue dot for current location
- Error message about location permission

## Still Not Working?

### Check 1: Verify Installation
```bash
cd mobile-app
npm list react-native-maps
```
Should show: `react-native-maps@1.10.0`

### Check 2: Check for Errors
Look at the Metro bundler terminal for any red error messages.

Common errors:
- `Unable to resolve module` → Run `npm install` again
- `Location permission denied` → Grant permission in device settings
- `Map component not found` → Restart Metro bundler

### Check 3: Test Location Service Separately
The map uses `expo-location` for GPS. Test if location works:

1. Go to Profile → Saved Addresses
2. Tap + Add New Address
3. Tap **📍 Use Current Location** button
4. If this works, GPS is fine and issue is map-specific
5. If this fails, location permission is the issue

### Check 4: Device Settings
**iOS:**
- Settings → Privacy & Security → Location Services → ON
- Settings → Privacy & Security → Location Services → Expo Go → "While Using"

**Android:**
- Settings → Apps → Expo Go → Permissions → Location → Allow

### Check 5: Try on Different Device/Simulator
- iOS Simulator: Xcode → Features → Location → Custom Location
- Android Emulator: Extended Controls → Location → Set location
- Physical device: Best for testing (simulators can have GPS issues)

## Common Issues and Solutions

### Issue: Map shows but is gray/blank
**Solution:** This usually means no map tiles are loading. 
- Check internet connection
- Wait 10-15 seconds for tiles to load
- Try zooming in/out on the map

### Issue: "Location permission denied" error
**Solution:** 
1. Go to device Settings
2. Find Expo Go app
3. Grant Location permission
4. Return to app and tap "Retry" button

### Issue: Map shows ocean (coordinates 0, 0)
**Solution:** GPS location not retrieved yet.
- Wait a few seconds for GPS to acquire location
- Make sure you're outdoors or near a window (better GPS signal)
- Try the "Retry" button

### Issue: App crashes when opening map
**Solution:**
1. Check Metro bundler for error messages
2. Clear cache: `npm start -- --clear`
3. Reinstall dependencies: `rm -rf node_modules && npm install`

### Issue: Blue dot (current location) not showing
**Solution:**
- Check location permission is granted
- Check that `showsUserLocation={true}` in MapView (already set)
- Wait a few seconds for GPS to acquire location
- Try on a physical device (simulators can be unreliable)

## Debug Mode

To see detailed logs, check the Metro bundler terminal for messages like:
```
[LocationService] Permission request error: ...
[LocationService] Get location error: ...
[MapSelectionScreen] Location error: ...
```

These will help identify the exact issue.

## Need More Help?

If the map still doesn't work after following all steps:

1. **Share the error message** from Metro bundler terminal
2. **Share what you see** - blank screen? gray tiles? error message?
3. **Share device info** - iOS/Android? Physical device or simulator?
4. **Share what happens** when you tap "Select on Map" button

## Expected Behavior Video

When working correctly:
1. Tap "Select on Map" → Permission prompt appears
2. Grant permission → Map loads with your location
3. Blue dot appears at your location
4. Map is centered on your location
5. Tap anywhere → Red pin appears
6. Coordinates show at bottom
7. "Save Location" button turns black (enabled)
8. Tap "Save Location" → Success message → Returns to Saved Addresses
9. New address appears in list with coordinates
