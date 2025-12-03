import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { formatDate } from "../../utils";

const CustomerInfo = ({ orderId }) => {
  const [dateTime, setDateTime] = useState(new Date());

  // Update time every second for real-time display
  useEffect(() => {
    const interval = setInterval(() => {
      setDateTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

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
    </div>
  );
};

export default CustomerInfo;
