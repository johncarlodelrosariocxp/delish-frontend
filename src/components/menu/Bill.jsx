import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  removeItem,
  removeAllItems,
  incrementQuantity,
  decrementQuantity,
  redeemItem,
  removeRedemption,
} from "../../redux/slices/cartSlice";
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
  const pwdSssDiscountRate = 0.2; // PWD/SSS = 20%
  const employeeDiscountRate = 0.15; // Employee = 15%
  const shareholderDiscountRate = 0.1; // Shareholder = 10%

  const [pwdSssDiscountApplied, setPwdSssDiscountApplied] = useState(false);
  const [employeeDiscountApplied, setEmployeeDiscountApplied] = useState(false);
  const [shareholderDiscountApplied, setShareholderDiscountApplied] =
    useState(false);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const [orderInfo, setOrderInfo] = useState(null);
  const [showRedeemOptions, setShowRedeemOptions] = useState(false);

  // Safe number conversion helper
  const safeNumber = (value) => {
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  };

  // Combine same items in cart
  const combineCartItems = (cart) => {
    const combinedItems = {};

    cart.forEach((item) => {
      const key = `${item.id}-${item.pricePerQuantity}-${item.isRedeemed}`;
      if (combinedItems[key]) {
        combinedItems[key].quantity += item.quantity;
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
      discountedPrice:
        item.discountedPrice ?? safeNumber(item.pricePerQuantity),
      pricePerQuantity: safeNumber(item.pricePerQuantity),
      price: safeNumber(item.price),
    }));

  // Calculate item total value (quantity × price)
  const calculateItemTotalValue = (item) => {
    return safeNumber(item.quantity) * safeNumber(item.pricePerQuantity);
  };

  // FIXED: Apply PWD/SSS discount logic with proper error handling
  const applyPwdSssDiscount = (cart) => {
    try {
      const normalizedCart = addDefaultDiscountedPrice(cart);

      if (!pwdSssDiscountApplied) {
        return normalizedCart.map((item) => ({
          ...item,
          discountedUnits: 0,
          regularUnits: item.quantity,
          totalDiscount: 0,
        }));
      }

      // Create cart with total value - ensure all items have totalValue
      const cartWithTotalValue = normalizedCart.map((item) => ({
        ...item,
        totalValue: calculateItemTotalValue(item),
      }));

      // Filter out any invalid items and sort by total value (highest first)
      const validItems = cartWithTotalValue.filter(
        (item) =>
          item && typeof item.totalValue === "number" && !isNaN(item.totalValue)
      );

      if (validItems.length === 0) {
        return cartWithTotalValue.map((item) => ({
          ...item,
          discountedPrice: safeNumber(item.pricePerQuantity),
          discountedUnits: 0,
          regularUnits: safeNumber(item.quantity),
          totalDiscount: 0,
        }));
      }

      const sortedByTotalValue = [...validItems].sort(
        (a, b) => safeNumber(b.totalValue) - safeNumber(a.totalValue)
      );

      let totalDiscountAmount = 0;
      let discountedItems = [];

      if (sortedByTotalValue.length <= 2) {
        // If 1 or 2 items, apply 20% discount to the most expensive item's TOTAL VALUE
        const mostExpensiveItem = sortedByTotalValue[0];
        if (mostExpensiveItem && mostExpensiveItem.totalValue) {
          totalDiscountAmount =
            safeNumber(mostExpensiveItem.totalValue) * pwdSssDiscountRate;
          discountedItems = [mostExpensiveItem.id];
        }
      } else {
        // If 3 or more items, combine the TOTAL VALUE of the 2 most expensive items, then apply 20%
        const twoMostExpensive = sortedByTotalValue.slice(0, 2);
        const combinedTotalValue = twoMostExpensive.reduce(
          (sum, item) => sum + safeNumber(item.totalValue || 0),
          0
        );
        totalDiscountAmount = combinedTotalValue * pwdSssDiscountRate;
        discountedItems = twoMostExpensive.map((item) => item.id);
      }

      // Distribute the discount proportionally to the discounted items
      return cartWithTotalValue.map((item) => {
        const isDiscounted = discountedItems.includes(item.id);
        if (isDiscounted && item && item.totalValue) {
          // Calculate this item's share of the total discount based on its proportion of the discounted total
          const discountedItemsTotal = discountedItems.reduce(
            (sum, discountedId) => {
              const discountedItem = cartWithTotalValue.find(
                (cartItem) => cartItem && cartItem.id === discountedId
              );
              return sum + safeNumber(discountedItem?.totalValue || 0);
            },
            0
          );

          // Avoid division by zero
          const itemProportion =
            discountedItemsTotal > 0
              ? safeNumber(item.totalValue) / discountedItemsTotal
              : 0;
          const itemDiscount = totalDiscountAmount * itemProportion;

          return {
            ...item,
            discountedPrice: safeNumber(item.pricePerQuantity),
            discountedUnits: 0,
            regularUnits: safeNumber(item.quantity),
            totalDiscount: itemDiscount,
          };
        }
        return {
          ...item,
          discountedPrice: safeNumber(item.pricePerQuantity),
          discountedUnits: 0,
          regularUnits: safeNumber(item.quantity),
          totalDiscount: 0,
        };
      });
    } catch (error) {
      console.error("Error in applyPwdSssDiscount:", error);
      // Return original cart if there's an error
      return cart.map((item) => ({
        ...item,
        discountedPrice: safeNumber(item.pricePerQuantity),
        discountedUnits: 0,
        regularUnits: safeNumber(item.quantity),
        totalDiscount: 0,
      }));
    }
  };

  // Apply employee discount logic
  const applyEmployeeDiscount = (cart) => {
    const normalizedCart = addDefaultDiscountedPrice(cart);

    if (!employeeDiscountApplied) {
      return normalizedCart.map((item) => ({
        ...item,
        discountedUnits: 0,
        regularUnits: safeNumber(item.quantity),
        totalDiscount: item.totalDiscount || 0,
      }));
    }

    return normalizedCart.map((item) => ({
      ...item,
      discountedPrice: safeNumber(item.pricePerQuantity),
      discountedUnits: 0,
      regularUnits: safeNumber(item.quantity),
      totalDiscount: item.totalDiscount || 0,
    }));
  };

  // Apply redemption logic
  const applyRedemption = (cart) => {
    return cart.map((item) => ({
      ...item,
      isFree: item.isRedeemed || false,
    }));
  };

  // Process all discounts and redemption
  const processCart = (cart) => {
    try {
      let processedCart = [...cart];

      // Apply PWD/SSS discount first
      if (pwdSssDiscountApplied) {
        processedCart = applyPwdSssDiscount(processedCart);
      }

      // Apply redemption
      processedCart = applyRedemption(processedCart);

      return processedCart;
    } catch (error) {
      console.error("Error in processCart:", error);
      return cart; // Return original cart if processing fails
    }
  };

  const processedCart = processCart(cartData);
  const combinedCart = combineCartItems(processedCart);

  // Calculate total for an item considering discounted, regular units, and redemption
  const calculateItemTotal = (item) => {
    if (item.isFree) {
      return 0; // Redeemed item is free
    }

    const quantity = safeNumber(item.quantity);
    const pricePerQuantity = safeNumber(item.pricePerQuantity);

    // For PWD/SSS discount, we subtract the total discount from the item's total
    const itemTotalValue = quantity * pricePerQuantity;
    const discountAmount = safeNumber(item.totalDiscount) || 0;

    return Math.max(0, itemTotalValue - discountAmount);
  };

  // Calculate total price per item (quantity × price)
  const calculateItemTotalPrice = (item) => {
    return safeNumber(item.quantity) * safeNumber(item.pricePerQuantity);
  };

  // Generate unique key for each cart item
  const getUniqueKey = (item, index) => {
    return `${item.id}-${index}-${item.quantity}-${item.pricePerQuantity}-${item.isRedeemed}`;
  };

  // Quantity handlers
  const handleIncrement = (itemId) => {
    dispatch(incrementQuantity(itemId));
  };

  const handleDecrement = (itemId) => {
    dispatch(decrementQuantity(itemId));
  };

  // Individual redeem handler for each item
  const handleRedeemItem = (itemId, itemName) => {
    dispatch(redeemItem(itemId));
    setShowRedeemOptions(false);
    enqueueSnackbar(`${itemName} redeemed for free!`, {
      variant: "success",
    });
  };

  // Remove redemption handler
  const handleRemoveRedemption = () => {
    dispatch(removeRedemption());
    setShowRedeemOptions(false);
    enqueueSnackbar("Redemption removed!", { variant: "info" });
  };

  // Check if any item is redeemed
  const hasRedeemedItem = combinedCart.some((item) => item.isRedeemed);

  // Calculate base totals without employee discount
  const baseGrossTotal = combinedCart.reduce(
    (sum, item) =>
      sum + safeNumber(item.quantity) * safeNumber(item.pricePerQuantity),
    0
  );

  // Calculate PWD/SSS discount amount from totalDiscount fields
  const pwdSssDiscountAmount = combinedCart.reduce((sum, item) => {
    return sum + safeNumber(item.totalDiscount || 0);
  }, 0);

  const redemptionAmount = combinedCart.reduce((sum, item) => {
    if (item.isFree) {
      return sum + safeNumber(item.pricePerQuantity);
    }
    return sum;
  }, 0);

  // Calculate subtotal after PWD/SSS discount and redemption
  const subtotalAfterPwdSssAndRedemption =
    baseGrossTotal - pwdSssDiscountAmount - redemptionAmount;

  // Apply employee discount to subtotal
  const employeeDiscountAmount = employeeDiscountApplied
    ? subtotalAfterPwdSssAndRedemption * employeeDiscountRate
    : 0;

  // Apply shareholder discount to subtotal (after all other discounts)
  const subtotalAfterEmployeeDiscount =
    subtotalAfterPwdSssAndRedemption - employeeDiscountAmount;

  const shareholderDiscountAmount = shareholderDiscountApplied
    ? subtotalAfterEmployeeDiscount * shareholderDiscountRate
    : 0;

  const discountedTotal =
    subtotalAfterEmployeeDiscount - shareholderDiscountAmount;
  const netSales = discountedTotal / (1 + vatRate / 100);
  const vatAmount = discountedTotal - netSales;
  const total = Math.max(0, Number(discountedTotal.toFixed(2)));

  // Total discount amount for display
  const totalDiscountAmount =
    pwdSssDiscountAmount +
    employeeDiscountAmount +
    shareholderDiscountAmount +
    redemptionAmount;

  // Get discounted items for display
  const getDiscountedItemsInfo = () => {
    if (!pwdSssDiscountApplied || pwdSssDiscountAmount === 0) return null;

    const discountedItems = combinedCart.filter(
      (item) => safeNumber(item.totalDiscount || 0) > 0
    );

    if (discountedItems.length === 1) {
      return `PWD/SSS Discount (20% – 1 item)`;
    } else if (discountedItems.length === 2) {
      return `PWD/SSS Discount (20% – 2 items)`;
    }
    return `PWD/SSS Discount (20%)`;
  };

  const discountedItemsInfo = getDiscountedItemsInfo();

  // Handle discount exclusivity - only one discount can be applied at a time
  const handlePwdSssDiscount = () => {
    setPwdSssDiscountApplied(!pwdSssDiscountApplied);
    setEmployeeDiscountApplied(false);
    setShareholderDiscountApplied(false);
  };

  const handleEmployeeDiscount = () => {
    setEmployeeDiscountApplied(!employeeDiscountApplied);
    setPwdSssDiscountApplied(false);
    setShareholderDiscountApplied(false);
  };

  const handleShareholderDiscount = () => {
    setShareholderDiscountApplied(!shareholderDiscountApplied);
    setPwdSssDiscountApplied(false);
    setEmployeeDiscountApplied(false);
  };

  // FIXED: Order mutation with proper error handling
  const orderMutation = useMutation({
    mutationFn: (reqData) => addOrder(reqData),
    onSuccess: (res) => {
      console.log("Order success response:", res);

      if (!res || !res.data) {
        throw new Error("Invalid response from server");
      }

      const { data } = res.data;

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
          pricePerQuantity: safeNumber(item.pricePerQuantity),
          isFree: item.isFree || false,
        })),
        bills: {
          total: baseGrossTotal,
          tax: vatAmount,
          discount: totalDiscountAmount,
          totalWithTax: total,
          pwdSssDiscount: pwdSssDiscountAmount,
          employeeDiscount: employeeDiscountAmount,
          shareholderDiscount: shareholderDiscountAmount,
          redemptionDiscount: redemptionAmount,
        },
        paymentMethod: paymentMethod,
        orderDate: new Date().toISOString(),
      };

      setOrderInfo(invoiceOrderInfo);

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

        // Update table status
        updateTable(tableData).catch((error) => {
          console.error("Table update failed:", error);
          // Continue even if table update fails
        });
      }

      // Clear cart and customer data
      dispatch(removeCustomer());
      dispatch(removeAllItems());

      enqueueSnackbar("Order placed successfully!", { variant: "success" });
      setShowInvoice(true);
    },
    onError: (error) => {
      console.error("Order placement error:", error);
      console.error("Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to place order. Please try again.";

      enqueueSnackbar(errorMessage, { variant: "error" });
    },
  });

  // FIXED: Handle place order with better validation
  const handlePlaceOrder = async () => {
    console.log("Starting order placement...");

    // Validation
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

    // Validate total amount
    if (total <= 0) {
      enqueueSnackbar("Invalid order total. Please check your items.", {
        variant: "error",
      });
      return;
    }

    const tableId =
      customerData.tables?.[0]?.tableId ||
      customerData.table?.tableId ||
      customerData.tableId ||
      null;

    // Prepare bills data
    const bills = {
      netSales: Number(netSales.toFixed(2)),
      tax: Number(vatAmount.toFixed(2)),
      discount: Number(totalDiscountAmount.toFixed(2)),
      total: Number(total.toFixed(2)),
      totalWithTax: Number(total.toFixed(2)),
      pwdSssDiscount: Number(pwdSssDiscountAmount.toFixed(2)),
      employeeDiscount: Number(employeeDiscountAmount.toFixed(2)),
      shareholderDiscount: Number(shareholderDiscountAmount.toFixed(2)),
      redemptionDiscount: Number(redemptionAmount.toFixed(2)),
    };

    // Prepare items data - ensure all required fields are present
    const items = cartData.map((item) => ({
      name: item.name || "Unknown Item",
      quantity: safeNumber(item.quantity),
      pricePerQuantity: safeNumber(item.pricePerQuantity),
      price: safeNumber(item.price),
      isRedeemed: Boolean(item.isRedeemed),
      category: item.category || "general",
      id: item.id || Date.now().toString(),
    }));

    // Prepare order data
    const orderData = {
      customerDetails: {
        name: customerData.customerName || "Walk-in",
        phone: customerData.customerPhone || "Not provided",
        guests: safeNumber(customerData.guests) || 1,
      },
      orderStatus: "In Progress",
      bills,
      items,
      table: tableId,
      paymentMethod,
    };

    console.log("Sending order data:", orderData);

    // Handle payment methods
    if (paymentMethod === "Online") {
      try {
        console.log("Loading Razorpay script...");
        const loaded = await loadScript(
          "https://checkout.razorpay.com/v1/checkout.js"
        );

        if (!loaded) {
          enqueueSnackbar("Razorpay SDK failed to load!", { variant: "error" });
          return;
        }

        console.log("Creating Razorpay order...");
        const reqData = {
          amount: Math.round(total * 100), // Convert to paise
          currency: "INR",
        };

        const { data } = await createOrderRazorpay(reqData);
        console.log("Razorpay order created:", data);

        if (!data || !data.order) {
          throw new Error("Invalid response from Razorpay");
        }

        const options = {
          key: import.meta.env.VITE_RAZORPAY_KEY_ID,
          amount: data.order.amount,
          currency: data.order.currency,
          name: "DELISH",
          description: "Restaurant Order Payment",
          order_id: data.order.id,
          handler: async (response) => {
            console.log("Payment successful:", response);
            try {
              const verification = await verifyPaymentRazorpay(response);
              console.log("Payment verified:", verification);

              enqueueSnackbar("Payment successful! Placing order...", {
                variant: "success",
              });

              // Add payment data to order
              orderData.paymentData = {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              };

              // Submit order
              orderMutation.mutate(orderData);
            } catch (verificationError) {
              console.error("Payment verification failed:", verificationError);
              enqueueSnackbar("Payment verification failed!", {
                variant: "error",
              });
            }
          },
          prefill: {
            name: customerData.customerName || "Customer",
            email: "",
            contact: customerData.customerPhone || "",
          },
          theme: { color: "#2563eb" },
          modal: {
            ondismiss: function () {
              enqueueSnackbar("Payment cancelled", { variant: "info" });
            },
          },
        };

        const razorpay = new window.Razorpay(options);
        razorpay.open();
      } catch (err) {
        console.error("Razorpay error:", err);
        enqueueSnackbar(
          err.response?.data?.message || "Payment initialization failed!",
          { variant: "error" }
        );
      }
    } else {
      // Cash payment - directly submit order
      console.log("Processing cash order...");
      orderMutation.mutate(orderData);
    }
  };

  const handleCloseInvoice = () => {
    setShowInvoice(false);
    setTimeout(() => {
      navigate("/");
    }, 500);
  };

  // Handle redeem button click - show redeem options
  const handleShowRedeemOptions = () => {
    if (combinedCart.length === 0) {
      enqueueSnackbar("Cart is empty!", { variant: "warning" });
      return;
    }
    setShowRedeemOptions(true);
  };

  // Cancel redeem selection
  const handleCancelRedeem = () => {
    setShowRedeemOptions(false);
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
                className={`flex justify-between items-center px-3 py-2 rounded-md border mb-2 ${
                  item.isFree
                    ? "bg-green-50 border-green-200"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <div className="flex-1">
                  <p className="text-gray-900 text-sm font-medium">
                    {item.name}
                    {item.isFree && (
                      <span className="ml-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                        FREE
                      </span>
                    )}
                  </p>
                  <p className="text-gray-500 text-xs">
                    {item.quantity} × ₱
                    {safeNumber(item.pricePerQuantity).toFixed(2)} = ₱
                    {calculateItemTotalPrice(item).toFixed(2)}
                  </p>
                  {/* Show PWD/SSS discount info for discounted items */}
                  {pwdSssDiscountApplied &&
                    safeNumber(item.totalDiscount || 0) > 0 && (
                      <div className="text-green-600 text-xs">
                        <p>
                          20% Discount: -₱
                          {safeNumber(item.totalDiscount || 0).toFixed(2)}
                        </p>
                      </div>
                    )}
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center gap-2 mr-3">
                  <button
                    onClick={() => handleDecrement(item.id)}
                    className="w-6 h-6 flex items-center justify-center bg-gray-200 rounded-full text-gray-600 hover:bg-gray-300 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={item.quantity <= 1 || item.isFree}
                  >
                    -
                  </button>
                  <span className="text-gray-900 text-sm font-medium min-w-6 text-center">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => handleIncrement(item.id)}
                    className="w-6 h-6 flex items-center justify-center bg-gray-200 rounded-full text-gray-600 hover:bg-gray-300 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={item.isFree}
                  >
                    +
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <p className="text-gray-900 text-sm font-bold min-w-16 text-right">
                    {item.isFree ? (
                      <span className="text-green-600">FREE</span>
                    ) : (
                      `₱${calculateItemTotal(item).toFixed(2)}`
                    )}
                  </p>
                  <div className="flex flex-col gap-1">
                    {showRedeemOptions && !item.isFree && (
                      <button
                        onClick={() => handleRedeemItem(item.id, item.name)}
                        className="text-blue-500 hover:text-blue-700 text-xs font-semibold"
                      >
                        Redeem
                      </button>
                    )}
                    <button
                      onClick={() => dispatch(removeItem(item.id))}
                      className="text-red-500 hover:text-red-700 text-xs font-semibold"
                    >
                      Delete
                    </button>
                  </div>
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
              ₱{baseGrossTotal.toFixed(2)}
            </h1>
          </div>

          {pwdSssDiscountApplied && pwdSssDiscountAmount > 0 && (
            <div className="flex justify-between items-center text-green-600">
              <p className="text-xs font-medium">{discountedItemsInfo}</p>
              <h1 className="text-md font-bold">
                -₱{pwdSssDiscountAmount.toFixed(2)}
              </h1>
            </div>
          )}

          {hasRedeemedItem && (
            <div className="flex justify-between items-center text-blue-600">
              <p className="text-xs font-medium">Redemption Discount</p>
              <h1 className="text-md font-bold">
                -₱{redemptionAmount.toFixed(2)}
              </h1>
            </div>
          )}

          {employeeDiscountApplied && employeeDiscountAmount > 0 && (
            <div className="flex justify-between items-center text-yellow-600">
              <p className="text-xs font-medium">Employee Discount (15%)</p>
              <h1 className="text-md font-bold">
                -₱{employeeDiscountAmount.toFixed(2)}
              </h1>
            </div>
          )}

          {shareholderDiscountApplied && shareholderDiscountAmount > 0 && (
            <div className="flex justify-between items-center text-purple-600">
              <p className="text-xs font-medium">Shareholder Discount (10%)</p>
              <h1 className="text-md font-bold">
                -₱{shareholderDiscountAmount.toFixed(2)}
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

        {/* 🎟 DISCOUNT & REDEMPTION BUTTONS */}
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <button
            onClick={handlePwdSssDiscount}
            className={`flex-1 px-3 py-2 rounded-lg font-semibold text-xs shadow ${
              pwdSssDiscountApplied
                ? "bg-green-500 text-white"
                : "bg-green-100 text-green-700"
            }`}
          >
            {pwdSssDiscountApplied ? "PWD/SSS Applied" : "PWD/SSS (20%)"}
          </button>

          <button
            onClick={handleEmployeeDiscount}
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

          <button
            onClick={handleShareholderDiscount}
            className={`flex-1 px-3 py-2 rounded-lg font-semibold text-xs shadow ${
              shareholderDiscountApplied
                ? "bg-purple-500 text-white"
                : "bg-purple-100 text-purple-700"
            }`}
          >
            {shareholderDiscountApplied
              ? "Shareholder Applied"
              : "Shareholder (10%)"}
          </button>
        </div>

        {/* 🎟 REDEMPTION BUTTON */}
        <div className="flex flex-col sm:flex-row gap-3">
          {!hasRedeemedItem ? (
            showRedeemOptions ? (
              <button
                onClick={handleCancelRedeem}
                className="flex-1 px-3 py-2 rounded-lg font-semibold text-xs shadow bg-gray-500 text-white hover:bg-gray-600"
              >
                Cancel Redeem
              </button>
            ) : (
              <button
                onClick={handleShowRedeemOptions}
                className="flex-1 px-3 py-2 rounded-lg font-semibold text-xs shadow bg-blue-100 text-blue-700 hover:bg-blue-200"
              >
                Redeem (Free 1 Item)
              </button>
            )
          ) : (
            <button
              onClick={handleRemoveRedemption}
              className="flex-1 px-3 py-2 rounded-lg font-semibold text-xs shadow bg-red-500 text-white hover:bg-red-600"
            >
              Remove Redemption
            </button>
          )}
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
            className="w-full px-4 py-3 rounded-lg font-semibold text-sm bg-blue-600 text-white shadow hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
          >
            {orderMutation.isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Placing Order...
              </div>
            ) : (
              "Place Order"
            )}
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
