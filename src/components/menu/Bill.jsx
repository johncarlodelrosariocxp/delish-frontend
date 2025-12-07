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
  clearCurrentOrder,
} from "../../redux/slices/orderSlice";
import { addOrder } from "../../https/index";
import { enqueueSnackbar } from "notistack";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

const Bill = ({ orderId, onInvoiceGenerated }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Get order-specific data
  const orders = useSelector((state) => state.order.orders);
  const activeOrderId = useSelector((state) => state.order.activeOrderId);

  // ✅ Get user data
  const userState = useSelector((state) => state.auth);

  // ✅ Extract user with multiple fallbacks
  const user = React.useMemo(() => {
    // Try different possible paths in the auth state
    const possiblePaths = [
      userState?.user,
      userState?.data?.user,
      userState?.data?.data?.user,
      userState?.userData,
      userState?.currentUser,
    ];

    // Find first truthy value
    const foundUser = possiblePaths.find(Boolean);

    if (foundUser) {
      return foundUser;
    }

    // Fallback: Try localStorage
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        return JSON.parse(storedUser);
      }
    } catch (error) {
      console.error("Error parsing localStorage user:", error);
    }

    // Last resort: extract from token
    try {
      const token = localStorage.getItem("authToken");
      if (token) {
        const payload = JSON.parse(atob(token.split(".")[1]));
        return {
          _id: payload?._id || payload?.userId || payload?.id,
          name: payload?.name || "Cashier",
          role: payload?.role || "cashier",
          email: payload?.email || "",
        };
      }
    } catch (error) {
      console.error("Error extracting user from token:", error);
    }

    // Default fallback
    return {
      _id: "000000000000000000000001",
      name: "Admin",
      role: "admin",
    };
  }, [userState]);

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
  const [mixedPayment, setMixedPayment] = useState({
    isMixed: false,
    cashAmount: 0,
    onlineAmount: 0,
    onlineMethod: null,
  });
  const [showMixedPaymentModal, setShowMixedPaymentModal] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null);

  // Safe number conversion helper
  const safeNumber = (value) => {
    if (value === undefined || value === null) return 0;
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  };

  // Combine same items in cart
  const combineCartItems = (cart) => {
    const combinedItems = {};

    cart.forEach((item) => {
      if (!item || !item.id) return;

      const key = `${item.id}-${item.pricePerQuantity}-${item.isRedeemed}`;
      if (combinedItems[key]) {
        combinedItems[key].quantity += safeNumber(item.quantity);
        combinedItems[key].originalItems = [
          ...combinedItems[key].originalItems,
          item,
        ];
      } else {
        combinedItems[key] = {
          ...item,
          quantity: safeNumber(item.quantity),
          originalItems: [item],
        };
      }
    });

    return Object.values(combinedItems);
  };

  // Check if item is a drink
  const isDrinkItem = (item) => {
    if (!item) return false;
    const name = item.name ? item.name.toLowerCase() : "";
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
    if (!item) return false;
    const name = item.name ? item.name.toLowerCase() : "";
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
    if (!item) return "unknown";
    return `${item.id || "unknown"}-${item.pricePerQuantity || 0}-${
      item.isRedeemed || false
    }`;
  };

  // Calculate totals
  const calculateTotals = () => {
    try {
      const baseGrossTotal = cartData.reduce(
        (sum, item) =>
          item &&
          item.pricePerQuantity !== undefined &&
          item.quantity !== undefined
            ? sum +
              safeNumber(item.quantity) * safeNumber(item.pricePerQuantity)
            : sum,
        0
      );

      let pwdSeniorDiscountAmount = 0;
      let discountedItemsTotal = 0;

      if (pwdSeniorDiscountApplied && pwdSeniorDiscountItems.length > 0) {
        discountedItemsTotal = pwdSeniorDiscountItems.reduce(
          (sum, item) =>
            item &&
            item.pricePerQuantity !== undefined &&
            item.quantity !== undefined
              ? sum +
                safeNumber(item.quantity) * safeNumber(item.pricePerQuantity)
              : sum,
          0
        );
        pwdSeniorDiscountAmount = discountedItemsTotal * pwdSeniorDiscountRate;
      }

      const redemptionAmount = cartData.reduce((sum, item) => {
        if (!item) return sum;
        return item.isRedeemed &&
          item.pricePerQuantity !== undefined &&
          item.quantity !== undefined
          ? sum + safeNumber(item.quantity) * safeNumber(item.pricePerQuantity)
          : sum;
      }, 0);

      const subtotalAfterPwdSeniorAndRedemption =
        baseGrossTotal - pwdSeniorDiscountAmount - redemptionAmount;

      const employeeDiscountAmount = employeeDiscountApplied
        ? Math.max(0, subtotalAfterPwdSeniorAndRedemption) *
          employeeDiscountRate
        : 0;

      const subtotalAfterEmployeeDiscount =
        Math.max(0, subtotalAfterPwdSeniorAndRedemption) -
        employeeDiscountAmount;

      const shareholderDiscountAmount = shareholderDiscountApplied
        ? Math.max(0, subtotalAfterEmployeeDiscount) * shareholderDiscountRate
        : 0;

      const discountedTotal = Math.max(
        0,
        Math.max(0, subtotalAfterEmployeeDiscount) - shareholderDiscountAmount
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
      const onlineAmountNum = safeNumber(mixedPayment.onlineAmount);

      let change = 0;
      if (paymentMethod === "Cash") {
        change = Math.max(0, cashAmountNum - total);
      } else if (mixedPayment.isMixed) {
        const totalPaid = cashAmountNum + onlineAmountNum;
        change = Math.max(0, totalPaid - total);
      }

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
        onlineAmount: onlineAmountNum,
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
        onlineAmount: 0,
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
    if (!item) return 0;

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
    if (!item) return 0;
    return safeNumber(item.quantity) * safeNumber(item.pricePerQuantity);
  };

  // Calculate discount amount for an item
  const calculateItemDiscountAmount = (item) => {
    if (!item) return 0;

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
    if (!item) return `item-${index}`;
    return `${item.id || "unknown"}-${index}-${item.quantity || 0}-${
      item.pricePerQuantity || 0
    }-${item.isRedeemed || false}`;
  };

  // Quantity handlers
  const handleIncrement = (itemId) => {
    if (!currentOrder || !itemId) return;
    dispatch(incrementQuantityInOrder({ orderId: currentOrder.id, itemId }));
  };

  const handleDecrement = (itemId) => {
    if (!currentOrder || !itemId) return;
    dispatch(decrementQuantityInOrder({ orderId: currentOrder.id, itemId }));
  };

  // Individual redeem handler
  const handleRedeemItem = (itemId, itemName) => {
    if (!currentOrder || !itemId) return;
    dispatch(redeemItemInOrder({ orderId: currentOrder.id, itemId }));
    setShowRedeemOptions(false);
    enqueueSnackbar(`${itemName || "Item"} redeemed for free!`, {
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
  const hasRedeemedItem = combinedCart.some((item) => item && item.isRedeemed);

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
    if (!item) return;

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
    setActiveCategory(null);
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

  // Handle cash payment selection
  const handleCashPayment = () => {
    // Clear any existing payment method
    setPaymentMethod(null);
    setCashAmount(0);
    setMixedPayment({
      isMixed: false,
      cashAmount: 0,
      onlineAmount: 0,
      onlineMethod: null,
    });

    // Open cash modal
    setShowCashModal(true);
  };

  // Handle online payment selection
  const handleOnlinePaymentSelect = (method) => {
    setPaymentMethod(method);
    setShowOnlineOptions(false);

    // Check if cash was already entered and offer mixed payment
    if (cashAmount > 0 && cashAmount < totals.total) {
      const remaining = totals.total - cashAmount;
      setShowMixedPaymentModal(true);
      setMixedPayment({
        isMixed: true,
        cashAmount: cashAmount,
        onlineAmount: remaining,
        onlineMethod: method,
      });
    } else {
      enqueueSnackbar(`Payment method set to ${method}`, {
        variant: "success",
      });
    }
  };

  // Handle mixed payment selection
  const handleMixedPaymentSelect = () => {
    const remaining = totals.total - cashAmount;
    if (remaining > 0) {
      setShowMixedPaymentModal(true);
    }
  };

  // Handle mixed payment confirmation
  const handleMixedPaymentConfirm = () => {
    if (!mixedPayment.onlineMethod) {
      enqueueSnackbar("Please select an online payment method", {
        variant: "warning",
      });
      return;
    }

    if (mixedPayment.onlineAmount <= 0) {
      enqueueSnackbar("Please enter valid online payment amount", {
        variant: "warning",
      });
      return;
    }

    const totalPaid = mixedPayment.cashAmount + mixedPayment.onlineAmount;
    if (totalPaid < totals.total) {
      enqueueSnackbar("Total payment is less than order total", {
        variant: "error",
      });
      return;
    }

    setPaymentMethod(`Mixed (Cash + ${mixedPayment.onlineMethod})`);
    setShowMixedPaymentModal(false);
    setShowCashModal(false);

    enqueueSnackbar(
      `Mixed payment set: ₱${mixedPayment.cashAmount.toFixed(
        2
      )} Cash + ₱${mixedPayment.onlineAmount.toFixed(2)} ${
        mixedPayment.onlineMethod
      }`,
      {
        variant: "success",
      }
    );
  };

  // Handle denomination button click
  const handleDenominationClick = (amount) => {
    setCashAmount((prev) => safeNumber(prev) + amount);
  };

  // Handle cash amount change for mixed payment
  const handleMixedPaymentCashChange = (e) => {
    const newCashAmount = safeNumber(e.target.value);
    setCashAmount(newCashAmount);

    // Calculate remaining amount
    const remaining = Math.max(0, totals.total - newCashAmount);
    setMixedPayment((prev) => ({
      ...prev,
      cashAmount: newCashAmount,
      onlineAmount: remaining,
    }));
  };

  // ✅ FIXED: Generate unique order number
  const generateOrderNumber = () => {
    // Use timestamp to ensure uniqueness
    const timestamp = Date.now();
    // Add random suffix for extra uniqueness
    const randomSuffix = Math.floor(Math.random() * 1000);
    return `ORD-${timestamp}-${randomSuffix}`;
  };

  // ✅ FIXED: Prepare order data with unique orderNumber
  const prepareOrderData = () => {
    // Determine payment method details
    let paymentMethodDetails = paymentMethod;
    let cashPaymentAmount = 0;
    let onlinePaymentAmount = 0;
    let onlinePaymentMethod = null;

    if (paymentMethod === "Cash") {
      cashPaymentAmount = totals.cashAmount;
    } else if (paymentMethod === "BDO" || paymentMethod === "GCASH") {
      onlinePaymentAmount = totals.total;
      onlinePaymentMethod = paymentMethod;
    } else if (mixedPayment.isMixed) {
      cashPaymentAmount = mixedPayment.cashAmount;
      onlinePaymentAmount = mixedPayment.onlineAmount;
      onlinePaymentMethod = mixedPayment.onlineMethod;
      paymentMethodDetails = `Mixed (Cash + ${onlinePaymentMethod})`;
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
      cashAmount: Number(cashPaymentAmount.toFixed(2)),
      onlineAmount: Number(onlinePaymentAmount.toFixed(2)),
      onlineMethod: onlinePaymentMethod,
      change: Number(totals.change.toFixed(2)),
    };

    // Prepare items data
    const items = cartData
      .map((item) => {
        if (!item) return null;

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
          category: isDrinkItem(item) ? "drink" : "food",
          id: item.id || Date.now().toString(),
        };
      })
      .filter((item) => item !== null);

    // Prepare customer details based on type
    const customerName =
      customerType === "walk-in" ? "Walk-in Customer" : "Take-out Customer";

    // ✅ CRITICAL FIX: Ensure we have a valid user ID
    let userId = user?._id;

    // Double-check if user ID is valid
    if (!userId || userId === "000000000000000000000001") {
      // Try to get from localStorage again
      try {
        const token = localStorage.getItem("authToken");
        if (token) {
          const payload = JSON.parse(atob(token.split(".")[1]));
          userId = payload?._id || payload?.userId || payload?.id;
        }
      } catch (error) {
        console.error("Error extracting user ID from token:", error);
      }
    }

    // ✅ FIXED: Generate unique order number to avoid duplicate key error
    const orderIdValue = currentOrder?.id || `order-${Date.now()}`;
    const orderNumber = generateOrderNumber(); // Use unique order number

    return {
      customerDetails: {
        name: customerName,
        phone: "",
        guests: 1,
        email: "",
        address: "",
      },
      customerType: customerType,
      customerStatus: customerType === "walk-in" ? "Dine-in" : "Take-out",
      items,
      bills,
      paymentMethod: paymentMethodDetails,
      paymentDetails: {
        cashAmount: cashPaymentAmount,
        onlineAmount: onlinePaymentAmount,
        onlineMethod: onlinePaymentMethod,
        isMixedPayment: mixedPayment.isMixed,
      },
      paymentStatus: "Completed",
      orderStatus: "Completed",
      pwdSeniorDetails: pwdSeniorDiscountApplied ? pwdSeniorDetails : null,
      pwdSeniorDiscountApplied: pwdSeniorDiscountApplied,
      pwdSeniorSelectedItems: pwdSeniorDiscountApplied
        ? pwdSeniorDiscountItems
        : [],
      cashier: user?.name || "Admin",
      user: userId || "000000000000000000000001",
      tableId: currentOrder?.tableId || null,
      orderNumber: orderNumber, // ✅ Now guaranteed to be unique
      totalAmount: Number(totals.total.toFixed(2)),
      cashAmount: Number(cashPaymentAmount.toFixed(2)),
      onlineAmount: Number(onlinePaymentAmount.toFixed(2)),
      change: Number(totals.change.toFixed(2)),
      orderId: orderIdValue,
    };
  };

  // ✅ Generate invoice data for Redux and display
  const generateInvoiceData = () => {
    const orderData = prepareOrderData();

    // Create invoice items from combined cart
    const invoiceItems = combinedCart
      .map((item) => {
        if (!item) return null;

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
      })
      .filter((item) => item !== null);

    // Create complete invoice order info
    return {
      ...orderData,
      id: currentOrder?.id || orderData.orderId,
      number: orderData.orderNumber, // Use the generated order number
      items: invoiceItems,
      customer: {
        customerName: orderData.customerDetails.name,
        ...currentOrder?.customer,
      },
      bills: {
        ...orderData.bills,
        netSales: totals.netSales,
      },
      orderStatus: "Completed",
      orderDate: new Date().toISOString(),
      cashier: user?.name || "Admin",
      orderNumber: orderData.orderNumber,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  };

  // ✅ FIXED: Reset all states after order completion
  const resetAllStates = () => {
    setPwdSeniorDiscountApplied(false);
    setEmployeeDiscountApplied(false);
    setShareholderDiscountApplied(false);
    setPaymentMethod(null);
    setShowRedeemOptions(false);
    setPwdSeniorDiscountItems([]);
    setShowPwdSeniorSelection(false);
    setPwdSeniorDetails({
      name: "",
      idNumber: "",
      type: "PWD",
    });
    setCustomerType("walk-in");
    setCashAmount(0);
    setShowCashModal(false);
    setShowOnlineOptions(false);
    setMixedPayment({
      isMixed: false,
      cashAmount: 0,
      onlineAmount: 0,
      onlineMethod: null,
    });
    setShowMixedPaymentModal(false);
    setActiveCategory(null);
  };

  // ✅ FIXED: Order mutation - Show invoice immediately and reset
  const orderMutation = useMutation({
    mutationFn: (reqData) => {
      console.log("📤 Sending order to backend:", reqData);
      return addOrder(reqData);
    },
    onSuccess: async (res) => {
      console.log("✅ Order success response:", res);

      if (!res || !res.data) {
        throw new Error("Invalid response from server");
      }

      const { data } = res.data;

      // Generate invoice data
      const invoiceData = generateInvoiceData();

      // Mark order as completed with invoice data
      if (currentOrder) {
        console.log("✅ Completing order in Redux with invoice data");
        dispatch(
          completeOrder({
            orderId: currentOrder.id,
            orderData: {
              ...invoiceData,
              _id: data._id || invoiceData._id,
              orderNumber: data.orderNumber || invoiceData.orderNumber,
              bills: data.bills || invoiceData.bills,
            },
          })
        );

        // Clear current order to reset the bill
        dispatch(clearCurrentOrder());
      }

      enqueueSnackbar("Order placed successfully! Invoice is ready.", {
        variant: "success",
      });

      setIsProcessing(false);

      // Show invoice immediately
      setInvoiceData({
        ...invoiceData,
        _id: data._id || invoiceData._id,
      });
      setShowInvoice(true);

      // Reset all states
      resetAllStates();

      // Call parent callback if provided
      if (onInvoiceGenerated) {
        onInvoiceGenerated({
          ...invoiceData,
          _id: data._id || invoiceData._id,
        });
      }
    },
    onError: (error) => {
      console.error("❌ Order placement error:", error);

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

  // ✅ FIXED: Handle cash amount submission
  const handleCashSubmit = () => {
    const cashAmountNum = safeNumber(cashAmount);

    if (cashAmountNum >= totals.total) {
      // Full cash payment
      setPaymentMethod("Cash");
      setShowCashModal(false);
      // Set cash amount for display
      setCashAmount(cashAmountNum);
      enqueueSnackbar(`Cash payment set: ₱${cashAmountNum.toFixed(2)}`, {
        variant: "success",
      });
    } else if (cashAmountNum > 0) {
      // Partial cash payment - offer mixed payment
      const remaining = totals.total - cashAmountNum;
      setShowMixedPaymentModal(true);
      setMixedPayment((prev) => ({
        ...prev,
        cashAmount: cashAmountNum,
        onlineAmount: remaining,
      }));
      setShowCashModal(false);
    } else {
      enqueueSnackbar("Please enter a valid cash amount", {
        variant: "error",
      });
    }
  };

  // ✅ FIXED: Main handlePlaceOrder function
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

    // Validate payment amounts based on payment method
    if (paymentMethod === "Cash") {
      // For cash payment, cash amount must be entered and sufficient
      if (totals.cashAmount < totals.total) {
        enqueueSnackbar(
          `Cash amount (₱${totals.cashAmount.toFixed(
            2
          )}) is less than total (₱${totals.total.toFixed(
            2
          )}). Please enter more cash or select a different payment method.`,
          {
            variant: "error",
          }
        );
        return;
      }
    } else if (mixedPayment.isMixed) {
      // For mixed payment, validate both amounts
      const totalPaid = mixedPayment.cashAmount + mixedPayment.onlineAmount;
      if (totalPaid < totals.total) {
        enqueueSnackbar(
          `Total payment (₱${totalPaid.toFixed(
            2
          )}) is less than order total (₱${totals.total.toFixed(2)})`,
          {
            variant: "error",
          }
        );
        return;
      }
    }

    setIsProcessing(true);

    // MARK ORDER AS PROCESSING FIRST
    if (currentOrder) {
      console.log("Dispatching processOrder for:", currentOrder.id);
      dispatch(processOrder(currentOrder.id));
    }

    const orderData = prepareOrderData();
    console.log("📦 Sending order data:", JSON.stringify(orderData, null, 2));

    // Submit order
    orderMutation.mutate(orderData);
  };

  // Handle cancel in cash modal
  const handleCancelCashModal = () => {
    setShowCashModal(false);
    // Reset payment method so Cash button can be clicked again
    setPaymentMethod(null);
    setCashAmount(0);
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

  // Handle invoice close
  const handleCloseInvoice = () => {
    setShowInvoice(false);
    setInvoiceData(null);
  };

  // If no current order, show empty state
  if (!currentOrder && !showInvoice) {
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

  // Invoice Modal
  const InvoiceModal = () => {
    if (!showInvoice || !invoiceData) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">INVOICE</h2>
            <button
              onClick={handleCloseInvoice}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Invoice Header */}
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <div>
                <p className="text-sm text-gray-600">Order #</p>
                <p className="font-semibold">{invoiceData.orderNumber}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Date</p>
                <p className="font-semibold">
                  {new Date(invoiceData.orderDate).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-600">Customer</p>
              <p className="font-semibold">
                {invoiceData.customerDetails.name}
              </p>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-600">Cashier</p>
              <p className="font-semibold">{invoiceData.cashier}</p>
            </div>
          </div>

          {/* Invoice Items */}
          <div className="mb-6">
            <h3 className="font-semibold text-lg mb-3">Order Items</h3>
            <div className="space-y-3">
              {invoiceData.items.map((item, index) => (
                <div key={index} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-gray-600">
                      {item.quantity} × ₱{item.pricePerQuantity.toFixed(2)}
                    </p>
                  </div>
                  <p className="font-bold">
                    {item.isFree ? (
                      <span className="text-green-600">FREE</span>
                    ) : (
                      `₱${item.price.toFixed(2)}`
                    )}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Invoice Totals */}
          <div className="border-t pt-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span>₱{invoiceData.bills.total.toFixed(2)}</span>
              </div>

              {invoiceData.bills.pwdSeniorDiscount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>PWD/Senior Discount:</span>
                  <span>
                    -₱{invoiceData.bills.pwdSeniorDiscount.toFixed(2)}
                  </span>
                </div>
              )}

              {invoiceData.bills.employeeDiscount > 0 && (
                <div className="flex justify-between text-yellow-600">
                  <span>Employee Discount:</span>
                  <span>-₱{invoiceData.bills.employeeDiscount.toFixed(2)}</span>
                </div>
              )}

              {invoiceData.bills.shareholderDiscount > 0 && (
                <div className="flex justify-between text-purple-600">
                  <span>Shareholder Discount:</span>
                  <span>
                    -₱{invoiceData.bills.shareholderDiscount.toFixed(2)}
                  </span>
                </div>
              )}

              {invoiceData.bills.redemptionDiscount > 0 && (
                <div className="flex justify-between text-blue-600">
                  <span>Redemption Discount:</span>
                  <span>
                    -₱{invoiceData.bills.redemptionDiscount.toFixed(2)}
                  </span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-gray-600">VAT (12%):</span>
                <span>₱{invoiceData.bills.tax.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>TOTAL:</span>
                <span>₱{invoiceData.bills.totalWithTax.toFixed(2)}</span>
              </div>

              {invoiceData.bills.cashAmount > 0 && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cash:</span>
                    <span>₱{invoiceData.bills.cashAmount.toFixed(2)}</span>
                  </div>

                  {invoiceData.bills.onlineAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">
                        Online ({invoiceData.bills.onlineMethod}):
                      </span>
                      <span>₱{invoiceData.bills.onlineAmount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-green-600">
                    <span>Change:</span>
                    <span>₱{invoiceData.bills.change.toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Payment Method */}
          <div className="mt-6 pt-4 border-t">
            <p className="text-gray-600">Payment Method:</p>
            <p className="font-bold">{invoiceData.paymentMethod}</p>
          </div>

          {/* Thank You Message */}
          <div className="mt-8 text-center">
            <p className="text-gray-600 italic">Thank you for your purchase!</p>
            <p className="text-sm text-gray-500 mt-2">
              Order ID: {invoiceData._id}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex gap-3">
            <button
              onClick={handleCloseInvoice}
              className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-300 transition-colors"
            >
              Close Invoice
            </button>
            <button
              onClick={() => {
                navigate(`/invoice/${invoiceData._id}`);
                handleCloseInvoice();
              }}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors"
            >
              View Full Invoice
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Invoice Modal */}
      <InvoiceModal />

      {/* Main content */}
      <div className="w-full h-screen overflow-y-auto bg-gray-100 px-4 py-6 pb-32">
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
                  min="0"
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
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Remaining:</span>
                  <span className="text-lg font-bold text-orange-600">
                    ₱
                    {Math.max(0, totals.total - safeNumber(cashAmount)).toFixed(
                      2
                    )}
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

                {safeNumber(cashAmount) < totals.total && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      <span className="font-semibold">Note:</span> Cash amount
                      is insufficient. You can pay the remaining ₱
                      {(totals.total - safeNumber(cashAmount)).toFixed(2)}{" "}
                      online.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleCancelCashModal}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCashSubmit}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors"
                >
                  {safeNumber(cashAmount) >= totals.total
                    ? "Confirm Cash Payment"
                    : "Continue with Partial Payment"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mixed Payment Modal */}
        {showMixedPaymentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">
                Mixed Payment - Complete Payment Online
              </h3>

              <div className="mb-4">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cash Amount
                  </label>
                  <input
                    type="number"
                    value={cashAmount}
                    onChange={handleMixedPaymentCashChange}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg text-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg mb-4">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-600">Order Total:</span>
                    <span className="text-sm font-bold text-gray-900">
                      ₱{totals.total.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-600">Cash Payment:</span>
                    <span className="text-sm font-bold text-gray-900">
                      ₱{safeNumber(cashAmount).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600">Remaining:</span>
                    <span className="text-sm font-bold text-orange-600">
                      ₱
                      {Math.max(
                        0,
                        totals.total - safeNumber(cashAmount)
                      ).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-sm text-gray-600">Change Due:</span>
                    <span className="text-sm font-bold text-green-600">
                      ₱
                      {Math.max(
                        0,
                        safeNumber(cashAmount) - totals.total
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pay Remaining Online with:
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() =>
                        setMixedPayment((prev) => ({
                          ...prev,
                          onlineMethod: "BDO",
                        }))
                      }
                      className={`px-4 py-3 rounded-lg font-semibold text-sm ${
                        mixedPayment.onlineMethod === "BDO"
                          ? "bg-blue-600 text-white"
                          : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                      } transition-colors`}
                    >
                      BDO
                    </button>
                    <button
                      onClick={() =>
                        setMixedPayment((prev) => ({
                          ...prev,
                          onlineMethod: "GCASH",
                        }))
                      }
                      className={`px-4 py-3 rounded-lg font-semibold text-sm ${
                        mixedPayment.onlineMethod === "GCASH"
                          ? "bg-green-600 text-white"
                          : "bg-green-100 text-green-700 hover:bg-green-200"
                      } transition-colors`}
                    >
                      GCASH
                    </button>
                  </div>
                </div>

                {mixedPayment.onlineMethod && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-blue-800">
                          Online Payment ({mixedPayment.onlineMethod})
                        </p>
                        <p className="text-xs text-blue-600">
                          Amount: ₱
                          {Math.max(
                            0,
                            totals.total - safeNumber(cashAmount)
                          ).toFixed(2)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-blue-800">
                          ₱
                          {Math.max(
                            0,
                            totals.total - safeNumber(cashAmount)
                          ).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowMixedPaymentModal(false);
                    setShowCashModal(true);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-300 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleMixedPaymentConfirm}
                  disabled={!mixedPayment.onlineMethod}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirm Mixed Payment
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
                  onClick={() => {
                    setShowOnlineOptions(false);
                    setPaymentMethod(null);
                  }}
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
            <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row">
              {/* Left Panel - Details Form */}
              <div className="md:w-1/3 border-r border-gray-200 flex flex-col">
                <div className="md:hidden flex items-center justify-between p-4 border-b border-gray-200 bg-blue-50">
                  <h3 className="text-lg font-semibold text-blue-800">
                    PWD/Senior Discount
                  </h3>
                  <button
                    onClick={handleCancelPwdSeniorSelection}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-6">
                  <div className="hidden md:block mb-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      PWD/Senior Discount Application
                    </h3>
                    <p className="text-sm text-gray-600">
                      Apply 20% discount to selected items (max 3 items: 1 drink
                      + 2 food)
                    </p>
                  </div>

                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">
                      Holder Information
                    </h4>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-2">
                          Discount Type *
                        </label>
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              setPwdSeniorDetails((prev) => ({
                                ...prev,
                                type: "PWD",
                              }))
                            }
                            className={`flex-1 px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                              pwdSeniorDetails.type === "PWD"
                                ? "bg-blue-600 text-white border-blue-600"
                                : "bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100"
                            }`}
                          >
                            PWD
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setPwdSeniorDetails((prev) => ({
                                ...prev,
                                type: "Senior",
                              }))
                            }
                            className={`flex-1 px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                              pwdSeniorDetails.type === "Senior"
                                ? "bg-blue-600 text-white border-blue-600"
                                : "bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100"
                            }`}
                          >
                            Senior Citizen
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-2">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={pwdSeniorDetails.name}
                          onChange={handlePwdSeniorDetailsChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                          placeholder="Enter full name"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-2">
                          ID Number *
                        </label>
                        <input
                          type="text"
                          name="idNumber"
                          value={pwdSeniorDetails.idNumber}
                          onChange={handlePwdSeniorDetailsChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                          placeholder="Enter ID number"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-medium text-blue-800">
                        Selected Items
                      </span>
                      <span className="text-sm font-bold text-blue-800">
                        {pwdSeniorDiscountItems.length}/3
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div
                          className={`text-lg font-bold mb-1 ${
                            pwdSeniorDiscountItems.filter((item) =>
                              isDrinkItem(item)
                            ).length === 1
                              ? "text-green-600"
                              : "text-gray-400"
                          }`}
                        >
                          {
                            pwdSeniorDiscountItems.filter((item) =>
                              isDrinkItem(item)
                            ).length
                          }
                        </div>
                        <div className="text-xs text-gray-600">
                          Drinks (max 1)
                        </div>
                      </div>
                      <div className="text-center">
                        <div
                          className={`text-lg font-bold mb-1 ${
                            pwdSeniorDiscountItems.filter((item) =>
                              isFoodItem(item)
                            ).length <= 2
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {
                            pwdSeniorDiscountItems.filter((item) =>
                              isFoodItem(item)
                            ).length
                          }
                        </div>
                        <div className="text-xs text-gray-600">
                          Food (max 2)
                        </div>
                      </div>
                    </div>

                    {pwdSeniorDiscountItems.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-blue-200">
                        <p className="text-xs font-medium text-blue-800 mb-2">
                          Selected Items:
                        </p>
                        <div className="space-y-2">
                          {pwdSeniorDiscountItems.map((item, index) => {
                            if (!item) return null;
                            const itemValue = calculateItemTotalPrice(item);
                            const discountAmount =
                              itemValue * pwdSeniorDiscountRate;

                            return (
                              <div
                                key={`selected-${index}`}
                                className="flex justify-between items-center text-sm"
                              >
                                <span className="text-gray-700 truncate max-w-[120px]">
                                  {item.name}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500">
                                    -₱{discountAmount.toFixed(2)}
                                  </span>
                                  <button
                                    onClick={() => toggleItemSelection(item)}
                                    className="text-red-500 hover:text-red-700 text-xs"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">
                        Selected Value:
                      </span>
                      <span className="text-sm font-bold text-gray-900">
                        ₱
                        {pwdSeniorDiscountItems
                          .reduce(
                            (sum, item) => sum + calculateItemTotalPrice(item),
                            0
                          )
                          .toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">
                        20% Discount:
                      </span>
                      <span className="text-sm font-bold text-green-600">
                        -₱
                        {(
                          pwdSeniorDiscountItems.reduce(
                            (sum, item) => sum + calculateItemTotalPrice(item),
                            0
                          ) * pwdSeniorDiscountRate
                        ).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-gray-300">
                      <span className="text-sm font-medium text-gray-900">
                        Final Amount:
                      </span>
                      <span className="text-lg font-bold text-blue-600">
                        ₱
                        {(
                          pwdSeniorDiscountItems.reduce(
                            (sum, item) => sum + calculateItemTotalPrice(item),
                            0
                          ) *
                          (1 - pwdSeniorDiscountRate)
                        ).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Panel - Items Selection */}
              <div className="md:w-2/3 flex flex-col">
                <div className="md:hidden p-4 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-gray-900">
                      Select Items for Discount
                    </h4>
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-gray-500">
                        {
                          combinedCart.filter(
                            (item) => isDrinkItem(item) || isFoodItem(item)
                          ).length
                        }{" "}
                        eligible items
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-6">
                  <div className="md:hidden flex mb-4 border-b border-gray-200">
                    <button
                      type="button"
                      className={`flex-1 px-4 py-2 text-sm font-medium border-b-2 ${
                        !activeCategory
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                      onClick={() => setActiveCategory(null)}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      className={`flex-1 px-4 py-2 text-sm font-medium border-b-2 ${
                        activeCategory === "drink"
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                      onClick={() => setActiveCategory("drink")}
                    >
                      Drinks
                    </button>
                    <button
                      type="button"
                      className={`flex-1 px-4 py-2 text-sm font-medium border-b-2 ${
                        activeCategory === "food"
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                      onClick={() => setActiveCategory("food")}
                    >
                      Food
                    </button>
                  </div>

                  {combinedCart.filter((item) => {
                    if (!item) return false;
                    const isEligible = isDrinkItem(item) || isFoodItem(item);
                    if (!activeCategory) return isEligible;
                    if (activeCategory === "drink") return isDrinkItem(item);
                    if (activeCategory === "food") return isFoodItem(item);
                    return isEligible;
                  }).length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                      {combinedCart
                        .filter((item) => {
                          if (!item) return false;
                          const isEligible =
                            isDrinkItem(item) || isFoodItem(item);
                          if (!activeCategory) return isEligible;
                          if (activeCategory === "drink")
                            return isDrinkItem(item);
                          if (activeCategory === "food")
                            return isFoodItem(item);
                          return isEligible;
                        })
                        .map((item) => {
                          if (!item) return null;
                          const itemKey = getItemKey(item);
                          const isSelected = pwdSeniorDiscountItems.some(
                            (selected) => getItemKey(selected) === itemKey
                          );
                          const isDrink = isDrinkItem(item);
                          const isFood = isFoodItem(item);
                          const itemValue = calculateItemTotalPrice(item);
                          const discountAmount =
                            itemValue * pwdSeniorDiscountRate;
                          const discountedValue = itemValue - discountAmount;

                          return (
                            <div
                              key={itemKey}
                              className={`relative rounded-lg border transition-all cursor-pointer transform hover:-translate-y-1 ${
                                isSelected
                                  ? "border-green-500 bg-green-50 ring-2 ring-green-500 ring-opacity-50"
                                  : "border-gray-200 bg-white hover:bg-gray-50"
                              } ${
                                pwdSeniorDiscountItems.length >= 3 &&
                                !isSelected
                                  ? "opacity-50"
                                  : ""
                              }`}
                              onClick={() => {
                                if (
                                  pwdSeniorDiscountItems.length >= 3 &&
                                  !isSelected
                                ) {
                                  enqueueSnackbar(
                                    "Maximum 3 items can be selected",
                                    {
                                      variant: "warning",
                                    }
                                  );
                                  return;
                                }
                                toggleItemSelection(item);
                              }}
                            >
                              <div
                                className={`absolute top-3 right-3 w-6 h-6 rounded-full border flex items-center justify-center ${
                                  isSelected
                                    ? "bg-green-500 border-green-500"
                                    : "bg-white border-gray-300"
                                }`}
                              >
                                {isSelected && (
                                  <svg
                                    className="w-4 h-4 text-white"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={3}
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                )}
                              </div>

                              <div
                                className={`absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-medium ${
                                  isDrink
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-orange-100 text-orange-800"
                                }`}
                              >
                                {isDrink ? "DRINK" : "FOOD"}
                              </div>

                              <div className="p-4 pt-12">
                                <h4 className="text-sm font-semibold text-gray-900 mb-2 line-clamp-2 h-10">
                                  {item.name}
                                </h4>

                                <div className="space-y-2 mb-3">
                                  <div className="flex justify-between text-xs">
                                    <span className="text-gray-500">
                                      Quantity:
                                    </span>
                                    <span className="font-medium text-gray-700">
                                      {item.quantity}x
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-gray-500">
                                      Price:
                                    </span>
                                    <span className="font-medium text-gray-700">
                                      ₱
                                      {safeNumber(
                                        item.pricePerQuantity
                                      ).toFixed(2)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-gray-500">
                                      Total:
                                    </span>
                                    <span className="font-medium text-gray-700">
                                      ₱{itemValue.toFixed(2)}
                                    </span>
                                  </div>
                                </div>

                                {isSelected ? (
                                  <div className="p-2 bg-green-50 rounded border border-green-200">
                                    <div className="flex justify-between text-xs">
                                      <span className="text-green-700">
                                        Discount:
                                      </span>
                                      <span className="font-bold text-green-700">
                                        -₱{discountAmount.toFixed(2)}
                                      </span>
                                    </div>
                                    <div className="flex justify-between text-xs mt-1">
                                      <span className="text-green-900">
                                        Final:
                                      </span>
                                      <span className="font-bold text-green-900">
                                        ₱{discountedValue.toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-xs text-gray-500">
                                    20% off: -₱{discountAmount.toFixed(2)}
                                  </div>
                                )}

                                <div className="mt-3 text-xs">
                                  {isSelected ? (
                                    <span className="text-green-600 font-medium">
                                      ✓ Selected for discount
                                    </span>
                                  ) : (
                                    <span className="text-gray-500">
                                      Click to select
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-16 h-16 mb-4 text-gray-400">
                        <svg
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                          />
                        </svg>
                      </div>
                      <h4 className="text-lg font-medium text-gray-900 mb-2">
                        No Eligible Items
                      </h4>
                      <p className="text-sm text-gray-600 max-w-md">
                        Add drinks or food items to apply PWD/Senior discount.
                        Discount can only be applied to 1 drink and 2 food items
                        maximum.
                      </p>
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-200 p-4 md:p-6 bg-gray-50">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={handleCancelPwdSeniorSelection}
                      className="flex-1 px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>

                    <button
                      onClick={handleApplyPwdSeniorSelection}
                      disabled={
                        pwdSeniorDiscountItems.length === 0 ||
                        !pwdSeniorDetails.name.trim() ||
                        !pwdSeniorDetails.idNumber.trim()
                      }
                      className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-medium text-sm hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        Apply Discount
                        {pwdSeniorDiscountItems.length > 0 && (
                          <span className="bg-white text-green-600 text-xs font-bold px-2 py-1 rounded-full">
                            {pwdSeniorDiscountItems.length}
                          </span>
                        )}
                      </div>
                    </button>
                  </div>

                  <p className="text-xs text-gray-500 mt-3 text-center">
                    * 20% discount applied to selected items only. Maximum of 3
                    items (1 drink, 2 food).
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Show empty state if no current order */}
        {!currentOrder && !showInvoice ? (
          <div className="max-w-[600px] mx-auto">
            <div className="bg-white rounded-lg p-8 shadow-md text-center">
              <h2 className="text-gray-900 text-lg font-semibold mb-4">
                Order Completed!
              </h2>
              <p className="text-gray-500 text-sm mb-6">
                Your order has been placed successfully. Start a new order to
                continue.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors"
              >
                Start New Order
              </button>
            </div>
          </div>
        ) : (
          /* Show bill if there's a current order */
          <div className="max-w-[600px] mx-auto space-y-4 pb-8">
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
                  if (!item) return null;
                  const itemKey = getItemKey(item);
                  const isDiscounted = pwdSeniorDiscountItems.some(
                    (discountedItem) => getItemKey(discountedItem) === itemKey
                  );
                  const isDrink = isDrinkItem(item);
                  const isFood = isFoodItem(item);
                  const itemType = isDrink
                    ? "Drink"
                    : isFood
                    ? "Food"
                    : "Other";

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
                              onClick={() =>
                                handleRedeemItem(item.id, item.name)
                              }
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

              {pwdSeniorDiscountApplied &&
                totals.pwdSeniorDiscountAmount > 0 && (
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

              {(paymentMethod === "Cash" || mixedPayment.isMixed) &&
                totals.cashAmount > 0 && (
                  <>
                    <div className="flex justify-between items-center border-t pt-2">
                      <p className="text-xs text-gray-600 font-medium">Cash</p>
                      <p className="text-md text-gray-800 font-bold">
                        ₱{totals.cashAmount.toFixed(2)}
                      </p>
                    </div>
                    {mixedPayment.isMixed && totals.onlineAmount > 0 && (
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-gray-600 font-medium">
                          Online ({mixedPayment.onlineMethod})
                        </p>
                        <p className="text-md text-blue-800 font-bold">
                          ₱{totals.onlineAmount.toFixed(2)}
                        </p>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-gray-600 font-medium">
                        Change
                      </p>
                      <p className="text-md text-green-600 font-bold">
                        ₱{totals.change.toFixed(2)}
                      </p>
                    </div>
                  </>
                )}
            </div>

            {/* 🎟 DISCOUNT & REDEMPTION BUTTONS */}
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
                {employeeDiscountApplied
                  ? "✓ Employee/Owner"
                  : "Employee/Owner"}
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
                {shareholderDiscountApplied ? "✓ VIP" : "VIP"}
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
                onClick={handleCashPayment}
                disabled={isProcessing}
                className={`flex-1 px-3 py-2 rounded-lg font-semibold text-xs ${
                  paymentMethod === "Cash" || mixedPayment.isMixed
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {mixedPayment.isMixed ? "✓ Mixed Payment" : "Cash"}
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

            {/* 🧾 PLACE ORDER BUTTON */}
            <div className="flex flex-col sm:flex-row gap-3 mt-6 mb-6 pb-8">
              <button
                onClick={handlePlaceOrder}
                disabled={
                  isProcessing || !paymentMethod || cartData.length === 0
                }
                className="w-full px-4 py-4 rounded-lg font-semibold text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Processing...
                  </>
                ) : (
                  "Place Order & Show Invoice"
                )}
              </button>
            </div>

            {/* Extra spacing for bottom navigation safety */}
            <div className="h-12"></div>
          </div>
        )}
      </div>
    </>
  );
};

export default Bill;
