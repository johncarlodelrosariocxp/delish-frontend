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

  // Bluetooth printer state
  const [bluetoothPrinter, setBluetoothPrinter] = useState(null);
  const [isPrinterConnected, setIsPrinterConnected] = useState(false);

  // Bluetooth printer setup
  useEffect(() => {
    if (navigator.bluetooth) {
      checkPrinterConnection();
    }
  }, []);

  const checkPrinterConnection = async () => {
    try {
      const devices = await navigator.bluetooth.getDevices();
      if (devices.length > 0) {
        setIsPrinterConnected(true);
      }
    } catch (error) {
      console.log("No existing printer connection");
    }
  };

  const connectToPrinter = async () => {
    if (!navigator.bluetooth) {
      enqueueSnackbar("Bluetooth not supported on this device", {
        variant: "error",
      });
      return;
    }

    try {
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ["battery_service", "device_information"],
      });

      const server = await device.gatt.connect();
      setBluetoothPrinter(device);
      setIsPrinterConnected(true);

      enqueueSnackbar("Printer connected successfully!", {
        variant: "success",
      });

      localStorage.setItem("bluetoothPrinterId", device.id);
    } catch (error) {
      console.error("Bluetooth connection error:", error);
      enqueueSnackbar("Failed to connect to printer", { variant: "error" });
    }
  };

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

  // Thermal printer ESC/POS commands
  const ESC = "\x1B";
  const GS = "\x1D";
  const LF = "\x0A";

  const printerCommands = {
    INIT: ESC + "@",
    BOLD_ON: ESC + "E" + "\x01",
    BOLD_OFF: ESC + "E" + "\x00",
    ALIGN_LEFT: ESC + "a" + "\x00",
    ALIGN_CENTER: ESC + "a" + "\x01",
    ALIGN_RIGHT: ESC + "a" + "\x02",
    UNDERLINE_ON: ESC + "-" + "\x01",
    UNDERLINE_OFF: ESC + "-" + "\x00",
    CUT_PAPER: GS + "V" + "\x41" + "\x00",
    LINE_SPACING: ESC + "3" + "\x20",
    FEED_LINES: (lines) => ESC + "d" + String.fromCharCode(lines),
    SET_CHAR_SIZE: (width, height) =>
      GS + "!" + String.fromCharCode((height - 1) * 16 + (width - 1)),
    DRAWER_OPEN: ESC + "p" + "\x00" + "\x19" + "\xFA",
  };

  // Send data to Bluetooth printer
  const sendToPrinter = async (data) => {
    if (!bluetoothPrinter || !isPrinterConnected) {
      // Try to auto-connect
      await connectToPrinter();
      if (!isPrinterConnected) {
        throw new Error("Printer not connected");
      }
    }

    try {
      const encoder = new TextEncoder();
      const dataArray = encoder.encode(data);

      const server = await bluetoothPrinter.gatt.connect();
      const service = await server.getPrimaryService(
        "000018f0-0000-1000-8000-00805f9b34fb"
      );
      const characteristic = await service.getCharacteristic(
        "00002af1-0000-1000-8000-00805f9b34fb"
      );

      await characteristic.writeValue(dataArray);
      return true;
    } catch (error) {
      console.error("Print error:", error);
      throw error;
    }
  };

  // Generate receipt with proper ESC/POS commands
  const generateReceipt = (orderData) => {
    let receipt = "";

    // Initialize printer
    receipt += printerCommands.INIT;
    receipt += printerCommands.ALIGN_CENTER;
    receipt += printerCommands.BOLD_ON;
    receipt += printerCommands.SET_CHAR_SIZE(2, 2);
    receipt += "DELISH RESTAURANT" + LF;
    receipt += printerCommands.BOLD_OFF;
    receipt += printerCommands.SET_CHAR_SIZE(1, 1);
    receipt += "123 Main Street, City" + LF;
    receipt += "Phone: (123) 456-7890" + LF;
    receipt +=
      "Customer: " + (customerType === "walk-in" ? "Walk-in" : "Take-out") + LF;
    receipt += LF;

    // Order info
    receipt += printerCommands.ALIGN_LEFT;
    receipt += printerCommands.UNDERLINE_ON;
    receipt += "ORDER RECEIPT" + LF;
    receipt += printerCommands.UNDERLINE_OFF;
    receipt += LF;

    receipt += "Order #: " + (orderData._id?.slice(-8) || "N/A") + LF;
    receipt += "Date: " + new Date().toLocaleDateString() + LF;
    receipt += "Time: " + new Date().toLocaleTimeString() + LF;
    receipt +=
      "Status: Customer " +
      (customerType === "walk-in" ? "Dine-in" : "Take-out") +
      LF;
    receipt += LF;

    receipt += printerCommands.UNDERLINE_ON;
    receipt += "ITEMS" + LF;
    receipt += printerCommands.UNDERLINE_OFF;
    receipt += LF;

    // Items
    combinedCart.forEach((item) => {
      const name =
        item.name.length > 24 ? item.name.substring(0, 21) + "..." : item.name;
      const price = safeNumber(item.pricePerQuantity);
      const quantity = item.quantity;
      const total = calculateItemTotal(item);

      receipt += name + LF;
      receipt += "  " + quantity + " x ₱" + price.toFixed(2) + LF;
      receipt += "  " + "₱" + total.toFixed(2) + LF;
      if (item.isRedeemed) {
        receipt += "  [REDEEMED - FREE]" + LF;
      }
      receipt += LF;
    });

    // Divider
    receipt += "--------------------------------" + LF;

    // Totals
    receipt += printerCommands.ALIGN_RIGHT;
    receipt += "Subtotal:    ₱" + totals.baseGrossTotal.toFixed(2) + LF;

    if (totals.pwdSeniorDiscountAmount > 0) {
      receipt +=
        "PWD/Senior:   -₱" + totals.pwdSeniorDiscountAmount.toFixed(2) + LF;
    }

    if (totals.redemptionAmount > 0) {
      receipt += "Redemption:  -₱" + totals.redemptionAmount.toFixed(2) + LF;
    }

    if (totals.employeeDiscountAmount > 0) {
      receipt +=
        "Emp Disc:    -₱" + totals.employeeDiscountAmount.toFixed(2) + LF;
    }

    if (totals.shareholderDiscountAmount > 0) {
      receipt +=
        "Shareholder: -₱" + totals.shareholderDiscountAmount.toFixed(2) + LF;
    }

    receipt += "VAT (12%):   ₱" + totals.vatAmount.toFixed(2) + LF;
    receipt += "Total:       ₱" + totals.total.toFixed(2) + LF;

    if (paymentMethod === "Cash") {
      receipt += "Cash:        ₱" + totals.cashAmount.toFixed(2) + LF;
      receipt += "Change:      ₱" + totals.change.toFixed(2) + LF;
    }

    receipt += LF;
    receipt += printerCommands.ALIGN_CENTER;
    receipt += "Payment: " + paymentMethod + LF;
    receipt += "Cashier: " + (user?.name || "Admin") + LF;
    receipt += LF;
    receipt += "Thank you for dining with us!" + LF;
    receipt += "Please visit again!" + LF;
    receipt += LF;
    receipt += LF;

    // Cut paper
    receipt += printerCommands.CUT_PAPER;

    return receipt;
  };

  // Print receipt to Bluetooth printer
  const printReceipt = async (orderData) => {
    try {
      if (!isPrinterConnected) {
        await connectToPrinter();
      }

      if (isPrinterConnected) {
        const receipt = generateReceipt(orderData);
        const success = await sendToPrinter(receipt);

        if (success) {
          enqueueSnackbar("Receipt printed successfully!", {
            variant: "success",
          });

          // Open cash drawer if payment is cash
          if (paymentMethod === "Cash") {
            const cashDrawerCommand = printerCommands.DRAWER_OPEN;
            await sendToPrinter(cashDrawerCommand);
            enqueueSnackbar("Cash drawer opened", { variant: "info" });
          }
          return true;
        }
      } else {
        throw new Error("Could not connect to printer");
      }
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

      // PRINT RECEIPT AUTOMATICALLY
      setTimeout(async () => {
        try {
          await printReceipt(data);
          enqueueSnackbar("Receipt printed via Bluetooth!", {
            variant: "success",
          });
        } catch (error) {
          console.error("Failed to print:", error);
          enqueueSnackbar("Failed to print receipt", { variant: "warning" });
        }

        // Show invoice
        setShowInvoice(true);
        setIsProcessing(false);

        // Auto-close invoice after 5 seconds and navigate
        setTimeout(() => {
          setShowInvoice(false);
          navigate("/menu");
        }, 5000);
      }, 1000);
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

    // RAZORPAY PAYMENT
    if (paymentMethod === "Razorpay") {
      const res = await loadScript(
        "https://checkout.razorpay.com/v1/checkout.js"
      );

      if (!res) {
        enqueueSnackbar("Razorpay SDK failed to load. Are you online?", {
          variant: "error",
        });
        setIsProcessing(false);
        if (currentOrder) dispatch(resetOrderStatus(currentOrder.id));
        return;
      }

      try {
        const orderDataForRazorpay = {
          amount: Math.round(totals.total * 100), // amount in paisa
          currency: "PHP", // Assuming Philippine Peso for a local context
        };
        const { data: razorpayOrderResponse } = await createOrderRazorpay(
          orderDataForRazorpay
        );

        if (!razorpayOrderResponse || !razorpayOrderResponse.data) {
          throw new Error("Failed to create Razorpay order.");
        }

        const razorpayOrder = razorpayOrderResponse.data;

        const options = {
          key: process.env.REACT_APP_RAZORPAY_KEY_ID, // Enter the Key ID generated from the Razorpay Dashboard
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          name: "DELISH RESTAURANT",
          description: `Order Payment for ${currentOrder.id.slice(-8)}`,
          order_id: razorpayOrder.id,
          handler: async function (response) {
            try {
              const paymentVerificationData = {
                orderId: razorpayOrder.id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              };

              const { data: verificationResponse } =
                await verifyPaymentRazorpay(paymentVerificationData);

              if (verificationResponse.success) {
                enqueueSnackbar("Payment successful!", { variant: "success" });
                // Proceed to place order on backend
                const orderDetails = prepareOrderData(
                  razorpayOrder.id,
                  response.razorpay_payment_id
                );
                orderMutation.mutate(orderDetails);
              } else {
                throw new Error("Payment verification failed.");
              }
            } catch (error) {
              console.error("Razorpay Verification Error:", error);
              enqueueSnackbar(
                error.response?.data?.message || "Payment verification failed.",
                {
                  variant: "error",
                }
              );
              setIsProcessing(false);
              if (currentOrder) dispatch(resetOrderStatus(currentOrder.id));
            }
          },
          prefill: {
            name: user?.name || "Cashier",
            email: user?.email || "pos@delish.com",
            contact: user?.phone || "9999999999",
          },
          theme: {
            color: "#686CFD",
          },
        };

        const paymentObject = new window.Razorpay(options);
        paymentObject.on("payment.failed", function (response) {
          const errorMessage =
            response.error.description || "Razorpay Payment Failed";
          enqueueSnackbar(errorMessage, { variant: "error" });
          setIsProcessing(false);
          if (currentOrder) dispatch(resetOrderStatus(currentOrder.id));
        });

        paymentObject.open();
      } catch (error) {
        console.error("Razorpay Integration Error:", error);
        enqueueSnackbar(
          error.response?.data?.message ||
            "Failed to initiate Razorpay payment.",
          {
            variant: "error",
          }
        );
        setIsProcessing(false);
        if (currentOrder) dispatch(resetOrderStatus(currentOrder.id));
      }
    } else {
      // CASH / GCASH / PAYMAYA / OTHER payments (non-Razorpay/Online)
      const orderDetails = prepareOrderData(null, null); // Pass null for Razorpay fields
      orderMutation.mutate(orderDetails);
    }
  };

  const prepareOrderData = (razorpayOrderId, razorpayPaymentId) => {
    return {
      orderId: currentOrder.id,
      items: combinedCart.map((item) => ({
        menuId: item.id,
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        pricePerQuantity: safeNumber(item.pricePerQuantity),
        totalPrice: calculateItemTotal(item),
        isRedeemed: item.isRedeemed || false,
        isPwdSeniorDiscounted: pwdSeniorDiscountItems.some(
          (discountedItem) => getItemKey(discountedItem) === getItemKey(item)
        ),
      })),
      totalAmount: totals.total,
      baseGrossTotal: totals.baseGrossTotal,
      vatAmount: totals.vatAmount,
      totalDiscountAmount: totals.totalDiscountAmount,
      pwdSeniorDiscountAmount: totals.pwdSeniorDiscountAmount,
      employeeDiscountAmount: totals.employeeDiscountAmount,
      shareholderDiscountAmount: totals.shareholderDiscountAmount,
      redemptionAmount: totals.redemptionAmount,
      netSales: totals.netSales,
      paymentMethod,
      customerType,
      cashAmount: totals.cashAmount,
      change: totals.change,
      pwdSeniorDetails: pwdSeniorDiscountApplied ? pwdSeniorDetails : null,
      cashier: user?.name || "Admin",
      cashierId: user?._id || "000000000000000000000001",
      razorpayOrderId,
      razorpayPaymentId,
      orderStatus: "Completed", // Will be set to 'Processing' then 'Completed' by mutation onSuccess
    };
  };

  // Helper for cash modal completion
  const handleCashModalComplete = () => {
    setShowCashModal(false);
    if (totals.cashAmount >= totals.total) {
      handlePlaceOrder();
    } else {
      enqueueSnackbar("Cash amount is still insufficient.", {
        variant: "warning",
      });
    }
  };

  // Denomination buttons array
  const denominations = [1000, 500, 200, 100, 50, 20];

  // Component rendering starts here
  if (showInvoice && orderInfo) {
    return (
      <Invoice
        orderInfo={orderInfo}
        onClose={() => {
          setShowInvoice(false);
          navigate("/menu");
        }}
        onPrint={() => printReceipt(orderInfo)}
      />
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow-xl h-full flex flex-col">
      <h2 className="text-3xl font-bold mb-4 text-gray-800 border-b pb-2">
        Order Bill
      </h2>
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {/* Cart Items List */}
        <div className="space-y-3">
          {combinedCart.length > 0 ? (
            combinedCart.map((item, index) => (
              <div
                key={getUniqueKey(item, index)}
                className="flex items-center justify-between border-b py-2"
              >
                <div className="flex-1 min-w-0">
                  <p
                    className={`font-semibold text-gray-900 ${
                      item.isRedeemed ? "line-through text-red-500" : ""
                    }`}
                  >
                    {item.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    @ ₱{safeNumber(item.pricePerQuantity).toFixed(2)}
                  </p>
                  {item.isRedeemed && (
                    <span className="text-xs text-red-600 font-medium">
                      (Redeemed - FREE)
                    </span>
                  )}
                  {pwdSeniorDiscountItems.some(
                    (dItem) => getItemKey(dItem) === getItemKey(item)
                  ) && (
                    <span className="text-xs text-green-600 font-medium ml-2">
                      (20% PWD/Senior Disc)
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <div className="flex items-center border rounded-lg overflow-hidden">
                    <button
                      onClick={() =>
                        handleDecrement(item.originalItems[0].internalId)
                      }
                      className="p-2 text-sm bg-gray-100 hover:bg-gray-200"
                      disabled={isProcessing}
                    >
                      -
                    </button>
                    <span className="px-3 text-sm font-medium">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() =>
                        handleIncrement(item.originalItems[0].internalId)
                      }
                      className="p-2 text-sm bg-gray-100 hover:bg-gray-200"
                      disabled={isProcessing}
                    >
                      +
                    </button>
                  </div>
                  <p className="font-bold text-lg text-right w-20">
                    ₱{calculateItemTotal(item).toFixed(2)}
                  </p>
                  <button
                    onClick={() =>
                      dispatch(
                        removeItemFromOrder({
                          orderId: currentOrder.id,
                          itemId: item.originalItems[0].internalId,
                        })
                      )
                    }
                    className="text-red-500 hover:text-red-700 p-2"
                    disabled={isProcessing}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 7a1 1 0 011 1v7a1 1 0 11-2 0V8a1 1 0 011-1zm6 0a1 1 0 00-1 1v7a1 1 0 102 0V8a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500 py-10">
              No items in this order.
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        {/* Discounts Section */}
        <div className="mb-4 space-y-2">
          <h3 className="text-xl font-semibold text-gray-800">Discounts</h3>
          {/* PWD/Senior Discount */}
          <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
            <button
              onClick={handlePwdSeniorDiscount}
              className={`text-left text-sm font-medium transition duration-150 ${
                pwdSeniorDiscountApplied
                  ? "text-green-600 hover:text-green-700"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              <span className="flex items-center">
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                  ></path>
                </svg>
                {pwdSeniorDiscountApplied
                  ? "Remove PWD/Senior Discount"
                  : "Apply PWD/Senior Discount (20%)"}
              </span>
            </button>
            {discountedItemsInfo && (
              <span className="text-sm font-bold text-red-600">
                {discountedItemsInfo}
              </span>
            )}
            {pwdSeniorDiscountApplied && (
              <span className="text-xs text-gray-500 italic">
                {pwdSeniorDetails.type}: {pwdSeniorDetails.name}
              </span>
            )}
          </div>

          {/* Employee Discount */}
          <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
            <button
              onClick={handleEmployeeDiscount}
              className={`text-left text-sm font-medium transition duration-150 ${
                employeeDiscountApplied
                  ? "text-green-600 hover:text-green-700"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              <span className="flex items-center">
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 7a2 2 0 012 2v10a2 2 0 01-2 2H9a2 2 0 01-2-2V9a2 2 0 012-2h6zM7 7V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  ></path>
                </svg>
                {employeeDiscountApplied
                  ? "Remove Employee Discount (15%)"
                  : "Apply Employee Discount (15%)"}
              </span>
            </button>
            {employeeDiscountApplied && (
              <span className="text-sm font-bold text-red-600">
                -₱{totals.employeeDiscountAmount.toFixed(2)}
              </span>
            )}
          </div>

          {/* Shareholder Discount */}
          <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
            <button
              onClick={handleShareholderDiscount}
              className={`text-left text-sm font-medium transition duration-150 ${
                shareholderDiscountApplied
                  ? "text-green-600 hover:text-green-700"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              <span className="flex items-center">
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3v-5a3 3 0 00-3-3H6a3 3 0 00-3 3v5a3 3 0 003 3z"
                  ></path>
                </svg>
                {shareholderDiscountApplied
                  ? "Remove Shareholder Discount (10%)"
                  : "Apply Shareholder Discount (10%)"}
              </span>
            </button>
            {shareholderDiscountApplied && (
              <span className="text-sm font-bold text-red-600">
                -₱{totals.shareholderDiscountAmount.toFixed(2)}
              </span>
            )}
          </div>

          {/* Redemption Option */}
          <div className="relative p-2 bg-gray-50 rounded-lg">
            <button
              onClick={() => setShowRedeemOptions(!showRedeemOptions)}
              className={`w-full text-left text-sm font-medium flex justify-between items-center transition duration-150 ${
                hasRedeemedItem
                  ? "text-red-600 hover:text-red-700"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              <span className="flex items-center">
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1m-10-1V7a4 4 0 018 0v7a4 4 0 00-8 0z"
                  ></path>
                </svg>
                {hasRedeemedItem ? "Remove Redemption" : "Redeem Item (Free)"}
              </span>
              {hasRedeemedItem && (
                <span className="text-sm font-bold text-red-600">
                  -₱{totals.redemptionAmount.toFixed(2)}
                </span>
              )}
            </button>
            {showRedeemOptions && (
              <div className="absolute z-10 w-full mt-2 p-3 bg-white border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                <h4 className="font-bold text-gray-700 mb-2">
                  Select item to redeem:
                </h4>
                {combinedCart.filter((item) => !item.isRedeemed).length > 0 ? (
                  combinedCart
                    .filter((item) => !item.isRedeemed)
                    .map((item) => (
                      <button
                        key={`redeem-${getItemKey(item)}`}
                        onClick={() =>
                          handleRedeemItem(
                            item.originalItems[0].internalId,
                            item.name
                          )
                        }
                        className="w-full text-left p-1 text-sm text-gray-700 hover:bg-red-50 rounded transition duration-100"
                      >
                        {item.name} (x{item.quantity}) - ₱
                        {calculateItemTotalPrice(item).toFixed(2)}
                      </button>
                    ))
                ) : (
                  <p className="text-sm text-gray-500">
                    All items are already redeemed or cart is empty.
                  </p>
                )}
                {hasRedeemedItem && (
                  <button
                    onClick={handleRemoveRedemption}
                    className="w-full text-center mt-2 p-1 text-xs text-red-500 hover:bg-red-100 rounded transition duration-100 border-t pt-2"
                  >
                    Clear All Redemptions
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        {/* Totals Summary */}
        <div className="space-y-1 text-lg font-medium">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal (Gross)</span>
            <span>₱{totals.baseGrossTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-red-600">
            <span>Total Discount</span>
            <span>-₱{totals.totalDiscountAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Net of VAT/Discounts</span>
            <span>₱{totals.netSales.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>VAT (12%)</span>
            <span>₱{totals.vatAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-3xl font-bold text-gray-900 border-t pt-2 mt-2">
            <span>TOTAL AMOUNT DUE</span>
            <span>₱{totals.total.toFixed(2)}</span>
          </div>
        </div>

        {/* Customer Type Selection */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            Customer Type
          </h3>
          <div className="flex space-x-4">
            <button
              onClick={() => handleCustomerTypeChange("walk-in")}
              className={`flex-1 p-3 rounded-lg border-2 font-semibold transition duration-150 ${
                customerType === "walk-in"
                  ? "bg-blue-600 text-white border-blue-600 shadow-md"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
              disabled={isProcessing}
            >
              Walk-in (Dine-in)
            </button>
            <button
              onClick={() => handleCustomerTypeChange("take-out")}
              className={`flex-1 p-3 rounded-lg border-2 font-semibold transition duration-150 ${
                customerType === "take-out"
                  ? "bg-blue-600 text-white border-blue-600 shadow-md"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
              disabled={isProcessing}
            >
              Take-out
            </button>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            Payment Method
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => {
                setPaymentMethod("Cash");
                setShowCashModal(true);
                setShowOnlineOptions(false);
              }}
              className={`p-3 rounded-lg border-2 font-semibold transition duration-150 ${
                paymentMethod === "Cash"
                  ? "bg-green-600 text-white border-green-600 shadow-md"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
              disabled={isProcessing}
            >
              Cash
            </button>
            <div className="relative">
              <button
                onClick={() => setShowOnlineOptions(!showOnlineOptions)}
                className={`w-full p-3 rounded-lg border-2 font-semibold transition duration-150 flex justify-center items-center ${
                  ["GCash", "PayMaya", "Razorpay"].includes(paymentMethod)
                    ? "bg-purple-600 text-white border-purple-600 shadow-md"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
                disabled={isProcessing}
              >
                Online/Card{" "}
                <svg
                  className={`w-4 h-4 ml-2 transition-transform ${
                    showOnlineOptions ? "transform rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  ></path>
                </svg>
              </button>
              {showOnlineOptions && (
                <div className="absolute z-20 w-full mt-2 bg-white border rounded-lg shadow-xl divide-y">
                  <button
                    onClick={() => handleOnlinePaymentSelect("GCash")}
                    className={`w-full text-left p-3 text-sm transition duration-100 ${
                      paymentMethod === "GCash"
                        ? "bg-purple-100"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    GCash
                  </button>
                  <button
                    onClick={() => handleOnlinePaymentSelect("PayMaya")}
                    className={`w-full text-left p-3 text-sm transition duration-100 ${
                      paymentMethod === "PayMaya"
                        ? "bg-purple-100"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    PayMaya
                  </button>
                  <button
                    onClick={() => handleOnlinePaymentSelect("Razorpay")}
                    className={`w-full text-left p-3 text-sm transition duration-100 ${
                      paymentMethod === "Razorpay"
                        ? "bg-purple-100"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    Credit/Debit Card (Razorpay)
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={() => handleOnlinePaymentSelect("Other")}
              className={`p-3 rounded-lg border-2 font-semibold transition duration-150 ${
                paymentMethod === "Other"
                  ? "bg-yellow-600 text-white border-yellow-600 shadow-md"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
              disabled={isProcessing}
            >
              Other
            </button>
          </div>
        </div>

        {/* Place Order Button */}
        <div className="mt-6">
          <button
            onClick={handlePlaceOrder}
            className={`w-full py-4 text-2xl font-extrabold rounded-xl transition duration-300 ease-in-out ${
              !currentOrder || currentOrder.items.length === 0 || !paymentMethod
                ? "bg-gray-400 text-gray-700 cursor-not-allowed"
                : isProcessing
                ? "bg-blue-400 text-white cursor-wait"
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-lg transform hover:scale-[1.01]"
            }`}
            disabled={
              !currentOrder ||
              currentOrder.items.length === 0 ||
              !paymentMethod ||
              isProcessing
            }
          >
            {isProcessing ? "Processing Order..." : "Place Order"}
          </button>
          {isProcessing && (
            <p className="text-center text-sm text-blue-500 mt-2">
              Please wait, do not close this window.
            </p>
          )}
        </div>
      </div>

      {/* PWD/Senior Selection Modal */}
      {showPwdSeniorSelection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <h3 className="text-2xl font-bold mb-4 text-gray-800 border-b pb-2">
              <span className="text-green-600">PWD/Senior Discount</span> (20%
              Off)
            </h3>

            {/* PWD/Senior Details Input */}
            <div className="mb-4 space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Discount Type
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="type"
                    value="PWD"
                    checked={pwdSeniorDetails.type === "PWD"}
                    onChange={handlePwdSeniorDetailsChange}
                    className="form-radio h-4 w-4 text-green-600"
                  />
                  <span className="ml-2 text-gray-700">PWD</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="type"
                    value="Senior"
                    checked={pwdSeniorDetails.type === "Senior"}
                    onChange={handlePwdSeniorDetailsChange}
                    className="form-radio h-4 w-4 text-green-600"
                  />
                  <span className="ml-2 text-gray-700">Senior Citizen</span>
                </label>
              </div>
              <input
                type="text"
                name="name"
                placeholder={`${pwdSeniorDetails.type} Holder Name`}
                value={pwdSeniorDetails.name}
                onChange={handlePwdSeniorDetailsChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
              />
              <input
                type="text"
                name="idNumber"
                placeholder={`${pwdSeniorDetails.type} ID Number`}
                value={pwdSeniorDetails.idNumber}
                onChange={handlePwdSeniorDetailsChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
              />
              <p className="text-xs text-red-500 italic">
                *Only one PWD/Senior discount can be applied per order.
              </p>
            </div>

            <h4 className="text-xl font-semibold mb-3 text-gray-800">
              Select Items (Max 3: 1 Drink, 2 Food)
            </h4>

            {/* Item Selection List */}
            <div className="flex-1 overflow-y-auto space-y-2 mb-4 pr-2 custom-scrollbar">
              {combinedCart.map((item) => (
                <div
                  key={`select-${getItemKey(item)}`}
                  className={`flex justify-between items-center p-3 border rounded-lg cursor-pointer transition duration-100 ${
                    item.isRedeemed || item.quantity === 0
                      ? "bg-gray-100 cursor-not-allowed opacity-50"
                      : pwdSeniorDiscountItems.some(
                          (selected) =>
                            getItemKey(selected) === getItemKey(item)
                        )
                      ? "bg-green-100 border-green-500"
                      : "bg-white hover:bg-gray-50 border-gray-200"
                  }`}
                  onClick={() =>
                    !item.isRedeemed &&
                    item.quantity > 0 &&
                    toggleItemSelection(item)
                  }
                >
                  <span className="font-medium text-gray-900">
                    {item.name} (x{item.quantity})
                  </span>
                  <span className="text-sm text-gray-600">
                    ₱{calculateItemTotalPrice(item).toFixed(2)}
                  </span>
                  {pwdSeniorDiscountItems.some(
                    (selected) => getItemKey(selected) === getItemKey(item)
                  ) && (
                    <svg
                      className="w-6 h-6 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      ></path>
                    </svg>
                  )}
                  {item.isRedeemed && (
                    <span className="text-xs text-red-500">Redeemed</span>
                  )}
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 border-t pt-4">
              <button
                onClick={handleCancelPwdSeniorSelection}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition duration-150"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyPwdSeniorSelection}
                className={`px-6 py-2 rounded-lg text-white font-semibold transition duration-150 ${
                  pwdSeniorDiscountItems.length > 0
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-green-300 cursor-not-allowed"
                }`}
                disabled={pwdSeniorDiscountItems.length === 0}
              >
                Apply Discount
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cash Payment Modal */}
      {showCashModal && paymentMethod === "Cash" && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-2xl w-full max-w-md">
            <h3 className="text-2xl font-bold mb-4 text-gray-800 border-b pb-2">
              Cash Payment
            </h3>

            {/* Total Due */}
            <div className="flex justify-between items-center bg-gray-100 p-3 rounded-lg mb-4">
              <span className="text-lg font-medium text-gray-700">
                Total Due:
              </span>
              <span className="text-2xl font-bold text-red-600">
                ₱{totals.total.toFixed(2)}
              </span>
            </div>

            {/* Cash Received Input */}
            <div className="mb-4">
              <label className="block text-lg font-medium text-gray-700 mb-2">
                Cash Received:
              </label>
              <input
                type="number"
                value={cashAmount === 0 ? "" : cashAmount}
                onChange={(e) => setCashAmount(safeNumber(e.target.value))}
                placeholder="Enter amount"
                className="w-full p-3 text-3xl text-center border-2 border-green-500 rounded-lg focus:ring-green-500 focus:border-green-500"
                min="0"
                step="0.01"
              />
            </div>

            {/* Denomination Buttons */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {denominations.map((amount) => (
                <button
                  key={amount}
                  onClick={() => handleDenominationClick(amount)}
                  className="p-3 bg-blue-100 text-blue-800 rounded-lg font-bold text-xl hover:bg-blue-200 transition duration-150"
                >
                  ₱{amount}
                </button>
              ))}
              <button
                onClick={() => setCashAmount(totals.total)}
                className="col-span-3 p-3 bg-yellow-100 text-yellow-800 rounded-lg font-bold text-lg hover:bg-yellow-200 transition duration-150"
              >
                Exact Amount (₱{totals.total.toFixed(2)})
              </button>
              <button
                onClick={() => setCashAmount(0)}
                className="col-span-3 p-3 bg-red-100 text-red-800 rounded-lg font-bold text-lg hover:bg-red-200 transition duration-150"
              >
                Clear
              </button>
            </div>

            {/* Change Due */}
            <div
              className={`flex justify-between items-center p-3 rounded-lg mb-6 ${
                totals.change >= 0 ? "bg-green-100" : "bg-red-100"
              }`}
            >
              <span className="text-lg font-medium text-gray-700">
                {totals.change >= 0 ? "Change Due:" : "Insufficient Funds:"}
              </span>
              <span
                className={`text-3xl font-bold ${
                  totals.change >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                ₱{Math.abs(totals.change).toFixed(2)}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowCashModal(false)}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition duration-150"
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                onClick={handleCashModalComplete}
                className={`px-6 py-3 rounded-lg text-white font-semibold transition duration-150 ${
                  totals.cashAmount >= totals.total
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-green-300 cursor-not-allowed"
                }`}
                disabled={totals.cashAmount < totals.total || isProcessing}
              >
                {totals.cashAmount >= totals.total
                  ? "Complete Payment"
                  : "Insufficient Amount"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bluetooth Printer Connection Button (Visible at the bottom) */}
      <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
        <p className="text-sm text-gray-600">
          Bluetooth Printer Status:{" "}
          <span
            className={`font-semibold ${
              isPrinterConnected ? "text-green-500" : "text-red-500"
            }`}
          >
            {isPrinterConnected ? "Connected" : "Disconnected"}
          </span>
        </p>
        <button
          onClick={connectToPrinter}
          className={`px-4 py-2 text-sm rounded-lg font-medium transition duration-150 ${
            isPrinterConnected
              ? "bg-gray-300 text-gray-700 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-600 text-white"
          }`}
          disabled={isPrinterConnected || isProcessing}
        >
          {isPrinterConnected ? "Printer Ready" : "Connect Printer"}
        </button>
      </div>
    </div>
  );
};

export default Bill;
