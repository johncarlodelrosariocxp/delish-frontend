import React, { useState, useEffect, useRef } from "react";
import {
  FaSearch,
  FaUser,
  FaReceipt,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationCircle,
  FaSpinner,
  FaCheck,
  FaArrowUp,
  FaPrint,
  FaCalendar,
} from "react-icons/fa";
import {
  keepPreviousData,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { getOrders, updateOrderStatus } from "../https/index";
import BottomNav from "../components/shared/BottomNav";
import BackButton from "../components/shared/BackButton";
import Invoice from "../components/invoice/Invoice";

const Orders = () => {
  const [status, setStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [totalSales, setTotalSales] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [updatingOrders, setUpdatingOrders] = useState(new Set());
  const [dateFilter, setDateFilter] = useState("all"); // "all", "today", "yesterday", "thisMonth", "lastMonth", "thisYear", "lastYear"
  const scrollRef = useRef(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    document.title = "POS | Orders";
  }, []);

  const {
    data: resData,
    isError,
    isLoading,
  } = useQuery({
    queryKey: ["orders"],
    queryFn: getOrders,
    placeholderData: keepPreviousData,
  });

  // Status configuration (matches RecentOrders)
  const getStatusConfig = (status) => {
    const statusLower = status?.toLowerCase();
    switch (statusLower) {
      case "completed":
      case "delivered":
        return {
          icon: FaCheckCircle,
          color: "text-green-500",
          bgColor: "bg-green-50",
          borderColor: "border-green-200",
          text: "Completed",
        };
      case "pending":
        return {
          icon: FaClock,
          color: "text-yellow-500",
          bgColor: "bg-yellow-50",
          borderColor: "border-yellow-200",
          text: "Pending",
        };
      case "in progress":
      case "processing":
        return {
          icon: FaSpinner,
          color: "text-blue-500",
          bgColor: "bg-blue-50",
          borderColor: "border-blue-200",
          text: "In Progress",
        };
      case "cancelled":
      case "failed":
        return {
          icon: FaTimesCircle,
          color: "text-red-500",
          bgColor: "bg-red-50",
          borderColor: "border-red-200",
          text: "Cancelled",
        };
      default:
        return {
          icon: FaExclamationCircle,
          color: "text-gray-500",
          bgColor: "bg-gray-50",
          borderColor: "border-gray-200",
          text: "Unknown",
        };
    }
  };

  // Handle status update (matches RecentOrders functionality)
  const handleStatusUpdate = async (order, newStatus) => {
    setUpdatingOrders((prev) => new Set(prev).add(order._id));

    try {
      // Update order status optimistically
      const previousOrders = queryClient.getQueryData(["orders"]);

      // Optimistic update
      if (previousOrders) {
        queryClient.setQueryData(["orders"], (old) => {
          if (!old?.data?.data) return old;

          return {
            ...old,
            data: {
              ...old.data,
              data: old.data.data.map((o) =>
                o._id === order._id ? { ...o, orderStatus: newStatus } : o
              ),
            },
          };
        });
      }

      // Call API to update order status
      await updateOrderStatus({
        orderId: order._id,
        orderStatus: newStatus,
      });

      enqueueSnackbar(`Order status updated to ${newStatus}`, {
        variant: "success",
      });

      // Refetch to ensure data is in sync with server
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
    } catch (error) {
      // Revert optimistic update on error
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      enqueueSnackbar("Failed to update order status", { variant: "error" });
    } finally {
      setUpdatingOrders((prev) => {
        const newSet = new Set(prev);
        newSet.delete(order._id);
        return newSet;
      });
    }
  };

  useEffect(() => {
    if (isError) {
      enqueueSnackbar("Something went wrong while fetching orders!", {
        variant: "error",
      });
    }
  }, [isError]);

  const orders = resData?.data?.data || [];

  // Filter orders by date range
  const filterByDateRange = (order, range) => {
    if (range === "all") return true;

    const orderDate = new Date(order.createdAt || order.orderDate);
    const today = new Date();

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

    // Calculate total sales from completed orders
    const completedOrders = filteredByDate.filter(
      (o) =>
        o.orderStatus?.toLowerCase() === "completed" ||
        o.orderStatus?.toLowerCase() === "delivered"
    );
    const total = completedOrders.reduce(
      (sum, o) => sum + (o.bills?.totalWithTax || o.totalAmount || 0),
      0
    );
    setTotalSales(total);

    // Calculate pending count
    const pendingOrders = filteredByDate.filter(
      (o) => o.orderStatus?.toLowerCase() === "pending"
    );
    setPendingCount(pendingOrders.length);
  }, [orders, dateFilter]);

  // Filter orders based on status, search query, and date filter
  const filteredOrders = orders.filter((order) => {
    // Date filter
    const dateMatch = filterByDateRange(order, dateFilter);

    // Status filter (removed "pending" status)
    const statusMatch =
      status === "all" ||
      (status === "progress" &&
        (order.orderStatus?.toLowerCase() === "in progress" ||
          order.orderStatus?.toLowerCase() === "processing")) ||
      (status === "completed" &&
        (order.orderStatus?.toLowerCase() === "completed" ||
          order.orderStatus?.toLowerCase() === "delivered"));

    // Search filter
    const searchMatch =
      order.customerDetails?.name
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      order._id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.orderStatus?.toLowerCase().includes(searchQuery.toLowerCase());

    return dateMatch && statusMatch && searchMatch;
  });

  // Calculate and format total amount (matches RecentOrders)
  const calculateTotalAmount = (order) => {
    if (order.totalAmount !== undefined && order.totalAmount !== null) {
      return order.totalAmount;
    }
    if (
      order.bills?.totalWithTax !== undefined &&
      order.bills.totalWithTax !== null
    ) {
      return order.bills.totalWithTax;
    }
    if (order.items && Array.isArray(order.items)) {
      return order.items.reduce((total, item) => {
        const price = item.price || item.unitPrice || 0;
        const quantity = item.quantity || 1;
        return total + price * quantity;
      }, 0);
    }
    return 0;
  };

  // Format currency (matches RecentOrders) - Changed to Philippine Peso
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

  // Format date (matches RecentOrders)
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch (error) {
      return "Invalid Date";
    }
  };

  // Get items count (matches RecentOrders)
  const getItemsCount = (order) => {
    if (order.items && Array.isArray(order.items)) {
      return order.items.reduce(
        (total, item) => total + (item.quantity || 1),
        0
      );
    }
    return order.itemsCount || order.quantity || 0;
  };

  // Get items preview text (matches RecentOrders)
  const getItemsPreview = (order) => {
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
      .reduce((total, item) => total + (item.quantity || 1), 0);

    if (totalItems > shownItems) {
      return `${itemsText} +${totalItems - shownItems} more`;
    }

    return itemsText;
  };

  // Check if action buttons should be shown for an order
  const shouldShowActions = (order) => {
    const status = order.orderStatus?.toLowerCase();
    return (
      status === "pending" ||
      status === "in progress" ||
      status === "processing"
    );
  };

  // Get available actions for an order
  const getAvailableActions = (order) => {
    const status = order.orderStatus?.toLowerCase();
    const actions = [];

    if (status === "pending") {
      actions.push({
        label: "Start Progress",
        status: "in progress",
        variant: "primary",
        icon: FaSpinner,
      });
    }

    if (status === "in progress" || status === "processing") {
      actions.push({
        label: "Mark Complete",
        status: "completed",
        variant: "success",
        icon: FaCheck,
      });
    }

    return actions;
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

  // Get date filter display label
  const getDateFilterLabel = () => {
    switch (dateFilter) {
      case "today":
        return "Today";
      case "yesterday":
        return "Yesterday";
      case "thisMonth":
        return "This Month";
      case "lastMonth":
        return "Last Month";
      case "thisYear":
        return "This Year";
      case "lastYear":
        return "Last Year";
      default:
        return "All Time";
    }
  };

  // Order Card Component (matches RecentOrders style)
  const OrderCard = ({ order, onViewReceipt }) => {
    const statusConfig = getStatusConfig(order.orderStatus);
    const StatusIcon = statusConfig.icon;
    const totalAmount = calculateTotalAmount(order);
    const itemsCount = getItemsCount(order);
    const itemsPreview = getItemsPreview(order);
    const isUpdating = updatingOrders.has(order._id);
    const showActions = shouldShowActions(order);
    const availableActions = getAvailableActions(order);

    return (
      <div
        className={`border rounded-lg p-4 sm:p-6 ${statusConfig.bgColor} ${statusConfig.borderColor} hover:shadow-md transition-all duration-200 w-full backdrop-blur-sm bg-opacity-50 glass-effect`}
        style={{
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(248,250,252,0.9) 100%)",
          boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.07)",
          border: "1px solid rgba(255, 255, 255, 0.18)",
        }}
      >
        {/* Order Header */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <FaReceipt className="text-gray-600 text-sm sm:text-base" />
            <span className="font-mono text-xs sm:text-sm text-gray-700">
              #{order._id?.slice(-8) || "N/A"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {isUpdating ? (
              <FaSpinner className="text-blue-500 text-xs sm:text-sm animate-spin" />
            ) : (
              <StatusIcon
                className={`text-xs sm:text-sm ${statusConfig.color} ${
                  order.orderStatus?.toLowerCase() === "in progress"
                    ? "animate-spin"
                    : ""
                }`}
              />
            )}
            <span
              className={`text-xs sm:text-sm font-medium capitalize ${statusConfig.color}`}
            >
              {isUpdating ? "Updating..." : statusConfig.text}
            </span>
          </div>
        </div>

        {/* Customer Info */}
        <div className="flex items-center gap-2 mb-3">
          <FaUser className="text-gray-500 text-xs sm:text-sm" />
          <span className="text-xs sm:text-sm font-medium text-gray-800">
            {order.customerDetails?.name || "Unknown Customer"}
          </span>
        </div>

        {/* Order Details */}
        <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm mb-3">
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
        {(order.items && order.items.length > 0) || itemsCount > 0 ? (
          <div className="mt-3 pt-3 border-t border-gray-200 mb-3">
            <div className="text-xs sm:text-sm text-gray-600 mb-1">
              Items {itemsCount > 0 && `(${itemsCount})`}
            </div>
            <div className="text-xs sm:text-sm text-gray-800 line-clamp-1">
              {itemsPreview}
            </div>
          </div>
        ) : null}

        {/* Action Buttons */}
        {showActions && availableActions.length > 0 && (
          <div className="flex gap-2 pt-3 border-t border-gray-200 mb-3">
            {availableActions.map((action) => {
              const ActionIcon = action.icon;
              return (
                <button
                  key={action.status}
                  onClick={() => handleStatusUpdate(order, action.status)}
                  disabled={isUpdating}
                  className={`flex items-center gap-1 px-3 py-2 rounded text-xs font-medium transition-colors backdrop-blur-sm ${
                    action.variant === "primary"
                      ? "bg-blue-500 hover:bg-blue-600 text-white"
                      : "bg-green-500 hover:bg-green-600 text-white"
                  } disabled:opacity-50 disabled:cursor-not-allowed glass-effect`}
                  style={{
                    background:
                      action.variant === "primary"
                        ? "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)"
                        : "linear-gradient(135deg, #10b981 0%, #047857 100%)",
                    boxShadow: "0 4px 15px 0 rgba(59, 130, 246, 0.3)",
                  }}
                >
                  {isUpdating ? (
                    <FaSpinner className="animate-spin" />
                  ) : (
                    <ActionIcon className="text-[10px]" />
                  )}
                  {action.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Status Dropdown for manual selection */}
        <div className="flex gap-2 pt-3 border-t border-gray-200 mb-3">
          <select
            value={order.orderStatus}
            onChange={(e) => handleStatusUpdate(order, e.target.value)}
            disabled={isUpdating}
            className={`flex-1 px-3 py-2 rounded text-xs font-medium border backdrop-blur-sm ${statusConfig.bgColor} ${statusConfig.color} ${statusConfig.borderColor} disabled:opacity-50 glass-effect`}
            style={{
              background: "rgba(255, 255, 255, 0.8)",
              border: "1px solid rgba(255, 255, 255, 0.3)",
            }}
          >
            <option value="pending">Pending</option>
            <option value="in progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Receipt Button */}
        <div className="flex gap-2 pt-3 border-t border-gray-200">
          <button
            onClick={() => onViewReceipt(order)}
            className="flex-1 bg-[#025cca] text-white px-3 py-2 rounded text-xs font-medium flex items-center gap-2 justify-center hover:bg-[#014aa3] transition-colors backdrop-blur-sm glass-effect"
            style={{
              background: "linear-gradient(135deg, #025cca 0%, #014aa3 100%)",
              boxShadow: "0 4px 15px 0 rgba(2, 92, 202, 0.3)",
            }}
          >
            <FaPrint className="text-[10px]" />
            View Receipt
          </button>
        </div>
      </div>
    );
  };

  return (
    <section className="bg-gradient-to-br from-blue-50 via-white to-cyan-50 min-h-screen flex flex-col relative">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/50 sticky top-0 z-30">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between px-4 md:px-6 py-4 gap-4">
          <div className="flex items-center gap-4">
            <BackButton />
            <h1 className="text-[#333333] text-xl sm:text-2xl font-bold tracking-wider">
              Orders
            </h1>
          </div>
          <div className="flex flex-wrap gap-2 md:gap-4 items-center">
            {/* Updated status filters - removed "pending" */}
            {["all", "progress", "completed"].map((type) => (
              <button
                key={type}
                onClick={() => setStatus(type)}
                className={`text-[#555555] text-xs sm:text-sm ${
                  status === type ? "bg-[#eaeaea]" : "bg-transparent"
                } rounded-lg px-3 py-2 font-semibold transition backdrop-blur-sm glass-effect`}
                style={{
                  background:
                    status === type
                      ? "rgba(255, 255, 255, 0.8)"
                      : "transparent",
                  border:
                    status === type
                      ? "1px solid rgba(255, 255, 255, 0.3)"
                      : "1px solid transparent",
                }}
              >
                {type === "all"
                  ? "All"
                  : type === "progress"
                  ? "In Progress"
                  : type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}

            {/* Date Filter Dropdown */}
            <div className="flex items-center gap-2 backdrop-blur-sm glass-effect rounded-lg px-3 py-2">
              <FaCalendar className="text-gray-600 text-xs" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-transparent outline-none text-black text-xs sm:text-sm"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="thisMonth">This Month</option>
                <option value="lastMonth">Last Month</option>
                <option value="thisYear">This Year</option>
                <option value="lastYear">Last Year</option>
              </select>
            </div>

            {/* Metrics Display */}
            <div className="flex flex-wrap gap-2 md:gap-4">
              <span className="text-xs sm:text-sm font-semibold text-green-700 backdrop-blur-sm px-3 py-1 rounded-full glass-effect">
                Sales: {formatCurrency(totalSales)}
              </span>
            </div>
          </div>
        </div>

        {/* Search Bar - Matches RecentOrders */}
        <div className="flex items-center gap-2 bg-gray-100/80 backdrop-blur-sm rounded-md px-3 py-2 mx-4 mb-4 mt-2 glass-effect">
          <FaSearch className="text-gray-600 text-xs sm:text-sm" />
          <input
            type="text"
            placeholder="Search by name, order ID, or status..."
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
        className="flex-1 overflow-y-auto px-2 sm:px-4 md:px-6 py-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 scrollbar-hide"
      >
        {isLoading ? (
          <div className="col-span-3 flex justify-center items-center py-8">
            <div className="text-center backdrop-blur-sm glass-effect rounded-lg p-6">
              <FaSpinner className="mx-auto text-gray-400 text-2xl mb-2 animate-spin" />
              <p className="text-gray-500 text-sm">Loading orders...</p>
            </div>
          </div>
        ) : filteredOrders.length > 0 ? (
          filteredOrders.map((order) => (
            <OrderCard
              key={order._id}
              order={order}
              onViewReceipt={handleViewReceipt}
            />
          ))
        ) : (
          <div className="col-span-3 flex justify-center items-center py-8">
            <div className="text-center backdrop-blur-sm glass-effect rounded-lg p-6">
              <FaReceipt className="mx-auto text-gray-400 text-2xl mb-2" />
              <p className="text-gray-500 text-sm">
                {searchQuery || status !== "all" || dateFilter !== "all"
                  ? "No orders found matching your criteria"
                  : "No orders available"}
              </p>
              {(searchQuery || status !== "all" || dateFilter !== "all") && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setStatus("all");
                    setDateFilter("all");
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

      {/* Scroll to Top */}
      {showScrollButton && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-20 right-4 sm:right-6 bg-gradient-to-br from-[#025cca] to-[#014aa3] text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all z-20 backdrop-blur-sm glass-effect"
          style={{
            boxShadow: "0 8px 25px 0 rgba(2, 92, 202, 0.4)",
          }}
        >
          <FaArrowUp />
        </button>
      )}

      {/* Invoice Modal */}
      {showInvoice && selectedOrder && (
        <Invoice orderInfo={selectedOrder} setShowInvoice={setShowInvoice} />
      )}

      {/* Bottom Navigation */}
      <BottomNav />

      {/* Glass effect styles */}
      <style jsx>{`
        .glass-effect {
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }
      `}</style>
    </section>
  );
};

export default Orders;
