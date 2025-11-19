import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { getOrders } from "../../https/index";
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
} from "react-icons/fa";
import PropTypes from "prop-types";

// Premium color palette
const COLORS = {
  primary: {
    blue: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    green: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    purple: "linear-gradient(135deg, #a8c0ff 0%, #3f2b96 100%)",
    orange: "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)",
  },
  background: {
    light: "#f8fafc",
    card: "#ffffff",
    hover: "#f1f5f9",
  },
  text: {
    primary: "#1e293b",
    secondary: "#64748b",
    accent: "#3b82f6",
  },
};

// Date filtering utilities
const getDateRange = (period) => {
  const now = new Date();
  const start = new Date();

  try {
    switch (period) {
      case "Day":
        start.setDate(now.getDate() - 1);
        break;
      case "Week":
        start.setDate(now.getDate() - 7);
        break;
      case "Month":
        start.setMonth(now.getMonth() - 1);
        break;
      case "Year":
        start.setFullYear(now.getFullYear() - 1);
        break;
      default:
        start.setDate(now.getDate() - 7);
    }
    return { start, end: now };
  } catch (error) {
    console.error("Error in getDateRange:", error);
    // Fallback to week range
    const fallbackStart = new Date();
    fallbackStart.setDate(now.getDate() - 7);
    return { start: fallbackStart, end: now };
  }
};

const filterOrdersByPeriod = (orders, period) => {
  try {
    if (!orders || !Array.isArray(orders) || orders.length === 0) return [];

    const { start, end } = getDateRange(period);
    return orders.filter((order) => {
      try {
        const orderDate = new Date(
          order.createdAt || order.orderDate || order.date || Date.now()
        );
        return orderDate >= start && orderDate <= end;
      } catch {
        return false;
      }
    });
  } catch (error) {
    console.error("Error in filterOrdersByPeriod:", error);
    return [];
  }
};

const getPreviousPeriodData = (orders, currentPeriod) => {
  try {
    if (!orders || !Array.isArray(orders) || orders.length === 0) {
      return { orders: [], metrics: null };
    }

    // Calculate previous period dates
    const now = new Date();
    const prevStart = new Date();
    const prevEnd = new Date();

    switch (currentPeriod) {
      case "Day":
        prevStart.setDate(now.getDate() - 2);
        prevEnd.setDate(now.getDate() - 1);
        break;
      case "Week":
        prevStart.setDate(now.getDate() - 14);
        prevEnd.setDate(now.getDate() - 7);
        break;
      case "Month":
        prevStart.setMonth(now.getMonth() - 2);
        prevEnd.setMonth(now.getMonth() - 1);
        break;
      case "Year":
        prevStart.setFullYear(now.getFullYear() - 2);
        prevEnd.setFullYear(now.getFullYear() - 1);
        break;
      default:
        prevStart.setDate(now.getDate() - 14);
        prevEnd.setDate(now.getDate() - 7);
    }

    const previousOrders = orders.filter((order) => {
      try {
        const orderDate = new Date(
          order.createdAt || order.orderDate || order.date || Date.now()
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
  } catch (error) {
    console.error("Error in getPreviousPeriodData:", error);
    return { orders: [], metrics: null };
  }
};

// Skeleton loader component
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

// Error state component
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

// Add PropTypes for ErrorState
ErrorState.propTypes = {
  message: PropTypes.string,
  onRetry: PropTypes.func,
};

// Empty state component
const EmptyState = ({ title, message }) => (
  <div className="text-center py-12 px-6 rounded-2xl bg-gray-50 border border-gray-200">
    <FaChartLine className="mx-auto text-gray-400 text-3xl mb-4" />
    <h3 className="text-lg font-semibold text-gray-600 mb-2">{title}</h3>
    <p className="text-gray-500">{message}</p>
  </div>
);

// Add PropTypes for EmptyState
EmptyState.propTypes = {
  title: PropTypes.string,
  message: PropTypes.string,
};

// Utility functions for calculations
const safeNumber = (value, defaultValue = 0) => {
  if (typeof value === "number" && !isNaN(value)) return value;
  const num = parseFloat(value);
  return isNaN(num) ? defaultValue : num;
};

const calculateMetrics = (orders, period) => {
  try {
    if (!orders || !Array.isArray(orders) || orders.length === 0) {
      return {
        totalOrders: 0,
        totalSales: 0,
        averageOrderValue: 0,
        ordersCount: 0,
        uniqueCustomers: 0,
        topSellingItem: "N/A",
        completionRate: 0,
        inProgressOrders: 0,
        pendingOrders: 0,
        completedOrders: 0,
      };
    }

    const totalSales = orders.reduce((sum, order) => {
      const orderTotal =
        order.bills?.totalWithTax || order.totalAmount || order.total || 0;
      return sum + safeNumber(orderTotal);
    }, 0);

    const ordersCount = orders.length;
    const averageOrderValue = ordersCount > 0 ? totalSales / ordersCount : 0;

    // Calculate additional metrics
    const uniqueCustomers = new Set(
      orders
        .map((order) => {
          const customerName =
            order.customerDetails?.name ||
            order.customerName ||
            "Unknown Customer";
          return customerName || "Unknown Customer";
        })
        .filter((name) => name && name !== "Unknown Customer")
    ).size;

    // Find top selling item
    const itemCounts = {};
    orders.forEach((order) => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item) => {
          const itemName = item.name || item.productName || "Unknown Item";
          const quantity = safeNumber(item.quantity, 1);
          if (itemName) {
            itemCounts[itemName] = (itemCounts[itemName] || 0) + quantity;
          }
        });
      }
    });

    const topSellingItem =
      Object.keys(itemCounts).length > 0
        ? Object.keys(itemCounts).reduce((a, b) =>
            itemCounts[a] > itemCounts[b] ? a : b
          )
        : "N/A";

    // Calculate order status metrics
    const completedOrders = orders.filter((order) => {
      const status = (order.orderStatus || "").toLowerCase();
      return status === "completed" || status === "delivered";
    }).length;

    const inProgressOrders = orders.filter((order) => {
      const status = (order.orderStatus || "").toLowerCase();
      return status === "in progress" || status === "processing";
    }).length;

    const pendingOrders = orders.filter((order) => {
      const status = (order.orderStatus || "").toLowerCase();
      return status === "pending";
    }).length;

    const completionRate =
      ordersCount > 0 ? (completedOrders / ordersCount) * 100 : 0;

    return {
      totalOrders: ordersCount,
      totalSales,
      averageOrderValue,
      ordersCount,
      uniqueCustomers,
      topSellingItem: topSellingItem || "N/A",
      completionRate,
      inProgressOrders,
      pendingOrders,
      completedOrders,
    };
  } catch (error) {
    console.error("Error in calculateMetrics:", error);
    return {
      totalOrders: 0,
      totalSales: 0,
      averageOrderValue: 0,
      ordersCount: 0,
      uniqueCustomers: 0,
      topSellingItem: "N/A",
      completionRate: 0,
      inProgressOrders: 0,
      pendingOrders: 0,
      completedOrders: 0,
    };
  }
};

const calculateTrend = (current, previous, isPositive = true) => {
  try {
    if (previous === undefined || previous === null || previous === 0) {
      return { percentage: null, isIncrease: true };
    }

    const percentage = ((current - previous) / previous) * 100;

    // For metrics where decrease is positive (like return rate), invert the logic
    const isIncrease = isPositive ? percentage >= 0 : percentage <= 0;

    return {
      percentage: Math.abs(percentage).toFixed(1),
      isIncrease,
    };
  } catch (error) {
    console.error("Error in calculateTrend:", error);
    return { percentage: null, isIncrease: true };
  }
};

const Metrics = ({
  rawMetricsData = null,
  title = "Business Performance",
  subtitle = "Comprehensive overview of your business metrics",
  itemTitle = "Performance Insights",
  itemSubtitle = "Detailed breakdown of key performance indicators",
  onPeriodChange,
  className = "",
}) => {
  const [period, setPeriod] = useState("Week");
  const [previousPeriodData, setPreviousPeriodData] = useState(null);

  // Enhanced query with error handling and retry logic
  const {
    data: resData,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["ordersForMetrics"],
    queryFn: async () => {
      try {
        const response = await getOrders();
        return response;
      } catch (err) {
        console.error("Error fetching orders:", err);
        throw err;
      }
    },
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Safely get orders data with fallbacks
  const ordersData = useMemo(() => {
    try {
      if (rawMetricsData && Array.isArray(rawMetricsData)) {
        return rawMetricsData;
      }
      if (resData?.data?.data && Array.isArray(resData.data.data)) {
        return resData.data.data;
      }
      if (resData?.data && Array.isArray(resData.data)) {
        return resData.data;
      }
      if (Array.isArray(resData)) {
        return resData;
      }
      return [];
    } catch (error) {
      console.error("Error processing orders data:", error);
      return [];
    }
  }, [resData, rawMetricsData]);

  // Process and memoize metrics data based on period
  const { metricsData, itemsData, filteredOrders } = useMemo(() => {
    try {
      const currentPeriodOrders = filterOrdersByPeriod(ordersData, period);
      const currentMetrics = calculateMetrics(currentPeriodOrders, period);

      // Get previous period data for trend calculation
      const previousData = getPreviousPeriodData(ordersData, period);
      setPreviousPeriodData(previousData.metrics);

      // Calculate trends
      const orderTrend = calculateTrend(
        currentMetrics.totalOrders,
        previousData.metrics?.totalOrders
      );

      const revenueTrend = calculateTrend(
        currentMetrics.totalSales,
        previousData.metrics?.totalSales
      );

      const aovTrend = calculateTrend(
        currentMetrics.averageOrderValue,
        previousData.metrics?.averageOrderValue
      );

      const completionTrend = calculateTrend(
        currentMetrics.completionRate,
        previousData.metrics?.completionRate
      );

      const customerTrend = calculateTrend(
        currentMetrics.uniqueCustomers,
        previousData.metrics?.uniqueCustomers
      );

      const inProgressTrend = calculateTrend(
        currentMetrics.inProgressOrders,
        previousData.metrics?.inProgressOrders
      );

      const premiumMetrics = [
        {
          title: "Total Orders",
          value: currentMetrics.totalOrders.toLocaleString(),
          subtitle: `Completed transactions (${period.toLowerCase()})`,
          percentage: orderTrend.percentage,
          isIncrease: orderTrend.isIncrease,
          color: COLORS.primary.blue,
          icon: FaShoppingCart,
          format: "number",
        },
        {
          title: "Total Revenue",
          value: `₱${currentMetrics.totalSales.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`,
          subtitle: `Gross sales (${period.toLowerCase()})`,
          percentage: revenueTrend.percentage,
          isIncrease: revenueTrend.isIncrease,
          color: COLORS.primary.green,
          icon: FaMoneyBillWave,
          format: "currency",
        },
        {
          title: "Avg Order Value",
          value: `₱${currentMetrics.averageOrderValue.toLocaleString(
            undefined,
            {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }
          )}`,
          subtitle: "Average per transaction",
          percentage: aovTrend.percentage,
          isIncrease: aovTrend.isIncrease,
          color: COLORS.primary.purple,
          icon: FaChartLine,
          format: "currency",
        },
      ];

      // Dynamic items data based on actual metrics
      const premiumItems = [
        {
          title: "Completion Rate",
          value: `${currentMetrics.completionRate.toFixed(1)}%`,
          subtitle: "Successful orders",
          percentage: completionTrend.percentage,
          isIncrease: completionTrend.isIncrease,
          color: COLORS.primary.orange,
          icon: FaStar,
        },
        {
          title: "Unique Customers",
          value: currentMetrics.uniqueCustomers.toLocaleString(),
          subtitle: "Total customers",
          percentage: customerTrend.percentage,
          isIncrease: customerTrend.isIncrease,
          color: COLORS.primary.green,
          icon: FaUsers,
        },
        {
          title: "In Progress",
          value: currentMetrics.inProgressOrders.toLocaleString(),
          subtitle: "Active orders",
          percentage: inProgressTrend.percentage,
          isIncrease: inProgressTrend.isIncrease,
          color: COLORS.primary.purple,
          icon: FaClock,
        },
        {
          title: "Top Product",
          value:
            currentMetrics.topSellingItem &&
            currentMetrics.topSellingItem.length > 20
              ? currentMetrics.topSellingItem.substring(0, 20) + "..."
              : currentMetrics.topSellingItem || "N/A",
          subtitle: "Most popular item",
          percentage: null,
          isIncrease: true,
          color: COLORS.primary.blue,
          icon: FaChartLine,
        },
      ];

      return {
        metricsData: premiumMetrics,
        itemsData: premiumItems,
        filteredOrders: currentPeriodOrders,
      };
    } catch (error) {
      console.error("Error processing metrics data:", error);
      return {
        metricsData: [],
        itemsData: [],
        filteredOrders: [],
      };
    }
  }, [ordersData, period]);

  // Handle period change
  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod);
    onPeriodChange?.(newPeriod);
  };

  // Show error notification
  useEffect(() => {
    if (isError) {
      enqueueSnackbar("Failed to load metrics data. Please try again.", {
        variant: "error",
        autoHideDuration: 4000,
      });
    }
  }, [isError]);

  // Enhanced loading state
  if (isLoading) {
    return (
      <div className={`min-h-screen bg-gray-50 py-8 ${className}`}>
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="font-bold text-2xl text-gray-900">{title}</h2>
              <p className="text-gray-600 mt-1">{subtitle}</p>
            </div>
            <div className="h-10 bg-gray-200 rounded-lg w-32 animate-pulse"></div>
          </div>
          <MetricSkeleton />
        </div>
      </div>
    );
  }

  // Enhanced error state
  if (isError) {
    return (
      <div className={`min-h-screen bg-gray-50 py-8 ${className}`}>
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="font-bold text-2xl text-gray-900">{title}</h2>
              <p className="text-gray-600 mt-1">{subtitle}</p>
            </div>
            <select
              value={period}
              onChange={(e) => handlePeriodChange(e.target.value)}
              className="bg-white border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              disabled
            >
              <option value="Day">Last 1 Day</option>
              <option value="Week">Last 1 Week</option>
              <option value="Month">Last 1 Month</option>
              <option value="Year">Last 1 Year</option>
            </select>
          </div>
          <ErrorState
            message={
              error?.message ||
              "Failed to load metrics data. Please check your connection and try again."
            }
            onRetry={refetch}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 py-8 ${className}`}>
      <div className="container mx-auto px-4 md:px-6">
        {/* Enhanced Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="flex-1">
            <h2 className="font-bold text-2xl text-gray-900">{title}</h2>
            <p className="text-gray-600 mt-1">{subtitle}</p>
            <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                {filteredOrders.length} orders in {period.toLowerCase()}
              </span>
              {previousPeriodData && (
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                  Compared to previous {period.toLowerCase()}
                </span>
              )}
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
              <option value="Day">Last 1 Day</option>
              <option value="Week">Last 1 Week</option>
              <option value="Month">Last 1 Month</option>
              <option value="Year">Last 1 Year</option>
            </select>
          </div>
        </div>

        {/* Premium Metrics Grid */}
        <div className="mb-12">
          {!metricsData || metricsData.length === 0 ? (
            <EmptyState
              title="No Data Available"
              message="There are no metrics to display for the selected period."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {metricsData.map((metric, index) => {
                const IconComponent = metric.icon || FaChartLine;
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

        {/* Enhanced Item Details Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex-1">
              <h2 className="font-bold text-2xl text-gray-900">{itemTitle}</h2>
              <p className="text-gray-600 mt-1">{itemSubtitle}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {!itemsData || itemsData.length === 0 ? (
              <div className="col-span-full">
                <EmptyState
                  title="No Insights Available"
                  message="Additional performance insights will appear here when available."
                />
              </div>
            ) : (
              itemsData.map((item, idx) => {
                const IconComponent = item.icon || FaChartLine;
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

        {/* Enhanced Footer */}
        <div className="text-center text-gray-500 text-sm border-t border-gray-200 pt-6">
          <p>
            Data filtered for {period.toLowerCase()} • Last updated:{" "}
            {new Date().toLocaleTimeString()} • {filteredOrders.length} orders
            displayed
          </p>
        </div>
      </div>
    </div>
  );
};

// Add PropTypes for Metrics component
Metrics.propTypes = {
  rawMetricsData: PropTypes.array,
  title: PropTypes.string,
  subtitle: PropTypes.string,
  itemTitle: PropTypes.string,
  itemSubtitle: PropTypes.string,
  onPeriodChange: PropTypes.func,
  className: PropTypes.string,
};

export default Metrics;
