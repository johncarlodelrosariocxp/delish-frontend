import React from "react";
import { FaPrint, FaTrashAlt } from "react-icons/fa";

const statusColors = {
  "In Progress": "text-yellow-700 bg-yellow-100",
  Ready: "text-green-700 bg-green-100",
  Completed: "text-blue-700 bg-blue-100",
};

const OrderCard = ({ order, onViewReceipt, onDelete, onStatusChange }) => {
  const currentColor =
    statusColors[order.orderStatus] || "text-gray-700 bg-gray-100";

  return (
    <div className="w-full max-w-md bg-white p-4 rounded-lg mb-4 border border-gray-200 shadow-md mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <div className="flex flex-col items-start gap-1 flex-grow">
          <h1 className="text-[#333333] text-lg font-semibold tracking-wide break-words">
            {order.customerDetails.name}
          </h1>
          <p className="text-[#666666] text-sm">
            #{Math.floor(new Date(order.orderDate).getTime())} / Dine in
          </p>
          <p className="text-[#666666] text-sm">Table {order.table?.tableNo}</p>
        </div>

        {/* 🔄 Status Dropdown */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <select
            value={order.orderStatus}
            onChange={(e) => onStatusChange(order, e.target.value)}
            className={`px-3 py-1 rounded text-sm font-semibold border ${currentColor}`}
          >
            <option value="In Progress">In Progress</option>
            <option value="Ready">Ready</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>

      <div className="flex justify-between items-center mt-4 text-[#666666] text-sm">
        <p>{new Date(order.orderDate).toLocaleString()}</p>
        <p>{order.items.length} Items</p>
      </div>

      <hr className="w-full mt-4 border-t border-gray-300" />

      <div className="flex items-center justify-between mt-4">
        <h1 className="text-[#333333] text-lg font-semibold">Total</h1>
        <p className="text-[#333333] text-lg font-semibold">
          ₱{order.bills.totalWithTax.toFixed(2)}
        </p>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <button
          onClick={() => onViewReceipt(order)}
          className="bg-[#025cca] text-white px-4 py-2 rounded-md flex items-center gap-2 w-full justify-center"
        >
          <FaPrint /> View Receipt
        </button>

        <button
          onClick={() => onDelete(order._id)}
          className="bg-red-600 text-white px-4 py-2 rounded-md flex items-center gap-2 w-full justify-center hover:bg-red-700 transition"
        >
          <FaTrashAlt /> Delete Order
        </button>
      </div>
    </div>
  );
};

export default OrderCard;
