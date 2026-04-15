import React, { useState } from "react";
import {
  FaPrint,
  FaTrash,
  FaUser,
  FaReceipt,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationCircle,
  FaSpinner,
  FaUserTie,
  FaCashRegister,
  FaUserCog,
} from "react-icons/fa";
import axiosWrapper from "../../https/axiosWrapper"; // IMPORTANTE: Gamitin ang axiosWrapper

const OrderCard = ({
  order,
  onViewReceipt,
  onDelete,
  onStatusChange,
  isDeleting = false,
  isUpdating = false,
}) => {
  const [localDeleting, setLocalDeleting] = useState(false);

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
          text: order.orderStatus || "Pending",
        };
    }
  };

  const calculateTotalAmount = (order) => {
    if (order.totalAmount !== undefined && order.totalAmount !== null) {
      return order.totalAmount;
    }
    if (order.bills?.totalWithTax !== undefined && order.bills.totalWithTax !== null) {
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

  const formatCurrency = (amount) => {
    const numericAmount = typeof amount === "number" ? amount : parseFloat(amount) || 0;
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

  const formatTime = (dateString) => {
    if (!dateString) return "";
    try {
      return new Date(dateString).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch (error) {
      return "";
    }
  };

  const getItemsCount = (order) => {
    if (order.items && Array.isArray(order.items)) {
      return order.items.reduce((total, item) => total + (item.quantity || 1), 0);
    }
    return order.itemsCount || order.quantity || 0;
  };

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
    const shownItems = order.items.slice(0, 3).reduce((total, item) => total + (item.quantity || 1), 0);

    if (totalItems > shownItems) {
      return `${itemsText} +${totalItems - shownItems} more`;
    }

    return itemsText;
  };

  const getCashierInfo = (order) => {
    let userName = "Staff";
    let userRole = "Cashier";
    let found = false;

    const extractUserName = (userObj) => {
      if (!userObj) return null;
      if (typeof userObj === 'string') return userObj;
      if (typeof userObj === 'object') {
        if (userObj.name) return userObj.name;
        if (userObj.fullName) return userObj.fullName;
        if (userObj.username) return userObj.username;
        if (userObj.firstName) {
          if (userObj.lastName) return `${userObj.firstName} ${userObj.lastName}`;
          return userObj.firstName;
        }
        if (userObj.email) return userObj.email.split('@')[0];
      }
      return null;
    };

    const extractUserRole = (userObj) => {
      if (!userObj) return null;
      if (typeof userObj === 'object') {
        if (userObj.role) return userObj.role;
        if (userObj.userRole) return userObj.userRole;
        if (userObj.isAdmin) return "Admin";
      }
      return null;
    };

    if (order.user && !found) {
      const extractedName = extractUserName(order.user);
      if (extractedName) {
        userName = extractedName;
        found = true;
        const extractedRole = extractUserRole(order.user);
        if (extractedRole) userRole = extractedRole;
      }
    }

    if (order.cashier && !found) {
      const extractedName = extractUserName(order.cashier);
      if (extractedName) {
        userName = extractedName;
        found = true;
      }
    }

    if (order.cashierName && !found) {
      userName = order.cashierName;
      found = true;
    }

    if (order.isAdminOrder || order.processedByAdmin) {
      userRole = "Admin";
    }

    if (userName && userName !== "Staff") {
      userName = userName.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
    }

    userRole = userRole.charAt(0).toUpperCase() + userRole.slice(1).toLowerCase();
    
    return { name: userName, role: userRole, found };
  };

  const getPaymentMethod = (order) => {
    if (order.paymentMethod) {
      return order.paymentMethod.charAt(0).toUpperCase() + order.paymentMethod.slice(1).toLowerCase();
    }
    if (order.bills?.paymentMethod) {
      const method = order.bills.paymentMethod;
      return method.charAt(0).toUpperCase() + method.slice(1).toLowerCase();
    }
    return "Cash";
  };

  // ========== WORKING DELETE FUNCTION - GAMIT ANG AXIOSWRAPPER ==========
  const handleDeleteOrder = async () => {
    const confirmDelete = window.confirm(
      "⚠️ DELETE ORDER WARNING ⚠️\n\n" +
      "Are you sure you want to DELETE this order?\n" +
      "Order ID: " + (order._id?.slice(-8) || "N/A") + "\n" +
      "Customer: " + (order.customerDetails?.name || order.customerName || "Walk-in Customer") + "\n" +
      "Amount: " + formatCurrency(calculateTotalAmount(order)) + "\n\n" +
      "⚠️ THIS ACTION CANNOT BE UNDONE!\n" +
      "The order will be permanently removed from the database."
    );
    
    if (!confirmDelete) return;
    
    setLocalDeleting(true);
    
    try {
      if (!order._id) {
        throw new Error("Order ID is missing - cannot delete");
      }
      
      console.log(`🗑️ Deleting order ${order._id}...`);
      
      // GAMITIN ANG AXIOSWRAPPER (may token na ito automatically)
      const response = await axiosWrapper.delete(`/api/order/${order._id}`);
      
      console.log('Delete response:', response.data);
      
      if (response.data && response.data.success === true) {
        console.log(`✅ Order ${order._id} successfully deleted`);
        
        // Tawagin ang onDelete callback para ma-remove sa UI
        if (onDelete && typeof onDelete === 'function') {
          onDelete(order._id);
        }
        
        alert(`✅ Order #${order._id?.slice(-8)} has been permanently deleted.`);
      } else {
        throw new Error(response.data?.message || "Failed to delete order");
      }
      
    } catch (error) {
      console.error("❌ Order deletion error:", error);
      
      let errorMessage = "Failed to delete order";
      let errorDetails = "";
      
      if (error.response) {
        console.error("Error response data:", error.response.data);
        console.error("Error response status:", error.response.status);
        
        if (error.response.status === 404) {
          errorMessage = "Order not found. It may have been already deleted or the ID is invalid.";
          errorDetails = `Order ID: ${order._id}`;
        } else if (error.response.status === 401) {
          errorMessage = "Authentication failed. Please login again.";
          errorDetails = "Your session may have expired.";
        } else if (error.response.status === 403) {
          errorMessage = "You don't have permission to delete orders.";
          errorDetails = "Please contact an administrator.";
        } else if (error.response.status === 500) {
          errorMessage = "Server error occurred while deleting order.";
          errorDetails = "Please try again or contact support.";
        } else {
          errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
          errorDetails = error.response.data?.error || "";
        }
      } else if (error.request) {
        errorMessage = "No response from server. Please check your network connection.";
        errorDetails = "The server may be down or unreachable.";
      } else {
        errorMessage = error.message;
        errorDetails = "Please check your configuration and try again.";
      }
      
      alert(`❌ FAILED TO DELETE ORDER\n\nError: ${errorMessage}\n${errorDetails ? `\nDetails: ${errorDetails}` : ''}\n\nPlease try again or contact support.`);
    } finally {
      setLocalDeleting(false);
    }
  };
  // ========== END DELETE FUNCTION ==========

  const statusConfig = getStatusConfig(order.orderStatus);
  const StatusIcon = statusConfig.icon;
  const totalAmount = calculateTotalAmount(order);
  const itemsCount = getItemsCount(order);
  const itemsPreview = getItemsPreview(order);
  const cashierInfo = getCashierInfo(order);
  const paymentMethod = getPaymentMethod(order);
  const deleting = isDeleting || localDeleting;
  
  const UserRoleIcon = cashierInfo.role === "Admin" ? FaUserCog : FaUserTie;

  const getCustomerName = (order) => {
    if (order.customerDetails?.name) return order.customerDetails.name;
    if (order.customerName) return order.customerName;
    if (order.customer?.name) return order.customer.name;
    return "Walk-in Customer";
  };

  const customerName = getCustomerName(order);
  const isCancelled = order.orderStatus?.toLowerCase() === "cancelled";

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-all duration-200 w-full h-full flex flex-col">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <FaReceipt className="text-gray-600 text-sm" />
          <div className="flex flex-col">
            <span className="font-mono text-xs text-gray-700">
              #{order._id?.slice(-8) || "N/A"}
            </span>
            <span className="text-[10px] text-gray-500">
              {formatTime(order.createdAt || order.orderDate)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isUpdating || deleting ? (
            <FaSpinner className="text-blue-500 text-xs animate-spin" />
          ) : (
            <StatusIcon className={`text-xs ${statusConfig.color}`} />
          )}
          <span className={`text-xs font-medium capitalize ${statusConfig.color}`}>
            {isUpdating ? "Updating..." : deleting ? "Deleting..." : statusConfig.text}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="flex items-center gap-2">
          <FaUser className="text-gray-500 text-xs" />
          <div className="flex flex-col">
            <span className="text-xs font-medium text-gray-800">{customerName}</span>
            <span className="text-[10px] text-gray-500">Customer</span>
          </div>
        </div>
        <div className="flex items-center gap-2 justify-end">
          <div className="flex flex-col items-end">
            <span className="text-xs font-medium text-gray-800">{cashierInfo.name}</span>
            <span className="text-[10px] text-gray-500 flex items-center gap-1">
              {cashierInfo.role === "Admin" ? (
                <><span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>Admin</>
              ) : (
                <><span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>Cashier</>
              )}
            </span>
          </div>
          <UserRoleIcon className={`text-xs ${cashierInfo.role === "Admin" ? "text-green-600" : "text-gray-500"}`} />
        </div>
      </div>

      {order.table?.tableNo && (
        <div className="flex items-center gap-2 mb-3 text-xs text-gray-600">
          <span>Table {order.table.tableNo}</span>
          <span>•</span>
          <span>Dine In</span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <FaCashRegister className="text-[10px]" />
            {paymentMethod}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 text-xs mb-3">
        <div className="space-y-1">
          <div className="text-gray-600">Date</div>
          <div className="font-medium text-gray-800">{formatDate(order.createdAt || order.orderDate)}</div>
        </div>
        <div className="space-y-1 text-right">
          <div className="text-gray-600">Amount</div>
          <div className="font-semibold text-gray-800">{formatCurrency(totalAmount)}</div>
        </div>
      </div>

      {(order.items && order.items.length > 0) || itemsCount > 0 ? (
        <div className="mt-2 pt-2 border-t border-gray-200 mb-3">
          <div className="text-xs text-gray-600 mb-1">Items {itemsCount > 0 && `(${itemsCount})`}</div>
          <div className="text-xs text-gray-800 line-clamp-2">{itemsPreview}</div>
        </div>
      ) : null}

      {isCancelled && (
        <div className="mt-1 pt-2 border-t border-gray-100 mb-3">
          <div className="text-xs text-red-600 mb-1 flex items-center gap-1">
            <FaTimesCircle className="text-[10px]" />
            Status: Cancelled
          </div>
        </div>
      )}

      {order.notes && (
        <div className="mt-1 pt-2 border-t border-gray-100 mb-3">
          <div className="text-xs text-gray-600 mb-1">Notes</div>
          <div className="text-xs text-gray-700 italic line-clamp-1">"{order.notes}"</div>
        </div>
      )}

      <div className="flex gap-2 pt-2 border-t border-gray-200 mt-auto">
        <button
          onClick={() => onViewReceipt(order)}
          disabled={deleting}
          className="flex-1 bg-[#025cca] text-white px-2 py-2 rounded text-xs font-medium flex items-center gap-2 justify-center hover:bg-[#014aa3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FaPrint className="text-[10px]" />
          View Receipt
        </button>
        
        <button
          onClick={handleDeleteOrder}
          disabled={deleting || isCancelled}
          className={`flex-1 px-2 py-2 rounded text-xs font-medium flex items-center gap-2 justify-center transition-colors ${
            deleting || isCancelled
              ? "bg-gray-400 text-white cursor-not-allowed"
              : "bg-red-600 text-white hover:bg-red-700"
          }`}
          title={isCancelled ? "Cancelled orders cannot be deleted" : "Delete this order"}
        >
          {deleting ? <FaSpinner className="animate-spin text-[10px]" /> : <FaTrash className="text-[10px]" />}
          {deleting ? "Deleting..." : "Delete"}
        </button>
      </div>
    </div>
  );
};

export default OrderCard;