import React, { useRef } from "react";
import { motion } from "framer-motion";
import { FaCheck } from "react-icons/fa6";

const Invoice = ({ orderInfo, setShowInvoice }) => {
  const invoiceRef = useRef(null);

  const handlePrint = () => {
    if (!invoiceRef.current) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Order Receipt</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            /* Thermal printer friendly styles */
            @media print {
              body { 
                margin: 0 !important; 
                padding: 0 !important;
                font-family: 'Courier New', monospace !important;
                font-size: 12px !important;
                width: 80mm !important; /* Standard thermal paper width */
                background: white !important;
                color: black !important;
              }
              * {
                box-shadow: none !important;
                background: transparent !important;
              }
              .no-print { display: none !important; }
              .page-break { page-break-after: always; }
            }
            
            /* Screen styles */
            @media screen {
              body { 
                font-family: Arial, sans-serif; 
                padding: 10px;
                max-width: 300px;
                margin: 0 auto;
              }
            }
            
            /* Common styles */
            .receipt-container { 
              width: 100%;
              border: 1px solid #000;
              padding: 10px;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .text-bold { font-weight: bold; }
            .border-top { border-top: 1px dashed #000; margin: 8px 0; padding-top: 8px; }
            .flex-between { 
              display: flex; 
              justify-content: space-between; 
              align-items: center;
            }
            .items-list { width: 100%; }
            .total-section { font-size: 14px; font-weight: bold; }
            .success-icon { 
              text-align: center; 
              margin: 10px 0;
              font-size: 24px;
              color: green;
            }
          </style>
        </head>
        <body>
          <div class="receipt-container">
            <!-- Success Icon -->
            <div class="success-icon">✓</div>
            
            <!-- Header -->
            <h2 class="text-center">ORDER RECEIPT</h2>
            <p class="text-center">Thank you for your order!</p>
            
            <!-- Order Details -->
            <div class="border-top">
              <p><strong>Order ID:</strong> ${
                orderInfo.orderDate
                  ? Math.floor(new Date(orderInfo.orderDate).getTime())
                  : "N/A"
              }</p>
              <p><strong>Name:</strong> ${
                orderInfo.customerDetails?.name || "N/A"
              }</p>
              <p><strong>Phone:</strong> ${
                orderInfo.customerDetails?.phone || "N/A"
              }</p>
              <p><strong>Guests:</strong> ${
                orderInfo.customerDetails?.guests || "N/A"
              }</p>
            </div>
            
            <!-- Items -->
            <div class="border-top">
              <p class="text-bold">ITEMS ORDERED</p>
              ${orderInfo.items
                ?.map(
                  (item) => `
                <div class="flex-between">
                  <span>${item.name} x${item.quantity}</span>
                  <span>₱${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              `
                )
                .join("")}
            </div>
            
            <!-- Totals -->
            <div class="border-top">
              <div class="flex-between">
                <span>Subtotal:</span>
                <span>₱${orderInfo.bills?.total?.toFixed(2) || "0.00"}</span>
              </div>
              <div class="flex-between">
                <span>Tax:</span>
                <span>₱${orderInfo.bills?.tax?.toFixed(2) || "0.00"}</span>
              </div>
              <div class="flex-between total-section">
                <span>GRAND TOTAL:</span>
                <span>₱${
                  orderInfo.bills?.totalWithTax?.toFixed(2) || "0.00"
                }</span>
              </div>
            </div>
            
            <!-- Payment Details -->
            <div class="border-top">
              <p><strong>Payment Method:</strong> ${
                orderInfo.paymentMethod || "N/A"
              }</p>
              ${
                orderInfo.paymentMethod !== "Cash"
                  ? `
                <p><strong>Razorpay Order ID:</strong> ${
                  orderInfo.paymentData?.razorpay_order_id || "N/A"
                }</p>
                <p><strong>Razorpay Payment ID:</strong> ${
                  orderInfo.paymentData?.razorpay_payment_id || "N/A"
                }</p>
              `
                  : ""
              }
            </div>
            
            <!-- Footer -->
            <div class="border-top text-center">
              <p>Thank you for your business!</p>
              <p>${new Date().toLocaleString()}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank", "width=350,height=600");

    if (!printWindow) {
      alert("Please allow popups for printing");
      return;
    }

    printWindow.document.write(printContent);
    printWindow.document.close();

    // Wait for content to load then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        // Don't close immediately - let user cancel/confirm print dialog
        printWindow.onafterprint = () => {
          setTimeout(() => printWindow.close(), 100);
        };
      }, 250);
    };
  };

  const handleThermalPrint = () => {
    // Generate thermal printer friendly text
    let thermalText = `
ORDER RECEIPT
Thank you for your order!

Order ID: ${
      orderInfo.orderDate
        ? Math.floor(new Date(orderInfo.orderDate).getTime())
        : "N/A"
    }
Name: ${orderInfo.customerDetails?.name || "N/A"}
Phone: ${orderInfo.customerDetails?.phone || "N/A"}
Guests: ${orderInfo.customerDetails?.guests || "N/A"}
------------------------------
ITEMS ORDERED:
${orderInfo.items
  ?.map(
    (item) =>
      `${item.name} x${item.quantity}\n₱${(item.price * item.quantity).toFixed(
        2
      )}`
  )
  .join("\n")}
------------------------------
Subtotal: ₱${orderInfo.bills?.total?.toFixed(2) || "0.00"}
Tax: ₱${orderInfo.bills?.tax?.toFixed(2) || "0.00"}
GRAND TOTAL: ₱${orderInfo.bills?.totalWithTax?.toFixed(2) || "0.00"}
------------------------------
Payment Method: ${orderInfo.paymentMethod || "N/A"}
${
  orderInfo.paymentMethod !== "Cash"
    ? `
Razorpay Order ID: ${orderInfo.paymentData?.razorpay_order_id || "N/A"}
Razorpay Payment ID: ${orderInfo.paymentData?.razorpay_payment_id || "N/A"}
`
    : ""
}
------------------------------
Thank you for your business!
${new Date().toLocaleString()}
    `.trim();

    // Create a simple text print
    const textBlob = new Blob([thermalText], { type: "text/plain" });
    const textUrl = URL.createObjectURL(textBlob);

    const textWindow = window.open(textUrl, "_blank");
    if (textWindow) {
      setTimeout(() => {
        textWindow.print();
        setTimeout(() => {
          textWindow.close();
          URL.revokeObjectURL(textUrl);
        }, 100);
      }, 500);
    }
  };

  if (
    !orderInfo ||
    !orderInfo.customerDetails ||
    !orderInfo.items ||
    !orderInfo.bills
  ) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
        <div className="bg-white p-6 rounded-lg shadow-lg text-center">
          <p className="text-red-500 font-semibold">
            Invalid or missing order data.
          </p>
          <button
            onClick={() => setShowInvoice(false)}
            className="mt-4 text-blue-500 hover:underline text-sm"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
      <div className="bg-white p-4 rounded-lg shadow-lg w-[400px]">
        <div ref={invoiceRef} className="p-4 no-print">
          {/* Receipt Header */}
          <div className="flex justify-center mb-4">
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1.2, opacity: 1 }}
              transition={{ duration: 0.5, type: "spring", stiffness: 150 }}
              className="w-12 h-12 border-8 border-green-500 rounded-full flex items-center justify-center shadow-lg bg-green-500"
            >
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, duration: 0.3 }}
                className="text-2xl"
              >
                <FaCheck className="text-white" />
              </motion.span>
            </motion.div>
          </div>

          <h2 className="text-xl font-bold text-center mb-2">Order Receipt</h2>
          <p className="text-gray-600 text-center">Thank you for your order!</p>

          {/* Order Details */}
          <div className="mt-4 border-t pt-4 text-sm text-gray-700">
            <p>
              <strong>Order ID:</strong>{" "}
              {orderInfo.orderDate
                ? Math.floor(new Date(orderInfo.orderDate).getTime())
                : "N/A"}
            </p>
            <p>
              <strong>Name:</strong> {orderInfo.customerDetails?.name || "N/A"}
            </p>
            <p>
              <strong>Phone:</strong>{" "}
              {orderInfo.customerDetails?.phone || "N/A"}
            </p>
            <p>
              <strong>Guests:</strong>{" "}
              {orderInfo.customerDetails?.guests || "N/A"}
            </p>
          </div>

          {/* Items Summary */}
          <div className="mt-4 border-t pt-4">
            <h3 className="text-sm font-semibold">Items Ordered</h3>
            <ul className="text-sm text-gray-700">
              {orderInfo.items?.map((item, index) => (
                <li
                  key={index}
                  className="flex justify-between items-center text-xs"
                >
                  <span>
                    {item.name} x{item.quantity}
                  </span>
                  <span>₱{(item.price * item.quantity).toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Bills Summary */}
          <div className="mt-4 border-t pt-4 text-sm">
            <div className="flex justify-between">
              <span>
                <strong>Subtotal:</strong>
              </span>
              <span>₱{orderInfo.bills?.total?.toFixed(2) || "0.00"}</span>
            </div>
            <div className="flex justify-between">
              <span>
                <strong>Tax:</strong>
              </span>
              <span>₱{orderInfo.bills?.tax?.toFixed(2) || "0.00"}</span>
            </div>
            <div className="flex justify-between text-md font-semibold">
              <span>
                <strong>Grand Total:</strong>
              </span>
              <span>
                ₱{orderInfo.bills?.totalWithTax?.toFixed(2) || "0.00"}
              </span>
            </div>
          </div>

          {/* Payment Details */}
          <div className="mb-2 mt-2 text-xs">
            <p>
              <strong>Payment Method:</strong>{" "}
              {orderInfo.paymentMethod || "N/A"}
            </p>
            {orderInfo.paymentMethod !== "Cash" && (
              <>
                <p>
                  <strong>Razorpay Order ID:</strong>{" "}
                  {orderInfo.paymentData?.razorpay_order_id || "N/A"}
                </p>
                <p>
                  <strong>Razorpay Payment ID:</strong>{" "}
                  {orderInfo.paymentData?.razorpay_payment_id || "N/A"}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-between mt-4 no-print">
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600 transition-colors"
            >
              Print Receipt
            </button>
            <button
              onClick={handleThermalPrint}
              className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-600 transition-colors"
            >
              Thermal Print
            </button>
          </div>
          <button
            onClick={() => setShowInvoice(false)}
            className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default Invoice;
