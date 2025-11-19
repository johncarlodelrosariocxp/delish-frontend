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
  const [inProgressCount, setInProgressCount] = useState(0);
  const [updatingOrders, setUpdatingOrders] = useState(new Set());
  const [dateFilter, setDateFilter] = useState("today");
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

  // Status configuration
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

  // Handle status update
  const handleStatusUpdate = async (order, newStatus) => {
    setUpdatingOrders((prev) => new Set(prev).add(order._id));

    try {
      const previousOrders = queryClient.getQueryData(["orders"]);

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

      await updateOrderStatus({
        orderId: order._id,
        orderStatus: newStatus,
      });

      enqueueSnackbar(`Order status updated to ${newStatus}`, {
        variant: "success",
      });

      await queryClient.invalidateQueries({ queryKey: ["orders"] });
    } catch (error) {
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

  // Sort orders by latest first (newest to oldest)
  const sortedOrders = React.useMemo(() => {
    return [...orders].sort((a, b) => {
      const dateA = new Date(a.createdAt || a.orderDate || a.date || 0);
      const dateB = new Date(b.createdAt || b.orderDate || b.date || 0);
      return dateB - dateA;
    });
  }, [orders]);

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
    const filteredByDate = sortedOrders.filter((order) =>
      filterByDateRange(order, dateFilter)
    );

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

    const inProgressOrders = filteredByDate.filter(
      (o) =>
        o.orderStatus?.toLowerCase() === "in progress" ||
        o.orderStatus?.toLowerCase() === "processing"
    );
    setInProgressCount(inProgressOrders.length);
  }, [sortedOrders, dateFilter]);

  // Filter orders based on status, search query, and date filter
  const filteredOrders = React.useMemo(() => {
    return sortedOrders.filter((order) => {
      const dateMatch = filterByDateRange(order, dateFilter);

      const statusMatch =
        status === "all" ||
        (status === "progress" &&
          (order.orderStatus?.toLowerCase() === "in progress" ||
            order.orderStatus?.toLowerCase() === "processing")) ||
        (status === "completed" &&
          (order.orderStatus?.toLowerCase() === "completed" ||
            order.orderStatus?.toLowerCase() === "delivered"));

      const searchMatch =
        order.customerDetails?.name
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        order._id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.orderStatus?.toLowerCase().includes(searchQuery.toLowerCase());

      return dateMatch && statusMatch && searchMatch;
    });
  }, [sortedOrders, status, searchQuery, dateFilter]);

  // Calculate and format total amount
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
      return new Date(dateString).toLocaleDateString("en-US", {
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
    if (order.items && Array.isArray(order.items)) {
      return order.items.reduce(
        (total, item) => total + (item.quantity || 1),
        0
      );
    }
    return order.itemsCount || order.quantity || 0;
  };

  // Get items preview text
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
    return status === "in progress" || status === "processing";
  };

  // Get available actions for an order
  const getAvailableActions = (order) => {
    const status = order.orderStatus?.toLowerCase();
    const actions = [];

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

  // Order Card Component
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
            {isUpdating ? (
              <FaSpinner className="text-blue-500 text-xs animate-spin" />
            ) : (
              <StatusIcon
                className={`text-xs ${statusConfig.color} ${
                  order.orderStatus?.toLowerCase() === "in progress"
                    ? "animate-spin"
                    : ""
                }`}
              />
            )}
            <span
              className={`text-xs font-medium capitalize ${statusConfig.color}`}
            >
              {isUpdating ? "Updating..." : statusConfig.text}
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
        {(order.items && order.items.length > 0) || itemsCount > 0 ? (
          <div className="mt-2 pt-2 border-t border-gray-200 mb-3">
            <div className="text-xs text-gray-600 mb-1">
              Items {itemsCount > 0 && `(${itemsCount})`}
            </div>
            <div className="text-xs text-gray-800 line-clamp-2">
              {itemsPreview}
            </div>
          </div>
        ) : null}

        {/* Action Buttons */}
        {showActions && availableActions.length > 0 && (
          <div className="flex gap-2 pt-2 border-t border-gray-200 mb-3">
            {availableActions.map((action) => {
              const ActionIcon = action.icon;
              return (
                <button
                  key={action.status}
                  onClick={() => handleStatusUpdate(order, action.status)}
                  disabled={isUpdating}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                    action.variant === "primary"
                      ? "bg-blue-500 hover:bg-blue-600 text-white"
                      : "bg-green-500 hover:bg-green-600 text-white"
                  } disabled:opacity-50 disabled:cursor-not-allowed flex-1`}
                >
                  {isUpdating ? (
                    <FaSpinner className="animate-spin text-[8px]" />
                  ) : (
                    <ActionIcon className="text-[8px]" />
                  )}
                  <span className="truncate">{action.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Status Dropdown */}
        <div className="flex gap-2 pt-2 border-t border-gray-200 mb-3">
          <select
            value={order.orderStatus}
            onChange={(e) => handleStatusUpdate(order, e.target.value)}
            disabled={isUpdating}
            className={`flex-1 px-2 py-1 rounded text-xs font-medium border ${statusConfig.bgColor} ${statusConfig.color} ${statusConfig.borderColor} disabled:opacity-50`}
          >
            <option value="in progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

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
          </div>
          <div className="flex flex-wrap gap-2 md:gap-4 items-center">
            {/* Status filters */}
            {["all", "progress", "completed"].map((type) => (
              <button
                key={type}
                onClick={() => setStatus(type)}
                className={`text-[#555555] text-xs sm:text-sm ${
                  status === type ? "bg-[#eaeaea]" : "bg-transparent"
                } rounded-lg px-3 py-2 font-semibold transition`}
              >
                {type === "all"
                  ? "All"
                  : type === "progress"
                  ? "In Progress"
                  : "Completed"}
              </button>
            ))}

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
              <span className="text-xs sm:text-sm font-semibold text-blue-700 bg-blue-50 px-3 py-1 rounded-full">
                In Progress: {inProgressCount}
              </span>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-2 bg-gray-100 rounded-md px-3 py-2 mx-4 mb-4 mt-2">
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
        className="flex-1 overflow-y-auto px-4 py-4 mb-16 md:mb-6"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-fr">
          {isLoading ? (
            <div className="col-span-full flex justify-center items-center py-8">
              <div className="text-center bg-white rounded-lg p-6">
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
            <div className="col-span-full flex justify-center items-center py-8">
              <div className="text-center bg-white rounded-lg p-6">
                <FaReceipt className="mx-auto text-gray-400 text-2xl mb-2" />
                <p className="text-gray-500 text-sm">
                  {searchQuery || status !== "all" || dateFilter !== "today"
                    ? "No orders found matching your criteria"
                    : "No orders available"}
                </p>
                {(searchQuery ||
                  status !== "all" ||
                  dateFilter !== "today") && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setStatus("all");
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
