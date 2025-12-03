import React, { useState, useEffect } from "react";
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
  FaList,
  FaRedo,
  FaBug,
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

  // DEBUG: Log initial props
  useEffect(() => {
    console.log("📊 RecentOrders Component Mounted");
    console.log("📥 Orders prop received:", {
      hasOrders: !!orders,
      isArray: Array.isArray(orders),
      length: Array.isArray(orders) ? orders.length : "N/A",
    });
  }, []);

  // Use provided orders prop or fetch if not provided
  const {
    data: resData,
    isError,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      try {
        console.log("🔄 Fetching orders from API...");
        const response = await getOrders();

        // DEBUG: Log full API response
        console.log("📦 Full API Response:", {
          status: response?.status,
          statusText: response?.statusText,
          dataStructure: Object.keys(response || {}),
          responseData: response?.data ? Object.keys(response.data) : "No data",
        });

        // Log the actual data structure
        if (response?.data) {
          console.log("🔍 Response.data structure:", response.data);

          // Check if it's an array
          if (Array.isArray(response.data)) {
            console.log(
              "✅ response.data is an array, length:",
              response.data.length
            );
          } else if (response.data && typeof response.data === "object") {
            console.log(
              "📋 response.data is an object, keys:",
              Object.keys(response.data)
            );

            // Check nested arrays
            if (Array.isArray(response.data.data)) {
              console.log(
                "✅ response.data.data is an array, length:",
                response.data.data.length
              );
            }
            if (Array.isArray(response.data.orders)) {
              console.log(
                "✅ response.data.orders is an array, length:",
                response.data.orders.length
              );
            }
            if (Array.isArray(response.data.results)) {
              console.log(
                "✅ response.data.results is an array, length:",
                response.data.results.length
              );
            }
            if (Array.isArray(response.data.items)) {
              console.log(
                "✅ response.data.items is an array, length:",
                response.data.items.length
              );
            }
          }
        }

        return response;
      } catch (error) {
        console.error("❌ Error fetching orders:", error);
        throw error;
      }
    },
    placeholderData: keepPreviousData,
    enabled: !orders || orders.length === 0,
  });

  // DEBUG: Log when data changes
  useEffect(() => {
    if (resData) {
      console.log("🔄 Query data updated:", {
        hasData: !!resData,
        hasResponseData: !!resData?.data,
        fullResponse: resData,
      });
    }
  }, [resData]);

  if (isError) {
    enqueueSnackbar("Failed to load orders", { variant: "error" });
  }

  // Get all orders - use prop if provided, otherwise use fetched data
  const allOrders = React.useMemo(() => {
    console.log("🧮 Calculating allOrders...");

    // If orders prop is provided and it's an array, use it
    if (orders && Array.isArray(orders) && orders.length > 0) {
      console.log("📤 Using orders prop, count:", orders.length);
      return orders;
    }

    // Handle the API response structure
    if (resData) {
      console.log("📥 Processing API response data...");

      // First check if data exists
      const responseData = resData.data;

      // DEBUG: Log what we're working with
      console.log("📊 Response data type:", typeof responseData);
      console.log("📊 Is array?", Array.isArray(responseData));

      if (Array.isArray(responseData)) {
        // If response.data is directly an array
        console.log(
          "✅ response.data is directly an array, length:",
          responseData.length
        );
        return responseData;
      } else if (responseData && typeof responseData === "object") {
        console.log("📋 response.data is an object, examining structure...");

        // Check for common nested structures
        if (Array.isArray(responseData.data)) {
          console.log(
            "✅ Found response.data.data array, length:",
            responseData.data.length
          );
          return responseData.data;
        } else if (Array.isArray(responseData.orders)) {
          console.log(
            "✅ Found response.data.orders array, length:",
            responseData.orders.length
          );
          return responseData.orders;
        } else if (Array.isArray(responseData.items)) {
          console.log(
            "✅ Found response.data.items array, length:",
            responseData.items.length
          );
          return responseData.items;
        } else if (Array.isArray(responseData.results)) {
          console.log(
            "✅ Found response.data.results array, length:",
            responseData.results.length
          );
          return responseData.results;
        } else {
          console.log(
            "⚠️ No array found in response.data, keys:",
            Object.keys(responseData)
          );

          // Try to extract any array from the object
          for (const key in responseData) {
            if (Array.isArray(responseData[key])) {
              console.log(
                `✅ Found array in response.data.${key}, length:`,
                responseData[key].length
              );
              return responseData[key];
            }
          }

          // If no array found, try to see if it's a single order object
          if (responseData._id) {
            console.log("⚠️ Single order object found, wrapping in array");
            return [responseData];
          }
        }
      }
    }

    console.log("⚠️ No orders found, returning empty array");
    return [];
  }, [orders, resData]);

  // DEBUG: Log when allOrders changes
  useEffect(() => {
    console.log("📈 allOrders updated:", {
      count: allOrders.length,
      firstFew: allOrders.slice(0, 3).map((o) => ({
        id: o._id,
        name: o.customerDetails?.name,
        status: o.orderStatus,
      })),
      lastFew: allOrders.slice(-3).map((o) => ({
        id: o._id,
        name: o.customerDetails?.name,
        status: o.orderStatus,
      })),
    });
  }, [allOrders]);

  // Filter orders based on search query
  const filteredOrders = React.useMemo(() => {
    if (!Array.isArray(allOrders)) {
      console.log("❌ allOrders is not an array");
      return [];
    }

    console.log("🔍 Filtering orders...");
    const result = allOrders.filter((order) => {
      if (!order) return false;

      const searchLower = searchQuery.toLowerCase();

      // Check customer name
      const customerName =
        order.customerDetails?.name || order.customerName || "";
      if (customerName.toLowerCase().includes(searchLower)) return true;

      // Check order ID
      const orderId = order._id || order.id || "";
      if (orderId.toLowerCase().includes(searchLower)) return true;

      // Check order status
      const orderStatus = order.orderStatus || order.status || "";
      if (orderStatus.toLowerCase().includes(searchLower)) return true;

      return false;
    });

    console.log(`✅ Filtered ${result.length} of ${allOrders.length} orders`);
    return result;
  }, [allOrders, searchQuery]);

  // Show only recent orders (last 5) when not in "show all" mode, otherwise show filtered results
  const displayOrders = React.useMemo(() => {
    if (!Array.isArray(filteredOrders)) {
      console.log("❌ filteredOrders is not an array");
      return [];
    }

    const result = showAllOrders ? filteredOrders : filteredOrders.slice(0, 5);
    console.log(
      `📋 Displaying ${result.length} orders (showAllOrders: ${showAllOrders})`
    );
    return result;
  }, [filteredOrders, showAllOrders]);

  // Status configuration - Matching the Home component style
  const getStatusConfig = (status) => {
    if (!status) {
      return {
        icon: FaExclamationCircle,
        color: "text-gray-600",
        bgColor: "bg-gray-50",
        borderColor: "border-gray-200",
        text: "Unknown",
      };
    }

    const statusLower = status.toLowerCase();
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
          text: status,
        };
    }
  };

  // Handle status update
  const handleStatusUpdate = async (orderId, currentStatus, newStatus) => {
    if (!orderId) return;

    setUpdatingOrders((prev) => new Set(prev).add(orderId));

    try {
      // If onStatusChange prop is provided, use it
      if (onStatusChange) {
        const order = allOrders.find((o) => o._id === orderId);
        await onStatusChange(order, newStatus);
      } else {
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

  // Calculate and format total amount
  const calculateTotalAmount = (order) => {
    if (!order) return 0;

    // If totalAmount is directly provided, use it
    if (order.totalAmount !== undefined && order.totalAmount !== null) {
      return parseFloat(order.totalAmount) || 0;
    }

    // If items array exists, calculate from items
    if (order.items && Array.isArray(order.items)) {
      return order.items.reduce((total, item) => {
        const price = parseFloat(item.price || item.unitPrice || 0);
        const quantity = parseInt(item.quantity || 1);
        return total + price * quantity;
      }, 0);
    }

    // If subtotal and other amounts are provided
    if (order.subtotal !== undefined) {
      const subtotal = parseFloat(order.subtotal || 0);
      const tax = parseFloat(order.tax || order.taxAmount || 0);
      const shipping = parseFloat(
        order.shipping || order.shippingFee || order.deliveryFee || 0
      );
      const discount = parseFloat(order.discount || order.discountAmount || 0);

      return subtotal + tax + shipping - discount;
    }

    return 0;
  };

  // Format currency - CHANGED TO PESO
  const formatCurrency = (amount) => {
    const numericAmount = parseFloat(amount) || 0;
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericAmount);
  };

  // Get items count
  const getItemsCount = (order) => {
    if (!order) return 0;

    if (order.items && Array.isArray(order.items)) {
      return order.items.reduce(
        (total, item) => total + (parseInt(item.quantity) || 1),
        0
      );
    }
    return parseInt(order.itemsCount || order.quantity || 0);
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
        const quantity = parseInt(item.quantity) || 1;
        return quantity > 1 ? `${name} (${quantity})` : name;
      })
      .join(", ");

    const totalItems = getItemsCount(order);
    const shownItems = order.items
      .slice(0, 3)
      .reduce((total, item) => total + (parseInt(item.quantity) || 1), 0);

    if (totalItems > shownItems) {
      return `${itemsText} +${totalItems - shownItems} more`;
    }

    return itemsText;
  };

  // Check if action buttons should be shown for an order
  const shouldShowActions = (order) => {
    if (!order || !order.orderStatus) return false;

    const status = order.orderStatus.toLowerCase();
    return (
      status === "pending" ||
      status === "in progress" ||
      status === "processing"
    );
  };

  // Get available actions for an order
  const getAvailableActions = (order) => {
    if (!order || !order.orderStatus) return [];

    const status = order.orderStatus.toLowerCase();
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

  // Manual fetch function to debug
  const manualFetchOrders = async () => {
    try {
      enqueueSnackbar("Manually fetching orders...", { variant: "info" });
      console.log("🔍 Manual fetch started...");

      // Try direct fetch to see raw response
      const response = await fetch("http://localhost:8000/api/orders");
      const data = await response.json();

      console.log("📊 Manual fetch result:", {
        status: response.status,
        data: data,
        dataLength: Array.isArray(data) ? data.length : "Not an array",
        dataKeys: data && typeof data === "object" ? Object.keys(data) : "N/A",
      });

      if (Array.isArray(data)) {
        console.log(`✅ Manual fetch got ${data.length} orders`);
        enqueueSnackbar(`Manual fetch got ${data.length} orders`, {
          variant: "success",
        });
      } else if (data && typeof data === "object") {
        console.log("📋 Manual fetch got object, checking for arrays...");
        for (const key in data) {
          if (Array.isArray(data[key])) {
            console.log(
              `✅ Found array in data.${key}, length: ${data[key].length}`
            );
            enqueueSnackbar(`Found ${data[key].length} orders in ${key}`, {
              variant: "success",
            });
          }
        }
      }

      // Trigger a refetch of the query
      await refetch();
    } catch (error) {
      console.error("❌ Manual fetch error:", error);
      enqueueSnackbar(`Manual fetch failed: ${error.message}`, {
        variant: "error",
      });
    }
  };

  // Debug function
  const showDebugInfo = () => {
    console.log("=== DEBUG INFO ===");
    console.log("allOrders length:", allOrders.length);
    console.log("filteredOrders length:", filteredOrders.length);
    console.log("displayOrders length:", displayOrders.length);
    console.log("showAllOrders:", showAllOrders);
    console.log("searchQuery:", searchQuery);
    console.log(
      "API response structure:",
      resData ? Object.keys(resData) : "No response"
    );

    if (resData?.data) {
      console.log("response.data type:", typeof resData.data);
      console.log("response.data keys:", Object.keys(resData.data));
    }

    // Show sample orders
    if (allOrders.length > 0) {
      console.log("First 3 orders:", allOrders.slice(0, 3));
      console.log("Last 3 orders:", allOrders.slice(-3));
    }

    console.log("==================");

    enqueueSnackbar(`Debug: ${allOrders.length} orders loaded`, {
      variant: "info",
    });
  };

  // Show loading state
  if (isLoading && (!orders || orders.length === 0)) {
    return (
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200 p-8 shadow-lg">
        <div className="flex justify-center items-center">
          <FaSpinner className="animate-spin text-2xl text-blue-600 mr-3" />
          <span className="text-gray-700">Loading orders...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200 p-4 shadow-lg hover:shadow-xl transition-all duration-300">
      {/* Header with Debug Button */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-lg font-semibold text-gray-900">
          {showAllOrders ? "All Orders" : "Recent Orders"}
        </h1>
        <div className="flex items-center gap-2">
          {/* Debug Button */}
          <button
            onClick={showDebugInfo}
            className="text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded flex items-center gap-1"
            title="Show Debug Info"
          >
            <FaBug className="text-xs" />
            Debug
          </button>

          {/* Refresh Button */}
          <button
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["orders"] });
              enqueueSnackbar("Refreshing orders...", { variant: "info" });
            }}
            className="text-xs text-green-600 bg-green-100 hover:bg-green-200 px-2 py-1 rounded flex items-center gap-1"
            title="Refresh Orders"
          >
            <FaRedo className="text-xs" />
            Refresh
          </button>

          {/* Manual Fetch Button */}
          <button
            onClick={manualFetchOrders}
            className="text-xs text-blue-600 bg-blue-100 hover:bg-blue-200 px-2 py-1 rounded flex items-center gap-1"
            title="Manual Fetch"
          >
            🔍 Fetch
          </button>

          {showAllOrders && (
            <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              <FaList className="text-xs" />
              <span>All Records</span>
            </span>
          )}
          <button
            onClick={toggleViewAll}
            className="text-blue-600 text-sm font-medium hover:underline flex items-center gap-1 px-3 py-1 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors"
          >
            {showAllOrders ? (
              <>
                <FaEyeSlash className="text-xs" />
                Show Recent
              </>
            ) : (
              <>
                <FaEye className="text-xs" />
                View All Orders
              </>
            )}
          </button>
        </div>
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
      <div className="mb-4 flex justify-between items-center">
        <div>
          <p className="text-xs text-gray-600">
            Showing {displayOrders.length} of {filteredOrders.length} orders
            {!showAllOrders && filteredOrders.length > 5 && " (most recent 5)"}
          </p>
          <p className="text-xs text-gray-400">
            Total in database: {allOrders.length}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">
            Filtered: {filteredOrders.length}
          </p>
          <p className="text-xs text-gray-400">Raw count: {allOrders.length}</p>
        </div>
      </div>

      {/* Orders List */}
      <div
        className={`overflow-y-auto space-y-3 ${
          showAllOrders ? "max-h-[600px]" : "max-h-[400px]"
        }`}
      >
        {displayOrders.length > 0 ? (
          displayOrders.map((order, index) => {
            if (!order) return null;

            const statusConfig = getStatusConfig(order.orderStatus);
            const StatusIcon = statusConfig.icon;
            const totalAmount = calculateTotalAmount(order);
            const itemsCount = getItemsCount(order);
            const itemsPreview = getItemsPreview(order);
            const isUpdating = updatingOrders.has(order._id || order.id);
            const showActions = shouldShowActions(order);
            const availableActions = getAvailableActions(order);

            return (
              <div
                key={order._id || order.id || index}
                className={`border rounded-xl p-4 ${statusConfig.bgColor} ${statusConfig.borderColor} hover:shadow-md transition-all duration-200`}
              >
                {/* Order Header */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <FaReceipt className="text-gray-600 text-sm" />
                    <span className="font-mono text-xs text-gray-700">
                      #{order._id ? order._id.slice(-8) : "N/A"}
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
                    {order.customerDetails?.name ||
                      order.customerName ||
                      "Unknown Customer"}
                  </span>
                </div>

                {/* Order Details */}
                <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                  <div className="space-y-1">
                    <div className="text-gray-600">Date</div>
                    <div className="font-medium text-gray-800">
                      {formatDate(
                        order.createdAt || order.orderDate || order.date
                      )}
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
                              order._id || order.id,
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

      {/* View Mode Info Footer */}
      {showAllOrders && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
            <FaList className="text-xs" />
            <span>Showing all {displayOrders.length} order records</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecentOrders;
