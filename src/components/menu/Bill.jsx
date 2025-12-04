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

// Icons
const IconBluetooth = ({ className }) => (
  <svg
    className={className}
    fill="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M14.88 16.29L13 18.17v-3.76l1.88 1.88zM13 5.83l1.88 1.88L13 9.59V5.83zm8.71 4.71L12 2h-1v7.59L6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 11 14.41V22h1l9.71-9.71-5.3-5.29 5.3-5.29z" />
  </svg>
);

// Enhanced Bluetooth Printer Manager
class BluetoothPrinterManager {
  constructor() {
    this.device = null;
    this.server = null;
    this.writeCharacteristic = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000;
    this.reconnectTimer = null;
    this.autoReconnectEnabled = true;
    this.isPrinting = false;
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
      this.isPrinting = false;

      if (onDisconnect) onDisconnect();

      if (this.autoReconnectEnabled) {
        this.attemptReconnection(onDisconnect);
      }
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
        this.reconnectAttempts = 0;
      }
    } catch (error) {
      console.error("Reconnection failed:", error);
      if (this.autoReconnectEnabled) {
        this.attemptReconnection(onDisconnect);
      }
    }
  }

  async connectToDevice(device, onDisconnect) {
    try {
      console.log("Connecting to device:", device.name);

      if (device.gatt && device.gatt.connected) {
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
      this.isPrinting = false;

      console.log("Device connected successfully");
      return true;
    } catch (error) {
      console.error("Failed to connect to device:", error);
      this.isConnected = false;
      this.isPrinting = false;
      throw error;
    }
  }

  async setupPrinterServices(device) {
    // Common printer service UUIDs
    const serviceUUIDs = [
      "000018f0-0000-1000-8000-00805f9b34fb", // Printer service
      "00001101-0000-1000-8000-00805f9b34fb", // SPP service (most common)
      "00001800-0000-1000-8000-00805f9b34fb", // Generic Access
      "00001801-0000-1000-8000-00805f9b34fb", // Generic Attribute
      "fff0", // Some printers use short UUID
      "ff00", // Some printers use short UUID
    ];

    for (const serviceUuid of serviceUUIDs) {
      try {
        console.log(`Trying service: ${serviceUuid}`);
        const service = await this.server.getPrimaryService(serviceUuid);
        const characteristics = await service.getCharacteristics();

        console.log(`Found ${characteristics.length} characteristics`);

        // Look for writable characteristic
        this.writeCharacteristic = characteristics.find(
          (char) =>
            char.properties.write ||
            char.properties.writeWithoutResponse ||
            char.properties.indicate ||
            char.properties.notify
        );

        if (this.writeCharacteristic) {
          console.log(
            `Found writable characteristic in service ${serviceUuid}`
          );
          return;
        }
      } catch (error) {
        console.log(`Service ${serviceUuid} not accessible:`, error.message);
      }
    }

    throw new Error(
      "No writable characteristic found. Try different printer or check pairing."
    );
  }

  async sendData(data) {
    if (!this.isConnected || !this.writeCharacteristic) {
      throw new Error("Printer not connected. Please connect first.");
    }

    if (this.isPrinting) {
      console.log("Printer is busy, waiting...");
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    this.isPrinting = true;

    try {
      const encoder = new TextEncoder();
      const dataArray = encoder.encode(data);

      console.log(`Sending ${dataArray.length} bytes to printer`);

      // Send in small chunks
      const CHUNK_SIZE = 20;
      for (let i = 0; i < dataArray.length; i += CHUNK_SIZE) {
        const chunk = dataArray.slice(i, i + CHUNK_SIZE);

        try {
          // Try write with response first
          if (this.writeCharacteristic.properties.write) {
            await this.writeCharacteristic.writeValue(chunk);
          }
          // Try write without response
          else if (this.writeCharacteristic.properties.writeWithoutResponse) {
            await this.writeCharacteristic.writeValueWithoutResponse(chunk);
          }
          // Fallback to any available method
          else {
            await this.writeCharacteristic.writeValue(chunk);
          }
        } catch (writeError) {
          console.error("Chunk write failed:", writeError);
          throw new Error(
            `Failed to send data to printer: ${writeError.message}`
          );
        }

        // Small delay between chunks
        if (i + CHUNK_SIZE < dataArray.length) {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      }

      console.log("Data sent to printer successfully");
      return true;
    } finally {
      this.isPrinting = false;
    }
  }

  disconnect() {
    this.isPrinting = false;

    if (this.device && this.device.gatt && this.device.gatt.connected) {
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

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  disableAutoReconnect() {
    this.autoReconnectEnabled = false;
  }

  enableAutoReconnect() {
    this.autoReconnectEnabled = true;
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
  const [hasAttemptedAutoConnect, setHasAttemptedAutoConnect] = useState(false);
  const [lastPrintedOrderId, setLastPrintedOrderId] = useState(null);

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

  const connectionCheckRef = useRef(null);
  const printTimeoutRef = useRef(null);

  const thermalCommands = {
    INIT: "\x1B\x40", // Initialize printer
    ALIGN_LEFT: "\x1B\x61\x00", // Left alignment
    ALIGN_CENTER: "\x1B\x61\x01", // Center alignment
    ALIGN_RIGHT: "\x1B\x61\x02", // Right alignment
    BOLD_ON: "\x1B\x45\x01", // Bold on
    BOLD_OFF: "\x1B\x45\x00", // Bold off
    CUT_PARTIAL: "\x1B\x69", // Partial cut
    CUT_FULL: "\x1B\x6D", // Full cut
    FEED_LINE: "\x0A", // Line feed
    FEED_N_LINES: (n) => `\x1B\x64${String.fromCharCode(n)}`, // Feed n lines
    TEXT_NORMAL: "\x1B\x21\x00", // Normal text
    TEXT_LARGE: "\x1B\x21\x10", // Large text
    DRAWER_KICK: "\x1B\x70\x00\x19\xFA", // Open cash drawer
    LINE_SPACING_24: "\x1B\x33\x18", // Line spacing 24/180 inch
  };

  // Auto-print effect
  useEffect(() => {
    const handleAutoPrint = async () => {
      if (
        autoPrintEnabled &&
        pendingPrintOrder &&
        !isPrinting &&
        pendingPrintOrder._id !== lastPrintedOrderId
      ) {
        console.log("=== AUTO-PRINT TRIGGERED ===");
        console.log("Order ID to print:", pendingPrintOrder._id);

        try {
          setIsPrinting(true);
          setLastPrintedOrderId(pendingPrintOrder._id);

          // Wait a moment to ensure everything is ready
          await new Promise((resolve) => setTimeout(resolve, 1000));

          await printReceipt(pendingPrintOrder);
          enqueueSnackbar("Receipt auto-printed successfully!", {
            variant: "success",
          });
          setPendingPrintOrder(null);
          setAutoPrintRetryCount(0);
        } catch (error) {
          console.error("Auto-print failed:", error);
          setLastPrintedOrderId(null);

          if (autoPrintRetryCount < 3) {
            setAutoPrintRetryCount((prev) => prev + 1);
            // Retry after delay with fresh copy
            setTimeout(() => {
              if (pendingPrintOrder) {
                setPendingPrintOrder({ ...pendingPrintOrder });
              }
            }, 2000 * (autoPrintRetryCount + 1));
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

    return () => {
      if (printTimeoutRef.current) {
        clearTimeout(printTimeoutRef.current);
      }
    };
  }, [
    pendingPrintOrder,
    autoPrintEnabled,
    isPrinting,
    autoPrintRetryCount,
    lastPrintedOrderId,
  ]);

  // Initialize Bluetooth connection
  useEffect(() => {
    const initializeBluetooth = async () => {
      if (!printerManager.isBluetoothSupported()) {
        console.warn("Bluetooth not supported in this browser");
        return;
      }

      if (hasAttemptedAutoConnect) {
        return;
      }

      try {
        const { deviceId, deviceName } = printerManager.getSavedPrinter();

        if (deviceId) {
          console.log("Found saved printer:", deviceName);
          setPrinterName(deviceName || "Bluetooth Printer");
          setHasAttemptedAutoConnect(true);

          // Auto-connect in background
          setTimeout(async () => {
            try {
              await attemptReconnection();
            } catch (error) {
              console.log("Background auto-connect failed:", error);
            }
          }, 1500);
        }
      } catch (error) {
        console.error("Bluetooth initialization failed:", error);
      }
    };

    initializeBluetooth();

    // Check connection status periodically
    connectionCheckRef.current = setInterval(() => {
      const connected = printerManager.isConnected;
      setIsPrinterConnected(connected);

      if (!connected && !isConnecting && hasAttemptedAutoConnect) {
        attemptReconnection();
      }
    }, 15000);

    return () => {
      if (connectionCheckRef.current) {
        clearInterval(connectionCheckRef.current);
      }
    };
  }, []);

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
  };

  const connectToPrinter = async () => {
    if (!printerManager.isBluetoothSupported()) {
      enqueueSnackbar(
        "Bluetooth is not supported in this browser. Please use Chrome/Edge on desktop.",
        { variant: "error" }
      );
      return false;
    }

    try {
      setIsConnecting(true);
      console.log("Searching for Bluetooth printer...");

      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          "000018f0-0000-1000-8000-00805f9b34fb", // Printer service
          "00001101-0000-1000-8000-00805f9b34fb", // SPP service
          "00001800-0000-1000-8000-00805f9b34fb", // Generic Access
          "00001801-0000-1000-8000-00805f9b34fb", // Generic Attribute
          "fff0",
          "ff00",
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
        enqueueSnackbar("Connection failed. Check printer range and battery.", {
          variant: "error",
        });
      } else if (error.name === "SecurityError") {
        enqueueSnackbar("Security error. Please ensure HTTPS is used.", {
          variant: "error",
        });
      } else if (error.name === "InvalidStateError") {
        enqueueSnackbar("Printer is already connected to another device.", {
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
    printerManager.disableAutoReconnect();
    printerManager.disconnect();
    setIsPrinterConnected(false);
    setPrinterName("");

    enqueueSnackbar("Disconnected from printer", { variant: "info" });

    setTimeout(() => {
      printerManager.enableAutoReconnect();
    }, 5000);
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
    const maxRetries = 3;

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
        await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount));
      }
    }

    return false;
  };

  const printReceipt = async (orderData) => {
    console.log("=== PRINT RECEIPT START ===");
    console.log("Printer connected:", printerManager.isConnected);

    setIsPrinting(true);

    try {
      const receiptText = generateThermalText(orderData);
      console.log("Receipt generated, sending to printer...");

      await sendToPrinter(receiptText);
      console.log("Receipt printed successfully!");

      // Open cash drawer for cash payments
      const shouldOpenDrawer =
        paymentMethod === "Cash" ||
        combinedPayment.cashAmount > 0 ||
        (showCombinedPaymentModal && combinedPayment.cashAmount > 0);

      if (shouldOpenDrawer) {
        try {
          await sendToPrinter(thermalCommands.DRAWER_KICK);
          console.log("Cash drawer command sent");
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (drawerError) {
          console.warn("Could not open cash drawer:", drawerError);
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
    receiptText += thermalCommands.LINE_SPACING_24;
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

    // Use the items from orderData or fallback to combinedCart
    const displayItems = orderData.items || combinedCart || [];

    displayItems.forEach((item) => {
      const name = item.name || "Unknown Item";
      const quantity = item.quantity || 1;
      const price = safeNumber(item.pricePerQuantity || item.price || 0);
      const total = safeNumber(item.price || 0);
      const isRedeemed = item.isRedeemed || false;
      const isDiscounted = item.isPwdSeniorDiscounted || false;

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

    // Payment details
    receiptText += thermalCommands.ALIGN_LEFT;
    receiptText += "Payment Details:\n";

    if (showCombinedPaymentModal) {
      receiptText += `Cash:        ₱${combinedPayment.cashAmount.toFixed(2)}\n`;
      receiptText += `${
        combinedPayment.onlineMethod
      }: ₱${combinedPayment.onlineAmount.toFixed(2)}\n`;

      const totalPaid =
        combinedPayment.cashAmount + combinedPayment.onlineAmount;
      receiptText += `Total Paid:  ₱${totalPaid.toFixed(2)}\n`;

      if (totalPaid < totals.total) {
        receiptText += `Balance:     ₱${(totals.total - totalPaid).toFixed(
          2
        )}\n`;
      } else if (totalPaid > totals.total) {
        receiptText += `Change:      ₱${(totalPaid - totals.total).toFixed(
          2
        )}\n`;
      }
    } else {
      receiptText += `Payment: ${paymentMethod}\n`;

      if (paymentMethod === "Cash") {
        receiptText += `Cash:    ₱${totals.cashAmount.toFixed(2)}\n`;
        if (totals.change > 0) {
          receiptText += `Change:  ₱${totals.change.toFixed(2)}\n`;
        }
      } else {
        receiptText += `Amount:  ₱${totals.total.toFixed(2)}\n`;
      }
    }
    receiptText += "--------------------------------\n";

    if (pwdSeniorDiscountApplied && pwdSeniorDetails.name) {
      receiptText += "PWD/SENIOR DETAILS:\n";
      receiptText += `Name: ${pwdSeniorDetails.name}\n`;
      receiptText += `ID #: ${pwdSeniorDetails.idNumber}\n`;
      receiptText += `Type: ${pwdSeniorDetails.type}\n`;
      receiptText += "--------------------------------\n";
    }

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
      testReceipt += thermalCommands.LINE_SPACING_24;
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

  // Prepare order data with correct field names
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
      cashAmount: showCombinedPaymentModal
        ? Number(combinedPayment.cashAmount.toFixed(2))
        : paymentMethod === "Cash"
        ? Number(totals.cashAmount.toFixed(2))
        : 0,
      change: showCombinedPaymentModal
        ? Number(
            Math.max(
              0,
              combinedPayment.cashAmount +
                combinedPayment.onlineAmount -
                totals.total
            ).toFixed(2)
          )
        : paymentMethod === "Cash"
        ? Number(totals.change.toFixed(2))
        : 0,
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

    // **CRITICAL FIX: Use 'user' field instead of 'cashierId'**
    const orderData = {
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
      paymentMethod: showCombinedPaymentModal
        ? `Cash + ${combinedPayment.onlineMethod}`
        : paymentMethod,
      paymentStatus: "Completed",
      orderStatus: "Completed",
      pwdSeniorDetails: pwdSeniorDiscountApplied ? pwdSeniorDetails : null,
      pwdSeniorDiscountApplied: pwdSeniorDiscountApplied,
      pwdSeniorSelectedItems: pwdSeniorDiscountApplied
        ? pwdSeniorDiscountItems
        : [],
      cashier: user?.name || "Admin",
      // **FIXED: Use 'user' field for user ID**
      user: user?._id || "000000000000000000000001",
      // Keep cashierId for backward compatibility
      cashierId: user?._id || "000000000000000000000001",
      tableId: currentOrder?.tableId || null,
      orderNumber: `ORD-${Date.now()}`,
      totalAmount: Number(totals.total.toFixed(2)),
    };

    // Add payment breakdown for combined payments
    if (showCombinedPaymentModal) {
      orderData.paymentBreakdown = {
        cash: Number(combinedPayment.cashAmount.toFixed(2)),
        online: Number(combinedPayment.onlineAmount.toFixed(2)),
        onlineMethod: combinedPayment.onlineMethod,
        total: Number(totals.total.toFixed(2)),
      };
    }

    console.log("Prepared order data:", orderData);
    return orderData;
  };

  // Order mutation
  const { mutate: createOrderMutation, isLoading: isCreatingOrder } =
    useMutation({
      mutationFn: addOrder,
      onSuccess: (response) => {
        console.log("Order created successfully:", response);

        const orderData = response?.data?.data || response?.data || response;

        // Process and complete the order
        if (currentOrder) {
          dispatch(processOrder({ orderId: currentOrder.id }));
          dispatch(completeOrder({ orderId: currentOrder.id }));
        }

        setOrderInfo(orderData);

        // Auto-print receipt if enabled
        if (autoPrintEnabled && isPrinterConnected) {
          setPendingPrintOrder(orderData);
        }

        setShowInvoice(true);
        setIsProcessing(false);

        enqueueSnackbar("Order completed successfully!", {
          variant: "success",
        });
      },
      onError: (error) => {
        console.error("Error creating order:", error);
        enqueueSnackbar("Failed to create order. Please try again.", {
          variant: "error",
        });
        setIsProcessing(false);
      },
    });

  const handlePlaceOrder = () => {
    if (!paymentMethod && !showCombinedPaymentModal) {
      enqueueSnackbar("Please select a payment method", { variant: "warning" });
      return;
    }

    if (combinedCart.length === 0) {
      enqueueSnackbar("No items in the order", { variant: "warning" });
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

    setIsProcessing(true);

    const orderData = prepareOrderData();
    console.log("Sending order data:", orderData);

    createOrderMutation(orderData);
  };

  const handleCashSubmit = () => {
    if (cashAmount >= totals.total) {
      setPaymentMethod("Cash");
      setShowCashModal(false);
      handlePlaceOrder();
    } else {
      enqueueSnackbar("Cash amount must be greater than or equal to total", {
        variant: "error",
      });
    }
  };

  const handleOnlinePaymentSelect = (method) => {
    if (totals.cashAmount > 0 && totals.cashAmount < totals.total) {
      setShowCombinedPaymentModal(true);
      setSelectedOnlineMethod(method);
      setCombinedPayment({
        cashAmount: totals.cashAmount,
        onlineMethod: method,
        onlineAmount: totals.total - totals.cashAmount,
        total: totals.total,
      });
      setShowOnlineOptions(false);
    } else {
      setPaymentMethod(method);
      setShowOnlineOptions(false);
      enqueueSnackbar(`Payment method set to ${method}`, {
        variant: "success",
      });
    }
  };

  const handleCustomerTypeChange = (type) => {
    setCustomerType(type);
  };

  const handlePaymentMethodSelect = (method) => {
    if (method === "Cash") {
      setShowCashModal(true);
    } else if (method === "Online") {
      setShowOnlineOptions(true);
    } else {
      setPaymentMethod(method);
      enqueueSnackbar(`Payment method set to: ${method}`, { variant: "info" });
    }
  };

  const handlePwdSeniorDiscount = () => {
    if (!pwdSeniorDiscountApplied) {
      setShowPwdSeniorSelection(true);
    } else {
      setPwdSeniorDiscountApplied(false);
      setPwdSeniorDiscountItems([]);
      setPwdSeniorDetails({
        name: "",
        idNumber: "",
        type: "PWD",
      });
      enqueueSnackbar("PWD/Senior discount removed", { variant: "info" });
    }
  };

  const handleSelectPwdSeniorItems = () => {
    const foodItems = processedCart.filter(
      (item) => isFoodItem(item) && !item.isRedeemed
    );
    const drinkItems = processedCart.filter(
      (item) => isDrinkItem(item) && !item.isRedeemed
    );

    let selectedItems = [];

    // Select 1 drink and 2 food items if available
    if (drinkItems.length > 0) {
      selectedItems.push(drinkItems[0]);
    }

    if (foodItems.length > 1) {
      selectedItems.push(foodItems[0], foodItems[1]);
    } else if (foodItems.length === 1) {
      selectedItems.push(foodItems[0]);
    }

    setPwdSeniorDiscountItems(selectedItems);
    setPwdSeniorDiscountApplied(true);
    setShowPwdSeniorSelection(false);

    if (selectedItems.length > 0) {
      enqueueSnackbar(
        `PWD/Senior discount applied to ${selectedItems.length} items`,
        {
          variant: "success",
        }
      );
    } else {
      enqueueSnackbar("No eligible items found for PWD/Senior discount", {
        variant: "warning",
      });
    }
  };

  const handleEmployeeDiscount = () => {
    const newValue = !employeeDiscountApplied;
    setEmployeeDiscountApplied(newValue);
    enqueueSnackbar(
      newValue
        ? "Employee discount (15%) applied"
        : "Employee discount removed",
      { variant: newValue ? "success" : "info" }
    );
  };

  const handleShareholderDiscount = () => {
    const newValue = !shareholderDiscountApplied;
    setShareholderDiscountApplied(newValue);
    enqueueSnackbar(
      newValue
        ? "Shareholder discount (10%) applied"
        : "Shareholder discount removed",
      { variant: newValue ? "success" : "info" }
    );
  };

  const handleRemoveItem = (itemId) => {
    if (!currentOrder) return;
    dispatch(removeItemFromOrder({ orderId: currentOrder.id, itemId }));
    enqueueSnackbar("Item removed from order", { variant: "info" });
  };

  const handlePrintInvoice = () => {
    if (!orderInfo) return;

    printReceipt(orderInfo)
      .then(() => {
        enqueueSnackbar("Receipt printed successfully", { variant: "success" });
      })
      .catch((error) => {
        enqueueSnackbar(`Failed to print receipt: ${error.message}`, {
          variant: "error",
        });
      });
  };

  const handleCloseInvoice = () => {
    setShowInvoice(false);
    dispatch(resetOrderStatus());

    // Navigate back to menu
    setTimeout(() => {
      navigate("/menu");
    }, 500);
  };

  // Render UI
  if (!currentOrder) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-700 mb-4">
            No Active Order
          </h2>
          <p className="text-gray-600">
            Please select or create an order to view the bill.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm p-4 border-b">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">Order Bill</h2>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">
              Order ID: {currentOrder.id.slice(-8)}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Cart Items */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Order Items
              </h3>
              <span className="text-sm text-gray-600">
                {combinedCart.length}{" "}
                {combinedCart.length === 1 ? "item" : "items"}
              </span>
            </div>

            {combinedCart.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No items in the order</p>
              </div>
            ) : (
              <div className="space-y-3">
                {combinedCart.map((item, index) => (
                  <div
                    key={getUniqueKey(item, index)}
                    className="border rounded-lg p-3 hover:bg-gray-50"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-800">
                            {item.name}
                          </span>
                          {item.isRedeemed && (
                            <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                              Redeemed
                            </span>
                          )}
                          {pwdSeniorDiscountItems.some(
                            (discountedItem) =>
                              getItemKey(discountedItem) === getItemKey(item)
                          ) && (
                            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                              20% Off
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          ₱{safeNumber(item.pricePerQuantity).toFixed(2)} ×{" "}
                          {item.quantity}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-800">
                          ₱{calculateItemTotal(item).toFixed(2)}
                        </div>
                        {calculateItemDiscountAmount(item) > 0 && (
                          <div className="text-sm text-green-600">
                            -₱{calculateItemDiscountAmount(item).toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleDecrement(item.id)}
                          className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full hover:bg-gray-200"
                        >
                          <span className="text-gray-700">-</span>
                        </button>
                        <span className="font-medium">{item.quantity}</span>
                        <button
                          onClick={() => handleIncrement(item.id)}
                          className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full hover:bg-gray-200"
                        >
                          <span className="text-gray-700">+</span>
                        </button>
                      </div>
                      <div className="flex items-center space-x-2">
                        {!item.isRedeemed && (
                          <button
                            onClick={() => handleRedeemItem(item.id, item.name)}
                            className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded hover:bg-green-200"
                          >
                            Redeem
                          </button>
                        )}
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="px-3 py-1 bg-red-100 text-red-700 text-sm rounded hover:bg-red-200"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Customer Type */}
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              Customer Type
            </h3>
            <div className="flex space-x-2">
              {["walk-in", "take-out"].map((type) => (
                <button
                  key={type}
                  onClick={() => handleCustomerTypeChange(type)}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium ${
                    customerType === type
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {type === "walk-in" ? "Dine-in" : "Take-out"}
                </button>
              ))}
            </div>
          </div>

          {/* Discount Options */}
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              Discounts
            </h3>
            <div className="space-y-2">
              <button
                onClick={handlePwdSeniorDiscount}
                className={`w-full py-2 px-4 rounded-md text-sm font-medium text-left ${
                  pwdSeniorDiscountApplied
                    ? "bg-blue-100 text-blue-700 border border-blue-300"
                    : "bg-gray-50 text-gray-700 hover:bg-gray-100 border"
                }`}
              >
                {pwdSeniorDiscountApplied
                  ? "✓ PWD/Senior Discount (20%)"
                  : "Apply PWD/Senior Discount"}
                {discountedItemsInfo && (
                  <div className="text-xs text-gray-600 mt-1">
                    {discountedItemsInfo}
                  </div>
                )}
              </button>

              <button
                onClick={handleEmployeeDiscount}
                className={`w-full py-2 px-4 rounded-md text-sm font-medium text-left ${
                  employeeDiscountApplied
                    ? "bg-blue-100 text-blue-700 border border-blue-300"
                    : "bg-gray-50 text-gray-700 hover:bg-gray-100 border"
                }`}
              >
                {employeeDiscountApplied
                  ? "✓ Employee Discount (15%)"
                  : "Apply Employee Discount"}
              </button>

              <button
                onClick={handleShareholderDiscount}
                className={`w-full py-2 px-4 rounded-md text-sm font-medium text-left ${
                  shareholderDiscountApplied
                    ? "bg-blue-100 text-blue-700 border border-blue-300"
                    : "bg-gray-50 text-gray-700 hover:bg-gray-100 border"
                }`}
              >
                {shareholderDiscountApplied
                  ? "✓ Shareholder Discount (10%)"
                  : "Apply Shareholder Discount"}
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel - Totals & Payment */}
        <div className="w-1/3 bg-white border-l p-4 overflow-y-auto">
          {/* Bluetooth Printer Controls */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4 border">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold text-gray-800">Printer</h3>
              <div className="flex items-center space-x-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isPrinterConnected ? "bg-green-500" : "bg-red-500"
                  }`}
                ></div>
                <span className="text-sm">
                  {isPrinterConnected ? "Connected" : "Disconnected"}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              {printerName && (
                <div className="text-sm text-gray-600 truncate">
                  Printer: {printerName}
                </div>
              )}

              <div className="flex space-x-2">
                <button
                  onClick={connectToPrinter}
                  disabled={isConnecting}
                  className="flex-1 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {isConnecting
                    ? "Connecting..."
                    : isPrinterConnected
                    ? "Reconnect"
                    : "Connect Printer"}
                </button>

                {isPrinterConnected && (
                  <button
                    onClick={handleTestPrint}
                    disabled={isPrinting}
                    className="flex-1 py-2 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    {isPrinting ? "Printing..." : "Test Print"}
                  </button>
                )}
              </div>

              {isPrinterConnected && (
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="autoPrint"
                    checked={autoPrintEnabled}
                    onChange={(e) => setAutoPrintEnabled(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <label htmlFor="autoPrint" className="text-sm text-gray-700">
                    Auto-print receipts
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Totals */}
          <div className="space-y-3 mb-6">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium">
                ₱{totals.baseGrossTotal.toFixed(2)}
              </span>
            </div>

            {totals.pwdSeniorDiscountAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">PWD/Senior Discount (20%)</span>
                <span className="text-green-600 font-medium">
                  -₱{totals.pwdSeniorDiscountAmount.toFixed(2)}
                </span>
              </div>
            )}

            {totals.redemptionAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Redemption</span>
                <span className="text-green-600 font-medium">
                  -₱{totals.redemptionAmount.toFixed(2)}
                </span>
              </div>
            )}

            {totals.employeeDiscountAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Employee Discount (15%)</span>
                <span className="text-green-600 font-medium">
                  -₱{totals.employeeDiscountAmount.toFixed(2)}
                </span>
              </div>
            )}

            {totals.shareholderDiscountAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">
                  Shareholder Discount (10%)
                </span>
                <span className="text-green-600 font-medium">
                  -₱{totals.shareholderDiscountAmount.toFixed(2)}
                </span>
              </div>
            )}

            <div className="flex justify-between border-t pt-2">
              <span className="text-gray-600">VAT (12%)</span>
              <span className="font-medium">
                ₱{totals.vatAmount.toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between border-t pt-2">
              <span className="text-lg font-bold text-gray-800">Total</span>
              <span className="text-lg font-bold text-gray-800">
                ₱{totals.total.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-800 mb-3">Payment Method</h3>
            <div className="grid grid-cols-2 gap-2">
              {["Cash", "BDO", "GCASH"].map((method) => (
                <button
                  key={method}
                  onClick={() => handlePaymentMethodSelect(method)}
                  className={`py-2 px-3 rounded-md text-sm font-medium ${
                    paymentMethod === method ||
                    (method === "Cash" && paymentMethod === "Cash")
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          {/* Cash Amount Input */}
          {paymentMethod === "Cash" && (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">Cash Amount</span>
                <span className="font-medium">
                  ₱{totals.cashAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex space-x-2">
                <input
                  type="number"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(Number(e.target.value) || 0)}
                  className="flex-1 border rounded-md px-3 py-2 text-sm"
                  placeholder="Enter cash amount"
                />
                <button
                  onClick={() => setCashAmount(Math.ceil(totals.total))}
                  className="px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200"
                >
                  Exact
                </button>
              </div>
              {totals.cashAmount > 0 && totals.change > 0 && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Change:</span>
                    <span className="font-bold text-green-700">
                      ₱{totals.change.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Complete Order Button */}
          <button
            onClick={handlePlaceOrder}
            disabled={
              isProcessing || !paymentMethod || combinedCart.length === 0
            }
            className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing
              ? "Processing..."
              : `Complete Order - ₱${totals.total.toFixed(2)}`}
          </button>
        </div>
      </div>

      {/* Modals */}
      {showCashModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-bold mb-4">Cash Payment</h3>
            <div className="mb-4">
              <div className="mb-2">
                <span className="text-gray-600">Total Amount:</span>
                <span className="ml-2 font-bold text-lg">
                  ₱{totals.total.toFixed(2)}
                </span>
              </div>
              <input
                type="number"
                value={cashAmount}
                onChange={(e) => setCashAmount(Number(e.target.value) || 0)}
                className="w-full border rounded-md px-3 py-2 text-lg"
                placeholder="Enter cash amount"
                autoFocus
              />
            </div>
            {cashAmount > 0 && (
              <div className="mb-4 p-3 bg-blue-50 rounded-md">
                <div className="flex justify-between">
                  <span>Change:</span>
                  <span className="font-bold text-blue-700">
                    ₱{Math.max(0, cashAmount - totals.total).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowCashModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleCashSubmit}
                disabled={cashAmount < totals.total}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {showOnlineOptions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-bold mb-4">Select Online Payment</h3>
            <div className="space-y-2">
              {["BDO", "GCASH"].map((method) => (
                <button
                  key={method}
                  onClick={() => handleOnlinePaymentSelect(method)}
                  className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md text-left"
                >
                  {method}
                </button>
              ))}
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowOnlineOptions(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showPwdSeniorSelection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-bold mb-4">PWD/Senior Details</h3>
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={pwdSeniorDetails.name}
                  onChange={(e) =>
                    setPwdSeniorDetails((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  className="w-full border rounded-md px-3 py-2"
                  placeholder="Enter name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ID Number
                </label>
                <input
                  type="text"
                  value={pwdSeniorDetails.idNumber}
                  onChange={(e) =>
                    setPwdSeniorDetails((prev) => ({
                      ...prev,
                      idNumber: e.target.value,
                    }))
                  }
                  className="w-full border rounded-md px-3 py-2"
                  placeholder="Enter ID number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={pwdSeniorDetails.type}
                  onChange={(e) =>
                    setPwdSeniorDetails((prev) => ({
                      ...prev,
                      type: e.target.value,
                    }))
                  }
                  className="w-full border rounded-md px-3 py-2"
                >
                  <option value="PWD">PWD</option>
                  <option value="Senior">Senior Citizen</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowPwdSeniorSelection(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleSelectPwdSeniorItems}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Apply Discount
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Combined Payment Modal */}
      {showCombinedPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-bold mb-4">Combined Payment</h3>
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cash Amount
                </label>
                <input
                  type="number"
                  value={combinedPayment.cashAmount}
                  onChange={(e) =>
                    setCombinedPayment((prev) => ({
                      ...prev,
                      cashAmount: Number(e.target.value) || 0,
                      onlineAmount:
                        totals.total - (Number(e.target.value) || 0),
                    }))
                  }
                  className="w-full border rounded-md px-3 py-2"
                  placeholder="Enter cash amount"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Online Method
                </label>
                <select
                  value={combinedPayment.onlineMethod || ""}
                  onChange={(e) =>
                    setCombinedPayment((prev) => ({
                      ...prev,
                      onlineMethod: e.target.value,
                    }))
                  }
                  className="w-full border rounded-md px-3 py-2"
                >
                  <option value="">Select method</option>
                  <option value="BDO">BDO</option>
                  <option value="GCASH">GCASH</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Online Amount
                </label>
                <input
                  type="number"
                  value={combinedPayment.onlineAmount}
                  readOnly
                  className="w-full border rounded-md px-3 py-2 bg-gray-50"
                />
              </div>
              <div className="pt-3 border-t">
                <div className="flex justify-between mb-1">
                  <span>Total:</span>
                  <span className="font-bold">₱{totals.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span>Cash + Online:</span>
                  <span className="font-bold">
                    ₱
                    {(
                      combinedPayment.cashAmount + combinedPayment.onlineAmount
                    ).toFixed(2)}
                  </span>
                </div>
                {combinedPayment.cashAmount + combinedPayment.onlineAmount >
                  totals.total && (
                  <div className="flex justify-between text-green-600">
                    <span>Change:</span>
                    <span className="font-bold">
                      ₱
                      {(
                        combinedPayment.cashAmount +
                        combinedPayment.onlineAmount -
                        totals.total
                      ).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowCombinedPaymentModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handlePlaceOrder}
                disabled={!combinedPayment.onlineMethod}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {showInvoice && orderInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">Order Invoice</h2>
              <div className="flex space-x-2">
                <button
                  onClick={handlePrintInvoice}
                  disabled={isPrinting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isPrinting ? "Printing..." : "Print Receipt"}
                </button>
                <button
                  onClick={handleCloseInvoice}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
              <Invoice order={orderInfo} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Bill;
