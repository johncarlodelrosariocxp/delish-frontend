import React, { useState } from "react";
import { FaSearch } from "react-icons/fa";
import OrderList from "./OrderList";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { getOrders } from "../../https/index";

const RecentOrders = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: resData, isError } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      return await getOrders();
    },
    placeholderData: keepPreviousData,
  });

  if (isError) {
    enqueueSnackbar("Something went wrong!", { variant: "error" });
  }

  // Filter orders based on search query
  const filteredOrders =
    resData?.data.data.filter(
      (order) =>
        order.customerDetails?.name
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        order._id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.orderStatus?.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

  return (
    <div className="px-1 sm:px-3 lg:px-6 mt-2 sm:mt-4">
      <div className="bg-white text-black w-full h-auto max-h-[350px] sm:max-h-[450px] rounded-lg shadow-[0_0_8px_rgba(0,0,0,0.15)] sm:shadow-[0_0_15px_rgba(0,0,0,0.3)]">
        {/* Header - Ultra compact for mobile */}
        <div className="flex justify-between items-center px-2 sm:px-4 py-1.5 sm:py-3 border-b border-gray-200">
          <h1 className="text-xs sm:text-base font-semibold tracking-wide">
            Recent Orders
          </h1>
          <a
            href=""
            className="text-[#025cca] text-[10px] sm:text-xs font-semibold"
          >
            View all
          </a>
        </div>

        {/* Search Bar - Ultra compact */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-md px-2 sm:px-4 py-1.5 mx-2 sm:mx-4 mt-1.5 sm:mt-3">
          <FaSearch className="text-gray-600 text-[10px] sm:text-sm" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-gray-100 outline-none text-black w-full text-[10px] sm:text-sm"
          />
        </div>

        {/* Order list - Ultra compact scrolling area */}
        <div className="mt-1.5 sm:mt-3 px-0 sm:px-4 overflow-y-auto max-h-[220px] sm:max-h-[300px] h-auto scrollbar-hide">
          {filteredOrders.length > 0 ? (
            <div className="space-y-0.5 sm:space-y-2">
              {filteredOrders.map((order) => (
                <OrderList key={order._id} order={order} />
              ))}
            </div>
          ) : (
            <div className="flex justify-center items-center py-2 sm:py-6">
              <p className="text-gray-500 text-[10px] sm:text-sm text-center">
                {searchQuery ? "No orders found" : "No orders"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecentOrders;
