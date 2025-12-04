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
  FaExclamationCircle,
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
  const [filteredOrders, setFilteredOrders] = useState([]);
  const scrollRef = useRef(null);

  const user = useSelector((state) => state.auth?.user || state.user);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "POS | Orders";
  }, []);

  // Enhanced API response handler
  const extractOrdersFromResponse = (response) => {
    console.log("🔍 Raw API Response:", response);

    // Handle different response structures
    if (Array.isArray(response?.data)) {
      console.log(
        "✅ Found orders in response.data array:",
        response.data.length
      );
      return response.data;
    }

    if (response?.data?.data && Array.isArray(response.data.data)) {
      console.log(
        "✅ Found orders in response.data.data:",
        response.data.data.length
      );
      return response.data.data;
    }

    if (response?.data?.orders && Array.isArray(response.data.orders)) {
      console.log(
        "✅ Found orders in response.data.orders:",
        response.data.orders.length
      );
      return response.data.orders;
    }

    if (Array.isArray(response)) {
      console.log("✅ Response is directly an array:", response.length);
      return response;
    }

    console.warn("⚠️ Could not find orders array in response structure");
    console.log("Response structure:", JSON.stringify(response, null, 2));
    return [];
  };

  const {
    data: apiResponse,
    isError,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["orders", user?.role, user?._id],
    queryFn: async () => {
      try {
        console.log("📋 Fetching orders for user:", {
          id: user?._id,
          role: user?.role,
          name: user?.name,
        });

        let response;
        if (user?.role?.toLowerCase() === "admin") {
          console.log("👑 Fetching all orders (admin)...");
          response = await getAdminOrders();
        } else {
          console.log("👤 Fetching user orders...");
          response = await getOrders();
        }

        console.log("📦 API Response status:", response?.status);
        console.log("📦 API Response headers:", response?.headers);

        // Extract data properly
        const ordersData = extractOrdersFromResponse(response);

        return {
          success: true,
          orders: ordersData,
          rawResponse: response,
        };
      } catch (error) {
        console.error("❌ Orders fetch error:", error);
        console.error("Error details:", {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          config: error.config,
        });

        return {
          success: false,
          error: error.message,
          orders: [],
        };
      }
    },
    placeholderData: keepPreviousData,
    retry: 2,
    refetchOnWindowFocus: false,
  });

  // Process orders when data changes
  useEffect(() => {
    if (apiResponse?.success && Array.isArray(apiResponse.orders)) {
      console.log("🔄 Processing orders:", apiResponse.orders.length);

      // Sort by date (newest first)
      const sortedOrders = [...apiResponse.orders].sort((a, b) => {
        const dateA = new Date(a.createdAt || a.orderDate || a.updatedAt || 0);
        const dateB = new Date(b.createdAt || b.orderDate || b.updatedAt || 0);
        return dateB.getTime() - dateA.getTime();
      });

      console.log("✅ Sorted orders:", sortedOrders.length);

      // Apply filters
      applyFilters(sortedOrders, searchQuery, dateFilter);
    } else if (apiResponse && !apiResponse.success) {
      console.error("❌ API response unsuccessful:", apiResponse.error);
      setFilteredOrders([]);
    }
  }, [apiResponse, searchQuery, dateFilter]);

  // Apply filters to orders
  const applyFilters = (orders, query, dateRange) => {
    if (!Array.isArray(orders)) {
      console.error("❌ applyFilters: orders is not an array");
      setFilteredOrders([]);
      return;
    }

    const filtered = orders.filter((order) => {
      if (!order) return false;

      // Date filter
      const dateMatch = filterByDateRange(order, dateRange);
      if (!dateMatch) return false;

      // Search filter
      if (!query) return true;

      const searchLower = query.toLowerCase();
      return (
        (order._id || "").toLowerCase().includes(searchLower) ||
        (order.orderNumber || "").toLowerCase().includes(searchLower) ||
        (order.customerDetails?.name || "")
          .toLowerCase()
          .includes(searchLower) ||
        (order.cashier || "").toLowerCase().includes(searchLower) ||
        (order.user?.name || "").toLowerCase().includes(searchLower) ||
        "completed".includes(searchLower)
      );
    });

    console.log(
      `🔍 Filtered ${filtered.length} orders out of ${orders.length}`
    );
    setFilteredOrders(filtered);

    // Calculate total sales
    const total = filtered.reduce((sum, order) => {
      const amount =
        order.totalAmount ||
        order.bills?.totalWithTax ||
        order.bills?.total ||
        0;
      return sum + (Number(amount) || 0);
    }, 0);
    setTotalSales(total);
  };

  // Filter by date range
  const filterByDateRange = (order, range) => {
    if (range === "all" || !order) return true;

    const orderDate = new Date(
      order.createdAt || order.orderDate || order.date
    );
    const today = new Date();

    if (isNaN(orderDate.getTime())) return false;

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

  // Error handling
  useEffect(() => {
    if (isError) {
      console.error("❌ Query error:", error);
      enqueueSnackbar(
        error?.message || "Failed to load orders. Please try again.",
        { variant: "error" }
      );
    }
  }, [isError, error]);

  // Handle scroll
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

  // Helper functions
  const formatCurrency = (amount) => {
    const numericAmount = Number(amount) || 0;
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericAmount);
  };

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

  const getItemsCount = (order) => {
    if (!order?.items || !Array.isArray(order.items)) return 0;
    return order.items.reduce(
      (total, item) => total + (Number(item.quantity) || 1),
      0
    );
  };

  const getItemsPreview = (order) => {
    if (
      !order?.items ||
      !Array.isArray(order.items) ||
      order.items.length === 0
    ) {
      return "No items";
    }

    const itemsText = order.items
      .slice(0, 2)
      .map((item) => {
        const name = item.name || "Unknown Item";
        const quantity = item.quantity > 1 ? ` (${item.quantity})` : "";
        return name + quantity;
      })
      .join(", ");

    const totalItems = getItemsCount(order);
    if (order.items.length > 2) {
      return `${itemsText} +${order.items.length - 2} more`;
    }
    return itemsText;
  };

  const getUserDisplayName = (order) => {
    if (order.cashier) return order.cashier;
    if (order.user?.name) return order.user.name;
    if (user?.name) return user.name;
    return "Admin";
  };

  const hasDiscount = (order) => {
    if (!order?.bills) return false;
    return (
      (order.bills.discount && order.bills.discount > 0) ||
      (order.bills.pwdSeniorDiscount && order.bills.pwdSeniorDiscount > 0) ||
      (order.bills.employeeDiscount && order.bills.employeeDiscount > 0) ||
      (order.bills.shareholderDiscount &&
        order.bills.shareholderDiscount > 0) ||
      (order.bills.redemptionDiscount && order.bills.redemptionDiscount > 0)
    );
  };

  const getDiscountType = (order) => {
    if (!order?.bills) return null;
    if (order.bills.pwdSeniorDiscount > 0) return "PWD/Senior";
    if (order.bills.employeeDiscount > 0) return "Employee";
    if (order.bills.shareholderDiscount > 0) return "Shareholder";
    if (order.bills.redemptionDiscount > 0) return "Redemption";
    if (order.bills.discount > 0) return "Discount";
    return null;
  };

  const handleViewReceipt = (order) => {
    setSelectedOrder(order);
    setShowInvoice(true);
  };

  const navigateToDashboard = () => {
    navigate("/dashboard");
  };

  // Order Card Component
  const OrderCard = ({ order, onViewReceipt }) => {
    if (!order) return null;

    const totalAmount = order.totalAmount || order.bills?.totalWithTax || 0;
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
              #{order._id?.slice(-8) || order.orderNumber?.slice(-8) || "N/A"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <FaCheckCircle className="text-xs text-green-500" />
            <span className="text-xs font-medium text-green-600">
              Completed
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

        {/* Cashier Info */}
        <div className="flex items-center gap-2 mb-3 text-xs text-gray-600">
          <span>Cashier:</span>
          <span className="font-medium text-gray-800">{userDisplayName}</span>
        </div>

        {/* Discount Badge */}
        {discountExists && discountType && (
          <div className="mb-3">
            <span className="bg-yellow-100 text-yellow-800 text-[10px] px-2 py-1 rounded-full font-medium">
              {discountType} Discount
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
        {itemsCount > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-200 mb-3">
            <div className="text-xs text-gray-600 mb-1">
              Items ({itemsCount})
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
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                user?.role?.toLowerCase() === "admin"
                  ? "bg-green-100 text-green-800"
                  : "bg-blue-100 text-blue-800"
              }`}
            >
              {user?.role?.toLowerCase() === "admin"
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
                Orders: {filteredOrders.length}
              </span>
              <span className="text-xs sm:text-sm font-semibold text-blue-700 bg-blue-50 px-3 py-1 rounded-full">
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
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-gray-500 hover:text-gray-700 text-xs"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Orders Grid */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 mb-16 md:mb-6"
      >
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-center bg-white rounded-lg p-8 shadow-md">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 text-sm">Loading orders...</p>
            </div>
          </div>
        ) : isError ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-center bg-red-50 border border-red-200 rounded-lg p-8 shadow-md max-w-md">
              <FaExclamationCircle className="text-red-500 text-3xl mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-700 mb-2">
                Failed to Load Orders
              </h3>
              <p className="text-red-600 text-sm mb-4">
                {error?.message ||
                  "Unable to fetch orders. Please check your connection."}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="bg-red-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        ) : filteredOrders.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-fr">
            {filteredOrders.map((order) => (
              <OrderCard
                key={order._id || Math.random().toString()}
                order={order}
                onViewReceipt={handleViewReceipt}
              />
            ))}
          </div>
        ) : (
          <div className="flex justify-center items-center py-12">
            <div className="text-center bg-white border border-gray-200 rounded-lg p-8 shadow-md max-w-md">
              <FaReceipt className="text-gray-400 text-3xl mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                No Orders Found
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                {searchQuery || dateFilter !== "all"
                  ? "No orders match your search criteria."
                  : user?.role?.toLowerCase() === "admin"
                  ? "No orders have been placed yet."
                  : "You haven't placed any orders yet."}
              </p>
              {(searchQuery || dateFilter !== "all") && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setDateFilter("all");
                  }}
                  className="text-blue-600 text-sm font-medium hover:text-blue-800 transition-colors"
                >
                  Clear all filters
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Debug Info (Dev only) */}
      {process.env.NODE_ENV === "development" && (
        <div className="fixed bottom-20 right-4 bg-gray-900 text-white p-2 rounded text-xs opacity-75 max-w-xs">
          <div>Orders: {filteredOrders.length}</div>
          <div>User ID: {user?._id?.slice(-8) || "none"}</div>
          <div>Role: {user?.role || "none"}</div>
        </div>
      )}

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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">Order Receipt</h2>
              <button
                onClick={() => setShowInvoice(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
              <Invoice order={selectedOrder} />
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 md:relative">
        <BottomNav />
      </div>
    </section>
  );
};

export default Orders;
