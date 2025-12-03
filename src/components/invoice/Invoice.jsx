import React from "react";
import { FaPrint, FaTimes, FaUser } from "react-icons/fa";

const Invoice = ({ orderInfo, setShowInvoice }) => {
  if (!orderInfo) return null;

  const formatCurrency = (amount) => {
    const numericAmount =
      typeof amount === "number" ? amount : parseFloat(amount) || 0;
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericAmount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid Date";
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return "Invalid Date";
    }
  };

  const calculateTotalAmount = (order) => {
    if (!order) return 0;
    if (order.totalAmount !== undefined && order.totalAmount !== null) {
      return Number(order.totalAmount) || 0;
    }
    if (
      order.bills?.totalWithTax !== undefined &&
      order.bills.totalWithTax !== null
    ) {
      return Number(order.bills.totalWithTax) || 0;
    }
    if (order.items && Array.isArray(order.items)) {
      return order.items.reduce((total, item) => {
        const price = Number(item.price || item.unitPrice || 0);
        const quantity = Number(item.quantity || 1);
        return total + price * quantity;
      }, 0);
    }
    return 0;
  };

  const totalAmount = calculateTotalAmount(orderInfo);
  const customerName = orderInfo.customerDetails?.name || "Unknown Customer";
  const orderDate = formatDate(orderInfo.createdAt || orderInfo.orderDate);
  const orderId = orderInfo._id ? `#${orderInfo._id.slice(-8)}` : "N/A";

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Invoice</h2>
            <button
              onClick={() => setShowInvoice(false)}
              className="text-white hover:text-gray-200"
            >
              <FaTimes size={20} />
            </button>
          </div>
          <div className="mt-2 text-sm">
            <div>Order ID: {orderId}</div>
            <div>Date: {orderDate}</div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {/* Customer Info */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-700 mb-2">Customer</h3>
            <div className="text-gray-600">
              <div className="flex items-center gap-2 mb-1">
                <FaUser className="text-sm" />
                <span>{customerName}</span>
              </div>
              {orderInfo.customerDetails?.phone && (
                <div className="text-sm">
                  Phone: {orderInfo.customerDetails.phone}
                </div>
              )}
              {orderInfo.customerDetails?.email && (
                <div className="text-sm">
                  Email: {orderInfo.customerDetails.email}
                </div>
              )}
            </div>
          </div>

          {/* Items List */}
          <div className="mb-4">
            <h3 className="font-semibold text-gray-700 mb-2">Order Items</h3>
            <div className="space-y-2">
              {orderInfo.items && Array.isArray(orderInfo.items) ? (
                orderInfo.items.map((item, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center p-2 border-b"
                  >
                    <div>
                      <div className="font-medium">
                        {item.name || item.productName || `Item ${index + 1}`}
                      </div>
                      <div className="text-sm text-gray-500">
                        Qty: {item.quantity || 1} ×{" "}
                        {formatCurrency(item.price || item.unitPrice || 0)}
                      </div>
                    </div>
                    <div className="font-semibold">
                      {formatCurrency(
                        (item.quantity || 1) *
                          (item.price || item.unitPrice || 0)
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-gray-500 text-center py-4">
                  No items details available
                </div>
              )}
            </div>
          </div>

          {/* Total */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center text-lg font-bold">
              <span>Total:</span>
              <span className="text-blue-600">
                {formatCurrency(totalAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex gap-3">
            <button
              onClick={handlePrint}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
            >
              <FaPrint />
              Print Invoice
            </button>
            <button
              onClick={() => setShowInvoice(false)}
              className="px-6 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-100 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Invoice;
