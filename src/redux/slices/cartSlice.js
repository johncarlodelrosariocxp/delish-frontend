import { createSlice } from "@reduxjs/toolkit";

const initialState = [];

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addItems: (state, action) => {
      const payload = action.payload;

      // Ensure ID is serializable
      const safeId =
        typeof payload.id === "object" && payload.id instanceof Date
          ? payload.id.getTime().toString()
          : typeof payload.id === "number"
          ? payload.id.toString()
          : payload.id;

      const newItem = {
        ...payload,
        id: safeId || Date.now().toString(), // fallback if missing
      };

      state.push(newItem);
    },

    removeItem: (state, action) => {
      return state.filter((item) => item.id !== action.payload);
    },

    removeAllItems: () => {
      return [];
    },
  },
});

export const getTotalPrice = (state) =>
  state.cart.reduce((total, item) => total + item.price, 0);

export const { addItems, removeItem, removeAllItems } = cartSlice.actions;
export default cartSlice.reducer;
