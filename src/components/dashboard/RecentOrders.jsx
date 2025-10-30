import React from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { getOrders, updateOrderStatus, deleteOrder } from "../../https/index";
import { formatDateAndTime } from "../../utils";
import { useSelector } from "react-redux";

const RecentOrders = () => {
  const queryClient = useQueryClient();
  const authToken = useSelector((state) => state.user.token);

  const orderStatusUpdateMutation = useMutation({
    mutationFn: ({ orderId, orderStatus }) =>
      updateOrderStatus({ orderId, orderStatus }),
    onSuccess: () => {
      enqueueSnackbar("Order status updated successfully!", {
        variant: "success",
      });
      queryClient.invalidateQueries(["orders"]);
    },
    onError: () => {
      enqueueSnackbar("Failed to update order status!", { variant: "error" });
    },
  });

  const deleteOrderMutation = useMutation({
    mutationFn: ({ orderId }) => deleteOrder({ orderId, token: authToken }),
    onSuccess: () => {
      enqueueSnackbar("Order deleted successfully!", { variant: "success" });
      queryClient.invalidateQueries(["orders"]);
    },
    onError: () => {
      enqueueSnackbar("Failed to delete order!", { variant: "error" });
    },
  });

  const {
    data: resData,
    isError,
    isLoading,
  } = useQuery({
    queryKey: ["orders"],
    queryFn: getOrders,
    placeholderData: keepPreviousData,
  });

  if (isLoading) {
    return (
      <div className="text-center text-[#ababab] py-10">
        Loading recent orders...
      </div>
    );
  }

  if (isError || !resData?.data?.data) {
    enqueueSnackbar("Something went wrong!", { variant: "error" });
    return (
      <div className="text-center text-[#ababab] py-10">
        Unable to load orders.
      </div>
    );
  }

  const orders = resData.data.data;
  const totalOrders = orders.length;

  return (
    <div className="container mx-auto bg-[#262626] p-4 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-[#f5f5f5] text-xl font-semibold">Recent Orders</h2>
        <p className="text-sm text-[#ababab]">Total Orders: {totalOrders}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-[#f5f5f5]">
          <thead className="bg-[#333] text-[#ababab]">
            <tr>
              <th className="p-3">Order ID</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Status</th>
              <th className="p-3">Date & Time</th>
              <th className="p-3">Items</th>
              <th className="p-3">Table No</th>
              <th className="p-3">Total</th>
              <th className="p-3 text-center">Payment Method</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order, index) => {
              const statusColor =
                order.orderStatus === "Completed"
                  ? "text-blue-500"
                  : order.orderStatus === "Ready"
                  ? "text-green-500"
                  : "text-yellow-500";

              return (
                <tr
                  key={order._id || index}
                  className="border-b border-gray-600 hover:bg-[#333]"
                >
                  <td className="p-4">
                    #{Math.floor(new Date(order.orderDate).getTime())}
                  </td>
                  <td className="p-4">
                    {order.customerDetails?.name || "Unknown"}
                  </td>
                  <td className="p-4">
                    <select
                      className={`bg-[#1a1a1a] ${statusColor} border border-gray-500 p-2 rounded-lg focus:outline-none`}
                      value={order.orderStatus}
                      onChange={(e) =>
                        orderStatusUpdateMutation.mutate({
                          orderId: order._id,
                          orderStatus: e.target.value,
                        })
                      }
                    >
                      <option className="text-yellow-500" value="In Progress">
                        In Progress
                      </option>
                      <option className="text-green-500" value="Ready">
                        Ready
                      </option>
                      <option className="text-blue-500" value="Completed">
                        Completed
                      </option>
                    </select>
                  </td>
                  <td className="p-4">{formatDateAndTime(order.orderDate)}</td>
                  <td className="p-4">{order.items?.length || 0} Items</td>
                  <td className="p-4">
                    Table - {order.table?.tableNo || "N/A"}
                  </td>
                  <td className="p-4">
                    ₱{order.bills?.totalWithTax?.toFixed(2) || "0.00"}
                  </td>
                  <td className="p-4 text-center">
                    {order.paymentMethod || "N/A"}
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => {
                        const confirmed = window.confirm(
                          "Are you sure you want to delete this order?"
                        );
                        if (confirmed) {
                          deleteOrderMutation.mutate({ orderId: order._id });
                        }
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RecentOrders;
