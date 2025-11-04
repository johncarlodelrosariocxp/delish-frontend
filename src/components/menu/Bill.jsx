import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { removeItem, removeAllItems } from "../../redux/slices/cartSlice";
import { removeCustomer } from "../../redux/slices/customerSlice";
import {
  addOrder,
  createOrderRazorpay,
  updateTable,
  verifyPaymentRazorpay,
} from "../../https/index";
import { enqueueSnackbar } from "notistack";
import { useMutation } from "@tanstack/react-query";
import Invoice from "../invoice/Invoice";
import { useNavigate } from "react-router-dom";

function loadScript(src) {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

const Bill = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const customerData = useSelector((state) => state.customer);
  const cartData = useSelector((state) => state.cart);

  const vatRate = 12;
  const discountRate = 0.1; // PWD/Senior/Whole = 10%
  const employeeDiscountRate = 0.15; // Employee = 15%

  const [discountApplied, setDiscountApplied] = useState(false);
  const [employeeDiscountApplied, setEmployeeDiscountApplied] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const [orderInfo, setOrderInfo] = useState(null);

  // Combine same items in cart
  const combineCartItems = (cart) => {
    const combinedItems = {};

    cart.forEach((item) => {
      const key = `${item.id}-${item.pricePerQuantity}`;
      if (combinedItems[key]) {
        combinedItems[key].quantity += item.quantity;
        // Keep track of original items for discount calculation
        combinedItems[key].originalItems = [
          ...combinedItems[key].originalItems,
          item,
        ];
      } else {
        combinedItems[key] = {
          ...item,
          originalItems: [item],
        };
      }
    });

    return Object.values(combinedItems);
  };

  // Add default discountedPrice field
  const addDefaultDiscountedPrice = (cart) =>
    cart.map((item) => ({
      ...item,
      discountedPrice: item.discountedPrice ?? item.pricePerQuantity,
    }));

  // Apply discount logic - only apply to one unit of the most expensive item
  const applyDiscounts = (cart) => {
    const normalizedCart = addDefaultDiscountedPrice(cart);
    let discountedItems = [...normalizedCart];

    // Apply 10% discount logic
    if (discountApplied) {
      const wholeEligible = discountedItems.filter(
        (item) =>
          item.name.toLowerCase().includes("whole") ||
          item.name.toLowerCase().includes("phinwheel")
      );

      // If there are whole/phinwheel items, use the special logic
      if (wholeEligible.length > 0) {
        const mostExpensive = wholeEligible.reduce((prev, curr) =>
          curr.pricePerQuantity > prev.pricePerQuantity ? curr : prev
        );
        discountedItems = discountedItems.map((item) => {
          if (item.id === mostExpensive.id) {
            // Only apply discount to one unit
            const divided = item.pricePerQuantity / 10;
            const multiplied = divided * 2;
            const discountAmount = multiplied * discountRate;
            const discountedPrice = item.pricePerQuantity - discountAmount;
            return {
              ...item,
              discountedPrice,
              // Track that only one unit is discounted
              discountedUnits: 1,
              regularUnits: item.quantity - 1,
            };
          }
          return {
            ...item,
            discountedPrice: item.pricePerQuantity,
            discountedUnits: 0,
            regularUnits: item.quantity,
          };
        });
      } else {
        // If not whole/phinwheel, apply direct 10% discount to most expensive item (one unit only)
        const mostExpensiveItem = [...discountedItems].sort(
          (a, b) => b.pricePerQuantity - a.pricePerQuantity
        )[0];
        discountedItems = discountedItems.map((item) => {
          if (item.id === mostExpensiveItem.id) {
            const discountAmount = item.pricePerQuantity * discountRate;
            const discountedPrice = item.pricePerQuantity - discountAmount;
            return {
              ...item,
              discountedPrice,
              // Track that only one unit is discounted
              discountedUnits: 1,
              regularUnits: item.quantity - 1,
            };
          }
          return {
            ...item,
            discountedPrice: item.pricePerQuantity,
            discountedUnits: 0,
            regularUnits: item.quantity,
          };
        });
      }
    }

    // Apply 15% discount logic
    if (employeeDiscountApplied) {
      const wholeEligible = discountedItems.filter(
        (item) =>
          item.name.toLowerCase().includes("whole") ||
          item.name.toLowerCase().includes("phinwheel")
      );

      if (wholeEligible.length > 0) {
        const mostExpensive = wholeEligible.reduce((prev, curr) =>
          curr.pricePerQuantity > prev.pricePerQuantity ? curr : prev
        );
        discountedItems = discountedItems.map((item) => {
          if (item.id === mostExpensive.id) {
            const divided = item.pricePerQuantity / 10;
            const multiplied = divided * 2;
            const discountAmount = multiplied * employeeDiscountRate;
            const discountedPrice = item.pricePerQuantity - discountAmount;
            return {
              ...item,
              discountedPrice,
              // Track that only one unit is discounted
              discountedUnits: 1,
              regularUnits: item.quantity - 1,
            };
          }
          return {
            ...item,
            discountedPrice: item.pricePerQuantity,
            discountedUnits: 0,
            regularUnits: item.quantity,
          };
        });
      } else {
        // If not whole/phinwheel, apply direct 15% discount to most expensive item (one unit only)
        const mostExpensiveItem = [...discountedItems].sort(
          (a, b) => b.pricePerQuantity - a.pricePerQuantity
        )[0];
        discountedItems = discountedItems.map((item) => {
          if (item.id === mostExpensiveItem.id) {
            const discountAmount = item.pricePerQuantity * employeeDiscountRate;
            const discountedPrice = item.pricePerQuantity - discountAmount;
            return {
              ...item,
              discountedPrice,
              // Track that only one unit is discounted
              discountedUnits: 1,
              regularUnits: item.quantity - 1,
            };
          }
          return {
            ...item,
            discountedPrice: item.pricePerQuantity,
            discountedUnits: 0,
            regularUnits: item.quantity,
          };
        });
      }
    }

    // If no discount applied, set default values
    if (!discountApplied && !employeeDiscountApplied) {
      discountedItems = discountedItems.map((item) => ({
        ...item,
        discountedUnits: 0,
        regularUnits: item.quantity,
      }));
    }

    return discountedItems;
  };

  const processedCart = applyDiscounts(cartData);
  const combinedCart = combineCartItems(processedCart);

  // Calculate total for an item considering discounted and regular units
  const calculateItemTotal = (item) => {
    if (item.discountedUnits > 0) {
      const discountedTotal = item.discountedUnits * item.discountedPrice;
      const regularTotal = item.regularUnits * item.pricePerQuantity;
      return discountedTotal + regularTotal;
    }
    return item.quantity * item.discountedPrice;
  };

  // Generate unique key for each cart item
  const getUniqueKey = (item, index) => {
    return `${item.id}-${index}-${item.quantity}-${item.pricePerQuantity}`;
  };

  // Totals
  const grossTotal = combinedCart.reduce(
    (sum, item) => sum + item.quantity * item.pricePerQuantity,
    0
  );

  const discountAmount = combinedCart.reduce((sum, item) => {
    if (item.discountedUnits > 0) {
      const regularPriceForDiscountedUnits =
        item.discountedUnits * item.pricePerQuantity;
      const discountedPriceForDiscountedUnits =
        item.discountedUnits * item.discountedPrice;
      return (
        sum +
        (regularPriceForDiscountedUnits - discountedPriceForDiscountedUnits)
      );
    }
    return sum;
  }, 0);

  const discountedTotal = grossTotal - discountAmount;
  const netSales = discountedTotal / (1 + vatRate / 100);
  const vatAmount = discountedTotal - netSales;
  const total = Number(discountedTotal.toFixed(2));

  // Mutations
  const tableUpdateMutation = useMutation({
    mutationFn: (reqData) => updateTable(reqData),
    onSuccess: () => {
      dispatch(removeCustomer());
      dispatch(removeAllItems());
    },
    onError: (error) => {
      console.error("Table update error:", error);
    },
  });

  const orderMutation = useMutation({
    mutationFn: (reqData) => addOrder(reqData),
    onSuccess: (res) => {
      const { data } = res.data;

      // Prepare order info for invoice
      const invoiceOrderInfo = {
        ...data,
        customerDetails: {
          name: customerData.customerName || "Walk-in",
          phone: customerData.customerPhone || "Not provided",
          guests: customerData.guests || 1,
        },
        items: combinedCart.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: calculateItemTotal(item),
          pricePerQuantity: item.pricePerQuantity,
        })),
        bills: {
          total: grossTotal,
          tax: vatAmount,
          discount: discountAmount,
          totalWithTax: total,
        },
        paymentMethod: paymentMethod,
        orderDate: new Date().toISOString(),
      };

      setOrderInfo(invoiceOrderInfo);

      // Only update table if tableId exists
      const tableId =
        customerData.tables?.[0]?.tableId ||
        customerData.table?.tableId ||
        customerData.tableId ||
        null;

      if (tableId) {
        const tableData = {
          status: "Booked",
          orderId: data._id,
          tableId: tableId,
        };
        setTimeout(() => tableUpdateMutation.mutate(tableData), 1000);
      } else {
        // If no table, still clear cart and customer
        dispatch(removeCustomer());
        dispatch(removeAllItems());
      }

      enqueueSnackbar("Order placed successfully!", { variant: "success" });
      setShowInvoice(true);
    },
    onError: (error) => {
      console.error("Order placement error:", error);
      console.error("Error response:", error.response?.data);
      enqueueSnackbar(
        `Failed to place order: ${
          error.response?.data?.message || "Please try again"
        }`,
        { variant: "error" }
      );
    },
  });

  const handlePlaceOrder = async () => {
    if (!paymentMethod) {
      enqueueSnackbar("Please select a payment method!", {
        variant: "warning",
      });
      return;
    }

    if (!cartData || cartData.length === 0) {
      enqueueSnackbar("Cart is empty!", { variant: "warning" });
      return;
    }

    // Get tableId if it exists, but don't require it
    const tableId =
      customerData.tables?.[0]?.tableId ||
      customerData.table?.tableId ||
      customerData.tableId ||
      null;

    const bills = {
      netSales: Number(netSales.toFixed(2)),
      tax: Number(vatAmount.toFixed(2)),
      discount: Number(discountAmount.toFixed(2)),
      total: Number(total.toFixed(2)),
      totalWithTax: Number(total.toFixed(2)),
    };

    const orderData = {
      customerDetails: {
        name: customerData.customerName || "Walk-in",
        phone: customerData.customerPhone || "Not provided",
        guests: customerData.guests || 1,
      },
      orderStatus: "In Progress",
      bills,
      items: cartData, // Use original cart data without processing
      table: tableId,
      paymentMethod,
    };

    console.log("Sending order data:", orderData);

    if (paymentMethod === "Online") {
      try {
        const loaded = await loadScript(
          "https://checkout.razorpay.com/v1/checkout.js"
        );
        if (!loaded) {
          enqueueSnackbar("Razorpay SDK failed to load!", { variant: "error" });
          return;
        }

        const reqData = { amount: total.toFixed(2) };
        const { data } = await createOrderRazorpay(reqData);

        const options = {
          key: import.meta.env.VITE_RAZORPAY_KEY_ID,
          amount: data.order.amount,
          currency: data.order.currency,
          name: "DELISH",
          description: "Secure Payment",
          order_id: data.order.id,
          handler: async (response) => {
            const verification = await verifyPaymentRazorpay(response);
            enqueueSnackbar(verification.data.message, {
              variant: "success",
            });
            orderData.paymentData = {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
            };
            setTimeout(() => orderMutation.mutate(orderData), 1000);
          },
          theme: { color: "#2563eb" },
        };

        const razorpay = new window.Razorpay(options);
        razorpay.open();
      } catch (err) {
        enqueueSnackbar("Payment failed!", { variant: "error" });
      }
    } else {
      orderMutation.mutate(orderData);
    }
  };

  const handleCloseInvoice = () => {
    setShowInvoice(false);
    // Redirect to home after closing invoice
    setTimeout(() => {
      navigate("/");
    }, 500);
  };

  return (
    <div className="w-full h-screen overflow-y-auto bg-gray-100 px-4 py-6">
      <div className="max-w-[600px] mx-auto space-y-4">
        {/* 🛒 CART ITEMS */}
        <div className="bg-white rounded-lg p-4 shadow-md max-h-64 overflow-y-auto">
          <h2 className="text-gray-900 text-sm font-semibold mb-2">
            Cart Items
          </h2>
          {combinedCart.length === 0 ? (
            <p className="text-gray-500 text-xs">No items added yet.</p>
          ) : (
            combinedCart.map((item, index) => (
              <div
                key={getUniqueKey(item, index)}
                className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded-md border border-gray-200"
              >
                <div>
                  <p className="text-gray-900 text-sm font-medium">
                    {item.name}
                  </p>
                  <p className="text-gray-500 text-xs">
                    {item.quantity} × ₱{item.pricePerQuantity.toFixed(2)}
                  </p>
                  {item.discountedUnits > 0 && (
                    <div className="text-green-600 text-xs">
                      <p>
                        Discounted: ₱{item.discountedPrice.toFixed(2)} ×{" "}
                        {item.discountedUnits}
                      </p>
                      {item.regularUnits > 0 && (
                        <p>
                          Regular: ₱{item.pricePerQuantity.toFixed(2)} ×{" "}
                          {item.regularUnits}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-gray-900 text-sm font-bold">
                    ₱{calculateItemTotal(item).toFixed(2)}
                  </p>
                  <button
                    onClick={() => dispatch(removeItem(item.id))}
                    className="text-red-500 hover:text-red-700 text-xs font-semibold"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 🧾 TOTALS */}
        <div className="bg-white rounded-lg p-4 shadow-md space-y-2">
          <div className="flex justify-between items-center">
            <p className="text-xs text-gray-500 font-medium">
              Items ({cartData?.length || 0})
            </p>
            <h1 className="text-gray-900 text-md font-bold">
              ₱{grossTotal.toFixed(2)}
            </h1>
          </div>

          {(discountApplied || employeeDiscountApplied) && (
            <div className="flex justify-between items-center text-green-600">
              <p className="text-xs font-medium">
                {employeeDiscountApplied
                  ? "Employee Discount (15% – 1 item)"
                  : "PWD/Whole/Phinwheel Discount (10% – 1 item)"}
              </p>
              <h1 className="text-md font-bold">
                -₱{discountAmount.toFixed(2)}
              </h1>
            </div>
          )}

          <div className="flex justify-between items-center">
            <p className="text-xs text-gray-500 font-medium">Net of VAT</p>
            <h1 className="text-gray-900 text-md font-bold">
              ₱{netSales.toFixed(2)}
            </h1>
          </div>

          <div className="flex justify-between items-center">
            <p className="text-xs text-gray-500 font-medium">
              Total (VAT inclusive)
            </p>
            <h1 className="text-gray-900 text-md font-bold">
              ₱{total.toFixed(2)}
            </h1>
          </div>
        </div>

        {/* 🎟 DISCOUNT BUTTONS - Made smaller and aligned with payment buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <button
            onClick={() => {
              setDiscountApplied(!discountApplied);
              setEmployeeDiscountApplied(false);
            }}
            className={`flex-1 px-3 py-2 rounded-lg font-semibold text-xs shadow ${
              discountApplied
                ? "bg-green-500 text-white"
                : "bg-green-100 text-green-700"
            }`}
          >
            {discountApplied ? "Discount Applied" : "PWD/Whole/Phinwheel (10%)"}
          </button>

          <button
            onClick={() => {
              setEmployeeDiscountApplied(!employeeDiscountApplied);
              setDiscountApplied(false);
            }}
            className={`flex-1 px-3 py-2 rounded-lg font-semibold text-xs shadow ${
              employeeDiscountApplied
                ? "bg-yellow-500 text-white"
                : "bg-yellow-100 text-yellow-700"
            }`}
          >
            {employeeDiscountApplied
              ? "Emp. Discount Applied"
              : "Employee (15%)"}
          </button>
        </div>

        {/* 💳 PAYMENT BUTTONS */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => setPaymentMethod("Cash")}
            className={`flex-1 px-3 py-2 rounded-lg font-semibold text-xs shadow ${
              paymentMethod === "Cash"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-600"
            }`}
          >
            Cash
          </button>

          <button
            onClick={() => setPaymentMethod("Online")}
            className={`flex-1 px-3 py-2 rounded-lg font-semibold text-xs shadow ${
              paymentMethod === "Online"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-600"
            }`}
          >
            Online
          </button>
        </div>

        {/* 🧾 PLACE ORDER */}
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <button
            onClick={handlePlaceOrder}
            disabled={orderMutation.isLoading}
            className="w-full px-4 py-3 rounded-lg font-semibold text-sm bg-blue-600 text-white shadow hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            {orderMutation.isLoading ? "Placing Order..." : "Place Order"}
          </button>
        </div>

        {/* 📄 INVOICE MODAL */}
        {showInvoice && orderInfo && (
          <Invoice orderInfo={orderInfo} setShowInvoice={handleCloseInvoice} />
        )}
      </div>
    </div>
  );
};

export default Bill;
