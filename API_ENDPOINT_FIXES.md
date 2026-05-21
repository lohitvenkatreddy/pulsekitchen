# API Endpoint Fixes - 404 Error Resolution

## Problem Summary
The mobile app was experiencing 404 errors when calling backend APIs because the frontend was using incorrect endpoint paths that didn't match the API gateway routing structure.

## API Gateway Routing Structure

The API gateway routes requests based on the first path segment after `/api/v1/`:

```
/api/v1/auth       → auth-service
/api/v1/users      → user-service
/api/v1/restaurants → restaurant-service
/api/v1/orders     → order-service
/api/v1/delivery   → delivery-service
/api/v1/payment    → payment-service
/api/v1/notifications → notification-service
/api/v1/admin      → admin-service
```

**Important:** The path segment "user" (singular) is NOT recognized by the API gateway. The correct segment is "users" (plural) for user-related endpoints.

## Fixed Services

### 1. ✅ orderService.js (FIXED)
**Before:**
- `/user/orders` → 404 (invalid route segment)
- `/user/orders/${orderId}` → 404
- `/user/orders/${orderId}/reorder` → 404

**After:**
- `/orders/` → ✅ Routes to order-service
- `/orders/${orderId}` → ✅ Routes to order-service
- `/orders/${orderId}/reorder` → ✅ Routes to order-service

### 2. ✅ paymentService.js (FIXED)
**Before:**
- `/user/payment-methods` → 404 (invalid route segment)
- `/user/payment-methods/${id}` → 404

**After:**
- `getPaymentMethods(userId)` → `/payment/saved-methods/${userId}` → ✅ Routes to payment-service
- `addPaymentMethod(cardData)` → `/payment/saved-methods` → ✅ Routes to payment-service
- `deletePaymentMethod(id)` → `/payment/saved-methods/${id}` → ⚠️ Backend endpoint needs implementation
- `setDefaultPaymentMethod(id)` → `/payment/saved-methods/${id}/set-default` → ⚠️ Backend endpoint needs implementation

**Note:** The payment-service has `GET /payment/saved-methods/{user_id}` and `POST /payment/saved-methods` but is missing DELETE and PUT endpoints for individual payment methods.

### 3. ⚠️ addressService.js (UPDATED - Backend Missing)
**Before:**
- `/user/addresses` → 404 (invalid route segment)

**After:**
- All endpoints updated to use `/users/{userId}/addresses` pattern
- ⚠️ **Backend endpoints NOT YET IMPLEMENTED** - user-service needs these endpoints:
  - `GET /users/{user_id}/addresses`
  - `POST /users/{user_id}/addresses`
  - `PUT /users/{user_id}/addresses/{id}`
  - `DELETE /users/{user_id}/addresses/{id}`
  - `PUT /users/{user_id}/addresses/{id}/set-default`

### 4. ⚠️ settingsService.js (UPDATED - Backend Missing)
**Before:**
- `/user/settings` → 404 (invalid route segment)
- `/user/change-password` → 404
- `/user/account` → 404

**After:**
- All endpoints updated to use `/users/{userId}/settings` pattern
- ⚠️ **Backend endpoints NOT YET IMPLEMENTED** - user-service needs these endpoints:
  - `GET /users/{user_id}/settings`
  - `PUT /users/{user_id}/settings/notifications`
  - `PUT /users/{user_id}/settings/privacy`
  - `PUT /users/{user_id}/settings/language`
  - `PUT /users/{user_id}/change-password`
  - `DELETE /users/{user_id}/account`

### 5. ✅ supportService.js (NO CHANGES NEEDED)
All endpoints use `/support/` prefix which appears to be correct:
- `POST /support/requests`
- `POST /support/issues`
- `GET /support/faq`

## Backend Implementation Status

### Currently Available Endpoints

**user-service:**
- ✅ `GET /api/v1/users/{user_id}` - Get user details
- ✅ `PATCH /api/v1/users/{user_id}` - Update user details

**order-service:**
- ✅ `GET /api/v1/orders/` - List all orders (with skip/limit pagination)
- ✅ `GET /api/v1/orders/{order_id}` - Get order details
- ⚠️ `POST /api/v1/orders/{order_id}/reorder` - Needs verification

**payment-service:**
- ✅ `POST /api/v1/payment/create-intent` - Create payment intent
- ✅ `POST /api/v1/payment/` - Process payment
- ✅ `GET /api/v1/payment/{payment_id}` - Get payment details
- ✅ `GET /api/v1/payment/order/{order_id}` - Get payment by order
- ✅ `POST /api/v1/payment/refund` - Process refund
- ✅ `POST /api/v1/payment/saved-methods` - Save payment method
- ✅ `GET /api/v1/payment/saved-methods/{user_id}` - Get saved payment methods
- ✅ `GET /api/v1/payment/priority-fees` - Get priority fees

### Missing Backend Endpoints (Need Implementation)

**user-service needs:**
1. Address Management:
   - `GET /api/v1/users/{user_id}/addresses`
   - `POST /api/v1/users/{user_id}/addresses`
   - `PUT /api/v1/users/{user_id}/addresses/{id}`
   - `DELETE /api/v1/users/{user_id}/addresses/{id}`
   - `PUT /api/v1/users/{user_id}/addresses/{id}/set-default`

2. Settings Management:
   - `GET /api/v1/users/{user_id}/settings`
   - `PUT /api/v1/users/{user_id}/settings/notifications`
   - `PUT /api/v1/users/{user_id}/settings/privacy`
   - `PUT /api/v1/users/{user_id}/settings/language`
   - `PUT /api/v1/users/{user_id}/change-password`
   - `DELETE /api/v1/users/{user_id}/account`

**payment-service needs:**
1. Payment Method Management:
   - `DELETE /api/v1/payment/saved-methods/{id}`
   - `PUT /api/v1/payment/saved-methods/{id}/set-default`

**order-service needs:**
1. Reorder functionality (verify if exists):
   - `POST /api/v1/orders/{order_id}/reorder`

## Testing Recommendations

1. **Test order endpoints** - These should now work since the backend has the endpoints
2. **Test payment method retrieval** - Should work with userId parameter
3. **Address management** - Will return 404 until backend endpoints are implemented
4. **Settings management** - Will return 404 until backend endpoints are implemented
5. **Support endpoints** - Should work if support-service exists

## Next Steps

1. **Immediate:** Test the fixed order and payment endpoints
2. **Short-term:** Implement missing backend endpoints in user-service for addresses and settings
3. **Short-term:** Implement missing payment method management endpoints in payment-service
4. **Long-term:** Add user-specific filtering to order endpoints (currently returns all orders)

## API Client Configuration

The API client is correctly configured with:
```javascript
baseURL: 'http://127.0.0.1:8000/api/v1'
```

All service calls are now relative to this base URL and follow the correct routing structure.
