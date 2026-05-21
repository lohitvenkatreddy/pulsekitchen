# Map Features Implementation Plan

## Summary

You've chosen **Option B: Full Implementation** which includes:

1. ✅ **Address Map Selection** - Drop a pin to select delivery address
2. ✅ **Restaurant Mapping & ETA** - Show route and tracking for orders

Both specs are complete with requirements, design, and tasks.

---

## Implementation Overview

### Address Map Selection (9 tasks)
**Purpose:** Let users select delivery address by dropping a pin on a map

**Key Features:**
- Interactive Mapbox map
- GPS location detection
- Tap to drop pin
- Display coordinates
- Save to user profile

**Estimated Time:** 4-6 hours

---

### Restaurant Mapping & ETA (16 tasks)
**Purpose:** Show restaurant location, route, and ETA for order tracking

**Key Features:**
- Restaurant and user location markers
- Route visualization using Mapbox Directions API
- Real-time ETA calculation
- Session-based caching
- Integration with order tracking screen

**Estimated Time:** 8-12 hours

---

## Total Effort Estimate

**Combined:** 12-18 hours of implementation work

**Breakdown:**
- Mapbox SDK setup and configuration: 1-2 hours
- Address selection feature: 4-6 hours
- Restaurant mapping feature: 8-12 hours
- Testing and bug fixes: 2-3 hours

---

## Prerequisites

Before starting implementation, you need:

### 1. Mapbox Account & Token
- Sign up at https://www.mapbox.com/
- Create an access token from dashboard
- Token format: `pk.ey...` (starts with "pk.")

### 2. Install Mapbox SDK
```bash
cd mobile-app
npm install @rnmapbox/maps
```

### 3. Configure Environment
```bash
# Create mobile-app/.env file
EXPO_PUBLIC_MAPBOX_TOKEN=pk.your_actual_token_here
```

### 4. Expo Dev Build (Important!)
Mapbox GL requires native code, which means:
- ❌ **Won't work in Expo Go**
- ✅ **Requires Expo Dev Build** or **ejecting to bare React Native**

**Options:**
- **Option A:** Create Expo Dev Build (recommended)
  ```bash
  npx expo install expo-dev-client
  eas build --profile development --platform ios
  ```
- **Option B:** Eject to bare React Native
  ```bash
  npx expo prebuild
  ```

---

## Implementation Approach

### Option 1: Automated Implementation (Recommended)
I can execute all tasks automatically using the spec-task-execution subagent:

**Pros:**
- Fast and efficient
- Follows spec exactly
- All tasks tracked and validated

**Cons:**
- Large amount of code generated at once
- May need adjustments after testing

**Command:**
```
Execute all tasks from address-map-selection spec
Execute all tasks from restaurant-mapping-eta spec
```

---

### Option 2: Manual Step-by-Step
You implement tasks manually following the spec documents:

**Pros:**
- Full control over implementation
- Learn the codebase deeply
- Can adjust as you go

**Cons:**
- Time-consuming (12-18 hours)
- Requires deep understanding of Mapbox API

---

### Option 3: Hybrid Approach
I implement core functionality, you handle customization:

**Pros:**
- Balance of speed and control
- I handle complex parts (Mapbox integration)
- You customize UI/UX

**Cons:**
- Requires coordination
- May need multiple iterations

---

## Recommended Next Steps

### Step 1: Get Mapbox Token
1. Go to https://www.mapbox.com/
2. Sign up for free account
3. Go to Account → Tokens
4. Create new token or copy default public token
5. Save token (starts with `pk.`)

### Step 2: Install Dependencies
```bash
cd mobile-app
npm install @rnmapbox/maps
```

### Step 3: Configure Environment
```bash
# Create mobile-app/.env
EXPO_PUBLIC_MAPBOX_TOKEN=pk.your_token_here
```

### Step 4: Choose Implementation Approach
Tell me which option you prefer:
- **Option 1:** Automated (I execute all tasks)
- **Option 2:** Manual (you implement following specs)
- **Option 3:** Hybrid (I do core, you customize)

---

## Important Notes

### Expo Go Limitation
Mapbox GL SDK requires native modules that **don't work in Expo Go**. You'll need:
- Expo Dev Build, OR
- Bare React Native (ejected)

### Testing Requirements
- Test on physical device for GPS accuracy
- Test various scenarios (permission denied, no GPS, etc.)
- Test network failures and API errors

### Backend Requirements
Both features require backend endpoints:
- `POST /api/users/address` - Save address coordinates
- `GET /api/restaurants/:id` - Get restaurant coordinates
- Mapbox Directions API integration (external)

---

## What Do You Want To Do?

Please choose:

1. **Get Mapbox token first** - I'll wait while you sign up
2. **Start automated implementation** - I'll execute all tasks
3. **Simplify the scope** - Reduce features to make it faster
4. **Something else** - Tell me what you prefer

Let me know and I'll proceed accordingly!
