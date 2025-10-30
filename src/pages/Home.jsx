import React, { useEffect, useState } from "react";
import BottomNav from "../components/shared/BottomNav";
import Greetings from "../components/home/Greetings";
import { BsCashCoin } from "react-icons/bs";
import { GrInProgress } from "react-icons/gr";
import { FaChartLine } from "react-icons/fa";
import { MdDoneAll } from "react-icons/md";
import MiniCard from "../components/home/MiniCard";
import RecentOrders from "../components/home/RecentOrders";
import PopularDishes from "../components/home/PopularDishes";
import { getOrders, updateOrderStatus } from "../https";

const Home = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [inProgressCount, setInProgressCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
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
        setFilteredOrders([]);
        setTotalOrders(0);
        setTotalEarnings(0);
        setInProgressCount(0);
        setCompletedCount(0);
      }
    };

    fetchOrders();
  }, []);

  useEffect(() => {
    applyFilter(orders, filterRange);
  }, [filterRange, orders]);

  const applyFilter = (data, range) => {
    const now = new Date();
    const filtered = data.filter((order) => {
      const orderDate = new Date(order.orderDate);
      if (range === "day") {
        return (
          orderDate.getDate() === now.getDate() &&
          orderDate.getMonth() === now.getMonth() &&
          orderDate.getFullYear() === now.getFullYear()
        );
      }
      if (range === "month") {
        return (
          orderDate.getMonth() === now.getMonth() &&
          orderDate.getFullYear() === now.getFullYear()
        );
      }
      if (range === "year") {
        return orderDate.getFullYear() === now.getFullYear();
      }
      return true;
    });

    setFilteredOrders(filtered);
    computeMetrics(filtered);
  };

  const computeMetrics = (data) => {
    if (!Array.isArray(data)) return;

    const total = data.length;

    const earnings = data
      .filter((o) => o.orderStatus === "Completed")
      .reduce((sum, o) => sum + (o?.bills?.totalWithTax || 0), 0);

    const inProgress = data.filter(
      (o) => o.orderStatus === "In Progress"
    ).length;

    const completed = data.filter((o) => o.orderStatus === "Completed").length;

    setTotalOrders(total);
    setTotalEarnings(earnings);
    setInProgressCount(inProgress);
    setCompletedCount(completed);
  };

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
    <section className="bg-gray-200 text-black h-[calc(100vh-5rem)] overflow-hidden flex gap-3">
      {/* Scrollable Content Wrapper */}
      <div className="flex-[3] h-full overflow-y-auto">
        <Greetings />

        {/* Filter Dropdown */}
        <div className="px-8 mt-4">
          <select
            value={filterRange}
            onChange={(e) => setFilterRange(e.target.value)}
            className="px-4 py-2 rounded-md border border-gray-300 text-sm font-medium bg-white shadow-sm"
          >
            <option value="day">Today</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
        </div>

        {/* Metrics */}
        <div className="flex items-center w-full gap-3 px-8 mt-6">
          <MiniCard
            title="Total Orders"
            icon={<FaChartLine />}
            number={totalOrders}
            footerNum={2.4}
          />
          <MiniCard
            title="Completed Orders"
            icon={<MdDoneAll />}
            number={completedCount}
            footerNum={1.2}
          />
          <MiniCard
            title="Total Earnings"
            icon={<BsCashCoin />}
            number={totalEarnings}
            footerNum={1.6}
          />
          <MiniCard
            title="In Progress"
            icon={<GrInProgress />}
            number={inProgressCount}
            footerNum={3.6}
          />
        </div>

        {/* Orders */}
        <RecentOrders
          orders={filteredOrders}
          onStatusChange={handleStatusChange}
        />
      </div>

      {/* Scrollable Right Div */}
      <div className="flex-[2] h-full overflow-y-auto">
        <PopularDishes />
      </div>

      <BottomNav />
    </section>
  );
};

export default Home;
