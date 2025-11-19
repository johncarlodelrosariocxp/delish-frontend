import React, { useEffect, useState } from "react";
import BottomNav from "../components/shared/BottomNav";
import Greetings from "../components/home/Greetings";
import { BsCashCoin } from "react-icons/bs";
import { GrInProgress } from "react-icons/gr";
import { FaChartLine } from "react-icons/fa";
import { MdDoneAll } from "react-icons/md";
import RecentOrders from "../components/home/RecentOrders";
import { getOrders, updateOrderStatus } from "../https";

const Home = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [previousFilteredOrders, setPreviousFilteredOrders] = useState([]);

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

  const [filterRange, setFilterRange] = useState("day");

  useEffect(() => {
    document.title = "POS | Home";

    const fetchOrders = async () => {
      try {
        const res = await getOrders();
        const raw = res?.data;
        const data = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.data)
          ? raw.data
          : Array.isArray(raw?.orders)
          ? raw.orders
          : [];

        setOrders(data || []);
        applyFilter(data || [], filterRange);
      } catch (err) {
        console.error("❌ Failed to fetch orders:", err);
        setOrders([]);
      }
    };

    fetchOrders();
  }, []);

  useEffect(() => {
    applyFilter(orders, filterRange);
  }, [filterRange, orders]);

  // --- Helper: Filter orders by range ---
  const filterByRange = (data, range, referenceDate) => {
    if (!Array.isArray(data)) return [];

    try {
      const ref = new Date(referenceDate);
      return data.filter((order) => {
        if (!order) return false;

        const orderDate = new Date(
          order.createdAt || order.orderDate || order.date || Date.now()
        );

        // Handle invalid dates
        if (isNaN(orderDate.getTime())) return false;

        if (range === "day") {
          return (
            orderDate.getDate() === ref.getDate() &&
            orderDate.getMonth() === ref.getMonth() &&
            orderDate.getFullYear() === ref.getFullYear()
          );
        }

        if (range === "yesterday") {
          const yesterday = new Date(ref);
          yesterday.setDate(ref.getDate() - 1);
          return (
            orderDate.getDate() === yesterday.getDate() &&
            orderDate.getMonth() === yesterday.getMonth() &&
            orderDate.getFullYear() === yesterday.getFullYear()
          );
        }

        if (range === "week") {
          const startOfWeek = new Date(ref);
          startOfWeek.setDate(ref.getDate() - ref.getDay());
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          endOfWeek.setHours(23, 59, 59, 999);
          return orderDate >= startOfWeek && orderDate <= endOfWeek;
        }

        if (range === "lastWeek") {
          const startOfLastWeek = new Date(ref);
          startOfLastWeek.setDate(ref.getDate() - ref.getDay() - 7);
          const endOfLastWeek = new Date(startOfLastWeek);
          endOfLastWeek.setDate(startOfLastWeek.getDate() + 6);
          endOfLastWeek.setHours(23, 59, 59, 999);
          return orderDate >= startOfLastWeek && orderDate <= endOfLastWeek;
        }

        if (range === "month") {
          return (
            orderDate.getMonth() === ref.getMonth() &&
            orderDate.getFullYear() === ref.getFullYear()
          );
        }

        if (range === "lastMonth") {
          const lastMonth = new Date(ref);
          lastMonth.setMonth(ref.getMonth() - 1);
          return (
            orderDate.getMonth() === lastMonth.getMonth() &&
            orderDate.getFullYear() === lastMonth.getFullYear()
          );
        }

        if (range === "year") {
          return orderDate.getFullYear() === ref.getFullYear();
        }

        if (range === "lastYear") {
          return orderDate.getFullYear() === ref.getFullYear() - 1;
        }

        return true;
      });
    } catch (error) {
      console.error("Error in filterByRange:", error);
      return [];
    }
  };

  // --- Helper: Get previous period start ---
  const getPreviousPeriodStart = (now, range) => {
    const prev = new Date(now);

    try {
      switch (range) {
        case "day":
          prev.setDate(now.getDate() - 1);
          break;
        case "yesterday":
          prev.setDate(now.getDate() - 2);
          break;
        case "week":
          prev.setDate(now.getDate() - 7);
          break;
        case "lastWeek":
          prev.setDate(now.getDate() - 14);
          break;
        case "month":
          prev.setMonth(now.getMonth() - 1);
          break;
        case "lastMonth":
          prev.setMonth(now.getMonth() - 2);
          break;
        case "year":
          prev.setFullYear(now.getFullYear() - 1);
          break;
        case "lastYear":
          prev.setFullYear(now.getFullYear() - 2);
          break;
        default:
          break;
      }
    } catch (error) {
      console.error("Error in getPreviousPeriodStart:", error);
    }

    return prev;
  };

  // --- Helper: Get comparison label ---
  const getComparisonLabel = (range) => {
    switch (range) {
      case "day":
        return "yesterday";
      case "yesterday":
        return "day before yesterday";
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

  // --- Helper: Get correct previous period for comparison ---
  const getPreviousPeriodRange = (range) => {
    switch (range) {
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
  };

  // --- Main filter + metrics computation ---
  const applyFilter = (data, range) => {
    if (!Array.isArray(data)) {
      setFilteredOrders([]);
      setPreviousFilteredOrders([]);
      computeMetrics([], [], range);
      return;
    }

    try {
      const now = new Date();
      const filtered = filterByRange(data, range, now);

      // Get the correct previous period for comparison
      const previousRange = getPreviousPeriodRange(range);
      const previousPeriodStart = getPreviousPeriodStart(now, range);
      const previous = filterByRange(data, previousRange, previousPeriodStart);

      setFilteredOrders(filtered || []);
      setPreviousFilteredOrders(previous || []);
      computeMetrics(filtered || [], previous || [], range);
    } catch (error) {
      console.error("Error in applyFilter:", error);
      setFilteredOrders([]);
      setPreviousFilteredOrders([]);
      computeMetrics([], [], range);
    }
  };

  // --- Accurate % Growth with 100% maximum limit ---
  const calcGrowth = (current, previous) => {
    try {
      const currentNum = Number(current) || 0;
      const previousNum = Number(previous) || 0;

      if (previousNum === 0 && currentNum === 0) return 0;
      if (previousNum === 0 && currentNum > 0) return 100; // Max 100% when going from 0 to positive
      if (previousNum > 0 && currentNum === 0) return -100; // Min -100% when going to 0

      const growth = ((currentNum - previousNum) / previousNum) * 100;

      // Cap growth at ±100% maximum
      const cappedGrowth = Math.max(Math.min(growth, 100), -100);

      return Number.isFinite(cappedGrowth)
        ? Number(cappedGrowth.toFixed(1))
        : 0;
    } catch (error) {
      console.error("Error in calcGrowth:", error);
      return 0;
    }
  };

  // --- Compute totals + footer growth % ---
  const computeMetrics = (current, previous, range) => {
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

    try {
      const total = current.length;
      const prevTotal = previous.length;

      const earnings = current
        .filter((o) => {
          if (!o) return false;
          const status = o.orderStatus?.toLowerCase();
          return status === "completed" || status === "delivered";
        })
        .reduce((sum, o) => {
          const amount =
            o?.bills?.totalWithTax || o?.totalAmount || o?.total || 0;
          return sum + (Number(amount) || 0);
        }, 0);

      const prevEarnings = previous
        .filter((o) => {
          if (!o) return false;
          const status = o.orderStatus?.toLowerCase();
          return status === "completed" || status === "delivered";
        })
        .reduce((sum, o) => {
          const amount =
            o?.bills?.totalWithTax || o?.totalAmount || o?.total || 0;
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
        return status === "completed" || status === "delivered";
      }).length;

      const prevCompleted = previous.filter((o) => {
        if (!o) return false;
        const status = o.orderStatus?.toLowerCase();
        return status === "completed" || status === "delivered";
      }).length;

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
    } catch (error) {
      console.error("Error in computeMetrics:", error);
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
    }
  };

  // --- Handle order status change ---
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
    } catch (err) {
      console.error("❌ Failed to update order status:", err);
    }
  };

  // --- Format percentage display ---
  const formatPercentage = (value) => {
    if (value === 0) return "0%";
    if (value > 0) return `+${Math.min(Math.abs(value), 100).toFixed(1)}%`;
    if (value < 0) return `-${Math.min(Math.abs(value), 100).toFixed(1)}%`;
    return "0%";
  };

  return (
    <section className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 text-gray-900 min-h-screen overflow-hidden flex flex-col">
      {/* Scrollable Content Wrapper */}
      <div className="flex-1 overflow-y-auto pb-20">
        <div className="p-4">
          <Greetings />

          {/* Filter Dropdown - Light Glass Design */}
          <div className="mt-6">
            <select
              value={filterRange}
              onChange={(e) => setFilterRange(e.target.value)}
              className="w-full max-w-xs px-4 py-3 rounded-xl border border-gray-300 bg-white/80 backdrop-blur-xl text-sm font-medium text-gray-900 shadow-lg hover:shadow-blue-200 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-gradient-to-r from-blue-50 to-indigo-100"
            >
              <option value="day" className="bg-white">
                📅 Today
              </option>
              <option value="yesterday" className="bg-white">
                📅 Yesterday
              </option>
              <option value="week" className="bg-white">
                📆 This Week
              </option>
              <option value="lastWeek" className="bg-white">
                📆 Last Week
              </option>
              <option value="month" className="bg-white">
                📊 This Month
              </option>
              <option value="lastMonth" className="bg-white">
                📊 Last Month
              </option>
              <option value="year" className="bg-white">
                📈 This Year
              </option>
              <option value="lastYear" className="bg-white">
                📈 Last Year
              </option>
            </select>
          </div>

          {/* Metrics Grid - Light Glass Layout */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200 p-4 shadow-lg hover:shadow-blue-200 transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-gradient-to-r from-blue-100 to-cyan-100">
                  <FaChartLine className="text-blue-600 text-lg" />
                </div>
                <span className="text-xs font-medium text-gray-600">
                  ORDERS
                </span>
              </div>
              <div className="mt-3">
                <h3 className="text-2xl font-bold text-gray-900">
                  {totalOrders.toLocaleString()}
                </h3>
                <div className="flex items-center gap-1 mt-1">
                  <span
                    className={`text-xs font-medium ${
                      footerMetrics.orders >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {formatPercentage(footerMetrics.orders)}
                  </span>
                  <span className="text-xs text-gray-600">
                    vs {getComparisonLabel(filterRange)}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200 p-4 shadow-lg hover:shadow-green-200 transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-gradient-to-r from-green-100 to-emerald-100">
                  <MdDoneAll className="text-green-600 text-lg" />
                </div>
                <span className="text-xs font-medium text-gray-600">
                  COMPLETED
                </span>
              </div>
              <div className="mt-3">
                <h3 className="text-2xl font-bold text-gray-900">
                  {completedCount.toLocaleString()}
                </h3>
                <div className="flex items-center gap-1 mt-1">
                  <span
                    className={`text-xs font-medium ${
                      footerMetrics.completed >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {formatPercentage(footerMetrics.completed)}
                  </span>
                  <span className="text-xs text-gray-600">
                    vs {getComparisonLabel(filterRange)}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200 p-4 shadow-lg hover:shadow-yellow-200 transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-gradient-to-r from-yellow-100 to-amber-100">
                  <BsCashCoin className="text-yellow-600 text-lg" />
                </div>
                <span className="text-xs font-medium text-gray-600">
                  EARNINGS
                </span>
              </div>
              <div className="mt-3">
                <h3 className="text-2xl font-bold text-gray-900">
                  ₱
                  {totalEarnings.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </h3>
                <div className="flex items-center gap-1 mt-1">
                  <span
                    className={`text-xs font-medium ${
                      footerMetrics.earnings >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {formatPercentage(footerMetrics.earnings)}
                  </span>
                  <span className="text-xs text-gray-600">
                    vs {getComparisonLabel(filterRange)}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200 p-4 shadow-lg hover:shadow-orange-200 transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-gradient-to-r from-orange-100 to-red-100">
                  <GrInProgress className="text-orange-600 text-lg" />
                </div>
                <span className="text-xs font-medium text-gray-600">
                  IN PROGRESS
                </span>
              </div>
              <div className="mt-3">
                <h3 className="text-2xl font-bold text-gray-900">
                  {inProgressCount.toLocaleString()}
                </h3>
                <div className="flex items-center gap-1 mt-1">
                  <span
                    className={`text-xs font-medium ${
                      footerMetrics.inProgress >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {formatPercentage(footerMetrics.inProgress)}
                  </span>
                  <span className="text-xs text-gray-600">
                    vs {getComparisonLabel(filterRange)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Orders Section */}
          <div className="mt-6 mb-8">
            <RecentOrders
              orders={filteredOrders}
              onStatusChange={handleStatusChange}
            />
          </div>
        </div>
      </div>

      <BottomNav />
    </section>
  );
};

export default Home;
