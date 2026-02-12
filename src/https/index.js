// This file should be in your `src/https/index.js`
import axiosWrapper from "./axiosWrapper";

// =============================
// ✅ AUTH ENDPOINTS
// =============================
export const login = (data) => axiosWrapper.post("/api/user/login", data);
export const register = (data) => axiosWrapper.post("/api/user/register", data);
export const getUserData = () => axiosWrapper.get("/api/user/me");
export const logout = () => axiosWrapper.post("/api/user/logout");
export const getUserDashboardStats = () =>
  axiosWrapper.get("/api/user/dashboard/stats");

// =============================
// ✅ TABLE ENDPOINTS
// =============================
export const addTable = (data) => axiosWrapper.post("/api/table", data);
export const getTables = () => axiosWrapper.get("/api/table");
export const updateTable = ({ tableId, ...tableData }) =>
  axiosWrapper.put(`/api/table/${tableId}`, tableData);
export const deleteTable = (tableId) =>
  axiosWrapper.delete(`/api/table/${tableId}`);

// =============================
// ✅ PAYMENT ENDPOINTS
// =============================
export const createOrderRazorpay = (data) =>
  axiosWrapper.post("/api/payment/create-order", data);
export const verifyPaymentRazorpay = (data) =>
  axiosWrapper.post("/api/payment/verify-payment", data);
export const getPayments = () => axiosWrapper.get("/api/payment");
export const getPaymentStats = () => axiosWrapper.get("/api/payment/stats");

// =============================
// ✅ ORDER ENDPOINTS - UPDATED TO ACCEPT PARAMETERS
// =============================
export const addOrder = (data) => axiosWrapper.post("/api/order", data);

// ✅ FIXED: Now accepts parameters like { limit: 5000 }
export const getOrders = (params = {}) =>
  axiosWrapper.get("/api/order", { params });

export const getOrderById = (orderId) =>
  axiosWrapper.get(`/api/order/${orderId}`);
export const updateOrderStatus = ({ orderId, orderStatus }) =>
  axiosWrapper.put(`/api/order/${orderId}`, { orderStatus });
export const deleteOrder = (orderId) =>
  axiosWrapper.delete(`/api/order/${orderId}`);
export const getOrderStats = () => axiosWrapper.get("/api/order/stats");

// =============================
// ✅ ADMIN ENDPOINTS - UPDATED TO ACCEPT PARAMETERS
// =============================
// ✅ FIXED: Now accepts parameters like { limit: 5000 }
export const getAdminOrders = (params = {}) =>
  axiosWrapper.get("/api/order/admin/all-orders", { params });

export const getAdminStats = () =>
  axiosWrapper.get("/api/order/admin/all-stats");
export const getAdminDashboardStats = () =>
  axiosWrapper.get("/api/user/admin/dashboard/stats");

// =============================
// ✅ SALES ENDPOINTS
// =============================
export const getSales = () => axiosWrapper.get("/api/sales");
export const getTodaySales = () => axiosWrapper.get("/api/sales/today");
export const getSalesStats = () => axiosWrapper.get("/api/sales/stats");
export const getSalesByRange = (startDate, endDate) =>
  axiosWrapper.get(`/api/sales/range?start=${startDate}&end=${endDate}`);
export const getSalesReports = () => axiosWrapper.get("/api/sales/reports");

// =============================
// ✅ INVENTORY ENDPOINTS
// =============================
export const getInventory = () => axiosWrapper.get("/api/inventory");
export const addInventoryItem = (data) =>
  axiosWrapper.post("/api/inventory", data);
export const updateInventoryItem = ({ itemId, ...itemData }) =>
  axiosWrapper.put(`/api/inventory/${itemId}`, itemData);
export const transferStock = (itemId, transferData) =>
  axiosWrapper.patch(`/api/inventory/${itemId}/transfer`, transferData);
export const deleteInventoryItem = (itemId) =>
  axiosWrapper.delete(`/api/inventory/${itemId}`);
export const getLowStockItems = () =>
  axiosWrapper.get("/api/inventory/low-stock");

// =============================
// ✅ TEST CONNECTION
// =============================
export const testConnection = async () => {
  try {
    const response = await axiosWrapper.get("/");
    return {
      success: true,
      message: "Connected to backend successfully",
      data: response.data,
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
      error: error,
    };
  }
};
