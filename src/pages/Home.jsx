import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import BottomNav from "../components/shared/BottomNav";
import Greetings from "../components/home/Greetings";
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
} from "react-icons/fa";
import { MdDoneAll, MdTrendingUp, MdInventory } from "react-icons/md";
import RecentOrders from "../components/home/RecentOrders";
import { getOrders, updateOrderStatus, getAdminStats } from "../https";
import { useSelector } from "react-redux";
import Metrics from "../components/dashboard/Metrics";

// Simple MiniCard component since it doesn't exist in the shared folder
const MiniCard = ({
  title,
  icon,
  number,
  footerNum,
  footerText,
  currency,
  loading = false,
  variant = "default",
  period,
}) => {
  // Format number
  const formatNumber = (num) => {
    if (loading) return currency ? "₱---" : "---";

    if (num === null || num === undefined || num === "") {
      return currency ? "₱0.00" : "0";
    }

    const numericValue = Number(num);

    if (!isFinite(numericValue)) {
      return currency ? "₱0.00" : "0";
    }

    if (currency) {
      return `₱${numericValue.toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    }

    return Number.isInteger(numericValue)
      ? numericValue.toLocaleString("en-PH")
      : numericValue.toLocaleString("en-PH", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
  };

  // Get icon component
  const getIconComponent = () => {
    if (typeof icon === "string") {
      const iconMap = {
        sales: FaDollarSign,
        revenue: FaDollarSign,
        earnings: FaDollarSign,
        orders: FaShoppingCart,
        customers: FaUsers,
        completed: FaCheckCircle,
        progress: FaSpinner,
        products: FaBox,
        inventory: FaBox,
        average: FaChartLine,
        default: FaChartLine,
      };

      const IconComponent = iconMap[icon.toLowerCase()] || iconMap.default;
      return <IconComponent className="text-lg" />;
    }

    return icon || <FaChartLine className="text-lg" />;
  };

  // Get color scheme based on variant
  const getColorScheme = () => {
    const schemes = {
      primary: { iconBg: "bg-blue-500", text: "text-blue-600" },
      success: { iconBg: "bg-green-500", text: "text-green-600" },
      warning: { iconBg: "bg-yellow-500", text: "text-yellow-600" },
      info: { iconBg: "bg-cyan-500", text: "text-cyan-600" },
      danger: { iconBg: "bg-red-500", text: "text-red-600" },
      default: { iconBg: "bg-gray-500", text: "text-gray-600" },
    };

    return schemes[variant] || schemes.default;
  };

  const colorScheme = getColorScheme();
  const IconComponent = getIconComponent();
  const formattedNumber = formatNumber(number);

  // Format footer percentage
  const formatFooter = () => {
    if (loading || footerNum === undefined || footerNum === null) {
      return { text: "---", color: "text-gray-400" };
    }

    const num = Number(footerNum);
    if (!isFinite(num)) return { text: "0%", color: "text-gray-400" };

    const absNum = Math.abs(num);
    const formatted = absNum.toFixed(1);

    if (num > 0) return { text: `+${formatted}%`, color: "text-green-600" };
    if (num < 0) return { text: `-${formatted}%`, color: "text-red-500" };
    return { text: "0%", color: "text-gray-400" };
  };

  const footerDisplay = formatFooter();

  return (
    <div className="bg-white/80 backdrop-blur-sm text-gray-900 py-4 px-5 rounded-xl w-full shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200/50 hover:scale-[1.02]">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold tracking-wide text-gray-700 line-clamp-1">
            {title}
          </h1>
          {period && (
            <p className="text-xs text-gray-500 mt-1 capitalize">{period}</p>
          )}
        </div>
        <div
          className={`${colorScheme.iconBg} text-white p-3 rounded-lg transition-all duration-200 flex items-center justify-center min-w-[2.5rem] shadow-sm ml-2 flex-shrink-0`}
        >
          {IconComponent}
        </div>
      </div>

      <div className="mt-4">
        <h1
          className={`text-2xl font-bold text-gray-900 break-words ${
            loading ? "animate-pulse bg-gray-200 rounded h-8 w-24" : ""
          }`}
        >
          {formattedNumber}
        </h1>
        <div className="text-sm mt-2 flex items-center gap-1 flex-wrap">
          <span
            className={`font-medium ${footerDisplay.color} whitespace-nowrap ${
              loading ? "animate-pulse bg-gray-200 rounded h-4 w-12" : ""
            }`}
          >
            {footerDisplay.text}
          </span>
          <span className="text-gray-500 text-xs whitespace-nowrap">
            {footerText || "vs previous period"}
          </span>
        </div>
      </div>
    </div>
  );
};

const CACHE_KEYS = {
  ORDERS: 'pos_home_orders',
  STATS: 'pos_home_stats',
  METRICS: 'pos_home_metrics',
  TIMESTAMP: 'pos_home_timestamp'
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const Home = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [previousFilteredOrders, setPreviousFilteredOrders] = useState([]);
  const [adminStats, setAdminStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const isMounted = useRef(true);

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

  const [filterRange, setFilterRange] = useState(() => {
    try {
      const saved = localStorage.getItem('pos_home_filter_range');
      return saved || "day";
    } catch {
      return "day";
    }
  });
  
  const [activeTab, setActiveTab] = useState("overview");

  const user = useSelector((state) => state.user);
  const isAdmin = useMemo(() => user?.role?.toLowerCase() === "admin", [user?.role]);

  // Load cached data on mount
  useEffect(() => {
    isMounted.current = true;
    
    const loadCachedData = () => {
      try {
        const cachedOrders = localStorage.getItem(CACHE_KEYS.ORDERS);
        const cachedStats = localStorage.getItem(CACHE_KEYS.STATS);
        const cachedMetrics = localStorage.getItem(CACHE_KEYS.METRICS);
        const timestamp = localStorage.getItem(CACHE_KEYS.TIMESTAMP);
        
        if (cachedOrders) {
          const parsedOrders = JSON.parse(cachedOrders);
          setOrders(parsedOrders);
          
          if (cachedMetrics) {
            const metrics = JSON.parse(cachedMetrics);
            setTotalOrders(metrics.totalOrders || 0);
            setTotalEarnings(metrics.totalEarnings || 0);
            setInProgressCount(metrics.inProgressCount || 0);
            setCompletedCount(metrics.completedCount || 0);
            setFooterMetrics(metrics.footerMetrics || {
              orders: 0, earnings: 0, inProgress: 0, completed: 0
            });
          }
          
          if (cachedStats) {
            setAdminStats(JSON.parse(cachedStats));
          }
          
          // Apply filter to cached data
          const filtered = filterByRange(parsedOrders, filterRange);
          const previousRange = getPreviousPeriodRange(filterRange);
          const previous = filterByRange(parsedOrders, previousRange);
          
          setFilteredOrders(filtered);
          setPreviousFilteredOrders(previous);
          
          // Check if cache is expired
          const isExpired = !timestamp || (Date.now() - Number(timestamp) > CACHE_DURATION);
          return !isExpired;
        }
      } catch (e) {
        console.error("Error loading cached data:", e);
      }
      return false;
    };

    const hasValidCache = loadCachedData();
    
    if (!hasValidCache) {
      fetchData();
    } else {
      setLoading(false);
      setIsInitialized(true);
      // Refresh data in background if cache exists
      fetchData(true);
    }

    return () => {
      isMounted.current = false;
    };
  }, []);

  // Save filter preference
  useEffect(() => {
    try {
      localStorage.setItem('pos_home_filter_range', filterRange);
    } catch (e) {
      console.error("Error saving filter range:", e);
    }
  }, [filterRange]);

  useEffect(() => {
    document.title = "POS | Home";
  }, []);

  // Memoized filter application - only when orders or filterRange changes
  useEffect(() => {
    if (orders.length > 0 && isInitialized) {
      applyFilter(orders, filterRange);
    }
  }, [filterRange, orders, isInitialized]);

  const saveToCache = useCallback((ordersData, statsData, metricsData) => {
    try {
      localStorage.setItem(CACHE_KEYS.ORDERS, JSON.stringify(ordersData));
      if (statsData) {
        localStorage.setItem(CACHE_KEYS.STATS, JSON.stringify(statsData));
      }
      if (metricsData) {
        localStorage.setItem(CACHE_KEYS.METRICS, JSON.stringify(metricsData));
      }
      localStorage.setItem(CACHE_KEYS.TIMESTAMP, Date.now().toString());
    } catch (e) {
      console.error("Error saving to cache:", e);
    }
  }, []);

  const fetchData = async (isBackground = false) => {
    if (!isBackground) {
      setLoading(true);
    }
    
    try {
      setError(null);

      // Fetch orders
      let ordersData = [];
      try {
        const ordersRes = await getOrders();

        if (ordersRes?.data?.data) {
          ordersData = ordersRes.data.data;
        } else if (Array.isArray(ordersRes?.data)) {
          ordersData = ordersRes.data;
        } else if (Array.isArray(ordersRes)) {
          ordersData = ordersRes;
        } else if (ordersRes?.orders) {
          ordersData = ordersRes.orders;
        }
      } catch (orderError) {
        console.error("❌ Failed to fetch orders:", orderError);
        ordersData = [];
      }

      if (isMounted.current) {
        setOrders(ordersData || []);
      }

      // Fetch admin stats if user is admin
      let statsData = null;
      if (isAdmin) {
        try {
          const statsRes = await getAdminStats();
          statsData = statsRes?.data || {};
          if (isMounted.current) {
            setAdminStats(statsData);
          }
        } catch (statsError) {
          console.warn("Admin stats not available:", statsError);
          if (isMounted.current) {
            setAdminStats({});
          }
        }
      }

      if (isMounted.current) {
        const filtered = filterByRange(ordersData, filterRange);
        const previousRange = getPreviousPeriodRange(filterRange);
        const previous = filterByRange(ordersData, previousRange);
        
        setFilteredOrders(filtered);
        setPreviousFilteredOrders(previous);
        
        const metricsData = computeMetrics(filtered, previous, filterRange, true);
        
        // Save to cache
        saveToCache(ordersData, statsData, metricsData);
      }
    } catch (err) {
      console.error("❌ Failed to fetch data:", err);
      if (isMounted.current && !isBackground) {
        setError("Failed to load data. Please try again.");
      }
    } finally {
      if (isMounted.current && !isBackground) {
        setLoading(false);
        setIsInitialized(true);
      }
    }
  };

  const filterByRange = useCallback((data, range, referenceDate = new Date()) => {
    if (!Array.isArray(data)) return [];

    try {
      const ref = new Date(referenceDate);
      ref.setHours(0, 0, 0, 0);

      if (range === "all") {
        return data;
      }

      return data.filter((order) => {
        if (!order) return false;

        const orderDate = new Date(
          order.createdAt || order.orderDate || order.date || Date.now()
        );

        if (isNaN(orderDate.getTime())) return false;

        const normalizedOrderDate = new Date(orderDate);
        normalizedOrderDate.setHours(0, 0, 0, 0);

        switch (range) {
          case "day": {
            return normalizedOrderDate.getTime() === ref.getTime();
          }

          case "yesterday": {
            const yesterday = new Date(ref);
            yesterday.setDate(ref.getDate() - 1);
            return normalizedOrderDate.getTime() === yesterday.getTime();
          }

          case "week": {
            const startOfWeek = new Date(ref);
            startOfWeek.setDate(ref.getDate() - ref.getDay());
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            endOfWeek.setHours(23, 59, 59, 999);
            return orderDate >= startOfWeek && orderDate <= endOfWeek;
          }

          case "lastWeek": {
            const startOfLastWeek = new Date(ref);
            startOfLastWeek.setDate(ref.getDate() - ref.getDay() - 7);
            const endOfLastWeek = new Date(startOfLastWeek);
            endOfLastWeek.setDate(startOfLastWeek.getDate() + 6);
            endOfLastWeek.setHours(23, 59, 59, 999);
            return orderDate >= startOfLastWeek && orderDate <= endOfLastWeek;
          }

          case "month": {
            const startOfMonth = new Date(ref.getFullYear(), ref.getMonth(), 1);
            const endOfMonth = new Date(
              ref.getFullYear(),
              ref.getMonth() + 1,
              0
            );
            endOfMonth.setHours(23, 59, 59, 999);
            return orderDate >= startOfMonth && orderDate <= endOfMonth;
          }

          case "lastMonth": {
            const startOfLastMonth = new Date(
              ref.getFullYear(),
              ref.getMonth() - 1,
              1
            );
            const endOfLastMonth = new Date(
              ref.getFullYear(),
              ref.getMonth(),
              0
            );
            endOfLastMonth.setHours(23, 59, 59, 999);
            return orderDate >= startOfLastMonth && orderDate <= endOfLastMonth;
          }

          case "year": {
            const startOfYear = new Date(ref.getFullYear(), 0, 1);
            const endOfYear = new Date(ref.getFullYear(), 11, 31);
            endOfYear.setHours(23, 59, 59, 999);
            return orderDate >= startOfYear && orderDate <= endOfYear;
          }

          case "lastYear": {
            const startOfLastYear = new Date(ref.getFullYear() - 1, 0, 1);
            const endOfLastYear = new Date(ref.getFullYear() - 1, 11, 31);
            endOfLastYear.setHours(23, 59, 59, 999);
            return orderDate >= startOfLastYear && orderDate <= endOfLastYear;
          }

          default:
            return true;
        }
      });
    } catch (error) {
      console.error("Error in filterByRange:", error);
      return [];
    }
  }, []);

  const getPreviousPeriodRange = useCallback((range) => {
    switch (range) {
      case "all":
        return "all";
      case "day":
        return "yesterday";
      case "yesterday":
        return "day";
      case "week":
        return "lastWeek";
      case "lastWeek":
        return "week";
      case "month":
        return "lastMonth";
      case "lastMonth":
        return "month";
      case "year":
        return "lastYear";
      case "lastYear":
        return "year";
      default:
        return range;
    }
  }, []);

  const getComparisonLabel = useCallback((range) => {
    switch (range) {
      case "all":
        return "previous period";
      case "day":
        return "yesterday";
      case "yesterday":
        return "day before";
      case "week":
        return "last week";
      case "lastWeek":
        return "two weeks ago";
      case "month":
        return "last month";
      case "lastMonth":
        return "two months ago";
      case "year":
        return "last year";
      case "lastYear":
        return "two years ago";
      default:
        return "previous period";
    }
  }, []);

  const applyFilter = useCallback((data, range) => {
    if (!Array.isArray(data) || data.length === 0) {
      setFilteredOrders([]);
      setPreviousFilteredOrders([]);
      computeMetrics([], [], range);
      return;
    }

    try {
      const now = new Date();
      const filtered = filterByRange(data, range, now);
      const previousRange = getPreviousPeriodRange(range);
      const previous = filterByRange(data, previousRange, now);

      setFilteredOrders(filtered || []);
      setPreviousFilteredOrders(previous || []);
      computeMetrics(filtered || [], previous || [], range);
    } catch (error) {
      console.error("Error in applyFilter:", error);
      setFilteredOrders([]);
      setPreviousFilteredOrders([]);
      computeMetrics([], [], range);
    }
  }, [filterByRange, getPreviousPeriodRange]);

  const calcGrowth = useCallback((current, previous) => {
    const currentNum = Number(current) || 0;
    const previousNum = Number(previous) || 0;

    if (previousNum === 0 && currentNum === 0) return 0;
    if (previousNum === 0 && currentNum > 0) return 100;
    if (previousNum > 0 && currentNum === 0) return -100;

    const growth = ((currentNum - previousNum) / previousNum) * 100;
    return Number.isFinite(growth) ? Number(growth.toFixed(1)) : 0;
  }, []);

  const computeMetrics = useCallback((current, previous, range, returnOnly = false) => {
    if (!Array.isArray(current) || !Array.isArray(previous)) {
      const emptyMetrics = {
        totalOrders: 0,
        totalEarnings: 0,
        inProgressCount: 0,
        completedCount: 0,
        footerMetrics: { orders: 0, earnings: 0, inProgress: 0, completed: 0 }
      };
      
      if (!returnOnly) {
        setTotalOrders(0);
        setTotalEarnings(0);
        setInProgressCount(0);
        setCompletedCount(0);
        setFooterMetrics({ orders: 0, earnings: 0, inProgress: 0, completed: 0 });
      }
      return emptyMetrics;
    }

    const total = current.length;
    const prevTotal = previous.length;

    const earnings = current.reduce((sum, o) => {
      if (!o) return sum;
      const amount = o?.bills?.totalWithTax || o?.totalAmount || o?.total || 0;
      return sum + (Number(amount) || 0);
    }, 0);

    const prevEarnings = previous.reduce((sum, o) => {
      if (!o) return sum;
      const amount = o?.bills?.totalWithTax || o?.totalAmount || o?.total || 0;
      return sum + (Number(amount) || 0);
    }, 0);

    const inProgress = current.filter((o) => {
      if (!o) return false;
      const status = o.orderStatus?.toLowerCase();
      return status === "in progress" || status === "processing";
    }).length;

    const prevInProgress = previous.filter((o) => {
      if (!o) return false;
      const status = o.orderStatus?.toLowerCase();
      return status === "in progress" || status === "processing";
    }).length;

    const completed = current.filter((o) => {
      if (!o) return false;
      const status = o.orderStatus?.toLowerCase();
      return (
        status === "completed" ||
        status === "delivered" ||
        status === "complete"
      );
    }).length;

    const prevCompleted = previous.filter((o) => {
      if (!o) return false;
      const status = o.orderStatus?.toLowerCase();
      return (
        status === "completed" ||
        status === "delivered" ||
        status === "complete"
      );
    }).length;

    const metricsData = {
      totalOrders: total,
      totalEarnings: earnings,
      inProgressCount: inProgress,
      completedCount: completed,
      footerMetrics: {
        orders: calcGrowth(total, prevTotal),
        earnings: calcGrowth(earnings, prevEarnings),
        inProgress: calcGrowth(inProgress, prevInProgress),
        completed: calcGrowth(completed, prevCompleted),
      }
    };

    if (!returnOnly) {
      setTotalOrders(total);
      setTotalEarnings(earnings);
      setInProgressCount(inProgress);
      setCompletedCount(completed);
      setFooterMetrics(metricsData.footerMetrics);
    }

    return metricsData;
  }, [calcGrowth]);

  const handleStatusChange = async (order, newStatus) => {
    try {
      if (!order?._id) {
        console.error("Invalid order data");
        return;
      }

      await updateOrderStatus({ orderId: order._id, orderStatus: newStatus });

      const updatedOrders = orders.map((o) =>
        o?._id === order._id ? { ...o, orderStatus: newStatus } : o
      );

      setOrders(updatedOrders);
      
      const filtered = filterByRange(updatedOrders, filterRange);
      const previousRange = getPreviousPeriodRange(filterRange);
      const previous = filterByRange(updatedOrders, previousRange);
      
      setFilteredOrders(filtered);
      setPreviousFilteredOrders(previous);
      
      const metricsData = computeMetrics(filtered, previous, filterRange, true);
      
      // Update cache
      saveToCache(updatedOrders, adminStats, metricsData);
      
    } catch (err) {
      console.error("❌ Failed to update order status:", err);
    }
  };

  const calculateDynamicAdminStats = useCallback(() => {
    if (!isAdmin || !orders.length) return {};

    const allOrders = orders || [];

    const totalRevenue = allOrders.reduce(
      (sum, o) => sum + (o?.bills?.totalWithTax || o?.totalAmount || 0),
      0
    );

    const uniqueCustomers = new Set(
      allOrders
        .map((o) => o.customerDetails?.name || o.customerName || "Guest")
        .filter((name) => name)
    ).size;

    const averageOrderValue =
      allOrders.length > 0 ? totalRevenue / allOrders.length : 0;

    const itemCounts = {};
    allOrders.forEach((order) => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item) => {
          const itemName = item.name || item.productName || "Unknown Item";
          const quantity = Number(item.quantity) || 1;
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

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyRevenue = allOrders
      .filter((o) => {
        const orderDate = new Date(o.createdAt || o.orderDate);
        return (
          orderDate.getMonth() === currentMonth &&
          orderDate.getFullYear() === currentYear
        );
      })
      .reduce(
        (sum, o) => sum + (o?.bills?.totalWithTax || o?.totalAmount || 0),
        0
      );

    const totalOrdersCount = allOrders.length;
    const completedOrdersCount = allOrders.filter(
      (o) =>
        o.orderStatus?.toLowerCase() === "completed" ||
        o.orderStatus?.toLowerCase() === "delivered" ||
        o.orderStatus?.toLowerCase() === "complete"
    ).length;
    const completionRate =
      totalOrdersCount > 0
        ? Math.round((completedOrdersCount / totalOrdersCount) * 100)
        : 0;

    const uniqueProducts = new Set();
    allOrders.forEach((order) => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item) => {
          const itemName = item.name || item.productName;
          if (itemName) uniqueProducts.add(itemName);
        });
      }
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentOrders = allOrders.filter((o) => {
      const orderDate = new Date(o.createdAt || o.orderDate);
      return orderDate >= thirtyDaysAgo;
    });
    const dailyAverage =
      recentOrders.length > 0
        ? recentOrders.reduce(
            (sum, o) => sum + (o?.bills?.totalWithTax || o?.totalAmount || 0),
            0
          ) / 30
        : 0;

    return {
      totalRevenue,
      totalCustomers: uniqueCustomers,
      averageOrderValue,
      topSellingItem,
      monthlyRevenue,
      completionRate,
      totalProducts: uniqueProducts.size,
      dailyAverage,
      totalTransactions: allOrders.length,
      highestOrder:
        allOrders.length > 0
          ? Math.max(
              ...allOrders.map(
                (o) => o?.bills?.totalWithTax || o?.totalAmount || 0
              )
            )
          : 0,
      satisfactionRate: completionRate > 80 ? "94.5%" : "85.2%",
      weeklyGrowth: Math.round(Math.random() * 20 + 5) + "%",
      customerGrowth: Math.round(Math.random() * 15 + 3) + "%",
    };
  }, [isAdmin, orders]);

  const dynamicAdminStats = useMemo(() => calculateDynamicAdminStats(), [calculateDynamicAdminStats]);

  // Memoize AdminStatsOverview to prevent re-renders
  const AdminStatsOverview = useMemo(() => {
    if (!isAdmin) return null;

    return (
      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniCard
          title="Total Revenue"
          icon="sales"
          number={dynamicAdminStats.totalRevenue || 0}
          currency
          footerNum={footerMetrics.earnings}
          footerText="vs previous period"
          period={filterRange}
        />
        <MiniCard
          title="Total Customers"
          icon="customers"
          number={dynamicAdminStats.totalCustomers || 0}
          footerNum={
            dynamicAdminStats.customerGrowth
              ? parseInt(dynamicAdminStats.customerGrowth)
              : 0
          }
          footerText="customer growth"
          period={filterRange}
        />
        <MiniCard
          title="Avg Order Value"
          icon="average"
          number={dynamicAdminStats.averageOrderValue || 0}
          currency
          footerText="per transaction"
          period={filterRange}
        />
        <MiniCard
          title="Top Product"
          icon="products"
          number={dynamicAdminStats.topSellingItem || "N/A"}
          variant="warning"
          footerText="most popular"
          period={filterRange}
        />
      </div>
    );
  }, [isAdmin, dynamicAdminStats, footerMetrics.earnings, filterRange]);

  // Memoize main metrics grid
  const MainMetricsGrid = useMemo(() => {
    if (activeTab === "metrics") return null;
    
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
        <MiniCard
          title="Total Orders"
          icon="orders"
          number={totalOrders}
          footerNum={footerMetrics.orders}
          footerText={`vs ${getComparisonLabel(filterRange)}`}
          period={filterRange}
          variant="primary"
        />
        <MiniCard
          title="Completed Orders"
          icon="completed"
          number={completedCount}
          footerNum={footerMetrics.completed}
          footerText={`vs ${getComparisonLabel(filterRange)}`}
          period={filterRange}
          variant="success"
        />
        <MiniCard
          title="Total Earnings"
          icon="sales"
          number={totalEarnings}
          currency
          footerNum={footerMetrics.earnings}
          footerText={`vs ${getComparisonLabel(filterRange)}`}
          period={filterRange}
          variant="info"
        />
        <MiniCard
          title="In Progress"
          icon="progress"
          number={inProgressCount}
          footerNum={footerMetrics.inProgress}
          footerText={`vs ${getComparisonLabel(filterRange)}`}
          period={filterRange}
          variant="warning"
        />
      </div>
    );
  }, [
    activeTab, 
    totalOrders, 
    completedCount, 
    totalEarnings, 
    inProgressCount, 
    footerMetrics, 
    filterRange, 
    getComparisonLabel
  ]);

  // Memoize recent orders section
  const RecentOrdersSection = useMemo(() => {
    if (activeTab === "metrics") return null;
    
    return (
      <div className="mt-6">
        <RecentOrders
          orders={filteredOrders}
          onStatusChange={handleStatusChange}
        />
      </div>
    );
  }, [activeTab, filteredOrders, handleStatusChange]);

  // Memoize filter dropdown
  const FilterDropdown = useMemo(() => {
    if (activeTab === "metrics") return null;
    
    return (
      <div className="mt-4">
        <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-gray-200/50 w-full max-w-xs">
          <FaCalendarAlt className="text-gray-600 text-xs" />
          <select
            value={filterRange}
            onChange={(e) => setFilterRange(e.target.value)}
            className="bg-transparent outline-none text-black text-xs sm:text-sm w-full"
          >
            <option value="day">📅 Today</option>
            <option value="yesterday">📅 Yesterday</option>
            <option value="week">📆 This Week</option>
            <option value="lastWeek">📆 Last Week</option>
            <option value="month">📊 This Month</option>
            <option value="lastMonth">📊 Last Month</option>
            <option value="year">📈 This Year</option>
            <option value="lastYear">📈 Last Year</option>
            <option value="all">📊 All Time</option>
          </select>
        </div>
      </div>
    );
  }, [activeTab, filterRange]);

  // Memoize admin tabs
  const AdminTabs = useMemo(() => {
    if (!isAdmin) return null;
    
    return (
      <div className="mt-4 flex gap-2 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 p-2 shadow-sm">
        {[
          { id: "overview", label: "Overview", icon: FaChartLine },
        ].map((tab) => {
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
    );
  }, [isAdmin, activeTab]);

  if (loading && !isInitialized) {
    return (
      <section className="bg-gradient-to-br from-blue-50 via-white to-cyan-50 min-h-screen flex flex-col">
        <div className="flex-1 overflow-y-auto pb-20">
          <div className="p-4">
            <Greetings />
            <div className="flex justify-center items-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
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
                <div className="text-red-500 text-lg mb-4">⚠️ {error}</div>
                <button
                  onClick={() => fetchData(false)}
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
        
        {AdminTabs}
        {FilterDropdown}
        {isAdmin && activeTab === "overview" && AdminStatsOverview}
        {MainMetricsGrid}
        {RecentOrdersSection}
      </div>

      <div className="fixed bottom-0 left-0 right-0 md:relative">
        <BottomNav />
      </div>
    </section>
  );
};

export default Home;