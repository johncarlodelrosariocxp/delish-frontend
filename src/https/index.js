// src/https/index.js
import axiosWrapper from "./axiosWrapper";

// Re-export axiosWrapper para magamit sa ibang components
export { axiosWrapper };

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
// ✅ ORDER ENDPOINTS
// =============================
export const addOrder = (data) => axiosWrapper.post("/api/order", data);
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
// ✅ ADMIN ENDPOINTS
// =============================
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
// ✅ EXPENSE ENDPOINTS
// =============================
export const getExpenses = (params = {}) => {
  let url = "/api/expenses";
  const queryParams = new URLSearchParams();
  if (params.startDate) queryParams.append("startDate", params.startDate);
  if (params.endDate) queryParams.append("endDate", params.endDate);
  if (params.category) queryParams.append("category", params.category);
  if (queryParams.toString()) url += `?${queryParams.toString()}`;
  return axiosWrapper.get(url);
};

export const addExpense = (data) => axiosWrapper.post("/api/expenses", data);
export const updateExpense = (id, data) => axiosWrapper.put(`/api/expenses/${id}`, data);
export const deleteExpense = (id) => axiosWrapper.delete(`/api/expenses/${id}`);
export const getInventoryValue = () => axiosWrapper.get("/api/expenses/inventory-value");
export const getProfitLossReport = (params = {}) => {
  let url = "/api/expenses/profit-loss";
  const queryParams = new URLSearchParams();
  if (params.startDate) queryParams.append("startDate", params.startDate);
  if (params.endDate) queryParams.append("endDate", params.endDate);
  if (queryParams.toString()) url += `?${queryParams.toString()}`;
  return axiosWrapper.get(url);
};

// =============================
// ✅ INVENTORY ENDPOINTS
// =============================
export const getInventory = () => axiosWrapper.get("/api/inventory");
export const getInventoryItem = (id) => axiosWrapper.get(`/api/inventory/${id}`);
export const addInventoryItem = (data) => axiosWrapper.post("/api/inventory", data);
export const updateInventoryItem = (id, data) => axiosWrapper.put(`/api/inventory/${id}`, data);
export const deleteInventoryItem = (id) => axiosWrapper.delete(`/api/inventory/${id}`);
export const transferStock = (itemId, data) => 
  axiosWrapper.post(`/api/inventory/${itemId}/transfer`, data);

// =============================
// ✅ PROFIT & LOSS ENDPOINTS
// =============================
export const generateProfitLossReport = (data) => axiosWrapper.post("/api/profit-loss/generate", data);
export const generateDailyProfitLoss = () => axiosWrapper.post("/api/profit-loss/generate-daily");
export const getAllProfitLossReports = () => axiosWrapper.get("/api/profit-loss");
export const getLatestProfitLossReport = () => axiosWrapper.get("/api/profit-loss/latest");
export const getAllTimeProfitLossSummary = () => axiosWrapper.get("/api/profit-loss/summary");
export const getProfitLossReportById = (id) => axiosWrapper.get(`/api/profit-loss/${id}`);
export const deleteProfitLossReport = (id) => axiosWrapper.delete(`/api/profit-loss/${id}`);

// =============================
// ✅ MENU ENDPOINTS
// =============================
export const getMenus = () => axiosWrapper.get("/api/menu");
export const getMenuById = (id) => axiosWrapper.get(`/api/menu/${id}`);
export const getMenusByTag = (tag) => axiosWrapper.get(`/api/menu/tag/${tag}`);
export const getMenuItems = (menuId) => axiosWrapper.get(`/api/menu/${menuId}/items`);
export const getMenuItem = (menuId, itemId) =>
  axiosWrapper.get(`/api/menu/${menuId}/items/${itemId}`);
export const getCheesecakeFlavors = () =>
  axiosWrapper.get("/api/menu/cheesecake/flavors");
export const getCheesecakeFlavorsByCategory = (category) =>
  axiosWrapper.get(`/api/menu/cheesecake/flavors/category/${category}`);

// Admin menu endpoints
export const createMenu = (data) => axiosWrapper.post("/api/menu", data);
export const updateMenu = (id, data) => axiosWrapper.put(`/api/menu/${id}`, data);
export const deleteMenu = (id) => axiosWrapper.delete(`/api/menu/${id}`);
export const addMenuItem = (menuId, data) =>
  axiosWrapper.post(`/api/menu/${menuId}/items`, data);
export const updateMenuItem = (menuId, itemId, data) =>
  axiosWrapper.put(`/api/menu/${menuId}/items/${itemId}`, data);
export const deleteMenuItem = (menuId, itemId) =>
  axiosWrapper.delete(`/api/menu/${menuId}/items/${itemId}`);
export const createCheesecakeFlavor = (data) =>
  axiosWrapper.post("/api/menu/cheesecake/flavors", data);
export const updateCheesecakeFlavor = (id, data) =>
  axiosWrapper.put(`/api/menu/cheesecake/flavors/${id}`, data);
export const deleteCheesecakeFlavor = (id) =>
  axiosWrapper.delete(`/api/menu/cheesecake/flavors/${id}`);
export const importMenuData = (data) => axiosWrapper.post("/api/menu/import", data);

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