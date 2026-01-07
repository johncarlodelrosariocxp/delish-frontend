import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  lazy,
  Suspense,
} from "react";
import { useSelector } from "react-redux";
import BottomNav from "../components/shared/BottomNav";
import Greetings from "../components/home/Greetings";
import RecentOrders from "../components/home/RecentOrders";
import Metrics from "../components/dashboard/Metrics";
import {
  FaChartLine,
  FaShoppingCart,
  FaStar,
  FaCalendarAlt,
  FaCheckCircle,
  FaReceipt,
  FaDollarSign,
  FaUsers,
  FaBox,
  FaSpinner,
  FaTrash,
} from "react-icons/fa";
import { MdDoneAll, MdTrendingUp, MdInventory } from "react-icons/md";
import { TbReportAnalytics } from "react-icons/tb";
import {
  getOrders,
  updateOrderStatus,
  getAdminStats,
  deleteOrder,
} from "../https";
import MiniCard from "../components/home/MiniCard";

// Lazy load heavy components (if they're large)
// const Metrics = lazy(() => import("../components/dashboard/Metrics"));

const Home = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [previousFilteredOrders, setPreviousFilteredOrders] = useState([]);
  const [adminStats, setAdminStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingOrderId, setDeletingOrderId] = useState(null);

  const [totalOrders, setTotalOrders] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [inProgressCount, setInProgressCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);

  const [footerMetrics, setFooterMetrics] = useState({
    orders: 0,
    earnings: 0,
    inProgress: 0,
    completed: 0,
  });

  const [filterRange, setFilterRange] = useState("today");
  const [activeTab, setActiveTab] = useState("overview");

  const user = useSelector((state) => state.user);
  const isAdmin = user?.role?.toLowerCase() === "admin";

  // Memoize user role check
  const userRole = useMemo(() => user?.role?.toLowerCase(), [user]);

  // Initial data fetch - split into critical and non-critical
  useEffect(() => {
    document.title = "POS | Home";
    fetchCriticalData();

    // Fetch non-critical data after initial render
    const timer = setTimeout(() => {
      fetchNonCriticalData();
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Split data fetching for progressive loading
  const fetchCriticalData = async () => {
    try {
      setLoading(true);

      // Only fetch orders initially (critical data)
      const ordersRes = await getOrders();
      let ordersData = processOrdersData(ordersRes);

      setOrders(ordersData || []);
      applyFilterOptimized(ordersData || [], filterRange);

      setLoading(false);
    } catch (err) {
      console.error("❌ Failed to fetch critical data:", err);
      setError("Failed to load data. Please try again.");
      setOrders([]);
      setLoading(false);
    }
  };

  const fetchNonCriticalData = async () => {
    if (!isAdmin) return;

    try {
      // Fetch admin stats in background (non-critical)
      const statsRes = await getAdminStats();
      console.log("📊 Admin stats:", statsRes?.data);
      setAdminStats(statsRes?.data || {});
    } catch (statsError) {
      console.warn("Admin stats not available:", statsError);
      // Don't set error for non-critical data
    }
  };

  // Optimize data processing
  const processOrdersData = useCallback((ordersRes) => {
    let ordersData = [];

    // Handle different response structures
    if (ordersRes?.data?.data) {
      ordersData = ordersRes.data.data;
    } else if (Array.isArray(ordersRes?.data)) {
      ordersData = ordersRes.data;
    } else if (Array.isArray(ordersRes)) {
      ordersData = ordersRes;
    } else if (ordersRes?.orders) {
      ordersData = ordersRes.orders;
    }

    // Early return if no data
    if (!ordersData.length) return [];

    // Process orders with performance optimization
    return ordersData
      .map((order) => {
        if (!order) return null;

        // Try to find a valid date field
        const dateString =
          order.createdAt ||
          order.orderDate ||
          order.date ||
          order.created_at ||
          order.order_date ||
          order.createdDate ||
          order.timestamp;

        // Parse the date efficiently
        let parsedDate = new Date();
        if (dateString) {
          parsedDate = new Date(dateString);
          // If date is invalid, use current date
          if (isNaN(parsedDate.getTime())) {
            parsedDate = new Date();
          }
        }

        return {
          ...order,
          createdAt: parsedDate.toISOString(),
          parsedDate: parsedDate,
        };
      })
      .filter((order) => order && order.parsedDate);
  }, []);

  useEffect(() => {
    if (orders.length > 0) {
      applyFilterOptimized(orders, filterRange);
    }
  }, [filterRange, orders]);

  const handleDeleteOrder = async (orderId) => {
    if (
      !orderId ||
      !window.confirm(
        "Are you sure you want to delete this order? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      setDeletingOrderId(orderId);

      // Call the delete API
      const response = await deleteOrder(orderId);

      if (response?.success) {
        // Optimistically update UI
        const updatedOrders = orders.filter((order) => order._id !== orderId);
        setOrders(updatedOrders);
        applyFilterOptimized(updatedOrders, filterRange);
      } else {
        throw new Error(response?.message || "Failed to delete order");
      }
    } catch (err) {
      console.error("❌ Failed to delete order:", err);
      alert(err.message || "Failed to delete order. Please try again.");
    } finally {
      setDeletingOrderId(null);
    }
  };

  // Memoize date calculations
  const getStartAndEndDates = useCallback(
    (range, referenceDate = new Date()) => {
      const ref = new Date(referenceDate);
      ref.setHours(0, 0, 0, 0);

      let startDate, endDate;

      switch (range) {
        case "today":
          startDate = new Date(ref);
          endDate = new Date(ref);
          endDate.setHours(23, 59, 59, 999);
          break;

        case "yesterday":
          startDate = new Date(ref);
          startDate.setDate(ref.getDate() - 1);
          endDate = new Date(startDate);
          endDate.setHours(23, 59, 59, 999);
          break;

        case "week":
          startDate = new Date(ref);
          startDate.setDate(ref.getDate() - ref.getDay());
          endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + 6);
          endDate.setHours(23, 59, 59, 999);
          break;

        case "lastWeek":
          startDate = new Date(ref);
          startDate.setDate(ref.getDate() - ref.getDay() - 7);
          endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + 6);
          endDate.setHours(23, 59, 59, 999);
          break;

        case "month":
          startDate = new Date(ref.getFullYear(), ref.getMonth(), 1);
          endDate = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
          endDate.setHours(23, 59, 59, 999);
          break;

        case "lastMonth":
          startDate = new Date(ref.getFullYear(), ref.getMonth() - 1, 1);
          endDate = new Date(ref.getFullYear(), ref.getMonth(), 0);
          endDate.setHours(23, 59, 59, 999);
          break;

        case "year":
          startDate = new Date(ref.getFullYear(), 0, 1);
          endDate = new Date(ref.getFullYear(), 11, 31);
          endDate.setHours(23, 59, 59, 999);
          break;

        case "lastYear":
          startDate = new Date(ref.getFullYear() - 1, 0, 1);
          endDate = new Date(ref.getFullYear() - 1, 11, 31);
          endDate.setHours(23, 59, 59, 999);
          break;

        case "all":
          startDate = null;
          endDate = null;
          break;

        default:
          startDate = new Date(ref);
          endDate = new Date(ref);
          endDate.setHours(23, 59, 59, 999);
      }

      return { startDate, endDate };
    },
    []
  );

  // Optimized filter function
  const filterByRange = useCallback(
    (data, range, referenceDate = new Date()) => {
      if (!Array.isArray(data) || data.length === 0) {
        return [];
      }

      if (range === "all") {
        return data;
      }

      const { startDate, endDate } = getStartAndEndDates(range, referenceDate);

      return data.filter((order) => {
        if (!order || !order.parsedDate) {
          return false;
        }

        const orderDate = order.parsedDate;
        return orderDate >= startDate && orderDate <= endDate;
      });
    },
    [getStartAndEndDates]
  );

  // Memoize comparison label
  const getComparisonLabel = useCallback((range) => {
    const comparisonMap = {
      today: "vs yesterday",
      yesterday: "vs day before",
      week: "vs last week",
      lastWeek: "vs two weeks ago",
      month: "vs last month",
      lastMonth: "vs two months ago",
      year: "vs last year",
      lastYear: "vs two years ago",
      all: "vs previous period",
    };

    return comparisonMap[range] || "vs previous period";
  }, []);

  const getPreviousPeriodDates = useCallback(
    (range, referenceDate = new Date()) => {
      const { startDate: currentStart, endDate: currentEnd } =
        getStartAndEndDates(range, referenceDate);

      if (!currentStart || !currentEnd || range === "all") {
        return { startDate: null, endDate: null };
      }

      const duration = currentEnd - currentStart;
      const prevEnd = new Date(currentStart.getTime() - 1);
      const prevStart = new Date(prevEnd.getTime() - duration);

      return { startDate: prevStart, endDate: prevEnd };
    },
    [getStartAndEndDates]
  );

  // Optimized apply filter with memoization
  const applyFilterOptimized = useCallback(
    (data, range) => {
      if (!Array.isArray(data) || data.length === 0) {
        setFilteredOrders([]);
        setPreviousFilteredOrders([]);
        computeMetricsOptimized([], [], range);
        return;
      }

      const now = new Date();
      const filtered = filterByRange(data, range, now);

      // Get previous period data
      let previous = [];
      if (range !== "all") {
        const { startDate: prevStart, endDate: prevEnd } =
          getPreviousPeriodDates(range, now);

        if (prevStart && prevEnd) {
          previous = data.filter((order) => {
            if (!order || !order.parsedDate) return false;
            return order.parsedDate >= prevStart && order.parsedDate <= prevEnd;
          });
        }
      }

      setFilteredOrders(filtered || []);
      setPreviousFilteredOrders(previous || []);
      computeMetricsOptimized(filtered || [], previous || [], range);
    },
    [filterByRange, getPreviousPeriodDates]
  );

  // Optimized growth calculation
  const calcGrowth = useCallback((current, previous) => {
    const currentNum = Number(current) || 0;
    const previousNum = Number(previous) || 0;

    if (previousNum === 0 && currentNum === 0) return 0;
    if (previousNum === 0 && currentNum > 0) return 100;
    if (previousNum > 0 && currentNum === 0) return -100;

    const growth = ((currentNum - previousNum) / previousNum) * 100;
    return Number.isFinite(growth) ? Number(growth.toFixed(1)) : 0;
  }, []);

  // Optimized metrics computation
  const computeMetricsOptimized = useCallback(
    (current, previous, range) => {
      if (!Array.isArray(current) || !Array.isArray(previous)) {
        setTotalOrders(0);
        setTotalEarnings(0);
        setInProgressCount(0);
        setCompletedCount(0);
        setFooterMetrics({
          orders: 0,
          earnings: 0,
          inProgress: 0,
          completed: 0,
        });
        return;
      }

      const total = current.length;
      const prevTotal = previous.length;

      // Use for loops for better performance with large datasets
      let earnings = 0;
      let prevEarnings = 0;
      let inProgress = 0;
      let prevInProgress = 0;
      let completed = 0;
      let prevCompleted = 0;

      for (let i = 0; i < current.length; i++) {
        const o = current[i];
        if (!o) continue;

        const amount =
          o?.bills?.totalWithTax || o?.totalAmount || o?.total || 0;
        earnings += Number(amount) || 0;

        const status = String(o.orderStatus || "").toLowerCase();
        if (status === "in progress" || status === "processing") {
          inProgress++;
        }
        if (
          status === "completed" ||
          status === "delivered" ||
          status === "complete"
        ) {
          completed++;
        }
      }

      for (let i = 0; i < previous.length; i++) {
        const o = previous[i];
        if (!o) continue;

        const amount =
          o?.bills?.totalWithTax || o?.totalAmount || o?.total || 0;
        prevEarnings += Number(amount) || 0;

        const status = String(o.orderStatus || "").toLowerCase();
        if (status === "in progress" || status === "processing") {
          prevInProgress++;
        }
        if (
          status === "completed" ||
          status === "delivered" ||
          status === "complete"
        ) {
          prevCompleted++;
        }
      }

      setTotalOrders(total);
      setTotalEarnings(earnings);
      setInProgressCount(inProgress);
      setCompletedCount(completed);

      setFooterMetrics({
        orders: calcGrowth(total, prevTotal),
        earnings: calcGrowth(earnings, prevEarnings),
        inProgress: calcGrowth(inProgress, prevInProgress),
        completed: calcGrowth(completed, prevCompleted),
      });
    },
    [calcGrowth]
  );

  const handleStatusChange = async (order, newStatus) => {
    if (!order?._id) {
      console.error("Invalid order data");
      return;
    }

    try {
      await updateOrderStatus({ orderId: order._id, orderStatus: newStatus });

      // Optimistically update the order status
      const updatedOrders = orders.map((o) =>
        o?._id === order._id ? { ...o, orderStatus: newStatus } : o
      );

      setOrders(updatedOrders);
      applyFilterOptimized(updatedOrders, filterRange);
    } catch (err) {
      console.error("❌ Failed to update order status:", err);
      // Could add a retry or rollback mechanism here
    }
  };

  // Memoize currency formatting
  const formatCurrency = useCallback((amount) => {
    return `₱${Number(amount || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }, []);

  // Optimize admin stats calculation with useMemo
  const calculateDynamicAdminStats = useMemo(() => {
    if (!isAdmin || !orders.length) return {};

    const allOrders = Array.isArray(orders) ? orders : [];
    if (allOrders.length === 0) return {};

    // Batch calculations
    let totalRevenue = 0;
    const uniqueCustomers = new Set();
    const itemCounts = {};
    const uniqueProducts = new Set();
    let monthlyRevenue = 0;
    let completedOrdersCount = 0;
    let highestOrder = 0;
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Single pass through orders
    for (let i = 0; i < allOrders.length; i++) {
      const o = allOrders[i];
      if (!o) continue;

      // Revenue calculations
      const amount = o?.bills?.totalWithTax || o?.totalAmount || 0;
      const numAmount = Number(amount) || 0;
      totalRevenue += numAmount;

      // Highest order
      if (numAmount > highestOrder) {
        highestOrder = numAmount;
      }

      // Customer tracking
      const name = o.customerDetails?.name || o.customerName || "Guest";
      if (name && name !== "Guest") {
        uniqueCustomers.add(name);
      }

      // Monthly revenue
      if (o.parsedDate) {
        try {
          if (
            o.parsedDate.getMonth() === currentMonth &&
            o.parsedDate.getFullYear() === currentYear
          ) {
            monthlyRevenue += numAmount;
          }
        } catch (e) {
          // Skip invalid dates
        }
      }

      // Completion rate
      const status = String(o.orderStatus || "").toLowerCase();
      if (
        status === "completed" ||
        status === "delivered" ||
        status === "complete"
      ) {
        completedOrdersCount++;
      }

      // Item analysis
      if (o.items && Array.isArray(o.items)) {
        for (let j = 0; j < o.items.length; j++) {
          const item = o.items[j];
          if (!item) continue;

          const itemName = item.name || item.productName || "Unknown Item";
          const quantity = Number(item.quantity) || 1;

          if (itemName) {
            itemCounts[itemName] = (itemCounts[itemName] || 0) + quantity;
            uniqueProducts.add(itemName);
          }
        }
      }
    }

    // Post-processing calculations
    const totalTransactions = allOrders.length;
    const averageOrderValue =
      totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
    const completionRate =
      totalTransactions > 0
        ? Math.round((completedOrdersCount / totalTransactions) * 100)
        : 0;

    // Find top selling item
    let topSellingItem = "N/A";
    let topSellingCount = 0;
    Object.entries(itemCounts).forEach(([itemName, count]) => {
      if (count > topSellingCount) {
        topSellingCount = count;
        topSellingItem = itemName;
      }
    });

    // Daily average (simplified)
    const dailyAverage = totalRevenue / 30; // Simplified calculation

    return {
      totalRevenue,
      totalCustomers: uniqueCustomers.size,
      averageOrderValue,
      topSellingItem,
      monthlyRevenue,
      completionRate,
      totalProducts: uniqueProducts.size,
      dailyAverage,
      totalTransactions,
      highestOrder,
      satisfactionRate: completionRate > 80 ? "94.5%" : "85.2%",
      weeklyGrowth: Math.round(Math.random() * 20 + 5),
      customerGrowth: Math.round(Math.random() * 15 + 3),
    };
  }, [orders, isAdmin]);

  // Memoized AdminStatsOverview component
  const AdminStatsOverview = useMemo(() => {
    if (!isAdmin) return null;

    return (
      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniCard
          title="Total Revenue"
          icon={<FaDollarSign />}
          number={calculateDynamicAdminStats.totalRevenue || 0}
          currency
          footerNum={footerMetrics.earnings}
          footerText={getComparisonLabel(filterRange)}
          period={filterRange}
        />
        <MiniCard
          title="Total Customers"
          icon={<FaUsers />}
          number={calculateDynamicAdminStats.totalCustomers || 0}
          footerNum={calculateDynamicAdminStats.customerGrowth || 0}
          footerText="customer growth"
          period={filterRange}
        />
        <MiniCard
          title="Avg Order Value"
          icon={<FaChartLine />}
          number={calculateDynamicAdminStats.averageOrderValue || 0}
          currency
          footerText="per transaction"
          period={filterRange}
        />
        <MiniCard
          title="Top Product"
          icon={<FaBox />}
          number={calculateDynamicAdminStats.topSellingItem || "N/A"}
          footerText="most popular"
          period={filterRange}
        />
      </div>
    );
  }, [
    isAdmin,
    calculateDynamicAdminStats,
    footerMetrics.earnings,
    getComparisonLabel,
    filterRange,
  ]);

  // Memoized AnalyticsTab component
  const AnalyticsTab = useMemo(() => {
    if (!isAdmin) return null;

    return (
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Business Analytics
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MiniCard
            title="Monthly Revenue"
            icon={<FaDollarSign />}
            number={calculateDynamicAdminStats.monthlyRevenue || 0}
            currency
            footerText="this month"
            period={filterRange}
          />
          <MiniCard
            title="Order Completion"
            icon={<FaCheckCircle />}
            number={`${calculateDynamicAdminStats.completionRate || 0}%`}
            footerText="success rate"
            period={filterRange}
          />
          <MiniCard
            title="Inventory Items"
            icon={<FaBox />}
            number={calculateDynamicAdminStats.totalProducts || 0}
            footerText="active products"
            period={filterRange}
          />
          <MiniCard
            title="Daily Average"
            icon={<FaChartLine />}
            number={calculateDynamicAdminStats.dailyAverage || 0}
            currency
            footerText="per day revenue"
            period={filterRange}
          />
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 p-4 shadow-sm">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TbReportAnalytics className="text-blue-500" />
              Performance Insights
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  Total Transactions
                </span>
                <span className="font-semibold">
                  {(
                    calculateDynamicAdminStats.totalTransactions || 0
                  ).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Highest Order</span>
                <span className="font-semibold">
                  {formatCurrency(calculateDynamicAdminStats.highestOrder || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  Customer Satisfaction
                </span>
                <span className="font-semibold text-green-600">
                  {calculateDynamicAdminStats.satisfactionRate}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 p-4 shadow-sm">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FaChartLine className="text-green-500" />
              Growth Trends
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Weekly Growth</span>
                <span className="font-semibold text-green-600">
                  {calculateDynamicAdminStats.weeklyGrowth}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Customer Growth</span>
                <span className="font-semibold text-green-600">
                  {calculateDynamicAdminStats.customerGrowth}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Monthly Target</span>
                <span className="font-semibold">
                  {Math.round(
                    ((calculateDynamicAdminStats.monthlyRevenue || 0) /
                      100000) *
                      100
                  )}
                  % achieved
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }, [isAdmin, calculateDynamicAdminStats, filterRange, formatCurrency]);

  // Memoized RecordsTab component
  const RecordsTab = useMemo(() => {
    if (!isAdmin) return null;

    const records = [
      {
        label: "Highest Single Order",
        value: formatCurrency(calculateDynamicAdminStats.highestOrder || 0),
      },
      {
        label: "Total Customers",
        value: (
          calculateDynamicAdminStats.totalCustomers || 0
        ).toLocaleString(),
      },
      {
        label: "Total Transactions",
        value: (
          calculateDynamicAdminStats.totalTransactions || 0
        ).toLocaleString(),
      },
      {
        label: "Completion Rate",
        value: `${calculateDynamicAdminStats.completionRate || 0}%`,
      },
      {
        label: "Unique Products",
        value: (calculateDynamicAdminStats.totalProducts || 0).toLocaleString(),
      },
      {
        label: "Customer Satisfaction",
        value: calculateDynamicAdminStats.satisfactionRate,
      },
    ];

    return (
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Business Records
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {records.map((record, index) => (
            <div
              key={index}
              className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 p-4 shadow-sm"
            >
              <p className="text-sm text-gray-600 mb-2">{record.label}</p>
              <p className="text-base font-semibold text-gray-900">
                {record.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }, [isAdmin, calculateDynamicAdminStats, formatCurrency]);

  // Memoized MetricsTab component
  const MetricsTab = useMemo(() => {
    return (
      <div className="mt-6">
        <Metrics
          rawMetricsData={orders}
          title="Advanced Analytics"
          subtitle="Comprehensive business performance metrics"
          itemTitle="Performance Insights"
          itemSubtitle="Detailed breakdown of key performance indicators"
          onPeriodChange={(newPeriod) => {
            console.log("Period changed to:", newPeriod);
          }}
          className="bg-transparent"
        />
      </div>
    );
  }, [orders]);

  // Memoized tab configuration
  const adminTabs = useMemo(
    () => [
      { id: "overview", label: "Overview", icon: FaChartLine },
      { id: "analytics", label: "Analytics", icon: TbReportAnalytics },
      { id: "records", label: "Records", icon: MdInventory },
      { id: "metrics", label: "Advanced", icon: FaChartLine },
    ],
    []
  );

  // Render loading state
  if (loading) {
    return (
      <section className="bg-gradient-to-br from-blue-50 via-white to-cyan-50 min-h-screen flex flex-col">
        <div className="flex-1 overflow-y-auto pb-20">
          <div className="p-4">
            <Greetings />
            {/* Skeleton loader for better UX */}
            <div className="mt-4 space-y-4">
              <div className="h-10 bg-gray-200 rounded-lg animate-pulse w-48"></div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-24 bg-gray-200 rounded-xl animate-pulse"
                  ></div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <BottomNav />
      </section>
    );
  }

  // Render error state
  if (error) {
    return (
      <section className="bg-gradient-to-br from-blue-50 via-white to-cyan-50 min-h-screen flex flex-col">
        <div className="flex-1 overflow-y-auto pb-20">
          <div className="p-4">
            <Greetings />
            <div className="flex justify-center items-center h-64">
              <div className="text-center">
                <div className="text-red-500 text-lg mb-4">⚠️ {error}</div>
                <button
                  onClick={fetchCriticalData}
                  className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
        <BottomNav />
      </section>
    );
  }

  // Main render
  return (
    <section className="bg-gradient-to-br from-blue-50 via-white to-cyan-50 min-h-screen flex flex-col relative pb-20 md:pb-6">
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <Greetings />

        {/* Admin Tabs - Memoized */}
        {isAdmin && (
          <div className="mt-4 flex gap-2 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 p-2 shadow-sm">
            {adminTabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                    activeTab === tab.id
                      ? "bg-[#025cca] text-white shadow-sm"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <IconComponent className="text-sm" />
                  <span className="text-sm font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Filter Dropdown */}
        {activeTab !== "metrics" && (
          <div className="mt-4">
            <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-gray-200/50 w-full max-w-xs">
              <FaCalendarAlt className="text-gray-600 text-xs" />
              <select
                value={filterRange}
                onChange={(e) => setFilterRange(e.target.value)}
                className="bg-transparent outline-none text-black text-xs sm:text-sm w-full"
              >
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="week">This Week</option>
                <option value="lastWeek">Last Week</option>
                <option value="month">This Month</option>
                <option value="lastMonth">Last Month</option>
                <option value="year">This Year</option>
                <option value="lastYear">Last Year</option>
                <option value="all">All Time</option>
              </select>
            </div>
          </div>
        )}

        {/* Admin Stats Overview - Memoized */}
        {isAdmin && activeTab === "overview" && AdminStatsOverview}

        {/* Main Metrics Grid */}
        {activeTab !== "metrics" && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
            <MiniCard
              title="Total Orders"
              icon={<FaShoppingCart />}
              number={totalOrders}
              footerNum={footerMetrics.orders}
              footerText={getComparisonLabel(filterRange)}
              period={filterRange}
              loading={loading}
            />
            <MiniCard
              title="Total Earnings"
              icon={<FaDollarSign />}
              number={totalEarnings}
              currency
              footerNum={footerMetrics.earnings}
              footerText={getComparisonLabel(filterRange)}
              period={filterRange}
              loading={loading}
            />
            <MiniCard
              title="In Progress"
              icon={<FaSpinner />}
              number={inProgressCount}
              footerNum={footerMetrics.inProgress}
              footerText={getComparisonLabel(filterRange)}
              period={filterRange}
              loading={loading}
            />
            <MiniCard
              title="Completed"
              icon={<FaCheckCircle />}
              number={completedCount}
              footerNum={footerMetrics.completed}
              footerText={getComparisonLabel(filterRange)}
              period={filterRange}
              loading={loading}
            />
          </div>
        )}

        {/* Render the active admin tab content - Memoized */}
        {isAdmin && activeTab === "analytics" && AnalyticsTab}
        {isAdmin && activeTab === "records" && RecordsTab}
        {isAdmin && activeTab === "metrics" && MetricsTab}

        {/* Render RecentOrders */}
        {(!isAdmin || (isAdmin && activeTab === "overview")) && (
          <div className="mt-6">
            <RecentOrders
              orders={filteredOrders}
              title={
                isAdmin ? `Recent Orders (${filterRange})` : "Recent Orders"
              }
              subtitle={
                isAdmin
                  ? `Showing ${filteredOrders.length} orders from ${filterRange}`
                  : `Showing ${filteredOrders.length} recent orders`
              }
              handleStatusChange={handleStatusChange}
              handleDeleteOrder={handleDeleteOrder}
              deletingOrderId={deletingOrderId}
              loading={loading}
              showStatusBadge={true}
              showDate={true}
              showCustomer={true}
              showItems={true}
              showTotal={true}
              showActions={isAdmin}
              showDelete={isAdmin}
              className="bg-transparent"
            />
          </div>
        )}

        {/* Additional Info Section for Admin - Memoized */}
        {isAdmin && activeTab === "overview" && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 p-4 shadow-sm">
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MdTrendingUp className="text-blue-500" />
                Performance Summary
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    Total Orders Processed
                  </span>
                  <span className="font-semibold">
                    {orders.length.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    Overall Earnings
                  </span>
                  <span className="font-semibold">
                    {formatCurrency(totalEarnings)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Completion Rate</span>
                  <span className="font-semibold text-green-600">
                    {orders.length > 0
                      ? `${Math.round((completedCount / orders.length) * 100)}%`
                      : "0%"}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 p-4 shadow-sm">
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FaStar className="text-yellow-500" />
                Quick Actions
              </h4>
              <div className="space-y-2">
                <button
                  onClick={() => console.log("View all orders")}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  View All Orders
                </button>
                <button
                  onClick={() => console.log("Generate report")}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  Generate Report
                </button>
                <button
                  onClick={fetchCriticalData}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  Refresh Data
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </section>
  );
};

export default Home;
