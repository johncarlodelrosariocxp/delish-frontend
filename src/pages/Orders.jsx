import React, { useState, useEffect, useRef } from "react";
import BottomNav from "../components/shared/BottomNav";
import OrderCard from "../components/orders/OrderCard";
import BackButton from "../components/shared/BackButton";
import Invoice from "../components/invoice/Invoice";
import {
  keepPreviousData,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { getOrders, deleteOrder, updateOrderStatus } from "../https/index";
import { enqueueSnackbar } from "notistack";
import { FaArrowUp } from "react-icons/fa";

const Orders = () => {
  const [status, setStatus] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [totalSales, setTotalSales] = useState(0);
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

  const { mutate: deleteOrderMutation } = useMutation({
    mutationFn: deleteOrder,
    onSuccess: () => {
      enqueueSnackbar("Order deleted successfully!", { variant: "success" });
      queryClient.invalidateQueries(["orders"]);
      queryClient.invalidateQueries(["tables"]);
    },
    onError: (error) => {
      console.error("❌ Delete Error:", error?.response?.data || error);
      enqueueSnackbar("Failed to delete order!", { variant: "error" });
    },
  });

  const { mutate: updateStatusMutation } = useMutation({
    mutationFn: updateOrderStatus,
    onSuccess: (_, variables) => {
      enqueueSnackbar("Order status updated!", { variant: "success" });

      if (variables.orderStatus === "Completed") {
        enqueueSnackbar(`Table ${variables.tableNo} is now available`, {
          variant: "info",
        });
      }

      queryClient.invalidateQueries(["orders"]);
      queryClient.invalidateQueries(["tables"]);
    },
    onError: (error) => {
      console.error("❌ Status Update Error:", error?.response?.data || error);
      enqueueSnackbar("Failed to update status!", { variant: "error" });
    },
  });

  useEffect(() => {
    if (isError) {
      enqueueSnackbar("Something went wrong while fetching orders!", {
        variant: "error",
      });
    }
  }, [isError]);

  const orders = resData?.data?.data || [];

  useEffect(() => {
    const completedOrders = orders.filter((o) => o.orderStatus === "Completed");
    const total = completedOrders.reduce(
      (sum, o) => sum + (o.bills?.totalWithTax || 0),
      0
    );
    setTotalSales(total);
  }, [orders]);

  const filteredOrders =
    status === "all"
      ? orders
      : orders.filter((order) => {
          if (status === "progress") return order.orderStatus === "In Progress";
          if (status === "ready") return order.orderStatus === "Ready";
          if (status === "completed") return order.orderStatus === "Completed";
          return true;
        });

  const handleViewReceipt = (order) => {
    setSelectedOrder(order);
    setShowInvoice(true);
  };

  const handleDeleteOrder = (orderId) => {
    if (window.confirm("Are you sure you want to delete this order?")) {
      deleteOrderMutation(orderId);
    }
  };

  const handleStatusChange = (order, newStatus) => {
    updateStatusMutation({
      orderId: order._id,
      orderStatus: newStatus,
      tableNo: order.table?.tableNo,
    });
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

  return (
    <section className="bg-[#f5f5f5] min-h-screen flex flex-col relative">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between px-6 md:px-10 py-4 gap-4">
          <div className="flex items-center gap-4">
            <BackButton />
            <h1 className="text-[#333333] text-2xl font-bold tracking-wider">
              Orders
            </h1>
          </div>
          <div className="flex flex-wrap gap-2 md:gap-4 items-center">
            {["all", "progress", "ready", "completed"].map((type) => (
              <button
                key={type}
                onClick={() => setStatus(type)}
                className={`text-[#555555] text-sm md:text-base ${
                  status === type ? "bg-[#eaeaea]" : "bg-transparent"
                } rounded-lg px-4 py-2 font-semibold transition`}
              >
                {type === "all"
                  ? "All"
                  : type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
            <span className="text-sm md:text-base font-semibold text-green-700 ml-4">
              Total Sales: ₱{totalSales.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Orders Grid */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 md:px-16 py-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 scrollbar-hide"
      >
        {isLoading ? (
          <p className="col-span-3 text-gray-500">Loading orders...</p>
        ) : filteredOrders.length > 0 ? (
          filteredOrders.map((order) => (
            <OrderCard
              key={order._id}
              order={order}
              onViewReceipt={handleViewReceipt}
              onDelete={handleDeleteOrder}
              onStatusChange={handleStatusChange}
            />
          ))
        ) : (
          <p className="col-span-3 text-gray-500">No orders available</p>
        )}
      </div>

      {/* Scroll to Top */}
      {showScrollButton && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-20 right-6 md:right-10 bg-[#025cca] text-white p-3 rounded-full shadow-lg hover:bg-[#014aa3] transition-all"
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
    </section>
  );
};

export default Orders;
