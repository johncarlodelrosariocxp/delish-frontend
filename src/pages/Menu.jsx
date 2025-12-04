import React, { useEffect, useState } from "react";
import BottomNav from "../components/shared/BottomNav";
import {
  MdRestaurantMenu,
  MdAdd,
  MdClose,
  MdCheckCircle,
  MdPrint,
} from "react-icons/md";
import MenuContainer from "../components/menu/MenuContainer";
import CustomerInfo from "../components/menu/CustomerInfo";
import CartInfo from "../components/menu/CartInfo";
import Bill from "../components/menu/Bill";
import { useSelector, useDispatch } from "react-redux";
import {
  createNewOrder,
  switchOrder,
  closeOrder,
} from "../redux/slices/orderSlice";

const Menu = () => {
  useEffect(() => {
    document.title = "POS | Menu";
  }, []);

  const dispatch = useDispatch();
  const { orders, activeOrderId, completedOrders } = useSelector(
    (state) => state.order
  );
  const [activeTab, setActiveTab] = useState("active");
  const [printingOrderId, setPrintingOrderId] = useState(null);

  // Filter orders - only active and completed
  const activeOrders = orders.filter((order) => order.status === "active");

  const handleAddNewOrder = () => {
    dispatch(createNewOrder());
    setActiveTab("active");
  };

  const handleSwitchOrder = (orderId) => {
    // Only allow switching to active orders
    const order = orders.find((order) => order.id === orderId);
    if (order && order.status === "active") {
      dispatch(switchOrder(orderId));
      setActiveTab("active");
    }
  };

  const handleCloseOrder = (orderId, event) => {
    event.stopPropagation();
    // Only close if there's more than one active order
    if (activeOrders.length > 1) {
      dispatch(closeOrder(orderId));
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
    event.stopPropagation();
    setPrintingOrderId(order.id);

    try {
      // Create receipt text
      const receiptText = generateReceiptText(order);

      // Create a hidden textarea with the receipt content
      const textArea = document.createElement("textarea");
      textArea.value = receiptText;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.style.top = "0";
      document.body.appendChild(textArea);
      textArea.select();

      try {
        // Try to print using browser print
        window.print();
      } catch (error) {
        // Copy to clipboard as last resort
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
    receipt += lineBreak; // Extra lines for paper cut

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

  // Calculate item price per quantity for display
  const calculateItemPrice = (item) => {
    const price = item.pricePerQuantity || item.price || 0;
    return formatCurrency(price);
  };

  return (
    <section className="bg-white min-h-screen flex flex-col">
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
          Active Orders ({activeOrders.length})
        </button>

        <button
          onClick={() => setActiveTab("completed")}
          className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-colors ${
            activeTab === "completed"
              ? "bg-white text-green-600 border-t border-l border-r border-gray-300"
              : "bg-gray-300 text-gray-600 hover:bg-gray-250"
          }`}
        >
          Completed ({completedOrders.length})
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
                Order {order.number}
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
          activeOrders.length === 0 ? (
            // No active orders state
            <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 rounded-lg p-8">
              <div className="text-center">
                <MdRestaurantMenu className="text-gray-300 text-6xl mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">
                  No Active Orders
                </h3>
                <p className="text-gray-500 mb-6">
                  Create a new order to get started
                </p>
                <button
                  onClick={handleAddNewOrder}
                  className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors font-semibold"
                >
                  Create New Order
                </button>
              </div>
            </div>
          ) : (
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
                  <Bill orderId={activeOrderId} />
                </div>
              </div>
            </>
          )
        ) : (
          /* Completed Orders View */
          <div className="flex-1 bg-white rounded-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                Completed Orders
              </h2>
              {completedOrders.length > 0 && (
                <span className="bg-green-100 text-green-800 text-sm font-medium px-3 py-1 rounded-full">
                  {completedOrders.length} orders
                </span>
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
                  className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Go to Active Orders
                </button>
              </div>
            ) : (
              <div className="space-y-4 max-h-[calc(100vh-12rem)] overflow-y-auto">
                {completedOrders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-green-50 border border-green-200 rounded-lg p-4 hover:bg-green-100 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-green-800 text-lg">
                          Order {order.number}
                        </h3>
                        <p className="text-green-700 font-medium">
                          {order.customer?.customerName || "Walk-in Customer"}
                        </p>
                        <p className="text-green-600 text-sm mt-1">
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
                          className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Print Receipt"
                        >
                          {printingOrderId === order.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          ) : (
                            <MdPrint size={20} />
                          )}
                        </button>
                        <MdCheckCircle className="text-green-500 text-2xl flex-shrink-0" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-green-700 text-sm">
                      <div>
                        <p className="font-medium">Items</p>
                        <p>{order.items?.length || 0} items</p>
                      </div>
                      <div>
                        <p className="font-medium">Total Amount</p>
                        <p className="font-bold">
                          {calculateTotalAmount(order)}
                        </p>
                      </div>
                      {order.paymentMethod && (
                        <div className="col-span-2">
                          <p className="font-medium">Payment Method</p>
                          <p className="font-bold">{order.paymentMethod}</p>
                        </div>
                      )}
                    </div>

                    {order.items && order.items.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-green-200">
                        <p className="text-green-600 text-sm font-medium mb-2">
                          Items Ordered:
                        </p>
                        <div className="space-y-1">
                          {order.items.slice(0, 3).map((item, index) => (
                            <div
                              key={index}
                              className="flex justify-between text-green-700 text-xs"
                            >
                              <span>
                                {item.quantity}x {item.name}
                                {item.isRedeemed && (
                                  <span className="ml-1 text-blue-600">
                                    (Redeemed)
                                  </span>
                                )}
                                {item.isPwdSssDiscounted && (
                                  <span className="ml-1 text-green-600">
                                    (PWD/SSS 20% off)
                                  </span>
                                )}
                              </span>
                              <span>{calculateItemTotal(item)}</span>
                            </div>
                          ))}
                          {order.items.length > 3 && (
                            <p className="text-green-600 text-xs">
                              +{order.items.length - 3} more items
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Show discounts if available */}
                    {order.bills && (
                      <div className="mt-3 pt-3 border-t border-green-200">
                        <p className="text-green-600 text-sm font-medium mb-2">
                          Discounts Applied:
                        </p>
                        <div className="space-y-1 text-green-700 text-xs">
                          {order.bills.pwdSssDiscount > 0 && (
                            <div className="flex justify-between">
                              <span>PWD/SSS Discount:</span>
                              <span className="text-red-600">
                                -{formatCurrency(order.bills.pwdSssDiscount)}
                              </span>
                            </div>
                          )}
                          {order.bills.redemptionDiscount > 0 && (
                            <div className="flex justify-between">
                              <span>Redemption Discount:</span>
                              <span className="text-red-600">
                                -
                                {formatCurrency(order.bills.redemptionDiscount)}
                              </span>
                            </div>
                          )}
                          {order.bills.employeeDiscount > 0 && (
                            <div className="flex justify-between">
                              <span>Employee Discount:</span>
                              <span className="text-red-600">
                                -{formatCurrency(order.bills.employeeDiscount)}
                              </span>
                            </div>
                          )}
                          {order.bills.shareholderDiscount > 0 && (
                            <div className="flex justify-between">
                              <span>Shareholder Discount:</span>
                              <span className="text-red-600">
                                -
                                {formatCurrency(
                                  order.bills.shareholderDiscount
                                )}
                              </span>
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
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <BottomNav />
      </div>
    </section>
  );
};

export default Menu;
