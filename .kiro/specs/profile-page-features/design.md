# Profile Page Features - Design Document

## Overview

The Profile Page Features design implements a comprehensive user profile management system for the Priority-Based Food Delivery System mobile app. This feature enables customers to manage account information, order history, delivery addresses, payment methods, and app preferences through an intuitive mobile interface.

The design follows a modular architecture with Redux state management, separating concerns across multiple screens and Redux slices. The implementation prioritizes security (especially for payment data), offline support, and performance through caching and pagination.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Profile Navigation Stack                  │
├─────────────────────────────────────────────────────────────┤
│  ProfileScreen                                               │
│  ├── OrderHistoryScreen                                      │
│  ├── SavedAddressesScreen                                    │
│  ├── PaymentMethodsScreen                                    │
│  ├── HelpSupportScreen                                       │
│  └── SettingsScreen                                          │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Redux Store                               │
├─────────────────────────────────────────────────────────────┤
│  ├── auth (existing)                                         │
│  ├── orders (existing)                                       │
│  ├── user_addresses (new)                                    │
│  ├── payment_methods (new)                                   │
│  ├── app_settings (new)                                      │
│  └── ui (loading, error states)                              │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Services                              │
├─────────────────────────────────────────────────────────────┤
│  ├── User Service (port 8002)                                │
│  ├── Order Service (port 8004)                               │
│  ├── Payment Service (port 8006)                             │
│  └── API Gateway (port 8000)                                 │
└─────────────────────────────────────────────────────────────┘
```

### Redux Store Design

#### New Redux Slices

**user_addresses Slice**
```javascript
{
  addresses: [
    {
      id: string,
      label: string,
      street_address_1: string,
      street_address_2: string,
      city: string,
      region_state: string,
      postal_code: string,
      country: string,
      is_default: boolean,
      created_at: timestamp,
      updated_at: timestamp
    }
  ],
  default_address_id: string,
  loading: boolean,
  error: null | string,
  cache_timestamp: timestamp
}
```

**payment_methods Slice**
```javascript
{
  payment_methods: [
    {
      id: string,
      card_token: string,  // Only token, never full card number
      card_brand: string,  // Visa, Mastercard, etc.
      last_four_digits: string,
      expiration_date: string,
      is_default: boolean,
      created_at: timestamp,
      updated_at: timestamp
    }
  ],
  default_payment_id: string,
  loading: boolean,
  error: null | string,
  cache_timestamp: timestamp
}
```

**app_settings Slice**
```javascript
{
  notifications: {
    push_enabled: boolean,
    sms_enabled: boolean,
    email_enabled: boolean
  },
  privacy: {
    share_location: boolean,
    share_analytics: boolean,
    marketing_communications: boolean
  },
  language: string,  // 'en', 'es', 'fr', 'zh'
  loading: boolean,
  error: null | string,
  cache_timestamp: timestamp
}
```

## Components and Interfaces

### Screen Hierarchy

```
ProfileScreen (Root)
├── Header Section
│   ├── Avatar (circular, with initials fallback)
│   ├── User Name
│   ├── Email
│   └── Role Badge
├── Menu Items (ScrollView)
│   ├── Order History
│   ├── Saved Addresses
│   ├── Payment Methods
│   ├── Help & Support
│   └── Settings
└── Logout Button

OrderHistoryScreen
├── Order List (FlatList with pagination)
│   ├── Order Card
│   │   ├── Order ID
│   │   ├── Restaurant Name
│   │   ├── Date/Time
│   │   ├── Total Amount
│   │   ├── Status Badge
│   │   └── Priority Level
│   └── Load More Button
└── Order Detail Modal
    ├── Items List
    ├── Delivery Address
    ├── Order Timeline
    └── Reorder Button

SavedAddressesScreen
├── Address List (FlatList)
│   ├── Address Card
│   │   ├── Label
│   │   ├── Full Address
│   │   ├── Default Indicator
│   │   └── Action Menu (Edit, Delete, Set Default)
│   └── Add Address Button
└── Address Form Modal
    ├── Label Input
    ├── Street Address 1
    ├── Street Address 2
    ├── City
    ├── Region/State
    ├── Postal Code
    ├── Country
    ├── Use Current Location Button
    ├── Address Autocomplete
    └── Save Button

PaymentMethodsScreen
├── Payment List (FlatList)
│   ├── Payment Card
│   │   ├── Card Brand Icon
│   │   ├── Last Four Digits
│   │   ├── Expiration Date
│   │   ├── Default Indicator
│   │   └── Action Menu (Edit, Delete, Set Default)
│   └── Add Payment Button
└── Payment Form Modal
    ├── Card Number Input
    ├── Cardholder Name
    ├── Expiration Date
    ├── CVV
    └── Save Button

HelpSupportScreen
├── FAQ Section
│   ├── Category Tabs
│   └── Expandable FAQ Items
├── Contact Support Section
│   ├── Support Form
│   └── Confirmation Modal
├── Report Issue Section
│   ├── Issue Form
│   └── Confirmation Modal
├── Call Support Button
└── Email Support Button

SettingsScreen
├── Notifications Section
│   ├── Push Notifications Toggle
│   ├── SMS Notifications Toggle
│   └── Email Notifications Toggle
├── Privacy Section
│   ├── Share Location Toggle
│   ├── Share Analytics Toggle
│   └── Marketing Communications Toggle
├── Language Section
│   └── Language Dropdown
├── Account Section
│   ├── Change Password Button
│   ├── Delete Account Button
│   └── View Privacy Policy Button
└── Version Info
```

## Data Models

### Address Model
```typescript
interface Address {
  id: string;
  user_id: string;
  label: string;  // "Home", "Work", etc.
  street_address_1: string;
  street_address_2?: string;
  city: string;
  region_state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
  created_at: ISO8601;
  updated_at: ISO8601;
}
```

### PaymentMethod Model
```typescript
interface PaymentMethod {
  id: string;
  user_id: string;
  card_token: string;  // Tokenized by Payment Service
  card_brand: string;  // "visa", "mastercard", "amex"
  last_four_digits: string;
  expiration_date: string;  // "MM/YY"
  is_default: boolean;
  created_at: ISO8601;
  updated_at: ISO8601;
}
```

### Order Model (Extended)
```typescript
interface Order {
  id: string;
  user_id: string;
  restaurant_id: string;
  restaurant_name: string;
  items: OrderItem[];
  total_amount: number;
  status: "pending" | "confirmed" | "preparing" | "ready" | "out_for_delivery" | "delivered" | "cancelled";
  priority_level: "normal" | "high" | "urgent";
  delivery_address: Address;
  placed_at: ISO8601;
  estimated_delivery_at: ISO8601;
  delivered_at?: ISO8601;
  timeline: OrderEvent[];
}

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  special_instructions?: string;
}

interface OrderEvent {
  status: string;
  timestamp: ISO8601;
  description: string;
}
```

### AppSettings Model
```typescript
interface AppSettings {
  user_id: string;
  notifications: {
    push_enabled: boolean;
    sms_enabled: boolean;
    email_enabled: boolean;
  };
  privacy: {
    share_location: boolean;
    share_analytics: boolean;
    marketing_communications: boolean;
  };
  language: "en" | "es" | "fr" | "zh";
  updated_at: ISO8601;
}
```

## State Management Patterns

### Async Thunks Pattern

All API calls use Redux Toolkit's `createAsyncThunk`:

```javascript
export const fetchAddresses = createAsyncThunk(
  'user_addresses/fetchAddresses',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/user/addresses');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch addresses');
    }
  }
);
```

### Caching Strategy

- Cache expiration: 1 hour
- Manual refresh bypasses cache
- Offline mode displays cached data
- Background refresh on screen focus

### Offline Support

- Display cached data when offline
- Queue operations for retry when online
- Show offline banner
- Disable network-dependent operations

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Order History Invariant

**Pattern:** Invariants

FOR ALL orders in the Order_History list, the order's placed_at timestamp SHALL be less than or equal to the current timestamp. This ensures that orders are not displayed with future timestamps.

**Validates: Requirements 3.1, 3.2**

### Property 2: Address List Consistency

**Pattern:** Invariants

FOR ALL saved addresses in the Saved_Addresses list, exactly one address SHALL have is_default = TRUE. This ensures that the user always has a default address selected.

**Validates: Requirements 4.2, 4.8**

### Property 3: Payment Method Default Consistency

**Pattern:** Invariants

FOR ALL saved payment methods in the Payment_Methods list, exactly one payment method SHALL have is_default = TRUE. This ensures that the user always has a default payment method selected.

**Validates: Requirements 5.2, 5.8**

### Property 4: Reorder Round-Trip

**Pattern:** Round-Trip Properties

WHEN the user reorders items from a previous order, THE items added to the cart SHALL match the items from the original order. Specifically, FOR EACH item in the original order, THE reordered cart SHALL contain the same item with the same quantity.

**Validates: Requirements 16.2, 16.4**

### Property 5: Address Geocoding Round-Trip

**Pattern:** Round-Trip Properties

WHEN the user uses "Use Current Location" to add an address, THE address form SHALL be populated with a geocoded address. WHEN the user submits this address and later retrieves it, THE retrieved address SHALL match the submitted address (within acceptable geocoding precision).

**Validates: Requirements 13.2, 13.4**

### Property 6: Payment Token Idempotence

**Pattern:** Idempotence

WHEN the user saves the same payment card multiple times, THE Payment_Service SHALL return the same card token. This ensures that duplicate payment methods are not created.

**Validates: Requirements 5.5, 5.6**

### Property 7: Notification Preference Consistency

**Pattern:** Idempotence

WHEN the user toggles a notification preference multiple times, THE final state SHALL match the last toggle action. This ensures that notification preferences are consistent.

**Validates: Requirements 17.1, 17.5**

### Property 8: Profile Data Consistency

**Pattern:** Metamorphic Properties

WHEN the user updates profile information, THE number of saved addresses SHALL remain constant (unless the user explicitly adds or deletes an address). Similarly, THE number of saved payment methods SHALL remain constant (unless the user explicitly adds or deletes a payment method).

**Validates: Requirements 9.2, 9.3, 9.4**

### Property 9: Cache Expiration

**Pattern:** Idempotence

WHEN the user loads the Profile_Screen within the cache expiration window (1 hour), THE cached data SHALL be displayed. WHEN the cache expires, THE Profile_Screen SHALL fetch fresh data on the next load.

**Validates: Requirements 19.1, 19.5**

### Property 10: Offline Data Availability

**Pattern:** Metamorphic Properties

WHEN the user is offline, THE Profile_Screen SHALL display cached data. WHEN the user regains internet connection, THE Profile_Screen SHALL fetch fresh data and update the display.

**Validates: Requirements 10.2, 10.3, 10.4**

### Property 11: Form Validation Completeness

**Pattern:** Invariants

WHEN the user submits a form (address, payment, password), ALL required fields SHALL be validated. IF any validation fails, THE form's submit button SHALL remain disabled.

**Validates: Requirements 11.1, 11.2, 11.3, 11.5**

### Property 12: Order History Pagination

**Pattern:** Metamorphic Properties

WHEN the user scrolls to the bottom of the Order_History list, THE next page of orders SHALL be loaded. The total number of orders displayed SHALL increase by the page size (10 orders).

**Validates: Requirements 3.7**

### Property 13: Address Label Uniqueness

**Pattern:** Invariants

FOR ALL saved addresses, THE address label SHALL be unique within the user's address list. This prevents confusion when selecting addresses.

**Validates: Requirements 4.2**

### Property 14: Payment Method Expiration Validation

**Pattern:** Invariants

FOR ALL saved payment methods, THE expiration date SHALL be in the future. Expired payment methods SHALL not be available for selection during checkout.

**Validates: Requirements 5.5**

### Property 15: User Authentication State Consistency

**Pattern:** Invariants

WHEN the user is logged in, THE Redux auth slice SHALL contain valid user data (id, email, full_name). WHEN the user logs out, THE Redux auth slice SHALL be cleared.

**Validates: Requirements 8.2, 8.3, 20.2**

## Error Handling

### Network Error Handling

- Display error message with retry button
- Log error for debugging
- Implement exponential backoff for retries
- Timeout after 30 seconds

### Offline State Handling

- Display offline banner
- Show cached data
- Disable network-dependent operations
- Queue operations for retry when online

### Validation Error Handling

- Display inline error messages
- Highlight invalid fields
- Disable submit button until errors resolved
- Clear errors when user corrects input

### API Error Handling

- 400 Bad Request: Display validation error
- 401 Unauthorized: Redirect to login
- 403 Forbidden: Display permission error
- 404 Not Found: Display not found error
- 500 Server Error: Display generic error with support link
- Network timeout: Display timeout error with retry

## Testing Strategy

### Unit Tests

- Redux reducers and actions
- Form validation functions
- Data transformation utilities
- Component rendering with various states

### Integration Tests

- API integration with mock services
- Redux store integration
- Navigation between screens
- Data persistence to AsyncStorage

### Property-Based Tests

- Order history sorting (reverse chronological)
- Address list consistency (exactly one default)
- Payment method consistency (exactly one default)
- Reorder item matching
- Cache expiration logic
- Offline data availability
- Form validation completeness
- Pagination logic
- Address label uniqueness
- Payment expiration validation
- Authentication state consistency

### Test Configuration

- Minimum 100 iterations per property test
- Mock API responses
- Mock AsyncStorage
- Mock device location services
- Mock payment tokenization

## Security Considerations

### Payment Data Security

- Never store full card numbers locally
- Use card tokenization (Payment Service handles this)
- Store only card tokens in Redux
- Use HTTPS for all API calls
- Implement PCI DSS compliance

### Token Storage

- Store JWT tokens in secure storage (Keychain/Keystore)
- Implement token refresh logic
- Clear tokens on logout
- Validate token expiration

### Data Privacy

- Encrypt sensitive data at rest
- Implement proper access controls
- Respect user privacy preferences
- Comply with data protection regulations

## Performance Optimizations

### Caching

- Cache profile data for 1 hour
- Cache order history with pagination
- Cache addresses and payment methods
- Implement cache invalidation on updates

### Pagination

- Load 10 orders per page
- Implement infinite scroll
- Load next page when user scrolls to bottom
- Show loading indicator during pagination

### Lazy Loading

- Load screens on demand
- Lazy load images
- Implement code splitting

### Memoization

- Memoize expensive computations
- Use React.memo for components
- Implement useMemo for derived state

## UI/UX Patterns

### Loading States

- Skeleton loaders for lists
- Spinner for operations
- Disable interactions during loading

### Empty States

- Specific messages for each context
- Call-to-action buttons
- Icons for visual clarity

### Error States

- Clear error messages
- Retry buttons
- Support contact information

### Confirmation Dialogs

- Confirm destructive actions
- Warn about data loss
- Provide cancel option

## Implementation Notes

1. **Redux Store**: Extend existing store with new slices for addresses, payment methods, and settings
2. **API Integration**: Use existing API client with proper error handling
3. **Offline Support**: Implement with Redux persist and network state detection
4. **Caching**: Use Redux for cache management with timestamp tracking
5. **Security**: Implement secure token storage and payment data handling
6. **Testing**: Use Jest for unit tests, React Native Testing Library for component tests, and property-based testing library for properties
7. **Localization**: Implement i18n for multi-language support
8. **Accessibility**: Ensure WCAG 2.1 AA compliance

