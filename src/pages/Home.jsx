import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import BottomNav from "../components/shared/BottomNav";
import Greetings from "../components/home/Greetings";
import {
  FaChartLine,
  FaShoppingCart,
  FaCalendarAlt,
  FaCheckCircle,
  FaDollarSign,
  FaUsers,
  FaBox,
  FaSpinner,
  FaExclamationTriangle,
  FaSync,
  FaClock,
  FaFire,
  FaChevronDown,
} from "react-icons/fa";
import RecentOrders from "../components/home/RecentOrders";
import { getOrders, updateOrderStatus, getAdminStats } from "../https";
import { useSelector } from "react-redux";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

// MiniCard Component
const MiniCard = ({
  title,
  icon,
  number,
  footerNum,
  footerText,
  currency = false,
  loading = false,
  variant = "default",
  period,
}) => {
  const formatNumber = (num) => {
    if (loading) return currency ? "₱---" : "---";
    if (num === null || num === undefined) return currency ? "₱0.00" : "0";

    const numericValue = Number(num);
    if (!isFinite(numericValue)) return currency ? "₱0.00" : "0";

    if (currency) {
      return `₱${numericValue.toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    }

    return numericValue.toLocaleString("en-PH");
  };

  const getIconComponent = () => {
    const iconMap = {
      sales: FaDollarSign,
      revenue: FaDollarSign,
      orders: FaShoppingCart,
      customers: FaUsers,
      completed: FaCheckCircle,
      progress: FaSpinner,
      products: FaBox,
      pending: FaClock,
      popular: FaFire,
      default: FaChartLine,
    };
    const IconComponent = iconMap[icon?.toLowerCase()] || iconMap.default;
    return <IconComponent className="text-lg" />;
  };

  const getColorScheme = () => {
    const schemes = {
      primary: "bg-blue-500",
      success: "bg-green-500",
      warning: "bg-yellow-500",
      info: "bg-cyan-500",
      danger: "bg-red-500",
      popular: "bg-purple-500",
      default: "bg-gray-500",
    };
    return schemes[variant] || schemes.default;
  };

  const formatFooter = () => {
    if (loading || footerNum === undefined) {
      return { text: "---", color: "text-gray-400" };
    }
    const num = Number(footerNum);
    if (!isFinite(num)) return { text: "0%", color: "text-gray-400" };
    
    if (num > 0) return { text: `+${num.toFixed(1)}%`, color: "text-green-600" };
    if (num < 0) return { text: `${num.toFixed(1)}%`, color: "text-red-500" };
    return { text: "0%", color: "text-gray-400" };
  };

  const footerDisplay = formatFooter();
  const IconComponent = getIconComponent();
  const formattedNumber = formatNumber(number);

  return (
    <div className="bg-white/90 backdrop-blur-sm text-gray-900 py-4 px-5 rounded-xl w-full shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold text-gray-700 line-clamp-1">{title}</h1>
          {period && <p className="text-xs text-gray-500 mt-1 capitalize">{period}</p>}
        </div>
        <div className={`${getColorScheme()} text-white p-3 rounded-lg ml-2 flex-shrink-0`}>
          {IconComponent}
        </div>
      </div>

      <div className="mt-4">
        <h1 className="text-2xl font-bold text-gray-900 break-words">
          {loading ? (
            <div className="animate-pulse bg-gray-200 rounded h-8 w-24"></div>
          ) : (
            formattedNumber
          )}
        </h1>
        <div className="text-sm mt-2 flex items-center gap-1 flex-wrap">
          {loading ? (
            <div className="animate-pulse bg-gray-200 rounded h-4 w-12"></div>
          ) : (
            <>
              <span className={`font-medium ${footerDisplay.color}`}>
                {footerDisplay.text}
              </span>
              <span className="text-gray-500 text-xs">{footerText}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const CACHE_KEYS = {
  ORDERS: 'pos_home_orders',
  STATS: 'pos_home_stats',
  TIMESTAMP: 'pos_home_timestamp',
  FILTER_RANGE: 'pos_home_filter_range',
  CUSTOM_DATE: 'pos_home_custom_date'
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const Home = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [adminStats, setAdminStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const isMounted = useRef(true);
  const datePickerRef = useRef(null);

  // Metrics state
  const [metrics, setMetrics] = useState({
    totalOrders: 0,
    totalEarnings: 0,
    filteredSales: 0,
    filteredOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    inProgressOrders: 0,
    cancelledOrders: 0,
    averageOrderValue: 0,
    uniqueCustomers: 0,
    popularItems: [],
  });

  const [filterRange, setFilterRange] = useState(() => {
    try {
      return localStorage.getItem(CACHE_KEYS.FILTER_RANGE) || "day";
    } catch {
      return "day";
    }
  });

  const [customDate, setCustomDate] = useState(() => {
    try {
      const saved = localStorage.getItem(CACHE_KEYS.CUSTOM_DATE);
      return saved ? new Date(saved) : new Date();
    } catch {
      return new Date();
    }
  });

  const user = useSelector((state) => state.user);
  const isAdmin = useMemo(() => user?.role?.toLowerCase() === "admin", [user?.role]);

  // Load from cache on mount
  useEffect(() => {
    isMounted.current = true;
    
    const loadCachedData = () => {
      try {
        const cachedOrders = localStorage.getItem(CACHE_KEYS.ORDERS);
        const cachedStats = localStorage.getItem(CACHE_KEYS.STATS);
        const timestamp = localStorage.getItem(CACHE_KEYS.TIMESTAMP);
        
        if (cachedOrders) {
          const parsedOrders = JSON.parse(cachedOrders);
          setOrders(parsedOrders);
          
          const filtered = filterOrdersByRange(parsedOrders, filterRange, customDate);
          setFilteredOrders(filtered);
          
          calculateMetrics(parsedOrders, filtered);
        }
        
        if (cachedStats && isAdmin) {
          setAdminStats(JSON.parse(cachedStats));
        }
        
        return !!cachedOrders;
      } catch (e) {
        console.error("Cache load error:", e);
        return false;
      }
    };

    const hasCache = loadCachedData();
    setLoading(false);
    
    // Fetch fresh data
    fetchData(true);
    
    // Click outside to close date picker
    const handleClickOutside = (event) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target)) {
        setShowDatePicker(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      isMounted.current = false;
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Save filter preference
  useEffect(() => {
    localStorage.setItem(CACHE_KEYS.FILTER_RANGE, filterRange);
  }, [filterRange]);

  // Save custom date
  useEffect(() => {
    localStorage.setItem(CACHE_KEYS.CUSTOM_DATE, customDate.toISOString());
  }, [customDate]);

  // Update filtered orders when filter changes
  useEffect(() => {
    if (orders.length > 0) {
      const filtered = filterOrdersByRange(orders, filterRange, customDate);
      setFilteredOrders(filtered);
      calculateMetrics(orders, filtered);
    }
  }, [filterRange, orders, customDate]);

  const saveToCache = useCallback((ordersData, statsData) => {
    try {
      localStorage.setItem(CACHE_KEYS.ORDERS, JSON.stringify(ordersData));
      if (statsData) {
        localStorage.setItem(CACHE_KEYS.STATS, JSON.stringify(statsData));
      }
      localStorage.setItem(CACHE_KEYS.TIMESTAMP, Date.now().toString());
    } catch (e) {
      console.error("Cache save error:", e);
    }
  }, []);

  const calculateMetrics = useCallback((allOrders, filteredOrdersList) => {
    if (!Array.isArray(allOrders)) return;

    // Use filtered orders for period-specific metrics
    const ordersForMetrics = filteredOrdersList || allOrders;

    // Total Orders (overall - from all orders)
    const totalOrders = allOrders.length;

    // Filtered Orders (based on selected period)
    const filteredOrdersCount = ordersForMetrics.length;

    // Filtered Sales (based on selected period)
    const filteredSales = ordersForMetrics.reduce((sum, order) => {
      const amount = order?.bills?.totalWithTax || order?.totalAmount || order?.total || 0;
      return sum + (Number(amount) || 0);
    }, 0);

    // Total Earnings (overall)
    const totalEarnings = allOrders.reduce((sum, order) => {
      const amount = order?.bills?.totalWithTax || order?.totalAmount || order?.total || 0;
      return sum + (Number(amount) || 0);
    }, 0);

    // Order Status Counts (based on filtered orders)
    const pendingOrders = ordersForMetrics.filter(o => 
      o?.orderStatus?.toLowerCase() === 'pending'
    ).length;

    const inProgressOrders = ordersForMetrics.filter(o => 
      o?.orderStatus?.toLowerCase() === 'in progress' || 
      o?.orderStatus?.toLowerCase() === 'processing'
    ).length;

    const completedOrders = ordersForMetrics.filter(o => 
      o?.orderStatus?.toLowerCase() === 'completed' || 
      o?.orderStatus?.toLowerCase() === 'delivered'
    ).length;

    const cancelledOrders = ordersForMetrics.filter(o => 
      o?.orderStatus?.toLowerCase() === 'cancelled' || 
      o?.orderStatus?.toLowerCase() === 'canceled'
    ).length;

    // Average Order Value (based on filtered orders)
    const averageOrderValue = filteredOrdersCount > 0 ? filteredSales / filteredOrdersCount : 0;

    // Unique Customers (based on filtered orders)
    const uniqueCustomers = new Set(
      ordersForMetrics
        .map(o => o.customerDetails?.name || o.customerName || 'Guest')
        .filter(name => name && name !== 'Guest')
    ).size;

    // Popular Items (across ALL orders - keep this overall for consistency)
    const itemCounts = {};
    allOrders.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          const itemName = item.name || item.productName || 'Unknown';
          const quantity = Number(item.quantity) || 1;
          itemCounts[itemName] = (itemCounts[itemName] || 0) + quantity;
        });
      }
    });

    const popularItems = Object.entries(itemCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    setMetrics({
      totalOrders,
      totalEarnings,
      filteredSales,
      filteredOrders: filteredOrdersCount,
      pendingOrders,
      inProgressOrders,
      completedOrders,
      cancelledOrders,
      averageOrderValue,
      uniqueCustomers,
      popularItems,
    });
  }, []);

  const filterOrdersByRange = useCallback((data, range, customSelectedDate) => {
    if (!Array.isArray(data)) return data;
    if (range === 'all') return data;

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return data.filter(order => {
      const orderDate = new Date(order.createdAt || order.orderDate || order.date);
      if (isNaN(orderDate.getTime())) return false;

      switch (range) {
        case 'day': {
          // Today
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          return orderDate >= today && orderDate < tomorrow;
        }
        
        case 'yesterday': {
          // Yesterday
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          yesterday.setHours(0, 0, 0, 0);
          const endOfYesterday = new Date(yesterday);
          endOfYesterday.setHours(23, 59, 59, 999);
          return orderDate >= yesterday && orderDate <= endOfYesterday;
        }
        
        case 'week': {
          // Last 7 days
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          weekAgo.setHours(0, 0, 0, 0);
          return orderDate >= weekAgo;
        }
        
        case 'month': {
          // Last 30 days
          const monthAgo = new Date();
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          monthAgo.setHours(0, 0, 0, 0);
          return orderDate >= monthAgo;
        }
        
        case 'year': {
          // Last 365 days
          const yearAgo = new Date();
          yearAgo.setFullYear(yearAgo.getFullYear() - 1);
          yearAgo.setHours(0, 0, 0, 0);
          return orderDate >= yearAgo;
        }

        case 'custom': {
          // Custom date
          if (!customSelectedDate) return false;
          const selectedDate = new Date(customSelectedDate);
          selectedDate.setHours(0, 0, 0, 0);
          const nextDay = new Date(selectedDate);
          nextDay.setDate(nextDay.getDate() + 1);
          return orderDate >= selectedDate && orderDate < nextDay;
        }
        
        default:
          return true;
      }
    });
  }, []);

  const fetchData = async (isBackground = false) => {
    if (isBackground) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      setError(null);

      // Fetch orders with limit 5000 to get all data
      let ordersData = [];
      try {
        const ordersRes = await getOrders({ limit: 5000 });
        
        if (ordersRes?.data?.data) {
          ordersData = ordersRes.data.data;
        } else if (Array.isArray(ordersRes?.data)) {
          ordersData = ordersRes.data;
        } else if (Array.isArray(ordersRes)) {
          ordersData = ordersRes;
        }
        
        console.log(`✅ Fetched ${ordersData.length} orders`);
      } catch (orderError) {
        console.error("❌ Failed to fetch orders:", orderError);
        if (!isBackground) {
          setError("Failed to load orders. Please try again.");
        }
      }

      if (!isMounted.current) return;

      // Sort orders by date (newest first) BEFORE setting state
      const sortedOrders = [...ordersData].sort((a, b) => {
        const dateA = new Date(a.createdAt || a.orderDate || a.date || 0);
        const dateB = new Date(b.createdAt || b.orderDate || b.date || 0);
        return dateB - dateA; // Descending (newest first)
      });

      setOrders(sortedOrders);
      
      // Apply current filter
      const filtered = filterOrdersByRange(sortedOrders, filterRange, customDate);
      setFilteredOrders(filtered);
      
      // Calculate metrics with both all orders and filtered orders
      calculateMetrics(sortedOrders, filtered);

      // Fetch admin stats if admin
      if (isAdmin) {
        try {
          const statsRes = await getAdminStats();
          setAdminStats(statsRes?.data || {});
        } catch (statsError) {
          console.warn("Admin stats not available:", statsError);
        }
      }

      // Update cache
      saveToCache(sortedOrders, adminStats);
      setLastUpdated(new Date());

    } catch (err) {
      console.error("❌ Fetch error:", err);
      if (!isBackground) {
        setError("Failed to load data. Please refresh.");
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  const handleStatusChange = async (order, newStatus) => {
    // Validate order ID
    if (!order?._id) {
      console.error("❌ Order ID is missing:", order);
      alert("Cannot update order: Order ID is missing");
      return;
    }

    // Prevent double updates
    if (updatingOrderId === order._id) {
      console.log("Already updating this order");
      return;
    }

    try {
      setUpdatingOrderId(order._id);
      console.log(`🔄 Updating order ${order._id} to ${newStatus}`);

      // Make sure we're sending the correct data structure
      const updateData = {
        orderId: order._id,
        orderStatus: newStatus
      };

      console.log("Sending update:", updateData);
      
      const response = await updateOrderStatus(updateData);
      console.log("✅ Update response:", response);

      // Update local state
      const updatedOrders = orders.map(o =>
        o?._id === order._id ? { ...o, orderStatus: newStatus } : o
      );

      setOrders(updatedOrders);
      
      // Re-filter orders based on current filter
      const filtered = filterOrdersByRange(updatedOrders, filterRange, customDate);
      setFilteredOrders(filtered);
      
      calculateMetrics(updatedOrders, filtered);
      
      saveToCache(updatedOrders, adminStats);
      
      // Show success message
      alert(`Order status updated to ${newStatus} successfully!`);
      
    } catch (err) {
      console.error("❌ Status update failed:", err);
      
      // More specific error message
      let errorMessage = "Failed to update order status";
      if (err.response) {
        if (err.response.status === 404) {
          errorMessage = "Order not found. It may have been deleted.";
        } else if (err.response.status === 400) {
          errorMessage = "Invalid order data. Please check and try again.";
        } else if (err.response.data?.message) {
          errorMessage = err.response.data.message;
        }
      } else if (err.request) {
        errorMessage = "Network error. Please check your connection.";
      }
      
      alert(errorMessage);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleRefresh = () => {
    fetchData(false);
  };

  const handleDateChange = (date) => {
    setCustomDate(date);
    setFilterRange('custom');
    setShowDatePicker(false);
  };

  // Get period label for display
  const getPeriodLabel = (range) => {
    switch(range) {
      case 'day': return 'Today';
      case 'yesterday': return 'Yesterday';
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      case 'year': return 'This Year';
      case 'custom': return customDate.toLocaleDateString('en-PH', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
      case 'all': return 'All Time';
      default: return 'Selected Period';
    }
  };

  // Get period description for display
  const getPeriodDescription = (range) => {
    switch(range) {
      case 'day': return 'today';
      case 'yesterday': return 'yesterday';
      case 'week': return 'this week';
      case 'month': return 'this month';
      case 'year': return 'this year';
      case 'custom': return `on ${customDate.toLocaleDateString('en-PH', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      })}`;
      case 'all': return 'all time';
      default: return 'selected period';
    }
  };

  // Get most recent orders for display based on filtered orders
  const recentOrders = useMemo(() => {
    // Filtered orders are already sorted by date (newest first)
    // Just take the first 10
    return filteredOrders.slice(0, 10);
  }, [filteredOrders]);

  if (loading && !orders.length) {
    return (
      <section className="bg-gradient-to-br from-blue-50 via-white to-cyan-50 min-h-screen flex flex-col">
        <div className="flex-1 overflow-y-auto pb-20">
          <div className="p-4">
            <Greetings />
            <div className="flex justify-center items-center h-64">
              <div className="text-center">
                <FaSpinner className="animate-spin text-4xl text-blue-500 mx-auto mb-4" />
                <p className="text-gray-500">Loading dashboard...</p>
              </div>
            </div>
          </div>
        </div>
        <BottomNav />
      </section>
    );
  }

  if (error && !orders.length) {
    return (
      <section className="bg-gradient-to-br from-blue-50 via-white to-cyan-50 min-h-screen flex flex-col">
        <div className="flex-1 overflow-y-auto pb-20">
          <div className="p-4">
            <Greetings />
            <div className="flex justify-center items-center h-64">
              <div className="text-center">
                <FaExclamationTriangle className="text-4xl text-red-500 mx-auto mb-4" />
                <div className="text-red-500 text-lg mb-4">{error}</div>
                <button
                  onClick={handleRefresh}
                  className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 mx-auto"
                >
                  <FaSync /> Retry
                </button>
              </div>
            </div>
          </div>
        </div>
        <BottomNav />
      </section>
    );
  }

  const periodLabel = getPeriodLabel(filterRange);
  const periodDescription = getPeriodDescription(filterRange);

  return (
    <section className="bg-gradient-to-br from-blue-50 via-white to-cyan-50 min-h-screen flex flex-col relative pb-20 md:pb-6">
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex items-center justify-between mb-2">
          <Greetings />
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="text-xs text-gray-500">
                Updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 bg-white rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-50"
            >
              <FaSync className={`text-blue-500 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filter Dropdown with Date Picker */}
        <div className="mt-2 mb-4 relative" ref={datePickerRef}>
          <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-gray-200 w-full max-w-xs">
            <FaCalendarAlt className="text-gray-600 text-xs" />
            <select
              value={filterRange}
              onChange={(e) => {
                setFilterRange(e.target.value);
                if (e.target.value === 'custom') {
                  setShowDatePicker(true);
                }
              }}
              className="bg-transparent outline-none text-black text-xs sm:text-sm w-full"
            >
              <option value="day">📅 Today</option>
              <option value="yesterday">⏪ Yesterday</option>
              <option value="week">📆 This Week</option>
              <option value="month">📊 This Month</option>
              <option value="year">📈 This Year</option>
              <option value="custom">📅 Custom Date</option>
              <option value="all">📊 All Time</option>
            </select>
            <FaChevronDown className="text-gray-400 text-xs" />
          </div>
          
          {/* Date Picker Dropdown */}
          {showDatePicker && (
            <div className="absolute top-full left-0 mt-1 z-50 bg-white rounded-lg shadow-lg border border-gray-200">
              <DatePicker
                selected={customDate}
                onChange={handleDateChange}
                inline
                maxDate={new Date()}
                calendarClassName="!border-0"
              />
            </div>
          )}
        </div>

        {/* Main Metrics Grid - UPDATES BASED ON SELECTED FILTER */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-2">
          <MiniCard
            title={`Sales (${periodLabel})`}
            icon="sales"
            number={metrics.filteredSales}
            currency
            footerNum={metrics.totalEarnings ? (metrics.filteredSales / metrics.totalEarnings) * 100 : 0}
            footerText="of total earnings"
            period={filterRange === 'custom' ? periodLabel : filterRange}
            variant="primary"
          />
          <MiniCard
            title={`Orders (${periodLabel})`}
            icon="orders"
            number={metrics.filteredOrders}
            footerNum={metrics.totalOrders ? (metrics.filteredOrders / metrics.totalOrders) * 100 : 0}
            footerText="of total orders"
            period={filterRange === 'custom' ? periodLabel : filterRange}
            variant="info"
          />
          <MiniCard
            title="Total Orders (All Time)"
            icon="orders"
            number={metrics.totalOrders}
            footerNum={metrics.completedOrders ? (metrics.completedOrders / metrics.totalOrders) * 100 : 0}
            footerText="completed overall"
            variant="success"
          />
          <MiniCard
            title={`Avg Order Value (${periodLabel})`}
            icon="sales"
            number={metrics.averageOrderValue}
            currency
            footerNum={adminStats?.avgOrderGrowth || 3.8}
            footerText="per transaction"
            period={filterRange === 'custom' ? periodLabel : filterRange}
            variant="warning"
          />
        </div>

        {/* Popular Items Section */}
        {metrics.popularItems.length > 0 && (
          <div className="mt-6 bg-white/90 backdrop-blur-sm rounded-xl p-4 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <FaFire className="text-orange-500" /> Popular Items (All Time)
            </h3>
            <div className="space-y-3">
              {metrics.popularItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between border-b border-gray-100 pb-2 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 font-medium">{index + 1}.</span>
                    <span className="text-gray-700">{item.name}</span>
                  </div>
                  <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold">
                    {item.count} sold
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

       

        {/* Recent Orders - Shows filtered orders based on selected date */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            📋 Recent Orders {filterRange !== 'all' ? `(${periodLabel})` : '(All Time)'}
          </h3>
          {filteredOrders.length > 0 ? (
            <>
              <RecentOrders
                orders={recentOrders}
                onStatusChange={handleStatusChange}
                updatingOrderId={updatingOrderId}
              />
              {filteredOrders.length > 10 && (
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Showing 10 most recent orders out of {filteredOrders.length} {periodDescription !== 'all time' ? `for ${periodDescription}` : ''}
                </p>
              )}
            </>
          ) : (
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-8 border border-gray-200 text-center">
              <p className="text-gray-500">
                No orders found {periodDescription !== 'all time' ? `for ${periodDescription}` : ''}
              </p>
            </div>
          )}
        </div>

        {/* Background refresh indicator */}
        {refreshing && (
          <div className="fixed top-4 right-4 bg-blue-500 text-white px-3 py-1 rounded-full text-xs shadow-lg flex items-center gap-2 z-50">
            <FaSpinner className="animate-spin" />
            <span>Refreshing...</span>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 md:relative">
        <BottomNav />
      </div>
    </section>
  );
};

export default Home;