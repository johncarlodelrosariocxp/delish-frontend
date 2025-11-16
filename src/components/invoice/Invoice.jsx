import React, { useRef } from "react";
import { motion } from "framer-motion";
import { FaCheck, FaPrint, FaTimes, FaReceipt } from "react-icons/fa";

const Invoice = ({ orderInfo, setShowInvoice }) => {
  const invoiceRef = useRef(null);

  const handlePrint = () => {
    if (!invoiceRef.current) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Order Receipt - DELISH</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            /* Thermal printer friendly styles */
            @media print {
              body { 
                margin: 0 !important; 
                padding: 0 !important;
                font-family: 'Courier New', monospace !important;
                font-size: 12px !important;
                width: 80mm !important;
                background: white !important;
                color: black !important;
                -webkit-print-color-adjust: exact !important;
              }
              * {
                box-shadow: none !important;
                background: transparent !important;
              }
              .no-print { display: none !important; }
              .page-break { page-break-after: always; }
              .text-center { text-align: center !important; }
              .text-right { text-align: right !important; }
              .text-bold { font-weight: bold !important; }
              .border-top { 
                border-top: 1px dashed #000 !important; 
                margin: 8px 0 !important; 
                padding-top: 8px !important;
              }
              .flex-between { 
                display: flex !important; 
                justify-content: space-between !important; 
                align-items: center !important;
              }
              .total-section { font-size: 14px !important; font-weight: bold !important; }
              .success-icon { 
                text-align: center !important; 
                margin: 10px 0 !important;
                font-size: 24px !important;
                color: green !important;
              }
            }
            
            /* Screen styles */
            @media screen {
              body { 
                font-family: Arial, sans-serif; 
                padding: 10px;
                max-width: 300px;
                margin: 0 auto;
                background: #f5f5f5;
              }
            }
            
            /* Common styles */
            .receipt-container { 
              width: 100%;
              border: 1px solid #000;
              padding: 15px;
              background: white;
            }
            .header {
              text-align: center;
              margin-bottom: 15px;
            }
            .company-name {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .receipt-title {
              font-size: 16px;
              margin-bottom: 10px;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin: 10px 0;
            }
            .items-table td {
              padding: 2px 0;
              font-size: 11px;
            }
            .discount-item {
              color: #059669;
              font-size: 10px;
            }
            .free-item {
              color: #dc2626;
              font-weight: bold;
            }
            .thank-you {
              text-align: center;
              margin-top: 15px;
              font-style: italic;
            }
          </style>
        </head>
        <body>
          <div class="receipt-container">
            <!-- Header -->
            <div class="header">
              <div class="company-name">DELISH RESTAURANT</div>
              <div class="receipt-title">ORDER RECEIPT</div>
              <div class="success-icon">✓</div>
              <div>Thank you for your order!</div>
            </div>
            
            <!-- Order Details -->
            <div class="border-top">
              <table width="100%">
                <tr><td><strong>Order ID:</strong></td><td>${
                  orderInfo.orderDate
                    ? Math.floor(new Date(orderInfo.orderDate).getTime())
                    : "N/A"
                }</td></tr>
                <tr><td><strong>Name:</strong></td><td>${
                  orderInfo.customerDetails?.name || "Walk-in Customer"
                }</td></tr>
                <tr><td><strong>Phone:</strong></td><td>${
                  orderInfo.customerDetails?.phone || "Not provided"
                }</td></tr>
                <tr><td><strong>Guests:</strong></td><td>${
                  orderInfo.customerDetails?.guests || "1"
                }</td></tr>
                <tr><td><strong>Date:</strong></td><td>${new Date(
                  orderInfo.orderDate
                ).toLocaleString()}</td></tr>
              </table>
            </div>
            
            <!-- Items -->
            <div class="border-top">
              <div class="text-bold">ORDER ITEMS</div>
              <table class="items-table">
                ${orderInfo.items
                  ?.map(
                    (item) => `
                  <tr>
                    <td>${item.name}${item.isFree ? " (FREE)" : ""} x${
                      item.quantity
                    }</td>
                    <td class="text-right">₱${(
                      item.price * item.quantity
                    ).toFixed(2)}</td>
                  </tr>
                  ${
                    item.isFree
                      ? `<tr><td colspan="2" class="free-item">→ Redeemed for free!</td></tr>`
                      : ""
                  }
                `
                  )
                  .join("")}
              </table>
            </div>
            
            <!-- Discounts & Totals -->
            <div class="border-top">
              <table width="100%">
                <tr><td>Subtotal:</td><td class="text-right">₱${
                  orderInfo.bills?.total?.toFixed(2) || "0.00"
                }</td></tr>
                ${
                  orderInfo.bills?.pwdSssDiscount > 0
                    ? `<tr><td class="discount-item">PWD/SSS Discount:</td><td class="text-right discount-item">-₱${orderInfo.bills.pwdSssDiscount.toFixed(
                        2
                      )}</td></tr>`
                    : ""
                }
                ${
                  orderInfo.bills?.employeeDiscount > 0
                    ? `<tr><td class="discount-item">Employee Discount:</td><td class="text-right discount-item">-₱${orderInfo.bills.employeeDiscount.toFixed(
                        2
                      )}</td></tr>`
                    : ""
                }
                ${
                  orderInfo.bills?.redemptionDiscount > 0
                    ? `<tr><td class="discount-item">Redemption Discount:</td><td class="text-right discount-item">-₱${orderInfo.bills.redemptionDiscount.toFixed(
                        2
                      )}</td></tr>`
                    : ""
                }
                <tr><td>VAT (12%):</td><td class="text-right">₱${
                  orderInfo.bills?.tax?.toFixed(2) || "0.00"
                }</td></tr>
                <tr class="total-section">
                  <td><strong>GRAND TOTAL:</strong></td>
                  <td class="text-right"><strong>₱${
                    orderInfo.bills?.totalWithTax?.toFixed(2) || "0.00"
                  }</strong></td>
                </tr>
              </table>
            </div>
            
            <!-- Payment Details -->
            <div class="border-top">
              <table width="100%">
                <tr><td><strong>Payment Method:</strong></td><td>${
                  orderInfo.paymentMethod || "Cash"
                }</td></tr>
                ${
                  orderInfo.paymentMethod !== "Cash"
                    ? `
                  <tr><td>Razorpay Order ID:</td><td>${
                    orderInfo.paymentData?.razorpay_order_id || "N/A"
                  }</td></tr>
                  <tr><td>Razorpay Payment ID:</td><td>${
                    orderInfo.paymentData?.razorpay_payment_id || "N/A"
                  }</td></tr>
                `
                    : ""
                }
                <tr><td><strong>Status:</strong></td><td>${
                  orderInfo.orderStatus || "In Progress"
                }</td></tr>
              </table>
            </div>
            
            <!-- Footer -->
            <div class="thank-you">
              <div>Thank you for your purchase!</div>
              <div>We hope to see you again soon!</div>
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

    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.onafterprint = () => {
          setTimeout(() => printWindow.close(), 100);
        };
      }, 250);
    };
  };

  const handleThermalPrint = () => {
    let thermalText = `
DELISH RESTAURANT
ORDER RECEIPT
✓ Thank you for your order!

Order ID: ${
      orderInfo.orderDate
        ? Math.floor(new Date(orderInfo.orderDate).getTime())
        : "N/A"
    }
Name: ${orderInfo.customerDetails?.name || "Walk-in Customer"}
Phone: ${orderInfo.customerDetails?.phone || "Not provided"}
Guests: ${orderInfo.customerDetails?.guests || "1"}
Date: ${new Date(orderInfo.orderDate).toLocaleString()}
${"=".repeat(32)}
ORDER ITEMS:
${orderInfo.items
  ?.map(
    (item) =>
      `${item.name}${item.isFree ? " (FREE)" : ""} x${item.quantity}\n` +
      `₱${(item.price * item.quantity).toFixed(2)}${
        item.isFree ? " → Redeemed for free!" : ""
      }`
  )
  .join("\n")}
${"=".repeat(32)}
BILL SUMMARY:
Subtotal: ₱${orderInfo.bills?.total?.toFixed(2) || "0.00"}
${
  orderInfo.bills?.pwdSssDiscount > 0
    ? `PWD/SSS Discount: -₱${orderInfo.bills.pwdSssDiscount.toFixed(2)}\n`
    : ""
}${
      orderInfo.bills?.employeeDiscount > 0
        ? `Employee Discount: -₱${orderInfo.bills.employeeDiscount.toFixed(
            2
          )}\n`
        : ""
    }${
      orderInfo.bills?.redemptionDiscount > 0
        ? `Redemption Discount: -₱${orderInfo.bills.redemptionDiscount.toFixed(
            2
          )}\n`
        : ""
    }VAT (12%): ₱${orderInfo.bills?.tax?.toFixed(2) || "0.00"}
GRAND TOTAL: ₱${orderInfo.bills?.totalWithTax?.toFixed(2) || "0.00"}
${"=".repeat(32)}
Payment Method: ${orderInfo.paymentMethod || "Cash"}
${
  orderInfo.paymentMethod !== "Cash"
    ? `
Razorpay Order ID: ${orderInfo.paymentData?.razorpay_order_id || "N/A"}
Razorpay Payment ID: ${orderInfo.paymentData?.razorpay_payment_id || "N/A"}
`
    : ""
}
Status: ${orderInfo.orderStatus || "In Progress"}
${"=".repeat(32)}
Thank you for your business!
We hope to see you again soon!
    `.trim();

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

  if (!orderInfo) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start z-50 overflow-y-auto py-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: -20 }}
        transition={{ duration: 0.3, type: "spring", stiffness: 200 }}
        className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md mx-4"
      >
        {/* Header */}
        <div className="text-center mb-6">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, type: "spring", stiffness: 150 }}
            className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center shadow-lg mx-auto mb-4"
          >
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, duration: 0.3 }}
            >
              <FaCheck className="text-white text-2xl" />
            </motion.span>
          </motion.div>
          <h2 className="text-2xl font-bold text-gray-800">Order Confirmed!</h2>
          <p className="text-gray-600 mt-2">
            Thank you for your order at DELISH
          </p>
        </div>

        {/* Receipt Content */}
        <div ref={invoiceRef} className="space-y-4">
          {/* Order Details */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-700 mb-3">Order Details</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-600">Order ID:</span>
                <p className="font-medium">
                  {orderInfo.orderDate
                    ? Math.floor(new Date(orderInfo.orderDate).getTime())
                    : "N/A"}
                </p>
              </div>
              <div>
                <span className="text-gray-600">Date:</span>
                <p className="font-medium">
                  {new Date(orderInfo.orderDate).toLocaleString()}
                </p>
              </div>
              <div>
                <span className="text-gray-600">Customer:</span>
                <p className="font-medium">
                  {orderInfo.customerDetails?.name || "Walk-in Customer"}
                </p>
              </div>
              <div>
                <span className="text-gray-600">Guests:</span>
                <p className="font-medium">
                  {orderInfo.customerDetails?.guests || "1"}
                </p>
              </div>
              <div className="col-span-2">
                <span className="text-gray-600">Status:</span>
                <p className="font-medium text-green-600">
                  {orderInfo.orderStatus || "In Progress"}
                </p>
              </div>
            </div>
          </div>

          {/* Items Ordered */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-700 mb-3">Items Ordered</h3>
            <div className="space-y-2">
              {orderInfo.items?.map((item, index) => (
                <div
                  key={index}
                  className={`flex justify-between items-center p-2 rounded ${
                    item.isFree ? "bg-red-50 border border-red-200" : "bg-white"
                  }`}
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {item.name}
                      {item.isFree && (
                        <span className="ml-2 text-red-600 text-xs font-semibold">
                          (FREE)
                        </span>
                      )}
                    </p>
                    <p className="text-gray-600 text-xs">
                      {item.quantity} × ₱{item.pricePerQuantity?.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-semibold text-sm ${
                        item.isFree ? "text-red-600" : "text-gray-800"
                      }`}
                    >
                      {item.isFree
                        ? "FREE"
                        : `₱${(item.price * item.quantity).toFixed(2)}`}
                    </p>
                    {item.isFree && (
                      <p className="text-red-500 text-xs font-semibold">
                        Redeemed!
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bill Summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-700 mb-3">Bill Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>₱{orderInfo.bills?.total?.toFixed(2) || "0.00"}</span>
              </div>

              {orderInfo.bills?.pwdSssDiscount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>PWD/SSS Discount:</span>
                  <span>-₱{orderInfo.bills.pwdSssDiscount.toFixed(2)}</span>
                </div>
              )}

              {orderInfo.bills?.employeeDiscount > 0 && (
                <div className="flex justify-between text-yellow-600">
                  <span>Employee Discount:</span>
                  <span>-₱{orderInfo.bills.employeeDiscount.toFixed(2)}</span>
                </div>
              )}

              {orderInfo.bills?.redemptionDiscount > 0 && (
                <div className="flex justify-between text-blue-600">
                  <span>Redemption Discount:</span>
                  <span>-₱{orderInfo.bills.redemptionDiscount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>VAT (12%):</span>
                <span>₱{orderInfo.bills?.tax?.toFixed(2) || "0.00"}</span>
              </div>

              <div className="border-t pt-2 mt-2 flex justify-between font-bold text-lg">
                <span>Grand Total:</span>
                <span className="text-green-600">
                  ₱{orderInfo.bills?.totalWithTax?.toFixed(2) || "0.00"}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Information */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-700 mb-3">
              Payment Information
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Payment Method:</span>
                <span className="font-medium">
                  {orderInfo.paymentMethod || "Cash"}
                </span>
              </div>
              {orderInfo.paymentMethod !== "Cash" && (
                <>
                  <div className="flex justify-between">
                    <span>Razorpay Order ID:</span>
                    <span className="font-mono text-xs">
                      {orderInfo.paymentData?.razorpay_order_id || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Razorpay Payment ID:</span>
                    <span className="font-mono text-xs">
                      {orderInfo.paymentData?.razorpay_payment_id || "N/A"}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <div className="flex gap-2 flex-1">
            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-lg flex-1 hover:bg-blue-700 transition-colors font-semibold"
            >
              <FaPrint className="text-sm" />
              Print Receipt
            </button>
            <button
              onClick={handleThermalPrint}
              className="flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-3 rounded-lg flex-1 hover:bg-green-700 transition-colors font-semibold"
            >
              <FaReceipt className="text-sm" />
              Thermal Print
            </button>
          </div>
          <button
            onClick={() => setShowInvoice(false)}
            className="flex items-center justify-center gap-2 bg-gray-600 text-white px-4 py-3 rounded-lg hover:bg-gray-700 transition-colors font-semibold sm:w-auto w-full"
          >
            <FaTimes className="text-sm" />
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Invoice;
