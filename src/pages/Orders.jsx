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

  // Status configuration - All orders are completed
  const getStatusConfig = () => {
    return {
      icon: FaCheckCircle,
      color: "text-green-500",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      text: "Completed",
    };
  };

  // ✅ FIXED: Handle data safely and sort by date (newest first)
  const orders = React.useMemo(() => {
    try {
      const ordersData = resData?.data?.data;
      let ordersArray = [];

      if (Array.isArray(ordersData)) {
        ordersArray = ordersData;
      } else if (ordersData && typeof ordersData === "object") {
        // Handle case where data might be an object with orders property
        ordersArray = ordersData.orders || ordersData.data || [];
      }

      if (Array.isArray(ordersArray)) {
        console.log("📦 Orders data (before sorting):", ordersArray.length);

        // Sort orders by date (newest first)
        const sortedOrders = [...ordersArray].sort((a, b) => {
          // Get dates from various possible properties
          const getDate = (order) => {
            if (order.createdAt) return new Date(order.createdAt);
            if (order.orderDate) return new Date(order.orderDate);
            if (order.date) return new Date(order.date);
            if (order.updatedAt) return new Date(order.updatedAt);
            return new Date(0); // Default to epoch if no date found
          };

          const dateA = getDate(a);
          const dateB = getDate(b);

          // Sort in descending order (newest first)
          return dateB.getTime() - dateA.getTime();
        });

        console.log("📦 Orders sorted (newest first)");
        return sortedOrders;
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

    // All orders are considered completed for sales calculation
    const total = filteredByDate.reduce((sum, order) => {
      if (!order) return sum;
      const amount = order.bills?.totalWithTax || order.totalAmount || 0;
      return sum + (Number(amount) || 0);
    }, 0);
    setTotalSales(total);
  }, [orders, dateFilter]);

  // Filter orders based on search query and date filter
  const filteredOrders = React.useMemo(() => {
    try {
      if (!Array.isArray(orders)) {
        console.log("❌ Orders is not an array:", orders);
        return [];
      }

      const filtered = orders.filter((order) => {
        if (!order) return false;

        const dateMatch = filterByDateRange(order, dateFilter);

        const searchMatch =
          (order.customerDetails?.name || "")
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          (order._id || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          "completed".includes(searchQuery.toLowerCase()) || // Search for "completed" status
          (order.cashier || "")
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) || // Search for cashier name
          (order.user?.name || "")
            .toLowerCase()
            .includes(searchQuery.toLowerCase()); // Search for user name

        return dateMatch && searchMatch;
      });

      console.log("🔍 Filtered orders:", filtered.length);
      return filtered;
    } catch (error) {
      console.error("❌ Error filtering orders:", error);
      return [];
    }
  }, [orders, searchQuery, dateFilter]);

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

  // Check if order has discount
  const hasDiscount = (order) => {
    if (!order) return false;

    // Check for any discount in bills
    if (order.bills) {
      return (
        (order.bills.discount && order.bills.discount > 0) ||
        (order.bills.pwdSeniorDiscount && order.bills.pwdSeniorDiscount > 0) ||
        (order.bills.employeeDiscount && order.bills.employeeDiscount > 0) ||
        (order.bills.shareholderDiscount &&
          order.bills.shareholderDiscount > 0) ||
        (order.bills.redemptionDiscount && order.bills.redemptionDiscount > 0)
      );
    }

    return false;
  };

  // Get discount type
  const getDiscountType = (order) => {
    if (!order || !order.bills) return null;

    if (order.bills.pwdSeniorDiscount > 0) return "PWD/Senior";
    if (order.bills.employeeDiscount > 0) return "Employee";
    if (order.bills.shareholderDiscount > 0) return "Shareholder";
    if (order.bills.redemptionDiscount > 0) return "Redemption";
    if (order.bills.discount > 0) return "Discount";

    return null;
  };

  // Order Card Component
  const OrderCard = ({ order, onViewReceipt }) => {
    if (!order) return null;

    const statusConfig = getStatusConfig();
    const StatusIcon = statusConfig.icon;
    const totalAmount = calculateTotalAmount(order);
    const itemsCount = getItemsCount(order);
    const itemsPreview = getItemsPreview(order);
    const userDisplayName = getUserDisplayName(order);
    const discountExists = hasDiscount(order);
    const discountType = getDiscountType(order);

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
          </div>
        </div>

        {/* Customer Info */}
        <div className="flex items-center gap-2 mb-3">
          <FaUser className="text-gray-500 text-xs" />
          <span className="text-xs font-medium text-gray-800">
            {order.customerDetails?.name || "Unknown Customer"}
          </span>
        </div>

        {/* User/Cashier Info */}
        <div className="flex items-center gap-2 mb-3 text-xs text-gray-600">
          <span>Cashier:</span>
          <span className="font-medium text-gray-800">{userDisplayName}</span>
        </div>

        {/* Discount Badge */}
        {discountExists && discountType && (
          <div className="mb-3">
            <span className="bg-yellow-100 text-yellow-800 text-[10px] px-2 py-1 rounded-full font-medium">
              {discountType} Discount Applied
            </span>
          </div>
        )}

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
            {user.role?.toLowerCase() !== "admin" && (
              <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
                Your Orders
              </span>
            )}
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

            {/* Metrics Display */}
            <div className="flex flex-wrap gap-2 md:gap-4">
              <span className="text-xs sm:text-sm font-semibold text-green-700 bg-green-50 px-3 py-1 rounded-full">
                Sales: {formatCurrency(totalSales)}
              </span>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-2 bg-gray-100 rounded-md px-3 py-2 mx-4 mb-4 mt-2">
          <FaSearch className="text-gray-600 text-xs sm:text-sm" />
          <input
            type="text"
            placeholder="Search by name, order ID, or cashier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent outline-none text-black w-full text-xs sm:text-sm placeholder-gray-500"
          />
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
                  {searchQuery || dateFilter !== "today"
                    ? "No orders found matching your criteria"
                    : user.role?.toLowerCase() === "admin"
                    ? "No orders available"
                    : "You haven't placed any orders yet"}
                </p>
                {(searchQuery || dateFilter !== "today") && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setDateFilter("today");
                    }}
                    className="text-[#025cca] text-xs mt-1 hover:underline"
                  >
                    Clear filters
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
