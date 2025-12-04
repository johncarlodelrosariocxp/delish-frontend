import React, { useState, useEffect, useRef } from "react";
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
import { addOrder } from "../../https/index";
import { enqueueSnackbar } from "notistack";
import { useMutation } from "@tanstack/react-query";
import Invoice from "../invoice/Invoice";
import { useNavigate } from "react-router-dom";

// Enhanced Bluetooth Printer Manager with Thermal Printer Support
class BluetoothThermalPrinter {
  constructor() {
    this.device = null;
    this.characteristic = null;
    this.isConnected = false;
    this.isPrinting = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
    this.autoReconnect = true;
  }

  // Check if Web Bluetooth API is supported
  isSupported() {
    return navigator.bluetooth && navigator.bluetooth.requestDevice;
  }

  // Get saved printer from localStorage
  getSavedPrinter() {
    return {
      id: localStorage.getItem("thermalPrinterId"),
      name: localStorage.getItem("thermalPrinterName"),
    };
  }

  // Save printer to localStorage
  savePrinter(device) {
    localStorage.setItem("thermalPrinterId", device.id);
    localStorage.setItem(
      "thermalPrinterName",
      device.name || "Thermal Printer"
    );
  }

  // Clear saved printer
  clearSavedPrinter() {
    localStorage.removeItem("thermalPrinterId");
    localStorage.removeItem("thermalPrinterName");
  }

  // Connect to Bluetooth printer
  async connect() {
    if (!this.isSupported()) {
      throw new Error("Bluetooth not supported in this browser");
    }

    try {
      console.log("Requesting Bluetooth device...");

      // Request device with common thermal printer services
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ["00001101-0000-1000-8000-00805f9b34fb"] }], // SPP service
        optionalServices: [
          "000018f0-0000-1000-8000-00805f9b34fb", // Printer service
          "00001800-0000-1000-8000-00805f9b34fb", // Generic Access
          "00001801-0000-1000-8000-00805f9b34fb", // Generic Attribute
        ],
      });

      console.log("Connecting to GATT server...");
      const server = await device.gatt.connect();

      // Try to get the SPP service (most common for thermal printers)
      let service;
      try {
        service = await server.getPrimaryService(
          "00001101-0000-1000-8000-00805f9b34fb"
        );
      } catch (e) {
        console.log("SPP service not found, trying other services...");
        // Try other common printer services
        const services = await server.getPrimaryServices();
        service =
          services.find(
            (s) =>
              s.uuid.includes("ff00") ||
              s.uuid.includes("fff0") ||
              s.uuid.includes("18f0")
          ) || services[0];
      }

      if (!service) {
        throw new Error("No suitable printer service found");
      }

      console.log("Getting characteristics...");
      const characteristics = await service.getCharacteristics();

      // Find a characteristic that can write
      this.characteristic = characteristics.find(
        (char) => char.properties.write || char.properties.writeWithoutResponse
      );

      if (!this.characteristic) {
        throw new Error("No writable characteristic found");
      }

      this.device = device;
      this.isConnected = true;
      this.reconnectAttempts = 0;

      // Save printer for auto-reconnect
      this.savePrinter(device);

      // Set up disconnect handler
      device.addEventListener(
        "gattserverdisconnected",
        this.handleDisconnect.bind(this)
      );

      console.log("Connected successfully to:", device.name);
      return true;
    } catch (error) {
      console.error("Connection failed:", error);
      throw error;
    }
  }

  // Handle disconnection
  handleDisconnect() {
    console.log("Device disconnected");
    this.isConnected = false;
    this.device = null;
    this.characteristic = null;
    this.isPrinting = false;

    // Auto-reconnect if enabled
    if (
      this.autoReconnect &&
      this.reconnectAttempts < this.maxReconnectAttempts
    ) {
      setTimeout(() => this.autoReconnectToSaved(), 2000);
    }
  }

  // Auto-reconnect to saved printer
  async autoReconnectToSaved() {
    if (
      this.isConnected ||
      this.reconnectAttempts >= this.maxReconnectAttempts
    ) {
      return;
    }

    const saved = this.getSavedPrinter();
    if (!saved.id) return;

    try {
      this.reconnectAttempts++;
      console.log(`Auto-reconnect attempt ${this.reconnectAttempts}`);

      // Get previously paired devices
      const devices = await navigator.bluetooth.getDevices();
      const savedDevice = devices.find((d) => d.id === saved.id);

      if (savedDevice) {
        await savedDevice.gatt.connect();
        const server = await savedDevice.gatt.connect();
        const service = await server.getPrimaryService(
          "00001101-0000-1000-8000-00805f9b34fb"
        );
        const characteristics = await service.getCharacteristics();

        this.characteristic = characteristics.find(
          (char) =>
            char.properties.write || char.properties.writeWithoutResponse
        );

        if (this.characteristic) {
          this.device = savedDevice;
          this.isConnected = true;
          this.reconnectAttempts = 0;
          savedDevice.addEventListener(
            "gattserverdisconnected",
            this.handleDisconnect.bind(this)
          );
          console.log("Auto-reconnected successfully");
          return true;
        }
      }
    } catch (error) {
      console.error("Auto-reconnect failed:", error);
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        setTimeout(() => this.autoReconnectToSaved(), 3000);
      }
    }

    return false;
  }

  // Disconnect from printer
  disconnect() {
    if (this.device && this.device.gatt.connected) {
      this.device.gatt.disconnect();
    }
    this.isConnected = false;
    this.device = null;
    this.characteristic = null;
    this.isPrinting = false;
  }

  // Send data to printer
  async send(data) {
    if (!this.isConnected || !this.characteristic) {
      throw new Error("Printer not connected");
    }

    if (this.isPrinting) {
      throw new Error("Printer is busy");
    }

    this.isPrinting = true;

    try {
      // Convert string to Uint8Array
      const encoder = new TextEncoder();
      const dataArray = encoder.encode(data);

      // Send in chunks for reliability
      const CHUNK_SIZE = 20;
      for (let i = 0; i < dataArray.length; i += CHUNK_SIZE) {
        const chunk = dataArray.slice(i, i + CHUNK_SIZE);

        if (this.characteristic.properties.write) {
          await this.characteristic.writeValue(chunk);
        } else if (this.characteristic.properties.writeWithoutResponse) {
          await this.characteristic.writeValueWithoutResponse(chunk);
        }

        // Small delay between chunks
        if (i + CHUNK_SIZE < dataArray.length) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }

      return true;
    } catch (error) {
      console.error("Send error:", error);
      throw error;
    } finally {
      this.isPrinting = false;
    }
  }

  // Open cash drawer
  async openCashDrawer() {
    // ESC/POS command to open cash drawer (usually pin 2)
    const drawerCommand = "\x1B\x70\x00\x19\xFA"; // ESC p 0 25 250
    try {
      await this.send(drawerCommand);
      console.log("Cash drawer opened");
      return true;
    } catch (error) {
      console.warn("Failed to open cash drawer:", error);
      return false;
    }
  }
}

// Thermal printer commands
const ThermalCommands = {
  INIT: "\x1B\x40",
  ALIGN_LEFT: "\x1B\x61\x00",
  ALIGN_CENTER: "\x1B\x61\x01",
  ALIGN_RIGHT: "\x1B\x61\x02",
  BOLD_ON: "\x1B\x45\x01",
  BOLD_OFF: "\x1B\x45\x00",
  CUT_PARTIAL: "\x1B\x69",
  CUT_FULL: "\x1B\x6D",
  FEED_LINE: "\x0A",
  FEED_N_LINES: (n) => `\x1B\x64${String.fromCharCode(n)}`,
  TEXT_NORMAL: "\x1B\x21\x00",
  TEXT_LARGE: "\x1B\x21\x10",
  TEXT_DOUBLE_HEIGHT: "\x1B\x21\x01",
  LINE_SPACING_24: "\x1B\x33\x18",
  DRAWER_KICK: "\x1B\x70\x00\x19\xFA",
  UNDERLINE_ON: "\x1B\x2D\x01",
  UNDERLINE_OFF: "\x1B\x2D\x00",
  INVERT_ON: "\x1D\x42\x01",
  INVERT_OFF: "\x1D\x42\x00",
};

// Create printer instance
const printer = new BluetoothThermalPrinter();

const Bill = ({ orderId }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Redux state
  const orders = useSelector((state) => state.order.orders);
  const activeOrderId = useSelector((state) => state.order.activeOrderId);
  const userState = useSelector((state) => state.auth);
  const user = userState?.user ||
    userState?.data?.user || {
      _id: "000000000000000000000001",
      name: "Admin",
    };

  // Current order and cart
  const currentOrder =
    orders.find((order) => order.id === orderId) ||
    orders.find((order) => order.id === activeOrderId);
  const cartData = currentOrder?.items || [];

  // Constants
  const vatRate = 12;
  const pwdSeniorDiscountRate = 0.2;
  const employeeDiscountRate = 0.15;
  const shareholderDiscountRate = 0.1;

  // State variables
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
  const [isPrinterConnected, setIsPrinterConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printerName, setPrinterName] = useState("");
  const [autoPrintEnabled, setAutoPrintEnabled] = useState(true);

  // Combined payment state
  const [showCombinedPaymentModal, setShowCombinedPaymentModal] =
    useState(false);
  const [selectedOnlineMethod, setSelectedOnlineMethod] = useState(null);
  const [combinedPayment, setCombinedPayment] = useState({
    cashAmount: 0,
    onlineAmount: 0,
    onlineMethod: null,
    total: 0,
  });

  // Refs
  const connectionCheckRef = useRef(null);

  // Initialize Bluetooth connection
  useEffect(() => {
    const initBluetooth = async () => {
      if (!printer.isSupported()) {
        console.warn("Web Bluetooth not supported");
        return;
      }

      // Try to auto-connect to saved printer
      const saved = printer.getSavedPrinter();
      if (saved.id) {
        setPrinterName(saved.name || "Saved Printer");
        setTimeout(() => {
          printer.autoReconnectToSaved().then((connected) => {
            setIsPrinterConnected(connected);
            if (connected) {
              console.log("Auto-connected to saved printer");
            }
          });
        }, 1000);
      }
    };

    initBluetooth();

    // Check connection status periodically
    connectionCheckRef.current = setInterval(() => {
      const connected = printer.isConnected;
      setIsPrinterConnected(connected);
      if (!connected && !isConnecting) {
        printer.autoReconnectToSaved().then((connected) => {
          setIsPrinterConnected(connected);
        });
      }
    }, 10000);

    return () => {
      if (connectionCheckRef.current) {
        clearInterval(connectionCheckRef.current);
      }
    };
  }, []);

  // Handle number safely
  const safeNumber = (value) => {
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  };

  // Combine cart items with same ID and price
  const combineCartItems = (cart) => {
    const combined = {};
    cart.forEach((item) => {
      const key = `${item.id}-${item.pricePerQuantity}-${item.isRedeemed}`;
      if (combined[key]) {
        combined[key].quantity += item.quantity;
        combined[key].originalItems = [...combined[key].originalItems, item];
      } else {
        combined[key] = {
          ...item,
          originalItems: [item],
        };
      }
    });
    return Object.values(combined);
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

      // Use combined payment cash amount if available, otherwise use regular cash amount
      const cashAmountNum = showCombinedPaymentModal
        ? safeNumber(combinedPayment.cashAmount)
        : safeNumber(cashAmount);

      const onlineAmountNum = showCombinedPaymentModal
        ? safeNumber(combinedPayment.onlineAmount)
        : 0;

      const totalPaid = cashAmountNum + onlineAmountNum;
      const change = totalPaid > total ? totalPaid - total : 0;

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
      };
    }
  };

  const totals = calculateTotals();
  const processedCart = cartData.map((item) => ({
    ...item,
    discountedPrice: item.discountedPrice ?? safeNumber(item.pricePerQuantity),
    pricePerQuantity: safeNumber(item.pricePerQuantity),
    price: safeNumber(item.price),
  }));
  const combinedCart = combineCartItems(processedCart);

  // Get item key for identification
  const getItemKey = (item) => {
    return `${item.id}-${item.pricePerQuantity}-${item.isRedeemed}`;
  };

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

  // Calculate item total price
  const calculateItemTotalPrice = (item) => {
    return safeNumber(item.quantity) * safeNumber(item.pricePerQuantity);
  };

  // Calculate item discount amount
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

  // Get unique key for rendering
  const getUniqueKey = (item, index) => {
    return `${item.id}-${index}-${item.quantity}-${item.pricePerQuantity}-${item.isRedeemed}`;
  };

  // Connect to printer
  const connectToPrinter = async () => {
    if (!printer.isSupported()) {
      enqueueSnackbar("Bluetooth not supported in this browser", {
        variant: "error",
      });
      return false;
    }

    try {
      setIsConnecting(true);
      const connected = await printer.connect();
      setIsPrinterConnected(connected);
      if (connected && printer.device) {
        setPrinterName(printer.device.name || "Thermal Printer");
        enqueueSnackbar(`Connected to ${printer.device.name}`, {
          variant: "success",
        });
      }
      return connected;
    } catch (error) {
      console.error("Connection error:", error);
      let message = "Failed to connect";
      if (error.name === "NotFoundError") {
        message =
          "No printer found. Make sure it's powered on and in pairing mode.";
      } else if (error.name === "SecurityError") {
        message = "Bluetooth permission denied";
      } else if (error.name === "NetworkError") {
        message = "Connection failed. Check distance and battery.";
      }
      enqueueSnackbar(message, { variant: "error" });
      return false;
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect printer
  const disconnectPrinter = () => {
    printer.disconnect();
    setIsPrinterConnected(false);
    setPrinterName("");
    enqueueSnackbar("Printer disconnected", { variant: "info" });
  };

  // Test print
  const handleTestPrint = async () => {
    if (!printer.isConnected) {
      enqueueSnackbar("Printer not connected", { variant: "warning" });
      return;
    }

    try {
      setIsPrinting(true);
      let receipt = ThermalCommands.INIT;
      receipt += ThermalCommands.ALIGN_CENTER;
      receipt += ThermalCommands.TEXT_LARGE;
      receipt += "TEST RECEIPT\n\n";
      receipt += ThermalCommands.TEXT_NORMAL;
      receipt += "======================\n";
      receipt += "Printer Test\n";
      receipt += "Working ✓\n";
      receipt += "======================\n";
      receipt += ThermalCommands.FEED_N_LINES(3);
      receipt += ThermalCommands.CUT_PARTIAL;

      await printer.send(receipt);
      enqueueSnackbar("Test receipt printed", { variant: "success" });
    } catch (error) {
      enqueueSnackbar(`Print failed: ${error.message}`, { variant: "error" });
    } finally {
      setIsPrinting(false);
    }
  };

  // Generate thermal receipt text
  const generateReceipt = (orderData) => {
    const centerText = (text, width = 32) => {
      if (text.length >= width) return text;
      const padding = Math.floor((width - text.length) / 2);
      return (
        " ".repeat(padding) + text + " ".repeat(width - text.length - padding)
      );
    };

    let receipt = ThermalCommands.INIT;
    receipt += ThermalCommands.LINE_SPACING_24;
    receipt += ThermalCommands.ALIGN_CENTER;
    receipt += ThermalCommands.TEXT_LARGE;
    receipt += "DELISH RESTAURANT\n";
    receipt += ThermalCommands.TEXT_NORMAL;
    receipt += "========================\n";
    receipt += "Order Receipt\n";
    receipt += "========================\n\n";

    receipt += ThermalCommands.ALIGN_LEFT;
    receipt += `Order #: ${orderData._id?.slice(-8) || "N/A"}\n`;
    receipt += `Date: ${new Date().toLocaleDateString("en-PH")}\n`;
    receipt += `Time: ${new Date().toLocaleTimeString("en-PH", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })}\n`;
    receipt += `Cashier: ${user?.name || "Admin"}\n`;
    receipt += `Customer: ${
      customerType === "walk-in" ? "Dine-in" : "Take-out"
    }\n`;
    receipt += "========================\n\n";

    receipt += ThermalCommands.BOLD_ON;
    receipt += "QTY ITEM              AMOUNT\n";
    receipt += ThermalCommands.BOLD_OFF;
    receipt += "========================\n";

    // Items
    const displayItems = orderData.items || combinedCart || [];
    displayItems.forEach((item) => {
      const name = item.name || "Unknown Item";
      const quantity = item.quantity || 1;
      const price = safeNumber(item.pricePerQuantity || item.price || 0);
      const total = calculateItemTotal(item);
      const isRedeemed = item.isRedeemed || false;
      const isDiscounted = item.isPwdSeniorDiscounted || false;

      const qtyStr = quantity.toString().padStart(2, " ");
      let nameStr = name;
      if (nameStr.length > 18) {
        nameStr = nameStr.substring(0, 15) + "...";
      } else {
        nameStr = nameStr.padEnd(18, " ");
      }

      const amountStr = (isRedeemed ? "FREE" : `₱${total.toFixed(2)}`).padStart(
        9,
        " "
      );
      receipt += `${qtyStr}  ${nameStr}${amountStr}\n`;

      if (isRedeemed) {
        receipt += "     *REDEEMED\n";
      } else if (isDiscounted) {
        const originalTotal = price * quantity;
        const discountAmount = originalTotal * pwdSeniorDiscountRate;
        receipt += `     *PWD/SENIOR -₱${discountAmount.toFixed(2)}\n`;
      }
    });

    receipt += "========================\n";
    receipt += ThermalCommands.ALIGN_RIGHT;
    receipt += `SUBTOTAL:   ₱${totals.baseGrossTotal.toFixed(2)}\n`;

    if (totals.pwdSeniorDiscountAmount > 0) {
      receipt += `PWD/SENIOR: -₱${totals.pwdSeniorDiscountAmount.toFixed(2)}\n`;
    }

    if (totals.redemptionAmount > 0) {
      receipt += `REDEMPTION: -₱${totals.redemptionAmount.toFixed(2)}\n`;
    }

    if (totals.employeeDiscountAmount > 0) {
      receipt += `EMP DISC:   -₱${totals.employeeDiscountAmount.toFixed(2)}\n`;
    }

    if (totals.shareholderDiscountAmount > 0) {
      receipt += `SHAREHOLDER:-₱${totals.shareholderDiscountAmount.toFixed(
        2
      )}\n`;
    }

    receipt += `VAT (12%):  ₱${totals.vatAmount.toFixed(2)}\n`;
    receipt += "========================\n";

    receipt += ThermalCommands.BOLD_ON;
    receipt += `TOTAL:      ₱${totals.total.toFixed(2)}\n`;
    receipt += ThermalCommands.BOLD_OFF;
    receipt += "========================\n";

    // Payment details
    receipt += ThermalCommands.ALIGN_LEFT;
    receipt += "Payment Details:\n";

    if (showCombinedPaymentModal) {
      receipt += `Cash:        ₱${combinedPayment.cashAmount.toFixed(2)}\n`;
      receipt += `${
        combinedPayment.onlineMethod
      }: ₱${combinedPayment.onlineAmount.toFixed(2)}\n`;
      const totalPaid =
        combinedPayment.cashAmount + combinedPayment.onlineAmount;
      receipt += `Total Paid:  ₱${totalPaid.toFixed(2)}\n`;
      if (totalPaid > totals.total) {
        receipt += `Change:      ₱${(totalPaid - totals.total).toFixed(2)}\n`;
      }
    } else {
      receipt += `Method: ${paymentMethod}\n`;
      if (paymentMethod === "Cash") {
        receipt += `Cash:    ₱${totals.cashAmount.toFixed(2)}\n`;
        if (totals.change > 0) {
          receipt += `Change:  ₱${totals.change.toFixed(2)}\n`;
        }
      }
    }

    if (pwdSeniorDiscountApplied && pwdSeniorDetails.name) {
      receipt += "========================\n";
      receipt += "PWD/SENIOR DETAILS:\n";
      receipt += `Name: ${pwdSeniorDetails.name}\n`;
      receipt += `ID #: ${pwdSeniorDetails.idNumber}\n`;
      receipt += `Type: ${pwdSeniorDetails.type}\n`;
    }

    receipt += "========================\n";
    receipt += ThermalCommands.ALIGN_CENTER;
    receipt += "Thank you for dining!\n";
    receipt += "Please visit again!\n\n";
    receipt += ThermalCommands.FEED_N_LINES(3);
    receipt += ThermalCommands.CUT_PARTIAL;

    return receipt;
  };

  // Print receipt
  const printReceipt = async (orderData) => {
    if (!printer.isConnected) {
      throw new Error("Printer not connected");
    }

    try {
      setIsPrinting(true);
      const receiptText = generateReceipt(orderData);
      await printer.send(receiptText);

      // Open cash drawer for cash payments
      const shouldOpenDrawer =
        paymentMethod === "Cash" ||
        (showCombinedPaymentModal && combinedPayment.cashAmount > 0);

      if (shouldOpenDrawer) {
        await printer.openCashDrawer();
      }

      return true;
    } catch (error) {
      console.error("Print error:", error);
      throw error;
    } finally {
      setIsPrinting(false);
    }
  };

  // Handle item increment
  const handleIncrement = (itemId) => {
    if (!currentOrder) return;
    dispatch(incrementQuantityInOrder({ orderId: currentOrder.id, itemId }));
  };

  // Handle item decrement
  const handleDecrement = (itemId) => {
    if (!currentOrder) return;
    dispatch(decrementQuantityInOrder({ orderId: currentOrder.id, itemId }));
  };

  // Handle redeem item
  const handleRedeemItem = (itemId, itemName) => {
    if (!currentOrder) return;
    dispatch(redeemItemInOrder({ orderId: currentOrder.id, itemId }));
    setShowRedeemOptions(false);
    enqueueSnackbar(`${itemName} redeemed for free!`, { variant: "success" });
  };

  // Handle remove redemption
  const handleRemoveRedemption = () => {
    if (!currentOrder) return;
    dispatch(removeRedemptionFromOrder({ orderId: currentOrder.id }));
    setShowRedeemOptions(false);
    enqueueSnackbar("Redemption removed!", { variant: "info" });
  };

  // Check if has redeemed items
  const hasRedeemedItem = combinedCart.some((item) => item.isRedeemed);

  // Handle PWD/Senior discount
  const handlePwdSeniorDiscount = () => {
    if (!pwdSeniorDiscountApplied) {
      setShowPwdSeniorSelection(true);
    } else {
      setPwdSeniorDiscountApplied(false);
      setPwdSeniorDiscountItems([]);
      setPwdSeniorDetails({ name: "", idNumber: "", type: "PWD" });
      enqueueSnackbar("PWD/Senior discount removed", { variant: "info" });
    }
  };

  // Handle employee discount
  const handleEmployeeDiscount = () => {
    setEmployeeDiscountApplied(!employeeDiscountApplied);
    setPwdSeniorDiscountApplied(false);
    setPwdSeniorDiscountItems([]);
    setPwdSeniorDetails({ name: "", idNumber: "", type: "PWD" });
    setShareholderDiscountApplied(false);
  };

  // Handle shareholder discount
  const handleShareholderDiscount = () => {
    setShareholderDiscountApplied(!shareholderDiscountApplied);
    setPwdSeniorDiscountApplied(false);
    setPwdSeniorDiscountItems([]);
    setPwdSeniorDetails({ name: "", idNumber: "", type: "PWD" });
    setEmployeeDiscountApplied(false);
  };

  // Toggle item selection for PWD/Senior discount
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
      if (pwdSeniorDiscountItems.length >= 3) {
        enqueueSnackbar("Maximum 3 items for PWD/Senior discount", {
          variant: "warning",
        });
        return;
      }
      setPwdSeniorDiscountItems([...pwdSeniorDiscountItems, item]);
    }
  };

  // Apply PWD/Senior selection
  const handleApplyPwdSeniorSelection = () => {
    if (pwdSeniorDiscountItems.length === 0) {
      enqueueSnackbar("Please select at least 1 item", {
        variant: "warning",
      });
      return;
    }

    if (!pwdSeniorDetails.name.trim()) {
      enqueueSnackbar("Please enter holder name", {
        variant: "warning",
      });
      return;
    }

    if (!pwdSeniorDetails.idNumber.trim()) {
      enqueueSnackbar("Please enter ID number", {
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

    enqueueSnackbar(
      `PWD/Senior discount applied to ${
        pwdSeniorDiscountItems.length
      } item(s) (-₱${discountAmount.toFixed(2)})`,
      { variant: "success" }
    );
  };

  // Handle customer type change
  const handleCustomerTypeChange = (type) => {
    setCustomerType(type);
    enqueueSnackbar(
      `Customer type set to ${type === "walk-in" ? "Walk-in" : "Take-out"}`,
      { variant: "info" }
    );
  };

  // Handle online payment select
  const handleOnlinePaymentSelect = (method) => {
    if (totals.cashAmount > 0 && totals.cashAmount < totals.total) {
      setShowCombinedPaymentModal(true);
      setSelectedOnlineMethod(method);
      setCombinedPayment((prev) => ({
        ...prev,
        cashAmount: totals.cashAmount,
        onlineMethod: method,
        onlineAmount: totals.total - totals.cashAmount,
        total: totals.total,
      }));
      setShowOnlineOptions(false);
    } else {
      setPaymentMethod(method);
      setShowOnlineOptions(false);
      enqueueSnackbar(`Payment method set to ${method}`, {
        variant: "success",
      });
    }
  };

  // Handle denomination click
  const handleDenominationClick = (amount) => {
    if (showCombinedPaymentModal) {
      setCombinedPayment((prev) => ({
        ...prev,
        cashAmount: safeNumber(prev.cashAmount) + amount,
        onlineAmount: Math.max(
          0,
          totals.total - (safeNumber(prev.cashAmount) + amount)
        ),
        total: totals.total,
      }));
    } else {
      setCashAmount((prev) => safeNumber(prev) + amount);
    }
  };

  // Prepare order data for API
  const prepareOrderData = () => {
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
      onlineAmount: Number(totals.onlineAmount.toFixed(2)),
      totalPaid: Number(totals.totalPaid.toFixed(2)),
      change: Number(totals.change.toFixed(2)),
    };

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
        category: item.category || "food",
        id: item.id || Date.now().toString(),
      };
    });

    const customerName =
      customerType === "walk-in" ? "Walk-in Customer" : "Take-out Customer";

    if (showCombinedPaymentModal) {
      const totalPaid =
        combinedPayment.cashAmount + combinedPayment.onlineAmount;

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
        bills: {
          ...bills,
          cashAmount: Number(combinedPayment.cashAmount.toFixed(2)),
          onlineAmount: Number(combinedPayment.onlineAmount.toFixed(2)),
          totalPaid: Number(totalPaid.toFixed(2)),
          change: Number(Math.max(0, totalPaid - totals.total).toFixed(2)),
        },
        paymentMethod: "Combined",
        paymentBreakdown: {
          cash: Number(combinedPayment.cashAmount.toFixed(2)),
          online: Number(combinedPayment.onlineAmount.toFixed(2)),
          onlineMethod: combinedPayment.onlineMethod,
          total: Number(totals.total.toFixed(2)),
        },
        paymentStatus: "Completed",
        orderStatus: "Completed",
        pwdSeniorDetails: pwdSeniorDiscountApplied ? pwdSeniorDetails : null,
        pwdSeniorDiscountApplied: pwdSeniorDiscountApplied,
        pwdSeniorSelectedItems: pwdSeniorDiscountApplied
          ? pwdSeniorDiscountItems
          : [],
        cashier: user?.name || "Admin",
        user: user?._id || "000000000000000000000001",
        tableId: currentOrder?.tableId || null,
        orderNumber: currentOrder?.number || `ORD-${Date.now()}`,
        totalAmount: Number(totals.total.toFixed(2)),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } else {
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
        bills: {
          ...bills,
          cashAmount:
            paymentMethod === "Cash" ? Number(totals.cashAmount.toFixed(2)) : 0,
          onlineAmount:
            paymentMethod !== "Cash" ? Number(totals.total.toFixed(2)) : 0,
          totalPaid:
            paymentMethod === "Cash"
              ? Number(totals.cashAmount.toFixed(2))
              : Number(totals.total.toFixed(2)),
          change:
            paymentMethod === "Cash" ? Number(totals.change.toFixed(2)) : 0,
        },
        paymentMethod: paymentMethod,
        paymentStatus: "Completed",
        orderStatus: "Completed",
        pwdSeniorDetails: pwdSeniorDiscountApplied ? pwdSeniorDetails : null,
        pwdSeniorDiscountApplied: pwdSeniorDiscountApplied,
        pwdSeniorSelectedItems: pwdSeniorDiscountApplied
          ? pwdSeniorDiscountItems
          : [],
        cashier: user?.name || "Admin",
        user: user?._id || "000000000000000000000001",
        tableId: currentOrder?.tableId || null,
        orderNumber: currentOrder?.number || `ORD-${Date.now()}`,
        totalAmount: Number(totals.total.toFixed(2)),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
  };

  // Order mutation
  const orderMutation = useMutation({
    mutationFn: (reqData) => addOrder(reqData),
    onSuccess: async (res) => {
      console.log("Order success response:", res);

      if (!res || !res.data) {
        throw new Error("Invalid response from server");
      }

      const { data } = res.data;

      // Set order info for receipt
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
        bills: totals,
        paymentMethod: showCombinedPaymentModal
          ? `Cash + ${combinedPayment.onlineMethod}`
          : paymentMethod,
        orderStatus: "Completed",
        customerStatus: customerType === "walk-in" ? "Dine-in" : "Take-out",
        orderDate: new Date().toISOString(),
        cashier: user?.name || "Admin",
        pwdSeniorDetails: pwdSeniorDiscountApplied ? pwdSeniorDetails : null,
        user: user?._id || "000000000000000000000001",
      };

      setOrderInfo(invoiceOrderInfo);

      // Complete order in Redux
      if (currentOrder) {
        dispatch(completeOrder(currentOrder.id));
      }

      enqueueSnackbar("Order placed successfully!", { variant: "success" });

      setShowInvoice(true);
      setIsProcessing(false);

      // Auto-print receipt if enabled
      if (autoPrintEnabled && printer.isConnected) {
        setTimeout(async () => {
          try {
            await printReceipt(invoiceOrderInfo);
            enqueueSnackbar("Receipt auto-printed", { variant: "success" });
          } catch (error) {
            console.error("Auto-print failed:", error);
          }
        }, 1000);
      }

      // Navigate back after delay
      setTimeout(() => {
        if (showInvoice) {
          setShowInvoice(false);
          navigate("/menu");
        }
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

      if (currentOrder) {
        dispatch(resetOrderStatus(currentOrder.id));
      }
    },
  });

  // Handle place order
  const handlePlaceOrder = async () => {
    if (isProcessing) return;

    console.log("Starting order placement...");

    if (!paymentMethod && !showCombinedPaymentModal) {
      enqueueSnackbar("Please select a payment method!", {
        variant: "warning",
      });
      return;
    }

    if (!cartData || cartData.length === 0) {
      enqueueSnackbar("Cart is empty!", { variant: "warning" });
      return;
    }

    if (totals.total <= 0) {
      enqueueSnackbar("Invalid order total. Please check your items.", {
        variant: "error",
      });
      return;
    }

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

    if (paymentMethod === "Cash" && !showCombinedPaymentModal) {
      if (totals.cashAmount < totals.total) {
        setShowCombinedPaymentModal(true);
        setCombinedPayment({
          cashAmount: totals.cashAmount,
          onlineAmount: totals.total - totals.cashAmount,
          onlineMethod: null,
          total: totals.total,
        });
        return;
      }
    }

    if (showCombinedPaymentModal) {
      if (!combinedPayment.onlineMethod) {
        enqueueSnackbar("Please select an online payment method", {
          variant: "warning",
        });
        return;
      }

      if (
        combinedPayment.cashAmount + combinedPayment.onlineAmount <
        totals.total
      ) {
        enqueueSnackbar(
          "Total payment must be equal to or greater than total amount",
          {
            variant: "error",
          }
        );
        return;
      }
    }

    setIsProcessing(true);

    if (currentOrder) {
      dispatch(processOrder(currentOrder.id));
    }

    const orderData = prepareOrderData();
    console.log("Sending order data:", JSON.stringify(orderData, null, 2));

    orderMutation.mutate(orderData);
  };

  // Handle cash submit
  const handleCashSubmit = () => {
    if (totals.cashAmount >= totals.total) {
      setShowCashModal(false);
      handlePlaceOrder();
    } else {
      setShowCombinedPaymentModal(true);
      setCombinedPayment({
        cashAmount: totals.cashAmount,
        onlineAmount: totals.total - totals.cashAmount,
        onlineMethod: null,
        total: totals.total,
      });
    }
  };

  // Handle close invoice
  const handleCloseInvoice = () => {
    setShowInvoice(false);
    navigate("/menu");
  };

  // Handle show redeem options
  const handleShowRedeemOptions = () => {
    if (combinedCart.length === 0) {
      enqueueSnackbar("Cart is empty!", { variant: "warning" });
      return;
    }
    setShowRedeemOptions(true);
  };

  // Handle manual print
  const handleManualPrint = async () => {
    if (!orderInfo) {
      enqueueSnackbar("No order to print", { variant: "warning" });
      return;
    }

    try {
      await printReceipt(orderInfo);
      enqueueSnackbar("Receipt printed successfully!", {
        variant: "success",
      });
    } catch (error) {
      console.error("Manual print error:", error);
      enqueueSnackbar(`Print failed: ${error.message}`, {
        variant: "error",
      });
    }
  };

  // Handle print via Bluetooth
  const handlePrintViaBluetooth = async () => {
    if (!printer.isSupported()) {
      enqueueSnackbar("Bluetooth not supported", { variant: "error" });
      return;
    }

    if (!orderInfo) {
      enqueueSnackbar("No order to print", { variant: "warning" });
      return;
    }

    if (!printer.isConnected) {
      enqueueSnackbar("Printer not connected", { variant: "warning" });
      return;
    }

    try {
      await printReceipt(orderInfo);
      enqueueSnackbar("Receipt printed via Bluetooth!", {
        variant: "success",
      });
    } catch (error) {
      console.error("Bluetooth print error:", error);
      enqueueSnackbar(`Print failed: ${error.message}`, {
        variant: "error",
      });
    }
  };

  if (!currentOrder) {
    return (
      <div className="w-full min-h-screen overflow-y-auto bg-gray-100 px-4 py-6 pb-24">
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
    <div className="w-full min-h-screen overflow-y-auto bg-gray-100 px-4 py-6 pb-24">
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
                min={0}
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
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors"
              >
                {totals.cashAmount < totals.total
                  ? "Add Online Payment"
                  : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Combined Payment Modal */}
      {showCombinedPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">
              Combined Payment
            </h3>

            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-gray-700 mb-2">
                Total Amount:{" "}
                <span className="font-bold">₱{totals.total.toFixed(2)}</span>
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Cash amount is insufficient. Please add online payment.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Cash Amount
                  </label>
                  <input
                    type="number"
                    value={combinedPayment.cashAmount}
                    onChange={(e) =>
                      setCombinedPayment((prev) => ({
                        ...prev,
                        cashAmount: safeNumber(e.target.value),
                        onlineAmount: Math.max(
                          0,
                          totals.total - safeNumber(e.target.value)
                        ),
                        total: totals.total,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="Enter cash amount"
                    max={totals.total}
                    min={0}
                    step="0.01"
                  />
                  <div className="flex gap-2 mt-2">
                    {[100, 200, 500, 1000].map((amount) => (
                      <button
                        key={amount}
                        onClick={() => handleDenominationClick(amount)}
                        className="flex-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium hover:bg-gray-200"
                      >
                        +₱{amount}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Online Payment Method
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        setCombinedPayment((prev) => ({
                          ...prev,
                          onlineMethod: "BDO",
                        }))
                      }
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium ${
                        combinedPayment.onlineMethod === "BDO"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    >
                      BDO
                    </button>
                    <button
                      onClick={() =>
                        setCombinedPayment((prev) => ({
                          ...prev,
                          onlineMethod: "GCASH",
                        }))
                      }
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium ${
                        combinedPayment.onlineMethod === "GCASH"
                          ? "bg-green-600 text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    >
                      GCASH
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Online Payment Amount
                  </label>
                  <input
                    type="number"
                    value={combinedPayment.onlineAmount}
                    onChange={(e) =>
                      setCombinedPayment((prev) => ({
                        ...prev,
                        onlineAmount: safeNumber(e.target.value),
                        cashAmount: Math.max(
                          0,
                          totals.total - safeNumber(e.target.value)
                        ),
                        total: totals.total,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="Enter online payment amount"
                    max={totals.total}
                    min={0}
                    step="0.01"
                  />
                </div>

                <div className="pt-4 border-t">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600">Cash:</span>
                    <span className="text-sm font-bold">
                      ₱{combinedPayment.cashAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600">
                      Online ({combinedPayment.onlineMethod || "Method"}):
                    </span>
                    <span className="text-sm font-bold">
                      ₱{combinedPayment.onlineAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-semibold text-gray-700">
                      Total Payment:
                    </span>
                    <span className="text-sm font-bold text-blue-600">
                      ₱
                      {(
                        combinedPayment.cashAmount +
                        combinedPayment.onlineAmount
                      ).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-sm text-gray-600">Change:</span>
                    <span className="text-sm font-bold text-green-600">
                      ₱
                      {Math.max(
                        0,
                        combinedPayment.cashAmount +
                          combinedPayment.onlineAmount -
                          totals.total
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowCombinedPaymentModal(false);
                  if (paymentMethod === "Cash") {
                    setShowCashModal(true);
                  }
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePlaceOrder}
                disabled={
                  !combinedPayment.onlineMethod ||
                  combinedPayment.cashAmount + combinedPayment.onlineAmount <
                    totals.total
                }
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm Payment
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

      {/* Custom Invoice Modal */}
      {showInvoice && orderInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-lg font-semibold mb-2">Order Complete!</h2>
            <p className="text-sm text-gray-600 mb-4">
              Order #{orderInfo._id?.slice(-8)} has been placed successfully.
            </p>

            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-600">Total:</span>
                <span className="text-sm font-bold">
                  ₱{totals.total.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-600">Payment:</span>
                <span className="text-sm font-bold">
                  {showCombinedPaymentModal
                    ? `Cash + ${combinedPayment.onlineMethod}`
                    : paymentMethod}
                </span>
              </div>
              {showCombinedPaymentModal && (
                <>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600">Cash:</span>
                    <span className="text-sm font-bold">
                      ₱{combinedPayment.cashAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600">
                      Online ({combinedPayment.onlineMethod}):
                    </span>
                    <span className="text-sm font-bold">
                      ₱{combinedPayment.onlineAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Paid:</span>
                    <span className="text-sm font-bold">
                      ₱
                      {(
                        combinedPayment.cashAmount +
                        combinedPayment.onlineAmount
                      ).toFixed(2)}
                    </span>
                  </div>
                </>
              )}
              {totals.change > 0 && (
                <div className="flex justify-between mt-2">
                  <span className="text-sm text-gray-600">Change:</span>
                  <span className="text-sm font-bold text-green-600">
                    ₱{totals.change.toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={handleManualPrint}
                disabled={isPrinting}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isPrinting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Printing...
                  </>
                ) : (
                  "Print Receipt"
                )}
              </button>

              <button
                onClick={handlePrintViaBluetooth}
                disabled={!isPrinterConnected || isPrinting}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors text-sm font-semibold ${
                  isPrinterConnected && !isPrinting
                    ? "bg-purple-600 text-white hover:bg-purple-700"
                    : "bg-gray-400 text-white cursor-not-allowed"
                }`}
              >
                {isPrinting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Printing
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M14.88 16.29L13 18.17v-3.76l1.88 1.88zM13 5.83l1.88 1.88L13 9.59V5.83zm8.71 4.71L12 2h-1v7.59L6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 11 14.41V22h1l9.71-9.71-5.3-5.29 5.3-5.29z" />
                    </svg>
                    BT Print
                  </>
                )}
              </button>

              <button
                onClick={handleCloseInvoice}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300"
              >
                Close
              </button>
            </div>

            {!isPrinterConnected && (
              <p className="text-xs text-yellow-600 mt-2 text-center">
                Bluetooth printer not connected. Connect for direct printing.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="max-w-[600px] mx-auto space-y-4">
        {/* Printer Status */}
        <div className="bg-white rounded-lg p-4 shadow-md">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  isPrinterConnected
                    ? "bg-green-500 animate-pulse"
                    : isConnecting
                    ? "bg-yellow-500 animate-pulse"
                    : "bg-red-500"
                }`}
              ></div>
              <span className="text-sm text-gray-700">
                {isPrinterConnected
                  ? `✓ ${printerName || "Printer Connected"}`
                  : isConnecting
                  ? "Connecting..."
                  : "Printer Disconnected"}
              </span>
            </div>
            <div className="flex gap-2">
              {isPrinterConnected ? (
                <button
                  onClick={disconnectPrinter}
                  className="px-3 py-2 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200 transition-colors"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={connectToPrinter}
                  disabled={isConnecting}
                  className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-200 transition-colors disabled:opacity-50"
                >
                  {isConnecting ? "Connecting..." : "Connect"}
                </button>
              )}
              <button
                onClick={handleTestPrint}
                disabled={isPrinting || !isPrinterConnected}
                className="px-3 py-2 bg-green-100 text-green-700 rounded-lg text-xs font-medium hover:bg-green-200 transition-colors disabled:opacity-50"
              >
                {isPrinting ? "Printing..." : "Test"}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Auto-print receipts:</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoPrintEnabled}
                onChange={(e) => setAutoPrintEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {printerName && (
            <p className="text-xs text-gray-500 mt-2">
              {isPrinterConnected
                ? "Ready to print receipts"
                : "Will auto-reconnect when available"}
            </p>
          )}
        </div>

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
                  PWD/Senior Discount (20%)
                  {pwdSeniorDetails.name && ` - ${pwdSeniorDetails.name}`}
                </p>
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

          {showCombinedPaymentModal ? (
            <>
              <div className="flex justify-between items-center border-t pt-2">
                <p className="text-xs text-gray-600 font-medium">Cash</p>
                <p className="text-md text-gray-800 font-bold">
                  ₱{combinedPayment.cashAmount.toFixed(2)}
                </p>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-xs text-gray-600 font-medium">
                  Online ({combinedPayment.onlineMethod})
                </p>
                <p className="text-md text-gray-800 font-bold">
                  ₱{combinedPayment.onlineAmount.toFixed(2)}
                </p>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-xs text-gray-600 font-medium">Total Paid</p>
                <p className="text-md text-blue-600 font-bold">
                  ₱
                  {(
                    combinedPayment.cashAmount + combinedPayment.onlineAmount
                  ).toFixed(2)}
                </p>
              </div>
              {totals.change > 0 && (
                <div className="flex justify-between items-center">
                  <p className="text-xs text-gray-600 font-medium">Change</p>
                  <p className="text-md text-green-600 font-bold">
                    ₱{totals.change.toFixed(2)}
                  </p>
                </div>
              )}
            </>
          ) : (
            paymentMethod === "Cash" &&
            totals.cashAmount > 0 && (
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
            )
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
            onClick={() => {
              setPaymentMethod("Cash");
              setShowCombinedPaymentModal(false);
              setShowCashModal(true);
            }}
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
              paymentMethod === "BDO" ||
              paymentMethod === "GCASH" ||
              showCombinedPaymentModal
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-200 text-gray-600 hover:bg-gray-300"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {paymentMethod === "BDO"
              ? "✓ BDO"
              : paymentMethod === "GCASH"
              ? "✓ GCASH"
              : showCombinedPaymentModal
              ? "✓ Combined"
              : "Online"}
          </button>
        </div>

        {/* 🧾 PLACE ORDER */}
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <button
            onClick={handlePlaceOrder}
            disabled={
              isProcessing ||
              (!paymentMethod && !showCombinedPaymentModal) ||
              cartData.length === 0
            }
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
      </div>
    </div>
  );
};

export default Bill;
