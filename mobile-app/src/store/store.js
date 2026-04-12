import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import orderReducer from './slices/orderSlice';
import restaurantReducer from './slices/restaurantSlice';
import deliveryReducer from './slices/deliverySlice';
import cartReducer from './slices/cartSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    orders: orderReducer,
    restaurants: restaurantReducer,
    delivery: deliveryReducer,
    cart: cartReducer,
  },
});
