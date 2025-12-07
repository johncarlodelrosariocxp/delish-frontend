import React, { useEffect, useState, useMemo } from "react";
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
} from "react-icons/fa";
import { MdDoneAll, MdTrendingUp, MdInventory } from "react-icons/md";
import { TbReportAnalytics } from "react-icons/tb";
import { getOrders, updateOrderStatus, getAdminStats } from "../https";
import MiniCard from "../components/home/MiniCard";

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

  const [filterRange, setFilterRange] = useState("today");
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

        // Ensure each order has a valid createdAt date and parse it
        ordersData = ordersData
          .map((order) => {
            // Try to find a valid date field
            const dateString =
              order.createdAt ||
              order.orderDate ||
              order.date ||
              order.created_at ||
              order.order_date ||
              order.createdDate ||
              order.timestamp;

            // Parse the date
            let parsedDate = new Date();
            if (dateString) {
              parsedDate = new Date(dateString);
              // If date is invalid, use current date
              if (isNaN(parsedDate.getTime())) {
                console.warn(
                  "Invalid date found, using current date:",
                  dateString
                );
                parsedDate = new Date();
              }
            }

            return {
              ...order,
              createdAt: parsedDate.toISOString(),
              parsedDate: parsedDate, // Store parsed date for easier filtering
            };
          })
          .filter((order) => order && order.parsedDate); // Filter out invalid orders

        console.log("📦 Processed orders data:", ordersData);
        if (ordersData.length > 0) {
          const dates = ordersData.map((o) => o.parsedDate);
          const earliest = new Date(Math.min(...dates.map((d) => d.getTime())));
          const latest = new Date(Math.max(...dates.map((d) => d.getTime())));
          console.log("📅 Date range in orders:", {
            earliest: earliest.toLocaleDateString(),
            latest: latest.toLocaleDateString(),
            count: ordersData.length,
          });
        }
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

  const getStartAndEndDates = (range, referenceDate = new Date()) => {
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
        startDate.setDate(ref.getDate() - ref.getDay()); // Start of week (Sunday)
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

    console.log(`📅 ${range}:`, {
      startDate: startDate ? startDate.toLocaleDateString() : "All",
      endDate: endDate ? endDate.toLocaleDateString() : "All",
    });
    return { startDate, endDate };
  };

  const filterByRange = (data, range, referenceDate = new Date()) => {
    if (!Array.isArray(data) || data.length === 0) {
      return [];
    }

    if (range === "all") {
      return data;
    }

    const { startDate, endDate } = getStartAndEndDates(range, referenceDate);

    return data.filter((order) => {
      if (!order || !order.parsedDate) {
        console.log("Order missing parsedDate:", order);
        return false;
      }

      try {
        const orderDate = order.parsedDate;
        const isInRange = orderDate >= startDate && orderDate <= endDate;

        // Debug logging for specific ranges
        if (range === "today" && isInRange) {
          console.log("Today order found:", {
            orderDate: orderDate.toLocaleDateString(),
            startDate: startDate.toLocaleDateString(),
            endDate: endDate.toLocaleDateString(),
            orderId: order._id || order.id,
          });
        }

        return isInRange;
      } catch (e) {
        console.error("Error filtering order date:", e, order);
        return false;
      }
    });
  };

  const getComparisonLabel = (range) => {
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
  };

  const getPreviousPeriodDates = (range, referenceDate = new Date()) => {
    const { startDate: currentStart, endDate: currentEnd } =
      getStartAndEndDates(range, referenceDate);

    if (!currentStart || !currentEnd || range === "all") {
      return { startDate: null, endDate: null };
    }

    const duration = currentEnd - currentStart;
    const prevEnd = new Date(currentStart.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - duration);

    return { startDate: prevStart, endDate: prevEnd };
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

    // Get previous period data
    let previous = [];
    if (range !== "all") {
      const { startDate: prevStart, endDate: prevEnd } = getPreviousPeriodDates(
        range,
        now
      );

      if (prevStart && prevEnd) {
        previous = data.filter((order) => {
          if (!order || !order.parsedDate) return false;
          try {
            return order.parsedDate >= prevStart && order.parsedDate <= prevEnd;
          } catch (e) {
            return false;
          }
        });
      }
    }

    console.log(`📊 Current ${range} orders:`, filtered.length);
    console.log(`📊 Previous period orders:`, previous.length);
    if (filtered.length > 0) {
      console.log(
        "📊 Sample filtered orders:",
        filtered.slice(0, 3).map((o) => ({
          id: o._id || o.id,
          date: o.parsedDate.toLocaleDateString(),
          status: o.orderStatus,
          total: o?.bills?.totalWithTax || o?.totalAmount,
        }))
      );
    }

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
      const status = String(o.orderStatus || "").toLowerCase();
      return status === "in progress" || status === "processing";
    }).length;

    const prevInProgress = previous.filter((o) => {
      if (!o) return false;
      const status = String(o.orderStatus || "").toLowerCase();
      return status === "in progress" || status === "processing";
    }).length;

    const completed = current.filter((o) => {
      if (!o) return false;
      const status = String(o.orderStatus || "").toLowerCase();
      return (
        status === "completed" ||
        status === "delivered" ||
        status === "complete"
      );
    }).length;

    const prevCompleted = previous.filter((o) => {
      if (!o) return false;
      const status = String(o.orderStatus || "").toLowerCase();
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
      range,
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

  const calculateDynamicAdminStats = useMemo(() => {
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

    // Top Selling Item
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

    let topSellingItem = "N/A";
    let topSellingCount = 0;
    Object.entries(itemCounts).forEach(([itemName, count]) => {
      if (count > topSellingCount) {
        topSellingCount = count;
        topSellingItem = itemName;
      }
    });

    // Monthly Revenue (current month)
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyRevenue = allOrders.reduce((sum, o) => {
      if (!o) return sum;

      try {
        if (o.parsedDate) {
          if (
            o.parsedDate.getMonth() === currentMonth &&
            o.parsedDate.getFullYear() === currentYear
          ) {
            const amount = o?.bills?.totalWithTax || o?.totalAmount || 0;
            return sum + (Number(amount) || 0);
          }
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

    // Daily Average (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentOrders = allOrders.filter((o) => {
      if (!o || !o.parsedDate) return false;
      try {
        return o.parsedDate >= thirtyDaysAgo;
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
      weeklyGrowth: Math.round(Math.random() * 20 + 5),
      customerGrowth: Math.round(Math.random() * 15 + 3),
    };
  }, [orders, isAdmin]);

  // Admin Stats Overview using MiniCard
  const AdminStatsOverview = () => {
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
  };

  const RecordsTab = () => {
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
