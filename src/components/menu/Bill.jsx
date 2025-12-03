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
    } else {
      enqueueSnackbar("Could not open print window", { variant: "error" });
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
        orderStatus: "Completed",
        orderDate: new Date().toISOString(),
        cashier: user?.name || "Admin",
        pwdSssDetails: pwdSssDiscountApplied ? pwdSssDetails : null,
        user: user?._id || "000000000000000000000001", // Valid ObjectId
      };

      setOrderInfo(invoiceOrderInfo);

      // Update table status
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

      // MARK ORDER AS COMPLETED IN REDUX
      if (currentOrder) {
        console.log("Dispatching completeOrder for:", currentOrder.id);
        dispatch(completeOrder(currentOrder.id));
      }

      enqueueSnackbar("Order placed successfully!", { variant: "success" });

      // PRINT RECEIPT
      setTimeout(async () => {
        await printReceipt(data);

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

  // Handle place order WITHOUT customer name validation
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

    // Validate PWD/SSS discount if applied
    if (pwdSssDiscountApplied) {
      if (!pwdSssDetails.name.trim()) {
        enqueueSnackbar("Please enter PWD/SSS holder name", {
          variant: "error",
        });
        return;
      }
      if (!pwdSssDetails.idNumber.trim()) {
        enqueueSnackbar("Please enter PWD/SSS ID number", {
          variant: "error",
        });
        return;
      }
    }

    setIsProcessing(true);

    // MARK ORDER AS PROCESSING FIRST
    if (currentOrder) {
      console.log("Dispatching processOrder for:", currentOrder.id);
      dispatch(processOrder(currentOrder.id));
    }

    const tableId =
      customerData.tables?.[0]?.tableId ||
      customerData.table?.tableId ||
      customerData.tableId ||
      null;

    // Prepare bills data with ALL REQUIRED FIELDS
    const bills = {
      total: Number(totals.baseGrossTotal.toFixed(2)),
      tax: Number(totals.vatAmount.toFixed(2)),
      discount: Number(totals.totalDiscountAmount.toFixed(2)),
      totalWithTax: Number(totals.total.toFixed(2)), // Required
      pwdSssDiscount: Number(totals.pwdSssDiscountAmount.toFixed(2)),
      pwdSssDiscountedValue: Number(totals.discountedItemsTotal.toFixed(2)),
      employeeDiscount: Number(totals.employeeDiscountAmount.toFixed(2)),
      shareholderDiscount: Number(totals.shareholderDiscountAmount.toFixed(2)),
      redemptionDiscount: Number(totals.redemptionAmount.toFixed(2)),
      netSales: Number(totals.netSales.toFixed(2)),
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
        price: calculateItemTotal(item),
        originalPrice: safeNumber(item.pricePerQuantity),
        isRedeemed: Boolean(item.isRedeemed),
        isPwdSssDiscounted: isPwdSssDiscounted,
        category: item.category || "general",
        id: item.id || Date.now().toString(),
      };
    });

    // Get cashier name
    const cashierName = user?.name || "Admin";

    // Prepare COMPLETE order data with ALL REQUIRED FIELDS
    const orderData = {
      customerDetails: {
        name: customerData.customerName?.trim() || "Walk-in", // Required
        phone: customerData.customerPhone?.trim() || "Not provided", // Required
        guests: safeNumber(customerData.guests) || 1, // Required
        email: customerData.customerEmail || "",
        address: customerData.customerAddress || "",
      },
      orderStatus: "Completed", // Required
      bills: bills, // Already contains all required fields
      items: items,
      table: tableId,
      paymentMethod: paymentMethod,
      pwdSssDiscountApplied: pwdSssDiscountApplied,
      pwdSssDetails: pwdSssDiscountApplied ? pwdSssDetails : null,
      pwdSssSelectedItems: pwdSssDiscountItems.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        pricePerQuantity: item.pricePerQuantity,
        type: isDrinkItem(item) ? "drink" : "food",
      })),
      cashier: cashierName,
      user: user?._id || "000000000000000000000001", // Required - Valid ObjectId
      orderDate: new Date().toISOString(),
      totalAmount: Number(totals.total.toFixed(2)),
      notes: customerData.notes || "",
    };

    console.log("Sending order data:", JSON.stringify(orderData, null, 2));

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
          if (currentOrder) {
            dispatch(resetOrderStatus(currentOrder.id));
          }
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
              if (currentOrder) {
                dispatch(resetOrderStatus(currentOrder.id));
              }
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
              if (currentOrder) {
                dispatch(resetOrderStatus(currentOrder.id));
              }
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
        if (currentOrder) {
          dispatch(resetOrderStatus(currentOrder.id));
        }
      }
    } else {
      // Cash payment - directly submit order
      console.log("Processing cash order...");
      orderMutation.mutate(orderData);
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
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">
              PWD/SSS Discount Application
            </h3>

            {/* PWD/SSS Details Form */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-semibold text-blue-800 mb-3">
                PWD/SSS Holder Information
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
                        checked={pwdSssDetails.type === "PWD"}
                        onChange={handlePwdSssDetailsChange}
                        className="mr-2"
                      />
                      <span className="text-sm">PWD</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="type"
                        value="SSS"
                        checked={pwdSssDetails.type === "SSS"}
                        onChange={handlePwdSssDetailsChange}
                        className="mr-2"
                      />
                      <span className="text-sm">SSS</span>
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
                    value={pwdSssDetails.name}
                    onChange={handlePwdSssDetailsChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="Enter PWD/SSS holder name"
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
                    value={pwdSssDetails.idNumber}
                    onChange={handlePwdSssDetailsChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="Enter PWD/SSS ID number"
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
              <p className="text-sm font-medium text-gray-700 mb-2">
                Select items for 20% discount:
              </p>
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
                const discountAmount = itemValue * pwdSssDiscountRate;
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
                  {pwdSssDiscountItems
                    .reduce(
                      (sum, item) => sum + calculateItemTotalPrice(item),
                      0
                    )
                    .toFixed(2)}
                </p>
                <p className="text-xs text-gray-600">
                  After 20% discount (-₱
                  {(
                    pwdSssDiscountItems.reduce(
                      (sum, item) => sum + calculateItemTotalPrice(item),
                      0
                    ) * pwdSssDiscountRate
                  ).toFixed(2)}
                  ): ₱
                  {(
                    pwdSssDiscountItems.reduce(
                      (sum, item) => sum + calculateItemTotalPrice(item),
                      0
                    ) *
                    (1 - pwdSssDiscountRate)
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
                  disabled={pwdSssDiscountItems.length === 0}
                >
                  Apply Discount
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-[600px] mx-auto space-y-4">
        {/* Printer Connection Button */}
        <div className="bg-white rounded-lg p-4 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-gray-900 text-sm font-semibold">
                Thermal Printer
              </h2>
              <p className="text-gray-500 text-xs">
                {isPrinterConnected
                  ? "Connected and ready to print"
                  : "Not connected"}
              </p>
            </div>
            <button
              onClick={connectToPrinter}
              className={`px-4 py-2 rounded-lg font-semibold text-xs ${
                isPrinterConnected
                  ? "bg-green-100 text-green-700"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {isPrinterConnected ? "✓ Connected" : "Connect Printer"}
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
              const itemKey = getItemKey(item);
              const isDiscounted = pwdSssDiscountItems.some(
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

          {pwdSssDiscountApplied && totals.pwdSssDiscountAmount > 0 && (
            <div className="flex justify-between items-center text-green-600">
              <div className="flex items-center">
                <p className="text-xs font-medium mr-2">
                  {discountedItemsInfo}
                  {pwdSssDetails.name && ` (${pwdSssDetails.name})`}
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
                {pwdSssDetails.name && (
                  <span className="text-xs truncate">
                    ({pwdSssDetails.name})
                  </span>
                )}
              </span>
            ) : (
              "PWD/SSS (20% - Select 1-3 items)"
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
