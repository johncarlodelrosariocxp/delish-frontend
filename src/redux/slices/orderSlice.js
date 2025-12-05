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
  completedOrders: [],
  // ✅ ADDED: Store recent completed order for invoice
  recentCompletedOrder: null,
  // ✅ ADDED: Track whether to show invoice
  showInvoiceForOrder: null,
};

const orderSlice = createSlice({
  name: "order",
  initialState,
  reducers: {
    createNewOrder: (state) => {
      const newOrderNumber =
        state.orders.length + state.completedOrders.length + 1;
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

      // ✅ Reset invoice state when creating new order
      state.recentCompletedOrder = null;
      state.showInvoiceForOrder = null;
    },

    switchOrder: (state, action) => {
      const orderId = action.payload;
      const order = state.orders.find((order) => order.id === orderId);
      if (order && order.status === "active") {
        state.activeOrderId = orderId;
      }
    },

    closeOrder: (state, action) => {
      const orderId = action.payload;
      const orderIndex = state.orders.findIndex(
        (order) => order.id === orderId && order.status === "active"
      );

      if (orderIndex !== -1 && state.orders.length > 1) {
        state.orders.splice(orderIndex, 1);

        if (state.activeOrderId === orderId) {
          const nextActiveOrder = state.orders.find(
            (order) => order.status === "active"
          );
          state.activeOrderId = nextActiveOrder?.id || "";
        }
      }
    },

    // Mark order as "processing" when payment starts
    processOrder: (state, action) => {
      const orderId = action.payload;
      const orderIndex = state.orders.findIndex(
        (order) => order.id === orderId && order.status === "active"
      );

      if (orderIndex !== -1) {
        state.orders[orderIndex].status = "processing";
      }
    },

    // ✅ UPDATED: Mark order as completed AND store for invoice
    completeOrder: (state, action) => {
      const { orderId, orderData } = action.payload;
      const orderIndex = state.orders.findIndex(
        (order) => order.id === orderId
      );

      if (orderIndex !== -1) {
        const completedOrder = {
          ...state.orders[orderIndex],
          ...orderData, // Include order data from Bill component
          status: "completed",
          completedAt: new Date().toISOString(),
        };

        // ✅ Store for invoice display
        state.recentCompletedOrder = completedOrder;
        state.showInvoiceForOrder = orderId;

        // Add to completed orders
        state.completedOrders.unshift(completedOrder);

        // Remove from active orders
        state.orders.splice(orderIndex, 1);

        // Set new active order if available
        if (state.orders.length > 0) {
          const nextActiveOrder = state.orders.find(
            (order) => order.status === "active"
          );
          if (nextActiveOrder) {
            state.activeOrderId = nextActiveOrder.id;
          } else if (state.orders.length > 0) {
            state.activeOrderId = state.orders[0].id;
          } else {
            state.activeOrderId = null;
          }
        } else {
          state.activeOrderId = null;
        }
      }
    },

    // ✅ ADDED: Show invoice for a specific order
    showInvoice: (state, action) => {
      state.showInvoiceForOrder = action.payload;
    },

    // ✅ ADDED: Hide invoice
    hideInvoice: (state) => {
      state.showInvoiceForOrder = null;
      state.recentCompletedOrder = null;
    },

    // ✅ ADDED: Clear recent completed order after invoice is shown
    clearRecentCompletedOrder: (state) => {
      state.recentCompletedOrder = null;
      state.showInvoiceForOrder = null;
    },

    // Reset order status if payment fails
    resetOrderStatus: (state, action) => {
      const orderId = action.payload;
      const orderIndex = state.orders.findIndex(
        (order) => order.id === orderId
      );
      if (
        orderIndex !== -1 &&
        state.orders[orderIndex].status === "processing"
      ) {
        state.orders[orderIndex].status = "active";
      }
    },

    // FIXED: addItemsToOrder - handle both price and pricePerQuantity
    addItemsToOrder: (state, action) => {
      const { orderId, item } = action.payload;
      const order = state.orders.find((order) => order.id === orderId);

      if (order && item) {
        const itemPrice = item.price || item.pricePerQuantity || 0;

        const existingItemIndex = order.items.findIndex((existingItem) => {
          const existingItemPrice =
            existingItem.price || existingItem.pricePerQuantity || 0;
          return existingItem.id === item.id && existingItemPrice === itemPrice;
        });

        if (existingItemIndex !== -1) {
          order.items[existingItemIndex].quantity += item.quantity || 1;
        } else {
          const newItem = {
            id: item.id || `item-${Date.now()}-${Math.random()}`,
            name: item.name || "Unknown Item",
            price: item.price || item.pricePerQuantity || 0,
            pricePerQuantity: item.pricePerQuantity || item.price || 0,
            quantity: item.quantity || 1,
            isRedeemed: false,
            category: item.category || "general",
            ...item,
          };
          order.items.push(newItem);
        }
      }
    },

    // ... (keep all other reducers the same, just add the new ones above)

    // The rest of your reducers remain the same...
    addMultipleItemsToOrder: (state, action) => {
      const { orderId, items } = action.payload;
      const order = state.orders.find((order) => order.id === orderId);

      if (order && Array.isArray(items)) {
        items.forEach((item) => {
          const itemPrice = item.price || item.pricePerQuantity || 0;

          const existingItemIndex = order.items.findIndex((existingItem) => {
            const existingItemPrice =
              existingItem.price || existingItem.pricePerQuantity || 0;
            return (
              existingItem.id === item.id && existingItemPrice === itemPrice
            );
          });

          if (existingItemIndex !== -1) {
            order.items[existingItemIndex].quantity += item.quantity || 1;
          } else {
            const newItem = {
              id: item.id || `item-${Date.now()}-${Math.random()}`,
              name: item.name || "Unknown Item",
              price: item.price || item.pricePerQuantity || 0,
              pricePerQuantity: item.pricePerQuantity || item.price || 0,
              quantity: item.quantity || 1,
              isRedeemed: false,
              category: item.category || "general",
              ...item,
            };
            order.items.push(newItem);
          }
        });
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
      if (order) {
        const item = order.items.find((item) => item.id === itemId);
        if (item) {
          item.quantity += 1;
        }
      }
    },

    decrementQuantityInOrder: (state, action) => {
      const { orderId, itemId } = action.payload;
      const order = state.orders.find((order) => order.id === orderId);
      if (order) {
        const itemIndex = order.items.findIndex((item) => item.id === itemId);

        if (itemIndex !== -1) {
          const item = order.items[itemIndex];
          if (item.quantity > 1) {
            item.quantity -= 1;
          } else {
            order.items.splice(itemIndex, 1);
          }
        }
      }
    },

    updateQuantityInOrder: (state, action) => {
      const { orderId, itemId, quantity } = action.payload;
      const order = state.orders.find((order) => order.id === orderId);

      if (order) {
        const itemIndex = order.items.findIndex((item) => item.id === itemId);

        if (itemIndex !== -1) {
          if (quantity > 0) {
            order.items[itemIndex].quantity = quantity;
          } else {
            order.items.splice(itemIndex, 1);
          }
        }
      }
    },

    redeemItemInOrder: (state, action) => {
      const { orderId, itemId } = action.payload;
      const order = state.orders.find((order) => order.id === orderId);

      if (order) {
        order.items.forEach((item) => {
          item.isRedeemed = false;
        });

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

    clearCompletedOrders: (state) => {
      state.completedOrders = [];
    },

    addItemDirectly: (state, action) => {
      const { orderId, item } = action.payload;
      const order = state.orders.find((order) => order.id === orderId);

      if (order && item) {
        const newItem = {
          id: item.id || `item-${Date.now()}-${Math.random()}`,
          name: item.name || "Unknown Item",
          price: item.price || item.pricePerQuantity || 0,
          pricePerQuantity: item.pricePerQuantity || item.price || 0,
          quantity: item.quantity || 1,
          isRedeemed: false,
          category: item.category || "general",
          ...item,
        };
        order.items.push(newItem);
      }
    },
  },
});

export const {
  createNewOrder,
  switchOrder,
  closeOrder,
  processOrder,
  completeOrder, // Now accepts orderData
  showInvoice,
  hideInvoice,
  clearRecentCompletedOrder,
  addItemsToOrder,
  addMultipleItemsToOrder,
  addItemDirectly,
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
  clearCompletedOrders,
  resetOrderStatus,
} = orderSlice.actions;

export default orderSlice.reducer;
