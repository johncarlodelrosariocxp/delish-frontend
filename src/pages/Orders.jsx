import React, { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import {
  FaSearch,
  FaUser,
  FaReceipt,
  FaCheckCircle,
  FaArrowUp,
  FaPrint,
  FaCalendar,
  FaTachometerAlt,
  FaUtensils,
  FaBox,
  FaUsers,
  FaShoppingCart,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { getOrders, getAdminOrders } from "../https/index";
import BottomNav from "../components/shared/BottomNav";
import BackButton from "../components/shared/BackButton";
import Invoice from "../components/invoice/Invoice";

const Orders = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [totalSales, setTotalSales] = useState(0);
  const [dateFilter, setDateFilter] = useState("today");
  const [statusFilter, setStatusFilter] = useState("all");
  const [customerTypeFilter, setCustomerTypeFilter] = useState("all");
  const [metrics, setMetrics] = useState({
    totalOrders: 0,
    dineInOrders: 0,
    takeOutOrders: 0,
    completedOrders: 0,
  });
  const scrollRef = useRef(null);

  const user = useSelector((state) => state.user);
  const navigate = useNavigate();

  // Debug function to check API response
  const debugAPI = (data, context) => {
    console.log(`🔍 ${context}:`, data);
    if (data?.response?.data) {
      console.log(`🔍 ${context} Response Data:`, data.response.data);
    }
    if (data?.message) {
      console.log(`🔍 ${context} Message:`, data.message);
    }
  };

  useEffect(() => {
    document.title = "POS | Orders";
  }, []);

  const {
    data: resData,
    isError,
    isLoading,
  } = useQuery({
    queryKey: ["orders", user.role],
    queryFn: async () => {
      try {
        if (user.role?.toLowerCase() === "admin") {
          console.log("📋 Orders Page: Fetching all orders (admin)...");
          const response = await getAdminOrders();
          debugAPI(response, "Admin Orders API");
          return response;
        } else {
          console.log("📋 Orders Page: Fetching user orders...");
          const response = await getOrders();
          debugAPI(response, "User Orders API");
          return response;
        }
      } catch (error) {
        console.error("❌ Orders fetch error:", error);
        debugAPI(error, "Orders Fetch Error");
        throw error;
      }
    },
    placeholderData: keepPreviousData,
  });

  // Status configuration
  const getStatusConfig = (order) => {
    // First check if order has customer status (Dine-in/Take-out)
    const customerStatus = order.customerStatus?.toLowerCase();
    const orderStatus = order.orderStatus?.toLowerCase();

    // Determine status based on customer type and order status
    if (customerStatus === "dine-in") {
      return {
        icon: FaUtensils,
        color: "text-blue-500",
        bgColor: "bg-blue-50",
        borderColor: "border-blue-200",
        text: "Dine-in",
        type: "customer",
      };
    } else if (customerStatus === "take-out") {
      return {
        icon: FaBox,
        color: "text-purple-500",
        bgColor: "bg-purple-50",
        borderColor: "border-purple-200",
        text: "Take-out",
        type: "customer",
      };
    } else if (orderStatus === "completed") {
      return {
        icon: FaCheckCircle,
        color: "text-green-500",
        bgColor: "bg-green-50",
        borderColor: "border-green-200",
        text: "Completed",
        type: "order",
      };
    } else if (orderStatus === "in progress" || orderStatus === "processing") {
      return {
        icon: FaShoppingCart,
        color: "text-yellow-500",
        bgColor: "bg-yellow-50",
        borderColor: "border-yellow-200",
        text: "In Progress",
        type: "order",
      };
    } else {
      return {
        icon: FaUsers,
        color: "text-gray-500",
        bgColor: "bg-gray-50",
        borderColor: "border-gray-200",
        text: order.customerStatus || order.orderStatus || "Unknown",
        type: "unknown",
      };
    }
  };

  // ✅ FIXED: Handle data safely
  const orders = React.useMemo(() => {
    try {
      const ordersData = resData?.data?.data;
      if (Array.isArray(ordersData)) {
        console.log("📦 Orders data (array):", ordersData.length);
        return ordersData;
      } else if (ordersData && typeof ordersData === "object") {
        // Handle case where data might be an object with orders property
        const ordersArray = ordersData.orders || ordersData.data || [];
        if (Array.isArray(ordersArray)) {
          console.log("📦 Orders data (from object):", ordersArray.length);
          return ordersArray;
        }
      }
      console.log("📦 No valid orders data found, returning empty array");
      return [];
    } catch (error) {
      console.error("❌ Error processing orders data:", error);
      return [];
    }
  }, [resData]);

  useEffect(() => {
    if (isError) {
      enqueueSnackbar("Something went wrong while fetching orders!", {
        variant: "error",
      });
    }
  }, [isError]);

  // Filter orders by date range
  const filterByDateRange = (order, range) => {
    if (range === "all" || !order) return true;

    const orderDate = new Date(
      order.createdAt || order.orderDate || order.date
    );
    const today = new Date();

    // Handle invalid dates
    if (isNaN(orderDate.getTime())) return true;

    switch (range) {
      case "today":
        return (
          orderDate.getDate() === today.getDate() &&
          orderDate.getMonth() === today.getMonth() &&
          orderDate.getFullYear() === today.getFullYear()
        );

      case "yesterday":
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        return (
          orderDate.getDate() === yesterday.getDate() &&
          orderDate.getMonth() === yesterday.getMonth() &&
          orderDate.getFullYear() === yesterday.getFullYear()
        );

      case "thisMonth":
        return (
          orderDate.getMonth() === today.getMonth() &&
          orderDate.getFullYear() === today.getFullYear()
        );

      case "lastMonth":
        const lastMonth = new Date(today);
        lastMonth.setMonth(today.getMonth() - 1);
        return (
          orderDate.getMonth() === lastMonth.getMonth() &&
          orderDate.getFullYear() === lastMonth.getFullYear()
        );

      case "thisYear":
        return orderDate.getFullYear() === today.getFullYear();

      case "lastYear":
        return orderDate.getFullYear() === today.getFullYear() - 1;

      default:
        return true;
    }
  };

  // Calculate metrics based on date filter
  useEffect(() => {
    const filteredByDate = orders.filter((order) =>
      filterByDateRange(order, dateFilter)
    );

    // Calculate metrics
    let total = 0;
    let dineInCount = 0;
    let takeOutCount = 0;
    let completedCount = 0;

    filteredByDate.forEach((order) => {
      if (!order) return;

      // Calculate total sales
      const amount = order.bills?.totalWithTax || order.totalAmount || 0;
      total += Number(amount) || 0;

      // Count customer types
      const customerStatus = order.customerStatus?.toLowerCase();
      if (customerStatus === "dine-in") {
        dineInCount++;
      } else if (customerStatus === "take-out") {
        takeOutCount++;
      }

      // Count completed orders
      const orderStatus = order.orderStatus?.toLowerCase();
      if (orderStatus === "completed") {
        completedCount++;
      }
    });

    setTotalSales(total);
    setMetrics({
      totalOrders: filteredByDate.length,
      dineInOrders: dineInCount,
      takeOutOrders: takeOutCount,
      completedOrders: completedCount,
    });
  }, [orders, dateFilter]);

  // Filter orders based on search query and filters
  const filteredOrders = React.useMemo(() => {
    try {
      if (!Array.isArray(orders)) {
        console.log("❌ Orders is not an array:", orders);
        return [];
      }

      const filtered = orders.filter((order) => {
        if (!order) return false;

        // Date filter
        const dateMatch = filterByDateRange(order, dateFilter);

        // Customer type filter
        let customerTypeMatch = true;
        if (customerTypeFilter !== "all") {
          const customerStatus = order.customerStatus?.toLowerCase();
          if (customerTypeFilter === "dine-in") {
            customerTypeMatch = customerStatus === "dine-in";
          } else if (customerTypeFilter === "take-out") {
            customerTypeMatch = customerStatus === "take-out";
          }
        }

        // Status filter
        let statusMatch = true;
        if (statusFilter !== "all") {
          const orderStatus = order.orderStatus?.toLowerCase();
          const customerStatus = order.customerStatus?.toLowerCase();

          if (statusFilter === "completed") {
            statusMatch = orderStatus === "completed";
          } else if (statusFilter === "in-progress") {
            statusMatch =
              orderStatus === "in progress" || orderStatus === "processing";
          } else if (statusFilter === "dine-in") {
            statusMatch = customerStatus === "dine-in";
          } else if (statusFilter === "take-out") {
            statusMatch = customerStatus === "take-out";
          }
        }

        // Search filter
        const searchMatch =
          (order.customerDetails?.name || "")
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          (order._id || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (order.customerStatus || "")
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          (order.orderStatus || "")
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          (order.cashier || "")
            .toLowerCase()
            .includes(searchQuery.toLowerCase());

        return dateMatch && customerTypeMatch && statusMatch && searchMatch;
      });

      console.log("🔍 Filtered orders:", filtered.length);
      return filtered;
    } catch (error) {
      console.error("❌ Error filtering orders:", error);
      return [];
    }
  }, [orders, searchQuery, dateFilter, statusFilter, customerTypeFilter]);

  // Calculate and format total amount
  const calculateTotalAmount = (order) => {
    if (!order) return 0;

    if (order.totalAmount !== undefined && order.totalAmount !== null) {
      return Number(order.totalAmount) || 0;
    }
    if (
      order.bills?.totalWithTax !== undefined &&
      order.bills.totalWithTax !== null
    ) {
      return Number(order.bills.totalWithTax) || 0;
    }
    if (order.items && Array.isArray(order.items)) {
      return order.items.reduce((total, item) => {
        const price = Number(item.price || item.unitPrice || 0);
        const quantity = Number(item.quantity || 1);
        return total + price * quantity;
      }, 0);
    }
    return 0;
  };

  // Format currency
  const formatCurrency = (amount) => {
    const numericAmount =
      typeof amount === "number" ? amount : parseFloat(amount) || 0;
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericAmount);
  };

  // Format date with time for better sorting visibility
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid Date";

      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return "Invalid Date";
    }
  };

  // Get items count
  const getItemsCount = (order) => {
    if (!order) return 0;

    if (order.items && Array.isArray(order.items)) {
      return order.items.reduce(
        (total, item) => total + (Number(item.quantity) || 1),
        0
      );
    }
    return Number(order.itemsCount || order.quantity || 0);
  };

  // Get items preview text
  const getItemsPreview = (order) => {
    if (!order) return "No items";

    if (!order.items || !Array.isArray(order.items)) {
      return "No items";
    }

    const itemsText = order.items
      .slice(0, 3)
      .map((item) => {
        const name = item.name || item.productName || "Unknown Item";
        const quantity = item.quantity > 1 ? ` (${item.quantity})` : "";
        return name + quantity;
      })
      .join(", ");

    const totalItems = getItemsCount(order);
    const shownItems = order.items
      .slice(0, 3)
      .reduce((total, item) => total + (Number(item.quantity) || 1), 0);

    if (totalItems > shownItems) {
      return `${itemsText} +${totalItems - shownItems} more`;
    }

    return itemsText;
  };

  const handleViewReceipt = (order) => {
    setSelectedOrder(order);
    setShowInvoice(true);
  };

  const handleScroll = () => {
    if (scrollRef.current) {
      const scrollTop = scrollRef.current.scrollTop;
      setShowScrollButton(scrollTop > 300);
    }
  };

  const scrollToTop = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Navigate to dashboard
  const navigateToDashboard = () => {
    navigate("/dashboard");
  };

  // Get user display name
  const getUserDisplayName = (order) => {
    // Check for user name in different possible locations
    if (order.cashier) return order.cashier;
    if (order.user?.name) return order.user.name;
    if (order.userDetails?.name) return order.userDetails.name;
    if (user.name && order.user?._id === user._id) return user.name;
    return "Admin";
  };

  // Order Card Component
  const OrderCard = ({ order, onViewReceipt }) => {
    if (!order) return null;

    const statusConfig = getStatusConfig(order);
    const StatusIcon = statusConfig.icon;
    const totalAmount = calculateTotalAmount(order);
    const itemsCount = getItemsCount(order);
    const itemsPreview = getItemsPreview(order);
    const userDisplayName = getUserDisplayName(order);
    const isCustomerStatus = statusConfig.type === "customer";

    return (
      <div className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-all duration-200 w-full h-full flex flex-col">
        {/* Order Header */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <FaReceipt className="text-gray-600 text-sm" />
            <span className="font-mono text-xs text-gray-700">
              #{order._id?.slice(-8) || "N/A"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <StatusIcon className={`text-xs ${statusConfig.color}`} />
            <span
              className={`text-xs font-medium capitalize ${statusConfig.color}`}
            >
              {statusConfig.text}
            </span>
            {isCustomerStatus && (
              <span className="text-[10px] text-gray-500 ml-1">(Customer)</span>
            )}
          </div>
        </div>

        {/* Customer and User Info */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2">
            <FaUser className="text-gray-500 text-xs" />
            <span className="text-xs font-medium text-gray-800">
              {order.customerDetails?.name || "Walk-in Customer"}
            </span>
            {order.customerStatus && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  isCustomerStatus ? statusConfig.bgColor : "bg-gray-100"
                } ${isCustomerStatus ? statusConfig.color : "text-gray-600"}`}
              >
                {order.customerStatus}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span>Cashier:</span>
            <span className="font-medium text-gray-800">{userDisplayName}</span>
          </div>
        </div>

        {/* Table Info */}
        {order.table?.tableNo && (
          <div className="flex items-center gap-2 mb-3 text-xs text-gray-600">
            <span>Table {order.table.tableNo}</span>
            <span>•</span>
            <span>Dine In</span>
          </div>
        )}

        {/* Order Details */}
        <div className="grid grid-cols-2 gap-3 text-xs mb-3">
          <div className="space-y-1">
            <div className="text-gray-600">Date</div>
            <div className="font-medium text-gray-800">
              {formatDate(order.createdAt || order.orderDate)}
            </div>
          </div>
          <div className="space-y-1 text-right">
            <div className="text-gray-600">Amount</div>
            <div className="font-semibold text-gray-800">
              {formatCurrency(totalAmount)}
            </div>
          </div>
        </div>

        {/* Items Preview */}
        {((order.items && order.items.length > 0) || itemsCount > 0) && (
          <div className="mt-2 pt-2 border-t border-gray-200 mb-3">
            <div className="text-xs text-gray-600 mb-1">
              Items {itemsCount > 0 && `(${itemsCount})`}
            </div>
            <div className="text-xs text-gray-800 line-clamp-2">
              {itemsPreview}
            </div>
          </div>
        )}

        {/* Order Status */}
        {order.orderStatus && statusConfig.type === "order" && (
          <div className="mt-2 pt-2 border-t border-gray-200 mb-3">
            <div className="text-xs text-gray-600 mb-1">Order Status</div>
            <div className={`text-xs font-medium ${statusConfig.color}`}>
              {order.orderStatus}
            </div>
          </div>
        )}

        {/* Receipt Button */}
        <div className="flex gap-2 pt-2 border-t border-gray-200 mt-auto">
          <button
            onClick={() => onViewReceipt(order)}
            className="flex-1 bg-[#025cca] text-white px-2 py-2 rounded text-xs font-medium flex items-center gap-2 justify-center hover:bg-[#014aa3] transition-colors"
          >
            <FaPrint className="text-[10px]" />
            View Receipt
          </button>
        </div>
      </div>
    );
  };

  return (
    <section className="bg-gradient-to-br from-blue-50 via-white to-cyan-50 min-h-screen flex flex-col relative pb-20 md:pb-6">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/50 sticky top-0 z-30">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between px-4 md:px-6 py-4 gap-4">
          <div className="flex items-center gap-4">
            <BackButton />
            <h1 className="text-[#333333] text-xl sm:text-2xl font-bold tracking-wider">
              Orders
            </h1>
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
              Total: {metrics.totalOrders}
            </span>
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                user.role?.toLowerCase() === "admin"
                  ? "bg-green-100 text-green-800"
                  : "bg-blue-100 text-blue-800"
              }`}
            >
              {user.role?.toLowerCase() === "admin"
                ? "Admin View"
                : "User View"}
            </span>
          </div>
          <div className="flex flex-wrap gap-2 md:gap-4 items-center">
            {/* Dashboard Button */}
            <button
              onClick={navigateToDashboard}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <FaTachometerAlt className="text-sm" />
              Dashboard
            </button>

            {/* Date Filter */}
            <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border">
              <FaCalendar className="text-gray-600 text-xs" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-transparent outline-none text-black text-xs sm:text-sm"
              >
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="thisMonth">This Month</option>
                <option value="lastMonth">Last Month</option>
                <option value="thisYear">This Year</option>
                <option value="lastYear">Last Year</option>
                <option value="all">All Time</option>
              </select>
            </div>
          </div>
        </div>

        {/* Filters and Search Section */}
        <div className="px-4 mb-4">
          <div className="flex flex-col md:flex-row gap-3 mb-3">
            {/* Search Bar */}
            <div className="flex items-center gap-2 bg-gray-100 rounded-md px-3 py-2 flex-1">
              <FaSearch className="text-gray-600 text-xs sm:text-sm" />
              <input
                type="text"
                placeholder="Search by name, order ID, cashier, or status..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent outline-none text-black w-full text-xs sm:text-sm placeholder-gray-500"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent outline-none text-black text-xs sm:text-sm"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed Orders</option>
                <option value="in-progress">In Progress</option>
                <option value="dine-in">Dine-in Only</option>
                <option value="take-out">Take-out Only</option>
              </select>
            </div>

            {/* Customer Type Filter */}
            <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border">
              <select
                value={customerTypeFilter}
                onChange={(e) => setCustomerTypeFilter(e.target.value)}
                className="bg-transparent outline-none text-black text-xs sm:text-sm"
              >
                <option value="all">All Types</option>
                <option value="dine-in">Dine-in</option>
                <option value="take-out">Take-out</option>
              </select>
            </div>
          </div>

          {/* Metrics Display */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white rounded-lg p-3 border shadow-sm">
              <div className="text-xs text-gray-500 mb-1">Total Sales</div>
              <div className="text-lg font-bold text-green-600">
                {formatCurrency(totalSales)}
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-3 border border-blue-100 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <FaUtensils className="text-blue-500 text-xs" />
                <div className="text-xs text-gray-500">Dine-in Orders</div>
              </div>
              <div className="text-lg font-bold text-blue-600">
                {metrics.dineInOrders}
              </div>
            </div>

            <div className="bg-purple-50 rounded-lg p-3 border border-purple-100 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <FaBox className="text-purple-500 text-xs" />
                <div className="text-xs text-gray-500">Take-out Orders</div>
              </div>
              <div className="text-lg font-bold text-purple-600">
                {metrics.takeOutOrders}
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-3 border border-green-100 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <FaCheckCircle className="text-green-500 text-xs" />
                <div className="text-xs text-gray-500">Completed</div>
              </div>
              <div className="text-lg font-bold text-green-600">
                {metrics.completedOrders}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Orders Grid */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 mb-16 md:mb-6"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-fr">
          {isLoading ? (
            <div className="col-span-full flex justify-center items-center py-8">
              <div className="text-center bg-white rounded-lg p-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto mb-2"></div>
                <p className="text-gray-500 text-sm">Loading orders...</p>
              </div>
            </div>
          ) : filteredOrders.length > 0 ? (
            filteredOrders.map((order) => (
              <OrderCard
                key={order._id || Math.random().toString()}
                order={order}
                onViewReceipt={handleViewReceipt}
              />
            ))
          ) : (
            <div className="col-span-full flex justify-center items-center py-8">
              <div className="text-center bg-white rounded-lg p-6">
                <FaReceipt className="mx-auto text-gray-400 text-2xl mb-2" />
                <p className="text-gray-500 text-sm">
                  {searchQuery ||
                  dateFilter !== "today" ||
                  statusFilter !== "all" ||
                  customerTypeFilter !== "all"
                    ? "No orders found matching your filters"
                    : user.role?.toLowerCase() === "admin"
                    ? "No orders available"
                    : "You haven't placed any orders yet"}
                </p>
                {(searchQuery ||
                  dateFilter !== "today" ||
                  statusFilter !== "all" ||
                  customerTypeFilter !== "all") && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setDateFilter("today");
                      setStatusFilter("all");
                      setCustomerTypeFilter("all");
                    }}
                    className="text-[#025cca] text-xs mt-1 hover:underline"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Scroll to Top */}
      {showScrollButton && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-24 md:bottom-6 right-4 sm:right-6 bg-[#025cca] text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all z-20"
        >
          <FaArrowUp />
        </button>
      )}

      {/* Invoice Modal */}
      {showInvoice && selectedOrder && (
        <Invoice orderInfo={selectedOrder} setShowInvoice={setShowInvoice} />
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 md:relative">
        <BottomNav />
      </div>
    </section>
  );
};

export default Orders;
