import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { formatDate } from "../../utils";

const CustomerInfo = ({ orderId }) => {
  const [dateTime, setDateTime] = useState(new Date());
  const orders = useSelector((state) => state.order.orders);
  const activeOrderId = useSelector((state) => state.order.activeOrderId);

  // Update time every second for real-time display
  useEffect(() => {
    const interval = setInterval(() => {
      setDateTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const currentOrder =
    orders.find((order) => order.id === orderId) ||
    orders.find((order) => order.id === activeOrderId);

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex flex-col items-start">
        <h1 className="text-md text-black font-semibold tracking-wide">
          Date & Time
        </h1>
        <p className="text-xs text-[#ababab] font-medium mt-1">
          {formatDate(dateTime)}
        </p>
      </div>
      {/* Optional: You can remove this button if you don't need it */}
      <button className="bg-[#f6b100] p-3 text-xl font-bold rounded-lg">
        {dateTime.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </button>
    </div>
  );
};

export default CustomerInfo;
