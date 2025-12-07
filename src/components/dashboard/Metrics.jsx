import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { getOrders, getAdminOrders } from "../../https/index";
import {
  FaChartLine,
  FaShoppingCart,
  FaMoneyBillWave,
  FaArrowUp,
  FaArrowDown,
  FaClock,
  FaExclamationTriangle,
  FaUsers,
  FaStar,
  FaBox,
  FaCheckCircle,
  FaTimesCircle,
} from "react-icons/fa";
import PropTypes from "prop-types";

// ============= CONSTANTS AND CONFIGURATION =============
const PERIOD_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "this_year", label: "This Year" },
  { value: "all_time", label: "All Time" },
];

const COLORS = {
  primary: {
    blue: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    green: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    purple: "linear-gradient(135deg, #a8c0ff 0%, #3f2b96 100%)",
    orange: "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)",
  },
  status: {
    completed: "bg-green-100 text-green-800",
    ready: "bg-blue-100 text-blue-800",
    "in progress": "bg-yellow-100 text-yellow-800",
    default: "bg-gray-100 text-gray-800",
  },
};

const STATUS_ICONS = {
  completed: FaCheckCircle,
  ready: FaClock,
  "in progress": FaClock,
  default: FaBox,
};

const STATUS_COLORS = {
  completed: "text-green-500",
  ready: "text-blue-500",
  "in progress": "text-yellow-500",
  default: "text-gray-500",
};

// ============= UTILITY FUNCTIONS =============
const safeNumber = (value, defaultValue = 0) => {
  if (typeof value === "number" && !isNaN(value)) return value;
  const num = parseFloat(value);
  return isNaN(num) ? defaultValue : num;
};

const formatCurrency = (amount) => {
  return `₱${safeNumber(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatPercentage = (value) => {
  return `${safeNumber(value).toFixed(1)}%`;
};

// ============= DATE UTILITIES =============
const getDateRange = (period) => {
  const now = new Date();

  switch (period) {
    case "today": {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }

    case "yesterday": {
      const start = new Date(now);
      start.setDate(now.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }

    case "this_month": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }

    case "last_month": {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }

    case "this_year": {
      const start = new Date(now.getFullYear(), 0, 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now.getFullYear(), 11, 31);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }

    case "all_time":
      return { start: null, end: null };

    default:
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      return { start, end };
  }
};

const getPreviousPeriodData = (orders, currentPeriod) => {
  const safeOrders = Array.isArray(orders) ? orders : [];
  if (safeOrders.length === 0) {
    return { orders: [], metrics: null };
  }

  const now = new Date();
  let prevStart = null;
  let prevEnd = null;

  switch (currentPeriod) {
    case "today": {
      prevStart = new Date(now);
      prevStart.setDate(now.getDate() - 1);
      prevStart.setHours(0, 0, 0, 0);
      prevEnd = new Date(prevStart);
      prevEnd.setHours(23, 59, 59, 999);
      break;
    }

    case "yesterday": {
      prevStart = new Date(now);
      prevStart.setDate(now.getDate() - 2);
      prevStart.setHours(0, 0, 0, 0);
      prevEnd = new Date(now);
      prevEnd.setDate(now.getDate() - 2);
      prevEnd.setHours(23, 59, 59, 999);
      break;
    }

    case "this_month": {
      prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      prevStart.setHours(0, 0, 0, 0);
      prevEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      prevEnd.setHours(23, 59, 59, 999);
      break;
    }

    case "last_month": {
      prevStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      prevStart.setHours(0, 0, 0, 0);
      prevEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0);
      prevEnd.setHours(23, 59, 59, 999);
      break;
    }

    case "this_year": {
      prevStart = new Date(now.getFullYear() - 1, 0, 1);
      prevStart.setHours(0, 0, 0, 0);
      prevEnd = new Date(now.getFullYear() - 1, 11, 31);
      prevEnd.setHours(23, 59, 59, 999);
      break;
    }

    case "all_time":
      // For all_time, compare with same period last year
      prevStart = new Date(now.getFullYear() - 1, 0, 1);
      prevStart.setHours(0, 0, 0, 0);
      prevEnd = new Date(now.getFullYear() - 1, 11, 31);
      prevEnd.setHours(23, 59, 59, 999);
      break;

    default:
      return { orders: [], metrics: null };
  }

  const previousOrders = safeOrders.filter((order) => {
    try {
      const orderDate = new Date(
        order.orderDate || order.createdAt || Date.now()
      );
      return orderDate >= prevStart && orderDate <= prevEnd;
    } catch {
      return false;
    }
  });

  const previousMetrics = calculateMetrics(previousOrders, currentPeriod);

  return {
    orders: previousOrders,
    metrics: previousMetrics,
  };
};

const formatDate = (dateString, options = {}) => {
  if (!dateString) return "No Date";

  try {
    const date = new Date(dateString);
    const defaultOptions = {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };

    return date.toLocaleDateString("en-US", { ...defaultOptions, ...options });
  } catch {
    return "Invalid Date";
  }
};

// ============= ORDER FILTERING =============
const filterOrdersByPeriod = (orders, period) => {
  const safeOrders = Array.isArray(orders) ? orders : [];
  if (safeOrders.length === 0) return [];

  // For all_time, return all orders
  if (period === "all_time") return safeOrders;

  const { start, end } = getDateRange(period);

  return safeOrders.filter((order) => {
    try {
      if (!order) return false;
      const orderDate = new Date(
        order.orderDate || order.createdAt || Date.now()
      );
      return orderDate >= start && orderDate <= end;
    } catch {
      return false;
    }
  });
};

// ============= CALCULATION UTILITIES =============
const calculateTrend = (current, previous, isPositive = true) => {
  if (previous === undefined || previous === null || previous === 0) {
    return { percentage: null, isIncrease: true };
  }

  const percentage = ((current - previous) / previous) * 100;
  const isIncrease = isPositive ? percentage >= 0 : percentage <= 0;

  return {
    percentage: Math.abs(percentage).toFixed(1),
    isIncrease,
  };
};

// Memoized metrics calculation
const calculateMetrics = (orders, period) => {
  const safeOrders = Array.isArray(orders) ? orders : [];

  const defaultMetrics = {
    totalOrders: 0,
    totalSales: 0,
    averageOrderValue: 0,
    uniqueCustomers: 0,
    topSellingItem: "N/A",
    completionRate: 0,
    inProgressOrders: 0,
    readyOrders: 0,
    completedOrders: 0,
  };

  if (safeOrders.length === 0) {
    return defaultMetrics;
  }

  try {
    // Calculate total sales
    const totalSales = safeOrders.reduce((sum, order) => {
      if (!order) return sum;
      const orderTotal = order.bills?.totalWithTax || order.totalAmount || 0;
      return sum + safeNumber(orderTotal);
    }, 0);

    const ordersCount = safeOrders.length;
    const averageOrderValue = ordersCount > 0 ? totalSales / ordersCount : 0;

    // Calculate unique customers
    const customerSet = new Set();
    safeOrders.forEach((order) => {
      if (!order) return;
      const customerName =
        order.customerDetails?.name || order.customerName || "Guest";
      if (customerName && customerName !== "Guest") {
        customerSet.add(customerName);
      }
    });
    const uniqueCustomers = customerSet.size;

    // Find top selling item
    const itemCounts = {};
    safeOrders.forEach((order) => {
      if (order?.items && Array.isArray(order.items)) {
        order.items.forEach((item) => {
          if (!item) return;
          const itemName = item.name || item.productName || "Unknown Item";
          const quantity = safeNumber(item.quantity, 1);
          if (itemName) {
            itemCounts[itemName] = (itemCounts[itemName] || 0) + quantity;
          }
        });
      }
    });

    let topSellingItem = "N/A";
    let maxQuantity = 0;
    for (const [itemName, quantity] of Object.entries(itemCounts)) {
      if (quantity > maxQuantity) {
        topSellingItem = itemName;
        maxQuantity = quantity;
      }
    }

    // Calculate order status metrics
    const completedOrders = safeOrders.filter((order) => {
      if (!order) return false;
      const status = (order.orderStatus || "").toLowerCase();
      return status === "completed";
    }).length;

    const inProgressOrders = safeOrders.filter((order) => {
      if (!order) return false;
      const status = (order.orderStatus || "").toLowerCase();
      return status === "in progress";
    }).length;

    const readyOrders = safeOrders.filter((order) => {
      if (!order) return false;
      const status = (order.orderStatus || "").toLowerCase();
      return status === "ready";
    }).length;

    const completionRate =
      ordersCount > 0 ? (completedOrders / ordersCount) * 100 : 0;

    return {
      totalOrders: ordersCount,
      totalSales,
      averageOrderValue,
      uniqueCustomers,
      topSellingItem,
      completionRate,
      inProgressOrders,
      readyOrders,
      completedOrders,
    };
  } catch (error) {
    console.error("Error calculating metrics:", error);
    return defaultMetrics;
  }
};

// ============= COMPONENTS =============
const MetricSkeleton = () => (
  <div className="animate-pulse">
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="rounded-2xl p-6 shadow-lg border border-gray-100 bg-white"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-6 w-6 bg-gray-200 rounded-full"></div>
          </div>
          <div className="h-8 bg-gray-200 rounded w-2/3 mb-2"></div>
          <div className="h-3 bg-gray-100 rounded w-1/2"></div>
        </div>
      ))}
    </div>
  </div>
);

const ErrorState = ({ message, onRetry }) => (
  <div className="text-center py-12 px-6 rounded-2xl bg-red-50 border border-red-100">
    <FaExclamationTriangle className="mx-auto text-red-500 text-3xl mb-4" />
    <h3 className="text-lg font-semibold text-red-800 mb-2">
      Unable to Load Metrics
    </h3>
    <p className="text-red-600 mb-4">{message}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200"
      >
        Try Again
      </button>
    )}
  </div>
);

const EmptyState = ({ title, message }) => (
  <div className="text-center py-12 px-6 rounded-2xl bg-gray-50 border border-gray-200">
    <FaChartLine className="mx-auto text-gray-400 text-3xl mb-4" />
    <h3 className="text-lg font-semibold text-gray-600 mb-2">{title}</h3>
    <p className="text-gray-500">{message}</p>
  </div>
);

// Simple Order Item Component
const OrderItem = ({ order, index }) => {
  if (!order) return null;

  const orderNumber = order._id
    ? `#${order._id.slice(-6)}`
    : `Order #${index + 1}`;
  const customerName =
    order.customerDetails?.name || order.customerName || "Guest";
  const orderDate = order.orderDate || order.createdAt;
  const totalAmount = order.bills?.totalWithTax || order.totalAmount || 0;
  const orderStatus = order.orderStatus?.toLowerCase() || "unknown";

  const IconComponent = STATUS_ICONS[orderStatus] || STATUS_ICONS.default;
  const statusColorClass = COLORS.status[orderStatus] || COLORS.status.default;
  const iconColorClass = STATUS_COLORS[orderStatus] || STATUS_COLORS.default;

  return (
    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors duration-200">
      <div className="flex items-center space-x-4">
        <div className="flex-shrink-0">
          <IconComponent className={iconColorClass} />
        </div>
        <div>
          <p className="font-semibold text-gray-900">{orderNumber}</p>
          <p className="text-sm text-gray-500">{customerName}</p>
          <p className="text-xs text-gray-400">{formatDate(orderDate)}</p>
        </div>
      </div>

      <div className="text-right">
        <p className="font-bold text-gray-900">{formatCurrency(totalAmount)}</p>
        <span className={`text-xs px-2 py-1 rounded-full ${statusColorClass}`}>
          {orderStatus}
        </span>
      </div>
    </div>
  );
};

// Simple Virtual List
const SimpleVirtualList = ({
  items,
  itemHeight = 80,
  visibleItems = 5,
  renderItem,
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const containerHeight = visibleItems * itemHeight;

  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  const totalHeight = items.length * itemHeight;
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(items.length - 1, startIndex + visibleItems);

  const visibleItemsData = items.slice(startIndex, endIndex + 1);

  return (
    <div
      style={{ height: containerHeight, overflowY: "auto" }}
      onScroll={handleScroll}
      className="relative"
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        {visibleItemsData.map((item, index) => {
          const actualIndex = startIndex + index;
          return (
            <div
              key={item._id || actualIndex}
              style={{
                position: "absolute",
                top: actualIndex * itemHeight,
                left: 0,
                right: 0,
                height: itemHeight,
              }}
            >
              {renderItem(item, actualIndex)}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Recent Orders Component
const RecentOrders = ({ orders: rawOrders, maxItems = 5 }) => {
  const safeOrders = useMemo(() => {
    if (!rawOrders) return [];
    return Array.isArray(rawOrders) ? rawOrders.slice(0, maxItems) : [];
  }, [rawOrders, maxItems]);

  if (safeOrders.length === 0) {
    return (
      <div className="rounded-2xl p-6 bg-white border border-gray-100 shadow-lg">
        <h3 className="font-bold text-xl text-gray-900 mb-4">Recent Orders</h3>
        <EmptyState
          title="No Recent Orders"
          message="No orders found for the selected period."
        />
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-6 bg-white border border-gray-100 shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-bold text-xl text-gray-900">Recent Orders</h3>
        <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
          {safeOrders.length} orders
        </span>
      </div>

      {safeOrders.length > 10 ? (
        <SimpleVirtualList
          items={safeOrders}
          itemHeight={80}
          visibleItems={5}
          renderItem={(order, index) => (
            <OrderItem order={order} index={index} />
          )}
        />
      ) : (
        <div className="space-y-4">
          {safeOrders.map((order, index) => (
            <OrderItem key={order._id || index} order={order} index={index} />
          ))}
        </div>
      )}
    </div>
  );
};

RecentOrders.propTypes = {
  orders: PropTypes.array,
  maxItems: PropTypes.number,
};

// ============= MAIN METRICS COMPONENT =============
const Metrics = ({
  rawMetricsData = null,
  title = "Business Performance",
  subtitle = "Comprehensive overview of your business metrics",
  itemTitle = "Performance Insights",
  itemSubtitle = "Detailed breakdown of key performance indicators",
  onPeriodChange,
  className = "",
}) => {
  const [period, setPeriod] = useState("today");
  const user = useSelector((state) => state.user);

  // Data fetching
  const {
    data: resData,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["orders", user?.role],
    queryFn: async () => {
      if (user?.role?.toLowerCase() === "admin") {
        return await getAdminOrders();
      } else {
        return await getOrders();
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Extract and memoize orders data
  const ordersData = useMemo(() => {
    try {
      if (rawMetricsData) {
        return Array.isArray(rawMetricsData) ? rawMetricsData : [];
      }

      let orders = [];

      if (resData?.data?.data && Array.isArray(resData.data.data)) {
        orders = resData.data.data;
      } else if (resData?.data && Array.isArray(resData.data)) {
        orders = resData.data;
      } else if (Array.isArray(resData)) {
        orders = resData;
      } else if (resData?.orders && Array.isArray(resData.orders)) {
        orders = resData.orders;
      }

      return Array.isArray(orders) ? orders : [];
    } catch (error) {
      console.error("Data extraction error:", error);
      return [];
    }
  }, [resData, rawMetricsData]);

  // Get display label for period
  const getPeriodDisplayLabel = (periodValue) => {
    const option = PERIOD_OPTIONS.find((opt) => opt.value === periodValue);
    return option ? option.label : "Today";
  };

  // Memoized metrics calculation
  const { metricsData, itemsData, filteredOrders } = useMemo(() => {
    try {
      // Get current period orders
      const currentPeriodOrders = filterOrdersByPeriod(ordersData, period);
      const currentMetrics = calculateMetrics(currentPeriodOrders, period);
      const previousData = getPreviousPeriodData(ordersData, period);

      // Calculate trends
      const orderTrend = calculateTrend(
        currentMetrics.totalOrders || 0,
        previousData.metrics?.totalOrders || 0
      );

      const revenueTrend = calculateTrend(
        currentMetrics.totalSales || 0,
        previousData.metrics?.totalSales || 0
      );

      const aovTrend = calculateTrend(
        currentMetrics.averageOrderValue || 0,
        previousData.metrics?.averageOrderValue || 0
      );

      const completionTrend = calculateTrend(
        currentMetrics.completionRate || 0,
        previousData.metrics?.completionRate || 0
      );

      const customerTrend = calculateTrend(
        currentMetrics.uniqueCustomers || 0,
        previousData.metrics?.uniqueCustomers || 0
      );

      const inProgressTrend = calculateTrend(
        currentMetrics.inProgressOrders || 0,
        previousData.metrics?.inProgressOrders || 0
      );

      const readyTrend = calculateTrend(
        currentMetrics.readyOrders || 0,
        previousData.metrics?.readyOrders || 0
      );

      // Format period for display
      const periodDisplay = getPeriodDisplayLabel(period).toLowerCase();

      // Main metrics cards
      const premiumMetrics = [
        {
          title: "Total Orders",
          value: (currentMetrics.totalOrders || 0).toLocaleString(),
          subtitle: `Completed transactions (${periodDisplay})`,
          percentage: orderTrend.percentage,
          isIncrease: orderTrend.isIncrease,
          color: COLORS.primary.blue,
          icon: FaShoppingCart,
        },
        {
          title: "Total Revenue",
          value: formatCurrency(currentMetrics.totalSales || 0),
          subtitle: `Gross sales (${periodDisplay})`,
          percentage: revenueTrend.percentage,
          isIncrease: revenueTrend.isIncrease,
          color: COLORS.primary.green,
          icon: FaMoneyBillWave,
        },
        {
          title: "Avg Order Value",
          value: formatCurrency(currentMetrics.averageOrderValue || 0),
          subtitle: "Average per transaction",
          percentage: aovTrend.percentage,
          isIncrease: aovTrend.isIncrease,
          color: COLORS.primary.purple,
          icon: FaChartLine,
        },
      ];

      // Additional insights
      const premiumItems = [
        {
          title: "Completion Rate",
          value: formatPercentage(currentMetrics.completionRate || 0),
          subtitle: "Successful orders",
          percentage: completionTrend.percentage,
          isIncrease: completionTrend.isIncrease,
          color: COLORS.primary.orange,
          icon: FaStar,
        },
        {
          title: "Unique Customers",
          value: (currentMetrics.uniqueCustomers || 0).toLocaleString(),
          subtitle: "Total customers",
          percentage: customerTrend.percentage,
          isIncrease: customerTrend.isIncrease,
          color: COLORS.primary.green,
          icon: FaUsers,
        },
        {
          title: "In Progress",
          value: (currentMetrics.inProgressOrders || 0).toLocaleString(),
          subtitle: "Active orders",
          percentage: inProgressTrend.percentage,
          isIncrease: inProgressTrend.isIncrease,
          color: COLORS.primary.purple,
          icon: FaClock,
        },
        {
          title: "Ready Orders",
          value: (currentMetrics.readyOrders || 0).toLocaleString(),
          subtitle: "Ready for pickup",
          percentage: readyTrend.percentage,
          isIncrease: readyTrend.isIncrease,
          color: COLORS.primary.blue,
          icon: FaBox,
        },
      ];

      return {
        metricsData: premiumMetrics,
        itemsData: premiumItems,
        filteredOrders: currentPeriodOrders,
      };
    } catch (error) {
      console.error("Error processing metrics:", error);
      return {
        metricsData: [],
        itemsData: [],
        filteredOrders: [],
      };
    }
  }, [ordersData, period]);

  const handlePeriodChange = useCallback(
    (newPeriod) => {
      setPeriod(newPeriod);
      onPeriodChange?.(newPeriod);
    },
    [onPeriodChange]
  );

  // Role-based display
  const displayTitle =
    user?.role === "admin" ? "Admin Dashboard - All Sales" : "Your Performance";
  const displaySubtitle =
    user?.role === "admin"
      ? "Complete overview of all business sales and performance"
      : "Overview of your sales and orders";

  // Loading state
  if (isLoading) {
    return (
      <div className={`min-h-screen bg-gray-50 py-8 ${className}`}>
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="font-bold text-2xl text-gray-900">
                {displayTitle}
              </h2>
              <p className="text-gray-600 mt-1">{displaySubtitle}</p>
            </div>
            <div className="h-10 bg-gray-200 rounded-lg w-32 animate-pulse"></div>
          </div>
          <MetricSkeleton />
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className={`min-h-screen bg-gray-50 py-8 ${className}`}>
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="font-bold text-2xl text-gray-900">
                {displayTitle}
              </h2>
              <p className="text-gray-600 mt-1">{displaySubtitle}</p>
            </div>
          </div>
          <ErrorState
            message={error?.message || "Failed to load metrics data"}
            onRetry={refetch}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 py-8 ${className}`}>
      <div className="container mx-auto px-4 md:px-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="flex-1">
            <h2 className="font-bold text-2xl text-gray-900">{displayTitle}</h2>
            <p className="text-gray-600 mt-1">{displaySubtitle}</p>
            <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                {filteredOrders.length} orders in{" "}
                {getPeriodDisplayLabel(period).toLowerCase()}
              </span>
              <span
                className={`px-2 py-1 rounded-full text-xs ${
                  user?.role === "admin"
                    ? "bg-purple-100 text-purple-800"
                    : "bg-blue-100 text-blue-800"
                }`}
              >
                {user?.role === "admin" ? "All Sales Data" : "Your Data Only"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isFetching && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                Updating...
              </div>
            )}
            <select
              value={period}
              onChange={(e) => handlePeriodChange(e.target.value)}
              className="bg-white border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md"
            >
              {PERIOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Main Metrics */}
        <div className="mb-8">
          {metricsData.length === 0 ? (
            <EmptyState
              title="No Data Available"
              message="There are no metrics to display for the selected period."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {metricsData.map((metric, index) => {
                const IconComponent = metric.icon;
                return (
                  <div
                    key={index}
                    className="rounded-2xl p-6 shadow-lg border border-gray-100 bg-white hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                    style={{ background: metric.color }}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="font-semibold text-white text-sm uppercase tracking-wide opacity-90">
                          {metric.title}
                        </p>
                        <p className="text-white text-xs opacity-75 mt-1">
                          {metric.subtitle}
                        </p>
                      </div>
                      <div className="bg-white bg-opacity-20 p-2 rounded-lg">
                        <IconComponent className="text-white text-lg" />
                      </div>
                    </div>

                    <div className="flex items-end justify-between">
                      <p className="font-bold text-white text-3xl">
                        {metric.value}
                      </p>

                      {metric.percentage && (
                        <div className="flex items-center gap-1 bg-white bg-opacity-20 px-3 py-1 rounded-full">
                          {metric.isIncrease ? (
                            <FaArrowUp className="text-white text-xs" />
                          ) : (
                            <FaArrowDown className="text-white text-xs" />
                          )}
                          <span className="text-white text-sm font-medium">
                            {metric.percentage}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Additional Insights */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex-1">
              <h2 className="font-bold text-2xl text-gray-900">{itemTitle}</h2>
              <p className="text-gray-600 mt-1">{itemSubtitle}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {itemsData.length === 0 ? (
              <div className="col-span-full">
                <EmptyState
                  title="No Insights Available"
                  message="Additional performance insights will appear here when available."
                />
              </div>
            ) : (
              itemsData.map((item, idx) => {
                const IconComponent = item.icon;
                return (
                  <div
                    key={idx}
                    className="rounded-2xl p-6 bg-white border border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300 group"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="font-semibold text-gray-700 text-sm">
                          {item.title}
                        </p>
                        <p className="text-gray-500 text-xs mt-1">
                          {item.subtitle}
                        </p>
                      </div>
                      <div
                        className={`p-2 rounded-lg transition-colors duration-200 group-hover:bg-opacity-10 ${
                          item.isIncrease
                            ? "bg-green-100 text-green-600"
                            : "bg-red-100 text-red-600"
                        }`}
                      >
                        <IconComponent className="text-lg" />
                      </div>
                    </div>

                    <div className="flex items-end justify-between">
                      <p className="font-bold text-gray-900 text-2xl">
                        {item.value}
                      </p>

                      {item.percentage && (
                        <div
                          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            item.isIncrease
                              ? "bg-green-50 text-green-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {item.isIncrease ? (
                            <FaArrowUp className="text-xs" />
                          ) : (
                            <FaArrowDown className="text-xs" />
                          )}
                          <span>{item.percentage}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="mb-8">
          <RecentOrders orders={filteredOrders} maxItems={5} />
        </div>

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm border-t border-gray-200 pt-6">
          <p>
            Data filtered for {getPeriodDisplayLabel(period).toLowerCase()} •{" "}
            {filteredOrders.length} orders displayed •{" "}
            {user?.role === "admin" ? "All Sales Data" : "Your orders only"}
          </p>
        </div>
      </div>
    </div>
  );
};

Metrics.propTypes = {
  rawMetricsData: PropTypes.array,
  title: PropTypes.string,
  subtitle: PropTypes.string,
  itemTitle: PropTypes.string,
  itemSubtitle: PropTypes.string,
  onPeriodChange: PropTypes.func,
  className: PropTypes.string,
};

OrderItem.propTypes = {
  order: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
};

export default Metrics;
