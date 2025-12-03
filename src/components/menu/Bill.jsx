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
  const [pwdSssDetails, setPwdSssDetails] = useState({
    name: "",
    idNumber: "",
    type: "PWD",
  });
  const [bluetoothPrinter, setBluetoothPrinter] = useState(null);
  const [isPrinterConnected, setIsPrinterConnected] = useState(false);

  // Bluetooth printer setup
  useEffect(() => {
    // Check if Bluetooth is available
    if (navigator.bluetooth) {
      checkPrinterConnection();
    }
  }, []);

  const checkPrinterConnection = async () => {
    try {
      // Check for existing permissions
      const devices = await navigator.bluetooth.getDevices();
      if (devices.length > 0) {
        setIsPrinterConnected(true);
        enqueueSnackbar("Printer is ready", { variant: "success" });
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
      enqueueSnackbar("Searching for Bluetooth printers...", {
        variant: "info",
      });

      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ["battery_service", "device_information"],
      });

      enqueueSnackbar(`Found: ${device.name || "Unknown Device"}`, {
        variant: "info",
      });

      const server = await device.gatt.connect();
      setBluetoothPrinter(device);
      setIsPrinterConnected(true);

      enqueueSnackbar("Printer connected successfully!", {
        variant: "success",
      });

      // Store device info for future use
      localStorage.setItem("bluetoothPrinterId", device.id);
    } catch (error) {
      console.error("Bluetooth connection error:", error);
      if (error.name === "NotFoundError") {
        enqueueSnackbar("No Bluetooth printer found", { variant: "error" });
      } else if (error.name === "SecurityError") {
        enqueueSnackbar("Bluetooth permission denied", { variant: "error" });
      } else {
        enqueueSnackbar("Failed to connect to printer", { variant: "error" });
      }
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

  // Calculate discount amount for an item
  const calculateItemDiscountAmount = (item) => {
    if (item.isRedeemed) {
      return safeNumber(item.quantity) * safeNumber(item.pricePerQuantity);
    }

    // Check if this item is selected for PWD/SSS discount
    const isDiscounted = pwdSssDiscountItems.some(
      (discountedItem) => getItemKey(discountedItem) === getItemKey(item)
    );

    if (isDiscounted) {
      // Calculate 20% discount amount
      const originalTotal =
        safeNumber(item.quantity) * safeNumber(item.pricePerQuantity);
      return originalTotal * pwdSssDiscountRate;
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

    const discountAmount = totals.pwdSssDiscountAmount.toFixed(2);
    return `${info} (-₱${discountAmount})`;
  };

  const discountedItemsInfo = getDiscountedItemsInfo();

  // Get eligible items count for PWD/SSS discount
  const getEligibleItemsCount = () => {
    const drinks = combinedCart.filter((item) => isDrinkItem(item));
    const foods = combinedCart.filter((item) => isFoodItem(item));
    const totalEligible = drinks.length + foods.length;

    return {
      drinks,
      foods,
      totalEligible,
      maxDrinks: Math.min(drinks.length, 1), // Can select up to 1 drink
      maxFoods: Math.min(foods.length, 2), // Can select up to 2 foods
      maxTotal: Math.min(totalEligible, 3), // Can select up to 3 items total
    };
  };

  // Handle PWD/SSS discount - open selection modal
  const handlePwdSssDiscount = () => {
    if (!pwdSssDiscountApplied) {
      // Open selection modal with PWD/SSS details form
      setShowPwdSssSelection(true);
    } else {
      // Turn off discount
      setPwdSssDiscountApplied(false);
      setPwdSssDiscountItems([]);
      setPwdSssDetails({ name: "", idNumber: "", type: "PWD" });
      setEmployeeDiscountApplied(false);
      setShareholderDiscountApplied(false);
      enqueueSnackbar("PWD/SSS discount removed", { variant: "info" });
    }
  };

  const handleEmployeeDiscount = () => {
    setEmployeeDiscountApplied(!employeeDiscountApplied);
    setPwdSssDiscountApplied(false);
    setPwdSssDiscountItems([]);
    setPwdSssDetails({ name: "", idNumber: "", type: "PWD" });
    setShareholderDiscountApplied(false);
  };

  const handleShareholderDiscount = () => {
    setShareholderDiscountApplied(!shareholderDiscountApplied);
    setPwdSssDiscountApplied(false);
    setPwdSssDiscountItems([]);
    setPwdSssDetails({ name: "", idNumber: "", type: "PWD" });
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

  // Apply the selection with PWD/SSS details
  const handleApplyPwdSssSelection = () => {
    const eligible = getEligibleItemsCount();

    // Check if we have at least 1 item selected
    if (pwdSssDiscountItems.length === 0) {
      enqueueSnackbar("Please select at least 1 item for PWD/SSS discount", {
        variant: "warning",
      });
      return;
    }

    // Check PWD/SSS details
    if (!pwdSssDetails.name.trim()) {
      enqueueSnackbar("Please enter PWD/SSS holder name", {
        variant: "warning",
      });
      return;
    }

    if (!pwdSssDetails.idNumber.trim()) {
      enqueueSnackbar("Please enter PWD/SSS ID number", {
        variant: "warning",
      });
      return;
    }

    // Check the breakdown
    const drinks = pwdSssDiscountItems.filter((item) => isDrinkItem(item));
    const foods = pwdSssDiscountItems.filter((item) => isFoodItem(item));

    // Validate selection based on available items
    if (drinks.length > eligible.maxDrinks) {
      enqueueSnackbar(
        `Cannot select more than ${eligible.maxDrinks} drink(s)`,
        {
          variant: "warning",
        }
      );
      return;
    }

    if (foods.length > eligible.maxFoods) {
      enqueueSnackbar(
        `Cannot select more than ${eligible.maxFoods} food item(s)`,
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

    const discountAmount = selectedValue * pwdSssDiscountRate;

    // Create message based on selection
    let message = `PWD/SSS discount applied to ${
      pwdSssDiscountItems.length
    } item(s) (-₱${discountAmount.toFixed(2)})`;

    if (drinks.length === 1 && foods.length === 2) {
      message = `PWD/SSS discount applied to 1 drink and 2 food items (-₱${discountAmount.toFixed(
        2
      )})`;
    } else if (drinks.length === 1 && foods.length === 1) {
      message = `PWD/SSS discount applied to 1 drink and 1 food item (-₱${discountAmount.toFixed(
        2
      )})`;
    } else if (drinks.length === 1) {
      message = `PWD/SSS discount applied to 1 drink (-₱${discountAmount.toFixed(
        2
      )})`;
    } else if (foods.length === 2) {
      message = `PWD/SSS discount applied to 2 food items (-₱${discountAmount.toFixed(
        2
      )})`;
    } else if (foods.length === 1) {
      message = `PWD/SSS discount applied to 1 food item (-₱${discountAmount.toFixed(
        2
      )})`;
    }

    message += ` for ${pwdSssDetails.type}: ${pwdSssDetails.name}`;

    enqueueSnackbar(message, {
      variant: "success",
    });
  };

  // Cancel selection
  const handleCancelPwdSssSelection = () => {
    setShowPwdSssSelection(false);
  };

  // Clear PWD/SSS discount
  const clearPwdSssDiscount = () => {
    setPwdSssDiscountApplied(false);
    setPwdSssDiscountItems([]);
    setPwdSssDetails({ name: "", idNumber: "", type: "PWD" });
    enqueueSnackbar("PWD/SSS discount removed", {
      variant: "info",
    });
  };

  // Handle PWD/SSS details change
  const handlePwdSssDetailsChange = (e) => {
    const { name, value } = e.target;
    setPwdSssDetails((prev) => ({
      ...prev,
      [name]: value,
    }));
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
    QR_CODE_STORE: (data) => {
      const len = data.length + 3;
      return (
        GS +
        "(k" +
        String.fromCharCode(len % 256) +
        String.fromCharCode(Math.floor(len / 256)) +
        "\x31\x50\x30" +
        data
      );
    },
    QR_CODE_PRINT: GS + "(k\x03\x00\x31\x51\x30",
  };

  // Send data to Bluetooth printer
  const sendToPrinter = async (data) => {
    if (!bluetoothPrinter || !isPrinterConnected) {
      enqueueSnackbar("Printer not connected", { variant: "error" });
      return false;
    }

    try {
      // Convert text to Uint8Array
      const encoder = new TextEncoder();
      const dataArray = encoder.encode(data);

      // Get the GATT server
      const server = await bluetoothPrinter.gatt.connect();

      // Get the service - thermal printers often use these services
      const service = await server.getPrimaryService(
        "000018f0-0000-1000-8000-00805f9b34fb"
      );

      // Get the characteristic for writing
      const characteristic = await service.getCharacteristic(
        "00002af1-0000-1000-8000-00805f9b34fb"
      );

      // Write the data
      await characteristic.writeValue(dataArray);

      return true;
    } catch (error) {
      console.error("Print error:", error);
      enqueueSnackbar("Failed to print", { variant: "error" });
      return false;
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
      "Customer: " + (orderData.customerDetails?.name || "Walk-in") + LF;
    receipt += "Table: " + (orderData.table || "N/A") + LF;
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

    if (totals.pwdSssDiscountAmount > 0) {
      receipt +=
        "PWD/SSS Disc: -₱" + totals.pwdSssDiscountAmount.toFixed(2) + LF;
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
        enqueueSnackbar("Connecting to printer...", { variant: "info" });
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
            // Send cash drawer open command (ESC p m t1 t2)
            const cashDrawerCommand = ESC + "p" + "\x00" + "\x19" + "\xFA";
            await sendToPrinter(cashDrawerCommand);
            enqueueSnackbar("Cash drawer opened", { variant: "info" });
          }
        }
      } else {
        enqueueSnackbar("Could not connect to printer", { variant: "error" });
        // Fallback to browser print
        fallbackPrint(orderData);
      }
    } catch (error) {
      console.error("Print error:", error);
      enqueueSnackbar("Printing failed, using fallback", {
        variant: "warning",
      });
      fallbackPrint(orderData);
    }
  };

  // Fallback print method
  const fallbackPrint = (orderData) => {
    const printWindow = window.open("", "_blank");
    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - Order ${orderData._id?.slice(-8) || ""}</title>
        <style>
          body {
            font-family: 'Courier New', monospace;
            width: 80mm;
            margin: 0;
            padding: 10px;
          }
          .header {
            text-align: center;
            margin-bottom: 10px;
          }
          .restaurant-name {
            font-size: 18px;
            font-weight: bold;
          }
          .receipt-info {
            margin: 10px 0;
          }
          .item {
            margin: 5px 0;
          }
          .item-name {
            font-weight: bold;
          }
          .total {
            margin-top: 10px;
            border-top: 1px dashed #000;
            padding-top: 10px;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            font-size: 12px;
          }
          @media print {
            body { width: 80mm; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="restaurant-name">DELISH RESTAURANT</div>
          <div>123 Main Street, City</div>
          <div>Phone: (123) 456-7890</div>
        </div>
        
        <div class="receipt-info">
          <div>Order #: ${orderData._id?.slice(-8) || "N/A"}</div>
          <div>Date: ${new Date().toLocaleDateString()}</div>
          <div>Time: ${new Date().toLocaleTimeString()}</div>
          <div>Customer: ${orderData.customerDetails?.name || "Walk-in"}</div>
          <div>Table: ${orderData.table || "N/A"}</div>
        </div>
        
        <hr>
        
        <div class="items">
          <strong>ITEMS</strong>
          ${combinedCart
            .map(
              (item) => `
            <div class="item">
              <div class="item-name">${item.name}</div>
              <div>${item.quantity} x ₱${safeNumber(
                item.pricePerQuantity
              ).toFixed(2)} = ₱${calculateItemTotal(item).toFixed(2)}</div>
              ${
                item.isRedeemed
                  ? '<div style="color: green;">[REDEEMED - FREE]</div>'
                  : ""
              }
            </div>
          `
            )
            .join("")}
        </div>
        
        <hr>
        
        <div class="total">
          <div>Subtotal: ₱${totals.baseGrossTotal.toFixed(2)}</div>
          ${
            totals.pwdSssDiscountAmount > 0
              ? `<div>PWD/SSS Discount: -₱${totals.pwdSssDiscountAmount.toFixed(
                  2
                )}</div>`
              : ""
          }
          ${
            totals.redemptionAmount > 0
              ? `<div>Redemption: -₱${totals.redemptionAmount.toFixed(2)}</div>`
              : ""
          }
          ${
            totals.employeeDiscountAmount > 0
              ? `<div>Employee Discount: -₱${totals.employeeDiscountAmount.toFixed(
                  2
                )}</div>`
              : ""
          }
          ${
            totals.shareholderDiscountAmount > 0
              ? `<div>Shareholder Discount: -₱${totals.shareholderDiscountAmount.toFixed(
                  2
                )}</div>`
              : ""
          }
          <div>VAT (12%): ₱${totals.vatAmount.toFixed(2)}</div>
          <div><strong>Total: ₱${totals.total.toFixed(2)}</strong></div>
        </div>
        
        <div class="footer">
          <div>Payment: ${paymentMethod}</div>
          <div>Cashier: ${user?.name || "Admin"}</div>
          <br>
          <div>Thank you for dining with us!</div>
          <div>Please visit again!</div>
        </div>
        
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() {
              window.close();
            }, 1000);
          };
        </script>
      </body>
      </html>
    `;

    if (printWindow) {
      printWindow.document.write(receiptHTML);
      printWindow.document.close();
    }
  };

  // Razorpay payment handling
  const razorpayPaymentMutation = useMutation({
    mutationFn: createOrderRazorpay,
    onSuccess: (data) => {
      const { id, currency, amount } = data.data;
      const paymentObject = {
        key: process.env.REACT_APP_RAZORPAY_KEY_ID, // Ensure this is available in your .env
        amount: amount,
        currency: currency,
        name: "Delish Restaurant",
        description: `Order ID: ${currentOrder.id}`,
        order_id: id,
        handler: async (response) => {
          try {
            const verificationData = {
              orderId: id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            };

            const { data: verifiedOrder } = await verifyPaymentRazorpay(
              verificationData
            );

            if (verifiedOrder.status === "captured") {
              handleCompleteOrder(verifiedOrder.orderId, "Card-Online", true);
            } else {
              enqueueSnackbar("Payment failed or was not captured", {
                variant: "error",
              });
            }
          } catch (error) {
            console.error("Razorpay verification error:", error);
            enqueueSnackbar("Payment verification failed", {
              variant: "error",
            });
          }
        },
        prefill: {
          name: customerData.name || "Guest",
          email: customerData.email || "",
          contact: customerData.phone || "",
        },
        theme: {
          color: "#3399cc",
        },
      };

      const rzp = new window.Razorpay(paymentObject);
      rzp.open();
    },
    onError: (error) => {
      console.error("Razorpay order creation failed:", error);
      enqueueSnackbar("Failed to create Razorpay order", { variant: "error" });
    },
    onSettled: () => {
      setIsProcessing(false);
    },
  });

  const handleRazorpay = async () => {
    setIsProcessing(true);
    const res = await loadScript(
      "https://checkout.razorpay.com/v1/checkout.js"
    );

    if (!res) {
      enqueueSnackbar("Razorpay SDK failed to load. Are you offline?", {
        variant: "error",
      });
      setIsProcessing(false);
      return;
    }

    const amountInPaise = Math.round(totals.total * 100);
    razorpayPaymentMutation.mutate({ amount: amountInPaise });
  };

  // --- START OF FIX: handleCompleteOrder function modification ---
  const handleCompleteOrder = async (
    orderId,
    method = paymentMethod,
    isOnlinePayment = false
  ) => {
    if (isProcessing) return;
    setIsProcessing(true);

    if (!currentOrder || cartData.length === 0) {
      enqueueSnackbar("Cannot complete empty order", { variant: "error" });
      setIsProcessing(false);
      return;
    }

    // Prepare required customerDetails and bills data
    const finalCustomerDetails = {
      name: customerData.name || "Walk-in Customer", // Fallback for name
      phone: customerData.phone || "N/A", // Fallback for phone
      guests: customerData.guests || 1, // Fallback for guests
      ...customerData,
    };

    const finalBills = {
      totalWithTax: totals.total.toFixed(2),
      tax: totals.vatAmount.toFixed(2),
      total: totals.netSales.toFixed(2),
      baseGrossTotal: totals.baseGrossTotal.toFixed(2),
      totalDiscountAmount: totals.totalDiscountAmount.toFixed(2),
      pwdSssDiscountAmount: totals.pwdSssDiscountAmount.toFixed(2),
      employeeDiscountAmount: totals.employeeDiscountAmount.toFixed(2),
      shareholderDiscountAmount: totals.shareholderDiscountAmount.toFixed(2),
      redemptionAmount: totals.redemptionAmount.toFixed(2),
    };

    const finalOrderData = {
      ...currentOrder,
      bills: finalBills,
      customerDetails: finalCustomerDetails,
      orderStatus: "Completed", // Required field
      items: processedCart, // Use processed cart with default discounted price
      paymentMethod: method,
      isOnlinePayment: isOnlinePayment,
      staffId: user?._id,
      staffName: user?.name,
      // Add PWD/SSS details if applied
      ...(pwdSssDiscountApplied && {
        pwdSssDiscountDetails: {
          ...pwdSssDetails,
          discountedItems: pwdSssDiscountItems.map((item) => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.pricePerQuantity,
          })),
        },
      }),
    };

    try {
      // Call the API to add/complete the order
      const { data } = await addOrder(finalOrderData);

      // Handle table update if applicable
      if (currentOrder.table) {
        await updateTable(currentOrder.table._id, { status: "Available" });
      }

      // Dispatch Redux actions
      dispatch(completeOrder({ orderId: currentOrder.id, finalOrder: data }));
      dispatch(resetOrderStatus()); // Reset order status in Redux

      setOrderInfo(data);
      setShowInvoice(true);
      setPaymentMethod(method);

      // Print receipt after successful order completion
      await printReceipt(data);

      enqueueSnackbar("Order completed successfully!", { variant: "success" });
    } catch (error) {
      console.error("Order completion failed:", error);
      enqueueSnackbar(
        `Order completion failed: ${
          error.response?.data?.message || error.message
        }`,
        { variant: "error" }
      );
    } finally {
      setIsProcessing(false);
    }
  };
  // --- END OF FIX: handleCompleteOrder function modification ---

  const handleProcessOrder = () => {
    if (isProcessing) return;
    setIsProcessing(true);

    if (!currentOrder || cartData.length === 0) {
      enqueueSnackbar("Cannot process empty order", { variant: "error" });
      setIsProcessing(false);
      return;
    }

    try {
      // Prepare required customerDetails and bills data
      const finalCustomerDetails = {
        name: customerData.name || "Walk-in Customer", // Fallback for name
        phone: customerData.phone || "N/A", // Fallback for phone
        guests: customerData.guests || 1, // Fallback for guests
        ...customerData,
      };

      const finalBills = {
        totalWithTax: totals.total.toFixed(2),
        tax: totals.vatAmount.toFixed(2),
        total: totals.netSales.toFixed(2),
        baseGrossTotal: totals.baseGrossTotal.toFixed(2),
        totalDiscountAmount: totals.totalDiscountAmount.toFixed(2),
        pwdSssDiscountAmount: totals.pwdSssDiscountAmount.toFixed(2),
        employeeDiscountAmount: totals.employeeDiscountAmount.toFixed(2),
        shareholderDiscountAmount: totals.shareholderDiscountAmount.toFixed(2),
        redemptionAmount: totals.redemptionAmount.toFixed(2),
      };

      const processedOrderData = {
        ...currentOrder,
        bills: finalBills, // Include bills
        customerDetails: finalCustomerDetails, // Include customerDetails
        orderStatus: "Processing", // Required field
        items: processedCart,
        staffId: user?._id,
        staffName: user?.name,
        // Add PWD/SSS details if applied
        ...(pwdSssDiscountApplied && {
          pwdSssDiscountDetails: {
            ...pwdSssDetails,
            discountedItems: pwdSssDiscountItems.map((item) => ({
              id: item.id,
              name: item.name,
              quantity: item.quantity,
              price: item.pricePerQuantity,
            })),
          },
        }),
      };

      dispatch(
        processOrder({
          orderId: currentOrder.id,
          processedOrder: processedOrderData,
        })
      );
      enqueueSnackbar("Order processed for kitchen!", { variant: "success" });
    } catch (error) {
      console.error("Order processing failed:", error);
      enqueueSnackbar("Order processing failed", { variant: "error" });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!currentOrder) {
    return (
      <div className="flex flex-col items-center justify-center p-4">
        <h2 className="text-xl font-bold text-red-600">
          Order Not Found or Active Order Not Set
        </h2>
        <p className="text-gray-600">
          Please select an order to view the bill.
        </p>
        <button
          onClick={() => navigate("/orders")}
          className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Go to Orders
        </button>
      </div>
    );
  }

  // Render logic for Bill component (omitted for brevity but would follow here)
  return (
    <div className="bill-container">
      {/* ... (Existing JSX for rendering cart items, totals, buttons, modals, etc.) ... */}
      <h2 className="text-2xl font-bold mb-4">Order Bill</h2>
      <div className="cart-items">
        {combinedCart.map((item, index) => (
          <div key={getUniqueKey(item, index)} className="item-row">
            <span className="item-name">{item.name}</span>
            <span className="item-qty">x{item.quantity}</span>
            <span className="item-price">
              ₱{calculateItemTotal(item).toFixed(2)}
            </span>
            {item.isRedeemed && (
              <span className="redeemed-tag">[Redeemed]</span>
            )}
          </div>
        ))}
      </div>

      <div className="totals-summary">
        <div>Subtotal: ₱{totals.baseGrossTotal.toFixed(2)}</div>
        {totals.pwdSssDiscountAmount > 0 && <div>{discountedItemsInfo}</div>}
        {totals.redemptionAmount > 0 && (
          <div>Redemption: -₱{totals.redemptionAmount.toFixed(2)}</div>
        )}
        {totals.employeeDiscountAmount > 0 && (
          <div>
            Employee Discount ({employeeDiscountRate * 100}%): -₱
            {totals.employeeDiscountAmount.toFixed(2)}
          </div>
        )}
        {totals.shareholderDiscountAmount > 0 && (
          <div>
            Shareholder Discount ({shareholderDiscountRate * 100}%): -₱
            {totals.shareholderDiscountAmount.toFixed(2)}
          </div>
        )}
        <div>
          VAT ({vatRate}%): ₱{totals.vatAmount.toFixed(2)}
        </div>
        <div className="final-total">Total: ₱{totals.total.toFixed(2)}</div>
      </div>

      <div className="payment-options">
        <button
          onClick={() => handleCompleteOrder(currentOrder.id, "Cash")}
          disabled={isProcessing || cartData.length === 0}
        >
          {isProcessing ? "Completing..." : "Complete Order (Cash)"}
        </button>
        <button
          onClick={handleRazorpay}
          disabled={isProcessing || cartData.length === 0}
        >
          {isProcessing ? "Processing..." : "Pay with Razorpay (Card/Online)"}
        </button>
        {/* ... other buttons like discount toggles, print, etc. */}
      </div>

      {showInvoice && orderInfo && (
        <Invoice
          order={orderInfo}
          onClose={() => setShowInvoice(false)}
          onPrint={() => printReceipt(orderInfo)}
        />
      )}

      {/* ... (Modal for PWD/SSS selection would also be rendered here) ... */}
    </div>
  );
};

export default Bill;
