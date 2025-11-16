import { createSlice } from "@reduxjs/toolkit";

const initialState = [];

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addItems: (state, action) => {
      const payload = action.payload;

      if (!payload) {
        console.error("Invalid payload for addItems");
        return;
      }

      // Check if item already exists in cart
      const existingItemIndex = state.findIndex(
        (item) =>
          item.id === payload.id &&
          item.pricePerQuantity === payload.pricePerQuantity
      );

      if (existingItemIndex !== -1) {
        // If item exists, increment quantity
        state[existingItemIndex].quantity += payload.quantity || 1;
      } else {
        // Ensure ID is serializable
        let safeId;

        if (payload.id === null || payload.id === undefined) {
          safeId = Date.now().toString();
        } else if (
          typeof payload.id === "object" &&
          payload.id instanceof Date
        ) {
          safeId = payload.id.getTime().toString();
        } else if (typeof payload.id === "number") {
          safeId = payload.id.toString();
        } else {
          safeId = payload.id;
        }

        const newItem = {
          ...payload,
          id: safeId,
          quantity: payload.quantity || 1,
          isRedeemed: false,
        };

        state.push(newItem);
      }
    },

    removeItem: (state, action) => {
      const itemId = action.payload;
      if (!itemId) {
        console.error("Invalid itemId for removeItem");
        return state;
      }
      return state.filter((item) => item.id !== itemId);
    },

    removeAllItems: () => {
      return initialState;
    },

    incrementQuantity: (state, action) => {
      const itemId = action.payload;
      if (!itemId) return;

      const item = state.find((item) => item.id === itemId);
      if (item) {
        item.quantity += 1;
      }
    },

    decrementQuantity: (state, action) => {
      const itemId = action.payload;
      if (!itemId) return;

      const itemIndex = state.findIndex((item) => item.id === itemId);

      if (itemIndex !== -1) {
        const item = state[itemIndex];
        if (item.quantity > 1) {
          item.quantity -= 1;
        } else {
          // Remove item if quantity becomes 0
          state.splice(itemIndex, 1);
        }
      }
    },

    updateQuantity: (state, action) => {
      const { id, quantity } = action.payload;

      if (!id || quantity === undefined) return;

      const itemIndex = state.findIndex((item) => item.id === id);

      if (itemIndex !== -1) {
        if (quantity > 0) {
          state[itemIndex].quantity = quantity;
        } else {
          // Remove item if quantity is 0
          state.splice(itemIndex, 1);
        }
      }
    },

    redeemItem: (state, action) => {
      const itemId = action.payload;
      if (!itemId) return;

      // First, clear all redemptions
      state.forEach((item) => {
        item.isRedeemed = false;
      });

      // Then redeem the specific item
      const item = state.find((item) => item.id === itemId);
      if (item) {
        item.isRedeemed = true;
      }
    },

    removeRedemption: (state) => {
      state.forEach((item) => {
        item.isRedeemed = false;
      });
    },
  },
});

// Selector to get total price (excluding redeemed items)
export const getTotalPrice = (state) =>
  state.cart.reduce((total, item) => {
    if (item.isRedeemed) return total;
    return total + item.price * item.quantity;
  }, 0);

// Selector to check if any item is redeemed
export const hasRedeemedItem = (state) =>
  state.cart.some((item) => item.isRedeemed);

// Selector to get redeemed item
export const getRedeemedItem = (state) =>
  state.cart.find((item) => item.isRedeemed);

// Selector to get cart items count
export const getCartItemsCount = (state) =>
  state.cart.reduce((count, item) => count + item.quantity, 0);

export const {
  addItems,
  removeItem,
  removeAllItems,
  incrementQuantity,
  decrementQuantity,
  updateQuantity,
  redeemItem,
  removeRedemption,
} = cartSlice.actions;

export default cartSlice.reducer;
