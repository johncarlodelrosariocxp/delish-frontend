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
  setActiveOrder,
} from "../../redux/slices/orderSlice";
import { addOrder } from "../../https/index";
import { enqueueSnackbar } from "notistack";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

const Bill = ({ orderId, onInvoiceGenerated, onOrderCompleted }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Get order-specific data
  const orders = useSelector((state) => state.order.orders);
  const activeOrderId = useSelector((state) => state.order.activeOrderId);

  // ✅ Get user data
  const userState = useSelector((state) => state.auth);

  // ✅ Extract user with multiple fallbacks
  const user = React.useMemo(() => {
    const possiblePaths = [
      userState?.user,
      userState?.data?.user,
      userState?.data?.data?.user,
      userState?.userData,
      userState?.currentUser,
    ];

    const foundUser = possiblePaths.find(Boolean);
    if (foundUser) return foundUser;

    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) return JSON.parse(storedUser);
    } catch (error) {
      console.error("Error parsing localStorage user:", error);
    }

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

    return {
      _id: "000000000000000000000001",
      name: "Admin",
      role: "admin",
    };
  }, [userState]);

  // ✅ FIXED: Find current order and next order
  const findCurrentOrder = () => {
    // If specific orderId is provided, use it
    if (orderId) {
      return orders.find((order) => order.id === orderId);
    }

    // If there's an activeOrderId, use it
    if (activeOrderId) {
      return orders.find((order) => order.id === activeOrderId);
    }

    // Otherwise find the first order that is not completed
    return orders.find(
      (order) =>
        !order.orderStatus ||
        order.orderStatus === "pending" ||
        order.orderStatus === "processing" ||
        order.orderStatus === "in-progress" ||
        order.status === "pending" ||
        order.status === "processing" ||
        order.status === "in-progress"
    );
  };

  // ✅ Find the next pending order
  const findNextPendingOrder = () => {
    const pendingOrders = orders.filter(
      (order) =>
        !order.orderStatus ||
        order.orderStatus === "pending" ||
        order.orderStatus === "processing" ||
        order.orderStatus === "in-progress" ||
        order.status === "pending" ||
        order.status === "processing" ||
        order.status === "in-progress"
    );

    // Find the first order that's NOT the current one
    return pendingOrders.find((order) => order.id !== currentOrder?.id);
  };

  const currentOrder = findCurrentOrder();
  const nextOrder = findNextPendingOrder();
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
  const [showNextOrderConfirm, setShowNextOrderConfirm] = useState(false);

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
      name.includes("beverage")
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
      name.includes("pizza")
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
      const totalPaid = cashAmountNum + onlineAmountNum;

      let change = 0;
      if (paymentMethod === "Cash") {
        change = Math.max(0, cashAmountNum - total);
      } else if (paymentMethod === "Mixed" || mixedPayment.isMixed) {
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
        totalPaid,
        change,
        remainingBalance: Math.max(0, total - totalPaid),
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
        totalPaid: 0,
        change: 0,
        remainingBalance: 0,
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

    if (item.isRedeemed) return 0;

    const isDiscounted = pwdSeniorDiscountItems.some(
      (discountedItem) => getItemKey(discountedItem) === getItemKey(item)
    );

    if (isDiscounted) {
      const originalTotal =
        safeNumber(item.quantity) * safeNumber(item.pricePerQuantity);
      return originalTotal * (1 - pwdSeniorDiscountRate);
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

      if (isDrinkItem(item)) {
        if (drinks.length >= 1) {
          enqueueSnackbar(
            "Maximum 1 drink can be selected for PWD/Senior discount",
            { variant: "warning" }
          );
          return;
        }
      } else if (isFoodItem(item)) {
        if (foods.length >= 2) {
          enqueueSnackbar(
            "Maximum 2 food items can be selected for PWD/Senior discount",
            { variant: "warning" }
          );
          return;
        }
      } else {
        enqueueSnackbar(
          "Only drinks and food items are eligible for PWD/Senior discount",
          { variant: "warning" }
        );
        return;
      }

      if (pwdSeniorDiscountItems.length >= 3) {
        enqueueSnackbar(
          "Maximum 3 items can be selected for PWD/Senior discount",
          { variant: "warning" }
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

    enqueueSnackbar(message, { variant: "success" });
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
    enqueueSnackbar("PWD/Senior discount removed", { variant: "info" });
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
      { variant: "info" }
    );
  };

  // ✅ FIXED: Handle cash payment selection
  const handleCashPayment = () => {
    setPaymentMethod("Cash");
    setCashAmount(0);
    setMixedPayment({
      isMixed: false,
      cashAmount: 0,
      onlineAmount: 0,
      onlineMethod: null,
    });
    setShowCashModal(true);
  };

  // ✅ FIXED: Handle online payment selection
  const handleOnlinePaymentSelect = (method) => {
    setPaymentMethod(method);
    setShowOnlineOptions(false);
    setMixedPayment({
      isMixed: false,
      cashAmount: 0,
      onlineAmount: 0,
      onlineMethod: null,
    });
    setCashAmount(0);
    enqueueSnackbar(`Payment method set to ${method}`, { variant: "success" });
  };

  // ✅ FIXED: Handle mixed payment selection
  const handleMixedPaymentSelect = () => {
    // Pre-fill cash amount if already entered
    if (cashAmount > 0) {
      setMixedPayment((prev) => ({
        ...prev,
        cashAmount: cashAmount,
        onlineAmount: Math.max(0, totals.total - cashAmount),
        isMixed: true,
      }));
    }
    setShowMixedPaymentModal(true);
  };

  // ✅ FIXED: Handle mixed payment confirmation
  const handleMixedPaymentConfirm = () => {
    const cashAmountNum = safeNumber(mixedPayment.cashAmount);
    const onlineAmountNum = safeNumber(mixedPayment.onlineAmount);
    const totalPaid = cashAmountNum + onlineAmountNum;

    // Allow partial payments but warn
    if (totalPaid < totals.total) {
      const remaining = totals.total - totalPaid;
      const confirm = window.confirm(
        `Total payment (₱${totalPaid.toFixed(
          2
        )}) is less than order total (₱${totals.total.toFixed(
          2
        )}). Remaining balance: ₱${remaining.toFixed(
          2
        )}\n\nProceed with partial payment?`
      );
      if (!confirm) return;
    }

    // Set payment method and update cash amount
    setPaymentMethod("Mixed");
    setCashAmount(cashAmountNum);
    setShowMixedPaymentModal(false);
    setShowCashModal(false);

    const message = `Mixed payment set: ₱${cashAmountNum.toFixed(2)} Cash${
      mixedPayment.onlineMethod
        ? ` + ₱${onlineAmountNum.toFixed(2)} ${mixedPayment.onlineMethod}`
        : ""
    }${totalPaid < totals.total ? ` (Partial Payment)` : ""}`;

    enqueueSnackbar(message, { variant: "success" });
  };

  // Handle denomination button click
  const handleDenominationClick = (amount) => {
    setCashAmount((prev) => safeNumber(prev) + amount);
  };

  // Handle cash amount change for mixed payment
  const handleMixedPaymentCashChange = (e) => {
    const newCashAmount = safeNumber(e.target.value);
    setCashAmount(newCashAmount);

    const remaining = Math.max(0, totals.total - newCashAmount);
    setMixedPayment((prev) => ({
      ...prev,
      cashAmount: newCashAmount,
      onlineAmount: remaining,
      isMixed: true,
    }));
  };

  // Generate unique order number
  const generateOrderNumber = () => {
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 1000);
    return `ORD-${timestamp}-${randomSuffix}`;
  };

  // ✅ FIXED: Prepare order data with proper payment handling
  const prepareOrderData = () => {
    // Determine payment details
    let paymentMethodValue = "Cash";
    let cashPaymentAmount = safeNumber(cashAmount);
    let onlinePaymentAmount = 0;
    let onlinePaymentMethod = null;
    let isMixedPayment = false;

    // Calculate totals
    const totalPaid = cashPaymentAmount + onlinePaymentAmount;
    const isPartialPayment = totalPaid < totals.total;
    const remainingBalance = isPartialPayment ? totals.total - totalPaid : 0;

    // Set payment method based on selection
    if (paymentMethod === "Cash") {
      paymentMethodValue = "Cash";
    } else if (paymentMethod === "BDO") {
      paymentMethodValue = "BDO";
      onlinePaymentAmount = totals.total;
      onlinePaymentMethod = "BDO";
      cashPaymentAmount = 0;
    } else if (paymentMethod === "GCASH") {
      paymentMethodValue = "GCASH";
      onlinePaymentAmount = totals.total;
      onlinePaymentMethod = "GCASH";
      cashPaymentAmount = 0;
    } else if (paymentMethod === "Mixed") {
      paymentMethodValue = "Mixed";
      isMixedPayment = true;
      onlinePaymentAmount = safeNumber(mixedPayment.onlineAmount);
      onlinePaymentMethod = mixedPayment.onlineMethod;
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
      isPartialPayment: isPartialPayment,
      remainingBalance: Number(remainingBalance.toFixed(2)),
      amountPaid: Number(totalPaid.toFixed(2)),
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

    // Prepare customer details
    const customerName =
      customerType === "walk-in" ? "Walk-in Customer" : "Take-out Customer";

    // Get user ID
    let userId = user?._id;
    if (!userId || userId === "000000000000000000000001") {
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

    const orderIdValue = currentOrder?.id || `order-${Date.now()}`;
    const orderNumber = generateOrderNumber();

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
      paymentMethod: paymentMethodValue,
      paymentDetails: {
        cashAmount: cashPaymentAmount,
        onlineAmount: onlinePaymentAmount,
        onlineMethod: onlinePaymentMethod,
        isMixedPayment: isMixedPayment,
        isPartialPayment: isPartialPayment,
        remainingBalance: remainingBalance,
        paymentMethodDisplay: getPaymentMethodDisplay(
          paymentMethodValue,
          mixedPayment
        ),
      },
      paymentStatus: isPartialPayment ? "Partial" : "Completed",
      orderStatus: isPartialPayment ? "Pending" : "Completed",
      pwdSeniorDetails: pwdSeniorDiscountApplied ? pwdSeniorDetails : null,
      pwdSeniorDiscountApplied: pwdSeniorDiscountApplied,
      pwdSeniorSelectedItems: pwdSeniorDiscountApplied
        ? pwdSeniorDiscountItems
        : [],
      cashier: user?.name || "Admin",
      user: userId || "000000000000000000000001",
      tableId: currentOrder?.tableId || null,
      orderNumber: orderNumber,
      totalAmount: Number(totals.total.toFixed(2)),
      cashAmount: Number(cashPaymentAmount.toFixed(2)),
      onlineAmount: Number(onlinePaymentAmount.toFixed(2)),
      change: Number(totals.change.toFixed(2)),
      orderId: orderIdValue,
      isPartialPayment: isPartialPayment,
      remainingBalance: Number(remainingBalance.toFixed(2)),
      amountPaid: Number(totalPaid.toFixed(2)),
    };
  };

  // Helper function to get payment method display text
  const getPaymentMethodDisplay = (method, mixedPayment) => {
    if (method === "Mixed" && mixedPayment.onlineMethod) {
      return `Mixed (Cash + ${mixedPayment.onlineMethod})`;
    }
    return method;
  };

  // Generate invoice data for Redux and display
  const generateInvoiceData = () => {
    const orderData = prepareOrderData();

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

    return {
      ...orderData,
      id: currentOrder?.id || orderData.orderId,
      number: orderData.orderNumber,
      items: invoiceItems,
      customer: {
        customerName: orderData.customerDetails.name,
        ...currentOrder?.customer,
      },
      bills: {
        ...orderData.bills,
        netSales: totals.netSales,
      },
      orderStatus: orderData.isPartialPayment ? "Pending" : "Completed",
      orderDate: new Date().toISOString(),
      cashier: user?.name || "Admin",
      orderNumber: orderData.orderNumber,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      paymentMethod: orderData.paymentDetails.paymentMethodDisplay,
      isPartialPayment: orderData.isPartialPayment,
      remainingBalance: orderData.remainingBalance,
    };
  };

  // ✅ FIXED: Handle cash amount submission
  const handleCashSubmit = () => {
    const cashAmountNum = safeNumber(cashAmount);

    if (cashAmountNum <= 0) {
      enqueueSnackbar("Please enter a valid cash amount", {
        variant: "error",
      });
      return;
    }

    if (cashAmountNum >= totals.total) {
      // Full cash payment
      setPaymentMethod("Cash");
      setShowCashModal(false);
      enqueueSnackbar(`Full cash payment: ₱${cashAmountNum.toFixed(2)}`, {
        variant: "success",
      });
    } else {
      // Partial cash payment - offer mixed payment
      const remaining = totals.total - cashAmountNum;
      setMixedPayment((prev) => ({
        ...prev,
        cashAmount: cashAmountNum,
        onlineAmount: remaining,
        isMixed: true,
      }));
      setShowMixedPaymentModal(true);
      setShowCashModal(false);
      enqueueSnackbar(
        `Partial cash payment: ₱${cashAmountNum.toFixed(
          2
        )}. Please complete payment online.`,
        { variant: "info" }
      );
    }
  };

  // ✅ FIXED: Order mutation
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
      }

      // Clear current order
      dispatch(clearCurrentOrder());

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

  // ✅ FIXED: Main handlePlaceOrder function
  const handlePlaceOrder = async () => {
    if (isProcessing) return;

    console.log("Starting order placement...");

    // Basic validation
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

    // Check if payment is sufficient
    const totalPaid = totals.cashAmount + totals.onlineAmount;
    if (totalPaid < totals.total) {
      const confirm = window.confirm(
        `Total payment (₱${totalPaid.toFixed(
          2
        )}) is less than order total (₱${totals.total.toFixed(
          2
        )}). Remaining balance: ₱${(totals.total - totalPaid).toFixed(
          2
        )}\n\nProceed with partial payment?`
      );
      if (!confirm) return;
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

  // ✅ FIXED: Handle invoice close - auto go to next order
  const handleCloseInvoice = () => {
    setShowInvoice(false);
    setInvoiceData(null);

    // Reset all states for next order
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
    setIsProcessing(false);

    // Check if there's a next order
    if (nextOrder) {
      // Set the next order as active
      dispatch(setActiveOrder(nextOrder.id));
      enqueueSnackbar(`Now working on Order ${nextOrder.number}`, {
        variant: "info",
      });
    } else {
      // No next order - show empty state
      enqueueSnackbar("No more pending orders. Start a new order from menu.", {
        variant: "info",
      });
    }
  };

  // ✅ NEW: Handle go to next order directly
  const handleGoToNextOrder = () => {
    if (nextOrder) {
      dispatch(setActiveOrder(nextOrder.id));
      setShowNextOrderConfirm(false);
      enqueueSnackbar(`Now working on Order ${nextOrder.number}`, {
        variant: "info",
      });
    }
  };

  // ✅ FIXED: Main render logic
  if (!currentOrder && !showInvoice) {
    return (
      <div className="w-full h-screen overflow-y-auto bg-gray-100 px-4 py-6">
        <div className="max-w-[600px] mx-auto text-center">
          <div className="bg-white rounded-lg p-8 shadow-md">
            <div className="mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                  />
                </svg>
              </div>
              <h2 className="text-gray-900 text-xl font-semibold mb-2">
                {nextOrder ? "Switch to Next Order?" : "No Active Order"}
              </h2>
              <p className="text-gray-500 text-sm mb-6">
                {nextOrder
                  ? `There are ${
                      orders.filter(
                        (o) => !o.orderStatus || o.orderStatus === "pending"
                      ).length
                    } pending orders.`
                  : "Please select items from the menu to create an order."}
              </p>
              {nextOrder && (
                <div className="mb-6">
                  <button
                    onClick={() => {
                      dispatch(setActiveOrder(nextOrder.id));
                      enqueueSnackbar(
                        `Now working on Order ${nextOrder.number}`,
                        {
                          variant: "success",
                        }
                      );
                    }}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors"
                  >
                    Work on Order {nextOrder.number}
                  </button>
                </div>
              )}
              <div className="text-sm text-gray-600">
                <p className="mb-2">To start a new order:</p>
                <ol className="list-decimal list-inside space-y-1 text-left max-w-md mx-auto">
                  <li>Go to the menu section</li>
                  <li>Select items to add to cart</li>
                  <li>A new order will automatically appear here</li>
                </ol>
              </div>
            </div>
            <button
              onClick={() => navigate("/menu")}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors"
            >
              Go to Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Next Order Confirmation Modal */}
      {showNextOrderConfirm && nextOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Switch to Next Order?
              </h3>
              <p className="text-gray-600 mb-4">
                Do you want to start working on Order {nextOrder.number}?
              </p>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-gray-800">
                  Order {nextOrder.number} has {nextOrder.items?.length || 0}{" "}
                  items.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowNextOrderConfirm(false)}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-300 transition-colors"
              >
                Stay on Current
              </button>
              <button
                onClick={handleGoToNextOrder}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors"
              >
                Yes, Switch Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {showInvoice && invoiceData && (
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

              {/* Show Partial Payment Warning */}
              {invoiceData.isPartialPayment && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-5 h-5 text-yellow-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.795-.833-2.565 0L5.346 16.5c-.77.833.192 2.5 1.732 2.5z"
                      />
                    </svg>
                    <p className="text-sm font-medium text-yellow-800">
                      PARTIAL PAYMENT - Balance: ₱
                      {invoiceData.remainingBalance?.toFixed(2) || "0.00"}
                    </p>
                  </div>
                  <p className="text-xs text-yellow-700 mt-1">
                    Payment Status: {invoiceData.paymentStatus} | Order Status:{" "}
                    {invoiceData.orderStatus}
                  </p>
                </div>
              )}
            </div>

            {/* Invoice Items */}
            <div className="mb-6">
              <h3 className="font-semibold text-lg mb-3">Order Items</h3>
              <div className="space-y-3">
                {invoiceData.items.map((item, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center"
                  >
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
                    <span>
                      -₱{invoiceData.bills.employeeDiscount.toFixed(2)}
                    </span>
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

                {/* Show payment details */}
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount Paid:</span>
                    <span className="font-medium">
                      ₱{invoiceData.bills.amountPaid?.toFixed(2) || "0.00"}
                    </span>
                  </div>

                  {invoiceData.bills.cashAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cash:</span>
                      <span>₱{invoiceData.bills.cashAmount.toFixed(2)}</span>
                    </div>
                  )}

                  {invoiceData.bills.onlineAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">
                        Online ({invoiceData.bills.onlineMethod}):
                      </span>
                      <span>₱{invoiceData.bills.onlineAmount.toFixed(2)}</span>
                    </div>
                  )}

                  {invoiceData.bills.change > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Change:</span>
                      <span>₱{invoiceData.bills.change.toFixed(2)}</span>
                    </div>
                  )}

                  {invoiceData.isPartialPayment && (
                    <div className="flex justify-between text-red-600 font-bold mt-2 pt-2 border-t">
                      <span>Remaining Balance:</span>
                      <span>
                        ₱{invoiceData.remainingBalance?.toFixed(2) || "0.00"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="mt-6 pt-4 border-t">
              <p className="text-gray-600">Payment Method:</p>
              <p className="font-bold">{invoiceData.paymentMethod}</p>
              {invoiceData.isPartialPayment && (
                <p className="text-sm text-red-600 mt-1">
                  ⚠️ Partial Payment - Balance Due: ₱
                  {invoiceData.remainingBalance?.toFixed(2) || "0.00"}
                </p>
              )}
            </div>

            {/* Thank You Message */}
            <div className="mt-8 text-center">
              <p className="text-gray-600 italic">
                Thank you for your purchase!
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Order ID: {invoiceData._id}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleCloseInvoice}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
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
                {nextOrder
                  ? `Close & Go to Order ${nextOrder.number}`
                  : "Close Invoice"}
              </button>
              <button
                onClick={() => {
                  navigate(`/invoice/${invoiceData._id}`);
                }}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-medium text-sm hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
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
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                View Full Invoice
              </button>
            </div>

            {/* Next Order Info */}
            {nextOrder && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-800">
                      Next Order Available
                    </p>
                    <p className="text-xs text-blue-600">
                      Order {nextOrder.number} has{" "}
                      {nextOrder.items?.length || 0} items
                    </p>
                  </div>
                  <button
                    onClick={() => setShowNextOrderConfirm(true)}
                    className="text-sm text-blue-700 hover:text-blue-900 font-medium"
                  >
                    Switch Now →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
                  {[10, 20, 50, 100, 500, 1000].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => handleDenominationClick(amount)}
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-200 transition-colors"
                    >
                      ₱{amount}
                    </button>
                  ))}
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
                      is insufficient. You can:
                    </p>
                    <ul className="text-xs text-yellow-700 mt-2 list-disc pl-5">
                      <li>
                        Pay the remaining ₱
                        {(totals.total - safeNumber(cashAmount)).toFixed(2)}{" "}
                        online
                      </li>
                      <li>Submit as partial payment</li>
                      <li>Add more cash</li>
                    </ul>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={handleCashSubmit}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors"
                >
                  {safeNumber(cashAmount) >= totals.total
                    ? "Confirm Full Payment"
                    : "Continue with Partial Payment"}
                </button>
                <button
                  onClick={handleCancelCashModal}
                  className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-300 transition-colors"
                >
                  Cancel
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
                Complete Payment
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
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pay Remaining Online (Optional):
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
                  <p className="text-xs text-gray-500 mt-2">
                    Online payment is optional. You can submit as partial
                    payment.
                  </p>
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
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors"
                >
                  {mixedPayment.onlineMethod
                    ? "Confirm Mixed Payment"
                    : "Submit Partial Payment"}
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
                  BDO (Full Payment)
                </button>
                <button
                  onClick={() => handleOnlinePaymentSelect("GCASH")}
                  className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-semibold text-sm hover:bg-green-700 transition-colors"
                >
                  GCASH (Full Payment)
                </button>
                <button
                  onClick={() => {
                    setShowOnlineOptions(false);
                  }}
                  className="w-full px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold text-sm hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Show bill if there's a current order */}
        {currentOrder && (
          <div className="max-w-[600px] mx-auto space-y-4 pb-8">
            {/* Next Order Banner */}
            {nextOrder && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-800">
                      Next Order Available
                    </p>
                    <p className="text-xs text-blue-600">
                      Order {nextOrder.number} has{" "}
                      {nextOrder.items?.length || 0} items
                    </p>
                  </div>
                  <button
                    onClick={() => setShowNextOrderConfirm(true)}
                    className="text-sm text-blue-700 hover:text-blue-900 font-medium"
                  >
                    Switch Now →
                  </button>
                </div>
              </div>
            )}

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

              {/* Show payment details */}
              {paymentMethod &&
                (totals.cashAmount > 0 || totals.onlineAmount > 0) && (
                  <>
                    <div className="flex justify-between items-center border-t pt-2">
                      <p className="text-xs text-gray-600 font-medium">
                        Amount Paid
                      </p>
                      <p className="text-md text-gray-800 font-bold">
                        ₱{totals.totalPaid.toFixed(2)}
                      </p>
                    </div>

                    {totals.cashAmount > 0 && (
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-gray-600 font-medium">
                          Cash
                        </p>
                        <p className="text-md text-gray-800 font-bold">
                          ₱{totals.cashAmount.toFixed(2)}
                        </p>
                      </div>
                    )}

                    {totals.onlineAmount > 0 && (
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-gray-600 font-medium">
                          Online ({mixedPayment.onlineMethod})
                        </p>
                        <p className="text-md text-blue-800 font-bold">
                          ₱{totals.onlineAmount.toFixed(2)}
                        </p>
                      </div>
                    )}

                    {/* Show remaining balance if partial payment */}
                    {totals.remainingBalance > 0 && (
                      <div className="flex justify-between items-center text-red-600 bg-red-50 p-2 rounded">
                        <p className="text-xs font-bold">Remaining Balance:</p>
                        <p className="text-md font-bold">
                          ₱{totals.remainingBalance.toFixed(2)}
                        </p>
                      </div>
                    )}

                    {totals.change > 0 && (
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-gray-600 font-medium">
                          Change
                        </p>
                        <p className="text-md text-green-600 font-bold">
                          ₱{totals.change.toFixed(2)}
                        </p>
                      </div>
                    )}
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
                  paymentMethod === "Cash" || paymentMethod === "Mixed"
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {paymentMethod === "Mixed" ? "✓ Mixed Payment" : "Cash"}
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
                  <>
                    Place Order
                    {totals.remainingBalance > 0 && (
                      <span className="text-xs bg-yellow-500 text-white px-2 py-1 rounded-full">
                        Partial
                      </span>
                    )}
                  </>
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
