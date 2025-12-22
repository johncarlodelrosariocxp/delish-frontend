import React, { useEffect, useState, useRef } from "react";
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

  const [activeTab, setActiveTab] = useState("active");
  const [printingOrderId, setPrintingOrderId] = useState(null);
  const [showCompletionLoading, setShowCompletionLoading] = useState(false);
  const [showCompleteButton, setShowCompleteButton] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [manualCompleteClicked, setManualCompleteClicked] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [autoSwitchOrder, setAutoSwitchOrder] = useState(false);

  // Use refs to track completion state
  const pendingCompletionRef = useRef(null);
  const completionTimeoutRef = useRef(null);
  const initialLoadRef = useRef(true);
  const invoiceClosedRef = useRef(false);

  // Filter orders - only active and completed
  const activeOrders = orders.filter((order) => order.status === "active");

  // Get the current active order
  const currentActiveOrder = activeOrders.find(
    (order) => order.id === activeOrderId
  );

  // ✅ Initialize - create first order if no active orders
  useEffect(() => {
    const initializeOrders = () => {
      if (activeOrders.length === 0) {
        // Only create new order on initial load
        if (initialLoadRef.current) {
          dispatch(createNewOrder());
          initialLoadRef.current = false;
        }
      }
      setIsInitializing(false);
    };

    initializeOrders();
  }, [activeOrders.length, dispatch]);

  // ✅ Check if order is ready for completion
  useEffect(() => {
    if (currentActiveOrder) {
      const hasItems =
        currentActiveOrder.items && currentActiveOrder.items.length > 0;
      const hasPaymentMethod = currentActiveOrder.paymentMethod;
      const isNotCompleted = !currentActiveOrder.isCompleted;
      const isActive = currentActiveOrder.status === "active";

      // Show complete button if order has items and payment method
      setShowCompleteButton(
        hasItems && hasPaymentMethod && isNotCompleted && isActive
      );
    } else {
      setShowCompleteButton(false);
    }
  }, [currentActiveOrder]);

  // ✅ Monitor for order completion trigger from Bill component (auto-completion)
  useEffect(() => {
    if (currentActiveOrder && showCompleteButton && !manualCompleteClicked) {
      // If order is ready for completion and auto-completion is enabled
      // Check if this order is already pending completion
      if (pendingCompletionRef.current !== currentActiveOrder.id) {
        pendingCompletionRef.current = currentActiveOrder.id;

        // Clear any existing timeout
        if (completionTimeoutRef.current) {
          clearTimeout(completionTimeoutRef.current);
        }

        // Auto-complete after a 2-second delay (give user time to review)
        completionTimeoutRef.current = setTimeout(() => {
          handleCompleteOrder();
        }, 2000);
      }
    }

    // Cleanup function
    return () => {
      if (completionTimeoutRef.current) {
        clearTimeout(completionTimeoutRef.current);
      }
    };
  }, [currentActiveOrder, showCompleteButton, manualCompleteClicked]);

  // ✅ Handle invoice state changes
  useEffect(() => {
    // Show invoice modal when there's a recent completed order
    if (recentCompletedOrder && showInvoice) {
      setShowInvoiceModal(true);
      invoiceClosedRef.current = false;
    } else {
      setShowInvoiceModal(false);
    }
  }, [recentCompletedOrder, showInvoice]);

  // ✅ Handle auto-switching to next order after completion
  useEffect(() => {
    if (autoSwitchOrder && activeOrders.length > 0) {
      // Find the most recent active order (excluding the one that was just completed)
      const remainingOrders = orders.filter(
        (order) =>
          order.status === "active" && order.id !== recentCompletedOrder?.id
      );

      if (remainingOrders.length > 0) {
        // Switch to the first remaining active order
        dispatch(switchOrder(remainingOrders[0].id));
      } else {
        // Create a new order if no active orders remain
        setTimeout(() => {
          dispatch(createNewOrder());
        }, 300);
      }

      setAutoSwitchOrder(false);
    }
  }, [autoSwitchOrder, activeOrders, orders, dispatch, recentCompletedOrder]);

  // ✅ Manual function to complete order
  const handleCompleteOrder = () => {
    if (!currentActiveOrder || showCompletionLoading) return;

    const hasItems =
      currentActiveOrder.items && currentActiveOrder.items.length > 0;
    const hasPaymentMethod = currentActiveOrder.paymentMethod;

    if (!hasItems) {
      alert("Please add items to the order before completing.");
      return;
    }

    if (!hasPaymentMethod) {
      alert("Please select a payment method before completing the order.");
      return;
    }

    setManualCompleteClicked(true);
    setShowCompletionLoading(true);

    // Clear any pending timeout
    if (completionTimeoutRef.current) {
      clearTimeout(completionTimeoutRef.current);
      completionTimeoutRef.current = null;
    }

    // Dispatch completeOrder action
    dispatch(
      completeOrder({
        orderId: currentActiveOrder.id,
        paymentMethod: currentActiveOrder.paymentMethod,
      })
    );

    // Reset loading state after a delay
    setTimeout(() => {
      setShowCompletionLoading(false);
      pendingCompletionRef.current = null;

      // Set flag to auto-switch to next order
      setAutoSwitchOrder(true);
    }, 1000);
  };

  // ✅ Handle invoice close
  const handleCloseInvoice = () => {
    setShowInvoiceModal(false);
    dispatch(hideInvoice());
    dispatch(clearRecentCompletedOrder());

    // Reset refs
    pendingCompletionRef.current = null;
    setManualCompleteClicked(false);
    invoiceClosedRef.current = true;

    // Check if we need to create a new order or switch to existing one
    const remainingActiveOrders = orders.filter(
      (order) => order.status === "active"
    );

    if (remainingActiveOrders.length === 0) {
      // No active orders, create a new one
      setTimeout(() => {
        dispatch(createNewOrder());
      }, 200);
    } else {
      // Switch to the first active order
      setTimeout(() => {
        dispatch(switchOrder(remainingActiveOrders[0].id));
      }, 200);
    }
  };

  // ✅ Handle order completion from Bill component
  const handleOrderCompletionFromBill = () => {
    setManualCompleteClicked(true);
    handleCompleteOrder();
  };

  // ✅ Handle adding new order and switching to it
  const handleAddNewOrder = () => {
    dispatch(createNewOrder());
    setActiveTab("active");
  };

  // ✅ Handle switching to a specific order
  const handleSwitchOrder = (orderId) => {
    const order = orders.find((order) => order.id === orderId);
    if (order && order.status === "active") {
      dispatch(switchOrder(orderId));
      setActiveTab("active");
    }
  };

  // ✅ Handle closing an order
  const handleCloseOrder = (orderId, event) => {
    event.stopPropagation();
    if (activeOrders.length > 1) {
      dispatch(closeOrder(orderId));

      // If we're closing the current active order, switch to another one
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
    }
  };

  // Format currency using locale
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Format date using locale
  const formatDate = (date) => {
    return new Date(date).toLocaleString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  // Print completed order receipt
  const handlePrintOrder = async (order, event) => {
    if (event && event.stopPropagation) {
      event.stopPropagation();
    }
    setPrintingOrderId(order.id);

    try {
      const receiptText = generateReceiptText(order);
      const textArea = document.createElement("textarea");
      textArea.value = receiptText;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.style.top = "0";
      document.body.appendChild(textArea);
      textArea.select();

      try {
        window.print();
      } catch (error) {
        document.execCommand("copy");
        alert(
          "Receipt copied to clipboard. Please paste into a text editor to print."
        );
      }

      document.body.removeChild(textArea);
    } catch (error) {
      console.error("Printing error:", error);
      alert("Failed to print receipt");
    } finally {
      setTimeout(() => setPrintingOrderId(null), 1000);
    }
  };

  // Generate receipt text for completed orders
  const generateReceiptText = (order) => {
    const lineBreak = "\n";
    const dashedLine = "--------------------------------";
    const doubleLine = "===============================";

    let receipt = "";

    // Header
    receipt += doubleLine + lineBreak;
    receipt += "      DELISH RESTAURANT" + lineBreak;
    receipt += doubleLine + lineBreak;
    receipt += `Order: #${order.id?.slice(-8) || order.number}` + lineBreak;
    receipt +=
      `Date: ${formatDate(order.completedAt || Date.now())}` + lineBreak;
    receipt +=
      `Customer: ${order.customer?.customerName || "Walk-in"}` + lineBreak;
    receipt += dashedLine + lineBreak;

    // Items
    receipt += "           ORDER ITEMS" + lineBreak;
    receipt += dashedLine + lineBreak;

    order.items?.forEach((item, index) => {
      const itemName =
        item.name.length > 20 ? item.name.substring(0, 17) + "..." : item.name;
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
      "SUBTOTAL:" + `${formatCurrency(subtotal)}`.padStart(20) + lineBreak;

    if (order.bills?.pwdSssDiscount > 0) {
      receipt +=
        "PWD/SSS DISC:" +
        `-${formatCurrency(order.bills.pwdSssDiscount)}`.padStart(17) +
        lineBreak;
    }

    if (order.bills?.redemptionDiscount > 0) {
      receipt +=
        "REDEMPTION:" +
        `-${formatCurrency(order.bills.redemptionDiscount)}`.padStart(19) +
        lineBreak;
    }

    if (order.bills?.employeeDiscount > 0) {
      receipt +=
        "EMP DISCOUNT:" +
        `-${formatCurrency(order.bills.employeeDiscount)}`.padStart(17) +
        lineBreak;
    }

    if (order.bills?.shareholderDiscount > 0) {
      receipt +=
        "SH DISCOUNT:" +
        `-${formatCurrency(order.bills.shareholderDiscount)}`.padStart(18) +
        lineBreak;
    }

    receipt += "VAT (12%):" + `${formatCurrency(vat)}`.padStart(20) + lineBreak;
    receipt += doubleLine + lineBreak;
    receipt += "TOTAL:" + `${formatCurrency(total)}`.padStart(24) + lineBreak;
    receipt += doubleLine + lineBreak;

    receipt += `Payment: ${order.paymentMethod || "Cash"}` + lineBreak;
    receipt += "Status: COMPLETED" + lineBreak;
    receipt += lineBreak;
    receipt += "Thank you for dining with us!" + lineBreak;
    receipt += "Visit us again soon!" + lineBreak;
    receipt += lineBreak;
    receipt += lineBreak;
    receipt += lineBreak;

    return receipt;
  };

  // Calculate total amount for display
  const calculateTotalAmount = (order) => {
    if (order.bills?.total) {
      return formatCurrency(order.bills.total);
    }

    const total =
      order.items?.reduce((sum, item) => {
        return (
          sum +
          (item.quantity || 1) * (item.pricePerQuantity || item.price || 0)
        );
      }, 0) || 0;

    return formatCurrency(total);
  };

  // Calculate item total for display
  const calculateItemTotal = (item) => {
    const total =
      (item.quantity || 1) * (item.pricePerQuantity || item.price || 0);
    return formatCurrency(total);
  };

  // Show loading indicator when completing order
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
            <div className="mt-4 text-xs text-gray-500">
              <p>Items: {currentActiveOrder.items?.length || 0}</p>
              <p>Payment: {currentActiveOrder.paymentMethod || "Cash"}</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white min-h-screen flex flex-col">
      {/* ✅ INVOICE MODAL - Shows when order is completed */}
      {showInvoiceModal && recentCompletedOrder && (
        <div className="fixed inset-0 z-[9999] bg-black bg-opacity-75 flex items-center justify-center p-4 animate-fadeIn">
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
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                    className="w-10 h-10 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
                  >
                    ✕
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

      {/* Main Tabs */}
      <div className="bg-gray-200 px-3 pt-3 flex items-center gap-2 overflow-x-auto border-b">
        <button
          onClick={() => setActiveTab("active")}
          className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-colors ${
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
          className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-colors ${
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

      {/* Order Tabs - Only show for active orders */}
      {activeTab === "active" && (
        <div className="bg-gray-200 px-3 pb-1 flex items-center gap-2 overflow-x-auto">
          {activeOrders.map((order) => (
            <div
              key={order.id}
              className={`flex items-center gap-2 px-3 py-2 rounded-t-lg cursor-pointer transition-colors min-w-0 flex-shrink-0 ${
                order.id === activeOrderId
                  ? "bg-white border-t border-l border-r border-gray-300 shadow-sm"
                  : "bg-gray-300 hover:bg-gray-250"
              } ${
                order.items.length > 0 ? "border-l-4 border-l-green-500" : ""
              }`}
              onClick={() => handleSwitchOrder(order.id)}
            >
              <span className="text-sm font-medium whitespace-nowrap">
                <div className="flex items-center gap-1">
                  <MdReceipt size={14} />
                  <span>Order {order.number}</span>
                </div>
              </span>
              {order.items.length > 0 && (
                <span className="bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                  {order.items.reduce(
                    (total, item) => total + item.quantity,
                    0
                  )}
                </span>
              )}
              {activeOrders.length > 1 && (
                <button
                  onClick={(e) => handleCloseOrder(order.id, e)}
                  className="text-gray-500 hover:text-red-500 transition-colors flex-shrink-0"
                  title="Close Order"
                >
                  <MdClose size={16} />
                </button>
              )}
            </div>
          ))}

          {/* Add New Order Button */}
          <button
            onClick={handleAddNewOrder}
            className="flex items-center gap-1 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex-shrink-0"
          >
            <MdAdd size={18} />
            <span className="text-sm whitespace-nowrap">New Order</span>
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-col lg:flex-row gap-3 p-3 pb-20 lg:pb-3">
        {activeTab === "active" ? (
          <>
            {isInitializing || activeOrders.length === 0 ? (
              // Loading state while initializing or creating first order
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading order...</p>
                </div>
              </div>
            ) : (
              // Main POS Interface
              <>
                {/* Left Div - Menu Section */}
                <div className="flex-1 lg:flex-[3] flex flex-col min-h-0 order-1">
                  <div className="flex-1 min-h-0 overflow-hidden">
                    <MenuContainer orderId={activeOrderId} />
                  </div>
                </div>

                {/* Right Div - Sidebar */}
                <div className="flex-1 lg:flex-[1] bg-gray-100 rounded-lg shadow-md mt-3 lg:mt-0 h-auto lg:h-[calc(100vh-11rem)] flex flex-col order-2">
                  {/* Customer Info */}
                  <div className="flex-shrink-0">
                    <CustomerInfo orderId={activeOrderId} />
                  </div>

                  <hr className="border-gray-300 border-t-2" />

                  {/* Cart Info with scroll */}
                  <div className="flex-1 min-h-0 overflow-hidden">
                    <CartInfo orderId={activeOrderId} />
                  </div>

                  <hr className="border-gray-300 border-t-2" />

                  {/* Bills - Fixed at bottom */}
                  <div className="flex-shrink-0">
                    <Bill
                      orderId={activeOrderId}
                      onOrderComplete={handleOrderCompletionFromBill}
                    />
                  </div>

                  {/* Complete Order Button - Fixed at bottom of sidebar */}
                  {showCompleteButton && !showInvoiceModal && (
                    <div className="p-3 border-t border-gray-300 bg-gradient-to-r from-green-50 to-emerald-50">
                      <div className="mb-2 text-center">
                        <p className="text-sm text-gray-600 font-medium">
                          Order #{currentActiveOrder?.number} Ready
                        </p>
                        <p className="text-xs text-gray-500">
                          {manualCompleteClicked
                            ? "Processing order..."
                            : "Will auto-complete in 2 seconds..."}
                        </p>
                      </div>
                      <button
                        onClick={handleCompleteOrder}
                        disabled={
                          showCompletionLoading || manualCompleteClicked
                        }
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
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
          </>
        ) : (
          /* Completed Orders View */
          <div className="flex-1 bg-white rounded-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Order History
                </h2>
                <p className="text-gray-600 text-sm">
                  View all completed orders and print receipts
                </p>
              </div>
              {completedOrders.length > 0 && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      // Print all receipts
                      completedOrders.forEach((order) => {
                        setTimeout(() => {
                          const receiptText = generateReceiptText(order);
                          console.log(receiptText); // You can implement batch printing here
                        }, 100);
                      });
                    }}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <MdPrint size={18} />
                    <span>Batch Print</span>
                  </button>
                  <span className="bg-green-100 text-green-800 text-sm font-medium px-3 py-1 rounded-full">
                    {completedOrders.length} orders
                  </span>
                </div>
              )}
            </div>

            {completedOrders.length === 0 ? (
              <div className="text-center py-12">
                <MdCheckCircle className="text-gray-300 text-6xl mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No completed orders yet</p>
                <p className="text-gray-400 text-sm mt-2">
                  Completed orders will appear here after they are placed
                </p>
                <button
                  onClick={() => setActiveTab("active")}
                  className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 mx-auto"
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
                    className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 hover:from-green-100 hover:to-emerald-100 transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    <div className="flex justify-between items-start mb-3">
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
                        <div className="flex items-center gap-4 text-sm">
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
                          Completed:{" "}
                          {order.completedAt
                            ? formatDate(order.completedAt)
                            : "N/A"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => handlePrintOrder(order, e)}
                          disabled={printingOrderId === order.id}
                          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white p-2 rounded-lg transition-all shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
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
                        <MdCheckCircle className="text-green-500 text-2xl flex-shrink-0" />
                      </div>
                    </div>

                    {/* Order Summary */}
                    <div className="mt-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                        <div className="bg-white rounded p-3 border border-green-100">
                          <p className="text-green-700 text-xs font-semibold uppercase mb-1">
                            Items Count
                          </p>
                          <p className="text-green-900 font-bold text-lg">
                            {order.items?.length || 0} items
                          </p>
                          <p className="text-green-600 text-xs">
                            {order.items?.reduce(
                              (total, item) => total + (item.quantity || 1),
                              0
                            ) || 0}{" "}
                            total qty
                          </p>
                        </div>

                        <div className="bg-white rounded p-3 border border-green-100">
                          <p className="text-green-700 text-xs font-semibold uppercase mb-1">
                            Total Amount
                          </p>
                          <p className="text-green-900 font-bold text-lg">
                            {calculateTotalAmount(order)}
                          </p>
                          {order.bills?.subtotal && (
                            <p className="text-green-600 text-xs">
                              Subtotal: {formatCurrency(order.bills.subtotal)}
                            </p>
                          )}
                        </div>

                        <div className="bg-white rounded p-3 border border-green-100">
                          <p className="text-green-700 text-xs font-semibold uppercase mb-1">
                            Payment Method
                          </p>
                          <p className="text-green-900 font-bold text-lg">
                            {order.paymentMethod || "Cash"}
                          </p>
                          <p className="text-green-600 text-xs">
                            Status: COMPLETED
                          </p>
                        </div>
                      </div>

                      {/* Order Items Preview */}
                      {order.items && order.items.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-green-200">
                          <p className="text-green-600 text-sm font-semibold mb-2">
                            Items Ordered:
                          </p>
                          <div className="space-y-2">
                            {order.items.slice(0, 3).map((item, index) => (
                              <div
                                key={index}
                                className="flex justify-between items-center bg-white rounded p-2 border border-green-100"
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-green-900 font-medium">
                                      {item.quantity}x {item.name}
                                    </span>
                                    {item.isRedeemed && (
                                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
                                        Redeemed
                                      </span>
                                    )}
                                    {item.isPwdSssDiscounted && (
                                      <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">
                                        PWD/SSS 20% off
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-green-600 text-xs">
                                    Unit:{" "}
                                    {formatCurrency(
                                      item.pricePerQuantity || item.price || 0
                                    )}
                                  </p>
                                </div>
                                <span className="font-bold text-green-900">
                                  {calculateItemTotal(item)}
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

                      {/* Discounts Summary */}
                      {order.bills && (
                        <div className="mt-3 pt-3 border-t border-green-200">
                          <p className="text-green-600 text-sm font-semibold mb-2">
                            Discounts Applied:
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {order.bills.pwdSssDiscount > 0 && (
                              <div className="bg-red-50 border border-red-100 rounded p-2">
                                <p className="text-red-700 text-xs font-semibold">
                                  PWD/SSS Discount
                                </p>
                                <p className="text-red-900 font-bold">
                                  -{formatCurrency(order.bills.pwdSssDiscount)}
                                </p>
                              </div>
                            )}
                            {order.bills.redemptionDiscount > 0 && (
                              <div className="bg-blue-50 border border-blue-100 rounded p-2">
                                <p className="text-blue-700 text-xs font-semibold">
                                  Redemption
                                </p>
                                <p className="text-blue-900 font-bold">
                                  -
                                  {formatCurrency(
                                    order.bills.redemptionDiscount
                                  )}
                                </p>
                              </div>
                            )}
                            {order.bills.employeeDiscount > 0 && (
                              <div className="bg-purple-50 border border-purple-100 rounded p-2">
                                <p className="text-purple-700 text-xs font-semibold">
                                  Employee
                                </p>
                                <p className="text-purple-900 font-bold">
                                  -
                                  {formatCurrency(order.bills.employeeDiscount)}
                                </p>
                              </div>
                            )}
                            {order.bills.shareholderDiscount > 0 && (
                              <div className="bg-yellow-50 border border-yellow-100 rounded p-2">
                                <p className="text-yellow-700 text-xs font-semibold">
                                  Shareholder
                                </p>
                                <p className="text-yellow-900 font-bold">
                                  -
                                  {formatCurrency(
                                    order.bills.shareholderDiscount
                                  )}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <BottomNav />
      </div>
    </section>
  );
};

// Add CSS animations
const styles = `
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fadeIn {
  animation: fadeIn 0.3s ease-out;
}
`;

// Add styles to document head
if (typeof document !== "undefined") {
  const styleSheet = document.createElement("style");
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);
}

export default Menu;
