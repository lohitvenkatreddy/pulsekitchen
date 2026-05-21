# Map Feature Errors - Fixed

## Errors Found in Logs

### 1. ❌ Font Warnings (FIXED)
**Error:**
```
WARN fontFamily "system" is not a system font
WARN fontFamily "monospace" is not a system font
```

**Cause:** CoordinateDisplay component was using custom font families that aren't loaded

**Fix:** Removed `fontFamily: 'monospace'` and `fontFamily: 'system'` from styles
- Changed to use default system fonts with `fontWeight: '500'`

**File:** `mobile-app/src/components/CoordinateDisplay.js`

---

### 2. ❌ Save Location 422 Error (FIXED)
**Error:**
```
ERROR [API Error] POST /users/me/addresses - 422: [object Object]
```

**Cause:** Frontend was sending wrong field names to backend
- Frontend sent: `address_line1`, `state`
- Backend expects: `line1`, `region`

**Fix:** Updated mapSelectionSlice to send correct field names:
```javascript
{
  label: 'Map Location',
  line1: `${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`,
  line2: null,
  city: null,
  region: null,
  postal_code: null,
  country: 'US',
  latitude: coordinates.latitude,
  longitude: coordinates.longitude,
  is_default: false,
}
```

**File:** `mobile-app/src/store/slices/mapSelectionSlice.js`

---

### 3. ❌ React Rendering Error (FIXED)
**Error:**
```
ERROR Error: Objects are not valid as a React child (found: object with keys {type, loc, msg, input, url})
```

**Cause:** Backend validation errors (422) return an array of error objects, but frontend was trying to render them directly as text

**Fix:** Added proper error parsing in mapSelectionSlice:
```javascript
// Handle validation errors (422) which return an array of error objects
if (error.response?.data?.detail) {
  const detail = error.response.data.detail;
  // If detail is an array of validation errors, extract the messages
  if (Array.isArray(detail)) {
    const errorMessages = detail.map(err => err.msg || JSON.stringify(err)).join(', ');
    return rejectWithValue(errorMessages);
  }
  // If detail is a string, return it directly
  return rejectWithValue(detail);
}
```

**File:** `mobile-app/src/store/slices/mapSelectionSlice.js`

---

### 4. ✅ Added Save Error Alert
**Enhancement:** Added useEffect to show alert when save fails

```javascript
useEffect(() => {
  // Show error alert when save fails
  if (error && !isLoading && isSaving === false && !saveSuccess) {
    const errorString = typeof error === 'string' ? error : JSON.stringify(error);
    if (errorString.includes('save') || errorString.includes('address')) {
      Alert.alert('Error', errorString);
    }
  }
}, [error, isLoading, isSaving, saveSuccess]);
```

**File:** `mobile-app/src/screens/MapSelectionScreen.js`

---

## Other Errors (Not Map-Related)

### Orders API 500 Error
```
ERROR [API Error] GET /orders/ - 500: Request failed with status code 500
```
**Status:** Backend issue, not related to map feature
**Action:** Needs backend investigation

### Settings API 404 Error
```
ERROR [API Error] GET /users/5/settings - 404: Not Found
```
**Status:** Expected - backend endpoint not implemented yet
**Action:** No action needed for map feature

---

## Testing the Fixes

### Steps to Test:

1. **Restart the app:**
   ```bash
   cd mobile-app
   npm start -- --clear
   ```

2. **Test map save:**
   - Go to Profile → Saved Addresses
   - Tap "+ Add New Address"
   - Tap "🗺️ Select on Map"
   - Grant location permission
   - Tap anywhere on the map to place a pin
   - Tap "Save Location"
   - **Expected:** Success alert → Returns to Saved Addresses → New address appears in list

3. **Verify no errors:**
   - Check Metro bundler logs - should see no font warnings
   - Check for successful POST to `/users/me/addresses`
   - Verify address appears in Saved Addresses list

### Expected Behavior:

✅ No font warnings in console
✅ Map displays correctly
✅ Can place pin on map
✅ Coordinates display at bottom
✅ "Save Location" button works
✅ Success alert appears
✅ Returns to Saved Addresses
✅ New address appears with coordinates as line1
✅ No React rendering errors

---

## Backend Schema Reference

For future reference, the backend expects these fields for addresses:

**Required:**
- `line1` (string, min_length=1)

**Optional:**
- `label` (string, default="Home")
- `line2` (string)
- `city` (string)
- `region` (string)
- `postal_code` (string)
- `country` (string, default="US")
- `latitude` (float)
- `longitude` (float)
- `is_default` (boolean, default=false)

**Source:** `user-service/app/address_schemas.py`

---

## Files Modified

1. ✅ `mobile-app/src/store/slices/mapSelectionSlice.js`
   - Fixed field names (line1, region instead of address_line1, state)
   - Added proper error parsing for validation errors
   - Added latitude/longitude to save request

2. ✅ `mobile-app/src/screens/MapSelectionScreen.js`
   - Added useEffect to show save error alerts

3. ✅ `mobile-app/src/components/CoordinateDisplay.js`
   - Removed custom font families causing warnings

---

## Next Steps

After restarting the app, the map feature should work completely:
1. Map displays ✅
2. Can select location ✅
3. Can save location ✅
4. No errors in console ✅

If you still see errors, check:
- Backend is running
- User is authenticated (has valid token)
- Database is accessible
