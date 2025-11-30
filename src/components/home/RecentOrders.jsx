import React, { useState } from "react";
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
  FaEye,
  FaEyeSlash,
} from "react-icons/fa";
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { getOrders, updateOrderStatus } from "../../https/index";

const RecentOrders = ({ orders = [], onStatusChange }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingOrders, setUpdatingOrders] = useState(new Set());
  const [showAllOrders, setShowAllOrders] = useState(false);
  const queryClient = useQueryClient();

  // Use provided orders prop or fetch if not provided
  const { data: resData, isError } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      return await getOrders();
    },
    placeholderData: keepPreviousData,
    enabled: !orders || orders.length === 0, // Only fetch if orders prop is not provided
  });

  if (isError) {
    enqueueSnackbar("Something went wrong!", { variant: "error" });
  }

  // Get all orders - use prop if provided, otherwise use fetched data
  const allOrders = React.useMemo(() => {
    if (orders && orders.length > 0) {
      return orders.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.orderDate || a.date || 0);
        const dateB = new Date(b.createdAt || b.orderDate || b.date || 0);
        return dateB - dateA; // Most recent first
      });
    }

    const fetchedOrders = resData?.data?.data || [];
    return fetchedOrders.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.orderDate || a.date || 0);
      const dateB = new Date(b.createdAt || b.orderDate || b.date || 0);
      return dateB - dateA; // Most recent first
    });
  }, [orders, resData?.data?.data]);

  // Filter orders based on search query
  const filteredOrders = React.useMemo(() => {
    return allOrders.filter(
      (order) =>
        order.customerDetails?.name
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        order._id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.orderStatus?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allOrders, searchQuery]);

  // Show only recent orders (last 5) when not in "show all" mode, otherwise show filtered results
  const displayOrders = showAllOrders
    ? filteredOrders
    : filteredOrders.slice(0, 5);

  // Status configuration - Matching the Home component style
  const getStatusConfig = (status) => {
    const statusLower = status?.toLowerCase();
    switch (statusLower) {
      case "completed":
      case "delivered":
        return {
          icon: FaCheckCircle,
          color: "text-green-600",
          bgColor: "bg-green-50",
          borderColor: "border-green-200",
          text: "Completed",
        };
      case "pending":
        return {
          icon: FaClock,
          color: "text-yellow-600",
          bgColor: "bg-yellow-50",
          borderColor: "border-yellow-200",
          text: "Pending",
        };
      case "in progress":
      case "processing":
        return {
          icon: FaSpinner,
          color: "text-blue-600",
          bgColor: "bg-blue-50",
          borderColor: "border-blue-200",
          text: "In Progress",
        };
      case "cancelled":
      case "failed":
        return {
          icon: FaTimesCircle,
          color: "text-red-600",
          bgColor: "bg-red-50",
          borderColor: "border-red-200",
          text: "Cancelled",
        };
      default:
        return {
          icon: FaExclamationCircle,
          color: "text-gray-600",
          bgColor: "bg-gray-50",
          borderColor: "border-gray-200",
          text: status || "Unknown",
        };
    }
  };

  // Handle status update
  const handleStatusUpdate = async (orderId, currentStatus, newStatus) => {
    setUpdatingOrders((prev) => new Set(prev).add(orderId));

    try {
      // If onStatusChange prop is provided, use it
      if (onStatusChange) {
        const order = allOrders.find((o) => o._id === orderId);
        await onStatusChange(order, newStatus);
      } else {
        // Otherwise use the local update logic
        const previousOrders = queryClient.getQueryData(["orders"]);

        // Optimistic update
        if (previousOrders) {
          queryClient.setQueryData(["orders"], (old) => {
            if (!old?.data?.data) return old;

            return {
              ...old,
              data: {
                ...old.data,
                data: old.data.data.map((order) =>
                  order._id === orderId
                    ? { ...order, orderStatus: newStatus }
                    : order
                ),
              },
            };
          });
        }

        // Call API to update order status
        await updateOrderStatus({
          orderId,
          orderStatus: newStatus,
        });

        enqueueSnackbar(`Order status updated to ${newStatus}`, {
          variant: "success",
        });

        // Refetch to ensure data is in sync with server
        await queryClient.invalidateQueries({ queryKey: ["orders"] });
      }
    } catch (error) {
      console.error("Status update error:", error);

      // Revert optimistic update on error
      queryClient.invalidateQueries({ queryKey: ["orders"] });

      // Show detailed error message
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to update order status";
      enqueueSnackbar(errorMessage, { variant: "error" });
    } finally {
      setUpdatingOrders((prev) => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
    }
  };

  // Format date
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

  // Calculate and format total amount
  const calculateTotalAmount = (order) => {
    // If totalAmount is directly provided, use it
    if (order.totalAmount !== undefined && order.totalAmount !== null) {
      return order.totalAmount;
    }

    // If items array exists, calculate from items
    if (order.items && Array.isArray(order.items)) {
      return order.items.reduce((total, item) => {
        const price = item.price || item.unitPrice || 0;
        const quantity = item.quantity || 1;
        return total + price * quantity;
      }, 0);
    }

    // If subtotal and other amounts are provided
    if (order.subtotal !== undefined) {
      const subtotal = order.subtotal || 0;
      const tax = order.tax || order.taxAmount || 0;
      const shipping =
        order.shipping || order.shippingFee || order.deliveryFee || 0;
      const discount = order.discount || order.discountAmount || 0;

      return subtotal + tax + shipping - discount;
    }

    return 0;
  };

  // Format currency - CHANGED TO PESO
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

  // Toggle between showing all orders and recent orders only
  const toggleViewAll = () => {
    setShowAllOrders(!showAllOrders);
  };

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200 p-4 shadow-lg hover:shadow-xl transition-all duration-300">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-lg font-semibold text-gray-900">
          {showAllOrders ? "All Orders" : "Recent Orders"}
        </h1>
        <button
          onClick={toggleViewAll}
          className="text-blue-600 text-sm font-medium hover:underline flex items-center gap-1"
        >
          {showAllOrders ? (
            <>
              <FaEyeSlash className="text-xs" />
              Show Less
            </>
          ) : (
            <>
              <FaEye className="text-xs" />
              View All
            </>
          )}
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 mb-4">
        <FaSearch className="text-gray-500 text-sm" />
        <input
          type="text"
          placeholder="Search by name, order ID, or status..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-transparent outline-none text-gray-900 w-full text-sm placeholder-gray-500"
        />
      </div>

      {/* Orders Count Info */}
      <div className="mb-4">
        <p className="text-xs text-gray-600">
          Showing {displayOrders.length} of {filteredOrders.length} orders
          {!showAllOrders && filteredOrders.length > 5 && " (most recent 5)"}
        </p>
      </div>

      {/* Orders List */}
      <div className="overflow-y-auto max-h-[400px] space-y-3">
        {displayOrders.length > 0 ? (
          displayOrders.map((order) => {
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
                key={order._id}
                className={`border rounded-xl p-4 ${statusConfig.bgColor} ${statusConfig.borderColor} hover:shadow-md transition-all duration-200`}
              >
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
                          order.orderStatus?.toLowerCase() === "in progress" ||
                          order.orderStatus?.toLowerCase() === "processing"
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
                <div className="flex items-center gap-2 mb-2">
                  <FaUser className="text-gray-500 text-xs" />
                  <span className="text-xs font-medium text-gray-800">
                    {order.customerDetails?.name || "Unknown Customer"}
                  </span>
                </div>

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
                    <div className="text-xs text-gray-800 line-clamp-1">
                      {itemsPreview}
                    </div>
                  </div>
                ) : null}

                {/* Action Buttons */}
                {showActions && availableActions.length > 0 && (
                  <div className="flex gap-2 pt-2 border-t border-gray-200">
                    {availableActions.map((action) => {
                      const ActionIcon = action.icon;
                      return (
                        <button
                          key={action.status}
                          onClick={() =>
                            handleStatusUpdate(
                              order._id,
                              order.orderStatus,
                              action.status
                            )
                          }
                          disabled={isUpdating}
                          className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                            action.variant === "primary"
                              ? "bg-blue-500 hover:bg-blue-600 text-white"
                              : "bg-green-500 hover:bg-green-600 text-white"
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {isUpdating ? (
                            <FaSpinner className="animate-spin" />
                          ) : (
                            <ActionIcon className="text-xs" />
                          )}
                          {action.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="flex justify-center items-center py-8">
            <div className="text-center">
              <FaReceipt className="mx-auto text-gray-400 text-2xl mb-2" />
              <p className="text-gray-500 text-sm">
                {searchQuery
                  ? "No orders found matching your search"
                  : "No orders available"}
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-blue-600 text-xs mt-1 hover:underline"
                >
                  Clear search
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentOrders;
