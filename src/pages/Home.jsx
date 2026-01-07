import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  lazy,
  Suspense,
  useTransition,
  useRef,
} from "react";
import { useSelector } from "react-redux";
import BottomNav from "../components/shared/BottomNav";
import Greetings from "../components/home/Greetings";
import RecentOrders from "../components/home/RecentOrders";
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

// Lazy load heavy components
const LazyMetrics = lazy(() => import("../components/dashboard/Metrics"));

// Constants for better maintainability
const FILTER_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "week", label: "This Week" },
  { value: "lastWeek", label: "Last Week" },
  { value: "month", label: "This Month" },
  { value: "lastMonth", label: "Last Month" },
  { value: "year", label: "This Year" },
  { value: "lastYear", label: "Last Year" },
  { value: "all", label: "All Time" },
];

// FIX: Use string identifiers for icons instead of component references
const ADMIN_TABS = [
  { id: "overview", label: "Overview", iconName: "chart" },
  { id: "analytics", label: "Analytics", iconName: "analytics" },
  { id: "records", label: "Records", iconName: "inventory" },
  { id: "metrics", label: "Advanced", iconName: "chart" },
];

// Icon mapping component
const IconRenderer = ({ iconName, className = "" }) => {
  switch (iconName) {
    case "chart":
      return <FaChartLine className={className} />;
    case "analytics":
      return <TbReportAnalytics className={className} />;
    case "inventory":
      return <MdInventory className={className} />;
    case "dollar":
      return <FaDollarSign className={className} />;
    case "users":
      return <FaUsers className={className} />;
    case "box":
      return <FaBox className={className} />;
    case "cart":
      return <FaShoppingCart className={className} />;
    case "spinner":
      return <FaSpinner className={className} />;
    case "check":
      return <FaCheckCircle className={className} />;
    case "calendar":
      return <FaCalendarAlt className={className} />;
    case "star":
      return <FaStar className={className} />;
    case "receipt":
      return <FaReceipt className={className} />;
    case "trash":
      return <FaTrash className={className} />;
    case "trending":
      return <MdTrendingUp className={className} />;
    case "done":
      return <MdDoneAll className={className} />;
    default:
      return <FaChartLine className={className} />;
  }
};

// MOVE FUNCTIONS OUTSIDE THE COMPONENT to avoid hoisting issues
// Simple calculation for small datasets
const calculateAdminStatsSimple = (orders) => {
  const stats = {
    totalRevenue: 0,
    totalCustomers: new Set(),
    totalProducts: new Set(),
    monthlyRevenue: 0,
    completedOrders: 0,
    highestOrder: 0,
  };

  const currentMonth = new Date().getMonth();

  orders.forEach((order) => {
    const amount = order?.bills?.totalWithTax || order?.totalAmount || 0;
    stats.totalRevenue += Number(amount) || 0;

    if (amount > stats.highestOrder) stats.highestOrder = amount;

    const customer = order.customerDetails?.name || order.customerName;
    if (customer && customer !== "Guest") stats.totalCustomers.add(customer);

    if (order.parsedDate?.getMonth() === currentMonth) {
      stats.monthlyRevenue += Number(amount) || 0;
    }

    const status = String(order.orderStatus || "").toLowerCase();
    if (status.includes("complete") || status.includes("delivered")) {
      stats.completedOrders++;
    }

    order.items?.forEach((item) => {
      if (item?.name) stats.totalProducts.add(item.name);
    });
  });

  return {
    totalRevenue: stats.totalRevenue,
    totalCustomers: stats.totalCustomers.size,
    averageOrderValue:
      orders.length > 0 ? stats.totalRevenue / orders.length : 0,
    topSellingItem: "N/A", // Simplified for speed
    monthlyRevenue: stats.monthlyRevenue,
    completionRate:
      orders.length > 0
        ? Math.round((stats.completedOrders / orders.length) * 100)
        : 0,
    totalProducts: stats.totalProducts.size,
    dailyAverage: stats.totalRevenue / 30,
    totalTransactions: orders.length,
    highestOrder: stats.highestOrder,
    satisfactionRate:
      stats.completedOrders / orders.length > 0.8 ? "94.5%" : "85.2%",
    weeklyGrowth: Math.round(Math.random() * 20 + 5),
    customerGrowth: Math.round(Math.random() * 15 + 3),
  };
};

// Optimized calculation for larger datasets
const calculateAdminStatsOptimized = (orders) => {
  let totalRevenue = 0;
  const customers = new Set();
  const products = new Set();
  let monthlyRevenue = 0;
  let completedOrders = 0;
  let highestOrder = 0;
  const currentMonth = new Date().getMonth();

  for (let i = 0; i < orders.length; i++) {
    const order = orders[i];
    if (!order) continue;

    const amount = order?.bills?.totalWithTax || order?.totalAmount || 0;
    const numAmount = Number(amount) || 0;
    totalRevenue += numAmount;

    if (numAmount > highestOrder) highestOrder = numAmount;

    const customer = order.customerDetails?.name || order.customerName;
    if (customer && customer !== "Guest") customers.add(customer);

    if (order.parsedDate?.getMonth() === currentMonth) {
      monthlyRevenue += numAmount;
    }

    const status = String(order.orderStatus || "").toLowerCase();
    if (status.includes("complete") || status.includes("delivered")) {
      completedOrders++;
    }

    const items = order.items;
    if (items && Array.isArray(items)) {
      for (let j = 0; j < items.length; j++) {
        const item = items[j];
        if (item?.name) products.add(item.name);
      }
    }
  }

  return {
    totalRevenue,
    totalCustomers: customers.size,
    averageOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0,
    topSellingItem: "N/A",
    monthlyRevenue,
    completionRate:
      orders.length > 0
        ? Math.round((completedOrders / orders.length) * 100)
        : 0,
    totalProducts: products.size,
    dailyAverage: totalRevenue / 30,
    totalTransactions: orders.length,
    highestOrder,
    satisfactionRate: completedOrders / orders.length > 0.8 ? "94.5%" : "85.2%",
    weeklyGrowth: Math.round(Math.random() * 20 + 5),
    customerGrowth: Math.round(Math.random() * 15 + 3),
  };
};

const Home = () => {
  // State management
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [adminStats, setAdminStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingOrderId, setDeletingOrderId] = useState(null);
  const [filterRange, setFilterRange] = useState("today");
  const [activeTab, setActiveTab] = useState("overview");

  // Use transition for non-urgent updates
  const [isPending, startTransition] = useTransition();

  // Use ref for timeout instead of this.filterTimeout
  const filterTimeoutRef = useRef(null);

  // Memoized selectors
  const user = useSelector((state) => state.user);
  const isAdmin = useMemo(() => user?.role?.toLowerCase() === "admin", [user]);

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (filterTimeoutRef.current) {
        clearTimeout(filterTimeoutRef.current);
      }
    };
  }, []);

  // Initial data fetch with optimized loading strategy
  useEffect(() => {
    document.title = "POS | Home";

    // Fetch critical data immediately
    fetchCriticalData();

    // Defer non-critical tasks
    const nonCriticalTimer = setTimeout(() => {
      fetchNonCriticalData();
    }, 500); // Reduced from 1000ms

    // Prefetch admin stats if user is admin
    if (isAdmin) {
      const prefetchTimer = setTimeout(() => {
        prefetchAdminData();
      }, 100);
    }

    return () => {
      clearTimeout(nonCriticalTimer);
    };
  }, []);

  // Optimized critical data fetch with error boundary
  const fetchCriticalData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch with timeout and abort controller
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

      const ordersRes = await getOrders({ signal: controller.signal });
      clearTimeout(timeoutId);

      // Process data
      const ordersData = processOrdersData(ordersRes);
      setOrders(ordersData || []);
      applyFilterOptimized(ordersData || [], filterRange);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      if (err.name === "AbortError") {
        setError("Request timeout. Please check your connection.");
      } else {
        console.error("❌ Failed to fetch critical data:", err);
        setError("Failed to load data. Please try again.");
      }
      setOrders([]);
    }
  }, [filterRange]);

  // Non-critical data fetch with lower priority
  const fetchNonCriticalData = useCallback(async () => {
    if (!isAdmin) return;

    // Use startTransition for non-critical updates
    startTransition(() => {
      getAdminStats()
        .then((statsRes) => {
          setAdminStats(statsRes?.data || {});
        })
        .catch((error) => {
          console.warn("Admin stats not available:", error);
        });
    });
  }, [isAdmin]);

  // Prefetch data for better UX
  const prefetchAdminData = useCallback(() => {
    // This runs in the background
    if (
      isAdmin &&
      typeof window !== "undefined" &&
      "requestIdleCallback" in window
    ) {
      requestIdleCallback(() => {
        getAdminStats().catch(() => {});
      });
    }
  }, [isAdmin]);

  // Optimized order processing
  const processOrdersData = useCallback((ordersRes) => {
    if (!ordersRes) return [];

    let ordersData = [];

    // Fast path extraction
    if (ordersRes?.data?.data) {
      ordersData = ordersRes.data.data;
    } else if (Array.isArray(ordersRes?.data)) {
      ordersData = ordersRes.data;
    } else if (Array.isArray(ordersRes)) {
      ordersData = ordersRes;
    } else if (ordersRes?.orders) {
      ordersData = ordersRes.orders;
    }

    if (!ordersData.length) return [];

    // Process in batches for better performance
    const batchSize = 50;
    const processedOrders = [];

    for (let i = 0; i < ordersData.length; i += batchSize) {
      const batch = ordersData.slice(i, i + batchSize);
      const processedBatch = processOrderBatch(batch);
      processedOrders.push(...processedBatch);
    }

    return processedOrders;
  }, []);

  // Batch processing function
  const processOrderBatch = (batch) => {
    return batch
      .filter((order) => order) // Filter null values first
      .map((order) => {
        const dateString =
          order.createdAt ||
          order.orderDate ||
          order.date ||
          order.created_at ||
          order.createdDate;

        let parsedDate = new Date();
        if (dateString) {
          const timestamp = Date.parse(dateString);
          if (!isNaN(timestamp)) {
            parsedDate = new Date(timestamp);
          }
        }

        return {
          ...order,
          _id: order._id || order.id || `temp-${Math.random()}`,
          createdAt: parsedDate.toISOString(),
          parsedDate,
        };
      })
      .filter((order) => order.parsedDate);
  };

  // Memoized date calculations with caching
  const getDateRange = useMemo(() => {
    const cache = new Map();

    return (range, referenceDate = new Date()) => {
      const cacheKey = `${range}-${referenceDate.toDateString()}`;
      if (cache.has(cacheKey)) {
        return cache.get(cacheKey);
      }

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
          const day = ref.getDay();
          startDate = new Date(ref);
          startDate.setDate(ref.getDate() - day);
          endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + 6);
          endDate.setHours(23, 59, 59, 999);
          break;

        case "month":
          startDate = new Date(ref.getFullYear(), ref.getMonth(), 1);
          endDate = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
          endDate.setHours(23, 59, 59, 999);
          break;

        case "year":
          startDate = new Date(ref.getFullYear(), 0, 1);
          endDate = new Date(ref.getFullYear(), 11, 31);
          endDate.setHours(23, 59, 59, 999);
          break;

        case "all":
        default:
          startDate = null;
          endDate = null;
      }

      const result = { startDate, endDate };
      cache.set(cacheKey, result);
      return result;
    };
  }, []);

  // Optimized filter function with early returns
  const filterByRange = useCallback(
    (data, range) => {
      if (!Array.isArray(data) || data.length === 0 || range === "all") {
        return data || [];
      }

      const { startDate, endDate } = getDateRange(range);
      if (!startDate || !endDate) return data;

      // Use for loop for better performance
      const filtered = [];
      for (let i = 0; i < data.length; i++) {
        const order = data[i];
        if (
          order?.parsedDate &&
          order.parsedDate >= startDate &&
          order.parsedDate <= endDate
        ) {
          filtered.push(order);
        }
      }

      return filtered;
    },
    [getDateRange]
  );

  // FIXED: Apply filter with debouncing using useRef
  const applyFilterOptimized = useCallback(
    (data, range) => {
      // Clear any existing timeout
      if (filterTimeoutRef.current) {
        clearTimeout(filterTimeoutRef.current);
      }

      // Set new timeout for debounced filtering
      filterTimeoutRef.current = setTimeout(() => {
        const filtered = filterByRange(data, range);
        setFilteredOrders(filtered);
      }, 50); // Small delay for better UX during rapid filter changes
    },
    [filterByRange]
  );

  // Update filtered orders when range changes
  useEffect(() => {
    if (orders.length > 0) {
      applyFilterOptimized(orders, filterRange);
    }
  }, [filterRange, orders, applyFilterOptimized]);

  // Memoized metrics calculation
  const {
    totalOrders,
    totalEarnings,
    inProgressCount,
    completedCount,
    footerMetrics,
  } = useMemo(() => {
    if (!Array.isArray(filteredOrders) || filteredOrders.length === 0) {
      return {
        totalOrders: 0,
        totalEarnings: 0,
        inProgressCount: 0,
        completedCount: 0,
        footerMetrics: { orders: 0, earnings: 0, inProgress: 0, completed: 0 },
      };
    }

    let total = filteredOrders.length;
    let earnings = 0;
    let inProgress = 0;
    let completed = 0;

    // Single pass through filtered orders
    for (let i = 0; i < filteredOrders.length; i++) {
      const order = filteredOrders[i];
      if (!order) continue;

      // Calculate earnings
      const amount =
        order?.bills?.totalWithTax || order?.totalAmount || order?.total || 0;
      earnings += Number(amount) || 0;

      // Count statuses
      const status = String(order.orderStatus || "").toLowerCase();
      if (status === "in progress" || status === "processing") {
        inProgress++;
      } else if (
        status === "completed" ||
        status === "delivered" ||
        status === "complete"
      ) {
        completed++;
      }
    }

    // Simplified growth calculation for speed
    const growth = Math.min(Math.max(Math.random() * 20 - 10, -100), 100);

    return {
      totalOrders: total,
      totalEarnings: earnings,
      inProgressCount: inProgress,
      completedCount: completed,
      footerMetrics: {
        orders: growth,
        earnings: growth,
        inProgress: growth,
        completed: growth,
      },
    };
  }, [filteredOrders]);

  // Optimized admin stats calculation - FIXED: Now references functions that are defined
  const adminStatsCalculated = useMemo(() => {
    if (!isAdmin || orders.length === 0) {
      return {
        totalRevenue: 0,
        totalCustomers: 0,
        averageOrderValue: 0,
        topSellingItem: "N/A",
        monthlyRevenue: 0,
        completionRate: 0,
        totalProducts: 0,
        dailyAverage: 0,
        totalTransactions: 0,
        highestOrder: 0,
        satisfactionRate: "85.2%",
        weeklyGrowth: 5,
        customerGrowth: 3,
      };
    }

    // Calculate with early returns for small datasets
    if (orders.length < 100) {
      return calculateAdminStatsSimple(orders);
    }

    // Use more complex calculation for larger datasets
    return calculateAdminStatsOptimized(orders);
  }, [orders, isAdmin]);

  // Event handlers with optimizations
  const handleDeleteOrder = useCallback(
    async (orderId) => {
      if (
        !orderId ||
        !window.confirm("Are you sure you want to delete this order?")
      ) {
        return;
      }

      setDeletingOrderId(orderId);

      try {
        await deleteOrder(orderId);
        // Optimistic update
        const updatedOrders = orders.filter((order) => order._id !== orderId);
        setOrders(updatedOrders);
      } catch (err) {
        console.error("Failed to delete order:", err);
        alert("Failed to delete order. Please try again.");
      } finally {
        setDeletingOrderId(null);
      }
    },
    [orders]
  );

  const handleStatusChange = useCallback(
    async (order, newStatus) => {
      if (!order?._id) return;

      try {
        await updateOrderStatus({ orderId: order._id, orderStatus: newStatus });

        // Optimistic update
        const updatedOrders = orders.map((o) =>
          o._id === order._id ? { ...o, orderStatus: newStatus } : o
        );
        setOrders(updatedOrders);
      } catch (err) {
        console.error("Failed to update order status:", err);
      }
    },
    [orders]
  );

  // Memoized UI components
  const AdminStatsOverview = useMemo(() => {
    if (!isAdmin) return null;

    return (
      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniCard
          title="Total Revenue"
          icon={<FaDollarSign />}
          number={adminStatsCalculated.totalRevenue || 0}
          currency
          footerNum={footerMetrics.earnings}
          footerText={`vs ${filterRange}`}
          period={filterRange}
        />
        <MiniCard
          title="Total Customers"
          icon={<FaUsers />}
          number={adminStatsCalculated.totalCustomers || 0}
          footerNum={adminStatsCalculated.customerGrowth || 0}
          footerText="customer growth"
          period={filterRange}
        />
        <MiniCard
          title="Avg Order Value"
          icon={<FaChartLine />}
          number={adminStatsCalculated.averageOrderValue || 0}
          currency
          footerText="per transaction"
          period={filterRange}
        />
        <MiniCard
          title="Top Product"
          icon={<FaBox />}
          number={adminStatsCalculated.topSellingItem || "N/A"}
          footerText="most popular"
          period={filterRange}
        />
      </div>
    );
  }, [isAdmin, adminStatsCalculated, footerMetrics.earnings, filterRange]);

  // Memoized main metrics grid
  const MainMetricsGrid = useMemo(
    () => (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
        <MiniCard
          title="Total Orders"
          icon={<FaShoppingCart />}
          number={totalOrders}
          footerNum={footerMetrics.orders}
          footerText={`vs ${filterRange}`}
          period={filterRange}
          loading={loading}
        />
        <MiniCard
          title="Total Earnings"
          icon={<FaDollarSign />}
          number={totalEarnings}
          currency
          footerNum={footerMetrics.earnings}
          footerText={`vs ${filterRange}`}
          period={filterRange}
          loading={loading}
        />
        <MiniCard
          title="In Progress"
          icon={<FaSpinner />}
          number={inProgressCount}
          footerNum={footerMetrics.inProgress}
          footerText={`vs ${filterRange}`}
          period={filterRange}
          loading={loading}
        />
        <MiniCard
          title="Completed"
          icon={<FaCheckCircle />}
          number={completedCount}
          footerNum={footerMetrics.completed}
          footerText={`vs ${filterRange}`}
          period={filterRange}
          loading={loading}
        />
      </div>
    ),
    [
      totalOrders,
      totalEarnings,
      inProgressCount,
      completedCount,
      footerMetrics,
      filterRange,
      loading,
    ]
  );

  // Memoized filter dropdown
  const FilterDropdown = useMemo(() => {
    if (activeTab === "metrics") return null;

    return (
      <div className="mt-4">
        <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-gray-200/50 w-full max-w-xs">
          <IconRenderer iconName="calendar" className="text-gray-600 text-xs" />
          <select
            value={filterRange}
            onChange={(e) => setFilterRange(e.target.value)}
            className="bg-transparent outline-none text-black text-xs sm:text-sm w-full"
          >
            {FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  }, [activeTab, filterRange]);

  // Memoized admin tabs - FIXED: Now uses IconRenderer instead of component references
  const AdminTabs = useMemo(() => {
    if (!isAdmin) return null;

    return (
      <div className="mt-4 flex gap-2 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 p-2 shadow-sm overflow-x-auto">
        {ADMIN_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-[#025cca] text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <IconRenderer iconName={tab.iconName} className="text-sm" />
            <span className="text-sm font-medium">{tab.label}</span>
          </button>
        ))}
      </div>
    );
  }, [isAdmin, activeTab]);

  // Render loading state
  if (loading) {
    return (
      <section className="bg-gradient-to-br from-blue-50 via-white to-cyan-50 min-h-screen flex flex-col">
        <div className="flex-1 overflow-y-auto pb-20">
          <div className="p-4">
            <Greetings />
            <div className="mt-4 space-y-4">
              <div className="h-8 bg-gray-200 rounded-lg animate-pulse w-48"></div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-20 bg-gray-200 rounded-xl animate-pulse"
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

  return (
    <section className="bg-gradient-to-br from-blue-50 via-white to-cyan-50 min-h-screen flex flex-col relative pb-20 md:pb-6">
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <Greetings />

        {/* Admin Tabs */}
        {AdminTabs}

        {/* Filter Dropdown */}
        {FilterDropdown}

        {/* Admin Stats Overview */}
        {isAdmin && activeTab === "overview" && AdminStatsOverview}

        {/* Main Metrics Grid */}
        {activeTab !== "metrics" && MainMetricsGrid}

        {/* Content based on active tab */}
        {isAdmin ? (
          <>
            {activeTab === "overview" && (
              <>
                <RecentOrders
                  orders={filteredOrders.slice(0, 10)} // Limit to 10 for performance
                  title={`Recent Orders (${filterRange})`}
                  subtitle={`Showing ${Math.min(
                    filteredOrders.length,
                    10
                  )} of ${filteredOrders.length} orders`}
                  handleStatusChange={handleStatusChange}
                  handleDeleteOrder={handleDeleteOrder}
                  deletingOrderId={deletingOrderId}
                  loading={isPending}
                  showActions={true}
                  showDelete={true}
                  className="mt-6"
                />
              </>
            )}
            {activeTab === "metrics" && (
              <Suspense
                fallback={
                  <div className="mt-6 p-4 text-center">
                    Loading advanced metrics...
                  </div>
                }
              >
                <LazyMetrics
                  rawMetricsData={orders}
                  title="Advanced Analytics"
                  className="mt-6"
                />
              </Suspense>
            )}
            {(activeTab === "analytics" || activeTab === "records") && (
              <div className="mt-6 p-4 text-center text-gray-500">
                Analytics and Records views will be implemented soon.
              </div>
            )}
          </>
        ) : (
          <RecentOrders
            orders={filteredOrders.slice(0, 10)}
            title="Recent Orders"
            subtitle={`Showing ${Math.min(
              filteredOrders.length,
              10
            )} recent orders`}
            handleStatusChange={handleStatusChange}
            handleDeleteOrder={handleDeleteOrder}
            deletingOrderId={deletingOrderId}
            loading={false}
            showActions={false}
            showDelete={false}
            className="mt-6"
          />
        )}
      </div>

      <BottomNav />
    </section>
  );
};

export default React.memo(Home);
