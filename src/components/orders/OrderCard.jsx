import React, { useState } from "react";
import {
  FaPrint,
  FaTrashAlt,
  FaUser,
  FaReceipt,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationCircle,
  FaSpinner,
  FaCheck,
} from "react-icons/fa";

const OrderCard = ({
  order,
  onViewReceipt,
  onDelete,
  onStatusChange,
  isDeleting = false,
  isUpdating = false,
}) => {
  const [localDeleting, setLocalDeleting] = useState(false);

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

  // Calculate total amount (matches RecentOrders logic)
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

  // Format currency (matches RecentOrders)
  const formatCurrency = (amount) => {
    const numericAmount =
      typeof amount === "number" ? amount : parseFloat(amount) || 0;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
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

  const handleDelete = async () => {
    if (
      window.confirm(
        "Are you sure you want to delete this order? This action cannot be undone."
      )
    ) {
      setLocalDeleting(true);
      try {
        await onDelete(order._id);
      } catch (error) {
        console.error("Delete error:", error);
      } finally {
        setLocalDeleting(false);
      }
    }
  };

  const handleStatusChangeLocal = async (newStatus) => {
    try {
      await onStatusChange(order, newStatus);
    } catch (error) {
      console.error("Status update error:", error);
    }
  };

  const statusConfig = getStatusConfig(order.orderStatus);
  const StatusIcon = statusConfig.icon;
  const totalAmount = calculateTotalAmount(order);
  const itemsCount = getItemsCount(order);
  const itemsPreview = getItemsPreview(order);

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

  const showActions = shouldShowActions(order);
  const availableActions = getAvailableActions(order);
  const deleting = isDeleting || localDeleting;

  return (
    <div
      className={`border rounded-lg p-4 sm:p-6 ${statusConfig.bgColor} ${
        statusConfig.borderColor
      } hover:shadow-md transition-all duration-200 w-full ${
        deleting ? "opacity-50" : ""
      }`}
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
          {isUpdating || deleting ? (
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
            {isUpdating
              ? "Updating..."
              : deleting
              ? "Deleting..."
              : statusConfig.text}
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

      {/* Table Info */}
      {order.table?.tableNo && (
        <div className="flex items-center gap-2 mb-3 text-xs sm:text-sm text-gray-600">
          <span>Table {order.table.tableNo}</span>
          <span>•</span>
          <span>Dine In</span>
        </div>
      )}

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
                onClick={() => handleStatusChangeLocal(action.status)}
                disabled={isUpdating || deleting}
                className={`flex items-center gap-1 px-3 py-2 rounded text-xs font-medium transition-colors ${
                  action.variant === "primary"
                    ? "bg-blue-500 hover:bg-blue-600 text-white"
                    : "bg-green-500 hover:bg-green-600 text-white"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isUpdating ? (
                  <FaSpinner className="animate-spin text-[10px]" />
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
          onChange={(e) => handleStatusChangeLocal(e.target.value)}
          disabled={isUpdating || deleting}
          className={`flex-1 px-3 py-2 rounded text-xs font-medium border ${statusConfig.bgColor} ${statusConfig.color} ${statusConfig.borderColor} disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <option value="pending">Pending</option>
          <option value="in progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Receipt and Delete Buttons */}
      <div className="flex gap-2 pt-3 border-t border-gray-200">
        <button
          onClick={() => onViewReceipt(order)}
          disabled={deleting}
          className="flex-1 bg-[#025cca] text-white px-3 py-2 rounded text-xs font-medium flex items-center gap-2 justify-center hover:bg-[#014aa3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FaPrint className="text-[10px]" />
          View Receipt
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex-1 bg-red-500 text-white px-3 py-2 rounded text-xs font-medium flex items-center gap-2 justify-center hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {deleting ? (
            <FaSpinner className="animate-spin text-[10px]" />
          ) : (
            <FaTrashAlt className="text-[10px]" />
          )}
          {deleting ? "Deleting..." : "Delete"}
        </button>
      </div>
    </div>
  );
};

export default OrderCard;
