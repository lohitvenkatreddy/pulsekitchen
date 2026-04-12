import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  restaurant: null,
  items: [],
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addItemToCart: (state, action) => {
      const { restaurant, item } = action.payload;

      if (state.restaurant && state.restaurant.id !== restaurant.id) {
        state.restaurant = restaurant;
        state.items = [];
      } else if (!state.restaurant) {
        state.restaurant = restaurant;
      }

      const existing = state.items.find((entry) => entry.id === item.id);
      if (existing) {
        existing.quantity += 1;
      } else {
        state.items.push({ ...item, quantity: 1 });
      }
    },
    updateCartItemQuantity: (state, action) => {
      const { id, quantity } = action.payload;
      state.items = state.items
        .map((item) => (item.id === id ? { ...item, quantity } : item))
        .filter((item) => item.quantity > 0);

      if (state.items.length === 0) {
        state.restaurant = null;
      }
    },
    clearCart: (state) => {
      state.restaurant = null;
      state.items = [];
    },
  },
});

export const { addItemToCart, updateCartItemQuantity, clearCart } = cartSlice.actions;
export default cartSlice.reducer;
