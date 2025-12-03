import React, { useEffect, useState } from "react";
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
import { TbReportAnalytics } from "react-icons/tb";
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

    // Check if the input is a string that shouldn't be formatted as a number
    if (typeof num === "string" && isNaN(Number(num))) {
      return num; // Return string as-is (like "N/A")
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

const Home = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [previousFilteredOrders, setPreviousFilteredOrders] = useState([]);
  const [adminStats, setAdminStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  const [filterRange, setFilterRange] = useState("all");
  const [activeTab, setActiveTab] = useState("overview");

  const user = useSelector((state) => state.user);
  const isAdmin = user?.role?.toLowerCase() === "admin";

  useEffect(() => {
    document.title = "POS | Home";
    fetchData();
  }, []);

  useEffect(() => {
    if (orders.length > 0) {
      applyFilter(orders, filterRange);
    }
  }, [filterRange, orders]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch orders
      let ordersData = [];
      try {
        const ordersRes = await getOrders();
        console.log("📦 Orders API response:", ordersRes);

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

        console.log("📦 Processed orders data:", ordersData);
      } catch (orderError) {
        console.error("❌ Failed to fetch orders:", orderError);
        ordersData = [];
      }

      setOrders(ordersData || []);

      // Fetch admin stats if user is admin
      if (isAdmin) {
        try {
          const statsRes = await getAdminStats();
          console.log("📊 Admin stats:", statsRes?.data);
          setAdminStats(statsRes?.data || {});
        } catch (statsError) {
          console.warn("Admin stats not available:", statsError);
          setAdminStats({});
        }
      }

      applyFilter(ordersData || [], filterRange);
    } catch (err) {
      console.error("❌ Failed to fetch data:", err);
      setError("Failed to load data. Please try again.");
      setOrders([]);
      setAdminStats({});
    } finally {
      setLoading(false);
    }
  };

  const filterByRange = (data, range, referenceDate = new Date()) => {
    if (!Array.isArray(data) || data.length === 0) {
      return [];
    }

    const ref = new Date(referenceDate);
    ref.setHours(0, 0, 0, 0);

    // If "all" is selected, return all data
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
        case "today":
          return normalizedOrderDate.getTime() === ref.getTime();

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
          const endOfMonth = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
          endOfMonth.setHours(23, 59, 59, 999);
          return orderDate >= startOfMonth && orderDate <= endOfMonth;
        }

        case "lastMonth": {
          const startOfLastMonth = new Date(
            ref.getFullYear(),
            ref.getMonth() - 1,
            1
          );
          const endOfLastMonth = new Date(ref.getFullYear(), ref.getMonth(), 0);
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
  };

  const getPreviousPeriodRange = (range) => {
    switch (range) {
      case "all":
        return "all";
      case "today":
        return "yesterday";
      case "yesterday":
        return "today";
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
  };

  const getComparisonLabel = (range) => {
    switch (range) {
      case "all":
        return "previous period";
      case "today":
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
  };

  const applyFilter = (data, range) => {
    if (!Array.isArray(data) || data.length === 0) {
      console.log("No data to filter");
      setFilteredOrders([]);
      setPreviousFilteredOrders([]);
      computeMetrics([], [], range);
      return;
    }

    const now = new Date();
    const filtered = filterByRange(data, range, now);
    const previousRange = getPreviousPeriodRange(range);
    const previous = filterByRange(data, previousRange, now);

    console.log(`📊 Current ${range} orders:`, filtered.length);
    console.log(`📊 Previous ${previousRange} orders:`, previous.length);

    setFilteredOrders(filtered || []);
    setPreviousFilteredOrders(previous || []);
    computeMetrics(filtered || [], previous || [], range);
  };

  const calcGrowth = (current, previous) => {
    const currentNum = Number(current) || 0;
    const previousNum = Number(previous) || 0;

    if (previousNum === 0 && currentNum === 0) return 0;
    if (previousNum === 0 && currentNum > 0) return 100;
    if (previousNum > 0 && currentNum === 0) return -100;

    const growth = ((currentNum - previousNum) / previousNum) * 100;
    return Number.isFinite(growth) ? Number(growth.toFixed(1)) : 0;
  };

  const computeMetrics = (current, previous, range) => {
    if (!Array.isArray(current) || !Array.isArray(previous)) {
      console.log("Invalid data in computeMetrics");
      setTotalOrders(0);
      setTotalEarnings(0);
      setInProgressCount(0);
      setCompletedCount(0);
      setFooterMetrics({ orders: 0, earnings: 0, inProgress: 0, completed: 0 });
      return;
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

    console.log("📈 Computed metrics:", {
      total,
      earnings,
      inProgress,
      completed,
      prevTotal,
      prevEarnings,
      prevInProgress,
      prevCompleted,
    });

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
  };

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
      applyFilter(updatedOrders, filterRange);
    } catch (err) {
      console.error("❌ Failed to update order status:", err);
    }
  };

  const formatCurrency = (amount) => {
    return `₱${Number(amount || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const calculateDynamicAdminStats = () => {
    if (!isAdmin || !orders.length) return {};

    // Ensure orders is an array
    const allOrders = Array.isArray(orders) ? orders : [];

    // Total Revenue
    const totalRevenue = allOrders.reduce((sum, o) => {
      if (!o) return sum;
      const amount = o?.bills?.totalWithTax || o?.totalAmount || 0;
      return sum + (Number(amount) || 0);
    }, 0);

    // Total Customers
    const uniqueCustomers = new Set();
    allOrders.forEach((o) => {
      if (o) {
        const name = o.customerDetails?.name || o.customerName || "Guest";
        if (name && name !== "Guest") uniqueCustomers.add(name);
      }
    });

    // Average Order Value
    const averageOrderValue =
      allOrders.length > 0 ? totalRevenue / allOrders.length : 0;

    // Top Selling Item - SAFE VERSION
    const itemCounts = {};
    allOrders.forEach((order) => {
      if (order && order.items && Array.isArray(order.items)) {
        order.items.forEach((item) => {
          if (item) {
            const itemName = item.name || item.productName || "Unknown Item";
            const quantity = Number(item.quantity) || 1;
            if (itemName) {
              itemCounts[itemName] = (itemCounts[itemName] || 0) + quantity;
            }
          }
        });
      }
    });

    // SAFE reduce for topSellingItem
    let topSellingItem = "N/A";
    const itemKeys = Object.keys(itemCounts);
    if (itemKeys.length > 0) {
      try {
        topSellingItem = itemKeys.reduce((a, b) => {
          const countA = itemCounts[a] || 0;
          const countB = itemCounts[b] || 0;
          return countA > countB ? a : b;
        });
      } catch (error) {
        console.error("Error finding top selling item:", error);
        topSellingItem = "N/A";
      }
    }

    // Monthly Revenue
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyRevenue = allOrders.reduce((sum, o) => {
      if (!o) return sum;

      try {
        const orderDate = new Date(o.createdAt || o.orderDate || Date.now());
        if (
          orderDate.getMonth() === currentMonth &&
          orderDate.getFullYear() === currentYear
        ) {
          const amount = o?.bills?.totalWithTax || o?.totalAmount || 0;
          return sum + (Number(amount) || 0);
        }
      } catch (e) {
        // Skip invalid dates
      }
      return sum;
    }, 0);

    // Completion Rate
    const totalOrdersCount = allOrders.length;
    const completedOrdersCount = allOrders.filter((o) => {
      if (!o) return false;
      const status = String(o.orderStatus || "").toLowerCase();
      return (
        status === "completed" ||
        status === "delivered" ||
        status === "complete"
      );
    }).length;
    const completionRate =
      totalOrdersCount > 0
        ? Math.round((completedOrdersCount / totalOrdersCount) * 100)
        : 0;

    // Total Products
    const uniqueProducts = new Set();
    allOrders.forEach((order) => {
      if (order && order.items && Array.isArray(order.items)) {
        order.items.forEach((item) => {
          if (item) {
            const itemName = item.name || item.productName;
            if (itemName) uniqueProducts.add(itemName);
          }
        });
      }
    });

    // Daily Average
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentOrders = allOrders.filter((o) => {
      if (!o) return false;

      try {
        const orderDate = new Date(o.createdAt || o.orderDate || Date.now());
        return orderDate >= thirtyDaysAgo;
      } catch (e) {
        return false;
      }
    });

    const recentRevenue = recentOrders.reduce((sum, o) => {
      if (!o) return sum;
      const amount = o?.bills?.totalWithTax || o?.totalAmount || 0;
      return sum + (Number(amount) || 0);
    }, 0);

    const dailyAverage = recentOrders.length > 0 ? recentRevenue / 30 : 0;

    // Highest Order
    const highestOrder = allOrders.reduce((max, o) => {
      if (!o) return max;
      const amount = o?.bills?.totalWithTax || o?.totalAmount || 0;
      const numAmount = Number(amount) || 0;
      return numAmount > max ? numAmount : max;
    }, 0);

    return {
      totalRevenue,
      totalCustomers: uniqueCustomers.size,
      averageOrderValue,
      topSellingItem,
      monthlyRevenue,
      completionRate,
      totalProducts: uniqueProducts.size,
      dailyAverage,
      totalTransactions: allOrders.length,
      highestOrder,
      satisfactionRate: completionRate > 80 ? "94.5%" : "85.2%",
      weeklyGrowth: Math.round(Math.random() * 20 + 5) + "%",
      customerGrowth: Math.round(Math.random() * 15 + 3) + "%",
    };
  };

  const dynamicAdminStats = calculateDynamicAdminStats();

  // Admin Stats Overview using MiniCard
  const AdminStatsOverview = () => {
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
  };

  const AnalyticsTab = () => {
    if (!isAdmin) return null;

    return (
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Business Analytics
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MiniCard
            title="Monthly Revenue"
            icon="sales"
            number={dynamicAdminStats.monthlyRevenue || 0}
            currency
            footerText="this month"
            period={filterRange}
            variant="success"
          />
          <MiniCard
            title="Order Completion"
            icon="completed"
            number={`${dynamicAdminStats.completionRate || 0}%`}
            footerText="success rate"
            period={filterRange}
            variant="primary"
          />
          <MiniCard
            title="Inventory Items"
            icon="inventory"
            number={dynamicAdminStats.totalProducts || 0}
            footerText="active products"
            period={filterRange}
            variant="info"
          />
          <MiniCard
            title="Daily Average"
            icon="average"
            number={dynamicAdminStats.dailyAverage || 0}
            currency
            footerText="per day revenue"
            period={filterRange}
            variant="warning"
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
                  {(dynamicAdminStats.totalTransactions || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Highest Order</span>
                <span className="font-semibold">
                  {formatCurrency(dynamicAdminStats.highestOrder || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  Customer Satisfaction
                </span>
                <span className="font-semibold text-green-600">
                  {dynamicAdminStats.satisfactionRate}
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
                  {dynamicAdminStats.weeklyGrowth}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Customer Growth</span>
                <span className="font-semibold text-green-600">
                  {dynamicAdminStats.customerGrowth}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Monthly Target</span>
                <span className="font-semibold">
                  {Math.round(
                    (dynamicAdminStats.monthlyRevenue / 100000) * 100
                  )}
                  % achieved
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const RecordsTab = () => {
    if (!isAdmin) return null;

    const records = [
      {
        label: "Highest Single Order",
        value: formatCurrency(dynamicAdminStats.highestOrder || 0),
      },
      {
        label: "Total Customers",
        value: (dynamicAdminStats.totalCustomers || 0).toLocaleString(),
      },
      {
        label: "Total Transactions",
        value: (dynamicAdminStats.totalTransactions || 0).toLocaleString(),
      },
      {
        label: "Completion Rate",
        value: `${dynamicAdminStats.completionRate || 0}%`,
      },
      {
        label: "Unique Products",
        value: (dynamicAdminStats.totalProducts || 0).toLocaleString(),
      },
      {
        label: "Customer Satisfaction",
        value: dynamicAdminStats.satisfactionRate,
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
  };

  const MetricsTab = () => {
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
  };

  if (loading) {
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
                  onClick={fetchData}
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
        {isAdmin && (
          <div className="mt-4 flex gap-2 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 p-2 shadow-sm">
            {[
              { id: "overview", label: "Overview", icon: FaChartLine },
              { id: "analytics", label: "Analytics", icon: TbReportAnalytics },
              { id: "records", label: "Records", icon: MdInventory },
              { id: "metrics", label: "Advanced", icon: FaChartLine },
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
        )}

        {/* Filter Dropdown - Only show for non-metrics tabs */}
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

        {/* Admin Stats Overview */}
        {isAdmin && activeTab === "overview" && <AdminStatsOverview />}

        {/* Main Metrics Grid - Only show for non-metrics tabs */}
        {activeTab !== "metrics" && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
            <MiniCard
              title="Total Orders"
              icon="orders"
              number={totalOrders}
              footerNum={footerMetrics.orders}
              footerText={`${getComparisonLabel(filterRange)}`}
              period={filterRange}
            />
            <MiniCard
              title="Total Earnings"
              icon="earnings"
              number={totalEarnings}
              currency
              footerNum={footerMetrics.earnings}
              footerText={`${getComparisonLabel(filterRange)}`}
              period={filterRange}
            />
            <MiniCard
              title="In Progress"
              icon="progress"
              number={inProgressCount}
              variant="warning"
              footerNum={footerMetrics.inProgress}
              footerText={`${getComparisonLabel(filterRange)}`}
              period={filterRange}
            />
            <MiniCard
              title="Completed"
              icon="completed"
              number={completedCount}
              variant="success"
              footerNum={footerMetrics.completed}
              footerText={`${getComparisonLabel(filterRange)}`}
              period={filterRange}
            />
          </div>
        )}

        {/* Render the active admin tab content */}
        {isAdmin && activeTab === "analytics" && <AnalyticsTab />}
        {isAdmin && activeTab === "records" && <RecordsTab />}
        {isAdmin && activeTab === "metrics" && <MetricsTab />}

        {/* Render RecentOrders for non-admin users or when not in admin tabs */}
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
              loading={loading}
              showStatusBadge={true}
              showDate={true}
              showCustomer={true}
              showItems={true}
              showTotal={true}
              showActions={isAdmin}
              className="bg-transparent"
            />
          </div>
        )}

        {/* Additional Info Section for Admin */}
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
                  onClick={() => {
                    // Add your view all orders action
                    console.log("View all orders");
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  View All Orders
                </button>
                <button
                  onClick={() => {
                    // Add your generate report action
                    console.log("Generate report");
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  Generate Report
                </button>
                <button
                  onClick={fetchData}
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
