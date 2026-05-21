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
      const quantity = Number(item.quantity) > 0 ? Number(item.quantity) : 1;

      if (state.restaurant && state.restaurant.id !== restaurant.id) {
        state.restaurant = restaurant;
        state.items = [];
      } else if (!state.restaurant) {
        state.restaurant = restaurant;
      }

      const existing = state.items.find((entry) => entry.id === item.id);
      if (existing) {
        existing.quantity += quantity;
      } else {
        state.items.push({ ...item, quantity });
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
