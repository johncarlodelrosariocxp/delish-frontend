import React, { useEffect, useRef } from "react";

const Invoice = ({ orderInfo, setShowInvoice }) => {
  const invoiceRef = useRef(null);
  const printButtonRef = useRef(null);

  useEffect(() => {
    if (orderInfo) {
      // Print invoice automatically
      setTimeout(() => {
        if (printButtonRef.current) {
          printButtonRef.current.click();
        }
      }, 500);
    }
  }, [orderInfo]);

  const handlePrint = () => {
    const printContent = invoiceRef.current;
    const printWindow = window.open("", "_blank");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice - ${orderInfo.orderNumber}</title>
          <style>
            @media print {
              @page {
                margin: 0;
                size: 80mm auto;
              }
              body {
                margin: 0;
                padding: 10px;
                font-family: Arial, sans-serif;
                font-size: 12px;
                width: 80mm;
              }
              .no-print { display: none !important; }
              .invoice-container {
                width: 100%;
                max-width: 80mm;
                margin: 0 auto;
                padding: 10px;
              }
              * {
                box-sizing: border-box;
              }
            }
            body {
              margin: 0;
              padding: 10px;
              font-family: Arial, sans-serif;
              font-size: 12px;
              width: 80mm;
            }
            .invoice-container {
              width: 100%;
              max-width: 80mm;
              margin: 0 auto;
              padding: 10px;
              border: 1px solid #ccc;
            }
            .header {
              text-align: center;
              margin-bottom: 15px;
              border-bottom: 2px dashed #000;
              padding-bottom: 10px;
            }
            .header h1 {
              margin: 0;
              font-size: 20px;
              font-weight: bold;
            }
            .header p {
              margin: 2px 0;
              font-size: 11px;
            }
            .order-info {
              margin-bottom: 15px;
              padding-bottom: 10px;
              border-bottom: 1px dashed #ccc;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 3px;
            }
            .info-label {
              font-weight: bold;
              min-width: 100px;
            }
            .items-table {
              width: 100%;
              margin: 15px 0;
              border-collapse: collapse;
            }
            .items-table th {
              text-align: left;
              padding: 5px 0;
              border-bottom: 1px solid #000;
              font-weight: bold;
            }
            .items-table td {
              padding: 4px 0;
              border-bottom: 1px dashed #ccc;
              vertical-align: top;
            }
            .item-name {
              max-width: 120px;
              word-wrap: break-word;
            }
            .item-price {
              text-align: right;
              white-space: nowrap;
            }
            .item-quantity {
              text-align: center;
            }
            .free-item {
              color: #10B981;
              font-weight: bold;
            }
            .discounted-item {
              color: #059669;
            }
            .totals-section {
              margin-top: 15px;
              padding-top: 10px;
              border-top: 2px dashed #000;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 5px;
            }
            .total-label {
              font-weight: bold;
            }
            .total-value {
              font-weight: bold;
            }
            .discount-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 3px;
              color: #DC2626;
            }
            .payment-details {
              margin-top: 15px;
              padding: 10px;
              background-color: #F3F4F6;
              border-radius: 5px;
            }
            .payment-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 3px;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              padding-top: 10px;
              border-top: 1px dashed #ccc;
              font-size: 10px;
              color: #6B7280;
            }
            .mixed-payment {
              background-color: #E0F2FE;
              padding: 8px;
              border-radius: 4px;
              margin: 10px 0;
              border-left: 4px solid #0284C7;
            }
            .payment-breakdown {
              background-color: #F0F9FF;
              padding: 8px;
              border-radius: 4px;
              margin: 5px 0;
              font-size: 11px;
            }
          </style>
        </head>
        <body>
          ${invoiceRef.current.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!orderInfo) return null;

  const {
    orderNumber,
    customerDetails,
    items,
    bills,
    paymentMethod,
    paymentDetails,
    orderDate,
    cashier,
    pwdSeniorDetails,
    customerType,
    customerStatus,
  } = orderInfo;

  // Calculate if it's mixed payment
  const isMixedPayment =
    paymentDetails?.isMixedPayment ||
    (bills?.cashAmount > 0 && bills?.onlineAmount > 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gray-800 text-white p-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold">Order Invoice</h2>
            <button
              onClick={() => setShowInvoice(false)}
              className="text-white hover:text-gray-300 text-lg"
            >
              ✕
            </button>
          </div>
          <p className="text-sm mt-1">Invoice #{orderNumber}</p>
        </div>

        {/* Invoice Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div ref={invoiceRef} className="invoice-container">
            {/* Header */}
            <div className="header">
              <h1>DELISH RESTAURANT</h1>
              <p>123 Main Street, Manila, Philippines</p>
              <p>Phone: (02) 1234-5678 | Email: info@delish.com</p>
              <p>VAT Reg TIN: 123-456-789-000</p>
            </div>

            {/* Order Information */}
            <div className="order-info">
              <div className="info-row">
                <span className="info-label">Order #:</span>
                <span>{orderNumber}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Date:</span>
                <span>{formatDate(orderDate)}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Customer:</span>
                <span>{customerDetails?.name || "Walk-in Customer"}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Type:</span>
                <span>
                  {customerType === "walk-in" ? "Dine-in" : "Take-out"}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Cashier:</span>
                <span>{cashier}</span>
              </div>
            </div>

            {/* Items Table */}
            <table className="items-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th className="item-quantity">Qty</th>
                  <th className="item-price">Price</th>
                </tr>
              </thead>
              <tbody>
                {items?.map((item, index) => (
                  <tr key={index}>
                    <td className="item-name">
                      {item.name}
                      {item.isFree && (
                        <div className="free-item">FREE ITEM</div>
                      )}
                      {item.isPwdSeniorDiscounted && !item.isFree && (
                        <div className="discounted-item">PWD/SENIOR -20%</div>
                      )}
                    </td>
                    <td className="item-quantity">{item.quantity}</td>
                    <td className="item-price">
                      {item.isFree ? (
                        <span className="free-item">FREE</span>
                      ) : (
                        `₱${item.price.toFixed(2)}`
                      )}
                      {!item.isFree &&
                        item.price < item.originalPrice * item.quantity && (
                          <div style={{ fontSize: "10px", color: "#DC2626" }}>
                            <s>
                              ₱{(item.originalPrice * item.quantity).toFixed(2)}
                            </s>
                          </div>
                        )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* PWD/Senior Details */}
            {pwdSeniorDetails && (
              <div className="mixed-payment">
                <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
                  PWD/SENIOR DISCOUNT
                </div>
                <div style={{ fontSize: "11px" }}>
                  <div>Name: {pwdSeniorDetails.name}</div>
                  <div>ID #: {pwdSeniorDetails.idNumber}</div>
                  <div>Type: {pwdSeniorDetails.type}</div>
                </div>
              </div>
            )}

            {/* Payment Breakdown for Mixed Payment */}
            {isMixedPayment && (
              <div className="payment-breakdown">
                <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
                  PAYMENT BREAKDOWN
                </div>
                <div className="payment-row">
                  <span>Cash Payment:</span>
                  <span>₱{bills?.cashAmount?.toFixed(2) || "0.00"}</span>
                </div>
                <div className="payment-row">
                  <span>Online Payment ({bills?.onlineMethod}):</span>
                  <span>₱{bills?.onlineAmount?.toFixed(2) || "0.00"}</span>
                </div>
                <div
                  className="payment-row"
                  style={{
                    fontWeight: "bold",
                    borderTop: "1px dashed #ccc",
                    paddingTop: "4px",
                  }}
                >
                  <span>Total Paid:</span>
                  <span>
                    ₱
                    {(
                      (bills?.cashAmount || 0) + (bills?.onlineAmount || 0)
                    ).toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* Totals Section */}
            <div className="totals-section">
              <div className="total-row">
                <span className="total-label">Subtotal:</span>
                <span className="total-value">
                  ₱{bills?.total?.toFixed(2) || "0.00"}
                </span>
              </div>

              {/* Discounts */}
              {bills?.pwdSeniorDiscount > 0 && (
                <div className="discount-row">
                  <span>PWD/Senior Discount:</span>
                  <span>-₱{bills?.pwdSeniorDiscount.toFixed(2)}</span>
                </div>
              )}

              {bills?.redemptionDiscount > 0 && (
                <div className="discount-row">
                  <span>Redemption Discount:</span>
                  <span>-₱{bills?.redemptionDiscount.toFixed(2)}</span>
                </div>
              )}

              {bills?.employeeDiscount > 0 && (
                <div className="discount-row">
                  <span>Employee Discount:</span>
                  <span>-₱{bills?.employeeDiscount.toFixed(2)}</span>
                </div>
              )}

              {bills?.shareholderDiscount > 0 && (
                <div className="discount-row">
                  <span>Shareholder Discount:</span>
                  <span>-₱{bills?.shareholderDiscount.toFixed(2)}</span>
                </div>
              )}

              <div className="total-row">
                <span className="total-label">Net of VAT:</span>
                <span>₱{bills?.netSales?.toFixed(2) || "0.00"}</span>
              </div>

              <div className="total-row">
                <span className="total-label">VAT (12%):</span>
                <span>₱{bills?.tax?.toFixed(2) || "0.00"}</span>
              </div>

              <div
                className="total-row"
                style={{
                  marginTop: "10px",
                  paddingTop: "10px",
                  borderTop: "2px solid #000",
                }}
              >
                <span className="total-label" style={{ fontSize: "14px" }}>
                  TOTAL:
                </span>
                <span className="total-value" style={{ fontSize: "14px" }}>
                  ₱{bills?.totalWithTax?.toFixed(2) || "0.00"}
                </span>
              </div>

              {/* Payment Details */}
              <div className="payment-details">
                <div className="payment-row">
                  <span>Payment Method:</span>
                  <span style={{ fontWeight: "bold" }}>{paymentMethod}</span>
                </div>

                {bills?.cashAmount > 0 && (
                  <div className="payment-row">
                    <span>Cash Amount:</span>
                    <span>₱{bills?.cashAmount.toFixed(2)}</span>
                  </div>
                )}

                {bills?.onlineAmount > 0 && bills?.onlineMethod && (
                  <div className="payment-row">
                    <span>Online ({bills.onlineMethod}):</span>
                    <span>₱{bills?.onlineAmount.toFixed(2)}</span>
                  </div>
                )}

                {bills?.change > 0 && (
                  <div className="payment-row">
                    <span>Change:</span>
                    <span style={{ color: "#059669", fontWeight: "bold" }}>
                      ₱{bills?.change.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="footer">
              <p>Thank you for dining with us!</p>
              <p>Please keep this receipt for your records.</p>
              <p>For any concerns, contact us within 7 days.</p>
              <p style={{ marginTop: "10px", fontSize: "9px" }}>
                *** This is a computer-generated receipt ***
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 mt-6 no-print">
            <button
              ref={printButtonRef}
              onClick={handlePrint}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              📄 Print Invoice
            </button>

            <button
              onClick={() => setShowInvoice(false)}
              className="w-full px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold text-sm hover:bg-gray-300 transition-colors"
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
