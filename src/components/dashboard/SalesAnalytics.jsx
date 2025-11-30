import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getOrders, getOrderStats, getSalesStats } from "../../https";

const SalesAnalytics = () => {
  const [timeRange, setTimeRange] = useState("today");

  // Fetch all orders - using existing endpoint
  const {
    data: ordersData,
    isLoading: ordersLoading,
    error: ordersError,
    refetch: refetchOrders,
  } = useQuery({
    queryKey: ["orders"],
    queryFn: getOrders,
    refetchInterval: 30000,
  });

  // Fetch order statistics - using existing endpoint
  const {
    data: orderStatsData,
    isLoading: statsLoading,
    error: statsError,
  } = useQuery({
    queryKey: ["orderStats"],
    queryFn: getOrderStats,
    refetchInterval: 30000,
  });

  // Fetch sales statistics - using existing endpoint
  const {
    data: salesStatsData,
    isLoading: salesLoading,
    error: salesError,
  } = useQuery({
    queryKey: ["salesStats"],
    queryFn: getSalesStats,
    refetchInterval: 30000,
  });

  console.log("Raw Orders Data:", ordersData);
  console.log("Raw Order Stats:", orderStatsData);
  console.log("Raw Sales Stats:", salesStatsData);

  // SAFE data extraction - handle the nested structure: data.data.data
  const ordersArray = React.useMemo(() => {
    if (!ordersData) return [];

    // Try different possible response structures
    if (Array.isArray(ordersData)) return ordersData;
    if (Array.isArray(ordersData.data)) return ordersData.data;
    if (Array.isArray(ordersData.data?.data)) return ordersData.data.data; // This is your structure!
    if (Array.isArray(ordersData.data?.orders)) return ordersData.data.orders;
    if (Array.isArray(ordersData.orders)) return ordersData.orders;

    console.warn("Unexpected orders data structure:", ordersData);
    return [];
  }, [ordersData]);

  // Extract stats safely - handle nested structure
  const orderStats =
    orderStatsData?.data?.data || orderStatsData?.data || orderStatsData || {};
  const salesStats =
    salesStatsData?.data?.data || salesStatsData?.data || salesStatsData || {};

  console.log("Processed Orders Array:", ordersArray);
  console.log("Processed Order Stats:", orderStats);
  console.log("Processed Sales Stats:", salesStats);

  // SAFE calculations
  const totalOrders = orderStats.totalOrders || ordersArray.length;

  const totalRevenue = React.useMemo(() => {
    // Try to get from stats first
    if (orderStats.totalRevenue) return orderStats.totalRevenue;
    if (salesStats.totalRevenue) return salesStats.totalRevenue;

    // Only calculate if ordersArray is a valid array
    if (!Array.isArray(ordersArray)) return 0;

    return ordersArray.reduce((total, order) => {
      try {
        // Try to get from bills first
        if (order?.bills?.total) {
          return total + Number(order.bills.total);
        }
        if (order?.bills?.totalWithTax) {
          return total + Number(order.bills.totalWithTax);
        }
        // Fallback to calculating from items
        if (order?.items && Array.isArray(order.items)) {
          const orderTotal = order.items.reduce((sum, item) => {
            const price =
              Number(item.price) || Number(item.pricePerQuantity) || 0;
            const quantity = Number(item.quantity) || 0;
            return sum + price * quantity;
          }, 0);
          return total + orderTotal;
        }
        return total;
      } catch (error) {
        console.error("Error calculating order revenue:", error, order);
        return total;
      }
    }, 0);
  }, [ordersArray, orderStats, salesStats]);

  const totalItemsSold = React.useMemo(() => {
    if (orderStats.totalItemsSold) return orderStats.totalItemsSold;

    if (!Array.isArray(ordersArray)) return 0;

    return ordersArray.reduce((total, order) => {
      try {
        if (order?.items && Array.isArray(order.items)) {
          return (
            total +
            order.items.reduce((sum, item) => {
              return sum + (Number(item.quantity) || 0);
            }, 0)
          );
        }
        return total;
      } catch (error) {
        console.error("Error calculating items sold:", error);
        return total;
      }
    }, 0);
  }, [ordersArray, orderStats]);

  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Today's sales calculation
  const todaySales = React.useMemo(() => {
    if (!Array.isArray(ordersArray)) return 0;

    const today = new Date().toDateString();
    return ordersArray.reduce((total, order) => {
      try {
        const orderDate = order.createdAt
          ? new Date(order.createdAt).toDateString()
          : today;
        if (orderDate === today) {
          if (order?.bills?.total) return total + Number(order.bills.total);
          if (order?.items && Array.isArray(order.items)) {
            return (
              total +
              order.items.reduce((sum, item) => {
                const price =
                  Number(item.price) || Number(item.pricePerQuantity) || 0;
                const quantity = Number(item.quantity) || 0;
                return sum + price * quantity;
              }, 0)
            );
          }
        }
        return total;
      } catch (error) {
        console.error("Error calculating today sales:", error);
        return total;
      }
    }, 0);
  }, [ordersArray]);

  // Top selling item calculation
  const topSellingItem = React.useMemo(() => {
    if (!Array.isArray(ordersArray) || ordersArray.length === 0) {
      return { name: "No items sold yet", quantity: 0 };
    }

    const popularItems = {};
    ordersArray.forEach((order) => {
      try {
        if (order?.items && Array.isArray(order.items)) {
          order.items.forEach((item) => {
            if (item?.name) {
              const itemName = item.name;
              const quantity = Number(item.quantity) || 0;
              popularItems[itemName] = (popularItems[itemName] || 0) + quantity;
            }
          });
        }
      } catch (error) {
        console.error("Error processing order for popular items:", error);
      }
    });

    // Check if we have any items
    if (Object.keys(popularItems).length === 0) {
      return { name: "No items sold yet", quantity: 0 };
    }

    const topItem = Object.entries(popularItems)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 1)
      .map(([name, quantity]) => ({ name, quantity }))[0];

    return topItem || { name: "No items sold yet", quantity: 0 };
  }, [ordersArray]);

  // Order status counts
  const orderStatusCounts = React.useMemo(() => {
    if (!Array.isArray(ordersArray)) {
      return { pending: 0, completed: 0, cancelled: 0, inProgress: 0 };
    }

    return {
      pending: ordersArray.filter(
        (order) =>
          order.orderStatus === "pending" ||
          order.status === "pending" ||
          !order.orderStatus
      ).length,
      completed: ordersArray.filter(
        (order) =>
          order.orderStatus === "completed" || order.status === "completed"
      ).length,
      cancelled: ordersArray.filter(
        (order) =>
          order.orderStatus === "cancelled" || order.status === "cancelled"
      ).length,
      inProgress: ordersArray.filter(
        (order) =>
          order.orderStatus === "in-progress" ||
          order.status === "preparing" ||
          order.status === "active"
      ).length,
    };
  }, [ordersArray]);

  const isLoading = ordersLoading || statsLoading || salesLoading;
  const hasError = ordersError || statsError || salesError;

  if (hasError) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-6">
          Sales Analytics
        </h2>
        <div className="text-center py-8">
          <div className="text-6xl mb-4">❌</div>
          <p className="text-gray-500 text-lg">Failed to load sales data</p>
          <p className="text-sm text-gray-400 mt-2">
            Error:{" "}
            {ordersError?.message || statsError?.message || salesError?.message}
          </p>
          <button
            onClick={() => {
              refetchOrders();
            }}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-6">
          Sales Analytics
        </h2>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 mt-4">Loading sales data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-xl font-bold text-gray-800">Sales Analytics</h2>

        {/* Simple refresh button */}
        <button
          onClick={() => refetchOrders()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          Refresh Data
        </button>
      </div>

      {ordersArray.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-6xl mb-4">📊</div>
          <p className="text-gray-500 text-lg">No orders found</p>
          <p className="text-sm text-gray-400 mt-2">
            Start taking orders to see analytics data
          </p>
          <div className="mt-4 p-4 bg-blue-50 rounded-lg text-left max-w-md mx-auto">
            <p className="text-sm text-blue-800">
              <strong>System Ready:</strong> Your analytics dashboard is working
              correctly. Once you start processing orders, you'll see real-time
              data here.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-blue-800">
                    Total Orders
                  </h3>
                  <p className="text-2xl font-bold text-blue-600 mt-1">
                    {totalOrders}
                  </p>
                </div>
                <div className="text-blue-500 text-2xl">📦</div>
              </div>
              <p className="text-xs text-blue-600 mt-2">All orders in system</p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-green-800">
                    Total Revenue
                  </h3>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    ₱{totalRevenue.toLocaleString()}
                  </p>
                </div>
                <div className="text-green-500 text-2xl">💰</div>
              </div>
              <p className="text-xs text-green-600 mt-2">
                Gross revenue earned
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-purple-800">
                    Items Sold
                  </h3>
                  <p className="text-2xl font-bold text-purple-600 mt-1">
                    {totalItemsSold.toLocaleString()}
                  </p>
                </div>
                <div className="text-purple-500 text-2xl">🛒</div>
              </div>
              <p className="text-xs text-purple-600 mt-2">Total units sold</p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-orange-800">
                    Avg Order Value
                  </h3>
                  <p className="text-2xl font-bold text-orange-600 mt-1">
                    ₱{averageOrderValue.toFixed(2)}
                  </p>
                </div>
                <div className="text-orange-500 text-2xl">📊</div>
              </div>
              <p className="text-xs text-orange-600 mt-2">Per order average</p>
            </div>
          </div>

          {/* Performance Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    Today's Revenue
                  </h3>
                  <p className="text-3xl font-bold">
                    ₱{todaySales.toLocaleString()}
                  </p>
                  <p className="text-blue-100 text-sm mt-2">
                    Revenue generated today
                  </p>
                </div>
                <div className="text-4xl opacity-80">📈</div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    Top Selling Item
                  </h3>
                  <p className="text-xl font-bold truncate">
                    {topSellingItem.name}
                  </p>
                  <p className="text-green-100 text-sm mt-1">
                    {topSellingItem.quantity.toLocaleString()} units sold
                  </p>
                </div>
                <div className="text-4xl opacity-80">🏆</div>
              </div>
            </div>
          </div>

          {/* Order Status Overview */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Order Status Overview
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                <p className="text-2xl font-bold text-blue-600">
                  {orderStatusCounts.pending}
                </p>
                <p className="text-sm text-blue-800 font-medium">Pending</p>
                <p className="text-xs text-blue-600 mt-1">
                  Awaiting confirmation
                </p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg border-2 border-yellow-200">
                <p className="text-2xl font-bold text-yellow-600">
                  {orderStatusCounts.inProgress}
                </p>
                <p className="text-sm text-yellow-800 font-medium">
                  In Progress
                </p>
                <p className="text-xs text-yellow-600 mt-1">Being prepared</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg border-2 border-green-200">
                <p className="text-2xl font-bold text-green-600">
                  {orderStatusCounts.completed}
                </p>
                <p className="text-sm text-green-800 font-medium">Completed</p>
                <p className="text-xs text-green-600 mt-1">
                  Successfully delivered
                </p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg border-2 border-red-200">
                <p className="text-2xl font-bold text-red-600">
                  {orderStatusCounts.cancelled}
                </p>
                <p className="text-sm text-red-800 font-medium">Cancelled</p>
                <p className="text-xs text-red-600 mt-1">Cancelled orders</p>
              </div>
            </div>
          </div>

          {/* Recent Orders */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Recent Orders ({ordersArray.length} total)
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {ordersArray.slice(0, 10).map((order, index) => (
                  <div
                    key={order._id || order.id || index}
                    className="flex justify-between items-center py-3 px-4 bg-white rounded-lg border border-gray-100 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 truncate">
                        Order #
                        {order.orderNumber ||
                          order._id?.slice(-6) ||
                          `ORD-${index + 1}`}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {order.customerDetails?.name || "Walk-in Customer"} •
                        {order.items?.length || 0} items • ₱
                        {order.bills?.total?.toFixed(2) ||
                          order.bills?.totalWithTax?.toFixed(2) ||
                          "0.00"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                          order.orderStatus === "completed"
                            ? "bg-green-100 text-green-800 border border-green-200"
                            : order.orderStatus === "cancelled"
                            ? "bg-red-100 text-red-800 border border-red-200"
                            : order.orderStatus === "in-progress"
                            ? "bg-yellow-100 text-yellow-800 border border-yellow-200"
                            : "bg-blue-100 text-blue-800 border border-blue-200"
                        }`}
                      >
                        {order.orderStatus || "pending"}
                      </span>
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {order.createdAt
                          ? new Date(order.createdAt).toLocaleDateString()
                          : "Recent"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SalesAnalytics;
