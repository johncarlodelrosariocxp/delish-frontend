import React, { useState } from "react";
import {
  FaPrint,
  FaTrashAlt,
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

const OrderCard = ({
  order,
  onViewReceipt,
  onDelete,
  onStatusChange,
  isDeleting = false,
  isUpdating = false,
}) => {
  const [localDeleting, setLocalDeleting] = useState(false);

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

  // Calculate total amount
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

  // Format date with time
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

  // Format time only
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

  // FIXED: Get cashier/admin name with proper detection and display real names
  const getCashierInfo = (order) => {
    let userName = "Staff";
    let userRole = "Cashier";
    let found = false;
    let originalUserData = null;

    // Debug: Log the entire order object to see what fields are available
    console.log("Order cashier fields:", {
      createdBy: order.createdBy,
      user: order.user,
      cashierName: order.cashierName,
      cashier: order.cashier,
      adminName: order.adminName,
      admin: order.admin,
      processedBy: order.processedBy,
      staffName: order.staffName,
      employeeName: order.employeeName,
      customerDetails: order.customerDetails
    });

    // Helper function to extract name from user object
    const extractUserName = (userObj) => {
      if (!userObj) return null;
      
      // If it's a string, return it directly
      if (typeof userObj === 'string') return userObj;
      
      // If it's an object, try to find the name
      if (typeof userObj === 'object') {
        // Store original data for debugging
        originalUserData = userObj;
        
        // Check for direct name properties
        if (userObj.name) return userObj.name;
        if (userObj.fullName) return userObj.fullName;
        if (userObj.username) return userObj.username;
        if (userObj.firstName) {
          if (userObj.lastName) return `${userObj.firstName} ${userObj.lastName}`;
          return userObj.firstName;
        }
        if (userObj.lastName) {
          if (userObj.firstName) return `${userObj.firstName} ${userObj.lastName}`;
          return userObj.lastName;
        }
        if (userObj.displayName) return userObj.displayName;
        if (userObj.email) return userObj.email.split('@')[0];
      }
      
      return null;
    };

    // Helper function to extract role from user object
    const extractUserRole = (userObj) => {
      if (!userObj) return null;
      
      if (typeof userObj === 'object') {
        if (userObj.role) return userObj.role;
        if (userObj.userRole) return userObj.userRole;
        if (userObj.isAdmin) return "Admin";
      }
      
      return null;
    };

    // 1. Check createdBy (most common - this should have the real user data)
    if (order.createdBy && !found) {
      const extractedName = extractUserName(order.createdBy);
      if (extractedName) {
        userName = extractedName;
        found = true;
        const extractedRole = extractUserRole(order.createdBy);
        if (extractedRole) userRole = extractedRole;
      }
    }

    // 2. Check user object
    if (order.user && !found) {
      const extractedName = extractUserName(order.user);
      if (extractedName) {
        userName = extractedName;
        found = true;
        const extractedRole = extractUserRole(order.user);
        if (extractedRole) userRole = extractedRole;
      }
    }

    // 3. Check cashierName field
    if (order.cashierName && !found) {
      userName = order.cashierName;
      found = true;
    }

    // 4. Check cashier object
    if (order.cashier && !found) {
      const extractedName = extractUserName(order.cashier);
      if (extractedName) {
        userName = extractedName;
        found = true;
        const extractedRole = extractUserRole(order.cashier);
        if (extractedRole) userRole = extractedRole;
      }
    }

    // 5. Check adminName field
    if (order.adminName && !found) {
      userName = order.adminName;
      userRole = "Admin";
      found = true;
    }

    // 6. Check admin object
    if (order.admin && !found) {
      const extractedName = extractUserName(order.admin);
      if (extractedName) {
        userName = extractedName;
        userRole = "Admin";
        found = true;
      }
    }

    // 7. Check processedBy
    if (order.processedBy && !found) {
      const extractedName = extractUserName(order.processedBy);
      if (extractedName) {
        userName = extractedName;
        found = true;
        const extractedRole = extractUserRole(order.processedBy);
        if (extractedRole) userRole = extractedRole;
      }
    }

    // 8. Check staffName
    if (order.staffName && !found) {
      userName = order.staffName;
      found = true;
    }

    // 9. Check employeeName
    if (order.employeeName && !found) {
      userName = order.employeeName;
      found = true;
    }

    // 10. Check if there's a name in customerDetails?.processedBy
    if (order.customerDetails?.processedBy && !found) {
      userName = order.customerDetails.processedBy;
      found = true;
    }

    // 11. Check if createdBy has nested user object
    if (order.createdBy?.user && !found) {
      const extractedName = extractUserName(order.createdBy.user);
      if (extractedName) {
        userName = extractedName;
        found = true;
      }
    }

    // Override role if admin flags are present
    if (order.isAdminOrder || order.processedByAdmin) {
      userRole = "Admin";
    }

    // If we still have the default values but found is true, check originalUserData
    if (userName === "Staff" && found && originalUserData) {
      // Try to extract from _doc if it's a Mongoose document
      if (originalUserData._doc) {
        if (originalUserData._doc.name) userName = originalUserData._doc.name;
        else if (originalUserData._doc.username) userName = originalUserData._doc.username;
        else if (originalUserData._doc.email) userName = originalUserData._doc.email.split('@')[0];
      }
      
      // If still Staff, try to stringify and extract
      if (userName === "Staff") {
        try {
          const str = JSON.stringify(originalUserData);
          // Look for name patterns
          const nameMatch = str.match(/"name":"([^"]+)"/) || 
                           str.match(/"fullName":"([^"]+)"/) ||
                           str.match(/"username":"([^"]+)"/) ||
                           str.match(/"firstName":"([^"]+)"/);
          if (nameMatch) {
            userName = nameMatch[1];
          }
        } catch (e) {
          console.log("Error parsing user data:", e);
        }
      }
    }

    // Clean up the username - remove any quotes or extra spaces
    if (userName) {
      userName = userName.toString().trim();
      // Remove quotes if present
      userName = userName.replace(/^["']|["']$/g, '');
      
      // If it's an email, show the name part
      if (userName.includes('@')) {
        userName = userName.split('@')[0];
      }
      
      // If it's an object string, try to extract meaningful data
      if (userName.startsWith('{') || userName.startsWith('[')) {
        try {
          const parsed = JSON.parse(userName);
          if (parsed.name) userName = parsed.name;
          else if (parsed.username) userName = parsed.username;
          else if (parsed.email) userName = parsed.email.split('@')[0];
        } catch (e) {
          // Keep as is
        }
      }
    }

    // Capitalize first letter of each word
    if (userName && userName !== "Staff" && userName !== "Staff Member") {
      userName = userName
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    }

    // Capitalize role
    userRole = userRole.charAt(0).toUpperCase() + userRole.slice(1).toLowerCase();

    console.log("Detected cashier:", { 
      userName, 
      userRole, 
      found,
      originalData: originalUserData 
    });
    
    return { name: userName, role: userRole, found };
  };

  // Get payment method
  const getPaymentMethod = (order) => {
    if (order.paymentMethod) {
      return order.paymentMethod.charAt(0).toUpperCase() + 
             order.paymentMethod.slice(1).toLowerCase();
    }
    
    if (order.bills?.paymentMethod) {
      const method = order.bills.paymentMethod;
      return method.charAt(0).toUpperCase() + method.slice(1).toLowerCase();
    }
    
    return "Cash";
  };

  // REAL DELETE - Permanently removes from database
  const handleDelete = async () => {
    // Show confirmation dialog with clear warning
    const confirmDelete = window.confirm(
      "⚠️ PERMANENT DELETION WARNING ⚠️\n\n" +
      "Are you sure you want to permanently delete this order?\n" +
      "Order ID: " + (order._id?.slice(-8) || "N/A") + "\n" +
      "Customer: " + (order.customerDetails?.name || order.customerName || "Walk-in Customer") + "\n" +
      "Amount: " + formatCurrency(calculateTotalAmount(order)) + "\n\n" +
      "THIS ACTION CANNOT BE UNDONE AND WILL DELETE THE ORDER FROM THE DATABASE!"
    );
    
    if (!confirmDelete) {
      return; // User cancelled
    }
    
    setLocalDeleting(true);
    
    try {
      // Make sure we have an ID to delete
      if (!order._id) {
        throw new Error("Order ID is missing - cannot delete");
      }
      
      console.log(`🗑️ Attempting to permanently delete order ${order._id} from database...`);
      
      // Call the parent onDelete function which should make the API call
      // This MUST call your backend API to delete from MongoDB
      await onDelete(order._id);
      
      console.log(`✅ Order ${order._id} successfully deleted from database`);
      
      // Show success message
      alert(`Order #${order._id?.slice(-8)} has been permanently deleted from the database.`);
      
    } catch (error) {
      console.error("❌ Database deletion error:", error);
      
      // Show detailed error message
      alert(
        `❌ FAILED TO DELETE ORDER FROM DATABASE\n\n` +
        `Error: ${error.message || "Unknown error"}\n\n` +
        `Please check your network connection and try again.\n` +
        `If the problem persists, contact system administrator.`
      );
    } finally {
      setLocalDeleting(false);
    }
  };

  const statusConfig = getStatusConfig(order.orderStatus);
  const StatusIcon = statusConfig.icon;
  const totalAmount = calculateTotalAmount(order);
  const itemsCount = getItemsCount(order);
  const itemsPreview = getItemsPreview(order);
  const cashierInfo = getCashierInfo(order);
  const paymentMethod = getPaymentMethod(order);
  const deleting = isDeleting || localDeleting;
  
  const UserRoleIcon = cashierInfo.role === "Admin" ? FaUserCog : FaUserTie;

  // Get customer name
  const getCustomerName = (order) => {
    if (order.customerDetails?.name) {
      return order.customerDetails.name;
    }
    if (order.customerName) {
      return order.customerName;
    }
    if (order.customer?.name) {
      return order.customer.name;
    }
    return "Walk-in Customer";
  };

  const customerName = getCustomerName(order);

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-all duration-200 w-full h-full flex flex-col">
      {/* Order Header */}
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
            {isUpdating
              ? "Updating..."
              : deleting
              ? "Deleting..."
              : statusConfig.text}
          </span>
        </div>
      </div>

      {/* Customer and Cashier/Admin Info */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {/* Customer Info */}
        <div className="flex items-center gap-2">
          <FaUser className="text-gray-500 text-xs" />
          <div className="flex flex-col">
            <span className="text-xs font-medium text-gray-800">
              {customerName}
            </span>
            <span className="text-[10px] text-gray-500">Customer</span>
          </div>
        </div>

        {/* Cashier/Admin Info */}
        <div className="flex items-center gap-2 justify-end">
          <div className="flex flex-col items-end">
            <span className="text-xs font-medium text-gray-800">
              {cashierInfo.name}
            </span>
            <span className="text-[10px] text-gray-500 flex items-center gap-1">
              {cashierInfo.role === "Admin" ? (
                <>
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                  Admin
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                  Cashier
                </>
              )}
            </span>
          </div>
          <UserRoleIcon 
            className={`text-xs ${
              cashierInfo.role === "Admin" ? "text-green-600" : "text-gray-500"
            }`} 
          />
        </div>
      </div>

      {/* Table Info */}
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

      {/* Notes (if any) */}
      {order.notes && (
        <div className="mt-1 pt-2 border-t border-gray-100 mb-3">
          <div className="text-xs text-gray-600 mb-1">Notes</div>
          <div className="text-xs text-gray-700 italic line-clamp-1">
            "{order.notes}"
          </div>
        </div>
      )}

      {/* Receipt and Delete Buttons */}
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
          onClick={handleDelete}
          disabled={deleting}
          className="flex-1 bg-red-500 text-white px-2 py-2 rounded text-xs font-medium flex items-center gap-2 justify-center hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {deleting ? (
            <FaSpinner className="animate-spin text-[10px]" />
          ) : (
            <FaTrashAlt className="text-[10px] text-white" />
          )}
          {deleting ? "Deleting..." : "Delete"}
        </button>
      </div>
    </div>
  );
};

export default OrderCard;