import React, { useRef } from "react";
import { motion } from "framer-motion";

// Icon components
const IconCheck = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 512 512"
    fill="currentColor"
  >
    <path d="M470.6 105.4c12.5 12.5 12.5 32.8 0 45.3l-256 256c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5 12.5-12.5 32.8 0-45.3s32.8-12.5 45.3 0L192 338.7 425.4 105.4c12.5-12.5 32.8-12.5 45.3 0z" />
  </svg>
);

const IconPrint = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 512 512"
    fill="currentColor"
  >
    <path d="M128 0C92.7 0 64 28.7 64 64v96h64V64H384v96h64V64c0-35.3-28.7-64-64-64H128zM384 352c35.3 0 64-28.7 64-64V224H288 224 64v64c0 35.3 28.7 64 64 64H384zm64 64H128c-35.3 0-64-28.7-64-64V224H128 384 448v128c0 35.3-28.7 64-64 64zM392 480a24 24 0 1 0 0-48 24 24 0 1 0 0 48z" />
  </svg>
);

const IconTimes = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 320 512"
    fill="currentColor"
  >
    <path d="M310.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L160 210.7 54.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L114.7 256 9.4 361.4c12.5 12.5 12.5 32.8 0 45.3s32.8 12.5 45.3 0L160 301.3 265.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L205.3 256 310.6 150.6z" />
  </svg>
);

const IconReceipt = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 384 512"
    fill="currentColor"
  >
    <path d="M336 64H48C21.5 64 0 85.5 0 112v288c0 26.5 21.5 48 48 48h288c26.5 0 48-21.5 48-48V112c0-26.5-21.5-48-48-48zm-6 208a10.4 10.4 0 0 1 0 20.8 10.4 10.4 0 1 1 0-20.8zm-192 0a10.4 10.4 0 0 1 0 20.8 10.4 10.4 0 1 1 0-20.8zM240 192a16 16 0 1 1 0 32 16 16 0 1 1 0-32zm-96 0a16 16 0 1 1 0 32 16 16 0 1 1 0-32zM288 384H96a16 16 0 0 1 0-32h192a16 16 0 0 1 0 32z" />
  </svg>
);

const IconIdCard = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 576 512"
    fill="currentColor"
  >
    <path d="M528 160V416c0 8.8-7.2 16-16 16H320c0-44.2-35.8-80-80-80H176c-44.2 0-80 35.8-80 80H64c-8.8 0-16-7.2-16-16V160H528zM64 32C28.7 32 0 60.7 0 96V416c0 35.3 28.7 64 64 64H512c35.3 0 64-28.7 64-64V96c0-35.3-28.7-64-64-64H64zM272 256a64 64 0 1 0 -128 0 64 64 0 1 0 128 0zm104-48c-13.3 0-24 10.7-24 24s10.7 24 24 24h80c13.3 0 24-10.7 24-24s-10.7-24-24-24H376zm0 96c-13.3 0-24 10.7-24 24s10.7 24 24 24h80c13.3 0 24-10.7 24-24s-10.7-24-24-24H376z" />
  </svg>
);

// Safe number conversion helper
const safeNumber = (value) => {
  const num = Number(value);
  return isNaN(num) ? 0 : num;
};

const Invoice = ({ orderInfo, setShowInvoice }) => {
  const invoiceRef = useRef(null);

  const handlePrint = () => {
    if (!invoiceRef.current) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Order Invoice - DELISH RESTAURANT</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            /* Invoice print styles */
            @media print {
              body { 
                margin: 0 !important; 
                padding: 20px !important;
                font-family: Arial, sans-serif !important;
                font-size: 12px !important;
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
              .border-line { 
                border-top: 1px solid #000 !important; 
                margin: 10px 0 !important;
              }
              .success-icon { 
                text-align: center !important; 
                margin: 20px 0 !important;
                font-size: 24px !important;
                color: green !important;
              }
              .invoice-container {
                width: 100%;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
                border: 1px solid #ddd;
              }
              .header {
                text-align: center;
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 2px solid #333;
              }
              .company-name {
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 5px;
              }
              .invoice-title {
                font-size: 18px;
                margin-bottom: 10px;
              }
              .invoice-info {
                margin: 20px 0;
              }
              .items-table {
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
              }
              .items-table th,
              .items-table td {
                padding: 8px;
                text-align: left;
                border-bottom: 1px solid #ddd;
              }
              .items-table th {
                background-color: #f5f5f5;
                font-weight: bold;
              }
              .discount-item {
                color: #059669;
                font-size: 11px;
              }
              .free-item {
                color: #dc2626;
                font-weight: bold;
                font-size: 11px;
              }
              .totals-table {
                width: 100%;
                margin: 20px 0;
              }
              .totals-table td {
                padding: 6px 0;
              }
              .total-row {
                font-weight: bold;
                font-size: 14px;
                border-top: 2px solid #333 !important;
                padding-top: 10px !important;
              }
              .thank-you {
                text-align: center;
                margin-top: 30px;
                font-style: italic;
                padding-top: 20px;
                border-top: 1px solid #ddd;
              }
            }
            
            /* Common styles */
            .invoice-container { 
              width: 100%;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .company-name {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 5px;
              color: #1e40af;
            }
            .invoice-title {
              font-size: 18px;
              margin-bottom: 10px;
              color: #374151;
            }
            .invoice-info {
              margin: 20px 0;
              background: #f9fafb;
              padding: 15px;
              border-radius: 8px;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            .items-table th {
              background: #f3f4f6;
              padding: 12px;
              text-align: left;
              font-weight: 600;
              color: #374151;
              border-bottom: 2px solid #e5e7eb;
            }
            .items-table td {
              padding: 12px;
              border-bottom: 1px solid #e5e7eb;
            }
            .items-table tr:hover {
              background: #f9fafb;
            }
            .discount-item {
              color: #059669;
              font-size: 12px;
              font-weight: 500;
            }
            .free-item {
              color: #dc2626;
              font-weight: bold;
              font-size: 12px;
            }
            .thank-you {
              text-align: center;
              margin-top: 30px;
              font-style: italic;
              color: #6b7280;
              padding: 20px;
              border-top: 1px solid #e5e7eb;
            }
            .status-badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: 600;
              margin-left: 10px;
            }
            .status-completed {
              background: #d1fae5;
              color: #065f46;
            }
            .payment-badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: 600;
            }
            .payment-cash {
              background: #dbeafe;
              color: #1e40af;
            }
            .payment-online {
              background: #dcfce7;
              color: #166534;
            }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            <div class="header">
              <div class="company-name">DELISH RESTAURANT</div>
              <div class="invoice-title">ORDER INVOICE</div>
              <div class="border-line"></div>
            </div>
            
            <div class="invoice-info">
              <table width="100%">
                <tr>
                  <td width="50%" valign="top">
                    <strong>Order Details:</strong><br>
                    Order ID: ${orderInfo._id?.slice(-8) || "N/A"}<br>
                    Date: ${new Date(
                      orderInfo.orderDate || Date.now()
                    ).toLocaleDateString("en-PH")}<br>
                    Time: ${new Date(
                      orderInfo.orderDate || Date.now()
                    ).toLocaleTimeString("en-PH", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    })}<br>
                    Status: <span class="status-badge status-completed">COMPLETED</span>
                  </td>
                  <td width="50%" valign="top">
                    <strong>Customer Details:</strong><br>
                    Cashier: ${orderInfo.cashier || "Admin"}<br>
                    Customer Type: ${
                      orderInfo.customerType === "walk-in"
                        ? "Dine-in"
                        : "Take-out"
                    }<br>
                    Payment: <span class="payment-badge ${
                      orderInfo.paymentMethod === "Cash"
                        ? "payment-cash"
                        : "payment-online"
                    }">${orderInfo.paymentMethod || "Cash"}</span>
                  </td>
                </tr>
              </table>
            </div>
            
            <div class="border-line"></div>
            
            <table class="items-table">
              <thead>
                <tr>
                  <th width="5%">#</th>
                  <th width="45%">ITEM DESCRIPTION</th>
                  <th width="15%" class="text-right">QTY</th>
                  <th width="15%" class="text-right">PRICE</th>
                  <th width="20%" class="text-right">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                ${(orderInfo.items || [])
                  .map(
                    (item, index) => `
                  <tr>
                    <td>${index + 1}</td>
                    <td>
                      ${item.name || "Unknown Item"}
                      ${
                        item.isFree
                          ? '<span class="free-item"> (FREE)</span>'
                          : ""
                      }
                      ${
                        item.isPwdSeniorDiscounted
                          ? '<span class="discount-item"> (PWD/SENIOR -20%)</span>'
                          : ""
                      }
                    </td>
                    <td class="text-right">${item.quantity || 1}</td>
                    <td class="text-right">₱${safeNumber(
                      item.pricePerQuantity || item.originalPrice || 0
                    ).toFixed(2)}</td>
                    <td class="text-right">
                      ${
                        item.isFree
                          ? '<span class="free-item">FREE</span>'
                          : `₱${safeNumber(item.price || 0).toFixed(2)}`
                      }
                    </td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>
            
            <div class="border-line"></div>
            
            <table class="totals-table" width="100%">
              <tr>
                <td width="70%"></td>
                <td width="30%">
                  <table width="100%">
                    <tr>
                      <td>Subtotal:</td>
                      <td class="text-right">₱${safeNumber(
                        orderInfo.bills?.total || 0
                      ).toFixed(2)}</td>
                    </tr>
                    ${
                      safeNumber(orderInfo.bills?.pwdSeniorDiscount || 0) > 0
                        ? `<tr>
                            <td class="discount-item">PWD/Senior Discount:</td>
                            <td class="text-right discount-item">-₱${safeNumber(
                              orderInfo.bills?.pwdSeniorDiscount || 0
                            ).toFixed(2)}</td>
                          </tr>`
                        : ""
                    }
                    ${
                      safeNumber(orderInfo.bills?.redemptionDiscount || 0) > 0
                        ? `<tr>
                            <td class="discount-item">Redemption Discount:</td>
                            <td class="text-right discount-item">-₱${safeNumber(
                              orderInfo.bills?.redemptionDiscount || 0
                            ).toFixed(2)}</td>
                          </tr>`
                        : ""
                    }
                    ${
                      safeNumber(orderInfo.bills?.employeeDiscount || 0) > 0
                        ? `<tr>
                            <td class="discount-item">Employee Discount:</td>
                            <td class="text-right discount-item">-₱${safeNumber(
                              orderInfo.bills?.employeeDiscount || 0
                            ).toFixed(2)}</td>
                          </tr>`
                        : ""
                    }
                    ${
                      safeNumber(orderInfo.bills?.shareholderDiscount || 0) > 0
                        ? `<tr>
                            <td class="discount-item">Shareholder Discount:</td>
                            <td class="text-right discount-item">-₱${safeNumber(
                              orderInfo.bills?.shareholderDiscount || 0
                            ).toFixed(2)}</td>
                          </tr>`
                        : ""
                    }
                    <tr>
                      <td>VAT (12%):</td>
                      <td class="text-right">₱${safeNumber(
                        orderInfo.bills?.tax || 0
                      ).toFixed(2)}</td>
                    </tr>
                    <tr class="total-row">
                      <td>TOTAL AMOUNT:</td>
                      <td class="text-right">₱${safeNumber(
                        orderInfo.bills?.totalWithTax || 0
                      ).toFixed(2)}</td>
                    </tr>
                    ${
                      orderInfo.paymentMethod === "Cash" &&
                      safeNumber(orderInfo.bills?.cashAmount || 0) > 0
                        ? `
                        <tr>
                          <td>Cash Received:</td>
                          <td class="text-right">₱${safeNumber(
                            orderInfo.bills?.cashAmount || 0
                          ).toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td>Change:</td>
                          <td class="text-right">₱${safeNumber(
                            orderInfo.bills?.change || 0
                          ).toFixed(2)}</td>
                        </tr>
                        `
                        : ""
                    }
                  </table>
                </td>
              </tr>
            </table>
            
            ${
              orderInfo.pwdSeniorDetails
                ? `
            <div class="border-line"></div>
            <div style="margin: 20px 0; padding: 15px; background: #f0f9ff; border-radius: 8px; border-left: 4px solid #0ea5e9;">
              <strong>PWD/Senior Citizen Details:</strong><br>
              <table width="100%" style="margin-top: 10px;">
                <tr>
                  <td width="30%"><strong>Type:</strong></td>
                  <td>${orderInfo.pwdSeniorDetails.type || "PWD"}</td>
                </tr>
                <tr>
                  <td><strong>Name:</strong></td>
                  <td>${orderInfo.pwdSeniorDetails.name}</td>
                </tr>
                <tr>
                  <td><strong>ID Number:</strong></td>
                  <td>${orderInfo.pwdSeniorDetails.idNumber || "N/A"}</td>
                </tr>
              </table>
            </div>
            `
                : ""
            }
            
            <div class="thank-you">
              <div style="font-size: 14px; font-weight: bold; margin-bottom: 10px;">
                Thank you for dining with us!
              </div>
              <div style="font-size: 12px;">
                Please keep this invoice for your records.<br>
                For any inquiries, please contact our customer service.
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) {
      alert("Please allow popups to print the invoice");
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

  const formatCurrency = (amount) => {
    return `₱${safeNumber(amount).toFixed(2)}`;
  };

  const getPaymentBadgeClass = (method) => {
    switch (method) {
      case "Cash":
        return "bg-blue-100 text-blue-800";
      case "BDO":
      case "GCASH":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (!orderInfo) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-3">
        <div className="bg-white p-6 rounded-lg shadow-lg text-center max-w-sm">
          <p className="text-red-500 font-semibold">Invalid invoice data.</p>
          <button
            onClick={() => setShowInvoice(false)}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
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
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        ref={invoiceRef}
      >
        {/* Header */}
        <div className="text-center p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <IconCheck className="text-white text-2xl" />
          </motion.div>
          <h2 className="text-2xl font-bold text-gray-800">Order Invoice</h2>
          <p className="text-gray-600 mt-1">
            Transaction completed successfully
          </p>

          <div className="flex justify-center items-center gap-4 mt-4">
            <div
              className={`px-3 py-1 rounded-full text-sm font-semibold ${getPaymentBadgeClass(
                orderInfo.paymentMethod
              )}`}
            >
              {orderInfo.paymentMethod || "Cash"}
            </div>
            <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
              {orderInfo.customerType === "walk-in" ? "Dine-in" : "Take-out"}
            </div>
            <div className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-semibold">
              COMPLETED
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Order Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg border">
              <h3 className="font-semibold text-gray-700 text-sm mb-3 flex items-center gap-2">
                <IconReceipt className="w-4 h-4" />
                Order Information
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Order ID:</span>
                  <span className="font-medium text-gray-900">
                    {orderInfo._id?.slice(-8) || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-medium">
                    {new Date(
                      orderInfo.orderDate || Date.now()
                    ).toLocaleDateString("en-PH")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Time:</span>
                  <span className="font-medium">
                    {new Date(
                      orderInfo.orderDate || Date.now()
                    ).toLocaleTimeString("en-PH", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    })}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border">
              <h3 className="font-semibold text-gray-700 text-sm mb-3">
                Customer Information
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Cashier:</span>
                  <span className="font-medium text-green-600">
                    {orderInfo.cashier || "Admin"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Customer Type:</span>
                  <span className="font-medium text-blue-600">
                    {orderInfo.customerType === "walk-in"
                      ? "Dine-in"
                      : "Take-out"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Status:</span>
                  <span className="font-medium text-green-600">Paid</span>
                </div>
              </div>
            </div>
          </div>

          {/* PWD/Senior Details */}
          {orderInfo.pwdSeniorDetails && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-6">
              <h3 className="font-semibold text-blue-700 text-sm mb-3 flex items-center gap-2">
                <IconIdCard className="w-4 h-4" />
                PWD/Senior Citizen Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 block mb-1">Type</span>
                  <span className="font-medium text-blue-700">
                    {orderInfo.pwdSeniorDetails.type || "PWD"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 block mb-1">Name</span>
                  <span className="font-medium">
                    {orderInfo.pwdSeniorDetails.name}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 block mb-1">ID Number</span>
                  <span className="font-medium">
                    {orderInfo.pwdSeniorDetails.idNumber || "N/A"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Items Ordered */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-700 text-sm mb-3">
              Items Ordered ({(orderInfo.items || []).length})
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Qty
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(orderInfo.items || []).map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">
                          {item.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {item.isFree ? (
                            <span className="text-red-600 font-semibold">
                              FREE
                            </span>
                          ) : item.isPwdSeniorDiscounted ? (
                            <span className="text-green-600">
                              PWD/SENIOR -20%
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-900">
                        {item.quantity || 1}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-900">
                        {formatCurrency(
                          item.pricePerQuantity || item.originalPrice || 0
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`text-sm font-semibold ${
                            item.isFree ? "text-red-600" : "text-gray-900"
                          }`}
                        >
                          {item.isFree
                            ? "FREE"
                            : formatCurrency(item.price || 0)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bill Summary */}
          <div className="bg-gray-50 p-4 rounded-lg border">
            <h3 className="font-semibold text-gray-700 text-sm mb-4">
              Bill Summary
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">
                  {formatCurrency(orderInfo.bills?.total || 0)}
                </span>
              </div>

              {safeNumber(orderInfo.bills?.pwdSeniorDiscount || 0) > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>PWD/Senior Discount:</span>
                  <span className="font-medium">
                    -{formatCurrency(orderInfo.bills?.pwdSeniorDiscount || 0)}
                  </span>
                </div>
              )}

              {safeNumber(orderInfo.bills?.redemptionDiscount || 0) > 0 && (
                <div className="flex justify-between text-blue-600">
                  <span>Redemption Discount:</span>
                  <span className="font-medium">
                    -{formatCurrency(orderInfo.bills?.redemptionDiscount || 0)}
                  </span>
                </div>
              )}

              {safeNumber(orderInfo.bills?.employeeDiscount || 0) > 0 && (
                <div className="flex justify-between text-yellow-600">
                  <span>Employee Discount:</span>
                  <span className="font-medium">
                    -{formatCurrency(orderInfo.bills?.employeeDiscount || 0)}
                  </span>
                </div>
              )}

              {safeNumber(orderInfo.bills?.shareholderDiscount || 0) > 0 && (
                <div className="flex justify-between text-purple-600">
                  <span>Shareholder Discount:</span>
                  <span className="font-medium">
                    -{formatCurrency(orderInfo.bills?.shareholderDiscount || 0)}
                  </span>
                </div>
              )}

              <div className="flex justify-between border-t pt-2">
                <span className="text-gray-600">VAT (12%):</span>
                <span className="font-medium">
                  {formatCurrency(orderInfo.bills?.tax || 0)}
                </span>
              </div>

              <div className="flex justify-between border-t pt-3 mt-2">
                <span className="text-lg font-bold text-gray-900">
                  TOTAL AMOUNT:
                </span>
                <span className="text-lg font-bold text-green-600">
                  {formatCurrency(orderInfo.bills?.totalWithTax || 0)}
                </span>
              </div>

              {orderInfo.paymentMethod === "Cash" &&
                safeNumber(orderInfo.bills?.cashAmount || 0) > 0 && (
                  <>
                    <div className="flex justify-between border-t pt-3 mt-2">
                      <span className="text-gray-600">Cash Received:</span>
                      <span className="font-medium text-gray-900">
                        {formatCurrency(orderInfo.bills?.cashAmount || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Change:</span>
                      <span className="font-medium text-green-600">
                        {formatCurrency(orderInfo.bills?.change || 0)}
                      </span>
                    </div>
                  </>
                )}
            </div>
          </div>

          {/* Thank You Message */}
          <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm italic">
              Thank you for dining with us! Please keep this invoice for your
              records.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-6 border-t bg-gray-50">
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handlePrint}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              <IconPrint className="w-5 h-5" />
              Print Invoice
            </button>
            <button
              onClick={() => setShowInvoice(false)}
              className="flex-1 flex items-center justify-center gap-2 bg-gray-600 text-white px-4 py-3 rounded-lg hover:bg-gray-700 transition-colors font-semibold"
            >
              <IconTimes className="w-5 h-5" />
              Close Invoice
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Invoice;
