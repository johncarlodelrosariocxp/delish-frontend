import { configureStore } from "@reduxjs/toolkit";
import customerSlice from "./slices/customerSlice";
import cartSlice from "./slices/cartSlice";
import userSlice from "./slices/userSlice";
import orderSlice from "./slices/orderSlice"; // Add this import

const store = configureStore({
  reducer: {
    customer: customerSlice,
    cart: cartSlice,
    user: userSlice,
    order: orderSlice, // Add this line
  },

  devTools: import.meta.env.NODE_ENV !== "production",
});

export default store;
