import React, { useEffect, useState } from "react";
import BottomNav from "../components/shared/BottomNav";
import Greetings from "../components/home/Greetings";
import { BsCashCoin } from "react-icons/bs";
import { GrInProgress } from "react-icons/gr";
import { FaChartLine } from "react-icons/fa";
import { MdDoneAll } from "react-icons/md";
import MiniCard from "../components/home/MiniCard";
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
        const raw = res.data;
        const data = Array.isArray(raw)
          ? raw
          : Array.isArray(raw.data)
          ? raw.data
          : Array.isArray(raw.orders)
          ? raw.orders
          : [];

        setOrders(data);
        applyFilter(data, filterRange);
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
    const ref = new Date(referenceDate);
    return data.filter((order) => {
      const orderDate = new Date(order.orderDate);
      if (range === "day") {
        return (
          orderDate.getDate() === ref.getDate() &&
          orderDate.getMonth() === ref.getMonth() &&
          orderDate.getFullYear() === ref.getFullYear()
        );
      }
      if (range === "week") {
        const startOfWeek = new Date(ref);
        startOfWeek.setDate(ref.getDate() - ref.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        return orderDate >= startOfWeek && orderDate <= endOfWeek;
      }
      if (range === "month") {
        return (
          orderDate.getMonth() === ref.getMonth() &&
          orderDate.getFullYear() === ref.getFullYear()
        );
      }
      if (range === "year") {
        return orderDate.getFullYear() === ref.getFullYear();
      }
      return true;
    });
  };

  // --- Helper: Get previous period start ---
  const getPreviousPeriodStart = (now, range) => {
    const prev = new Date(now);
    if (range === "day") prev.setDate(now.getDate() - 1);
    if (range === "week") prev.setDate(now.getDate() - 7);
    if (range === "month") prev.setMonth(now.getMonth() - 1);
    if (range === "year") prev.setFullYear(now.getFullYear() - 1);
    return prev;
  };

  // --- Main filter + metrics computation ---
  const applyFilter = (data, range) => {
    const now = new Date();
    const filtered = filterByRange(data, range, now);
    const previousPeriodStart = getPreviousPeriodStart(now, range);
    const previous = filterByRange(data, range, previousPeriodStart);

    setFilteredOrders(filtered);
    setPreviousFilteredOrders(previous);
    computeMetrics(filtered, previous);
  };

  // --- Accurate % Growth ---
  const calcGrowth = (current, previous) => {
    if (previous === 0 && current === 0) return 0;
    if (previous === 0 && current > 0) return 100;
    if (previous > 0 && current === 0) return -100;

    const growth = ((current - previous) / previous) * 100;
    return Number.isFinite(growth) ? Number(growth.toFixed(1)) : 0;
  };

  // --- Compute totals + footer growth % ---
  const computeMetrics = (current, previous) => {
    if (!Array.isArray(current)) return;

    const total = current.length;
    const prevTotal = previous.length;

    const earnings = current
      .filter((o) => o.orderStatus === "Completed")
      .reduce((sum, o) => sum + (o?.bills?.totalWithTax || 0), 0);

    const prevEarnings = previous
      .filter((o) => o.orderStatus === "Completed")
      .reduce((sum, o) => sum + (o?.bills?.totalWithTax || 0), 0);

    const inProgress = current.filter(
      (o) => o.orderStatus === "In Progress"
    ).length;
    const prevInProgress = previous.filter(
      (o) => o.orderStatus === "In Progress"
    ).length;

    const completed = current.filter(
      (o) => o.orderStatus === "Completed"
    ).length;
    const prevCompleted = previous.filter(
      (o) => o.orderStatus === "Completed"
    ).length;

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

  // --- Handle order status change ---
  const handleStatusChange = async (order, newStatus) => {
    try {
      await updateOrderStatus({ orderId: order._id, orderStatus: newStatus });

      const updatedOrders = orders.map((o) =>
        o._id === order._id ? { ...o, orderStatus: newStatus } : o
      );

      setOrders(updatedOrders);
    } catch (err) {
      console.error("❌ Failed to update order status:", err);
    }
  };

  return (
    <section className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 text-gray-900 h-[calc(100vh-5rem)] overflow-hidden flex gap-4 p-4">
      {/* Scrollable Content Wrapper */}
      <div className="flex-[3] h-full overflow-y-auto">
        <Greetings />

        {/* Filter Dropdown - Light Glass Design */}
        <div className="px-6 mt-6">
          <select
            value={filterRange}
            onChange={(e) => setFilterRange(e.target.value)}
            className="w-full max-w-xs px-4 py-3 rounded-xl border border-gray-300 bg-white/80 backdrop-blur-xl text-sm font-medium text-gray-900 shadow-lg hover:shadow-blue-200 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-gradient-to-r from-blue-50 to-indigo-100"
          >
            <option value="day" className="bg-white">
              📅 Today
            </option>
            <option value="week" className="bg-white">
              📆 This Week
            </option>
            <option value="month" className="bg-white">
              📊 This Month
            </option>
            <option value="year" className="bg-white">
              📈 This Year
            </option>
          </select>
        </div>

        {/* Metrics Grid - Light Glass Layout */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-6 mt-6">
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200 p-4 shadow-lg hover:shadow-blue-200 transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-gradient-to-r from-blue-100 to-cyan-100">
                <FaChartLine className="text-blue-600 text-lg" />
              </div>
              <span className="text-xs font-medium text-gray-600">ORDERS</span>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-bold text-gray-900">
                {totalOrders}
              </h3>
              <div className="flex items-center gap-1 mt-1">
                <span
                  className={`text-xs font-medium ${
                    footerMetrics.orders >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {footerMetrics.orders >= 0 ? "↗" : "↘"}{" "}
                  {Math.abs(footerMetrics.orders)}%
                </span>
                <span className="text-xs text-gray-600">
                  vs last {filterRange}
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
                {completedCount}
              </h3>
              <div className="flex items-center gap-1 mt-1">
                <span
                  className={`text-xs font-medium ${
                    footerMetrics.completed >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {footerMetrics.completed >= 0 ? "↗" : "↘"}{" "}
                  {Math.abs(footerMetrics.completed)}%
                </span>
                <span className="text-xs text-gray-600">
                  vs last {filterRange}
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
                ₱{totalEarnings.toLocaleString()}
              </h3>
              <div className="flex items-center gap-1 mt-1">
                <span
                  className={`text-xs font-medium ${
                    footerMetrics.earnings >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {footerMetrics.earnings >= 0 ? "↗" : "↘"}{" "}
                  {Math.abs(footerMetrics.earnings)}%
                </span>
                <span className="text-xs text-gray-600">
                  vs last {filterRange}
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
                {inProgressCount}
              </h3>
              <div className="flex items-center gap-1 mt-1">
                <span
                  className={`text-xs font-medium ${
                    footerMetrics.inProgress >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {footerMetrics.inProgress >= 0 ? "↗" : "↘"}{" "}
                  {Math.abs(footerMetrics.inProgress)}%
                </span>
                <span className="text-xs text-gray-600">
                  vs last {filterRange}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Orders Section */}
        <div className="mt-6 px-6 mb-8">
          <RecentOrders
            orders={filteredOrders}
            onStatusChange={handleStatusChange}
          />
        </div>
      </div>

      <BottomNav />
    </section>
  );
};

export default Home;
