import { useState, useEffect } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import {
  getOrders,
  updateOrderStatus,
  getAdminOrders,
} from "../../https/index";
import { formatDateAndTime } from "../../utils";
import { useSelector } from "react-redux";

const RecentOrders = () => {
  const queryClient = useQueryClient();
  const [timeFilter, setTimeFilter] = useState("all"); // all, today, week, month, year
  const user = useSelector((state) => state.user);

  // Determine which API to call based on user role
  const fetchOrders = async () => {
    if (user?.role?.toLowerCase() === "admin") {
      return await getAdminOrders(); // Admin sees all orders
    } else {
      return await getOrders(); // Cashiers see only their orders
    }
  };

  const orderStatusUpdateMutation = useMutation({
    mutationFn: ({ orderId, orderStatus }) =>
      updateOrderStatus({ orderId, orderStatus }),
    onSuccess: () => {
      enqueueSnackbar("Order status updated successfully!", {
        variant: "success",
      });
      queryClient.invalidateQueries(["orders", user?.role]);
    },
    onError: () => {
      enqueueSnackbar("Failed to update order status!", { variant: "error" });
    },
  });

  const {
    data: resData,
    isError,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["orders", user?.role],
    queryFn: fetchOrders,
    placeholderData: keepPreviousData,
    enabled: !!user, // Only fetch when user is available
  });

  // Helper function to get date ranges with UTC handling
  const getDateRange = (filter) => {
    const now = new Date();

    switch (filter) {
      case "today": {
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        const end = new Date(now);
        end.setHours(23, 59, 59, 999);
        return { start, end };
      }

      case "week": {
        const start = new Date(now);
        start.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(start.getDate() + 6); // End of week (Saturday)
        end.setHours(23, 59, 59, 999);
        return { start, end };
      }

      case "month": {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        start.setHours(0, 0, 0, 0);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
        return { start, end };
      }

      case "year": {
        const start = new Date(now.getFullYear(), 0, 1);
        start.setHours(0, 0, 0, 0);
        const end = new Date(now.getFullYear(), 11, 31);
        end.setHours(23, 59, 59, 999);
        return { start, end };
      }

      default:
        return null; // "all" - no date range
    }
  };

  // Filter orders based on time filter
  const filterOrdersByTime = (orders) => {
    if (!orders || !Array.isArray(orders)) return [];

    if (timeFilter === "all") {
      return orders;
    }

    const dateRange = getDateRange(timeFilter);
    if (!dateRange) return orders;

    return orders.filter((order) => {
      // Parse the order date
      const orderDate = new Date(order.orderDate || order.createdAt);

      // Make sure we're comparing dates correctly by checking if orderDate is valid
      if (isNaN(orderDate.getTime())) {
        return false; // Invalid date, exclude from results
      }

      // Compare dates (including time)
      return orderDate >= dateRange.start && orderDate <= dateRange.end;
    });
  };

  const getStatusStyles = (status) => {
    switch (status) {
      case "Completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "Ready":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "In Progress":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Helper to safely extract orders data based on API response structure
  const extractOrdersData = () => {
    if (!resData?.data) return [];

    // Handle different response structures
    if (resData.data.data && Array.isArray(resData.data.data)) {
      return resData.data.data; // From getOrders()
    } else if (Array.isArray(resData.data)) {
      return resData.data; // From getAdminOrders()
    }

    return [];
  };

  if (isLoading) {
    return (
      <div className="container mx-auto bg-gradient-to-br from-gray-100 to-gray-200 p-6 rounded-2xl shadow-2xl border border-gray-300">
        <div className="text-center text-gray-600 py-10">
          Loading recent orders...
        </div>
      </div>
    );
  }

  if (isError) {
    enqueueSnackbar(error?.message || "Something went wrong!", {
      variant: "error",
    });
    return (
      <div className="container mx-auto bg-gradient-to-br from-gray-100 to-gray-200 p-6 rounded-2xl shadow-2xl border border-gray-300">
        <div className="text-center text-gray-600 py-10">
          Unable to load orders. Please try again.
        </div>
      </div>
    );
  }

  const allOrders = extractOrdersData();
  const filteredOrders = filterOrdersByTime(allOrders);
  const totalOrders = filteredOrders.length;

  // Get status counts for better filtering visibility
  const statusCounts = filteredOrders.reduce(
    (acc, order) => {
      acc[order.orderStatus] = (acc[order.orderStatus] || 0) + 1;
      return acc;
    },
    { "In Progress": 0, Ready: 0, Completed: 0 }
  );

  // Display current filter info
  const getFilterDisplayText = () => {
    const dateRange = getDateRange(timeFilter);
    if (dateRange) {
      return `Showing orders from ${dateRange.start.toLocaleDateString()} to ${dateRange.end.toLocaleDateString()}`;
    }
    return "Showing all orders";
  };

  // Role-based display text
  const getRoleBasedText = () => {
    if (user?.role?.toLowerCase() === "admin") {
      return {
        title: "All Orders Dashboard",
        subtitle: "Complete overview of all restaurant orders",
      };
    } else {
      return {
        title: "Recent Orders",
        subtitle: "Your recent order history",
      };
    }
  };

  const roleText = getRoleBasedText();

  return (
    <div className="container mx-auto bg-gradient-to-br from-gray-100 to-gray-200 p-6 rounded-2xl shadow-2xl border border-gray-300">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{roleText.title}</h2>
          <p className="text-sm text-gray-600 mt-1">
            {getFilterDisplayText()} • {totalOrders} orders found
            {user?.role?.toLowerCase() === "admin"
              ? " • All Users"
              : " • Your Orders"}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-200">
            <p className="text-sm text-gray-600">Total Orders</p>
            <p className="text-lg font-bold text-gray-800">{totalOrders}</p>
          </div>

          {/* Time Filter */}
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            className="bg-white text-gray-800 border border-gray-300 px-4 py-2 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-400 transition-all"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
        </div>
      </div>

      {/* Status Summary */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-sm text-yellow-700">In Progress</span>
            <span className="font-bold text-yellow-800">
              {statusCounts["In Progress"] || 0}
            </span>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-sm text-blue-700">Ready</span>
            <span className="font-bold text-blue-800">
              {statusCounts["Ready"] || 0}
            </span>
          </div>
        </div>
        <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-sm text-green-700">Completed</span>
            <span className="font-bold text-green-800">
              {statusCounts["Completed"] || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="overflow-x-auto rounded-xl shadow-lg border border-gray-300">
        <table className="w-full text-left">
          <thead className="bg-gradient-to-r from-gray-200 to-gray-300">
            <tr>
              {user?.role?.toLowerCase() === "admin" && (
                <th className="p-4 font-semibold text-gray-700 text-sm uppercase tracking-wider">
                  Cashier
                </th>
              )}
              <th className="p-4 font-semibold text-gray-700 text-sm uppercase tracking-wider">
                Order ID
              </th>
              <th className="p-4 font-semibold text-gray-700 text-sm uppercase tracking-wider">
                Customer
              </th>
              <th className="p-4 font-semibold text-gray-700 text-sm uppercase tracking-wider">
                Status
              </th>
              <th className="p-4 font-semibold text-gray-700 text-sm uppercase tracking-wider">
                Date & Time
              </th>
              <th className="p-4 font-semibold text-gray-700 text-sm uppercase tracking-wider">
                Items
              </th>
              <th className="p-4 font-semibold text-gray-700 text-sm uppercase tracking-wider">
                Table
              </th>
              <th className="p-4 font-semibold text-gray-700 text-sm uppercase tracking-wider">
                Total
              </th>
              <th className="p-4 font-semibold text-gray-700 text-sm uppercase tracking-wider text-center">
                Payment
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredOrders.length === 0 ? (
              <tr>
                <td
                  colSpan={user?.role?.toLowerCase() === "admin" ? 9 : 8}
                  className="p-8 text-center text-gray-500"
                >
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                      <svg
                        className="w-8 h-8 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                        />
                      </svg>
                    </div>
                    <p className="text-lg font-medium text-gray-600">
                      No orders found
                    </p>
                    <p className="text-sm text-gray-500">
                      No orders match the selected time period: {timeFilter}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredOrders.map((order, index) => (
                <tr
                  key={order._id || index}
                  className="hover:bg-gray-50 transition-colors duration-200"
                >
                  {user?.role?.toLowerCase() === "admin" && (
                    <td className="p-4">
                      <div className="text-sm text-gray-700">
                        {order.user?.name || "System"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {order.user?.role || "Cashier"}
                      </div>
                    </td>
                  )}
                  <td className="p-4">
                    <div className="font-mono text-sm font-semibold text-gray-700">
                      #
                      {order.orderId?.slice(-6) ||
                        Math.floor(
                          new Date(order.orderDate || order.createdAt).getTime()
                        )
                          .toString()
                          .slice(-6)}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-gray-800">
                      {order.customerDetails?.name || "Guest"}
                    </div>
                  </td>
                  <td className="p-4">
                    <select
                      className={`w-full px-3 py-2 rounded-lg border-2 font-medium text-sm transition-all focus:outline-none focus:ring-2 focus:ring-opacity-50 ${getStatusStyles(
                        order.orderStatus
                      )}`}
                      value={order.orderStatus}
                      onChange={(e) =>
                        orderStatusUpdateMutation.mutate({
                          orderId: order._id,
                          orderStatus: e.target.value,
                        })
                      }
                      disabled={orderStatusUpdateMutation.isPending}
                    >
                      <option value="In Progress">In Progress</option>
                      <option value="Ready">Ready</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </td>
                  <td className="p-4">
                    <div className="text-sm text-gray-600">
                      {formatDateAndTime(order.orderDate || order.createdAt)}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs font-medium">
                        {order.items?.length || 0}
                      </span>
                      <span className="text-sm text-gray-600">Items</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div
                      className={`px-3 py-1 rounded-full text-sm font-medium inline-block ${
                        order.table?.tableNo
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {order.table?.tableNo || "Takeaway"}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="font-bold text-gray-800">
                      ₱{order.bills?.totalWithTax?.toFixed(2) || "0.00"}
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <div
                      className={`px-3 py-1 rounded-full text-sm font-medium inline-block ${
                        order.paymentMethod === "Cash"
                          ? "bg-green-100 text-green-700"
                          : "bg-purple-100 text-purple-700"
                      }`}
                    >
                      {order.paymentMethod || "Cash"}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Stats */}
      {filteredOrders.length > 0 && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="text-sm text-gray-600">Total Revenue</div>
            <div className="text-xl font-bold text-gray-800">
              ₱
              {filteredOrders
                .reduce(
                  (sum, order) => sum + (order.bills?.totalWithTax || 0),
                  0
                )
                .toFixed(2)}
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="text-sm text-gray-600">Average Order Value</div>
            <div className="text-xl font-bold text-gray-800">
              ₱
              {totalOrders > 0
                ? (
                    filteredOrders.reduce(
                      (sum, order) => sum + (order.bills?.totalWithTax || 0),
                      0
                    ) / totalOrders
                  ).toFixed(2)
                : "0.00"}
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="text-sm text-gray-600">Completion Rate</div>
            <div className="text-xl font-bold text-gray-800">
              {totalOrders > 0
                ? Math.round(
                    (filteredOrders.filter(
                      (order) => order.orderStatus === "Completed"
                    ).length /
                      totalOrders) *
                      100
                  )
                : 0}
              %
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecentOrders;
