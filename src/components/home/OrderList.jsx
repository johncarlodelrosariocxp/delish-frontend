import React from "react";
import { FaCheckDouble, FaLongArrowAltRight, FaCircle } from "react-icons/fa";
import { getAvatarName } from "../../utils/index";

const OrderList = ({ order }) => {
  return (
    <div className="flex items-center gap-5 mb-3 bg-white p-4 rounded-lg shadow-sm">
      <button className="bg-[#f6b100] p-3 text-xl font-bold rounded-lg text-white">
        {getAvatarName(order.customerDetails.name)}
      </button>
      <div className="flex items-center justify-between w-full">
        <div className="flex flex-col items-start gap-1">
          <h1 className="text-[#333333] text-lg font-semibold tracking-wide">
            {order.customerDetails.name}
          </h1>
          <p className="text-[#666666] text-sm">{order.items.length} Items</p>
        </div>

        <h1 className="text-[#f6b100] font-semibold border border-[#f6b100] rounded-lg p-1">
          Table <FaLongArrowAltRight className="text-[#ababab] ml-2 inline" />{" "}
          {order.table?.tableNo || "N/A"}
        </h1>

        <div className="flex flex-col items-end gap-2">
          {order.orderStatus === "Ready" ? (
            <p className="text-green-600 bg-[#e6f4ec] px-2 py-1 rounded-lg">
              <FaCheckDouble className="inline mr-2" /> {order.orderStatus}
            </p>
          ) : (
            <p className="text-yellow-600 bg-[#fdf6e3] px-2 py-1 rounded-lg">
              <FaCircle className="inline mr-2" /> {order.orderStatus}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderList;
