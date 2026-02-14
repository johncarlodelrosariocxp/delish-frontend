import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSelector } from "react-redux";
import { 
  FaSearch, 
  FaCalendar, 
  FaHome, 
  FaTimes, 
  FaChevronDown,
  FaSpinner,
  FaSync 
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { getOrders } from "../https";
import BottomNav from "../components/shared/BottomNav";
import BackButton from "../components/shared/BackButton";
import Invoice from "../components/invoice/Invoice";
import OrderCard from "../components/orders/OrderCard";

// Constants
const CACHE_KEY = "pos_orders_cache";
const CACHE_EXPIRY = 60 * 60 * 1000; // 60 minutes
const MAX_CACHE_ITEMS = 50;
const MAX_ORDER_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

// Helper function to safely set localStorage
const safeSetLocalStorage = (key, value) => {
  if (typeof window === 'undefined') return false;
  
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    if (e.name === 'QuotaExceededError' || e.code === 22) {
      // Clear old cache items
      try {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const storageKey = localStorage.key(i);
          if (storageKey?.includes('pos_')) {
            keysToRemove.push(storageKey);
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
        localStorage.setItem(key, value);
        return true;
      } catch (retryError) {
        console.error('Still failed to set localStorage:', retryError);
        return false;
      }
    }
    return false;
  }
};

// Optimize cache data
const getOptimizedCacheData = (orders) => {
  if (!orders?.length) return null;
  
  return orders
    .sort((a, b) => {
      const dateA = a.parsedDate instanceof Date ? a.parsedDate : new Date(a.createdAt || 0);
      const dateB = b.parsedDate instanceof Date ? b.parsedDate : new Date(b.createdAt || 0);
      return dateB - dateA;
    })
    .slice(0, MAX_CACHE_ITEMS)
    .filter(order => {
      const orderDate = order.parsedDate instanceof Date ? order.parsedDate : new Date(order.createdAt || 0);
      return Date.now() - orderDate.getTime() < MAX_ORDER_AGE;
    })
    .map(o => ({
      _id: o._id,
      orderStatus: o.orderStatus,
      totalAmount: o.totalAmount,
      bills: o.bills ? { totalWithTax: o.bills.totalWithTax } : undefined,
      customerDetails: o.customerDetails ? { name: o.customerDetails.name } : undefined,
      createdAt: o.createdAt,
      orderDate: o.orderDate,
      items: o.items?.slice(0, 5).map(({ name, quantity, price }) => ({ name, quantity, price })),
      table: o.table ? { tableNo: o.table.tableNo } : undefined,
      parsedDate: o.parsedDate instanceof Date ? o.parsedDate.toISOString() : o.parsedDate
    }));
};

const Orders = () => {
  // State
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const [dateFilter, setDateFilter] = useState("today");
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [deletingOrderId, setDeletingOrderId] = useState(null);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [lastFetchTime, setLastFetchTime] = useState(0);

  // Refs
  const initialFetchDone = useRef(false);
  const saveTimeoutRef = useRef(null);
  const mountedRef = useRef(true);

  // Hooks
  const user = useSelector((state) => state.user);
  const navigate = useNavigate();
  const isAdmin = user?.role?.toLowerCase() === "admin";

  // Initialize from localStorage
  useEffect(() => {
    mountedRef.current = true;
    
    // Load cached orders
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data } = JSON.parse(cached);
        if (data?.length) {
          setOrders(data.map(order => ({
            ...order,
            parsedDate: order.parsedDate ? new Date(order.parsedDate) : new Date()
          })));
        }
      }
    } catch (e) {
      localStorage.removeItem(CACHE_KEY);
    }

    // Load filter states
    setDateFilter(localStorage.getItem("pos_date_filter") || "today");
    setStartDate(localStorage.getItem("pos_start_date") || "");
    setEndDate(localStorage.getItem("pos_end_date") || "");

    // Load last fetch time
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { timestamp } = JSON.parse(cached);
        setLastFetchTime(timestamp || 0);
      }
    } catch (e) {
      // Ignore
    }

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Save orders to localStorage with debounce
  useEffect(() => {
    if (!orders?.length) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      
      const optimizedData = getOptimizedCacheData(orders);
      if (optimizedData?.length) {
        const cacheData = {
          data: optimizedData,
          timestamp: Date.now()
        };
        safeSetLocalStorage(CACHE_KEY, JSON.stringify(cacheData));
        if (mountedRef.current) {
          setLastFetchTime(Date.now());
        }
      }
    }, 2000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [orders]);

  // Save filter states
  useEffect(() => {
    safeSetLocalStorage("pos_date_filter", dateFilter);
  }, [dateFilter]);
  
  useEffect(() => {
    safeSetLocalStorage("pos_start_date", startDate);
  }, [startDate]);
  
  useEffect(() => {
    safeSetLocalStorage("pos_end_date", endDate);
  }, [endDate]);

  // Process orders data
  const processOrdersData = useCallback((data) => {
    let ordersData = [];
    
    if (data?.data?.data) {
      ordersData = data.data.data;
    } else if (Array.isArray(data?.data)) {
      ordersData = data.data;
    } else if (Array.isArray(data)) {
      ordersData = data;
    }

    return ordersData.map(order => ({
      ...order,
      _id: order._id || order.id,
      parsedDate: new Date(order.createdAt || order.orderDate || order.date || Date.now())
    }));
  }, []);

  // Manual fetch only - no auto refresh
  const fetchOrders = useCallback(async (showLoading = true) => {
    if (!mountedRef.current) return;
    
    if (showLoading) setLoading(true);
    setError(null);
    
    try {
      const response = await getOrders();
      if (!mountedRef.current) return;
      
      const processedOrders = processOrdersData(response);
      setOrders(processedOrders);
      setLastFetchTime(Date.now());
    } catch (err) {
      if (mountedRef.current) {
        setError("Failed to load orders. Please try again.");
      }
    } finally {
      if (showLoading && mountedRef.current) {
        setLoading(false);
      }
    }
  }, [processOrdersData]);

  // Initial fetch only if no cached orders
  useEffect(() => {
    if (!mountedRef.current) return;
    
    // Only fetch if we have no orders (cache was empty)
    if (orders.length === 0 && !initialFetchDone.current) {
      initialFetchDone.current = true;
      fetchOrders();
    }
  }, [fetchOrders, orders.length]);

  // Clear old cache
  useEffect(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp > CACHE_EXPIRY * 2) {
          localStorage.removeItem(CACHE_KEY);
        }
      }
    } catch (e) {
      // Ignore
    }
  }, []);

  // Date filter functions
  const getDateRange = useCallback((filterType) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (filterType) {
      case "today":
        return { start: today, end: new Date(today.getTime() + 86400000) };
      case "yesterday": {
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        return { start: yesterday, end: today };
      }
      case "this week": {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        return { start: startOfWeek, end: new Date(startOfWeek.getTime() + 604800000) };
      }
      case "last week": {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const startOfLastWeek = new Date(startOfWeek);
        startOfLastWeek.setDate(startOfWeek.getDate() - 7);
        return { start: startOfLastWeek, end: new Date(startOfLastWeek.getTime() + 604800000) };
      }
      case "this month": {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        return { start: startOfMonth, end: endOfMonth };
      }
      case "last month": {
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return { start: startOfLastMonth, end: endOfLastMonth };
      }
      case "custom":
        if (startDate && endDate) {
          const customStart = new Date(startDate);
          const customEnd = new Date(endDate);
          customEnd.setHours(23, 59, 59, 999);
          return { start: customStart, end: customEnd };
        }
        return { start: null, end: null };
      default:
        return { start: null, end: null };
    }
  }, [startDate, endDate]);

  // Filter orders
  const filteredOrders = orders.filter(order => {
    if (dateFilter !== "all") {
      const { start, end } = getDateRange(dateFilter);
      if (start && end && order.parsedDate) {
        if (order.parsedDate < start || order.parsedDate > end) {
          return false;
        }
      }
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const orderId = order._id || "";
      const customerName = order.customerDetails?.name || order.customerName || "";
      const orderStatus = order.orderStatus || "";
      return (
        orderId.toLowerCase().includes(query) ||
        customerName.toLowerCase().includes(query) ||
        orderStatus.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Calculate totals
  const totalSales = filteredOrders
    .filter(order => order.orderStatus?.toLowerCase() !== "cancelled")
    .reduce((sum, order) => sum + (Number(order?.bills?.totalWithTax || order?.totalAmount || 0)), 0);

  const activeOrdersCount = filteredOrders.filter(
    order => order.orderStatus?.toLowerCase() !== "cancelled"
  ).length;

  const completedOrdersCount = filteredOrders.filter(
    order => order.orderStatus?.toLowerCase() === "completed"
  ).length;

  // Handlers
  const handleStatusChange = async (order, newStatus) => {
    if (!order?._id) return;
    setUpdatingOrderId(order._id);
    try {
      setOrders(prev => prev.map(o =>
        o._id === order._id ? { ...o, orderStatus: newStatus } : o
      ));
    } catch (err) {
      console.error("Failed to update order status:", err);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!orderId) return;
    setDeletingOrderId(orderId);
    try {
      setOrders(prev => prev.filter(o => o._id !== orderId));
    } catch (err) {
      console.error("Failed to delete order:", err);
    } finally {
      setDeletingOrderId(null);
    }
  };

  const handleViewReceipt = (order) => {
    setSelectedOrder(order);
    setShowInvoice(true);
  };

  const goToHome = () => navigate("/");

  const handleCustomDateApply = () => {
    if (startDate && endDate) {
      setDateFilter("custom");
      setShowCalendar(false);
      setShowDateDropdown(false);
    }
  };

  const handleCustomDateClear = () => {
    setStartDate("");
    setEndDate("");
    setDateFilter("today");
  };

  const dateFilterOptions = [
    { value: "today", label: "Today" },
    { value: "yesterday", label: "Yesterday" },
    { value: "this week", label: "This Week" },
    { value: "last week", label: "Last Week" },
    { value: "this month", label: "This Month" },
    { value: "last month", label: "Last Month" },
    { value: "custom", label: "Custom Date Range" },
    { value: "all", label: "All Time" }
  ];

  const getDateFilterLabel = () => {
    if (dateFilter === "custom" && startDate && endDate) {
      return `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`;
    }
    return dateFilterOptions.find(opt => opt.value === dateFilter)?.label || "Today";
  };

  // Render
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BackButton />
            <h1 className="text-xl font-bold text-gray-800">Orders</h1>
            <span className={`px-2 py-1 text-xs rounded-full ${
              isAdmin ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"
            }`}>
              {isAdmin ? "Admin" : "Cashier"}
            </span>
            {lastFetchTime > 0 && (
              <span className="text-[10px] text-gray-500">
                {orders.length} orders • Last updated: {new Date(lastFetchTime).toLocaleTimeString()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchOrders(true)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg flex items-center gap-2 text-sm"
              disabled={loading}
            >
              {loading ? (
                <FaSpinner className="animate-spin" />
              ) : (
                <FaSync />
              )}
              {loading ? 'Loading...' : 'Refresh'}
            </button>
            <button
              onClick={goToHome}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm"
            >
              <FaHome />
              Home
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="px-4 py-3 border-t">
          <div className="relative mb-3">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search orders by ID, customer, or status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <FaTimes />
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            <div className="relative">
              <button
                onClick={() => setShowDateDropdown(!showDateDropdown)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <FaCalendar />
                {getDateFilterLabel()}
                <FaChevronDown className="text-xs" />
              </button>
              
              {showDateDropdown && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white border rounded-lg shadow-lg z-30">
                  {dateFilterOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        if (option.value === "custom") {
                          setShowCalendar(true);
                        } else {
                          setDateFilter(option.value);
                          setStartDate("");
                          setEndDate("");
                        }
                        setShowDateDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2 hover:bg-gray-50 ${
                        dateFilter === option.value ? "bg-blue-50 text-blue-600" : ""
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {showCalendar && (
              <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg z-40 p-4 w-64">
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCustomDateApply}
                    disabled={!startDate || !endDate}
                    className={`flex-1 px-3 py-2 rounded-lg ${
                      startDate && endDate
                        ? "bg-blue-500 text-white hover:bg-blue-600"
                        : "bg-gray-200 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    Apply
                  </button>
                  <button
                    onClick={() => setShowCalendar(false)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {dateFilter === "custom" && startDate && endDate && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}
                </span>
                <button
                  onClick={handleCustomDateClear}
                  className="text-red-500 text-sm hover:text-red-700"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        {orders.length > 0 && (
          <div className="px-4 py-3 border-t bg-gray-50">
            <div className="flex flex-wrap gap-3 text-sm">
              <div className="bg-white px-3 py-2 rounded-lg shadow-sm">
                <div className="text-gray-500">Total Orders</div>
                <div className="font-bold">{filteredOrders.length}</div>
              </div>
              <div className="bg-white px-3 py-2 rounded-lg shadow-sm">
                <div className="text-gray-500">Active</div>
                <div className="font-bold text-green-600">{activeOrdersCount}</div>
              </div>
              <div className="bg-white px-3 py-2 rounded-lg shadow-sm">
                <div className="text-gray-500">Completed</div>
                <div className="font-bold text-blue-600">{completedOrdersCount}</div>
              </div>
              <div className="bg-white px-3 py-2 rounded-lg shadow-sm">
                <div className="text-gray-500">Sales</div>
                <div className="font-bold">₱{totalSales.toFixed(2)}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Orders List */}
      <div className="flex-1 overflow-y-auto p-4 pb-48">
        {loading && !orders.length ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-3"></div>
              <p className="text-gray-600">Loading orders...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <p className="text-red-500 mb-3">{error}</p>
              <button
                onClick={() => fetchOrders(true)}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : !filteredOrders.length ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="text-4xl mb-2">📋</div>
              <p className="text-gray-600 mb-2">
                {!orders.length ? "No orders found" : "No orders match your filters"}
              </p>
              {orders.length > 0 && dateFilter !== "all" && (
                <button
                  onClick={() => setDateFilter("all")}
                  className="text-blue-500 text-sm hover:text-blue-700 mr-2"
                >
                  Show all orders
                </button>
              )}
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-blue-500 text-sm hover:text-blue-700"
                >
                  Clear search
                </button>
              )}
              {!orders.length && (
                <button
                  onClick={() => fetchOrders(true)}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 mt-2"
                >
                  Refresh Orders
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOrders.map((order) => (
              <OrderCard
                key={order._id}
                order={order}
                onViewReceipt={handleViewReceipt}
                onDelete={handleDeleteOrder}
                onStatusChange={handleStatusChange}
                isDeleting={deletingOrderId === order._id}
                isUpdating={updatingOrderId === order._id}
              />
            ))}
          </div>
        )}
      </div>

      {showInvoice && selectedOrder && (
        <Invoice orderInfo={selectedOrder} setShowInvoice={setShowInvoice} />
      )}

      <BottomNav />
    </div>
  );
};

export default Orders;