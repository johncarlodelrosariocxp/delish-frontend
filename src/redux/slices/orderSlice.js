import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  orders: [
    {
      id: "order-1",
      number: 1,
      items: [],
      customer: {
        orderId: "",
        customerName: "",
        customerPhone: "",
        guests: 0,
        table: null,
      },
      status: "active",
      createdAt: new Date().toISOString(),
    },
  ],
  activeOrderId: "order-1",
  completedOrders: [], // ADDED: Store completed orders
};

const orderSlice = createSlice({
  name: "order",
  initialState,
  reducers: {
    createNewOrder: (state) => {
      const newOrderNumber = state.orders.length + 1;
      const newOrder = {
        id: `order-${newOrderNumber}`,
        number: newOrderNumber,
        items: [],
        customer: {
          orderId: `${Date.now()}`,
          customerName: "",
          customerPhone: "",
          guests: 0,
          table: null,
        },
        status: "active",
        createdAt: new Date().toISOString(),
      };
      state.orders.push(newOrder);
      state.activeOrderId = newOrder.id;
    },

    switchOrder: (state, action) => {
      state.activeOrderId = action.payload;
    },

    closeOrder: (state, action) => {
      const orderId = action.payload;
      if (state.orders.length > 1) {
        state.orders = state.orders.filter((order) => order.id !== orderId);

        // If we closed the active order, switch to the first remaining order
        if (state.activeOrderId === orderId) {
          state.activeOrderId = state.orders[0]?.id || "";
        }
      }
    },

    // ADDED: Complete order - moves from active to completed
    completeOrder: (state, action) => {
      const orderId = action.payload;
      const orderIndex = state.orders.findIndex(
        (order) => order.id === orderId
      );

      if (orderIndex !== -1) {
        const completedOrder = {
          ...state.orders[orderIndex],
          status: "completed",
          completedAt: new Date().toISOString(),
        };

        // Add to completed orders
        state.completedOrders.push(completedOrder);

        // Remove from active orders
        state.orders.splice(orderIndex, 1);

        // Set new active order if available
        if (state.orders.length > 0) {
          // Try to keep the same position, or fall back to first order
          const newIndex = Math.min(orderIndex, state.orders.length - 1);
          state.activeOrderId = state.orders[newIndex].id;
        } else {
          state.activeOrderId = null;
        }
      }
    },

    // Cart actions for specific orders
    addItemsToOrder: (state, action) => {
      const { orderId, payload } = action.payload;
      const order = state.orders.find((order) => order.id === orderId);

      if (order && payload) {
        const existingItemIndex = order.items.findIndex(
          (item) =>
            item.id === payload.id &&
            item.pricePerQuantity === payload.pricePerQuantity
        );

        if (existingItemIndex !== -1) {
          // If item exists, increment quantity
          order.items[existingItemIndex].quantity += payload.quantity || 1;
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

          order.items.push(newItem);
        }
      }
    },

    removeItemFromOrder: (state, action) => {
      const { orderId, itemId } = action.payload;
      const order = state.orders.find((order) => order.id === orderId);
      if (order && itemId) {
        order.items = order.items.filter((item) => item.id !== itemId);
      }
    },

    removeAllItemsFromOrder: (state, action) => {
      const { orderId } = action.payload;
      const order = state.orders.find((order) => order.id === orderId);
      if (order) {
        order.items = [];
      }
    },

    incrementQuantityInOrder: (state, action) => {
      const { orderId, itemId } = action.payload;
      const order = state.orders.find((order) => order.id === orderId);
      if (order && itemId) {
        const item = order.items.find((item) => item.id === itemId);
        if (item) {
          item.quantity += 1;
        }
      }
    },

    decrementQuantityInOrder: (state, action) => {
      const { orderId, itemId } = action.payload;
      const order = state.orders.find((order) => order.id === orderId);
      if (order && itemId) {
        const itemIndex = order.items.findIndex((item) => item.id === itemId);

        if (itemIndex !== -1) {
          const item = order.items[itemIndex];
          if (item.quantity > 1) {
            item.quantity -= 1;
          } else {
            // Remove item if quantity becomes 0
            order.items.splice(itemIndex, 1);
          }
        }
      }
    },

    updateQuantityInOrder: (state, action) => {
      const { orderId, id, quantity } = action.payload;
      const order = state.orders.find((order) => order.id === orderId);

      if (order && id && quantity !== undefined) {
        const itemIndex = order.items.findIndex((item) => item.id === id);

        if (itemIndex !== -1) {
          if (quantity > 0) {
            order.items[itemIndex].quantity = quantity;
          } else {
            // Remove item if quantity is 0
            order.items.splice(itemIndex, 1);
          }
        }
      }
    },

    redeemItemInOrder: (state, action) => {
      const { orderId, itemId } = action.payload;
      const order = state.orders.find((order) => order.id === orderId);

      if (order && itemId) {
        // First, clear all redemptions in this order
        order.items.forEach((item) => {
          item.isRedeemed = false;
        });

        // Then redeem the specific item
        const item = order.items.find((item) => item.id === itemId);
        if (item) {
          item.isRedeemed = true;
        }
      }
    },

    removeRedemptionFromOrder: (state, action) => {
      const { orderId } = action.payload;
      const order = state.orders.find((order) => order.id === orderId);
      if (order) {
        order.items.forEach((item) => {
          item.isRedeemed = false;
        });
      }
    },

    // Customer actions for specific orders
    setOrderCustomer: (state, action) => {
      const { orderId, customer } = action.payload;
      const order = state.orders.find((order) => order.id === orderId);
      if (order) {
        order.customer = { ...order.customer, ...customer };
      }
    },

    removeOrderCustomer: (state, action) => {
      const { orderId } = action.payload;
      const order = state.orders.find((order) => order.id === orderId);
      if (order) {
        order.customer = {
          orderId: "",
          customerName: "",
          customerPhone: "",
          guests: 0,
          table: null,
        };
      }
    },

    updateOrderTable: (state, action) => {
      const { orderId, table } = action.payload;
      const order = state.orders.find((order) => order.id === orderId);
      if (order) {
        order.customer.table = table;
      }
    },

    // ADDED: Clear completed orders
    clearCompletedOrders: (state) => {
      state.completedOrders = [];
    },
  },
});

export const {
  createNewOrder,
  switchOrder,
  closeOrder,
  completeOrder, // ADDED: Export completeOrder
  addItemsToOrder,
  removeItemFromOrder,
  removeAllItemsFromOrder,
  incrementQuantityInOrder,
  decrementQuantityInOrder,
  updateQuantityInOrder,
  redeemItemInOrder,
  removeRedemptionFromOrder,
  setOrderCustomer,
  removeOrderCustomer,
  updateOrderTable,
  clearCompletedOrders, // ADDED: Export clearCompletedOrders
} = orderSlice.actions;

export default orderSlice.reducer;
