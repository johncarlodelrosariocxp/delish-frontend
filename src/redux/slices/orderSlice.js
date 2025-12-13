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
  showInvoice: false,
  recentCompletedOrder: null,
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
    },

    switchOrder: (state, action) => {
      const orderId = action.payload;
      const order = state.orders.find((order) => order.id === orderId);
      if (order && order.status === "active") {
        state.activeOrderId = orderId;
      }
    },

    setActiveOrder: (state, action) => {
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

    // MODIFIED: Place order - immediately completes and shows invoice
    placeOrder: (state, action) => {
      const orderId = action.payload || state.activeOrderId;
      const orderIndex = state.orders.findIndex(
        (order) => order.id === orderId && order.status === "active"
      );

      if (orderIndex !== -1) {
        // Get the order before modifying state
        const order = state.orders[orderIndex];

        // Create completed order with current timestamp
        const completedOrder = {
          ...order,
          status: "completed",
          completedAt: new Date().toISOString(),
        };

        // Add to completed orders
        state.completedOrders.unshift(completedOrder);

        // Set as recent completed order
        state.recentCompletedOrder = completedOrder;

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

        // Automatically show invoice
        state.showInvoice = true;
      }
    },

    // MODIFIED: Complete order with invoice display
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
        state.completedOrders.unshift(completedOrder);

        // Set as recent completed order
        state.recentCompletedOrder = completedOrder;

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

        // Automatically show invoice
        state.showInvoice = true;
      }
    },

    // Simplified - Direct complete and show invoice
    completeAndInvoice: (state, action) => {
      const orderId = action.payload || state.activeOrderId;
      const order = state.orders.find((order) => order.id === orderId);

      if (order) {
        const completedOrder = {
          ...order,
          status: "completed",
          completedAt: new Date().toISOString(),
        };

        // Move to completed orders
        state.completedOrders.unshift(completedOrder);
        state.recentCompletedOrder = completedOrder;

        // Remove from active orders
        state.orders = state.orders.filter((order) => order.id !== orderId);

        // Set new active order
        if (state.orders.length > 0) {
          state.activeOrderId = state.orders[0].id;
        } else {
          // Create a new empty order
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
        }

        // Show invoice
        state.showInvoice = true;
      }
    },

    // Clear current order
    clearCurrentOrder: (state, action) => {
      const orderId = action.payload || state.activeOrderId;
      const order = state.orders.find((order) => order.id === orderId);

      if (order) {
        order.items = [];
        order.customer = {
          orderId: "",
          customerName: "",
          customerPhone: "",
          guests: 0,
          table: null,
        };
      }
    },

    // Show invoice
    showInvoice: (state, action) => {
      state.showInvoice = true;
      if (action.payload) {
        state.recentCompletedOrder = action.payload;
      }
    },

    // Hide invoice
    hideInvoice: (state) => {
      state.showInvoice = false;
      state.recentCompletedOrder = null;
    },

    // Clear recent completed order
    clearRecentCompletedOrder: (state) => {
      state.recentCompletedOrder = null;
    },

    // Process order (for payment processing)
    processOrder: (state, action) => {
      const orderId = action.payload;
      const order = state.orders.find((order) => order.id === orderId);
      if (order && order.status === "active") {
        order.status = "processing";
      }
    },

    // Reset order status
    resetOrderStatus: (state, action) => {
      const orderId = action.payload;
      const order = state.orders.find((order) => order.id === orderId);
      if (order && order.status === "processing") {
        order.status = "active";
      }
    },

    // Items management (unchanged from your original)
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
  setActiveOrder,
  closeOrder,
  clearCurrentOrder,
  processOrder,
  completeOrder,
  placeOrder, // NEW: Direct place order action
  completeAndInvoice, // NEW: Combined complete and show invoice
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
