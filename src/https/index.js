import { axiosWrapper } from "./axiosWrapper";

// =============================
// ✅ AUTH ENDPOINTS
// =============================
export const login = (data) => axiosWrapper.post("/api/user/login", data);
export const register = (data) => axiosWrapper.post("/api/user/register", data);
export const getUserData = () => axiosWrapper.get("/api/user");
export const logout = () => axiosWrapper.post("/api/user/logout");

// =============================
// ✅ TABLE ENDPOINTS
// =============================
export const addTable = (data) => axiosWrapper.post("/api/table", data);
export const getTables = () => axiosWrapper.get("/api/table");
export const updateTable = ({ tableId, ...tableData }) =>
  axiosWrapper.put(`/api/table/${tableId}`, tableData);

// =============================
// ✅ PAYMENT ENDPOINTS
// =============================
export const createOrderRazorpay = (data) =>
  axiosWrapper.post("/api/payment/create-order", data);
export const verifyPaymentRazorpay = (data) =>
  axiosWrapper.post("/api/payment/verify-payment", data);

// =============================
// ✅ ORDER ENDPOINTS
// =============================
export const addOrder = (data) => axiosWrapper.post("/api/order", data);
export const getOrders = () => axiosWrapper.get("/api/order");
export const updateOrderStatus = ({ orderId, orderStatus }) =>
  axiosWrapper.put(`/api/order/${orderId}`, { orderStatus });
export const deleteOrder = (orderId) =>
  axiosWrapper.delete(`/api/order/${orderId}`);

// =============================
// ✅ MENU ENDPOINTS
// =============================
export const addMenuItem = (data) => axiosWrapper.post("/api/menu", data);
export const getMenuItems = () => axiosWrapper.get("/api/menu");
export const updateMenuItem = ({ itemId, ...itemData }) =>
  axiosWrapper.put(`/api/menu/${itemId}`, itemData);
export const deleteMenuItem = (itemId) =>
  axiosWrapper.delete(`/api/menu/${itemId}`);
export const applyMenuDiscount = (itemId) =>
  axiosWrapper.put(`/api/menu/${itemId}/discount`);

// =============================
// ✅ INVENTORY ENDPOINTS
// =============================

// 📥 Get all inventory items
export const getInventory = () => axiosWrapper.get("/api/inventory");

// ➕ Add new inventory item
export const addInventoryItem = (data) =>
  axiosWrapper.post("/api/inventory", data);

// ✏️ Update inventory item
export const updateInventoryItem = ({ itemId, ...itemData }) =>
  axiosWrapper.put(`/api/inventory/${itemId}`, itemData);

// 🔄 Transfer stock between locations
export const transferStock = (itemId, transferData) =>
  axiosWrapper.patch(`/api/inventory/${itemId}/transfer`, transferData);

// ❌ Delete inventory item
export const deleteInventoryItem = (itemId) =>
  axiosWrapper.delete(`/api/inventory/${itemId}`);

// 📉 Get low stock items
export const getLowStockItems = () =>
  axiosWrapper.get("/api/inventory/low-stock");
