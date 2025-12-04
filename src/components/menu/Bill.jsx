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

// Bluetooth connection manager
class BluetoothPrinterManager {
  constructor() {
    this.device = null;
    this.server = null;
    this.writeCharacteristic = null;
    this.isConnected = false;
    this.connectionPromise = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000;
    this.reconnectTimer = null;
  }

  isBluetoothSupported() {
    return (
      navigator.bluetooth &&
      typeof navigator.bluetooth.requestDevice === "function"
    );
  }

  getSavedPrinter() {
    const deviceId = localStorage.getItem("bluetoothPrinterId");
    const deviceName = localStorage.getItem("bluetoothPrinterName");
    return { deviceId, deviceName };
  }

  savePrinter(device) {
    localStorage.setItem("bluetoothPrinterId", device.id);
    localStorage.setItem(
      "bluetoothPrinterName",
      device.name || "Bluetooth Printer"
    );
  }

  clearSavedPrinter() {
    localStorage.removeItem("bluetoothPrinterId");
    localStorage.removeItem("bluetoothPrinterName");
  }

  setupDeviceListeners(device, onDisconnect) {
    device.addEventListener("gattserverdisconnected", () => {
      console.log("Bluetooth device disconnected");
      this.isConnected = false;
      this.device = null;
      this.server = null;
      this.writeCharacteristic = null;

      if (onDisconnect) onDisconnect();

      this.attemptReconnection(onDisconnect);
    });
  }

  async attemptReconnection(onDisconnect) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log("Max reconnection attempts reached");
      this.reconnectAttempts = 0;
      return;
    }

    this.reconnectAttempts++;
    console.log(
      `Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`
    );

    await new Promise((resolve) => setTimeout(resolve, this.reconnectDelay));

    try {
      const { deviceId } = this.getSavedPrinter();
      if (!deviceId) {
        console.log("No saved printer to reconnect to");
        return;
      }

      console.log("Attempting to reconnect to saved printer...");
      const devices = await navigator.bluetooth.getDevices();
      const savedDevice = devices.find((d) => d.id === deviceId);

      if (savedDevice) {
        await this.connectToDevice(savedDevice, onDisconnect);
      }
    } catch (error) {
      console.error("Reconnection failed:", error);
      this.attemptReconnection(onDisconnect);
    }
  }

  async connectToDevice(device, onDisconnect) {
    try {
      console.log("Connecting to device:", device.name);

      if (device.gatt.connected) {
        console.log("Device already connected");
        this.device = device;
        this.isConnected = true;
        await this.setupPrinterServices(device);
        this.setupDeviceListeners(device, onDisconnect);
        return true;
      }

      const server = await device.gatt.connect();
      this.device = device;
      this.server = server;
      this.isConnected = true;

      await this.setupPrinterServices(device);
      this.setupDeviceListeners(device, onDisconnect);
      this.savePrinter(device);
      this.reconnectAttempts = 0;

      console.log("Device connected successfully");
      return true;
    } catch (error) {
      console.error("Failed to connect to device:", error);
      this.isConnected = false;
      throw error;
    }
  }

  async setupPrinterServices(device) {
    const serviceUUID_PRINTER = "000018f0-0000-1000-8000-00805f9b34fb";
    const serviceUUID_SPP = "00001101-0000-1000-8000-00805f9b34fb";

    const servicesToTry = [serviceUUID_PRINTER, serviceUUID_SPP];

    for (const serviceUuid of servicesToTry) {
      try {
        const service = await this.server.getPrimaryService(serviceUuid);
        const characteristics = await service.getCharacteristics();

        this.writeCharacteristic = characteristics.find(
          (char) =>
            char.properties.write || char.properties.writeWithoutResponse
        );

        if (this.writeCharacteristic) {
          console.log(
            `Found writable characteristic in service ${serviceUuid}`
          );
          break;
        }
      } catch (error) {
        console.log(
          `Service ${serviceUuid} not found or accessible:`,
          error.message
        );
      }
    }

    if (!this.writeCharacteristic) {
      throw new Error("No writable characteristic found");
    }
  }

  async sendData(data) {
    if (!this.isConnected || !this.writeCharacteristic) {
      throw new Error("Printer not connected");
    }

    const encoder = new TextEncoder();
    const dataArray = encoder.encode(data);

    const CHUNK_SIZE = 20;
    for (let i = 0; i < dataArray.length; i += CHUNK_SIZE) {
      const chunk = dataArray.slice(i, i + CHUNK_SIZE);
      await this.writeCharacteristic.writeValue(chunk);

      if (i + CHUNK_SIZE < dataArray.length) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    }

    console.log("Data sent to printer successfully");
    return true;
  }

  disconnect() {
    if (this.device && this.device.gatt.connected) {
      try {
        this.device.gatt.disconnect();
      } catch (error) {
        console.error("Error disconnecting:", error);
      }
    }

    this.isConnected = false;
    this.device = null;
    this.server = null;
    this.writeCharacteristic = null;
    this.clearSavedPrinter();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

const printerManager = new BluetoothPrinterManager();

const Bill = ({ orderId }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const orders = useSelector((state) => state.order.orders);
  const activeOrderId = useSelector((state) => state.order.activeOrderId);
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
  const [isPrinterConnected, setIsPrinterConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [autoPrintEnabled, setAutoPrintEnabled] = useState(true);
  const [printerName, setPrinterName] = useState("");
  const [pendingPrintOrder, setPendingPrintOrder] = useState(null);
  const [autoPrintRetryCount, setAutoPrintRetryCount] = useState(0);

  const connectionCheckRef = useRef(null);

  const thermalCommands = {
    INIT: "\x1B\x40",
    ALIGN_LEFT: "\x1B\x61\x00",
    ALIGN_CENTER: "\x1B\x61\x01",
    ALIGN_RIGHT: "\x1B\x61\x02",
    BOLD_ON: "\x1B\x45\x01",
    BOLD_OFF: "\x1B\x45\x00",
    UNDERLINE_ON: "\x1B\x2D\x01",
    UNDERLINE_OFF: "\x1B\x2D\x00",
    CUT_PARTIAL: "\x1B\x69",
    CUT_FULL: "\x1B\x6D",
    FEED_LINE: "\x0A",
    FEED_N_LINES: (n) => `\x1B\x64${String.fromCharCode(n)}`,
    TEXT_NORMAL: "\x1B\x21\x00",
    TEXT_LARGE: "\x1B\x21\x10",
    TEXT_DOUBLE_WIDTH: "\x1B\x21\x20",
    TEXT_DOUBLE_SIZE: "\x1B\x21\x30",
    DRAWER_KICK: "\x1B\x70\x00\x19\xFA",
  };

  // Auto-print effect
  useEffect(() => {
    const handleAutoPrint = async () => {
      if (
        autoPrintEnabled &&
        pendingPrintOrder &&
        !isPrinting &&
        isPrinterConnected
      ) {
        console.log("=== AUTO-PRINT TRIGGERED ===");
        console.log("Order to print:", pendingPrintOrder);

        try {
          setIsPrinting(true);
          await printReceipt(pendingPrintOrder);
          enqueueSnackbar("Receipt auto-printed successfully!", {
            variant: "success",
          });
          setPendingPrintOrder(null);
          setAutoPrintRetryCount(0);
        } catch (error) {
          console.error("Auto-print failed:", error);

          if (autoPrintRetryCount < 3) {
            setAutoPrintRetryCount((prev) => prev + 1);
            // Retry after delay
            setTimeout(() => {
              setPendingPrintOrder({ ...pendingPrintOrder });
            }, 1000);
          } else {
            enqueueSnackbar(
              "Auto-print failed after 3 attempts. Please print manually.",
              {
                variant: "warning",
              }
            );
            setPendingPrintOrder(null);
            setAutoPrintRetryCount(0);
          }
        } finally {
          setIsPrinting(false);
        }
      }
    };

    handleAutoPrint();
  }, [
    pendingPrintOrder,
    autoPrintEnabled,
    isPrinting,
    isPrinterConnected,
    autoPrintRetryCount,
  ]);

  // Initialize Bluetooth connection
  useEffect(() => {
    const initializeBluetooth = async () => {
      if (!printerManager.isBluetoothSupported()) {
        enqueueSnackbar(
          "Bluetooth is not supported in this browser. Please use Chrome/Edge.",
          { variant: "error" }
        );
        return;
      }

      try {
        setIsConnecting(true);
        const { deviceId, deviceName } = printerManager.getSavedPrinter();

        if (deviceId) {
          console.log("Found saved printer:", deviceName);
          setPrinterName(deviceName || "Bluetooth Printer");
          await attemptReconnection();
        } else {
          console.log("No saved printer found");
          setIsConnecting(false);
        }
      } catch (error) {
        console.error("Bluetooth initialization failed:", error);
        setIsConnecting(false);
      }
    };

    initializeBluetooth();
    connectionCheckRef.current = setInterval(checkConnectionStatus, 5000);

    return () => {
      if (connectionCheckRef.current) {
        clearInterval(connectionCheckRef.current);
      }
    };
  }, []);

  const checkConnectionStatus = () => {
    const connected = printerManager.isConnected;
    setIsPrinterConnected(connected);

    if (!connected && printerManager.getSavedPrinter().deviceId) {
      attemptReconnection();
    }
  };

  const attemptReconnection = async () => {
    if (isConnecting || printerManager.isConnected) return;

    try {
      setIsConnecting(true);
      const { deviceId } = printerManager.getSavedPrinter();

      if (deviceId) {
        const devices = await navigator.bluetooth.getDevices();
        const savedDevice = devices.find((d) => d.id === deviceId);

        if (savedDevice) {
          await printerManager.connectToDevice(
            savedDevice,
            handleDisconnection
          );
          setIsPrinterConnected(true);
          setPrinterName(savedDevice.name || "Bluetooth Printer");

          enqueueSnackbar("Reconnected to printer successfully!", {
            variant: "success",
          });
        }
      }
    } catch (error) {
      console.error("Reconnection failed:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnection = () => {
    setIsPrinterConnected(false);
    enqueueSnackbar("Printer disconnected. Attempting to reconnect...", {
      variant: "warning",
    });

    setTimeout(() => {
      attemptReconnection();
    }, 2000);
  };

  const connectToPrinter = async () => {
    if (!printerManager.isBluetoothSupported()) {
      enqueueSnackbar(
        "Bluetooth is not supported in this browser. Please use Chrome/Edge.",
        { variant: "error" }
      );
      return false;
    }

    try {
      setIsConnecting(true);
      console.log("Searching for Bluetooth printer...");

      const serviceUUID_PRINTER = "000018f0-0000-1000-8000-00805f9b34fb";
      const serviceUUID_SPP = "00001101-0000-1000-8000-00805f9b34fb";
      const serviceUUID_GENERIC_ACCESS = "00001800-0000-1000-8000-00805f9b34fb";

      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          serviceUUID_PRINTER,
          serviceUUID_SPP,
          serviceUUID_GENERIC_ACCESS,
        ],
      });

      console.log("Connecting to device:", device.name);
      const connected = await printerManager.connectToDevice(
        device,
        handleDisconnection
      );

      if (connected) {
        setIsPrinterConnected(true);
        setPrinterName(device.name || "Bluetooth Printer");

        enqueueSnackbar(
          `Connected to printer: ${device.name || "Bluetooth Printer"}`,
          { variant: "success" }
        );
        return true;
      }
    } catch (error) {
      console.error("Bluetooth connection failed:", error);

      if (error.name === "NotFoundError") {
        enqueueSnackbar(
          "No printer selected. Ensure printer is ON and in pairing mode.",
          { variant: "warning" }
        );
      } else if (error.name === "NetworkError") {
        enqueueSnackbar(
          "Connection failed. Check printer range and ensure no other app is connected.",
          { variant: "error" }
        );
      } else if (error.name === "SecurityError") {
        enqueueSnackbar("Security error. Please ensure HTTPS is used.", {
          variant: "error",
        });
      } else {
        enqueueSnackbar(`Connection failed: ${error.message}`, {
          variant: "error",
        });
      }
      return false;
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectBluetooth = () => {
    printerManager.disconnect();
    setIsPrinterConnected(false);
    setPrinterName("");

    enqueueSnackbar("Disconnected from printer", { variant: "info" });
  };

  const ensurePrinterConnected = async () => {
    if (printerManager.isConnected) {
      return true;
    }

    console.log("Printer not connected, attempting to connect...");

    const { deviceId } = printerManager.getSavedPrinter();
    if (deviceId) {
      try {
        const devices = await navigator.bluetooth.getDevices();
        const savedDevice = devices.find((d) => d.id === deviceId);

        if (savedDevice) {
          await printerManager.connectToDevice(
            savedDevice,
            handleDisconnection
          );
          setIsPrinterConnected(true);
          setPrinterName(savedDevice.name || "Bluetooth Printer");
          return true;
        }
      } catch (error) {
        console.error("Auto-reconnection failed:", error);
      }
    }

    enqueueSnackbar("Printer not connected. Please connect to printer.", {
      variant: "warning",
    });
    return false;
  };

  const sendToPrinter = async (data) => {
    let retryCount = 0;
    const maxRetries = 2;

    while (retryCount <= maxRetries) {
      try {
        const connected = await ensurePrinterConnected();
        if (!connected) {
          throw new Error("Printer not connected");
        }

        await printerManager.sendData(data);
        return true;
      } catch (error) {
        console.error(`Send attempt ${retryCount + 1} failed:`, error);

        if (retryCount === maxRetries) {
          throw new Error(`Failed to send data to printer: ${error.message}`);
        }

        retryCount++;
        await new Promise((resolve) => setTimeout(resolve, 500 * retryCount));
      }
    }

    return false;
  };

  const printReceipt = async (orderData) => {
    console.log("=== PRINT RECEIPT START ===");
    console.log("Printer connected:", printerManager.isConnected);
    console.log("Order data:", orderData);

    setIsPrinting(true);

    try {
      const receiptText = generateThermalText(orderData);
      console.log("Receipt generated, sending to printer...");

      await sendToPrinter(receiptText);

      console.log("Receipt printed successfully!");

      if (paymentMethod === "Cash") {
        try {
          await sendToPrinter(thermalCommands.DRAWER_KICK);
          console.log("Cash drawer command sent");
          await new Promise((resolve) => setTimeout(resolve, 800));
        } catch (drawerError) {
          console.warn("Could not open cash drawer:", drawerError);
          enqueueSnackbar("Cash drawer command failed. Please open manually.", {
            variant: "warning",
          });
        }
      }

      return true;
    } catch (error) {
      console.error("Print receipt error:", error);
      throw error;
    } finally {
      setIsPrinting(false);
    }
  };

  const generateThermalText = (orderData) => {
    const LINE_WIDTH = 32;

    const centerText = (text, width = LINE_WIDTH) => {
      if (text.length >= width) return text;
      const padding = Math.floor((width - text.length) / 2);
      return (
        " ".repeat(padding) + text + " ".repeat(width - text.length - padding)
      );
    };

    const rightText = (text, width = LINE_WIDTH) => {
      if (text.length >= width) return text;
      return " ".repeat(width - text.length) + text;
    };

    let receiptText = thermalCommands.INIT;
    receiptText += thermalCommands.ALIGN_CENTER;
    receiptText += thermalCommands.TEXT_LARGE;
    receiptText += "DELISH RESTAURANT\n";
    receiptText += thermalCommands.TEXT_NORMAL;
    receiptText += "--------------------------------\n";
    receiptText += "Order Receipt\n";
    receiptText += "--------------------------------\n\n";

    receiptText += thermalCommands.ALIGN_LEFT;
    receiptText += thermalCommands.BOLD_ON;
    receiptText += `Order #: ${orderData._id?.slice(-8) || "N/A"}\n`;
    receiptText += thermalCommands.BOLD_OFF;
    receiptText += `Date: ${new Date().toLocaleDateString("en-PH")}\n`;
    receiptText += `Time: ${new Date().toLocaleTimeString("en-PH", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })}\n`;
    receiptText += `Cashier: ${user?.name || "Admin"}\n`;
    receiptText += `Customer: ${
      customerType === "walk-in" ? "Dine-in" : "Take-out"
    }\n`;
    receiptText += "--------------------------------\n\n";

    receiptText += thermalCommands.BOLD_ON;
    receiptText += "QTY  ITEM                AMOUNT\n";
    receiptText += thermalCommands.BOLD_OFF;
    receiptText += "--------------------------------\n";

    combinedCart.forEach((item) => {
      const name = item.name || "Unknown Item";
      const quantity = item.quantity;
      const price = safeNumber(item.pricePerQuantity);
      const total = calculateItemTotal(item);
      const isRedeemed = item.isRedeemed;
      const isDiscounted = pwdSeniorDiscountItems.some(
        (discountedItem) => getItemKey(discountedItem) === getItemKey(item)
      );

      const qtyStr = quantity.toString().padStart(2, " ");
      let nameStr = name;
      if (nameStr.length > 20) {
        nameStr = nameStr.substring(0, 17) + "...";
      } else {
        nameStr = nameStr.padEnd(20, " ");
      }

      const amountStr = (isRedeemed ? "FREE" : `₱${total.toFixed(2)}`).padStart(
        8,
        " "
      );

      receiptText += `${qtyStr}   ${nameStr}${amountStr}\n`;

      if (isRedeemed) {
        receiptText += "     *REDEEMED\n";
      } else if (isDiscounted) {
        const originalTotal = price * quantity;
        const discountAmount = originalTotal * pwdSeniorDiscountRate;
        receiptText += `     *PWD/SENIOR -₱${discountAmount.toFixed(2)}\n`;
      }
    });

    receiptText += "--------------------------------\n";

    receiptText += thermalCommands.ALIGN_RIGHT;
    receiptText += `SUBTOTAL:   ₱${totals.baseGrossTotal.toFixed(2)}\n`;

    if (totals.pwdSeniorDiscountAmount > 0) {
      receiptText += `PWD/SENIOR: -₱${totals.pwdSeniorDiscountAmount.toFixed(
        2
      )}\n`;
    }

    if (totals.redemptionAmount > 0) {
      receiptText += `REDEMPTION: -₱${totals.redemptionAmount.toFixed(2)}\n`;
    }

    if (totals.employeeDiscountAmount > 0) {
      receiptText += `EMP DISC:   -₱${totals.employeeDiscountAmount.toFixed(
        2
      )}\n`;
    }

    if (totals.shareholderDiscountAmount > 0) {
      receiptText += `SHAREHOLDER:-₱${totals.shareholderDiscountAmount.toFixed(
        2
      )}\n`;
    }

    receiptText += `VAT (12%):  ₱${totals.vatAmount.toFixed(2)}\n`;
    receiptText += "--------------------------------\n";

    receiptText += thermalCommands.BOLD_ON;
    receiptText += `TOTAL:      ₱${totals.total.toFixed(2)}\n`;
    receiptText += thermalCommands.BOLD_OFF;
    receiptText += "--------------------------------\n";

    receiptText += thermalCommands.ALIGN_LEFT;
    receiptText += `Payment: ${paymentMethod}\n`;

    if (paymentMethod === "Cash") {
      receiptText += `Cash:    ₱${totals.cashAmount.toFixed(2)}\n`;
      receiptText += `Change:  ₱${totals.change.toFixed(2)}\n`;
    }

    if (pwdSeniorDiscountApplied && pwdSeniorDetails.name) {
      receiptText += "--------------------------------\n";
      receiptText += "PWD/SENIOR DETAILS:\n";
      receiptText += `Name: ${pwdSeniorDetails.name}\n`;
      receiptText += `ID #: ${pwdSeniorDetails.idNumber}\n`;
      receiptText += `Type: ${pwdSeniorDetails.type}\n`;
    }

    receiptText += "--------------------------------\n";

    receiptText += thermalCommands.ALIGN_CENTER;
    receiptText += "Thank you for dining with us!\n";
    receiptText += "Please visit again!\n\n";
    receiptText += "This receipt is your official\n";
    receiptText += "proof of purchase.\n\n";

    receiptText += thermalCommands.FEED_N_LINES(3);
    receiptText += thermalCommands.CUT_PARTIAL;

    return receiptText;
  };

  const handleTestPrint = async () => {
    if (!printerManager.isBluetoothSupported()) {
      enqueueSnackbar("Bluetooth not supported", { variant: "error" });
      return;
    }

    try {
      setIsPrinting(true);
      console.log("Starting test print...");

      const connected = await ensurePrinterConnected();
      if (!connected) {
        throw new Error("Failed to connect to printer");
      }

      let testReceipt = thermalCommands.INIT;
      testReceipt += thermalCommands.ALIGN_CENTER;
      testReceipt += thermalCommands.TEXT_LARGE;
      testReceipt += "TEST RECEIPT\n";
      testReceipt += thermalCommands.TEXT_NORMAL;
      testReceipt += "--------------------------------\n";
      testReceipt += thermalCommands.ALIGN_LEFT;
      testReceipt += "Date: " + new Date().toLocaleDateString() + "\n";
      testReceipt += "Time: " + new Date().toLocaleTimeString() + "\n";
      testReceipt += "Printer: Bluetooth Thermal\n";
      testReceipt += "Status: Working\n";
      testReceipt += "--------------------------------\n";
      testReceipt += thermalCommands.ALIGN_CENTER;
      testReceipt += "✓ Printer is working!\n";
      testReceipt += "✓ Connection successful!\n";
      testReceipt += "✓ Ready to print receipts\n";
      testReceipt += "--------------------------------\n\n";
      testReceipt += thermalCommands.FEED_N_LINES(3);
      testReceipt += thermalCommands.CUT_PARTIAL;

      await sendToPrinter(testReceipt);

      enqueueSnackbar("Test receipt printed successfully!", {
        variant: "success",
      });
    } catch (error) {
      console.error("Test print error:", error);
      enqueueSnackbar(`Test print failed: ${error.message}`, {
        variant: "error",
      });
    } finally {
      setIsPrinting(false);
    }
  };

  const safeNumber = (value) => {
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  };

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

  const getItemKey = (item) => {
    return `${item.id}-${item.pricePerQuantity}-${item.isRedeemed}`;
  };

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

  const calculateItemTotalPrice = (item) => {
    return safeNumber(item.quantity) * safeNumber(item.pricePerQuantity);
  };

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

  const getUniqueKey = (item, index) => {
    return `${item.id}-${index}-${item.quantity}-${item.pricePerQuantity}-${item.isRedeemed}`;
  };

  const handleIncrement = (itemId) => {
    if (!currentOrder) return;
    dispatch(incrementQuantityInOrder({ orderId: currentOrder.id, itemId }));
  };

  const handleDecrement = (itemId) => {
    if (!currentOrder) return;
    dispatch(decrementQuantityInOrder({ orderId: currentOrder.id, itemId }));
  };

  const handleRedeemItem = (itemId, itemName) => {
    if (!currentOrder) return;
    dispatch(redeemItemInOrder({ orderId: currentOrder.id, itemId }));
    setShowRedeemOptions(false);
    enqueueSnackbar(`${itemName} redeemed for free!`, {
      variant: "success",
    });
  };

  const handleRemoveRedemption = () => {
    if (!currentOrder) return;
    dispatch(removeRedemptionFromOrder({ orderId: currentOrder.id }));
    setShowRedeemOptions(false);
    enqueueSnackbar("Redemption removed!", { variant: "info" });
  };

  const hasRedeemedItem = combinedCart.some((item) => item.isRedeemed);

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

  const handleCancelPwdSeniorSelection = () => {
    setShowPwdSeniorSelection(false);
  };

  const clearPwdSeniorDiscount = () => {
    setPwdSeniorDiscountApplied(false);
    setPwdSeniorDiscountItems([]);
    setPwdSeniorDetails({ name: "", idNumber: "", type: "PWD" });
    enqueueSnackbar("PWD/Senior discount removed", {
      variant: "info",
    });
  };

  const handlePwdSeniorDetailsChange = (e) => {
    const { name, value } = e.target;
    setPwdSeniorDetails((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCustomerTypeChange = (type) => {
    setCustomerType(type);
    enqueueSnackbar(
      `Customer type set to ${type === "walk-in" ? "Walk-in" : "Take-out"}`,
      {
        variant: "info",
      }
    );
  };

  const handleOnlinePaymentSelect = (method) => {
    setPaymentMethod(method);
    setShowOnlineOptions(false);
    enqueueSnackbar(`Payment method set to ${method}`, {
      variant: "success",
    });
  };

  const handleDenominationClick = (amount) => {
    setCashAmount((prev) => safeNumber(prev) + amount);
  };

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
        category: isDrinkItem(item) ? "drink" : "food",
        id: item.id || Date.now().toString(),
      };
    });

    const customerName =
      customerType === "walk-in" ? "Walk-in Customer" : "Take-out Customer";

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
      paymentMethod,
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
      cashAmount: Number(totals.cashAmount.toFixed(2)),
      change: Number(totals.change.toFixed(2)),
    };
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

      if (currentOrder) {
        console.log("Dispatching completeOrder for:", currentOrder.id);
        dispatch(completeOrder(currentOrder.id));
      }

      enqueueSnackbar("Order placed successfully!", { variant: "success" });

      // Show invoice immediately
      setShowInvoice(true);
      setIsProcessing(false);

      // SET PENDING PRINT ORDER - This will trigger auto-print via useEffect
      if (autoPrintEnabled && isPrinterConnected) {
        console.log("Setting pending print order for auto-print...");
        setPendingPrintOrder(data);
      } else if (autoPrintEnabled && !isPrinterConnected) {
        enqueueSnackbar("Printer not connected. Auto-print disabled.", {
          variant: "warning",
        });
      }

      // Auto-close invoice after 8 seconds (gives time for printing)
      setTimeout(() => {
        setShowInvoice(false);
        navigate("/menu");
      }, 8000);
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

  const handlePlaceOrder = async () => {
    if (isProcessing) return;

    console.log("Starting order placement...");

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

    if (paymentMethod === "Cash") {
      if (totals.cashAmount < totals.total) {
        setShowCashModal(true);
        return;
      }
    }

    setIsProcessing(true);

    if (currentOrder) {
      console.log("Dispatching processOrder for:", currentOrder.id);
      dispatch(processOrder(currentOrder.id));
    }

    const orderData = prepareOrderData();
    console.log("Sending order data:", JSON.stringify(orderData, null, 2));

    orderMutation.mutate(orderData);
  };

  const handleCashSubmit = () => {
    if (totals.cashAmount >= totals.total) {
      setShowCashModal(false);
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

  const handleShowRedeemOptions = () => {
    if (combinedCart.length === 0) {
      enqueueSnackbar("Cart is empty!", { variant: "warning" });
      return;
    }
    setShowRedeemOptions(true);
  };

  const handleCancelRedeem = () => {
    setShowRedeemOptions(false);
  };

  const handleManualPrint = async () => {
    if (!orderInfo) return;

    try {
      setIsPrinting(true);
      await printReceipt(orderInfo);
      enqueueSnackbar("Receipt printed successfully!", {
        variant: "success",
      });
    } catch (error) {
      console.error("Manual print error:", error);
      enqueueSnackbar(`Print failed: ${error.message}`, {
        variant: "error",
      });
    } finally {
      setIsPrinting(false);
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
                <span className="text-sm font-bold">{paymentMethod}</span>
              </div>
              {paymentMethod === "Cash" && totals.cashAmount > 0 && (
                <>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600">Cash:</span>
                    <span className="text-sm font-bold">
                      ₱{totals.cashAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Change:</span>
                    <span className="text-sm font-bold text-green-600">
                      ₱{totals.change.toFixed(2)}
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleManualPrint}
                disabled={isPrinting || !isPrinterConnected}
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
                onClick={handleCloseInvoice}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300"
              >
                Close
              </button>
            </div>

            {!isPrinterConnected && (
              <p className="text-xs text-red-600 mt-2 text-center">
                Printer not connected. Connect printer to print receipt.
              </p>
            )}

            {autoPrintEnabled && isPrinterConnected && pendingPrintOrder && (
              <p className="text-xs text-green-600 mt-2 text-center">
                Auto-printing receipt...
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
                className={`w-3 h-3 rounded-full animate-pulse ${
                  isPrinterConnected
                    ? "bg-green-500"
                    : isConnecting
                    ? "bg-yellow-500"
                    : "bg-red-500"
                }`}
              ></div>
              <span className="text-sm text-gray-700">
                {isPrinterConnected
                  ? "✓ Printer Connected"
                  : isConnecting
                  ? "Connecting..."
                  : "Printer Disconnected"}
              </span>
            </div>
            <div className="flex gap-2">
              {isPrinterConnected ? (
                <button
                  onClick={disconnectBluetooth}
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
                {isPrinting ? "Printing..." : "Test Print"}
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
            <div className="mt-2">
              <p className="text-xs text-gray-500">
                Connected to:{" "}
                <span className="font-medium text-gray-700">{printerName}</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Printer will automatically reconnect if disconnected
              </p>
            </div>
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
      </div>
    </div>
  );
};

export default Bill;
