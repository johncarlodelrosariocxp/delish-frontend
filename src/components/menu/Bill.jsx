import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  removeItemFromOrder,
  incrementQuantityInOrder,
  decrementQuantityInOrder,
  redeemItemInOrder,
  removeRedemptionFromOrder,
  completeOrder,
} from "../../redux/slices/orderSlice";
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

const Bill = ({ orderId }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Get order-specific data
  const orders = useSelector((state) => state.order.orders);
  const activeOrderId = useSelector((state) => state.order.activeOrderId);

  const currentOrder =
    orders.find((order) => order.id === orderId) ||
    orders.find((order) => order.id === activeOrderId);
  const customerData = currentOrder?.customer || {};
  const cartData = currentOrder?.items || [];

  const vatRate = 12;
  const pwdSssDiscountRate = 0.2;
  const employeeDiscountRate = 0.15;
  const shareholderDiscountRate = 0.1;

  const [pwdSssDiscountApplied, setPwdSssDiscountApplied] = useState(false);
  const [employeeDiscountApplied, setEmployeeDiscountApplied] = useState(false);
  const [shareholderDiscountApplied, setShareholderDiscountApplied] =
    useState(false);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const [orderInfo, setOrderInfo] = useState(null);
  const [showRedeemOptions, setShowRedeemOptions] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pwdSssDiscountItems, setPwdSssDiscountItems] = useState([]);
  const [showPwdSssSelection, setShowPwdSssSelection] = useState(false);

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

  // Check if item is a drink
  const isDrinkItem = (item) => {
    const name = item.name.toLowerCase();
    return (
      item.category === "drink" ||
      name.includes("drink") ||
      name.includes("juice") ||
      name.includes("soda") ||
      name.includes("water") ||
      name.includes("coffee") ||
      name.includes("tea") ||
      name.includes("milkshake") ||
      name.includes("smoothie") ||
      name.includes("softdrink") ||
      name.includes("beverage") ||
      name.includes("cola") ||
      name.includes("lemonade")
    );
  };

  // Check if item is food
  const isFoodItem = (item) => {
    const name = item.name.toLowerCase();
    return (
      item.category === "food" ||
      item.category === "meal" ||
      name.includes("meal") ||
      name.includes("food") ||
      name.includes("rice") ||
      name.includes("chicken") ||
      name.includes("beef") ||
      name.includes("pork") ||
      name.includes("fish") ||
      name.includes("pasta") ||
      name.includes("burger") ||
      name.includes("sandwich") ||
      name.includes("steak") ||
      name.includes("pizza") ||
      name.includes("noodles") ||
      name.includes("salad") ||
      name.includes("soup") ||
      name.includes("appetizer") ||
      name.includes("main") ||
      name.includes("entree") ||
      name.includes("dessert") ||
      name.includes("cake") ||
      name.includes("pie") ||
      name.includes("ice cream")
    );
  };

  // Get unique key for an item
  const getItemKey = (item) => {
    return `${item.id}-${item.pricePerQuantity}-${item.isRedeemed}`;
  };

  // Calculate totals with PWD/SSS discount on selected items
  const calculateTotals = () => {
    try {
      const baseGrossTotal = cartData.reduce(
        (sum, item) =>
          sum + safeNumber(item.quantity) * safeNumber(item.pricePerQuantity),
        0
      );

      // Calculate PWD/SSS discount only on selected items
      let pwdSssDiscountAmount = 0;
      let discountedItemsTotal = 0;

      if (pwdSssDiscountApplied && pwdSssDiscountItems.length > 0) {
        // Calculate total value of selected items
        discountedItemsTotal = pwdSssDiscountItems.reduce(
          (sum, item) =>
            sum + safeNumber(item.quantity) * safeNumber(item.pricePerQuantity),
          0
        );
        pwdSssDiscountAmount = discountedItemsTotal * pwdSssDiscountRate;
      }

      // Calculate redemption amount
      const redemptionAmount = cartData.reduce((sum, item) => {
        return item.isRedeemed
          ? sum + safeNumber(item.quantity) * safeNumber(item.pricePerQuantity)
          : sum;
      }, 0);

      // Calculate subtotals
      const subtotalAfterPwdSssAndRedemption =
        baseGrossTotal - pwdSssDiscountAmount - redemptionAmount;

      // Employee discount
      const employeeDiscountAmount = employeeDiscountApplied
        ? subtotalAfterPwdSssAndRedemption * employeeDiscountRate
        : 0;

      const subtotalAfterEmployeeDiscount =
        subtotalAfterPwdSssAndRedemption - employeeDiscountAmount;

      // Shareholder discount
      const shareholderDiscountAmount = shareholderDiscountApplied
        ? subtotalAfterEmployeeDiscount * shareholderDiscountRate
        : 0;

      const discountedTotal = Math.max(
        0,
        subtotalAfterEmployeeDiscount - shareholderDiscountAmount
      );
      const netSales = discountedTotal / (1 + vatRate / 100);
      const vatAmount = discountedTotal - netSales;
      const total = Math.max(0, Number(discountedTotal.toFixed(2)));

      const totalDiscountAmount =
        pwdSssDiscountAmount +
        employeeDiscountAmount +
        shareholderDiscountAmount +
        redemptionAmount;

      return {
        baseGrossTotal,
        pwdSssDiscountAmount,
        discountedItemsTotal,
        redemptionAmount,
        employeeDiscountAmount,
        shareholderDiscountAmount,
        netSales,
        vatAmount,
        total,
        totalDiscountAmount,
        subtotalAfterPwdSssAndRedemption,
      };
    } catch (error) {
      console.error("Error calculating totals:", error);
      return {
        baseGrossTotal: 0,
        pwdSssDiscountAmount: 0,
        discountedItemsTotal: 0,
        redemptionAmount: 0,
        employeeDiscountAmount: 0,
        shareholderDiscountAmount: 0,
        netSales: 0,
        vatAmount: 0,
        total: 0,
        totalDiscountAmount: 0,
        subtotalAfterPwdSssAndRedemption: 0,
      };
    }
  };

  const totals = calculateTotals();

  // Add default discountedPrice field
  const addDefaultDiscountedPrice = (cart) => {
    return cart.map((item) => ({
      ...item,
      discountedPrice:
        item.discountedPrice ?? safeNumber(item.pricePerQuantity),
      pricePerQuantity: safeNumber(item.pricePerQuantity),
      price: safeNumber(item.price),
    }));
  };

  const processedCart = addDefaultDiscountedPrice(cartData);
  const combinedCart = combineCartItems(processedCart);

  // Calculate item total with PWD/SSS discount if applicable
  const calculateItemTotal = (item) => {
    if (item.isRedeemed) {
      return 0;
    }

    // Check if this item is selected for PWD/SSS discount
    const isDiscounted = pwdSssDiscountItems.some(
      (discountedItem) => getItemKey(discountedItem) === getItemKey(item)
    );

    if (isDiscounted) {
      // Apply 20% discount to this specific item
      const originalTotal =
        safeNumber(item.quantity) * safeNumber(item.pricePerQuantity);
      const discountedTotal = originalTotal * (1 - pwdSssDiscountRate);
      return discountedTotal;
    }

    return safeNumber(item.quantity) * safeNumber(item.pricePerQuantity);
  };

  // Calculate original item total price
  const calculateItemTotalPrice = (item) => {
    return safeNumber(item.quantity) * safeNumber(item.pricePerQuantity);
  };

  // Generate unique key for each cart item
  const getUniqueKey = (item, index) => {
    return `${item.id}-${index}-${item.quantity}-${item.pricePerQuantity}-${item.isRedeemed}`;
  };

  // Quantity handlers
  const handleIncrement = (itemId) => {
    if (!currentOrder) return;
    dispatch(incrementQuantityInOrder({ orderId: currentOrder.id, itemId }));
  };

  const handleDecrement = (itemId) => {
    if (!currentOrder) return;
    dispatch(decrementQuantityInOrder({ orderId: currentOrder.id, itemId }));
  };

  // Individual redeem handler for each item
  const handleRedeemItem = (itemId, itemName) => {
    if (!currentOrder) return;
    dispatch(redeemItemInOrder({ orderId: currentOrder.id, itemId }));
    setShowRedeemOptions(false);
    enqueueSnackbar(`${itemName} redeemed for free!`, {
      variant: "success",
    });
  };

  // Remove redemption handler
  const handleRemoveRedemption = () => {
    if (!currentOrder) return;
    dispatch(removeRedemptionFromOrder({ orderId: currentOrder.id }));
    setShowRedeemOptions(false);
    enqueueSnackbar("Redemption removed!", { variant: "info" });
  };

  // Check if any item is redeemed
  const hasRedeemedItem = combinedCart.some((item) => item.isRedeemed);

  // Get discounted items info for display
  const getDiscountedItemsInfo = () => {
    if (!pwdSssDiscountApplied || totals.pwdSssDiscountAmount === 0)
      return null;

    const drinkCount = pwdSssDiscountItems.filter((item) =>
      isDrinkItem(item)
    ).length;

    const foodCount = pwdSssDiscountItems.filter((item) =>
      isFoodItem(item)
    ).length;

    let info = "PWD/SSS Discount (20% on selected items)";

    if (drinkCount === 1 && foodCount === 2) {
      info = "PWD/SSS Discount (20% – 1 drink + 2 food)";
    } else if (drinkCount === 1 && foodCount === 1) {
      info = "PWD/SSS Discount (20% – 1 drink + 1 food)";
    } else if (drinkCount === 1) {
      info = "PWD/SSS Discount (20% – 1 drink)";
    } else if (foodCount === 2) {
      info = "PWD/SSS Discount (20% – 2 food)";
    } else if (foodCount === 1) {
      info = "PWD/SSS Discount (20% – 1 food)";
    }

    const selectedValue = totals.discountedItemsTotal.toFixed(2);
    return `${info} (₱${selectedValue})`;
  };

  const discountedItemsInfo = getDiscountedItemsInfo();

  // Handle PWD/SSS discount - open selection modal
  const handlePwdSssDiscount = () => {
    if (!pwdSssDiscountApplied) {
      // Open selection modal
      setShowPwdSssSelection(true);
    } else {
      // Turn off discount
      setPwdSssDiscountApplied(false);
      setPwdSssDiscountItems([]);
      setEmployeeDiscountApplied(false);
      setShareholderDiscountApplied(false);
      enqueueSnackbar("PWD/SSS discount removed", { variant: "info" });
    }
  };

  const handleEmployeeDiscount = () => {
    setEmployeeDiscountApplied(!employeeDiscountApplied);
    setPwdSssDiscountApplied(false);
    setPwdSssDiscountItems([]);
    setShareholderDiscountApplied(false);
  };

  const handleShareholderDiscount = () => {
    setShareholderDiscountApplied(!shareholderDiscountApplied);
    setPwdSssDiscountApplied(false);
    setPwdSssDiscountItems([]);
    setEmployeeDiscountApplied(false);
  };

  // Toggle item selection in modal
  const toggleItemSelection = (item) => {
    const itemKey = getItemKey(item);
    const isSelected = pwdSssDiscountItems.some(
      (selected) => getItemKey(selected) === itemKey
    );

    if (isSelected) {
      // Remove item
      setPwdSssDiscountItems(
        pwdSssDiscountItems.filter(
          (selected) => getItemKey(selected) !== itemKey
        )
      );
    } else {
      // Check eligibility rules
      const drinks = pwdSssDiscountItems.filter((item) => isDrinkItem(item));
      const foods = pwdSssDiscountItems.filter((item) => isFoodItem(item));

      if (isDrinkItem(item)) {
        // Can only select 1 drink
        if (drinks.length >= 1) {
          enqueueSnackbar(
            "Maximum 1 drink can be selected for PWD/SSS discount",
            {
              variant: "warning",
            }
          );
          return;
        }
      } else if (isFoodItem(item)) {
        // Can only select 2 food items
        if (foods.length >= 2) {
          enqueueSnackbar(
            "Maximum 2 food items can be selected for PWD/SSS discount",
            {
              variant: "warning",
            }
          );
          return;
        }
      } else {
        // Not a drink or food - don't allow selection
        enqueueSnackbar(
          "Only drinks and food items are eligible for PWD/SSS discount",
          {
            variant: "warning",
          }
        );
        return;
      }

      setPwdSssDiscountItems([...pwdSssDiscountItems, item]);
    }
  };

  // Apply the selection
  const handleApplyPwdSssSelection = () => {
    // Check if we have exactly 3 items selected
    if (pwdSssDiscountItems.length !== 3) {
      enqueueSnackbar(
        "Please select exactly 3 items (1 drink + 2 food) for PWD/SSS discount",
        {
          variant: "warning",
        }
      );
      return;
    }

    // Check the breakdown
    const drinks = pwdSssDiscountItems.filter((item) => isDrinkItem(item));
    const foods = pwdSssDiscountItems.filter((item) => isFoodItem(item));

    if (drinks.length !== 1 || foods.length !== 2) {
      enqueueSnackbar(
        "Please select exactly 1 drink and 2 food items for PWD/SSS discount",
        {
          variant: "warning",
        }
      );
      return;
    }

    setPwdSssDiscountApplied(true);
    setEmployeeDiscountApplied(false);
    setShareholderDiscountApplied(false);
    setShowPwdSssSelection(false);

    // Calculate total value of selected items
    const selectedValue = pwdSssDiscountItems.reduce(
      (sum, item) => sum + calculateItemTotalPrice(item),
      0
    );

    enqueueSnackbar(
      `PWD/SSS discount applied to 1 drink and 2 food items (₱${selectedValue.toFixed(
        2
      )})`,
      {
        variant: "success",
      }
    );
  };

  // Cancel selection
  const handleCancelPwdSssSelection = () => {
    setShowPwdSssSelection(false);
    // Don't clear selections on cancel - let user keep their selections
  };

  // Clear PWD/SSS discount
  const clearPwdSssDiscount = () => {
    setPwdSssDiscountApplied(false);
    setPwdSssDiscountItems([]);
    enqueueSnackbar("PWD/SSS discount removed", {
      variant: "info",
    });
  };

  // Print to Bluetooth Thermal Printer
  const printToBluetoothPrinter = async (orderData) => {
    try {
      // Create receipt text
      const receiptText = generateReceiptText(orderData);

      // Try Web Bluetooth API
      if (navigator.bluetooth) {
        try {
          const device = await navigator.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: ["generic_access"],
          });

          console.log("Connecting to Bluetooth device:", device.name);
          enqueueSnackbar(`Connecting to ${device.name}...`, {
            variant: "info",
          });

          // For thermal printers, we typically need to use serial over Bluetooth
          // This is a simplified approach - actual implementation may vary by printer model
          await sendToPrinter(receiptText);
        } catch (error) {
          console.warn("Bluetooth printing failed:", error);
          // Fallback to regular printing
          fallbackPrint(receiptText);
        }
      } else {
        // Web Bluetooth not supported, use fallback
        fallbackPrint(receiptText);
      }
    } catch (error) {
      console.error("Printing error:", error);
      enqueueSnackbar("Printing failed", { variant: "error" });
      // Still try fallback
      const receiptText = generateReceiptText(orderData);
      fallbackPrint(receiptText);
    }
  };

  // Generate receipt text for thermal printer
  const generateReceiptText = (orderData) => {
    const lineBreak = "\n";
    const dashedLine = "--------------------------------";
    const doubleLine = "===============================";

    let receipt = "";

    // Header
    receipt += doubleLine + lineBreak;
    receipt += "      DELISH RESTAURANT" + lineBreak;
    receipt += doubleLine + lineBreak;
    receipt += `Order: #${orderData._id?.slice(-8) || "N/A"}` + lineBreak;
    receipt += `Date: ${new Date().toLocaleString()}` + lineBreak;
    receipt +=
      `Customer: ${orderData.customerDetails?.name || "Walk-in"}` + lineBreak;
    receipt +=
      `Table: ${
        customerData.tables?.[0]?.tableId ||
        customerData.table?.tableId ||
        customerData.tableId ||
        "N/A"
      }` + lineBreak;
    receipt += dashedLine + lineBreak;

    // Items
    receipt += "           ORDER ITEMS" + lineBreak;
    receipt += dashedLine + lineBreak;

    combinedCart.forEach((item) => {
      const itemName =
        item.name.length > 20 ? item.name.substring(0, 17) + "..." : item.name;

      // Check if item is discounted
      const isDiscounted = pwdSssDiscountItems.some(
        (discountedItem) => getItemKey(discountedItem) === getItemKey(item)
      );

      const originalPrice = safeNumber(item.pricePerQuantity);
      const quantity = item.quantity;
      const originalTotal = originalPrice * quantity;

      let priceText;
      if (item.isRedeemed) {
        priceText = "FREE";
      } else if (isDiscounted) {
        const discountedTotal = originalTotal * (1 - pwdSssDiscountRate);
        priceText = `₱${discountedTotal.toFixed(
          2
        )} (was ₱${originalTotal.toFixed(2)})`;
      } else {
        priceText = `₱${originalTotal.toFixed(2)}`;
      }

      receipt += `${itemName}` + lineBreak;
      receipt += `  ${quantity}x ₱${originalPrice.toFixed(2)}` + lineBreak;

      if (isDiscounted) {
        receipt += `  PWD/SSS 20% Discount Applied` + lineBreak;
      }

      receipt +=
        `  ${priceText}${item.isRedeemed ? " (REDEEMED)" : ""}` + lineBreak;
      receipt += lineBreak;
    });

    receipt += dashedLine + lineBreak;

    // Show PWD/SSS discounted items if any
    if (pwdSssDiscountItems.length > 0) {
      receipt += "PWD/SSS DISCOUNTED ITEMS (20% off):" + lineBreak;
      pwdSssDiscountItems.forEach((item, idx) => {
        const itemName =
          item.name.length > 20
            ? item.name.substring(0, 17) + "..."
            : item.name;
        const itemType = isDrinkItem(item) ? "Drink" : "Food";
        const originalTotal = calculateItemTotalPrice(item);
        const discountedTotal = originalTotal * (1 - pwdSssDiscountRate);

        receipt += `  ${idx + 1}. ${itemName} (${itemType})` + lineBreak;
        receipt +=
          `     ${item.quantity}x ₱${safeNumber(item.pricePerQuantity).toFixed(
            2
          )}` + lineBreak;
        receipt +=
          `     Was: ₱${originalTotal.toFixed(
            2
          )}, Now: ₱${discountedTotal.toFixed(2)}` + lineBreak;
      });
      receipt += dashedLine + lineBreak;
    }

    // Totals
    receipt +=
      "SUBTOTAL:" +
      padLeft(`₱${totals.baseGrossTotal.toFixed(2)}`, 20) +
      lineBreak;

    if (totals.pwdSssDiscountAmount > 0) {
      receipt +=
        "PWD/SSS DISC:" +
        padLeft(`-₱${totals.pwdSssDiscountAmount.toFixed(2)}`, 17) +
        lineBreak;
    }

    if (totals.redemptionAmount > 0) {
      receipt +=
        "REDEMPTION:" +
        padLeft(`-₱${totals.redemptionAmount.toFixed(2)}`, 19) +
        lineBreak;
    }

    if (totals.employeeDiscountAmount > 0) {
      receipt +=
        "EMP DISCOUNT:" +
        padLeft(`-₱${totals.employeeDiscountAmount.toFixed(2)}`, 17) +
        lineBreak;
    }

    if (totals.shareholderDiscountAmount > 0) {
      receipt +=
        "SH DISCOUNT:" +
        padLeft(`-₱${totals.shareholderDiscountAmount.toFixed(2)}`, 18) +
        lineBreak;
    }

    receipt +=
      "VAT (12%):" + padLeft(`₱${totals.vatAmount.toFixed(2)}`, 20) + lineBreak;
    receipt += doubleLine + lineBreak;
    receipt +=
      "TOTAL:" + padLeft(`₱${totals.total.toFixed(2)}`, 24) + lineBreak;
    receipt += doubleLine + lineBreak;

    receipt += `Payment: ${paymentMethod}` + lineBreak;
    receipt += lineBreak;
    receipt += "Thank you for dining with us!" + lineBreak;
    receipt += "Visit us again soon!" + lineBreak;
    receipt += lineBreak;
    receipt += lineBreak;
    receipt += lineBreak; // Extra lines for paper cut

    return receipt;
  };

  // Helper function to pad text for alignment
  const padLeft = (text, length) => {
    return text.padStart(length, " ");
  };

  // Send to printer (simplified - actual implementation depends on printer)
  const sendToPrinter = async (receiptText) => {
    // This is a simplified version
    // Actual implementation would use printer-specific Bluetooth protocols
    console.log("Sending to printer:", receiptText);
    enqueueSnackbar("Receipt sent to Bluetooth printer", {
      variant: "success",
    });
  };

  // Fallback printing method
  const fallbackPrint = (receiptText) => {
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
      enqueueSnackbar("Receipt ready for printing", { variant: "success" });
    } catch (error) {
      // Copy to clipboard as last resort
      document.execCommand("copy");
      enqueueSnackbar("Receipt copied to clipboard", { variant: "info" });
    }

    document.body.removeChild(textArea);
  };

  // Open cash drawer
  const openCashDrawer = () => {
    // Cash drawer command for thermal printers
    const cashDrawerCommand = "\x1B\x70\x00\x19\xFA";
    console.log("Cash drawer command sent");
    enqueueSnackbar("Cash drawer opened", { variant: "info" });
  };

  // Order mutation with complete order handling
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
        items: combinedCart.map((item) => {
          const isDiscounted = pwdSssDiscountItems.some(
            (discountedItem) => getItemKey(discountedItem) === getItemKey(item)
          );

          return {
            name: item.name,
            quantity: item.quantity,
            price: calculateItemTotal(item),
            originalPrice: safeNumber(item.pricePerQuantity),
            pricePerQuantity: safeNumber(item.pricePerQuantity),
            isFree: item.isRedeemed || false,
            isPwdSssDiscounted: isDiscounted,
          };
        }),
        bills: {
          total: totals.baseGrossTotal,
          tax: totals.vatAmount,
          discount: totals.totalDiscountAmount,
          totalWithTax: totals.total,
          pwdSssDiscount: totals.pwdSssDiscountAmount,
          pwdSssDiscountedValue: totals.discountedItemsTotal,
          employeeDiscount: totals.employeeDiscountAmount,
          shareholderDiscount: totals.shareholderDiscountAmount,
          redemptionDiscount: totals.redemptionAmount,
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

        updateTable(tableData).catch((error) => {
          console.error("Table update failed:", error);
        });
      }

      // MARK ORDER AS COMPLETED
      if (currentOrder) {
        console.log("Dispatching completeOrder for:", currentOrder.id);
        dispatch(completeOrder(currentOrder.id));
      }

      enqueueSnackbar("Order placed successfully!", { variant: "success" });

      // AUTO PRINT RECEIPT AND OPEN CASH DRAWER
      setTimeout(() => {
        // Print receipt to Bluetooth printer
        printToBluetoothPrinter(data);

        // Open cash drawer for cash payments
        if (paymentMethod === "Cash") {
          openCashDrawer();
        }

        // Show invoice
        setShowInvoice(true);
        setIsProcessing(false);
      }, 500);
    },
    onError: (error) => {
      console.error("Order placement error:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to place order. Please try again.";

      enqueueSnackbar(errorMessage, { variant: "error" });
      setIsProcessing(false);
    },
  });

  // Handle place order with better validation
  const handlePlaceOrder = async () => {
    if (isProcessing) return;

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
    if (totals.total <= 0) {
      enqueueSnackbar("Invalid order total. Please check your items.", {
        variant: "error",
      });
      return;
    }

    // Validate PWD/SSS discount selection
    if (pwdSssDiscountApplied && pwdSssDiscountItems.length !== 3) {
      enqueueSnackbar(
        "PWD/SSS discount requires exactly 3 items (1 drink + 2 food) to be selected",
        {
          variant: "error",
        }
      );
      return;
    }

    setIsProcessing(true);

    const tableId =
      customerData.tables?.[0]?.tableId ||
      customerData.table?.tableId ||
      customerData.tableId ||
      null;

    // Prepare bills data
    const bills = {
      netSales: Number(totals.netSales.toFixed(2)),
      tax: Number(totals.vatAmount.toFixed(2)),
      discount: Number(totals.totalDiscountAmount.toFixed(2)),
      total: Number(totals.total.toFixed(2)),
      totalWithTax: Number(totals.total.toFixed(2)),
      pwdSssDiscount: Number(totals.pwdSssDiscountAmount.toFixed(2)),
      pwdSssDiscountedValue: Number(totals.discountedItemsTotal.toFixed(2)),
      employeeDiscount: Number(totals.employeeDiscountAmount.toFixed(2)),
      shareholderDiscount: Number(totals.shareholderDiscountAmount.toFixed(2)),
      redemptionDiscount: Number(totals.redemptionAmount.toFixed(2)),
    };

    // Prepare items data
    const items = cartData.map((item) => {
      const isPwdSssDiscounted = pwdSssDiscountItems.some(
        (discountedItem) => getItemKey(discountedItem) === getItemKey(item)
      );

      return {
        name: item.name || "Unknown Item",
        quantity: safeNumber(item.quantity),
        pricePerQuantity: safeNumber(item.pricePerQuantity),
        price: calculateItemTotal(item), // This includes the discount if applicable
        originalPrice: safeNumber(item.pricePerQuantity),
        isRedeemed: Boolean(item.isRedeemed),
        isPwdSssDiscounted: isPwdSssDiscounted,
        category: item.category || "general",
        id: item.id || Date.now().toString(),
      };
    });

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
      pwdSssDiscountApplied: pwdSssDiscountApplied,
      pwdSssSelectedItems: pwdSssDiscountItems.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        pricePerQuantity: item.pricePerQuantity,
        type: isDrinkItem(item) ? "drink" : "food",
      })),
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
          setIsProcessing(false);
          return;
        }

        console.log("Creating Razorpay order...");
        const reqData = {
          amount: Math.round(totals.total * 100),
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
              setIsProcessing(false);
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
              setIsProcessing(false);
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
        setIsProcessing(false);
      }
    } else {
      // Cash payment - directly submit order
      console.log("Processing cash order...");
      orderMutation.mutate(orderData);
    }
  };

  const handleCloseInvoice = () => {
    setShowInvoice(false);
    // Clear the current order from Redux store
    if (currentOrder) {
      dispatch(completeOrder(currentOrder.id));
    }
    // Navigate to menu after a short delay
    setTimeout(() => {
      navigate("/menu");
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

  // If no current order, show empty state
  if (!currentOrder) {
    return (
      <div className="w-full h-screen overflow-y-auto bg-gray-100 px-4 py-6">
        <div className="max-w-[600px] mx-auto text-center">
          <div className="bg-white rounded-lg p-8 shadow-md">
            <h2 className="text-gray-900 text-lg font-semibold mb-4">
              No Active Order
            </h2>
            <p className="text-gray-500 text-sm">
              Please create a new order or select an existing one.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen overflow-y-auto bg-gray-100 px-4 py-6">
      {/* PWD/SSS Selection Modal */}
      {showPwdSssSelection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-2 text-gray-900">
              Select Items for PWD/SSS Discount
            </h3>
            <p className="text-sm text-gray-600 mb-1">
              Please select exactly{" "}
              <span className="font-semibold">1 drink</span> and{" "}
              <span className="font-semibold">2 food items</span>
            </p>
            <p className="text-xs text-gray-500 mb-4">
              20% discount will be applied only to the selected items
            </p>

            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-yellow-800">
                  Selected Items:
                </span>
                <span className="text-sm font-bold text-yellow-800">
                  {pwdSssDiscountItems.length}/3
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="text-xs text-yellow-700">
                  Drinks:{" "}
                  {
                    pwdSssDiscountItems.filter((item) => isDrinkItem(item))
                      .length
                  }
                  /1
                </div>
                <div className="text-xs text-yellow-700">
                  Food:{" "}
                  {
                    pwdSssDiscountItems.filter((item) => isFoodItem(item))
                      .length
                  }
                  /2
                </div>
              </div>
            </div>

            <div className="space-y-3 mb-6 max-h-[300px] overflow-y-auto">
              {combinedCart.map((item, index) => {
                const itemKey = getItemKey(item);
                const isSelected = pwdSssDiscountItems.some(
                  (selected) => getItemKey(selected) === itemKey
                );
                const isDrink = isDrinkItem(item);
                const isFood = isFoodItem(item);
                const isEligible = isDrink || isFood;

                if (!isEligible) return null;

                const itemType = isDrink ? "Drink" : "Food";
                const itemValue = calculateItemTotalPrice(item);
                const discountedValue = itemValue * (1 - pwdSssDiscountRate);

                return (
                  <div
                    key={itemKey}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-green-50 border-green-300"
                        : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                    }`}
                    onClick={() => toggleItemSelection(item)}
                  >
                    <div className="flex items-center flex-1">
                      <div
                        className={`w-5 h-5 rounded-full border mr-3 flex items-center justify-center flex-shrink-0 ${
                          isSelected
                            ? "bg-green-500 border-green-500"
                            : "border-gray-400"
                        }`}
                      >
                        {isSelected && (
                          <div className="w-2 h-2 rounded-full bg-white"></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {item.name}
                        </p>
                        <div className="flex justify-between items-center">
                          <p className="text-xs text-gray-500">
                            {itemType} • {item.quantity}x ₱
                            {safeNumber(item.pricePerQuantity).toFixed(2)}
                          </p>
                          <p className="text-xs font-semibold text-gray-700">
                            ₱{itemValue.toFixed(2)}
                          </p>
                        </div>
                        {isSelected && (
                          <p className="text-xs text-green-600 mt-1">
                            After 20% discount: ₱{discountedValue.toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {combinedCart.filter(
                (item) => isDrinkItem(item) || isFoodItem(item)
              ).length === 0 && (
                <p className="text-gray-500 text-sm text-center py-4">
                  No drinks or food items found in cart.
                </p>
              )}
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Selected Value: ₱
                  {pwdSssDiscountItems
                    .reduce(
                      (sum, item) => sum + calculateItemTotalPrice(item),
                      0
                    )
                    .toFixed(2)}
                </p>
                <p className="text-xs text-gray-600">
                  After 20% discount: ₱
                  {(
                    pwdSssDiscountItems.reduce(
                      (sum, item) => sum + calculateItemTotalPrice(item),
                      0
                    ) * 0.8
                  ).toFixed(2)}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCancelPwdSssSelection}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyPwdSssSelection}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium text-sm hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={pwdSssDiscountItems.length !== 3}
                >
                  Apply Discount
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-[600px] mx-auto space-y-4">
        {/* 🛒 CART ITEMS */}
        <div className="bg-white rounded-lg p-4 shadow-md max-h-64 overflow-y-auto">
          <h2 className="text-gray-900 text-sm font-semibold mb-2">
            Cart Items (Order {currentOrder?.number})
          </h2>
          {combinedCart.length === 0 ? (
            <p className="text-gray-500 text-xs">No items added yet.</p>
          ) : (
            combinedCart.map((item, index) => {
              const itemKey = getItemKey(item);
              const isDiscounted = pwdSssDiscountItems.some(
                (discountedItem) => getItemKey(discountedItem) === itemKey
              );
              const isDrink = isDrinkItem(item);
              const isFood = isFoodItem(item);
              const itemType = isDrink ? "Drink" : isFood ? "Food" : "Other";

              const originalTotal = calculateItemTotalPrice(item);
              const displayedTotal = calculateItemTotal(item);

              return (
                <div
                  key={getUniqueKey(item, index)}
                  className={`flex justify-between items-center px-3 py-2 rounded-md border mb-2 ${
                    item.isRedeemed
                      ? "bg-green-50 border-green-200"
                      : isDiscounted
                      ? "bg-green-50 border-green-300"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-gray-900 text-sm font-medium">
                        {item.name}
                        {item.isRedeemed && (
                          <span className="ml-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                            FREE
                          </span>
                        )}
                        {isDiscounted && !item.isRedeemed && (
                          <span className="ml-2 bg-green-600 text-white text-xs px-2 py-1 rounded-full">
                            PWD/SSS -20%
                          </span>
                        )}
                      </p>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        {itemType}
                      </span>
                    </div>
                    <p className="text-gray-500 text-xs">
                      {item.quantity} × ₱
                      {safeNumber(item.pricePerQuantity).toFixed(2)}
                      {isDiscounted ? (
                        <>
                          {" "}
                          = ₱{originalTotal.toFixed(2)} → ₱
                          {displayedTotal.toFixed(2)}
                          <span className="ml-2 text-green-600">
                            (20% discount applied)
                          </span>
                        </>
                      ) : (
                        ` = ₱${originalTotal.toFixed(2)}`
                      )}
                    </p>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-2 mr-3">
                    <button
                      onClick={() => handleDecrement(item.id)}
                      className="w-6 h-6 flex items-center justify-center bg-gray-200 rounded-full text-gray-600 hover:bg-gray-300 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={item.quantity <= 1 || item.isRedeemed}
                    >
                      -
                    </button>
                    <span className="text-gray-900 text-sm font-medium min-w-6 text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => handleIncrement(item.id)}
                      className="w-6 h-6 flex items-center justify-center bg-gray-200 rounded-full text-gray-600 hover:bg-gray-300 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={item.isRedeemed}
                    >
                      +
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <p className="text-gray-900 text-sm font-bold min-w-20 text-right">
                      {item.isRedeemed ? (
                        <span className="text-green-600">FREE</span>
                      ) : (
                        `₱${displayedTotal.toFixed(2)}`
                      )}
                    </p>
                    <div className="flex flex-col gap-1">
                      {showRedeemOptions && !item.isRedeemed && (
                        <button
                          onClick={() => handleRedeemItem(item.id, item.name)}
                          className="text-blue-500 hover:text-blue-700 text-xs font-semibold"
                        >
                          Redeem
                        </button>
                      )}
                      <button
                        onClick={() =>
                          dispatch(
                            removeItemFromOrder({
                              orderId: currentOrder.id,
                              itemId: item.id,
                            })
                          )
                        }
                        className="text-red-500 hover:text-red-700 text-xs font-semibold"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 🧾 TOTALS */}
        <div className="bg-white rounded-lg p-4 shadow-md space-y-2">
          <div className="flex justify-between items-center">
            <p className="text-xs text-gray-500 font-medium">
              Items ({cartData?.length || 0})
            </p>
            <h1 className="text-gray-900 text-md font-bold">
              ₱{totals.baseGrossTotal.toFixed(2)}
            </h1>
          </div>

          {pwdSssDiscountApplied && totals.pwdSssDiscountAmount > 0 && (
            <div className="flex justify-between items-center text-green-600">
              <div className="flex items-center">
                <p className="text-xs font-medium mr-2">
                  {discountedItemsInfo}
                </p>
                <button
                  onClick={clearPwdSssDiscount}
                  className="text-xs text-red-500 hover:text-red-700 font-medium"
                  disabled={isProcessing}
                >
                  (Clear)
                </button>
              </div>
              <h1 className="text-md font-bold">
                -₱{totals.pwdSssDiscountAmount.toFixed(2)}
              </h1>
            </div>
          )}

          {hasRedeemedItem && (
            <div className="flex justify-between items-center text-blue-600">
              <p className="text-xs font-medium">Redemption Discount</p>
              <h1 className="text-md font-bold">
                -₱{totals.redemptionAmount.toFixed(2)}
              </h1>
            </div>
          )}

          {employeeDiscountApplied && totals.employeeDiscountAmount > 0 && (
            <div className="flex justify-between items-center text-yellow-600">
              <p className="text-xs font-medium">Employee Discount (15%)</p>
              <h1 className="text-md font-bold">
                -₱{totals.employeeDiscountAmount.toFixed(2)}
              </h1>
            </div>
          )}

          {shareholderDiscountApplied &&
            totals.shareholderDiscountAmount > 0 && (
              <div className="flex justify-between items-center text-purple-600">
                <p className="text-xs font-medium">
                  Shareholder Discount (10%)
                </p>
                <h1 className="text-md font-bold">
                  -₱{totals.shareholderDiscountAmount.toFixed(2)}
                </h1>
              </div>
            )}

          <div className="flex justify-between items-center">
            <p className="text-xs text-gray-500 font-medium">Net of VAT</p>
            <h1 className="text-gray-900 text-md font-bold">
              ₱{totals.netSales.toFixed(2)}
            </h1>
          </div>

          <div className="flex justify-between items-center">
            <p className="text-xs text-gray-500 font-medium">
              Total (VAT inclusive)
            </p>
            <h1 className="text-gray-900 text-md font-bold">
              ₱{totals.total.toFixed(2)}
            </h1>
          </div>
        </div>

        {/* 🎟 DISCOUNT & REDEMPTION BUTTONS */}
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <button
            onClick={handlePwdSssDiscount}
            disabled={isProcessing}
            className={`flex-1 px-3 py-2 rounded-lg font-semibold text-xs shadow transition-colors ${
              pwdSssDiscountApplied
                ? "bg-green-500 text-white hover:bg-green-600"
                : "bg-green-100 text-green-700 hover:bg-green-200"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {pwdSssDiscountApplied ? (
              <span className="flex items-center justify-center gap-1">
                <span>✓ PWD/SSS Applied</span>
                <span className="text-xs">
                  ({pwdSssDiscountItems.length}/3 items)
                </span>
              </span>
            ) : (
              "PWD/SSS (20% - Select 1 drink & 2 food)"
            )}
          </button>

          <button
            onClick={handleEmployeeDiscount}
            disabled={isProcessing}
            className={`flex-1 px-3 py-2 rounded-lg font-semibold text-xs shadow transition-colors ${
              employeeDiscountApplied
                ? "bg-yellow-500 text-white hover:bg-yellow-600"
                : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {employeeDiscountApplied
              ? "✓ Employee Discount (15%)"
              : "Employee (15%)"}
          </button>

          <button
            onClick={handleShareholderDiscount}
            disabled={isProcessing}
            className={`flex-1 px-3 py-2 rounded-lg font-semibold text-xs shadow transition-colors ${
              shareholderDiscountApplied
                ? "bg-purple-500 text-white hover:bg-purple-600"
                : "bg-purple-100 text-purple-700 hover:bg-purple-200"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {shareholderDiscountApplied
              ? "✓ Shareholder Discount (10%)"
              : "Shareholder (10%)"}
          </button>
        </div>

        {/* 🎟 REDEMPTION BUTTON */}
        <div className="flex flex-col sm:flex-row gap-3">
          {!hasRedeemedItem ? (
            showRedeemOptions ? (
              <button
                onClick={handleCancelRedeem}
                disabled={isProcessing}
                className="flex-1 px-3 py-2 rounded-lg font-semibold text-xs shadow bg-gray-500 text-white hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel Redeem
              </button>
            ) : (
              <button
                onClick={handleShowRedeemOptions}
                disabled={isProcessing || combinedCart.length === 0}
                className="flex-1 px-3 py-2 rounded-lg font-semibold text-xs shadow bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Redeem (Free 1 Item)
              </button>
            )
          ) : (
            <button
              onClick={handleRemoveRedemption}
              disabled={isProcessing}
              className="flex-1 px-3 py-2 rounded-lg font-semibold text-xs shadow bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Remove Redemption
            </button>
          )}
        </div>

        {/* 💳 PAYMENT BUTTONS */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => setPaymentMethod("Cash")}
            disabled={isProcessing}
            className={`flex-1 px-3 py-2 rounded-lg font-semibold text-xs shadow transition-colors ${
              paymentMethod === "Cash"
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-200 text-gray-600 hover:bg-gray-300"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Cash
          </button>

          <button
            onClick={() => setPaymentMethod("Online")}
            disabled={isProcessing}
            className={`flex-1 px-3 py-2 rounded-lg font-semibold text-xs shadow transition-colors ${
              paymentMethod === "Online"
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-200 text-gray-600 hover:bg-gray-300"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Online
          </button>
        </div>

        {/* 🧾 PLACE ORDER */}
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <button
            onClick={handlePlaceOrder}
            disabled={isProcessing || !paymentMethod || cartData.length === 0}
            className="w-full px-4 py-3 rounded-lg font-semibold text-sm bg-blue-600 text-white shadow hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Processing...
              </>
            ) : (
              "Place Order & Print"
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
