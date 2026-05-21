# ETA Bug Fix and Map Implementation Requirements

## Issue Summary

Based on your feedback and the screenshot, there are THREE main issues to address:

### 1. ✅ FIXED: ETA Calculation Bug (28170 mins)
**Problem:** Estimated delivery showing "28170 mins" instead of realistic values like "15-30 mins"

**Root Cause:** 
- Invalid or missing coordinates in `delivery_address` field (0, 0)
- Haversine distance calculation with (0,0) coordinates returns huge distances
- No validation or capping of unrealistic ETA values

**Solution Applied:**
- Added coordinate validation in `calculate_eta()` function
- Return default ETA (30 mins) when coordinates are invalid (near 0,0)
- Added distance sanity check - cap at 100km, default to 10km if exceeded
- Added maximum ETA cap of 90 minutes to prevent unrealistic values
- All tests pass ✅

**Files Modified:**
- `delivery-service/app/eta.py`

---

### 2. ⏳ TODO: Map View for Address Selection
**Requirement:** "I want maps view so that i can select the address in the map like drop a pin"

**What's Needed:**
- Interactive map screen where users can drop a pin to select their delivery address
- Reverse geocoding to convert pin location to street address
- Save selected address to user profile

**Current Status:**
- ✅ Spec already created: `.kiro/specs/address-map-selection/`
- ❌ NOT IMPLEMENTED YET (you said to keep it simple, so we removed this spec)

**Options:**
1. **Skip this feature** - Keep it simple, users type addresses manually
2. **Implement basic version** - Simple map with pin drop (no reverse geocoding)
3. **Full implementation** - Complete the address-map-selection spec

**Recommendation:** Skip for now to keep project simple. Focus on order tracking map instead.

---

### 3. ⏳ TODO: Map View for Order Tracking
**Requirement:** "tracking should also be there in the map"

**What's Needed:**
- Show restaurant location on map
- Show user's delivery address on map
- Draw route between restaurant and delivery address
- Display real-time ETA
- Show delivery partner location (if available)

**Current Status:**
- ✅ Spec already created: `.kiro/specs/restaurant-mapping-eta/`
- ✅ Requirements, Design, and Tasks documents complete
- ❌ NOT IMPLEMENTED YET

**Implementation Plan:**
The spec has 16 tasks broken down into phases:

**Phase 1: Core Setup (Tasks 1-7)**
1. Set up Mapbox GL SDK and environment configuration
2. Implement Location Manager utility
3. Implement Token Manager utility
4. Implement Session Cache utility
5. Implement Route Calculator service
6. Implement ETA Calculator utility
7. Implement coordinate validation utility

**Phase 2: State Management (Tasks 9-10)**
9. Implement Map Redux slice
10. Register Map slice in Redux store

**Phase 3: UI Components (Tasks 11-13)**
11. Implement Map Renderer component
12. Implement Map Screen component
13. Integrate Map Screen into navigation

**Phase 4: Documentation (Tasks 15-16)**
15. Add environment variable documentation
16. Final validation

**Estimated Effort:** 
- With optional tests skipped: ~8-10 hours
- With all tests: ~15-20 hours

---

## Current State of Order Tracking Screen

The `OrderTrackingScreen.js` currently shows:
- ✅ Order status (PENDING, CONFIRMED, PREPARING, etc.)
- ✅ Priority level badge
- ✅ Priority score
- ✅ Order details (ID, amount, placed time)
- ✅ ETA display (now fixed!)
- ❌ Map placeholder (says "Route preview - enable a dev build + maps config for live map")

**The map placeholder needs to be replaced with actual Mapbox GL map implementation.**

---

## Recommended Next Steps

### Option A: Keep It Simple (Recommended)
1. ✅ ETA bug is fixed
2. ✅ Home screen improvements done
3. ❌ Skip address selection map (users type addresses)
4. ✅ Implement order tracking map (use existing spec)

**Action:** Execute tasks from `.kiro/specs/restaurant-mapping-eta/tasks.md`

### Option B: Full Implementation
1. ✅ ETA bug is fixed
2. ✅ Home screen improvements done
3. ⏳ Implement address selection map
4. ⏳ Implement order tracking map

**Action:** Execute both specs sequentially

---

## What You Need to Decide

**Question 1:** Do you want the address selection map feature?
- **Yes** → We'll implement the address-map-selection spec
- **No** → We'll skip it and keep address entry manual

**Question 2:** Do you want to implement the order tracking map now?
- **Yes** → We'll execute the restaurant-mapping-eta spec tasks
- **Later** → We'll focus on other features first

**Question 3:** Do you want to implement all tasks or skip optional tests?
- **All tasks** → More robust but takes longer
- **Skip optional tests** → Faster MVP delivery

---

## Technical Requirements for Map Implementation

### Prerequisites:
1. **Mapbox Account** - Sign up at https://www.mapbox.com/
2. **Mapbox Access Token** - Get from Mapbox dashboard
3. **Environment Variable** - Add `MAPBOX_ACCESS_TOKEN` to `.env` file
4. **Install Dependencies** - `npm install @rnmapbox/maps` in mobile-app

### Configuration:
```bash
# mobile-app/.env
MAPBOX_ACCESS_TOKEN=pk.your_actual_token_here
```

### Testing:
- Expo Go may not support native maps - need Expo Dev Build
- Alternative: Use Expo's built-in MapView (less features but works in Expo Go)

---

## Summary

✅ **DONE:**
- Fixed ETA calculation bug (28170 mins → realistic values)
- Added coordinate validation
- Added distance and ETA caps
- All tests passing

⏳ **PENDING YOUR DECISION:**
- Address selection map (recommend: skip)
- Order tracking map (recommend: implement)

**Next Action:** Tell me which option you prefer (A or B) and I'll proceed accordingly.
