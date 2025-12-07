import React, { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";

// --- Custom Icon Components ---
const IconCheck = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 512 512"
    fill="currentColor"
  >
    <path d="M470.6 105.4c12.5 12.5 12.5 32.8 0 45.3l-256 256c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5 12.5-12.5 32.8 0-45.3s32.8-12.5 45.3 0L192 338.7 425.4 105.4c12.5-12.5 32.8-12.5 45.3 0z" />
  </svg>
);
const IconPrint = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 512 512"
    fill="currentColor"
  >
    <path d="M128 0C92.7 0 64 28.7 64 64v96h64V64H384v96h64V64c0-35.3-28.7-64-64-64H128zM384 352c35.3 0 64-28.7 64-64V224H288 224 64v64c0 35.3 28.7 64 64 64H384zm64 64H128c-35.3 0-64-28.7-64-64V224H128 384 448v128c0 35.3-28.7 64-64 64zM392 480a24 24 0 1 0 0-48 24 24 0 1 0 0 48z" />
  </svg>
);
const IconTimes = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 320 512"
    fill="currentColor"
  >
    <path d="M310.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L160 210.7 54.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L114.7 256 9.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L160 301.3 265.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L205.3 256 310.6 150.6z" />
  </svg>
);
const IconReceipt = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 384 512"
    fill="currentColor"
  >
    <path d="M336 64H48C21.5 64 0 85.5 0 112v288c0 26.5 21.5 48 48 48h288c26.5 0 48-21.5 48-48V112c0-26.5-21.5-48-48-48zm-6 208a10.4 10.4 0 0 1 0 20.8 10.4 10.4 0 1 1 0-20.8zm-192 0a10.4 10.4 0 0 1 0 20.8 10.4 10.4 0 1 1 0-20.8zM240 192a16 16 0 1 1 0 32 16 16 0 1 1 0-32zm-96 0a16 16 0 1 1 0 32 16 16 0 1 1 0-32zM288 384H96a16 16 0 0 1 0-32h192a16 16 0 0 1 0 32z" />
  </svg>
);
const IconBluetooth = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 448 512"
    fill="currentColor"
  >
    <path d="M294.7 32.4L32 232.1h148.2L124.9 397c-6.8 17.7 2.1 37.6 19.8 44.4s37.6-2.1 44.4-19.8l108.5-281.2c4.7-12.2-4.1-25.7-16.3-30.4s-25.7 4.1-30.4 16.3L130.6 307.7l-47.5-123.6 220-141.7c16.5-10.6 37.3-5.2 47.9 11.3s5.2 37.3-11.3 47.9L170.8 256l113.8 113.8c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L125.4 278.4 294.7 32.4zM240 376c0-22.1 17.9-40 40-40s40 17.9 40 40-17.9 40-40 40-40-17.9-40-40zM280 40c22.1 0 40 17.9 40 40s-17.9 40-40 40-40-17.9-40-40 17.9-40 40-40z" />
  </svg>
);
const IconCashRegister = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 576 512"
    fill="currentColor"
  >
    <path d="M24 88C10.7 88 0 98.7 0 112v88c0 13.3 10.7 24 24 24H552c13.3 0 24-10.7 24-24V112c0-13.3-10.7-24-24-24H24zM80 480c-17.7 0-32-14.3-32-32s14.3-32 32-32H496c17.7 0 32 14.3 32 32s14.3 32 32 32H80zM552 256H24c-13.3 0-24 10.7-24 24V416c0 13.3 10.7 24 24 24H552c13.3 0 24-10.7 24-24V280c0-13.3-10.7-24-24-24z" />
  </svg>
);
const IconLink = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 512 512"
    fill="currentColor"
  >
    <path d="M192 208v160c0 44.2 35.8 80 80 80h16c44.2 0 80-35.8 80-80V208c0-44.2-35.8-80-80-80h-16c-4.4 0-8 3.6-8 8s3.6 8 8 8h16c35.3 0 64 28.7 64 64v160c0 35.3-28.7 64-64 64h-16c-35.3 0-64-28.7-64-64V208c0-4.4-3.6-8-8-8s-8 3.6-8 8zM128 128H48C21.5 128 0 149.5 0 176v160c0 26.5 21.5 48 48 48h80c4.4 0 8-3.6 8-8s-3.6-8-8-8H48c-17.7 0-32-14.3-32-32V176c0-17.7 14.3-32 32-32h80c4.4 0 8-3.6 8-8s-3.6-8-8-8z" />
  </svg>
);
const IconUnlink = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 512 512"
    fill="currentColor"
  >
    <path d="M485.3 43.1L399.7 128.7 448 176c26.5 0 48-21.5 48-48V48c0-26.5-21.5-48-48-48H368c-26.5 0-48 21.5-48 48v48l-94.8 94.8c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L399.7 192 485.3 277.7c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L430.6 142.1l63.5-63.5c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L448 48c-8.8 0-16 7.2-16 16v48l-80 80L160 384l-80-80V240c0-8.8-7.2-16-16-16H48c-26.5 0-48 21.5-48 48v80c0 26.5 21.5 48 48 48h80c26.5 0 48-21.5 48-48v-48l160-160L469.3 468.9c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L485.3 43.1z" />
  </svg>
);
const IconIdCard = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 576 512"
    fill="currentColor"
  >
    <path d="M528 160V416c0 8.8-7.2 16-16 16H320c0-44.2-35.8-80-80-80H176c-44.2 0-80 35.8-80 80H64c-8.8 0-16-7.2-16-16V160H528zM64 32C28.7 32 0 60.7 0 96V416c0 35.3 28.7 64 64 64H512c35.3 0 64-28.7 64-64V96c0-35.3-28.7-64-64-64H64zM272 256a64 64 0 1 0 -128 0 64 64 0 1 0 128 0zm104-48c-13.3 0-24 10.7-24 24s10.7 24 24 24h80c13.3 0 24-10.7 24-24s-10.7-24-24-24H376zm0 96c-13.3 0-24 10.7-24 24s10.7 24 24 24h80c13.3 0 24-10.7 24-24s-10.7-24-24-24H376z" />
  </svg>
);
const IconFacebook = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 320 512"
    fill="currentColor"
  >
    <path d="M279.14 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.43 0 225.36 0c-73.22 0-121.08 44.38-121.08 124.72v70.62H22.89V288h81.39v224h100.17V288z" />
  </svg>
);
const IconInstagram = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 448 512"
    fill="currentColor"
  >
    <path d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8zM398.8 388c-7.8 19.6-22.9 34.7-42.6 42.6-29.5 11.7-99.5 9-132.1 9s-102.7 2.6-132.1-9c-19.6-7.8-34.7-22.9-42.6-42.6-11.7-29.5-9-99.5-9-132.1s-2.6-102.7 9-132.1c7.8-19.6 22.9-34.7 42.6-42.6 29.5-11.7 99.5-9 132.1-9s102.7-2.6 132.1 9c19.6 7.8 34.7 22.9 42.6 42.6 11.7 29.5 9 99.5 9 132.1s2.7 102.7-9 132.1z" />
  </svg>
);
const IconTiktok = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 448 512"
    fill="currentColor"
  >
    <path d="M448,209.91a210.06,210.06,0,0,1-122.77-39.25V349.38A162.55,162.55,0,1,1,185,188.31V278.2a74.62,74.62,0,1,0,52.23,71.18V0h88a121.18,121.18,0,0,0,1.86,22.17h0A122.18,122.18,0,0,0,381,102.39a121.43,121.43,0,0,0,67,20.14Z" />
  </svg>
);
// -----------------------------------------------------------------

// Safe number conversion helper
const safeNumber = (value) => {
  const num = Number(value);
  return isNaN(num) ? 0 : num;
};

// Helper function to extract first name
const getFirstName = (fullName) => {
  if (!fullName) return "";
  const firstName = fullName.split(" ")[0];
  return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
};

const Invoice = ({ orderInfo, setShowInvoice }) => {
  const invoiceRef = useRef(null);
  const [bluetoothDevice, setBluetoothDevice] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [autoConnectAttempted, setAutoConnectAttempted] = useState(false);

  // Thermal printer ESC/POS commands
  const thermalCommands = {
    INIT: "\x1B\x40", // Initialize printer
    ALIGN_LEFT: "\x1B\x61\x00", // Left alignment
    ALIGN_CENTER: "\x1B\x61\x01", // Center alignment
    ALIGN_RIGHT: "\x1B\x61\x02", // Right alignment
    BOLD_ON: "\x1B\x45\x01", // Bold on
    BOLD_OFF: "\x1B\x45\x00", // Bold off
    UNDERLINE_ON: "\x1B\x2D\x01", // Underline on
    UNDERLINE_OFF: "\x1B\x2D\x00", // Underline off
    CUT_PARTIAL: "\x1B\x69", // Partial cut
    CUT_FULL: "\x1B\x6D", // Full cut
    FEED_LINE: "\x0A", // Line feed
    FEED_N_LINES: (n) => `\x1B\x64${String.fromCharCode(n)}`, // Feed n lines
    TEXT_NORMAL: "\x1B\x21\x00", // Normal text
    TEXT_LARGE: "\x1B\x21\x10", // Double height
    TEXT_DOUBLE_WIDTH: "\x1B\x21\x20", // Double width
    TEXT_DOUBLE_SIZE: "\x1B\x21\x30", // Double height & width
    DRAWER_KICK: "\x1B\x70\x00\x19\xFA", // Kick drawer (pin 2)
  };

  // Initialize Bluetooth connection on component mount and keep it always connected
  useEffect(() => {
    const initializeBluetooth = async () => {
      if (!navigator.bluetooth || autoConnectAttempted) return;

      try {
        const savedDeviceId = localStorage.getItem("bluetoothPrinterId");
        if (savedDeviceId) {
          setIsConnecting(true);
          setAutoConnectAttempted(true);
          console.log("Auto-connecting to saved printer...");

          // Try to reconnect to previously connected device
          const devices = await navigator.bluetooth.getDevices();
          let device = devices.find((d) => d.id === savedDeviceId);

          if (!device) {
            console.log(
              "Saved device not found in device list, requesting new connection"
            );
            return; // Let user manually connect if device not found
          }

          // Check if device is already connected
          if (!device.gatt?.connected) {
            const server = await device.gatt.connect();
            let writeCharacteristic = null;

            // Search for writable characteristic
            const services = [
              "000018f0-0000-1000-8000-00805f9b34fb",
              "00001101-0000-1000-8000-00805f9b34fb",
            ];

            for (const serviceUuid of services) {
              try {
                const service = await server.getPrimaryService(serviceUuid);
                const characteristics = await service.getCharacteristics();
                writeCharacteristic = characteristics.find(
                  (char) =>
                    char.properties.write ||
                    char.properties.writeWithoutResponse
                );
                if (writeCharacteristic) break;
              } catch (err) {
                continue;
              }
            }

            if (writeCharacteristic) {
              setBluetoothDevice({ device, server, writeCharacteristic });
              setIsConnected(true);
              console.log("Auto-connected to printer:", device.name);

              device.addEventListener("gattserverdisconnected", () => {
                setIsConnected(false);
                setBluetoothDevice(null);
                console.log("Bluetooth printer disconnected");
                alertUser("Printer disconnected. Please reconnect.", "warning");
              });
            }
          } else {
            // Device is already connected
            setIsConnected(true);
            console.log("Printer already connected");
          }
        }
      } catch (error) {
        console.log("Auto-connect failed:", error);
      } finally {
        setIsConnecting(false);
      }
    };

    initializeBluetooth();
  }, [autoConnectAttempted]);

  // Auto-print when component mounts (when order is completed)
  useEffect(() => {
    if (orderInfo && !isPrinting && isConnected) {
      const autoPrint = async () => {
        try {
          setIsPrinting(true);
          await printReceipt();
        } catch (error) {
          console.log("Auto-print failed:", error);
        } finally {
          setIsPrinting(false);
        }
      };

      const timer = setTimeout(autoPrint, 1000);
      return () => clearTimeout(timer);
    }
  }, [orderInfo, isConnected]);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  const alertUser = (message, variant = "error") => {
    setErrorMessage(message);
    console.log(`${variant.toUpperCase()}: ${message}`);
  };

  // Connect to Bluetooth printer (manually)
  const connectBluetooth = async () => {
    if (!navigator.bluetooth) {
      alertUser(
        "Bluetooth is not supported in this browser. Please use Chrome/Edge.",
        "error"
      );
      return null;
    }

    try {
      setIsConnecting(true);
      console.log("Searching for Bluetooth printer...");

      // Common UUIDs for thermal printers
      const serviceUUID_PRINTER = "000018f0-0000-1000-8000-00805f9b34fb";
      const serviceUUID_SPP = "00001101-0000-1000-8000-00805f9b34fb";

      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [serviceUUID_PRINTER, serviceUUID_SPP],
      });

      console.log("Connecting to GATT server...");
      const server = await device.gatt.connect();

      let writeCharacteristic = null;
      const servicesToTry = [serviceUUID_PRINTER, serviceUUID_SPP];

      // Search for the writable characteristic across common services
      for (const serviceUuid of servicesToTry) {
        try {
          console.log(`Trying service: ${serviceUuid}`);
          const service = await server.getPrimaryService(serviceUuid);
          const characteristics = await service.getCharacteristics();

          writeCharacteristic = characteristics.find(
            (char) =>
              char.properties.write || char.properties.writeWithoutResponse
          );

          if (writeCharacteristic) {
            console.log(
              `Found writable characteristic in service ${serviceUuid}`
            );
            break;
          }
        } catch (error) {
          console.log(`Service ${serviceUuid} not found or accessible.`);
        }
      }

      if (!writeCharacteristic) {
        throw new Error(
          "No writable characteristic found. Printer uses a non-standard protocol."
        );
      }

      setBluetoothDevice({ device, server, writeCharacteristic });
      setIsConnected(true);
      setAutoConnectAttempted(true);

      // Save device ID for future auto-connections
      localStorage.setItem("bluetoothPrinterId", device.id);

      alertUser(
        `Connected to printer: ${device.name || "Bluetooth Printer"}`,
        "success"
      );

      // Handle device disconnection
      device.addEventListener("gattserverdisconnected", () => {
        setIsConnected(false);
        setBluetoothDevice(null);
        alertUser("Bluetooth printer disconnected", "warning");
        console.log("Bluetooth device disconnected");
      });

      return { device, server, writeCharacteristic };
    } catch (error) {
      console.error("Bluetooth connection failed:", error);

      if (error.name === "NotFoundError") {
        alertUser(
          "No printer selected. Ensure printer is ON and in pairing mode.",
          "warning"
        );
      } else if (error.name === "NetworkError") {
        alertUser(
          "Connection failed. Check printer range and ensure no other app is connected.",
          "error"
        );
      } else if (error.name === "SecurityError") {
        alertUser("Security error. Please ensure HTTPS is used.", {
          variant: "error",
        });
      } else {
        alertUser(`Connection failed: ${error.message}`, "error");
      }
      return null;
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect from Bluetooth printer
  const disconnectBluetooth = () => {
    if (bluetoothDevice) {
      try {
        bluetoothDevice.device.gatt.disconnect();
        setIsConnected(false);
        setBluetoothDevice(null);
        localStorage.removeItem("bluetoothPrinterId");
        setAutoConnectAttempted(false);
        alertUser("Disconnected from printer", "info");
      } catch (error) {
        console.error("Error disconnecting:", error);
      }
    }
  };

  // Send data to printer
  const sendToPrinter = async (data) => {
    try {
      if (!bluetoothDevice || !isConnected) {
        throw new Error("Not connected to Bluetooth device");
      }

      const encoder = new TextEncoder();
      const dataArray = encoder.encode(data);

      // Split large data into chunks to avoid buffer overflow
      const CHUNK_SIZE = 20; // Small chunks for reliability
      for (let i = 0; i < dataArray.length; i += CHUNK_SIZE) {
        const chunk = dataArray.slice(i, i + CHUNK_SIZE);
        await bluetoothDevice.writeCharacteristic.writeValue(chunk);
        // Small delay between chunks
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      console.log("Data sent to printer successfully");
      return true;
    } catch (error) {
      console.error("Error sending data to printer:", error);
      throw error;
    }
  };

  // Print receipt to Bluetooth printer
  const printReceipt = async () => {
    setIsPrinting(true);
    console.log("Starting print process...");

    try {
      // Ensure we're connected
      if (!isConnected) {
        throw new Error("Please connect to Bluetooth printer first.");
      }

      // Generate receipt text
      const receiptText = generateThermalText();
      console.log("Receipt generated, sending to printer...");

      // Send to printer
      await sendToPrinter(receiptText);

      console.log("Receipt printed successfully!");

      // Open cash drawer if payment is cash
      if (orderInfo.paymentMethod === "Cash") {
        try {
          await sendToPrinter(thermalCommands.DRAWER_KICK);
          console.log("Cash drawer command sent");
          await new Promise((resolve) => setTimeout(resolve, 500)); // Wait for drawer to open
        } catch (drawerError) {
          console.warn("Could not open cash drawer:", drawerError);
          alertUser(
            "Cash drawer command failed. Please open manually.",
            "warning"
          );
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

  // Generate thermal printer text
  const generateThermalText = () => {
    const LINE_WIDTH = 32; // Standard 58mm thermal printer width

    // Helper function to center text
    const centerText = (text, width = LINE_WIDTH) => {
      if (text.length >= width) return text;
      const padding = Math.floor((width - text.length) / 2);
      return (
        " ".repeat(padding) + text + " ".repeat(width - text.length - padding)
      );
    };

    // Helper function to right-align text
    const rightText = (text, width = LINE_WIDTH) => {
      if (text.length >= width) return text;
      return " ".repeat(width - text.length) + text;
    };

    // Extract data from orderInfo
    const orderId =
      orderInfo._id?.slice(-8) ||
      (orderInfo.orderDate
        ? Math.floor(new Date(orderInfo.orderDate).getTime())
            .toString()
            .slice(-6)
        : "N/A");

    const cashier = getFirstName(orderInfo.cashier || "Admin");
    const customerType = orderInfo.customerType || "walk-in";
    const paymentMethod = orderInfo.paymentMethod || "Cash";

    // Get totals from bills
    const totals = {
      baseGrossTotal: safeNumber(orderInfo.bills?.total || 0),
      pwdSeniorDiscountAmount: safeNumber(
        orderInfo.bills?.pwdSeniorDiscount || 0
      ),
      redemptionAmount: safeNumber(orderInfo.bills?.redemptionDiscount || 0),
      employeeDiscountAmount: safeNumber(
        orderInfo.bills?.employeeDiscount || 0
      ),
      shareholderDiscountAmount: safeNumber(
        orderInfo.bills?.shareholderDiscount || 0
      ),
      vatAmount: safeNumber(orderInfo.bills?.tax || 0),
      total: safeNumber(orderInfo.bills?.totalWithTax || 0),
      cashAmount: safeNumber(orderInfo.bills?.cashAmount || 0),
      change: safeNumber(orderInfo.bills?.change || 0),
      netSales: safeNumber(orderInfo.bills?.netSales || 0),
    };

    // Get PWD/Senior details
    const pwdSeniorDetails = orderInfo.pwdSeniorDetails;
    const pwdSeniorDiscountApplied = !!pwdSeniorDetails;

    // Get items (combined if needed)
    const items = orderInfo.items || [];

    let receiptText = thermalCommands.INIT;

    // Set alignment and text size for header
    receiptText += thermalCommands.ALIGN_CENTER;
    receiptText += thermalCommands.TEXT_LARGE;
    receiptText += "DELISH CHEESECAKE CAFE\n";
    receiptText += thermalCommands.TEXT_NORMAL;
    receiptText += "--------------------------------\n";
    receiptText += "Order Slip\n";
    receiptText += "--------------------------------\n\n";

    // Order information
    receiptText += thermalCommands.ALIGN_LEFT;
    receiptText += thermalCommands.BOLD_ON;
    receiptText += `Order #: ${orderId}\n`;
    receiptText += thermalCommands.BOLD_OFF;
    receiptText += `Date: ${new Date().toLocaleDateString("en-PH")}\n`;
    receiptText += `Time: ${new Date().toLocaleTimeString("en-PH", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })}\n`;
    receiptText += `Cashier: ${cashier}\n`;
    receiptText += `Customer: ${
      customerType === "walk-in" ? "Dine-in" : "Take-out"
    }\n`;
    receiptText += "--------------------------------\n\n";

    // Items header
    receiptText += thermalCommands.BOLD_ON;
    receiptText += "QTY  ITEM                AMOUNT\n";
    receiptText += thermalCommands.BOLD_OFF;
    receiptText += "--------------------------------\n";

    // Items list - format EXACTLY like in Bill
    items.forEach((item) => {
      const name = item.name || "Unknown Item";
      const quantity = item.quantity || 1;
      const price = safeNumber(
        item.pricePerQuantity || item.originalPrice || 0
      );
      const total = safeNumber(item.price || 0);
      const isRedeemed = item.isRedeemed || item.isFree || false;
      const isPwdSeniorDiscounted = item.isPwdSeniorDiscounted || false;

      // Format quantity (2 chars)
      const qtyStr = quantity.toString().padStart(2, " ");

      // Format item name (max 20 chars)
      let nameStr = name;
      if (nameStr.length > 20) {
        nameStr = nameStr.substring(0, 17) + "...";
      } else {
        nameStr = nameStr.padEnd(20, " ");
      }

      // Format amount (8 chars) - Using PHP instead of ₱
      const amountStr = (
        isRedeemed ? "FREE" : `PHP${total.toFixed(2)}`
      ).padStart(8, " ");

      receiptText += `${qtyStr}   ${nameStr}${amountStr}\n`;

      // Add notes for redeemed or discounted items
      if (isRedeemed) {
        receiptText += "     *REDEEMED\n";
      } else if (isPwdSeniorDiscounted) {
        const originalTotal = price * quantity;
        const discountAmount = originalTotal * 0.2; // 20% discount
        receiptText += `     *PWD/SENIOR -PHP${discountAmount.toFixed(2)}\n`;
      }
    });

    receiptText += "--------------------------------\n";

    // Totals - right aligned - Using PHP instead of ₱
    receiptText += thermalCommands.ALIGN_RIGHT;
    receiptText += `SUBTOTAL:   PHP${totals.baseGrossTotal.toFixed(2)}\n`;

    if (totals.pwdSeniorDiscountAmount > 0) {
      receiptText += `PWD/SENIOR: -PHP${totals.pwdSeniorDiscountAmount.toFixed(
        2
      )}\n`;
    }

    if (totals.redemptionAmount > 0) {
      receiptText += `REDEMPTION: -PHP${totals.redemptionAmount.toFixed(2)}\n`;
    }

    if (totals.employeeDiscountAmount > 0) {
      receiptText += `EMP DISC:   -PHP${totals.employeeDiscountAmount.toFixed(
        2
      )}\n`;
    }

    if (totals.shareholderDiscountAmount > 0) {
      receiptText += `SHAREHOLDER:-PHP${totals.shareholderDiscountAmount.toFixed(
        2
      )}\n`;
    }

    receiptText += `VAT (12%):  PHP${totals.vatAmount.toFixed(2)}\n`;
    receiptText += "--------------------------------\n";

    receiptText += thermalCommands.BOLD_ON;
    receiptText += `TOTAL:      PHP${totals.total.toFixed(2)}\n`;
    receiptText += thermalCommands.BOLD_OFF;
    receiptText += "--------------------------------\n";

    // Payment info
    receiptText += thermalCommands.ALIGN_LEFT;
    receiptText += `Payment: ${paymentMethod}\n`;

    if (paymentMethod === "Cash" && totals.cashAmount > 0) {
      receiptText += `Cash:    PHP${totals.cashAmount.toFixed(2)}\n`;
      receiptText += `Change:  PHP${totals.change.toFixed(2)}\n`;
    }

    // PWD/Senior details if applied
    if (pwdSeniorDiscountApplied && pwdSeniorDetails?.name) {
      receiptText += "--------------------------------\n";
      receiptText += "PWD/SENIOR DETAILS:\n";
      receiptText += `Name: ${getFirstName(pwdSeniorDetails.name)}\n`;
      receiptText += `ID #: ${pwdSeniorDetails.idNumber || ""}\n`;
      receiptText += `Type: ${pwdSeniorDetails.type || "PWD"}\n`;
    }

    receiptText += "--------------------------------\n";

    // Footer with social media and branding - Better visual representation
    receiptText += thermalCommands.ALIGN_CENTER;
    receiptText += thermalCommands.BOLD_ON;
    receiptText += "Follow us on:\n";
    receiptText += thermalCommands.BOLD_OFF;

    // Social media representation with better spacing
    receiptText += "[Facebook]  [I]  [T]\n"; // Facebook, Instagram, TikTok
    receiptText += thermalCommands.BOLD_ON;
    receiptText += "delish cheesecake\n";
    receiptText += thermalCommands.BOLD_OFF;
    receiptText += "----------------\n";
    receiptText += "Thank you for dining with us!\n";
    receiptText += "Please visit again!\n\n";

    // Feed 3 lines and cut
    receiptText += thermalCommands.FEED_N_LINES(3);
    receiptText += thermalCommands.CUT_PARTIAL;

    return receiptText;
  };

  // Print via Bluetooth
  const printViaBluetooth = async () => {
    try {
      if (!navigator.bluetooth) {
        alertUser("Bluetooth is not supported in this browser.", "error");
        return;
      }

      if (!isConnected) {
        alertUser("Please connect to Bluetooth printer first.", "warning");
        return;
      }

      await printReceipt();
      alertUser("Receipt printed successfully!", "success");
    } catch (error) {
      console.error("Bluetooth printing failed:", error);
      alertUser(`Printing error: ${error.message}. Please try again.`, "error");
    }
  };

  // Function to open cash drawer
  const openCashDrawer = async () => {
    try {
      console.log("Attempting to open cash drawer...");

      if (isConnected && bluetoothDevice) {
        await sendToPrinter(thermalCommands.DRAWER_KICK);
        alertUser("Cash drawer opened successfully!", "success");
      } else {
        alertUser(
          "Not connected to printer. Please connect to Bluetooth first or open drawer manually.",
          "warning"
        );
      }
    } catch (error) {
      console.error("Failed to open cash drawer:", error);
      alertUser(
        "Failed to send drawer command. Please open the cash drawer manually.",
        "warning"
      );
    }
  };

  if (!orderInfo) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-3">
        <div className="bg-white p-3 rounded-lg shadow-lg text-center max-w-[280px]">
          <p className="text-red-500 font-semibold text-xs">
            Invalid order data.
          </p>
          <button
            onClick={() => setShowInvoice(false)}
            className="mt-2 text-blue-500 hover:underline text-[10px] px-3 py-1.5"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-3">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.15 }}
        className="bg-white rounded-lg shadow-xl w-full max-w-[320px] max-h-[70vh] overflow-hidden flex flex-col"
      >
        {/* Header - Compact */}
        <div className="text-center p-3 border-b">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-1"
          >
            <IconCheck className="text-white text-sm" />
          </motion.div>
          <h2 className="text-lg font-bold text-gray-800">Order Confirmed!</h2>
          <p className="text-gray-600 text-[10px] mt-0.5">Receipt ready</p>

          {/* Connection Status */}
          <div
            className={`mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
              isConnected
                ? "bg-green-100 text-green-800"
                : isConnecting
                ? "bg-yellow-100 text-yellow-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {isConnected
              ? "✓ Bluetooth Connected"
              : isConnecting
              ? "Auto-connecting..."
              : "Bluetooth Disconnected"}
          </div>

          {/* Auto-print status */}
          {isPrinting && (
            <div className="mt-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-[10px] font-semibold">
              Auto-printing receipt...
            </div>
          )}

          {/* Error Message Display */}
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-1 p-1.5 bg-red-50 text-red-700 text-[9px] rounded border border-red-300 font-medium"
            >
              {errorMessage}
            </motion.div>
          )}
        </div>

        {/* Scrollable Content - Compact */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2" ref={invoiceRef}>
          {/* Order Details - Compact */}
          <div className="bg-gray-50 p-2 rounded-lg">
            <h3 className="font-semibold text-gray-700 text-xs mb-1">
              Order Details
            </h3>
            <div className="grid grid-cols-2 gap-1 text-[10px]">
              <div>
                <span className="text-gray-600">ID:</span>
                <p className="font-medium truncate">
                  {orderInfo._id?.slice(-8) ||
                    (orderInfo.orderDate
                      ? Math.floor(new Date(orderInfo.orderDate).getTime())
                          .toString()
                          .slice(-6)
                      : "N/A")}
                </p>
              </div>
              <div>
                <span className="text-gray-600">Date:</span>
                <p className="font-medium">
                  {new Date(
                    orderInfo.orderDate || Date.now()
                  ).toLocaleDateString("en-PH")}
                </p>
              </div>
              <div>
                <span className="text-gray-600">Time:</span>
                <p className="font-medium">
                  {new Date(
                    orderInfo.orderDate || Date.now()
                  ).toLocaleTimeString("en-PH", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  })}
                </p>
              </div>
              <div>
                <span className="text-gray-600">Cashier:</span>
                <p className="font-medium truncate text-green-600">
                  {getFirstName(orderInfo.cashier || "Admin")}
                </p>
              </div>
              <div className="col-span-2">
                <span className="text-gray-600">Customer:</span>
                <p className="font-medium truncate text-blue-600">
                  {orderInfo.customerType === "walk-in"
                    ? "Dine-in"
                    : "Take-out"}
                </p>
              </div>
            </div>
          </div>

          {/* PWD/Senior Details - Compact */}
          {orderInfo.pwdSeniorDetails && (
            <div className="bg-green-50 p-2 rounded-lg border border-green-200">
              <h3 className="font-semibold text-green-700 text-xs mb-1 flex items-center gap-1">
                <IconIdCard className="w-3 h-3" />
                PWD/SENIOR Details
              </h3>
              <div className="space-y-0.5 text-[10px]">
                <div className="flex justify-between">
                  <span className="text-gray-600">Type:</span>
                  <span className="font-medium text-green-700">
                    {orderInfo.pwdSeniorDetails.type || "PWD"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Name:</span>
                  <span className="font-medium truncate">
                    {getFirstName(orderInfo.pwdSeniorDetails.name)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">ID #:</span>
                  <span className="font-medium">
                    {orderInfo.pwdSeniorDetails.idNumber || "N/A"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Items Ordered - Compact */}
          <div className="bg-gray-50 p-2 rounded-lg">
            <h3 className="font-semibold text-gray-700 text-xs mb-1">
              Items ({(orderInfo.items || []).length})
            </h3>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {(orderInfo.items || []).map((item, index) => (
                <div
                  key={index}
                  className={`flex justify-between items-start p-1.5 rounded text-[10px] ${
                    item.isRedeemed || item.isFree
                      ? "bg-red-50 border border-red-200"
                      : item.isPwdSeniorDiscounted
                      ? "bg-green-50 border border-green-200"
                      : "bg-white border border-gray-200"
                  }`}
                >
                  <div className="flex-1 pr-1">
                    <p className="font-medium truncate">
                      {item.name}
                      {item.isRedeemed || item.isFree ? (
                        <span className="ml-1 text-red-600 font-semibold text-[9px]">
                          (FREE)
                        </span>
                      ) : item.isPwdSeniorDiscounted ? (
                        <span className="ml-1 text-green-600 font-semibold text-[9px]">
                          (PWD/SENIOR)
                        </span>
                      ) : null}
                    </p>
                    <p className="text-gray-600 text-[9px]">
                      {item.quantity || 1} × PHP
                      {(
                        item.pricePerQuantity ||
                        item.originalPrice ||
                        0
                      ).toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right min-w-12">
                    <p
                      className={`font-semibold ${
                        item.isRedeemed || item.isFree
                          ? "text-red-600"
                          : item.isPwdSeniorDiscounted
                          ? "text-green-600"
                          : "text-gray-800"
                      }`}
                    >
                      {item.isRedeemed || item.isFree
                        ? "FREE"
                        : `PHP${safeNumber(item.price || 0).toFixed(2)}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bill Summary - Compact */}
          <div className="bg-gray-50 p-2 rounded-lg">
            <h3 className="font-semibold text-gray-700 text-xs mb-1">
              Bill Summary
            </h3>
            <div className="space-y-0.5 text-[10px]">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>
                  PHP{safeNumber(orderInfo.bills?.total || 0).toFixed(2)}
                </span>
              </div>

              {safeNumber(orderInfo.bills?.pwdSeniorDiscount || 0) > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>PWD/SENIOR:</span>
                  <span>
                    -PHP
                    {safeNumber(
                      orderInfo.bills?.pwdSeniorDiscount || 0
                    ).toFixed(2)}
                  </span>
                </div>
              )}

              {safeNumber(orderInfo.bills?.redemptionDiscount || 0) > 0 && (
                <div className="flex justify-between text-blue-600">
                  <span>REDEMPTION:</span>
                  <span>
                    -PHP
                    {safeNumber(
                      orderInfo.bills?.redemptionDiscount || 0
                    ).toFixed(2)}
                  </span>
                </div>
              )}

              {safeNumber(orderInfo.bills?.employeeDiscount || 0) > 0 && (
                <div className="flex justify-between text-yellow-600">
                  <span>EMP DISC:</span>
                  <span>
                    -PHP
                    {safeNumber(orderInfo.bills?.employeeDiscount || 0).toFixed(
                      2
                    )}
                  </span>
                </div>
              )}

              {safeNumber(orderInfo.bills?.shareholderDiscount || 0) > 0 && (
                <div className="flex justify-between text-purple-600">
                  <span>SHAREHOLDER:</span>
                  <span>
                    -PHP
                    {safeNumber(
                      orderInfo.bills?.shareholderDiscount || 0
                    ).toFixed(2)}
                  </span>
                </div>
              )}

              <div className="flex justify-between border-t pt-0.5">
                <span>VAT (12%):</span>
                <span>
                  PHP{safeNumber(orderInfo.bills?.tax || 0).toFixed(2)}
                </span>
              </div>

              <div className="border-t pt-1 mt-0.5 flex justify-between font-bold text-xs">
                <span>TOTAL:</span>
                <span className="text-green-600">
                  PHP{safeNumber(orderInfo.bills?.totalWithTax || 0).toFixed(2)}
                </span>
              </div>

              {orderInfo.paymentMethod === "Cash" &&
                safeNumber(orderInfo.bills?.cashAmount || 0) > 0 && (
                  <>
                    <div className="border-t pt-0.5 flex justify-between">
                      <span className="text-gray-600">Cash:</span>
                      <span className="text-gray-800">
                        PHP
                        {safeNumber(orderInfo.bills?.cashAmount || 0).toFixed(
                          2
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Change:</span>
                      <span className="text-green-600 font-semibold">
                        PHP{safeNumber(orderInfo.bills?.change || 0).toFixed(2)}
                      </span>
                    </div>
                  </>
                )}
            </div>
          </div>

          {/* Social Media Footer */}
          <div className="bg-gradient-to-r from-pink-50 to-purple-50 p-2 rounded-lg border border-pink-200">
            <h3 className="font-semibold text-gray-700 text-xs mb-1 text-center">
              Follow us on Social Media
            </h3>
            <div className="flex justify-center items-center gap-3 mt-1">
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                  <IconFacebook className="text-white text-xs" />
                </div>
                <span className="text-[8px] text-gray-600 mt-0.5">
                  Facebook
                </span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <IconInstagram className="text-white text-xs" />
                </div>
                <span className="text-[8px] text-gray-600 mt-0.5">
                  Instagram
                </span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 bg-black rounded-full flex items-center justify-center">
                  <IconTiktok className="text-white text-xs" />
                </div>
                <span className="text-[8px] text-gray-600 mt-0.5">TikTok</span>
              </div>
            </div>
            <div className="text-center mt-2">
              <p className="text-[11px] font-bold text-purple-700">
                delish cheesecake
              </p>
              <p className="text-[9px] text-gray-600 mt-0.5">
                Best cheesecake in town!
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons - Mobile Optimized */}
        <div className="p-3 border-t bg-gray-50">
          {/* Connection & Drawer Buttons */}
          <div className="grid grid-cols-2 gap-2 mb-2">
            <button
              onClick={isConnected ? disconnectBluetooth : connectBluetooth}
              disabled={isConnecting}
              className={`flex items-center justify-center gap-1 px-2 py-2 rounded-lg transition-colors text-[10px] font-semibold ${
                isConnected
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : isConnecting
                  ? "bg-yellow-400 text-white cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {isConnecting ? (
                <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
              ) : isConnected ? (
                <IconUnlink className="w-3 h-3" />
              ) : (
                <IconLink className="w-3 h-3" />
              )}
              {isConnecting
                ? "Connecting"
                : isConnected
                ? "Disconnect BT"
                : "Connect BT"}
            </button>

            <button
              onClick={openCashDrawer}
              disabled={!isConnected}
              className={`flex items-center justify-center gap-1 px-2 py-2 rounded-lg transition-colors text-[10px] font-semibold ${
                isConnected
                  ? "bg-orange-600 text-white hover:bg-orange-700"
                  : "bg-gray-400 text-white cursor-not-allowed"
              }`}
            >
              <IconCashRegister className="w-3 h-3" />
              Open Drawer
            </button>
          </div>

          {/* Print & Close Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={printViaBluetooth}
              disabled={!isConnected || isPrinting}
              className={`flex items-center justify-center gap-1 px-2 py-2 rounded-lg transition-colors text-[10px] font-semibold ${
                isConnected && !isPrinting
                  ? "bg-purple-600 text-white hover:bg-purple-700"
                  : "bg-gray-400 text-white cursor-not-allowed"
              }`}
            >
              {isPrinting ? (
                <>
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Printing
                </>
              ) : (
                <>
                  <IconPrint className="w-3 h-3" />
                  Print Receipt
                </>
              )}
            </button>

            <button
              onClick={() => setShowInvoice(false)}
              className="flex items-center justify-center gap-1 bg-gray-600 text-white px-2 py-2 rounded-lg hover:bg-gray-700 transition-colors text-[10px] font-semibold"
            >
              <IconTimes className="w-3 h-3" />
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Invoice;
