import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  removeItemFromOrder,
  incrementQuantityInOrder,
  decrementQuantityInOrder,
  redeemItemInOrder,
  removeRedemptionFromOrder,
  completeOrder,
  processOrder,
  resetOrderStatus,
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

  // Safe access to user data from auth state
  const userState = useSelector((state) => state.auth);
  const user = userState?.user ||
    userState?.data?.user || {
      _id: "000000000000000000000001",
      name: "Admin",
    };

  const currentOrder =
    orders.find((order) => order.id === orderId) ||
    orders.find((order) => order.id === activeOrderId);
  const cartData = currentOrder?.items || [];

  const vatRate = 12;
  const pwdSeniorDiscountRate = 0.2;
  const employeeDiscountRate = 0.15;
  const shareholderDiscountRate = 0.1;

  const [pwdSeniorDiscountApplied, setPwdSeniorDiscountApplied] =
    useState(false);
  const [employeeDiscountApplied, setEmployeeDiscountApplied] = useState(false);
  const [shareholderDiscountApplied, setShareholderDiscountApplied] =
    useState(false);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const [orderInfo, setOrderInfo] = useState(null);
  const [showRedeemOptions, setShowRedeemOptions] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pwdSeniorDiscountItems, setPwdSeniorDiscountItems] = useState([]);
  const [showPwdSeniorSelection, setShowPwdSeniorSelection] = useState(false);
  const [pwdSeniorDetails, setPwdSeniorDetails] = useState({
    name: "",
    idNumber: "",
    type: "PWD",
  });
  const [customerType, setCustomerType] = useState("walk-in");
  const [cashAmount, setCashAmount] = useState(0);
  const [showCashModal, setShowCashModal] = useState(false);
  const [showOnlineOptions, setShowOnlineOptions] = useState(false);
  const [showPrintOptions, setShowPrintOptions] = useState(false);

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
      name.includes("lemonade") ||
      name.includes("frappe") ||
      name.includes("latte") ||
      name.includes("mocha") ||
      name.includes("americano") ||
      name.includes("cappuccino") ||
      name.includes("macchiato") ||
      name.includes("iced tea") ||
      name.includes("espresso")
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
      name.includes("cheesecake") ||
      name.includes("pie") ||
      name.includes("ice cream") ||
      name.includes("breakfast") ||
      name.includes("omelette") ||
      name.includes("longganisa") ||
      name.includes("tapa") ||
      name.includes("tocino") ||
      name.includes("bacon") ||
      name.includes("spam") ||
      name.includes("embutido") ||
      name.includes("shanghai") ||
      name.includes("hungarian") ||
      name.includes("carbonara") ||
      name.includes("pesto") ||
      name.includes("snack") ||
      name.includes("wedge") ||
      name.includes("potato") ||
      name.includes("nachos") ||
      name.includes("bento") ||
      name.includes("mini")
    );
  };

  // Get unique key for an item
  const getItemKey = (item) => {
    return `${item.id}-${item.pricePerQuantity}-${item.isRedeemed}`;
  };

  // Calculate totals
  const calculateTotals = () => {
    try {
      const baseGrossTotal = cartData.reduce(
        (sum, item) =>
          sum + safeNumber(item.quantity) * safeNumber(item.pricePerQuantity),
        0
      );

      let pwdSeniorDiscountAmount = 0;
      let discountedItemsTotal = 0;

      if (pwdSeniorDiscountApplied && pwdSeniorDiscountItems.length > 0) {
        discountedItemsTotal = pwdSeniorDiscountItems.reduce(
          (sum, item) =>
            sum + safeNumber(item.quantity) * safeNumber(item.pricePerQuantity),
          0
        );
        pwdSeniorDiscountAmount = discountedItemsTotal * pwdSeniorDiscountRate;
      }

      const redemptionAmount = cartData.reduce((sum, item) => {
        return item.isRedeemed
          ? sum + safeNumber(item.quantity) * safeNumber(item.pricePerQuantity)
          : sum;
      }, 0);

      const subtotalAfterPwdSeniorAndRedemption =
        baseGrossTotal - pwdSeniorDiscountAmount - redemptionAmount;

      const employeeDiscountAmount = employeeDiscountApplied
        ? subtotalAfterPwdSeniorAndRedemption * employeeDiscountRate
        : 0;

      const subtotalAfterEmployeeDiscount =
        subtotalAfterPwdSeniorAndRedemption - employeeDiscountAmount;

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
        pwdSeniorDiscountAmount +
        employeeDiscountAmount +
        shareholderDiscountAmount +
        redemptionAmount;

      // Calculate change
      const cashAmountNum = safeNumber(cashAmount);
      const change =
        paymentMethod === "Cash" ? Math.max(0, cashAmountNum - total) : 0;

      return {
        baseGrossTotal,
        pwdSeniorDiscountAmount,
        discountedItemsTotal,
        redemptionAmount,
        employeeDiscountAmount,
        shareholderDiscountAmount,
        netSales,
        vatAmount,
        total,
        totalDiscountAmount,
        subtotalAfterPwdSeniorAndRedemption,
        cashAmount: cashAmountNum,
        change,
      };
    } catch (error) {
      console.error("Error calculating totals:", error);
      return {
        baseGrossTotal: 0,
        pwdSeniorDiscountAmount: 0,
        discountedItemsTotal: 0,
        redemptionAmount: 0,
        employeeDiscountAmount: 0,
        shareholderDiscountAmount: 0,
        netSales: 0,
        vatAmount: 0,
        total: 0,
        totalDiscountAmount: 0,
        subtotalAfterPwdSeniorAndRedemption: 0,
        cashAmount: 0,
        change: 0,
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

  // Calculate item total
  const calculateItemTotal = (item) => {
    if (item.isRedeemed) {
      return 0;
    }

    const isDiscounted = pwdSeniorDiscountItems.some(
      (discountedItem) => getItemKey(discountedItem) === getItemKey(item)
    );

    if (isDiscounted) {
      const originalTotal =
        safeNumber(item.quantity) * safeNumber(item.pricePerQuantity);
      const discountedTotal = originalTotal * (1 - pwdSeniorDiscountRate);
      return discountedTotal;
    }

    return safeNumber(item.quantity) * safeNumber(item.pricePerQuantity);
  };

  // Calculate original item total price
  const calculateItemTotalPrice = (item) => {
    return safeNumber(item.quantity) * safeNumber(item.pricePerQuantity);
  };

  // Calculate discount amount for an item
  const calculateItemDiscountAmount = (item) => {
    if (item.isRedeemed) {
      return safeNumber(item.quantity) * safeNumber(item.pricePerQuantity);
    }

    const isDiscounted = pwdSeniorDiscountItems.some(
      (discountedItem) => getItemKey(discountedItem) === getItemKey(item)
    );

    if (isDiscounted) {
      const originalTotal =
        safeNumber(item.quantity) * safeNumber(item.pricePerQuantity);
      return originalTotal * pwdSeniorDiscountRate;
    }

    return 0;
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

  // Individual redeem handler
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
    if (!pwdSeniorDiscountApplied || totals.pwdSeniorDiscountAmount === 0)
      return null;

    const drinkCount = pwdSeniorDiscountItems.filter((item) =>
      isDrinkItem(item)
    ).length;

    const foodCount = pwdSeniorDiscountItems.filter((item) =>
      isFoodItem(item)
    ).length;

    let info = "PWD/Senior Discount (20% on selected items)";

    if (drinkCount === 1 && foodCount === 2) {
      info = "PWD/Senior Discount (20% – 1 drink + 2 food)";
    } else if (drinkCount === 1 && foodCount === 1) {
      info = "PWD/Senior Discount (20% – 1 drink + 1 food)";
    } else if (drinkCount === 1) {
      info = "PWD/Senior Discount (20% – 1 drink)";
    } else if (foodCount === 2) {
      info = "PWD/Senior Discount (20% – 2 food)";
    } else if (foodCount === 1) {
      info = "PWD/Senior Discount (20% – 1 food)";
    }

    const discountAmount = totals.pwdSeniorDiscountAmount.toFixed(2);
    return `${info} (-₱${discountAmount})`;
  };

  const discountedItemsInfo = getDiscountedItemsInfo();

  // Handle PWD/Senior discount
  const handlePwdSeniorDiscount = () => {
    if (!pwdSeniorDiscountApplied) {
      setShowPwdSeniorSelection(true);
    } else {
      setPwdSeniorDiscountApplied(false);
      setPwdSeniorDiscountItems([]);
      setPwdSeniorDetails({ name: "", idNumber: "", type: "PWD" });
      setEmployeeDiscountApplied(false);
      setShareholderDiscountApplied(false);
      enqueueSnackbar("PWD/Senior discount removed", { variant: "info" });
    }
  };

  const handleEmployeeDiscount = () => {
    setEmployeeDiscountApplied(!employeeDiscountApplied);
    setPwdSeniorDiscountApplied(false);
    setPwdSeniorDiscountItems([]);
    setPwdSeniorDetails({ name: "", idNumber: "", type: "PWD" });
    setShareholderDiscountApplied(false);
  };

  const handleShareholderDiscount = () => {
    setShareholderDiscountApplied(!shareholderDiscountApplied);
    setPwdSeniorDiscountApplied(false);
    setPwdSeniorDiscountItems([]);
    setPwdSeniorDetails({ name: "", idNumber: "", type: "PWD" });
    setEmployeeDiscountApplied(false);
  };

  // Toggle item selection in modal
  const toggleItemSelection = (item) => {
    const itemKey = getItemKey(item);
    const isSelected = pwdSeniorDiscountItems.some(
      (selected) => getItemKey(selected) === itemKey
    );

    if (isSelected) {
      setPwdSeniorDiscountItems(
        pwdSeniorDiscountItems.filter(
          (selected) => getItemKey(selected) !== itemKey
        )
      );
    } else {
      const drinks = pwdSeniorDiscountItems.filter((item) => isDrinkItem(item));
      const foods = pwdSeniorDiscountItems.filter((item) => isFoodItem(item));

      // PWD/SENIOR DISCOUNT: Can select 1-3 items (1 drink max, 2 food max)
      if (isDrinkItem(item)) {
        if (drinks.length >= 1) {
          enqueueSnackbar(
            "Maximum 1 drink can be selected for PWD/Senior discount",
            {
              variant: "warning",
            }
          );
          return;
        }
      } else if (isFoodItem(item)) {
        if (foods.length >= 2) {
          enqueueSnackbar(
            "Maximum 2 food items can be selected for PWD/Senior discount",
            {
              variant: "warning",
            }
          );
          return;
        }
      } else {
        enqueueSnackbar(
          "Only drinks and food items are eligible for PWD/Senior discount",
          {
            variant: "warning",
          }
        );
        return;
      }

      // Check total items
      if (pwdSeniorDiscountItems.length >= 3) {
        enqueueSnackbar(
          "Maximum 3 items can be selected for PWD/Senior discount",
          {
            variant: "warning",
          }
        );
        return;
      }

      setPwdSeniorDiscountItems([...pwdSeniorDiscountItems, item]);
    }
  };

  // Apply the selection with PWD/Senior details
  const handleApplyPwdSeniorSelection = () => {
    if (pwdSeniorDiscountItems.length === 0) {
      enqueueSnackbar("Please select at least 1 item for PWD/Senior discount", {
        variant: "warning",
      });
      return;
    }

    if (!pwdSeniorDetails.name.trim()) {
      enqueueSnackbar("Please enter PWD/Senior holder name", {
        variant: "warning",
      });
      return;
    }

    if (!pwdSeniorDetails.idNumber.trim()) {
      enqueueSnackbar("Please enter PWD/Senior ID number", {
        variant: "warning",
      });
      return;
    }

    setPwdSeniorDiscountApplied(true);
    setEmployeeDiscountApplied(false);
    setShareholderDiscountApplied(false);
    setShowPwdSeniorSelection(false);

    const selectedValue = pwdSeniorDiscountItems.reduce(
      (sum, item) => sum + calculateItemTotalPrice(item),
      0
    );

    const discountAmount = selectedValue * pwdSeniorDiscountRate;

    const drinks = pwdSeniorDiscountItems.filter((item) => isDrinkItem(item));
    const foods = pwdSeniorDiscountItems.filter((item) => isFoodItem(item));

    let message = `PWD/Senior discount applied to ${
      pwdSeniorDiscountItems.length
    } item(s) (-₱${discountAmount.toFixed(2)})`;

    if (drinks.length === 1 && foods.length === 2) {
      message = `PWD/Senior discount applied to 1 drink and 2 food items (-₱${discountAmount.toFixed(
        2
      )})`;
    } else if (drinks.length === 1 && foods.length === 1) {
      message = `PWD/Senior discount applied to 1 drink and 1 food item (-₱${discountAmount.toFixed(
        2
      )})`;
    } else if (drinks.length === 1) {
      message = `PWD/Senior discount applied to 1 drink (-₱${discountAmount.toFixed(
        2
      )})`;
    } else if (foods.length === 2) {
      message = `PWD/Senior discount applied to 2 food items (-₱${discountAmount.toFixed(
        2
      )})`;
    } else if (foods.length === 1) {
      message = `PWD/Senior discount applied to 1 food item (-₱${discountAmount.toFixed(
        2
      )})`;
    }

    message += ` for ${pwdSeniorDetails.type}: ${pwdSeniorDetails.name}`;

    enqueueSnackbar(message, {
      variant: "success",
    });
  };

  // Cancel selection
  const handleCancelPwdSeniorSelection = () => {
    setShowPwdSeniorSelection(false);
  };

  // Clear PWD/Senior discount
  const clearPwdSeniorDiscount = () => {
    setPwdSeniorDiscountApplied(false);
    setPwdSeniorDiscountItems([]);
    setPwdSeniorDetails({ name: "", idNumber: "", type: "PWD" });
    enqueueSnackbar("PWD/Senior discount removed", {
      variant: "info",
    });
  };

  // Handle PWD/Senior details change
  const handlePwdSeniorDetailsChange = (e) => {
    const { name, value } = e.target;
    setPwdSeniorDetails((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle customer type change
  const handleCustomerTypeChange = (type) => {
    setCustomerType(type);
    enqueueSnackbar(
      `Customer type set to ${type === "walk-in" ? "Walk-in" : "Take-out"}`,
      {
        variant: "info",
      }
    );
  };

  // Handle online payment selection
  const handleOnlinePaymentSelect = (method) => {
    setPaymentMethod(method);
    setShowOnlineOptions(false);
    enqueueSnackbar(`Payment method set to ${method}`, {
      variant: "success",
    });
  };

  // Handle denomination button click
  const handleDenominationClick = (amount) => {
    setCashAmount((prev) => safeNumber(prev) + amount);
  };

  // Generate HTML receipt for printing
  const generatePrintableReceipt = (orderData) => {
    const receiptDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    let itemsHTML = "";
    combinedCart.forEach((item) => {
      const price = safeNumber(item.pricePerQuantity);
      const quantity = item.quantity;
      const total = calculateItemTotal(item);

      itemsHTML += `
        <div style="margin-bottom: 8px; border-bottom: 1px dashed #ddd; padding-bottom: 8px;">
          <div style="font-weight: bold;">${item.name}</div>
          <div style="display: flex; justify-content: space-between; font-size: 12px;">
            <span>${quantity} × ₱${price.toFixed(2)}</span>
            <span>₱${total.toFixed(2)}</span>
          </div>
          ${
            item.isRedeemed
              ? '<div style="color: green; font-size: 11px;">[REDEEMED - FREE]</div>'
              : ""
          }
        </div>
      `;
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - Order ${orderData._id?.slice(-8) || "N/A"}</title>
        <style>
          @media print {
            body { margin: 0; padding: 0; }
            .no-print { display: none !important; }
            .print-only { display: block !important; }
          }
          body {
            font-family: 'Courier New', monospace;
            max-width: 80mm;
            margin: 0 auto;
            padding: 10px;
            font-size: 12px;
          }
          .header {
            text-align: center;
            margin-bottom: 15px;
          }
          .restaurant-name {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .divider {
            border-top: 1px dashed #000;
            margin: 10px 0;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            margin: 5px 0;
          }
          .total-row-bold {
            font-weight: bold;
            font-size: 14px;
            border-top: 2px solid #000;
            padding-top: 5px;
            margin-top: 10px;
          }
          .thank-you {
            text-align: center;
            margin-top: 15px;
            font-style: italic;
          }
          .controls {
            text-align: center;
            margin-top: 20px;
            padding: 10px;
            background: #f5f5f5;
            border-radius: 5px;
          }
          button {
            margin: 5px;
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-weight: bold;
          }
          .print-btn {
            background: #2196F3;
            color: white;
          }
          .close-btn {
            background: #f44336;
            color: white;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="restaurant-name">DELISH RESTAURANT</div>
          <div>123 Main Street, City</div>
          <div>Phone: (123) 456-7890</div>
        </div>
        
        <div class="divider"></div>
        
        <div>
          <div><strong>Order #:</strong> ${
            orderData._id?.slice(-8) || "N/A"
          }</div>
          <div><strong>Date:</strong> ${receiptDate}</div>
          <div><strong>Customer:</strong> ${
            customerType === "walk-in" ? "Walk-in (Dine-in)" : "Take-out"
          }</div>
          <div><strong>Cashier:</strong> ${user?.name || "Admin"}</div>
        </div>
        
        <div class="divider"></div>
        
        <div style="margin: 15px 0;">
          <div style="font-weight: bold; margin-bottom: 10px; border-bottom: 1px solid #000;">ITEMS:</div>
          ${itemsHTML}
        </div>
        
        <div class="divider"></div>
        
        <div style="margin: 15px 0;">
          <div class="total-row">
            <span>Subtotal:</span>
            <span>₱${totals.baseGrossTotal.toFixed(2)}</span>
          </div>
          
          ${
            totals.pwdSeniorDiscountAmount > 0
              ? `
            <div class="total-row" style="color: green;">
              <span>PWD/Senior Discount:</span>
              <span>-₱${totals.pwdSeniorDiscountAmount.toFixed(2)}</span>
            </div>
          `
              : ""
          }
          
          ${
            totals.redemptionAmount > 0
              ? `
            <div class="total-row" style="color: blue;">
              <span>Redemption:</span>
              <span>-₱${totals.redemptionAmount.toFixed(2)}</span>
            </div>
          `
              : ""
          }
          
          ${
            totals.employeeDiscountAmount > 0
              ? `
            <div class="total-row" style="color: orange;">
              <span>Employee Discount:</span>
              <span>-₱${totals.employeeDiscountAmount.toFixed(2)}</span>
            </div>
          `
              : ""
          }
          
          ${
            totals.shareholderDiscountAmount > 0
              ? `
            <div class="total-row" style="color: purple;">
              <span>Shareholder Discount:</span>
              <span>-₱${totals.shareholderDiscountAmount.toFixed(2)}</span>
            </div>
          `
              : ""
          }
          
          <div class="total-row">
            <span>VAT (12%):</span>
            <span>₱${totals.vatAmount.toFixed(2)}</span>
          </div>
          
          <div class="total-row total-row-bold">
            <span>TOTAL:</span>
            <span>₱${totals.total.toFixed(2)}</span>
          </div>
          
          ${
            paymentMethod === "Cash"
              ? `
            <div class="total-row">
              <span>Cash:</span>
              <span>₱${totals.cashAmount.toFixed(2)}</span>
            </div>
            <div class="total-row" style="color: green;">
              <span>Change:</span>
              <span>₱${totals.change.toFixed(2)}</span>
            </div>
          `
              : ""
          }
          
          <div class="total-row" style="margin-top: 10px;">
            <span><strong>Payment Method:</strong></span>
            <span>${paymentMethod}</span>
          </div>
        </div>
        
        <div class="divider"></div>
        
        <div class="thank-you">
          <div>Thank you for dining with us!</div>
          <div>Please visit again!</div>
        </div>
        
        <div class="controls no-print">
          <button class="print-btn" onclick="window.print()">🖨️ Print Receipt</button>
          <button class="close-btn" onclick="window.close()">Close</button>
        </div>
        
        <script>
          // Auto-print if this is a popup window
          if (window.opener) {
            setTimeout(() => {
              window.print();
            }, 500);
          }
        </script>
      </body>
      </html>
    `;
  };

  // Print receipt using browser print dialog
  const printReceipt = async (orderData) => {
    try {
      // Generate HTML receipt
      const receiptHTML = generatePrintableReceipt(orderData);

      // Open in new window for printing
      const printWindow = window.open("", "_blank", "width=400,height=600");
      printWindow.document.write(receiptHTML);
      printWindow.document.close();

      // Wait for content to load
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.focus();
          // Try to auto-print
          if (printWindow.print) {
            printWindow.print();
          }
        }, 500);
      };

      enqueueSnackbar("Receipt ready for printing!", {
        variant: "success",
      });

      return true;
    } catch (error) {
      console.error("Print error:", error);
      throw error;
    }
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

      // Create complete order info for invoice
      const invoiceOrderInfo = {
        ...data,
        customerDetails: {
          name:
            customerType === "walk-in"
              ? "Walk-in Customer"
              : "Take-out Customer",
          type: customerType,
          status: customerType === "walk-in" ? "Dine-in" : "Take-out",
        },
        items: combinedCart.map((item) => {
          const isDiscounted = pwdSeniorDiscountItems.some(
            (discountedItem) => getItemKey(discountedItem) === getItemKey(item)
          );

          return {
            name: item.name,
            quantity: item.quantity,
            price: calculateItemTotal(item),
            originalPrice: safeNumber(item.pricePerQuantity),
            pricePerQuantity: safeNumber(item.pricePerQuantity),
            isFree: item.isRedeemed || false,
            isPwdSeniorDiscounted: isDiscounted,
          };
        }),
        bills: {
          total: totals.baseGrossTotal,
          tax: totals.vatAmount,
          discount: totals.totalDiscountAmount,
          totalWithTax: totals.total,
          pwdSeniorDiscount: totals.pwdSeniorDiscountAmount,
          pwdSeniorDiscountedValue: totals.discountedItemsTotal,
          employeeDiscount: totals.employeeDiscountAmount,
          shareholderDiscount: totals.shareholderDiscountAmount,
          redemptionDiscount: totals.redemptionAmount,
          cashAmount: totals.cashAmount,
          change: totals.change,
        },
        paymentMethod: paymentMethod,
        orderStatus: "Completed",
        customerStatus: customerType === "walk-in" ? "Dine-in" : "Take-out",
        orderDate: new Date().toISOString(),
        cashier: user?.name || "Admin",
        pwdSeniorDetails: pwdSeniorDiscountApplied ? pwdSeniorDetails : null,
        user: user?._id || "000000000000000000000001",
      };

      setOrderInfo(invoiceOrderInfo);

      // MARK ORDER AS COMPLETED IN REDUX
      if (currentOrder) {
        console.log("Dispatching completeOrder for:", currentOrder.id);
        dispatch(completeOrder(currentOrder.id));
      }

      enqueueSnackbar("Order placed successfully!", { variant: "success" });

      // Show invoice immediately
      setShowInvoice(true);
      setIsProcessing(false);

      // Auto-print receipt after a short delay
      setTimeout(async () => {
        try {
          await printReceipt(data);
        } catch (error) {
          console.error("Failed to print:", error);
          enqueueSnackbar(
            "Failed to auto-print receipt. Use print button in receipt window.",
            {
              variant: "warning",
            }
          );
        }
      }, 1500);

      // Auto-close invoice after 10 seconds and navigate
      setTimeout(() => {
        setShowInvoice(false);
        navigate("/menu");
      }, 10000);
    },
    onError: (error) => {
      console.error("Order placement error:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to place order. Please try again.";

      enqueueSnackbar(errorMessage, { variant: "error" });
      setIsProcessing(false);

      // Reset order status on error
      if (currentOrder) {
        dispatch(resetOrderStatus(currentOrder.id));
      }
    },
  });

  // Handle place order
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

    // Validate PWD/Senior discount if applied
    if (pwdSeniorDiscountApplied) {
      if (!pwdSeniorDetails.name.trim()) {
        enqueueSnackbar("Please enter PWD/Senior holder name", {
          variant: "error",
        });
        return;
      }
      if (!pwdSeniorDetails.idNumber.trim()) {
        enqueueSnackbar("Please enter PWD/Senior ID number", {
          variant: "error",
        });
        return;
      }
    }

    // Validate cash amount if payment is cash
    if (paymentMethod === "Cash") {
      if (totals.cashAmount < totals.total) {
        setShowCashModal(true);
        return;
      }
    }

    setIsProcessing(true);

    // MARK ORDER AS PROCESSING FIRST
    if (currentOrder) {
      console.log("Dispatching processOrder for:", currentOrder.id);
      dispatch(processOrder(currentOrder.id));
    }

    // Prepare bills data
    const bills = {
      total: Number(totals.baseGrossTotal.toFixed(2)),
      tax: Number(totals.vatAmount.toFixed(2)),
      totalWithTax: Number(totals.total.toFixed(2)),
      discount: Number(totals.totalDiscountAmount.toFixed(2)),
      pwdSeniorDiscount: Number(totals.pwdSeniorDiscountAmount.toFixed(2)),
      pwdSeniorDiscountedValue: Number(totals.discountedItemsTotal.toFixed(2)),
      employeeDiscount: Number(totals.employeeDiscountAmount.toFixed(2)),
      shareholderDiscount: Number(totals.shareholderDiscountAmount.toFixed(2)),
      redemptionDiscount: Number(totals.redemptionAmount.toFixed(2)),
      netSales: Number(totals.netSales.toFixed(2)),
      cashAmount: Number(totals.cashAmount.toFixed(2)),
      change: Number(totals.change.toFixed(2)),
    };

    // Prepare items data - FIXED: Added missing items array
    const items = cartData.map((item) => {
      const isPwdSeniorDiscounted = pwdSeniorDiscountItems.some(
        (discountedItem) => getItemKey(discountedItem) === getItemKey(item)
      );

      return {
        name: item.name || "Unknown Item",
        quantity: safeNumber(item.quantity),
        pricePerQuantity: safeNumber(item.pricePerQuantity),
        price: calculateItemTotal(item),
        originalPrice: safeNumber(item.pricePerQuantity),
        isRedeemed: Boolean(item.isRedeemed),
        isPwdSeniorDiscounted: isPwdSeniorDiscounted,
        category: isDrinkItem(item) ? "drink" : "food", // Only food or drink
        id: item.id || Date.now().toString(),
      };
    });

    // Prepare order data - FIXED: Added missing orderData variable
    const orderData = {
      items: items,
      bills: bills,
      customerDetails: {
        type: customerType,
        status: customerType === "walk-in" ? "Dine-in" : "Take-out",
      },
      pwdSeniorDetails: pwdSeniorDiscountApplied ? pwdSeniorDetails : null,
      paymentMethod: paymentMethod,
      cashAmount: Number(totals.cashAmount.toFixed(2)),
      change: Number(totals.change.toFixed(2)),
      orderStatus: "Completed",
      user: user?._id || "000000000000000000000001",
    };

    console.log("Sending order data:", JSON.stringify(orderData, null, 2));

    // Submit order
    orderMutation.mutate(orderData);
  };

  // Handle cash amount submission
  const handleCashSubmit = () => {
    if (totals.cashAmount >= totals.total) {
      setShowCashModal(false);
      // Continue with order placement
      handlePlaceOrder();
    } else {
      enqueueSnackbar("Cash amount must be greater than or equal to total", {
        variant: "error",
      });
    }
  };

  const handleCloseInvoice = () => {
    setShowInvoice(false);
    navigate("/menu");
  };

  // Handle redeem button click
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

  // Print receipt manually
  const handleManualPrint = async () => {
    if (!orderInfo) {
      enqueueSnackbar("No order information available", { variant: "error" });
      return;
    }

    try {
      await printReceipt(orderInfo);
    } catch (error) {
      enqueueSnackbar("Failed to print receipt", { variant: "error" });
    }
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
      {/* Cash Modal */}
      {showCashModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">
              Enter Cash Amount
            </h3>

            <div className="mb-4">
              <p className="text-gray-600 mb-2">
                Total Amount: ₱{totals.total.toFixed(2)}
              </p>
              <input
                type="number"
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg text-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none mb-4"
                placeholder="Enter cash amount"
                min={totals.total}
                step="0.01"
                autoFocus
              />

              <div className="grid grid-cols-3 gap-2 mb-4">
                <button
                  onClick={() => handleDenominationClick(10)}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-200 transition-colors"
                >
                  ₱10
                </button>
                <button
                  onClick={() => handleDenominationClick(20)}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-200 transition-colors"
                >
                  ₱20
                </button>
                <button
                  onClick={() => handleDenominationClick(50)}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-200 transition-colors"
                >
                  ₱50
                </button>
                <button
                  onClick={() => handleDenominationClick(100)}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-200 transition-colors"
                >
                  ₱100
                </button>
                <button
                  onClick={() => handleDenominationClick(500)}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-200 transition-colors"
                >
                  ₱500
                </button>
                <button
                  onClick={() => handleDenominationClick(1000)}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-200 transition-colors"
                >
                  ₱1000
                </button>
              </div>

              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Entered Amount:</span>
                <span className="text-lg font-bold text-gray-900">
                  ₱{safeNumber(cashAmount).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-600">Change:</span>
                <span className="text-lg font-bold text-green-600">
                  ₱
                  {Math.max(0, safeNumber(cashAmount) - totals.total).toFixed(
                    2
                  )}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowCashModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCashSubmit}
                disabled={totals.cashAmount < totals.total}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Online Payment Options Modal */}
      {showOnlineOptions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">
              Select Digital Payment Method
            </h3>
            <div className="space-y-3">
              <button
                onClick={() => handleOnlinePaymentSelect("BDO")}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors"
              >
                BDO
              </button>
              <button
                onClick={() => handleOnlinePaymentSelect("GCASH")}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-semibold text-sm hover:bg-green-700 transition-colors"
              >
                GCASH
              </button>
              <button
                onClick={() => setShowOnlineOptions(false)}
                className="w-full px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold text-sm hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PWD/Senior Selection Modal */}
      {showPwdSeniorSelection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">
              PWD/Senior Discount Application
            </h3>

            {/* PWD/Senior Details Form */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-semibold text-blue-800 mb-3">
                PWD/Senior Holder Information
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Discount Type
                  </label>
                  <div className="flex gap-3">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="type"
                        value="PWD"
                        checked={pwdSeniorDetails.type === "PWD"}
                        onChange={handlePwdSeniorDetailsChange}
                        className="mr-2"
                      />
                      <span className="text-sm">PWD</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="type"
                        value="Senior"
                        checked={pwdSeniorDetails.type === "Senior"}
                        onChange={handlePwdSeniorDetailsChange}
                        className="mr-2"
                      />
                      <span className="text-sm">Senior Citizen</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={pwdSeniorDetails.name}
                    onChange={handlePwdSeniorDetailsChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="Enter PWD/Senior holder name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    ID Number *
                  </label>
                  <input
                    type="text"
                    name="idNumber"
                    value={pwdSeniorDetails.idNumber}
                    onChange={handlePwdSeniorDetailsChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="Enter PWD/Senior ID number"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-yellow-800">
                  Selected Items:
                </span>
                <span className="text-sm font-bold text-yellow-800">
                  {pwdSeniorDiscountItems.length}/3
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="text-xs text-yellow-700">
                  Drinks:{" "}
                  {
                    pwdSeniorDiscountItems.filter((item) => isDrinkItem(item))
                      .length
                  }
                  /1
                </div>
                <div className="text-xs text-yellow-700">
                  Food:{" "}
                  {
                    pwdSeniorDiscountItems.filter((item) => isFoodItem(item))
                      .length
                  }
                  /2
                </div>
              </div>
            </div>

            <div className="space-y-3 mb-6 max-h-[300px] overflow-y-auto">
              <p className="text-sm font-medium text-gray-700 mb-2">
                Select items for 20% discount (1-3 items allowed):
              </p>
              {combinedCart.map((item, index) => {
                const itemKey = getItemKey(item);
                const isSelected = pwdSeniorDiscountItems.some(
                  (selected) => getItemKey(selected) === itemKey
                );
                const isDrink = isDrinkItem(item);
                const isFood = isFoodItem(item);
                const isEligible = isDrink || isFood;

                if (!isEligible) return null;

                const itemType = isDrink ? "Drink" : "Food";
                const itemValue = calculateItemTotalPrice(item);
                const discountAmount = itemValue * pwdSeniorDiscountRate;
                const discountedValue = itemValue - discountAmount;

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
                        className={`w-5 h-5 rounded-full border mr-3 flex-shrink-0 ${
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
                            After 20% discount (-₱{discountAmount.toFixed(2)}):
                            ₱{discountedValue.toFixed(2)}
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
                  {pwdSeniorDiscountItems
                    .reduce(
                      (sum, item) => sum + calculateItemTotalPrice(item),
                      0
                    )
                    .toFixed(2)}
                </p>
                <p className="text-xs text-gray-600">
                  After 20% discount (-₱
                  {(
                    pwdSeniorDiscountItems.reduce(
                      (sum, item) => sum + calculateItemTotalPrice(item),
                      0
                    ) * pwdSeniorDiscountRate
                  ).toFixed(2)}
                  ): ₱
                  {(
                    pwdSeniorDiscountItems.reduce(
                      (sum, item) => sum + calculateItemTotalPrice(item),
                      0
                    ) *
                    (1 - pwdSeniorDiscountRate)
                  ).toFixed(2)}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCancelPwdSeniorSelection}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyPwdSeniorSelection}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium text-sm hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={pwdSeniorDiscountItems.length === 0}
                >
                  Apply Discount
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-[600px] mx-auto space-y-4">
        {/* 🧾 CUSTOMER TYPE */}
        <div className="bg-white rounded-lg p-4 shadow-md">
          <h2 className="text-gray-900 text-sm font-semibold mb-3">
            Customer Type
          </h2>
          <div className="flex gap-3">
            <button
              onClick={() => handleCustomerTypeChange("walk-in")}
              className={`flex-1 px-4 py-3 rounded-lg font-semibold text-sm ${
                customerType === "walk-in"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              } transition-colors`}
            >
              Walk-in
            </button>
            <button
              onClick={() => handleCustomerTypeChange("take-out")}
              className={`flex-1 px-4 py-3 rounded-lg font-semibold text-sm ${
                customerType === "take-out"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              } transition-colors`}
            >
              Take-out
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Status will be updated to{" "}
            {customerType === "walk-in" ? "Dine-in" : "Take-out"} on receipt
          </p>
        </div>

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
              const isDiscounted = pwdSeniorDiscountItems.some(
                (discountedItem) => getItemKey(discountedItem) === itemKey
              );
              const isDrink = isDrinkItem(item);
              const isFood = isFoodItem(item);
              const itemType = isDrink ? "Drink" : isFood ? "Food" : "Other";

              const originalTotal = calculateItemTotalPrice(item);
              const displayedTotal = calculateItemTotal(item);
              const discountAmount = calculateItemDiscountAmount(item);

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
                            PWD/SENIOR -20%
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
                          {displayedTotal.toFixed(2)}{" "}
                          <span className="text-green-600">
                            (-₱{discountAmount.toFixed(2)})
                          </span>
                        </>
                      ) : item.isRedeemed ? (
                        <>
                          {" "}
                          = ₱{originalTotal.toFixed(2)} → FREE{" "}
                          <span className="text-blue-600">
                            (-₱{discountAmount.toFixed(2)})
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

          {pwdSeniorDiscountApplied && totals.pwdSeniorDiscountAmount > 0 && (
            <div className="flex justify-between items-center text-green-600">
              <div className="flex items-center">
                <p className="text-xs font-medium mr-2">
                  {discountedItemsInfo}
                  {pwdSeniorDetails.name && ` (${pwdSeniorDetails.name})`}
                </p>
                <button
                  onClick={clearPwdSeniorDiscount}
                  className="text-xs text-red-500 hover:text-red-700 font-medium"
                  disabled={isProcessing}
                >
                  (Clear)
                </button>
              </div>
              <h1 className="text-md font-bold">
                -₱{totals.pwdSeniorDiscountAmount.toFixed(2)}
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
            <p className="text-xs text-gray-500 font-medium">VAT (12%)</p>
            <h1 className="text-gray-900 text-md font-bold">
              ₱{totals.vatAmount.toFixed(2)}
            </h1>
          </div>

          <div className="flex justify-between items-center border-t pt-2">
            <p className="text-sm text-gray-700 font-semibold">TOTAL</p>
            <h1 className="text-gray-900 text-xl font-bold">
              ₱{totals.total.toFixed(2)}
            </h1>
          </div>

          {paymentMethod === "Cash" && totals.cashAmount > 0 && (
            <>
              <div className="flex justify-between items-center border-t pt-2">
                <p className="text-xs text-gray-600 font-medium">Cash</p>
                <p className="text-md text-gray-800 font-bold">
                  ₱{totals.cashAmount.toFixed(2)}
                </p>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-xs text-gray-600 font-medium">Change</p>
                <p className="text-md text-green-600 font-bold">
                  ₱{totals.change.toFixed(2)}
                </p>
              </div>
            </>
          )}
        </div>

        {/* 🎟 DISCOUNT & REDEMPTION BUTTONS - IN ONE ROW */}
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={handlePwdSeniorDiscount}
            disabled={isProcessing}
            className={`px-2 py-2 rounded-lg font-semibold text-xs ${
              pwdSeniorDiscountApplied
                ? "bg-green-500 text-white hover:bg-green-600"
                : "bg-green-100 text-green-700 hover:bg-green-200"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {pwdSeniorDiscountApplied ? "✓ PWD/SENIOR" : "PWD/SENIOR"}
          </button>

          <button
            onClick={handleEmployeeDiscount}
            disabled={isProcessing}
            className={`px-2 py-2 rounded-lg font-semibold text-xs ${
              employeeDiscountApplied
                ? "bg-yellow-500 text-white hover:bg-yellow-600"
                : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {employeeDiscountApplied ? "✓ Employee" : "Employee"}
          </button>

          <button
            onClick={handleShareholderDiscount}
            disabled={isProcessing}
            className={`px-2 py-2 rounded-lg font-semibold text-xs ${
              shareholderDiscountApplied
                ? "bg-purple-500 text-white hover:bg-purple-600"
                : "bg-purple-100 text-purple-700 hover:bg-purple-200"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {shareholderDiscountApplied ? "✓ Shareholder" : "Shareholder"}
          </button>

          {!hasRedeemedItem ? (
            <button
              onClick={handleShowRedeemOptions}
              disabled={isProcessing || combinedCart.length === 0}
              className="px-2 py-2 rounded-lg font-semibold text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Redeem
            </button>
          ) : (
            <button
              onClick={handleRemoveRedemption}
              disabled={isProcessing}
              className="px-2 py-2 rounded-lg font-semibold text-xs bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Remove
            </button>
          )}
        </div>

        {/* 💳 PAYMENT BUTTONS */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => setPaymentMethod("Cash")}
            disabled={isProcessing}
            className={`flex-1 px-3 py-2 rounded-lg font-semibold text-xs ${
              paymentMethod === "Cash"
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-200 text-gray-600 hover:bg-gray-300"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Cash
          </button>

          <button
            onClick={() => setShowOnlineOptions(true)}
            disabled={isProcessing}
            className={`flex-1 px-3 py-2 rounded-lg font-semibold text-xs ${
              paymentMethod === "BDO" || paymentMethod === "GCASH"
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-200 text-gray-600 hover:bg-gray-300"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {paymentMethod === "BDO"
              ? "✓ BDO"
              : paymentMethod === "GCASH"
              ? "✓ GCASH"
              : "Online"}
          </button>
        </div>

        {/* 🧾 PLACE ORDER */}
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <button
            onClick={handlePlaceOrder}
            disabled={isProcessing || !paymentMethod || cartData.length === 0}
            className="w-full px-4 py-3 rounded-lg font-semibold text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
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

        {/* Manual Print Button (shown when invoice is visible) */}
        {showInvoice && orderInfo && (
          <div className="flex flex-col gap-2">
            <button
              onClick={handleManualPrint}
              className="w-full px-4 py-3 rounded-lg font-semibold text-sm bg-green-600 text-white hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
            >
              🖨️ Print Receipt Again
            </button>
          </div>
        )}

        {/* 📄 INVOICE MODAL */}
        {showInvoice && orderInfo && (
          <Invoice orderInfo={orderInfo} setShowInvoice={handleCloseInvoice} />
        )}
      </div>
    </div>
  );
};

export default Bill;
