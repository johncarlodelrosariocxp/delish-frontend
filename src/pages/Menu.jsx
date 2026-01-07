import React, { useEffect, useState, useRef, useCallback } from "react";
import BottomNav from "../components/shared/BottomNav";
import {
  MdRestaurantMenu,
  MdAdd,
  MdClose,
  MdCheckCircle,
  MdPrint,
  MdDoneAll,
  MdReceipt,
} from "react-icons/md";
import MenuContainer from "../components/menu/MenuContainer";
import CustomerInfo from "../components/menu/CustomerInfo";
import CartInfo from "../components/menu/CartInfo";
import Bill from "../components/menu/Bill";
import Invoice from "../components/invoice/Invoice";
import { useSelector, useDispatch } from "react-redux";
import {
  createNewOrder,
  switchOrder,
  closeOrder,
  hideInvoice,
  clearRecentCompletedOrder,
  completeOrder,
} from "../redux/slices/orderSlice";

const Menu = () => {
  useEffect(() => {
    document.title = "POS | Menu";
  }, []);

  const dispatch = useDispatch();
  const {
    orders,
    activeOrderId,
    completedOrders,
    recentCompletedOrder,
    showInvoice,
  } = useSelector((state) => state.order);

  // State
  const [activeTab, setActiveTab] = useState("active");
  const [printingOrderId, setPrintingOrderId] = useState(null);
  const [showCompletionLoading, setShowCompletionLoading] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  // Refs
  const autoCompleteTimeoutRef = useRef(null);
  const isProcessingRef = useRef(false);

  // Memoized derived values
  const activeOrders = React.useMemo(
    () => orders.filter((order) => order.status === "active"),
    [orders]
  );

  const currentActiveOrder = React.useMemo(
    () => activeOrders.find((order) => order.id === activeOrderId),
    [activeOrders, activeOrderId]
  );

  // Format functions
  const formatCurrency = useCallback((amount) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  }, []);

  const formatDate = useCallback((date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }, []);

  // Initialize orders
  useEffect(() => {
    if (activeOrders.length === 0) {
      dispatch(createNewOrder());
    }
  }, [dispatch, activeOrders.length]);

  // Handle invoice modal display
  useEffect(() => {
    if (recentCompletedOrder && showInvoice) {
      setShowInvoiceModal(true);
    } else {
      setShowInvoiceModal(false);
    }
  }, [recentCompletedOrder, showInvoice]);

  // Handle complete order
  const handleCompleteOrder = useCallback(
    (isManual = false) => {
      if (!currentActiveOrder || isProcessingRef.current) return;

      // Validation
      if (!currentActiveOrder.items?.length) {
        alert("Please add items to the order before completing.");
        return;
      }

      if (!currentActiveOrder.paymentMethod) {
        alert("Please select a payment method before completing the order.");
        return;
      }

      // Clear auto-complete timeout
      if (autoCompleteTimeoutRef.current) {
        clearTimeout(autoCompleteTimeoutRef.current);
        autoCompleteTimeoutRef.current = null;
      }

      // Set processing state
      isProcessingRef.current = true;
      setShowCompletionLoading(true);

      // Dispatch completion
      dispatch(
        completeOrder({
          orderId: currentActiveOrder.id,
          paymentMethod: currentActiveOrder.paymentMethod,
        })
      );

      // Reset states after delay
      setTimeout(() => {
        setShowCompletionLoading(false);
        isProcessingRef.current = false;

        // Create new order after completion
        setTimeout(() => {
          dispatch(createNewOrder());
        }, 300);
      }, 1500);
    },
    [currentActiveOrder, dispatch]
  );

  // Handle auto-completion
  useEffect(() => {
    if (!currentActiveOrder || isProcessingRef.current) return;

    const hasItems = currentActiveOrder.items?.length > 0;
    const hasPaymentMethod = Boolean(currentActiveOrder.paymentMethod);
    const isActive = currentActiveOrder.status === "active";
    const isCompleted = Boolean(currentActiveOrder.isCompleted);

    const isReadyForCompletion =
      hasItems && hasPaymentMethod && isActive && !isCompleted;

    if (isReadyForCompletion && !autoCompleteTimeoutRef.current) {
      autoCompleteTimeoutRef.current = setTimeout(() => {
        if (!isProcessingRef.current) {
          handleCompleteOrder(false);
        }
      }, 2000);
    } else if (!isReadyForCompletion && autoCompleteTimeoutRef.current) {
      clearTimeout(autoCompleteTimeoutRef.current);
      autoCompleteTimeoutRef.current = null;
    }

    return () => {
      if (autoCompleteTimeoutRef.current) {
        clearTimeout(autoCompleteTimeoutRef.current);
      }
    };
  }, [currentActiveOrder, handleCompleteOrder]);

  // Handle invoice close
  const handleCloseInvoice = useCallback(() => {
    setShowInvoiceModal(false);
    dispatch(hideInvoice());
    dispatch(clearRecentCompletedOrder());

    // Create new order after closing invoice if none exist
    setTimeout(() => {
      if (activeOrders.length === 0) {
        dispatch(createNewOrder());
      }
    }, 300);
  }, [dispatch, activeOrders.length]);

  // Handle adding new order
  const handleAddNewOrder = useCallback(() => {
    dispatch(createNewOrder());
    setActiveTab("active");
  }, [dispatch]);

  // Handle switching to a specific order
  const handleSwitchOrder = useCallback(
    (orderId) => {
      const order = orders.find((order) => order.id === orderId);
      if (order && order.status === "active") {
        dispatch(switchOrder(orderId));
        setActiveTab("active");
      }
    },
    [dispatch, orders]
  );

  // Handle closing an order
  const handleCloseOrder = useCallback(
    (orderId, event) => {
      event?.stopPropagation();

      if (activeOrders.length <= 1) {
        dispatch(closeOrder(orderId));
        setTimeout(() => {
          dispatch(createNewOrder());
        }, 200);
        return;
      }

      dispatch(closeOrder(orderId));

      if (orderId === activeOrderId) {
        const remainingOrders = activeOrders.filter(
          (order) => order.id !== orderId
        );
        if (remainingOrders.length > 0) {
          setTimeout(() => {
            dispatch(switchOrder(remainingOrders[0].id));
          }, 100);
        }
      }
    },
    [dispatch, activeOrders, activeOrderId]
  );

  // Print receipt
  const handlePrintOrder = useCallback(async (order, event) => {
    event?.stopPropagation();
    setPrintingOrderId(order.id);

    try {
      const receiptText = generateReceiptText(order);

      // Create print window
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        throw new Error("Popup blocked. Please allow popups for printing.");
      }

      printWindow.document.write(`
        <html>
          <head>
            <title>Receipt - Order ${order.number}</title>
            <style>
              body { font-family: 'Courier New', monospace; font-size: 12px; padding: 20px; }
              .receipt { white-space: pre; }
              @media print {
                body { margin: 0; padding: 0; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            <div class="receipt">${receiptText.replace(/\n/g, "<br>")}</div>
            <div class="no-print" style="margin-top: 20px;">
              <button onclick="window.print()">Print</button>
              <button onclick="window.close()">Close</button>
            </div>
            <script>
              window.onload = function() {
                window.print();
                setTimeout(() => window.close(), 1000);
              };
            </script>
          </body>
        </html>
      `);

      printWindow.document.close();
    } catch (error) {
      console.error("Printing error:", error);
      alert(error.message || "Failed to print receipt");
    } finally {
      setTimeout(() => setPrintingOrderId(null), 1000);
    }
  }, []);

  // Generate receipt text
  const generateReceiptText = useCallback(
    (order) => {
      const lineBreak = "\n";
      const dashedLine = "-".repeat(40);
      const doubleLine = "=".repeat(40);

      let receipt = "";

      // Header
      receipt += doubleLine + lineBreak;
      receipt += "         DELISH RESTAURANT" + lineBreak;
      receipt += doubleLine + lineBreak;
      receipt += `Order: #${order.number || order.id?.slice(-8)}` + lineBreak;
      receipt +=
        `Date: ${formatDate(order.completedAt || Date.now())}` + lineBreak;
      receipt +=
        `Customer: ${order.customer?.customerName || "Walk-in"}` + lineBreak;
      receipt += dashedLine + lineBreak;

      // Items
      receipt += "             ORDER ITEMS" + lineBreak;
      receipt += dashedLine + lineBreak;

      order.items?.forEach((item) => {
        const itemName =
          item.name.length > 24
            ? item.name.substring(0, 21) + "..."
            : item.name;
        const quantity = item.quantity || 1;
        const pricePerQuantity = item.pricePerQuantity || item.price || 0;
        const total = quantity * pricePerQuantity;

        receipt += `${itemName}` + lineBreak;
        receipt +=
          `  ${quantity}x ${formatCurrency(pricePerQuantity)}` + lineBreak;
        receipt +=
          `  ${formatCurrency(total)}${item.isRedeemed ? " (REDEEMED)" : ""}` +
          lineBreak;
        if (item.isPwdSssDiscounted) {
          receipt += `  PWD/SSS 20% Discount Applied` + lineBreak;
        }
        receipt += lineBreak;
      });

      receipt += dashedLine + lineBreak;

      // Calculate totals
      const subtotal =
        order.items?.reduce((sum, item) => {
          return (
            sum +
            (item.quantity || 1) * (item.pricePerQuantity || item.price || 0)
          );
        }, 0) || 0;

      const vat = order.bills?.tax || subtotal * 0.12;
      const total = order.bills?.total || subtotal + vat;

      // Totals
      receipt +=
        "SUBTOTAL:".padEnd(15) +
        `${formatCurrency(subtotal)}`.padStart(25) +
        lineBreak;

      if (order.bills?.pwdSssDiscount > 0) {
        receipt +=
          "PWD/SSS DISC:".padEnd(15) +
          `-${formatCurrency(order.bills.pwdSssDiscount)}`.padStart(25) +
          lineBreak;
      }

      if (order.bills?.redemptionDiscount > 0) {
        receipt +=
          "REDEMPTION:".padEnd(15) +
          `-${formatCurrency(order.bills.redemptionDiscount)}`.padStart(25) +
          lineBreak;
      }

      if (order.bills?.employeeDiscount > 0) {
        receipt +=
          "EMP DISCOUNT:".padEnd(15) +
          `-${formatCurrency(order.bills.employeeDiscount)}`.padStart(25) +
          lineBreak;
      }

      if (order.bills?.shareholderDiscount > 0) {
        receipt +=
          "SH DISCOUNT:".padEnd(15) +
          `-${formatCurrency(order.bills.shareholderDiscount)}`.padStart(25) +
          lineBreak;
      }

      receipt +=
        "VAT (12%):".padEnd(15) +
        `${formatCurrency(vat)}`.padStart(25) +
        lineBreak;
      receipt += doubleLine + lineBreak;
      receipt +=
        "TOTAL:".padEnd(15) +
        `${formatCurrency(total)}`.padStart(25) +
        lineBreak;
      receipt += doubleLine + lineBreak;

      receipt += `Payment: ${order.paymentMethod || "Cash"}` + lineBreak;
      receipt += "Status: COMPLETED" + lineBreak;
      receipt += lineBreak;
      receipt += "Thank you for dining with us!" + lineBreak;
      receipt += "Visit us again soon!" + lineBreak;
      receipt += lineBreak.repeat(3);

      return receipt;
    },
    [formatCurrency, formatDate]
  );

  // Loading state during order completion
  if (showCompletionLoading && currentActiveOrder) {
    return (
      <section className="bg-white min-h-screen flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">
              Completing Order {currentActiveOrder.number}...
            </p>
            <p className="text-gray-400 text-sm mt-2">
              Please wait while we process your order
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white min-h-screen flex flex-col">
      {/* Invoice Modal */}
      {showInvoiceModal && recentCompletedOrder && (
        <div className="fixed inset-0 z-[9999] bg-black bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="relative">
              <div className="flex justify-between items-center p-4 border-b bg-gray-50">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">
                    Order #{recentCompletedOrder.number} Invoice
                  </h3>
                  <p className="text-sm text-gray-600">
                    Customer:{" "}
                    {recentCompletedOrder.customer?.customerName || "Walk-in"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePrintOrder(recentCompletedOrder)}
                    disabled={printingOrderId === recentCompletedOrder.id}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                  >
                    {printingOrderId === recentCompletedOrder.id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Printing...</span>
                      </>
                    ) : (
                      <>
                        <MdPrint size={20} />
                        <span>Print Receipt</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleCloseInvoice}
                    className="w-10 h-10 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                  >
                    <MdClose size={20} />
                  </button>
                </div>
              </div>
              <div className="max-h-[calc(90vh-80px)] overflow-y-auto">
                <Invoice
                  key={recentCompletedOrder.id}
                  orderInfo={recentCompletedOrder}
                  setShowInvoice={handleCloseInvoice}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Tabs - Only 2 Tabs */}
      <div className="bg-gray-200 px-3 pt-3 flex items-center gap-2 border-b">
        <button
          onClick={() => setActiveTab("active")}
          className={`px-4 py-2 rounded-t-lg font-medium text-sm ${
            activeTab === "active"
              ? "bg-white text-blue-600 border-t border-l border-r border-gray-300"
              : "bg-gray-300 text-gray-600 hover:bg-gray-250"
          }`}
        >
          <div className="flex items-center gap-2">
            <MdRestaurantMenu size={18} />
            <span>Active Orders ({activeOrders.length})</span>
          </div>
        </button>

        <button
          onClick={() => setActiveTab("completed")}
          className={`px-4 py-2 rounded-t-lg font-medium text-sm ${
            activeTab === "completed"
              ? "bg-white text-green-600 border-t border-l border-r border-gray-300"
              : "bg-gray-300 text-gray-600 hover:bg-gray-250"
          }`}
        >
          <div className="flex items-center gap-2">
            <MdCheckCircle size={18} />
            <span>Completed ({completedOrders.length})</span>
          </div>
        </button>
      </div>

      {/* Active Orders Tab Content */}
      {activeTab === "active" && (
        <>
          {/* Order Tabs */}
          <div className="bg-gray-200 px-3 pb-1 flex items-center gap-2 overflow-x-auto">
            {activeOrders.map((order) => (
              <div
                key={order.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-t-lg cursor-pointer min-w-0 ${
                  order.id === activeOrderId
                    ? "bg-white border-t border-l border-r border-gray-300"
                    : "bg-gray-300 hover:bg-gray-250"
                }`}
                onClick={() => handleSwitchOrder(order.id)}
              >
                <span className="text-sm font-medium whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <MdReceipt size={14} />
                    <span>Order {order.number}</span>
                  </div>
                </span>
                {order.items?.length > 0 && (
                  <span className="bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {order.items.reduce(
                      (total, item) => total + (item.quantity || 1),
                      0
                    )}
                  </span>
                )}
                {activeOrders.length > 1 && (
                  <button
                    onClick={(e) => handleCloseOrder(order.id, e)}
                    className="text-gray-500 hover:text-red-500"
                    title="Close Order"
                  >
                    <MdClose size={16} />
                  </button>
                )}
              </div>
            ))}

            <button
              onClick={handleAddNewOrder}
              className="flex items-center gap-1 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              <MdAdd size={18} />
              <span className="text-sm whitespace-nowrap">New Order</span>
            </button>
          </div>

          {/* Main POS Interface */}
          <div className="flex-1 flex flex-col lg:flex-row gap-3 p-3 pb-20 lg:pb-3">
            {activeOrders.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <p className="text-gray-600 font-medium">
                    Creating New Order...
                  </p>
                  <button
                    onClick={handleAddNewOrder}
                    className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center gap-2 mx-auto"
                  >
                    <MdAdd size={18} />
                    Create Order Now
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Menu Section */}
                <div className="flex-1 lg:flex-[3] flex flex-col min-h-0">
                  <div className="flex-1 min-h-0 overflow-hidden">
                    <MenuContainer orderId={activeOrderId} />
                  </div>
                </div>

                {/* Sidebar */}
                <div className="flex-1 lg:flex-[1] bg-gray-100 rounded-lg shadow-md h-auto lg:h-[calc(100vh-11rem)] flex flex-col">
                  {/* Customer Info */}
                  <div className="flex-shrink-0">
                    <CustomerInfo orderId={activeOrderId} />
                  </div>

                  <hr className="border-gray-300 border-t-2" />

                  {/* Cart Info */}
                  <div className="flex-1 min-h-0 overflow-hidden">
                    <CartInfo orderId={activeOrderId} />
                  </div>

                  <hr className="border-gray-300 border-t-2" />

                  {/* Bills */}
                  <div className="flex-shrink-0">
                    <Bill
                      orderId={activeOrderId}
                      onOrderComplete={() => handleCompleteOrder(true)}
                    />
                  </div>

                  {/* Complete Order Button */}
                  {currentActiveOrder?.items?.length > 0 &&
                    currentActiveOrder?.paymentMethod &&
                    currentActiveOrder?.status === "active" &&
                    !currentActiveOrder?.isCompleted &&
                    !showInvoiceModal && (
                      <div className="p-3 border-t border-gray-300 bg-gradient-to-r from-green-50 to-emerald-50">
                        <div className="mb-2 text-center">
                          <p className="text-sm text-gray-600 font-medium">
                            Order #{currentActiveOrder?.number} Ready
                          </p>
                          <p className="text-xs text-gray-500">
                            Will auto-complete in 2 seconds...
                          </p>
                        </div>
                        <button
                          onClick={() => handleCompleteOrder(true)}
                          disabled={showCompletionLoading}
                          className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2"
                        >
                          {showCompletionLoading ? (
                            <>
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                              <span>Processing...</span>
                            </>
                          ) : (
                            <>
                              <MdDoneAll size={20} />
                              <span>Complete Order Now</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* Completed Orders Tab Content */}
      {activeTab === "completed" && (
        <div className="flex-1 bg-white rounded-lg p-4 md:p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Order History</h2>
            <p className="text-gray-600 text-sm">
              View all completed orders and print receipts
            </p>
          </div>

          {completedOrders.length === 0 ? (
            <div className="text-center py-12">
              <MdCheckCircle className="text-gray-300 text-6xl mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No completed orders yet</p>
              <button
                onClick={() => setActiveTab("active")}
                className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center gap-2 mx-auto"
              >
                <MdRestaurantMenu size={18} />
                Go to Active Orders
              </button>
            </div>
          ) : (
            <div className="space-y-4 max-h-[calc(100vh-12rem)] overflow-y-auto pr-2">
              {completedOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 hover:from-green-100 hover:to-emerald-100"
                >
                  <div className="flex flex-col md:flex-row justify-between items-start mb-3 gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <MdReceipt className="text-green-600" size={20} />
                        <h3 className="font-bold text-green-900 text-lg">
                          Order #{order.number}
                        </h3>
                        {order.bills?.total && (
                          <span className="bg-green-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                            {formatCurrency(order.bills.total)}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 text-sm">
                        <p className="text-green-800 font-medium">
                          <span className="font-semibold">Customer:</span>{" "}
                          {order.customer?.customerName || "Walk-in"}
                        </p>
                        <p className="text-green-700">
                          <span className="font-semibold">Payment:</span>{" "}
                          {order.paymentMethod || "Cash"}
                        </p>
                      </div>
                      <p className="text-green-600 text-xs mt-1">
                        Completed: {formatDate(order.completedAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 self-end md:self-center">
                      <button
                        onClick={(e) => handlePrintOrder(order, e)}
                        disabled={printingOrderId === order.id}
                        className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white p-2 rounded-lg flex items-center gap-1"
                        title="Print Receipt"
                      >
                        {printingOrderId === order.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <>
                            <MdPrint size={18} />
                            <span className="text-xs hidden sm:inline">
                              Print
                            </span>
                          </>
                        )}
                      </button>
                      <MdCheckCircle className="text-green-500 text-2xl" />
                    </div>
                  </div>

                  {/* Order Items Preview */}
                  {order.items && order.items.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-green-200">
                      <p className="text-green-600 text-sm font-semibold mb-2">
                        Items Ordered ({order.items.length} items):
                      </p>
                      <div className="space-y-2">
                        {order.items.slice(0, 3).map((item, index) => (
                          <div
                            key={index}
                            className="flex justify-between items-center bg-white rounded p-2 border border-green-100"
                          >
                            <div className="flex-1">
                              <span className="text-green-900 font-medium">
                                {item.quantity}x {item.name}
                              </span>
                            </div>
                            <span className="font-bold text-green-900">
                              {formatCurrency(
                                (item.quantity || 1) *
                                  (item.pricePerQuantity || item.price || 0)
                              )}
                            </span>
                          </div>
                        ))}
                        {order.items.length > 3 && (
                          <div className="text-center">
                            <p className="text-green-600 text-sm">
                              +{order.items.length - 3} more items
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <BottomNav />
      </div>
    </section>
  );
};

export default Menu;
