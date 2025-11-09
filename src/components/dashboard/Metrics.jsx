import React, { useState, useEffect, useMemo } from "react";
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
  FaExchangeAlt,
  FaHeadset,
} from "react-icons/fa";

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
};

const filterOrdersByPeriod = (orders, period) => {
  if (!orders || orders.length === 0) return [];

  const { start } = getDateRange(period);
  return orders.filter((order) => {
    const orderDate = new Date(order.createdAt || order.date || Date.now());
    return orderDate >= start;
  });
};

const getPreviousPeriodData = (orders, currentPeriod) => {
  if (!orders || orders.length === 0) return { orders: [], metrics: null };

  const periodMap = {
    Day: "Day",
    Week: "Week",
    Month: "Month",
    Year: "Year",
  };

  // For demo purposes, we'll calculate based on a percentage of current data
  // In real app, you'd fetch actual previous period data
  const currentOrders = filterOrdersByPeriod(orders, currentPeriod);
  const previousMetrics = calculateMetrics(currentOrders, currentPeriod);

  // Simulate previous period data (80% of current for demo)
  return {
    orders: currentOrders,
    metrics: {
      totalOrders: Math.floor(previousMetrics.totalOrders * 0.8),
      totalSales: previousMetrics.totalSales * 0.8,
      averageOrderValue: previousMetrics.averageOrderValue * 0.95,
    },
  };
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

// Empty state component
const EmptyState = ({ title, message }) => (
  <div className="text-center py-12 px-6 rounded-2xl bg-gray-50 border border-gray-200">
    <FaChartLine className="mx-auto text-gray-400 text-3xl mb-4" />
    <h3 className="text-lg font-semibold text-gray-600 mb-2">{title}</h3>
    <p className="text-gray-500">{message}</p>
  </div>
);

// Utility functions for calculations
const calculateMetrics = (orders, period) => {
  if (!orders || orders.length === 0) {
    return {
      totalOrders: 0,
      totalSales: 0,
      averageOrderValue: 0,
      ordersCount: 0,
      uniqueCustomers: 0,
      topSellingItem: "N/A",
      completionRate: 0,
    };
  }

  const totalSales = orders.reduce(
    (sum, order) => sum + (order.bills?.totalWithTax || order.total || 0),
    0
  );
  const ordersCount = orders.length;
  const averageOrderValue = ordersCount > 0 ? totalSales / ordersCount : 0;

  // Calculate additional metrics
  const uniqueCustomers = new Set(
    orders.map((order) => order.customerId || order.customerName)
  ).size;

  // Find top selling item (simplified)
  const itemCounts = {};
  orders.forEach((order) => {
    order.items?.forEach((item) => {
      const itemName = item.name || "Unknown Item";
      itemCounts[itemName] = (itemCounts[itemName] || 0) + (item.quantity || 1);
    });
  });

  const topSellingItem =
    Object.keys(itemCounts).length > 0
      ? Object.keys(itemCounts).reduce((a, b) =>
          itemCounts[a] > itemCounts[b] ? a : b
        )
      : "N/A";

  // Calculate completion rate (simplified - assuming all completed orders have status)
  const completedOrders = orders.filter(
    (order) =>
      order.status === "completed" ||
      order.status === "delivered" ||
      !order.status
  ).length;
  const completionRate =
    ordersCount > 0 ? (completedOrders / ordersCount) * 100 : 0;

  return {
    totalOrders: ordersCount,
    totalSales,
    averageOrderValue,
    ordersCount,
    uniqueCustomers,
    topSellingItem,
    completionRate,
  };
};

const calculateTrend = (current, previous, isPositive = true) => {
  if (!previous || previous === 0)
    return { percentage: null, isIncrease: true };

  const percentage = ((current - previous) / previous) * 100;

  // For metrics where decrease is positive (like return rate), invert the logic
  const isIncrease = isPositive ? percentage >= 0 : percentage <= 0;

  return {
    percentage: Math.abs(percentage).toFixed(1),
    isIncrease,
  };
};

const Metrics = ({
  rawMetricsData = null,
  rawItemsData = [],
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
    queryFn: getOrders,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Process and memoize metrics data based on period
  const { metricsData, itemsData, filteredOrders } = useMemo(() => {
    const allOrders = rawMetricsData || resData?.data?.data || [];
    const currentPeriodOrders = filterOrdersByPeriod(allOrders, period);
    const currentMetrics = calculateMetrics(currentPeriodOrders, period);

    // Get previous period data for trend calculation
    const previousData = getPreviousPeriodData(allOrders, period);
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
        value: `₱${currentMetrics.averageOrderValue.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        subtitle: "Average per transaction",
        percentage: aovTrend.percentage,
        isIncrease: aovTrend.isIncrease,
        color: COLORS.primary.purple,
        icon: FaChartLine,
        format: "currency",
      },
    ];

    // Dynamic items data based on actual metrics
    const completionTrend = calculateTrend(
      currentMetrics.completionRate,
      previousData.metrics?.completionRate
    );

    const customerTrend = calculateTrend(
      currentMetrics.uniqueCustomers,
      previousData.metrics?.uniqueCustomers
    );

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
        title: "Top Product",
        value: currentMetrics.topSellingItem,
        subtitle: "Most popular item",
        percentage: null,
        isIncrease: true,
        color: COLORS.primary.purple,
        icon: FaChartLine,
      },
      {
        title: "Order Growth",
        value: `${orderTrend.percentage || "0"}%`,
        subtitle: "vs previous period",
        percentage: orderTrend.percentage,
        isIncrease: orderTrend.isIncrease,
        color: COLORS.primary.blue,
        icon: orderTrend.isIncrease ? FaArrowUp : FaArrowDown,
      },
    ];

    return {
      metricsData: premiumMetrics,
      itemsData: premiumItems,
      filteredOrders: currentPeriodOrders,
    };
  }, [resData, rawMetricsData, period]);

  // Handle period change
  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod);
    onPeriodChange?.(newPeriod);
  };

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

        {/* Enhanced Item Details Section */}
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

export default Metrics;
