import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { formatDate, getAvatarName } from "../../utils";

const CustomerInfo = ({ orderId }) => {
  const [dateTime, setDateTime] = useState(new Date());
  const orders = useSelector((state) => state.order.orders);
  const activeOrderId = useSelector((state) => state.order.activeOrderId);

  // Update time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setDateTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const currentOrder =
    orders.find((order) => order.id === orderId) ||
    orders.find((order) => order.id === activeOrderId);

  // Get customer type from order data - check multiple possible locations
  const customerType =
    currentOrder?.customer?.type ||
    currentOrder?.customerDetails?.type ||
    currentOrder?.customerStatus?.toLowerCase().replace("-", "") ||
    "walk-in";

  // Determine status based on customer type
  const getCustomerStatus = () => {
    if (customerType === "walk-in" || customerType === "dinein") {
      return "Dine-in";
    } else if (customerType === "take-out" || customerType === "takeout") {
      return "Take-out";
    } else {
      return "Dine-in"; // Default
    }
  };

  const customerStatus = getCustomerStatus();

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex flex-col items-start">
        <h1 className="text-md text-black font-semibold tracking-wide">
          Customer
        </h1>
        <p className="text-xs text-[#ababab] font-medium mt-1">
          {customerStatus}
        </p>
        <p className="text-xs text-[#ababab] font-medium mt-2">
          {formatDate(dateTime)}
        </p>
      </div>
      <button className="bg-[#f6b100] p-3 text-xl font-bold rounded-lg">
        {getAvatarName("Customer") || "C"}
      </button>
    </div>
  );
};

export default CustomerInfo;
