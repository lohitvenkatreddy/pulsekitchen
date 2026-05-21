import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import orderReducer from './slices/orderSlice';
import restaurantReducer from './slices/restaurantSlice';
import deliveryReducer from './slices/deliverySlice';
import cartReducer from './slices/cartSlice';
import userAddressesReducer from './slices/userAddressesSlice';
import paymentMethodsReducer from './slices/paymentMethodsSlice';
import appSettingsReducer from './slices/appSettingsSlice';
import uiReducer from './slices/uiSlice';
import mapSelectionReducer from './slices/mapSelectionSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    orders: orderReducer,
    restaurants: restaurantReducer,
    delivery: deliveryReducer,
    cart: cartReducer,
    user_addresses: userAddressesReducer,
    payment_methods: paymentMethodsReducer,
    app_settings: appSettingsReducer,
    ui: uiReducer,
    mapSelection: mapSelectionReducer,
  },
});
