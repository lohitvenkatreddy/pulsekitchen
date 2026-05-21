# Implementation Plan: Profile Page Features

## Overview

This implementation plan breaks down the profile page features into 10 logical phases, starting with Redux store setup, followed by API service integration, screen implementations, and comprehensive testing. Each task builds incrementally on previous work, ensuring that core functionality is validated early through code.

The implementation uses TypeScript/JavaScript with React Native, Redux Toolkit for state management, and Jest for testing. All tasks reference specific requirements and correctness properties from the design document.

---

## Phase 1: Redux Store Setup

- [-] 1. Create Redux slices for addresses, payment methods, and settings
  - [x] 1.1 Create user_addresses slice with initial state, reducers, and async thunks
    - Define Address interface with all required fields
    - Implement fetchAddresses, addAddress, updateAddress, deleteAddress, setDefaultAddress thunks
    - Handle loading, error, and cache_timestamp states
    - _Requirements: 4.1, 9.3, 19.1_
    - _Properties: 2 (Address List Consistency), 13 (Address Label Uniqueness)_

  - [x] 1.2 Create payment_methods slice with initial state, reducers, and async thunks
    - Define PaymentMethod interface (token-only, never full card number)
    - Implement fetchPaymentMethods, addPaymentMethod, deletePaymentMethod, setDefaultPaymentMethod thunks
    - Handle loading, error, and cache_timestamp states
    - _Requirements: 5.1, 9.4, 15.1_
    - _Properties: 3 (Payment Method Default Consistency), 14 (Payment Method Expiration Validation)_

  - [x] 1.3 Create app_settings slice with initial state, reducers, and async thunks
    - Define AppSettings interface with notifications, privacy, and language sections
    - Implement fetchSettings, updateNotifications, updatePrivacy, updateLanguage thunks
    - Handle loading, error, and cache_timestamp states
    - _Requirements: 7.1, 9.5, 17.1_
    - _Properties: 7 (Notification Preference Consistency)_

  - [x] 1.4 Create ui slice for managing loading and error states across profile screens
    - Define UI state for each screen (loading, error, offline status)
    - Implement actions for setLoading, setError, setOfflineStatus
    - _Requirements: 10.1, 12.1_

  - [x] 1.5 Update store configuration to include new slices
    - Import new slices into store.js
    - Verify store initialization with all reducers
    - _Requirements: 9.1_

  - [ ]* 1.6 Write property tests for Redux store initialization
    - **Property 15: User Authentication State Consistency**
    - **Validates: Requirements 8.2, 8.3, 20.2**
    - Test that auth slice is properly initialized
    - Test that new slices are properly initialized with correct initial state

---

## Phase 2: API Service Integration

- [x] 2. Create API service methods for all profile endpoints
  - [x] 2.1 Create addressService with methods for CRUD operations
    - Implement getAddresses(), addAddress(data), updateAddress(id, data), deleteAddress(id), setDefaultAddress(id)
    - Add error handling and request/response logging
    - Use existing API client with proper headers and authentication
    - _Requirements: 4.1, 4.4, 4.5, 4.6, 4.7, 4.8_

  - [x] 2.2 Create paymentService with methods for payment operations
    - Implement getPaymentMethods(), addPaymentMethod(data), deletePaymentMethod(id), setDefaultPaymentMethod(id)
    - Ensure card data is never stored locally (only tokens)
    - Add validation for card tokenization response
    - _Requirements: 5.1, 5.4, 5.5, 5.6, 5.7, 5.8, 15.2, 15.3_

  - [x] 2.3 Create orderService with methods for order history and reorder
    - Implement getOrders(page, limit), getOrderDetail(orderId), reorderItems(orderId)
    - Add pagination support (10 orders per page)
    - Handle order status and priority level data
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.7, 16.2_

  - [x] 2.4 Create settingsService with methods for app preferences
    - Implement getSettings(), updateNotifications(data), updatePrivacy(data), updateLanguage(language)
    - Add support for password change and account deletion
    - _Requirements: 7.2, 7.3, 7.6, 7.9, 7.10, 7.12_

  - [x] 2.5 Create supportService for help and support operations
    - Implement submitSupportRequest(data), submitIssueReport(data)
    - Add support for attachments and screenshots
    - _Requirements: 6.4, 6.5, 6.6, 6.7_

  - [x] 2.6 Implement error handling and retry logic for all services
    - Add exponential backoff for failed requests
    - Implement 30-second timeout
    - Handle specific HTTP status codes (400, 401, 403, 404, 500)
    - _Requirements: 10.1, 10.5, 10.6_

  - [ ]* 2.7 Write unit tests for all API service methods
    - Mock axios responses for each endpoint
    - Test error handling and retry logic
    - Test request/response transformation
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

---

## Phase 3: Order History Screen Implementation

- [x] 3. Implement OrderHistoryScreen with order list and pagination
  - [x] 3.1 Create OrderHistoryScreen component with FlatList for orders
    - Fetch orders on screen load using Redux thunk
    - Display orders in reverse chronological order (most recent first)
    - Show order ID, restaurant name, date/time, total amount, status, and priority
    - Implement pagination with "Load More" button
    - _Requirements: 3.1, 3.2, 3.3, 3.7_
    - _Properties: 1 (Order History Invariant), 12 (Order History Pagination)_

  - [x] 3.2 Create OrderCard component for displaying individual orders
    - Display order summary with all required fields
    - Add visual indicators for order status and priority level
    - Implement tap handler to show order details
    - _Requirements: 3.3_

  - [x] 3.3 Create OrderDetailModal component for detailed order view
    - Display items list with quantities and prices
    - Show delivery address and order timeline
    - Implement "Reorder" button
    - _Requirements: 3.4, 3.5, 16.1_

  - [x] 3.4 Implement reorder functionality
    - Add items from previous order to cart with same quantities
    - Navigate to checkout screen after reorder
    - Handle unavailable items with warning message
    - _Requirements: 3.5, 16.2, 16.3, 16.4, 16.5_
    - _Properties: 4 (Reorder Round-Trip)_

  - [x] 3.5 Implement empty state and loading states
    - Display empty state message when no orders exist
    - Show skeleton loader while fetching orders
    - Display error message with retry button on failure
    - _Requirements: 3.6, 3.8, 12.1, 12.2, 12.3_

  - [ ]* 3.6 Write property tests for order history
    - **Property 1: Order History Invariant**
    - **Validates: Requirements 3.1, 3.2**
    - Test that all orders have placed_at <= current_timestamp
    - Test that orders are sorted in reverse chronological order

  - [ ]* 3.7 Write unit tests for OrderHistoryScreen
    - Test order fetching and display
    - Test pagination logic
    - Test reorder functionality
    - Test error handling
    - _Requirements: 3.1, 3.2, 3.3, 3.7_

---

## Phase 4: Saved Addresses Screen Implementation

- [x] 4. Implement SavedAddressesScreen with address management
  - [x] 4.1 Create SavedAddressesScreen component with FlatList for addresses
    - Fetch addresses on screen load using Redux thunk
    - Display all saved addresses with label, full address, and default indicator
    - Implement "Add Address" button
    - _Requirements: 4.1, 4.2, 4.9_
    - _Properties: 2 (Address List Consistency), 13 (Address Label Uniqueness)_

  - [x] 4.2 Create AddressCard component for displaying individual addresses
    - Display address label, full address text, and default indicator
    - Implement action menu with Edit, Delete, and Set Default options
    - _Requirements: 4.2, 4.3_

  - [x] 4.3 Create AddressForm component for adding/editing addresses
    - Implement form fields: label, street_address_1, street_address_2, city, region_state, postal_code, country
    - Add "Use Current Location" button for geolocation
    - Implement address autocomplete with geocoding service
    - Add form validation for all required fields
    - _Requirements: 4.4, 4.5, 4.6, 13.1, 13.2, 14.1, 14.2_
    - _Properties: 5 (Address Geocoding Round-Trip), 11 (Form Validation Completeness)_

  - [x] 4.4 Implement address geolocation functionality
    - Request location permission from user
    - Fetch current coordinates using device GPS
    - Use reverse geocoding to convert coordinates to address
    - Populate address form with geocoded address
    - Handle permission denial and geocoding failures
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6_

  - [x] 4.5 Implement address autocomplete functionality
    - Display autocomplete suggestions as user types
    - Limit suggestions to 5 results
    - Populate form with selected suggestion
    - Handle autocomplete failures gracefully
    - _Requirements: 14.1, 14.2, 14.3, 14.4_

  - [x] 4.6 Implement address CRUD operations
    - Add new address with validation
    - Edit existing address
    - Delete address with confirmation dialog
    - Set address as default
    - Update Redux store on success
    - _Requirements: 4.4, 4.5, 4.6, 4.7, 4.8, 4.11_

  - [x] 4.7 Implement empty state and loading states
    - Display empty state message when no addresses exist
    - Show skeleton loader while fetching addresses
    - Display error message with retry button on failure
    - _Requirements: 4.10, 12.1, 12.2, 12.3_

  - [ ]* 4.8 Write property tests for address management
    - **Property 2: Address List Consistency**
    - **Validates: Requirements 4.2, 4.8**
    - Test that exactly one address has is_default = TRUE
    - Test that setting new default updates previous default

  - [ ]* 4.9 Write unit tests for SavedAddressesScreen
    - Test address fetching and display
    - Test address CRUD operations
    - Test form validation
    - Test geolocation functionality
    - Test autocomplete functionality
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

---

## Phase 5: Payment Methods Screen Implementation

- [x] 5. Implement PaymentMethodsScreen with payment management
  - [x] 5.1 Create PaymentMethodsScreen component with FlatList for payment methods
    - Fetch payment methods on screen load using Redux thunk
    - Display all saved payment methods with card brand, last four digits, expiration date, and default indicator
    - Implement "Add Payment Method" button
    - _Requirements: 5.1, 5.2, 5.9_
    - _Properties: 3 (Payment Method Default Consistency), 14 (Payment Method Expiration Validation)_

  - [x] 5.2 Create PaymentCard component for displaying individual payment methods
    - Display card brand icon, last four digits, expiration date, and default indicator
    - Implement action menu with Edit, Delete, and Set Default options
    - _Requirements: 5.2, 5.3_

  - [x] 5.3 Create PaymentForm component for adding payment methods
    - Implement form fields: card number, cardholder name, expiration date, CVV
    - Add Luhn algorithm validation for card number
    - Add expiration date validation (must be in future)
    - Add CVV validation (3-4 digits)
    - Disable submit button until all validations pass
    - _Requirements: 5.4, 5.5, 11.1, 11.2, 11.5_
    - _Properties: 11 (Form Validation Completeness), 14 (Payment Method Expiration Validation)_

  - [x] 5.4 Implement payment card tokenization
    - Send card data to Payment_Service using secure HTTPS connection
    - Receive card token from Payment_Service
    - Store only card token in Redux store (never full card number)
    - Display new payment method in list after tokenization
    - _Requirements: 5.5, 5.6, 15.1, 15.2, 15.3, 15.4, 15.5_
    - _Properties: 6 (Payment Token Idempotence)_

  - [x] 5.5 Implement payment method CRUD operations
    - Add new payment method with tokenization
    - Delete payment method with confirmation dialog
    - Set payment method as default
    - Update Redux store on success
    - _Requirements: 5.3, 5.7, 5.8, 5.10_

  - [x] 5.6 Implement empty state and loading states
    - Display empty state message when no payment methods exist
    - Show skeleton loader while fetching payment methods
    - Display error message with retry button on failure
    - _Requirements: 5.10, 12.1, 12.2, 12.3_

  - [ ]* 5.7 Write property tests for payment methods
    - **Property 3: Payment Method Default Consistency**
    - **Validates: Requirements 5.2, 5.8**
    - Test that exactly one payment method has is_default = TRUE
    - Test that setting new default updates previous default

  - [ ]* 5.8 Write unit tests for PaymentMethodsScreen
    - Test payment method fetching and display
    - Test payment method CRUD operations
    - Test form validation (Luhn, expiration, CVV)
    - Test card tokenization
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

---

## Phase 6: Help & Support Screen Implementation

- [x] 6. Implement HelpSupportScreen with FAQ and support features
  - [x] 6.1 Create HelpSupportScreen component with three main sections
    - Implement FAQ section with category tabs
    - Implement Contact Support section with form
    - Implement Report Issue section with form
    - Add Call Support and Email Support buttons
    - _Requirements: 6.1, 6.2, 6.3, 6.8, 6.9_

  - [x] 6.2 Create FAQ section with expandable items
    - Display FAQ items organized by category (Account, Orders, Delivery, Payments, Technical)
    - Implement expand/collapse functionality for answers
    - Load FAQ data from static file or API
    - _Requirements: 6.2, 6.3_

  - [x] 6.3 Create ContactSupportForm component
    - Implement form fields: subject, message, optional attachment
    - Add form validation (subject and message required)
    - Submit support request to support service
    - Display confirmation message with ticket number
    - _Requirements: 6.4, 6.5_

  - [x] 6.4 Create ReportIssueForm component
    - Implement form fields: issue type (dropdown), description, optional screenshot
    - Add form validation (issue type and description required)
    - Submit issue report to support service
    - Display confirmation message
    - _Requirements: 6.6, 6.7_

  - [x] 6.5 Implement Call Support and Email Support buttons
    - Call Support button opens phone dialer with support number
    - Email Support button opens email client with pre-filled template
    - _Requirements: 6.8, 6.9_

  - [x] 6.6 Implement error handling for support requests
    - Display error message if support request fails
    - Implement retry button
    - _Requirements: 6.10_

  - [ ]* 6.7 Write unit tests for HelpSupportScreen
    - Test FAQ display and expand/collapse
    - Test support request submission
    - Test issue report submission
    - Test error handling
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10_

---

## Phase 7: Settings Screen Implementation

- [x] 7. Implement SettingsScreen with app preferences
  - [x] 7.1 Create SettingsScreen component with four main sections
    - Implement Notifications section with toggles
    - Implement Privacy section with toggles
    - Implement Language section with dropdown
    - Implement Account section with buttons
    - _Requirements: 7.1, 7.2, 7.4, 7.6, 7.8_

  - [x] 7.2 Implement Notifications section
    - Add toggles for push notifications, SMS notifications, email notifications
    - Update user preferences in User_Service on toggle change
    - Update Redux store on success
    - Handle notification registration/unregistration
    - _Requirements: 7.2, 7.3, 17.1, 17.2, 17.3, 17.4, 17.5_
    - _Properties: 7 (Notification Preference Consistency)_

  - [x] 7.3 Implement Privacy section
    - Add toggles for share location data, share usage analytics, marketing communications
    - Update user preferences in User_Service on toggle change
    - Update Redux store on success
    - _Requirements: 7.4, 7.5_

  - [x] 7.4 Implement Language section
    - Add dropdown menu with available languages (English, Spanish, French, Chinese)
    - Update app language immediately on selection
    - Persist language preference to local storage
    - _Requirements: 7.6, 18.1, 18.2, 18.3, 18.4, 18.5_

  - [x] 7.5 Implement Account section
    - Add "Change Password" button that navigates to password change form
    - Add "Delete Account" button with confirmation dialog
    - Add "View Privacy Policy" button that opens in web view
    - _Requirements: 7.8, 7.9, 7.11, 7.13_

  - [x] 7.6 Create PasswordChangeForm component
    - Implement form fields: current password, new password, confirm password
    - Add password validation (8+ chars, uppercase, lowercase, number)
    - Validate current password before allowing change
    - Submit new password to Auth_Service
    - Display success/error message
    - _Requirements: 7.9, 7.10, 11.3, 11.5_
    - _Properties: 11 (Form Validation Completeness)_

  - [x] 7.7 Implement account deletion functionality
    - Display confirmation dialog warning about data loss
    - Send deletion request to User_Service on confirmation
    - Log user out after successful deletion
    - _Requirements: 7.11, 7.12_

  - [x] 7.8 Implement error handling for settings updates
    - Display error message if settings update fails
    - Implement retry button
    - _Requirements: 7.1_

  - [ ]* 7.9 Write unit tests for SettingsScreen
    - Test notification preference updates
    - Test privacy preference updates
    - Test language selection
    - Test password change validation
    - Test account deletion
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.8, 7.9, 7.10, 7.11, 7.12, 7.13_

---

## Phase 8: Profile Screen Updates

- [x] 8. Update ProfileScreen to connect menu items to new screens
  - [x] 8.1 Update ProfileScreen to display user profile information
    - Display user's full name, email, and phone number from Redux auth slice
    - Display circular avatar with profile image or first name initial
    - Display user's account role as badge
    - Implement loading indicator while fetching user data
    - Display error message with retry button on failure
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 8.2 Update ProfileScreen menu items to navigate to new screens
    - Connect "Order History" menu item to OrderHistoryScreen
    - Connect "Saved Addresses" menu item to SavedAddressesScreen
    - Connect "Payment Methods" menu item to PaymentMethodsScreen
    - Connect "Help & Support" menu item to HelpSupportScreen
    - Connect "Settings" menu item to SettingsScreen
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 8.3 Implement menu item styling and disabled states
    - Display menu items in white card container with elevation
    - Show disabled state for unimplemented features (if any)
    - Maintain consistent spacing and padding
    - _Requirements: 2.4, 2.5, 2.6_

  - [x] 8.4 Implement logout functionality
    - Display confirmation dialog on logout button tap
    - Clear Redux auth slice on confirmation
    - Remove stored tokens from secure storage
    - Navigate to login screen
    - Clear all cached user data from Redux store
    - _Requirements: 8.1, 8.2, 8.3, 20.2_

  - [x] 8.5 Implement screen focus refresh
    - Refresh user information when screen comes into focus
    - Fetch fresh data from backend
    - Update Redux store with new data
    - _Requirements: 1.6_

  - [ ]* 8.6 Write unit tests for ProfileScreen
    - Test user profile display
    - Test menu item navigation
    - Test logout functionality
    - Test error handling
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 8.1, 8.2, 8.3_

---

## Phase 9: Offline Support and Caching

- [x] 9. Implement offline support and data caching
  - [x] 9.1 Implement Redux persist for offline support
    - Configure Redux persist to save state to AsyncStorage
    - Implement cache expiration logic (1 hour)
    - Load cached data on app startup
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6_
    - _Properties: 9 (Cache Expiration), 10 (Offline Data Availability)_

  - [x] 9.2 Implement offline banner
    - Detect network connectivity using react-native-netinfo
    - Display offline banner when no internet connection
    - Hide banner when connection restored
    - _Requirements: 10.2, 10.3_

  - [x] 9.3 Implement offline data display
    - Display cached profile data when offline
    - Disable operations that require network access
    - Show appropriate error messages for offline operations
    - _Requirements: 10.3, 10.4_

  - [x] 9.4 Implement automatic retry on reconnection
    - Queue failed operations while offline
    - Retry queued operations when connection restored
    - Update UI with fresh data after retry
    - _Requirements: 10.4_

  - [x] 9.5 Implement manual refresh functionality
    - Add refresh button to bypass cache
    - Fetch fresh data from backend on manual refresh
    - Update cache with fresh data
    - _Requirements: 19.6_

  - [ ]* 9.6 Write property tests for caching and offline support
    - **Property 9: Cache Expiration**
    - **Validates: Requirements 19.1, 19.5**
    - Test that cached data is displayed within expiration window
    - Test that fresh data is fetched after cache expiration

  - [ ]* 9.7 Write integration tests for offline support
    - Test offline data display
    - Test operation queueing while offline
    - Test automatic retry on reconnection
    - _Requirements: 10.2, 10.3, 10.4_

---

## Phase 10: Testing & Validation

- [x] 10. Comprehensive testing and validation
  - [x] 10.1 Write property-based tests for all correctness properties
    - **Property 1: Order History Invariant** - Test order timestamp validation
    - **Property 2: Address List Consistency** - Test exactly one default address
    - **Property 3: Payment Method Default Consistency** - Test exactly one default payment
    - **Property 4: Reorder Round-Trip** - Test item matching in reorder
    - **Property 5: Address Geocoding Round-Trip** - Test address round-trip
    - **Property 6: Payment Token Idempotence** - Test token consistency
    - **Property 7: Notification Preference Consistency** - Test preference persistence
    - **Property 8: Profile Data Consistency** - Test data invariants
    - **Property 9: Cache Expiration** - Test cache timing
    - **Property 10: Offline Data Availability** - Test offline display
    - **Property 11: Form Validation Completeness** - Test all validations
    - **Property 12: Order History Pagination** - Test pagination logic
    - **Property 13: Address Label Uniqueness** - Test label uniqueness
    - **Property 14: Payment Method Expiration Validation** - Test expiration dates
    - **Property 15: User Authentication State Consistency** - Test auth state
    - _Requirements: All_

  - [x] 10.2 Write integration tests for complete user workflows
    - Test complete order history workflow (fetch, view, reorder)
    - Test complete address management workflow (add, edit, delete, set default)
    - Test complete payment method workflow (add, delete, set default)
    - Test complete settings workflow (update preferences, change password)
    - Test complete offline workflow (offline display, reconnection, retry)
    - _Requirements: All_

  - [x] 10.3 Write error handling tests
    - Test network error handling with retry
    - Test timeout error handling
    - Test validation error handling
    - Test API error handling (400, 401, 403, 404, 500)
    - _Requirements: 10.1, 10.5, 10.6_

  - [x] 10.4 Write accessibility tests
    - Test screen reader compatibility
    - Test keyboard navigation
    - Test color contrast
    - Test touch target sizes
    - _Requirements: All_

  - [x] 10.5 Run full test suite and verify coverage
    - Run all unit tests with Jest
    - Run all integration tests
    - Run all property-based tests
    - Verify test coverage >= 80%
    - Fix any failing tests
    - _Requirements: All_

  - [x] 10.6 Perform manual testing and validation
    - Test all screens on iOS and Android devices
    - Test all user workflows end-to-end
    - Test offline functionality
    - Test error scenarios
    - Verify UI/UX consistency
    - _Requirements: All_

  - [x] 10.7 Final checkpoint - Ensure all tests pass and coverage is adequate
    - Ensure all tests pass
    - Ensure test coverage >= 80%
    - Ensure no console errors or warnings
    - Ensure all requirements are met
    - Ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP, but are strongly recommended for production quality
- Each task references specific requirements for traceability
- Property-based tests validate universal correctness properties defined in the design document
- Unit tests validate specific examples and edge cases
- Integration tests validate complete workflows
- All tasks build incrementally on previous work
- Checkpoints ensure validation at reasonable breaks
- Security considerations (payment data, token storage) are integrated throughout
- Offline support is implemented as a cross-cutting concern
- Caching strategy balances performance with data freshness
