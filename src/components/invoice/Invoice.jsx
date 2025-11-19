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
                font-size: 10px !important;
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
              .text-center { text-align: center !important; }
              .text-right { text-align: right !important; }
              .text-bold { font-weight: bold !important; }
              .border-top { 
                border-top: 1px dashed #000 !important; 
                margin: 6px 0 !important; 
                padding-top: 6px !important;
              }
              .success-icon { 
                text-align: center !important; 
                margin: 8px 0 !important;
                font-size: 20px !important;
                color: green !important;
              }
            }
            
            /* Common styles */
            .receipt-container { 
              width: 100%;
              border: 1px solid #000;
              padding: 12px;
              background: white;
            }
            .header {
              text-align: center;
              margin-bottom: 12px;
            }
            .company-name {
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 4px;
            }
            .receipt-title {
              font-size: 14px;
              margin-bottom: 8px;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin: 8px 0;
            }
            .items-table td {
              padding: 1px 0;
              font-size: 10px;
            }
            .discount-item {
              color: #059669;
              font-size: 9px;
            }
            .free-item {
              color: #dc2626;
              font-weight: bold;
            }
            .thank-you {
              text-align: center;
              margin-top: 12px;
              font-style: italic;
              font-size: 10px;
            }
          </style>
        </head>
        <body>
          <div class="receipt-container">
            <div class="header">
              <div class="company-name">DELISH RESTAURANT</div>
              <div class="receipt-title">ORDER RECEIPT</div>
              <div class="success-icon">✓</div>
              <div>Thank you for your order!</div>
            </div>
            
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
                <tr><td><strong>Date:</strong></td><td>${new Date(
                  orderInfo.orderDate
                ).toLocaleString()}</td></tr>
              </table>
            </div>
            
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
                `
                  )
                  .join("")}
              </table>
            </div>
            
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
                <tr><td>VAT (12%):</td><td class="text-right">₱${
                  orderInfo.bills?.tax?.toFixed(2) || "0.00"
                }</td></tr>
                <tr class="text-bold">
                  <td>TOTAL:</td>
                  <td class="text-right">₱${
                    orderInfo.bills?.totalWithTax?.toFixed(2) || "0.00"
                  }</td>
                </tr>
              </table>
            </div>
            
            <div class="border-top">
              <table width="100%">
                <tr><td><strong>Payment:</strong></td><td>${
                  orderInfo.paymentMethod || "Cash"
                }</td></tr>
                <tr><td><strong>Status:</strong></td><td>${
                  orderInfo.orderStatus || "In Progress"
                }</td></tr>
              </table>
            </div>
            
            <div class="thank-you">
              <div>Thank you for your purchase!</div>
            </div>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank", "width=300,height=500");
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
✓ Thank you!

Order ID: ${
      orderInfo.orderDate
        ? Math.floor(new Date(orderInfo.orderDate).getTime())
        : "N/A"
    }
Name: ${orderInfo.customerDetails?.name || "Walk-in"}
Date: ${new Date(orderInfo.orderDate).toLocaleDateString()}
${"=".repeat(28)}
ITEMS:
${orderInfo.items
  ?.map(
    (item) =>
      `${item.name}${item.isFree ? " (FREE)" : ""} x${item.quantity} - ₱${(
        item.price * item.quantity
      ).toFixed(2)}`
  )
  .join("\n")}
${"=".repeat(28)}
Subtotal: ₱${orderInfo.bills?.total?.toFixed(2) || "0.00"}
${
  orderInfo.bills?.pwdSssDiscount > 0
    ? `PWD/SSS: -₱${orderInfo.bills.pwdSssDiscount.toFixed(2)}\n`
    : ""
}${
      orderInfo.bills?.employeeDiscount > 0
        ? `Emp Disc: -₱${orderInfo.bills.employeeDiscount.toFixed(2)}\n`
        : ""
    }VAT (12%): ₱${orderInfo.bills?.tax?.toFixed(2) || "0.00"}
TOTAL: ₱${orderInfo.bills?.totalWithTax?.toFixed(2) || "0.00"}
${"=".repeat(28)}
Payment: ${orderInfo.paymentMethod || "Cash"}
Status: ${orderInfo.orderStatus || "In Progress"}
Thank you!
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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-3">
        <div className="bg-white p-3 rounded-lg shadow-lg text-center max-w-[280px]">
          <p className="text-red-500 font-semibold text-xs">
            Invalid order data.
          </p>
          <button
            onClick={() => setShowInvoice(false)}
            className="mt-2 text-blue-500 hover:underline text-[10px] px-3 py-1.5"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-3">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.15 }}
        className="bg-white rounded-lg shadow-xl w-full max-w-[280px] max-h-[85vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="text-center p-3 border-b">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2"
          >
            <FaCheck className="text-white text-sm" />
          </motion.div>
          <h2 className="text-lg font-bold text-gray-800">Confirmed!</h2>
          <p className="text-gray-600 text-[11px] mt-0.5">Thank you</p>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2" ref={invoiceRef}>
          {/* Order Details */}
          <div className="bg-gray-50 p-2 rounded">
            <h3 className="font-semibold text-gray-700 text-[11px] mb-1.5">
              Order Details
            </h3>
            <div className="grid grid-cols-2 gap-1 text-[10px]">
              <div>
                <span className="text-gray-600">ID:</span>
                <p className="font-medium truncate">
                  {orderInfo.orderDate
                    ? Math.floor(new Date(orderInfo.orderDate).getTime())
                        .toString()
                        .slice(-6)
                    : "N/A"}
                </p>
              </div>
              <div>
                <span className="text-gray-600">Date:</span>
                <p className="font-medium">
                  {new Date(orderInfo.orderDate).toLocaleDateString()}
                </p>
              </div>
              <div className="col-span-2">
                <span className="text-gray-600">Customer:</span>
                <p className="font-medium truncate">
                  {orderInfo.customerDetails?.name || "Walk-in"}
                </p>
              </div>
            </div>
          </div>

          {/* Items Ordered */}
          <div className="bg-gray-50 p-2 rounded">
            <h3 className="font-semibold text-gray-700 text-[11px] mb-1.5">
              Items
            </h3>
            <div className="space-y-1.5 max-h-24 overflow-y-auto">
              {orderInfo.items?.map((item, index) => (
                <div
                  key={index}
                  className={`flex justify-between items-start p-1.5 rounded text-[10px] ${
                    item.isFree ? "bg-red-50 border border-red-200" : "bg-white"
                  }`}
                >
                  <div className="flex-1 pr-2">
                    <p className="font-medium truncate">
                      {item.name}
                      {item.isFree && (
                        <span className="ml-1 text-red-600 font-semibold">
                          (FREE)
                        </span>
                      )}
                    </p>
                    <p className="text-gray-600">
                      {item.quantity} × ₱{item.pricePerQuantity?.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right min-w-14">
                    <p
                      className={`font-semibold ${
                        item.isFree ? "text-red-600" : "text-gray-800"
                      }`}
                    >
                      {item.isFree
                        ? "FREE"
                        : `₱${(item.price * item.quantity).toFixed(2)}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bill Summary */}
          <div className="bg-gray-50 p-2 rounded">
            <h3 className="font-semibold text-gray-700 text-[11px] mb-1.5">
              Bill Summary
            </h3>
            <div className="space-y-1 text-[10px]">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>₱{orderInfo.bills?.total?.toFixed(2) || "0.00"}</span>
              </div>

              {orderInfo.bills?.pwdSssDiscount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>PWD/SSS:</span>
                  <span>-₱{orderInfo.bills.pwdSssDiscount.toFixed(2)}</span>
                </div>
              )}

              {orderInfo.bills?.employeeDiscount > 0 && (
                <div className="flex justify-between text-yellow-600">
                  <span>Emp Disc:</span>
                  <span>-₱{orderInfo.bills.employeeDiscount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>VAT (12%):</span>
                <span>₱{orderInfo.bills?.tax?.toFixed(2) || "0.00"}</span>
              </div>

              <div className="border-t pt-1.5 mt-1.5 flex justify-between font-bold text-[11px]">
                <span>Total:</span>
                <span className="text-green-600">
                  ₱{orderInfo.bills?.totalWithTax?.toFixed(2) || "0.00"}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Information */}
          <div className="bg-gray-50 p-2 rounded">
            <h3 className="font-semibold text-gray-700 text-[11px] mb-1.5">
              Payment
            </h3>
            <div className="space-y-1 text-[10px]">
              <div className="flex justify-between">
                <span>Method:</span>
                <span className="font-medium">
                  {orderInfo.paymentMethod || "Cash"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="font-medium text-green-600">
                  {orderInfo.orderStatus || "In Progress"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-3 border-t bg-gray-50">
          <div className="flex gap-1.5 mb-1.5">
            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-1 bg-blue-600 text-white px-2 py-1.5 rounded flex-1 hover:bg-blue-700 transition-colors text-[10px] font-semibold"
            >
              <FaPrint className="text-[8px]" />
              Print
            </button>
            <button
              onClick={handleThermalPrint}
              className="flex items-center justify-center gap-1 bg-green-600 text-white px-2 py-1.5 rounded flex-1 hover:bg-green-700 transition-colors text-[10px] font-semibold"
            >
              <FaReceipt className="text-[8px]" />
              Thermal
            </button>
          </div>
          <button
            onClick={() => setShowInvoice(false)}
            className="flex items-center justify-center gap-1 bg-gray-600 text-white px-2 py-1.5 rounded hover:bg-gray-700 transition-colors w-full text-[10px] font-semibold"
          >
            <FaTimes className="text-[8px]" />
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Invoice;
