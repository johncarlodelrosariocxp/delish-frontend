import React, { useState, useRef, useEffect } from "react";
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
import { useNavigate } from "react-router-dom";
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
const IconUser = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 448 512"
    fill="currentColor"
  >
    <path d="M224 256A128 128 0 1 0 224 0a128 128 0 1 0 0 256zm-45.7 48C79.8 304 0 383.8 0 482.3C0 498.7 13.3 512 29.7 512H418.3c16.4 0 29.7-13.3 29.7-29.7C448 383.8 368.2 304 269.7 304H178.3z" />
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
// -----------------------------------------------------------------

// Invoice Component (nested inside Bill)
const Invoice = ({ orderInfo, setShowInvoice }) => {
  const invoiceRef = useRef(null);
  const [bluetoothDevice, setBluetoothDevice] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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

  // Connect to Bluetooth printer
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

      console.log("Connecting to GATT server...");
      const server = await device.gatt.connect();

      let writeCharacteristic = null;
      const servicesToTry = [serviceUUID_PRINTER, serviceUUID_SPP];

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
      setIsConnecting(false);

      localStorage.setItem("bluetoothPrinterId", device.id);

      alertUser(
        `Connected to printer: ${device.name || "Bluetooth Printer"}`,
        "success"
      );

      device.addEventListener("gattserverdisconnected", () => {
        setIsConnected(false);
        setBluetoothDevice(null);
        alertUser("Bluetooth printer disconnected", "warning");
        console.log("Bluetooth device disconnected");
      });

      return { device, server, writeCharacteristic };
    } catch (error) {
      setIsConnecting(false);
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

      const CHUNK_SIZE = 20;
      for (let i = 0; i < dataArray.length; i += CHUNK_SIZE) {
        const chunk = dataArray.slice(i, i + CHUNK_SIZE);
        await bluetoothDevice.writeCharacteristic.writeValue(chunk);
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
      if (!isConnected) {
        const connected = await connectBluetooth();
        if (!connected) {
          throw new Error("Failed to connect to printer");
        }
      }

      const receiptText = generateThermalText();
      console.log("Receipt generated, sending to printer...");

      await sendToPrinter(receiptText);

      console.log("Receipt printed successfully!");

      if (orderInfo.paymentMethod === "Cash") {
        try {
          await sendToPrinter(thermalCommands.DRAWER_KICK);
          console.log("Cash drawer command sent");
          await new Promise((resolve) => setTimeout(resolve, 500));
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

  // Safe number conversion helper
  const safeNumber = (value) => {
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  };

  // Generate thermal printer text
  const generateThermalText = () => {
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

    const orderId =
      orderInfo._id?.slice(-8) ||
      (orderInfo.orderDate
        ? Math.floor(new Date(orderInfo.orderDate).getTime())
            .toString()
            .slice(-6)
        : "N/A");

    const cashier = orderInfo.cashier || "Admin";
    const customerType = orderInfo.customerType || "walk-in";
    const paymentMethod = orderInfo.paymentMethod || "Cash";

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

    const pwdSeniorDetails = orderInfo.pwdSeniorDetails;
    const pwdSeniorDiscountApplied = !!pwdSeniorDetails;

    const items = orderInfo.items || [];

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

    receiptText += thermalCommands.BOLD_ON;
    receiptText += "QTY  ITEM                AMOUNT\n";
    receiptText += thermalCommands.BOLD_OFF;
    receiptText += "--------------------------------\n";

    items.forEach((item) => {
      const name = item.name || "Unknown Item";
      const quantity = item.quantity || 1;
      const price = safeNumber(
        item.pricePerQuantity || item.originalPrice || 0
      );
      const total = safeNumber(item.price || 0);
      const isRedeemed = item.isRedeemed || item.isFree || false;
      const isPwdSeniorDiscounted = item.isPwdSeniorDiscounted || false;

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
      } else if (isPwdSeniorDiscounted) {
        const originalTotal = price * quantity;
        const discountAmount = originalTotal * 0.2;
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

    if (paymentMethod === "Cash" && totals.cashAmount > 0) {
      receiptText += `Cash:    ₱${totals.cashAmount.toFixed(2)}\n`;
      receiptText += `Change:  ₱${totals.change.toFixed(2)}\n`;
    }

    if (pwdSeniorDiscountApplied && pwdSeniorDetails?.name) {
      receiptText += "--------------------------------\n";
      receiptText += "PWD/SENIOR DETAILS:\n";
      receiptText += `Name: ${pwdSeniorDetails.name}\n`;
      receiptText += `ID #: ${pwdSeniorDetails.idNumber || ""}\n`;
      receiptText += `Type: ${pwdSeniorDetails.type || "PWD"}\n`;
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

  // Print via Bluetooth
  const printViaBluetooth = async () => {
    try {
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

  // Print via Web Print API (HTML)
  const handlePrint = () => {
    if (!invoiceRef.current) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Order Receipt - DELISH RESTAURANT</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            @media print {
              body { 
                margin: 0 !important; 
                padding: 0 !important;
                font-family: 'Courier New', monospace !important;
                font-size: 10px !important;
                width: 80mm !important;
                background: white !important;
                color: black !important;
                -webkit-print-color-adjust: exact !important;
              }
              * {
                box-shadow: none !important;
                background: transparent !important;
              }
              .no-print { display: none !important; }
              .text-center { text-align: center !important; }
              .text-right { text-align: right !important; }
              .text-bold { font-weight: bold !important; }
              .border-line { 
                border-top: 1px solid #000 !important; 
                margin: 2px 0 !important;
              }
              .success-icon { 
                text-align: center !important; 
                margin: 4px 0 !important;
                font-size: 16px !important;
                color: green !important;
              }
            }
            .receipt-container { 
              width: 100%;
              padding: 4px;
              background: white;
            }
            .header {
              text-align: center;
              margin-bottom: 4px;
            }
            .company-name {
              font-size: 14px;
              font-weight: bold;
              margin-bottom: 2px;
            }
            .receipt-title {
              font-size: 12px;
              margin-bottom: 4px;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin: 4px 0;
            }
            .items-table td {
              padding: 0;
              font-size: 9px;
              line-height: 1.1;
            }
            .discount-item {
              color: #059669;
              font-size: 8px;
            }
            .free-item {
              color: #dc2626;
              font-weight: bold;
              font-size: 8px;
            }
            .thank-you {
              text-align: center;
              margin-top: 8px;
              font-style: italic;
              font-size: 9px;
            }
          </style>
        </head>
        <body>
          <div class="receipt-container">
            <div class="header">
              <div class="company-name">DELISH RESTAURANT</div>
              <div class="receipt-title">ORDER RECEIPT</div>
              <div class="border-line"></div>
            </div>
            
            <table width="100%" style="font-size: 9px; line-height: 1.1;">
              <tr><td><strong>Order ID:</strong></td><td>${
                orderInfo._id?.slice(-8) ||
                (orderInfo.orderDate
                  ? Math.floor(new Date(orderInfo.orderDate).getTime())
                      .toString()
                      .slice(-6)
                  : "N/A")
              }</td></tr>
              <tr><td><strong>Date:</strong></td><td>${new Date(
                orderInfo.orderDate || Date.now()
              ).toLocaleDateString("en-PH")}</td></tr>
              <tr><td><strong>Time:</strong></td><td>${new Date(
                orderInfo.orderDate || Date.now()
              ).toLocaleTimeString("en-PH", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              })}</td></tr>
              <tr><td><strong>Cashier:</strong></td><td>${
                orderInfo.cashier || "Admin"
              }</td></tr>
              <tr><td><strong>Customer:</strong></td><td>${
                orderInfo.customerType === "walk-in" ? "Dine-in" : "Take-out"
              }</td></tr>
            </table>
            
            <div class="border-line"></div>
            
            <table class="items-table">
              <tr>
                <td><strong>QTY</strong></td>
                <td><strong>ITEM</strong></td>
                <td class="text-right"><strong>AMOUNT</strong></td>
              </tr>
              <div class="border-line"></div>
              ${(orderInfo.items || [])
                .map(
                  (item) => `
                  <tr>
                    <td>${item.quantity || 1}</td>
                    <td>
                      ${item.name || "Unknown Item"}
                      ${
                        item.isRedeemed || item.isFree
                          ? '<span class="free-item"> (FREE)</span>'
                          : ""
                      }
                      ${
                        item.isPwdSeniorDiscounted
                          ? '<span class="discount-item"> (PWD/SENIOR -20%)</span>'
                          : ""
                      }
                    </td>
                    <td class="text-right">${
                      item.isRedeemed || item.isFree
                        ? "FREE"
                        : `₱${safeNumber(item.price || 0).toFixed(2)}`
                    }</td>
                  </tr>
                `
                )
                .join("")}
            </table>
            
            <div class="border-line"></div>
            
            <table width="100%" style="font-size: 9px; line-height: 1.1;">
              <tr><td>Subtotal:</td><td class="text-right">₱${safeNumber(
                orderInfo.bills?.total || 0
              ).toFixed(2)}</td></tr>
              ${
                safeNumber(orderInfo.bills?.pwdSeniorDiscount || 0) > 0
                  ? `<tr><td class="discount-item">PWD/SENIOR:</td><td class="text-right discount-item">-₱${safeNumber(
                      orderInfo.bills?.pwdSeniorDiscount || 0
                    ).toFixed(2)}</td></tr>`
                  : ""
              }
              ${
                safeNumber(orderInfo.bills?.redemptionDiscount || 0) > 0
                  ? `<tr><td class="discount-item">REDEMPTION:</td><td class="text-right discount-item">-₱${safeNumber(
                      orderInfo.bills?.redemptionDiscount || 0
                    ).toFixed(2)}</td></tr>`
                  : ""
              }
              ${
                safeNumber(orderInfo.bills?.employeeDiscount || 0) > 0
                  ? `<tr><td class="discount-item">EMP DISC:</td><td class="text-right discount-item">-₱${safeNumber(
                      orderInfo.bills?.employeeDiscount || 0
                    ).toFixed(2)}</td></tr>`
                  : ""
              }
              ${
                safeNumber(orderInfo.bills?.shareholderDiscount || 0) > 0
                  ? `<tr><td class="discount-item">SHAREHOLDER:</td><td class="text-right discount-item">-₱${safeNumber(
                      orderInfo.bills?.shareholderDiscount || 0
                    ).toFixed(2)}</td></tr>`
                  : ""
              }
              <tr><td>VAT (12%):</td><td class="text-right">₱${safeNumber(
                orderInfo.bills?.tax || 0
              ).toFixed(2)}</td></tr>
              <div class="border-line"></div>
              <tr class="text-bold"><td>TOTAL:</td><td class="text-right">₱${safeNumber(
                orderInfo.bills?.totalWithTax || 0
              ).toFixed(2)}</td></tr>
              ${
                orderInfo.paymentMethod === "Cash" &&
                safeNumber(orderInfo.bills?.cashAmount || 0) > 0
                  ? `
                  <tr><td>Cash:</td><td class="text-right">₱${safeNumber(
                    orderInfo.bills?.cashAmount || 0
                  ).toFixed(2)}</td></tr>
                  <tr><td>Change:</td><td class="text-right">₱${safeNumber(
                    orderInfo.bills?.change || 0
                  ).toFixed(2)}</td></tr>
                  `
                  : ""
              }
            </table>
            
            <div class="border-line"></div>
            
            <table width="100%" style="font-size: 9px; line-height: 1.1;">
              <tr><td><strong>Payment:</strong></td><td>${
                orderInfo.paymentMethod || "Cash"
              }</td></tr>
              ${
                orderInfo.pwdSeniorDetails
                  ? `
                  <tr><td colspan="2"><strong>PWD/SENIOR DETAILS:</strong></td></tr>
                  <tr><td>Name:</td><td>${
                    orderInfo.pwdSeniorDetails.name
                  }</td></tr>
                  <tr><td>ID #:</td><td>${
                    orderInfo.pwdSeniorDetails.idNumber || ""
                  }</td></tr>
                  <tr><td>Type:</td><td>${
                    orderInfo.pwdSeniorDetails.type || "PWD"
                  }</td></tr>
                  `
                  : ""
              }
            </table>
            
            <div class="thank-you">
              <div>Thank you for dining with us!</div>
              <div>Please visit again!</div>
              <div>This receipt is your official proof of purchase.</div>
            </div>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank", "width=300,height=600");
    if (!printWindow) {
      alertUser("Please allow popups for printing", "warning");
      return;
    }

    printWindow.document.write(printContent);
    printWindow.document.close();

    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.onafterprint = () => {
          setTimeout(() => printWindow.close(), 100);
        };
      }, 250);
    };
  };

  const handleThermalPrint = () => {
    const receiptText = generateThermalText();

    const cleanText = receiptText
      .replace(/[\x00-\x1F\x7F-\x9F]/g, (char) => {
        return char === "\x0A" ? "\n" : "";
      })
      .trim();

    const textBlob = new Blob([cleanText], { type: "text/plain" });
    const textUrl = URL.createObjectURL(textBlob);

    const textWindow = window.open(textUrl, "_blank");
    if (textWindow) {
      textWindow.document.write(
        `<pre style="font-family: 'Courier New', monospace; font-size: 10px; line-height: 1.1; white-space: pre-wrap; word-wrap: break-word; max-width: 80mm; margin: 0 auto;">${cleanText}</pre>`
      );
      textWindow.document.close();

      textWindow.onload = () => {
        setTimeout(() => {
          textWindow.print();
          setTimeout(() => {
            textWindow.close();
            URL.revokeObjectURL(textUrl);
          }, 100);
        }, 500);
      };
    } else {
      alertUser(
        "Please allow popups to open the text print preview.",
        "warning"
      );
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
        className="bg-white rounded-lg shadow-xl w-full max-w-[320px] max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="text-center p-4 border-b">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2"
          >
            <IconCheck className="text-white text-base" />
          </motion.div>
          <h2 className="text-xl font-bold text-gray-800">Order Confirmed!</h2>
          <p className="text-gray-600 text-xs mt-1">Thank you for your order</p>

          {/* Connection Status */}
          <div
            className={`mt-2 px-3 py-1 rounded-full text-xs font-semibold ${
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
              ? "Connecting..."
              : "Bluetooth Disconnected"}
          </div>

          {/* Error Message Display */}
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 p-2 bg-red-50 text-red-700 text-[10px] rounded-lg border border-red-300 font-medium"
            >
              {errorMessage}
            </motion.div>
          )}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3" ref={invoiceRef}>
          {/* Order Details */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <h3 className="font-semibold text-gray-700 text-sm mb-2">
              Order Details
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
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
                  {orderInfo.cashier || "Admin"}
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

          {/* PWD/Senior Details */}
          {orderInfo.pwdSeniorDetails && (
            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
              <h3 className="font-semibold text-green-700 text-sm mb-2 flex items-center gap-2">
                <IconIdCard className="w-4 h-4" />
                PWD/SENIOR Details
              </h3>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Type:</span>
                  <span className="font-medium text-green-700">
                    {orderInfo.pwdSeniorDetails.type || "PWD"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Name:</span>
                  <span className="font-medium truncate">
                    {orderInfo.pwdSeniorDetails.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">ID Number:</span>
                  <span className="font-medium">
                    {orderInfo.pwdSeniorDetails.idNumber || "N/A"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Items Ordered */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <h3 className="font-semibold text-gray-700 text-sm mb-2">
              Items Ordered ({(orderInfo.items || []).length})
            </h3>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {(orderInfo.items || []).map((item, index) => (
                <div
                  key={index}
                  className={`flex justify-between items-start p-2 rounded text-xs ${
                    item.isRedeemed || item.isFree
                      ? "bg-red-50 border border-red-200"
                      : item.isPwdSeniorDiscounted
                      ? "bg-green-50 border border-green-200"
                      : "bg-white border border-gray-200"
                  }`}
                >
                  <div className="flex-1 pr-2">
                    <p className="font-medium truncate">
                      {item.name}
                      {item.isRedeemed || item.isFree ? (
                        <span className="ml-1 text-red-600 font-semibold text-[10px]">
                          (FREE)
                        </span>
                      ) : item.isPwdSeniorDiscounted ? (
                        <span className="ml-1 text-green-600 font-semibold text-[10px]">
                          (PWD/SENIOR -20%)
                        </span>
                      ) : null}
                    </p>
                    <p className="text-gray-600 text-[10px]">
                      {item.quantity || 1} × ₱
                      {(
                        item.pricePerQuantity ||
                        item.originalPrice ||
                        0
                      ).toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right min-w-16">
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
                        : `₱${safeNumber(item.price || 0).toFixed(2)}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bill Summary */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <h3 className="font-semibold text-gray-700 text-sm mb-2">
              Bill Summary
            </h3>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>
                  ₱{safeNumber(orderInfo.bills?.total || 0).toFixed(2)}
                </span>
              </div>

              {safeNumber(orderInfo.bills?.pwdSeniorDiscount || 0) > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>PWD/SENIOR:</span>
                  <span>
                    -₱
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
                    -₱
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
                    -₱
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
                    -₱
                    {safeNumber(
                      orderInfo.bills?.shareholderDiscount || 0
                    ).toFixed(2)}
                  </span>
                </div>
              )}

              <div className="flex justify-between border-t pt-1">
                <span>VAT (12%):</span>
                <span>₱{safeNumber(orderInfo.bills?.tax || 0).toFixed(2)}</span>
              </div>

              <div className="border-t pt-2 mt-2 flex justify-between font-bold text-sm">
                <span>TOTAL:</span>
                <span className="text-green-600">
                  ₱{safeNumber(orderInfo.bills?.totalWithTax || 0).toFixed(2)}
                </span>
              </div>

              {orderInfo.paymentMethod === "Cash" &&
                safeNumber(orderInfo.bills?.cashAmount || 0) > 0 && (
                  <>
                    <div className="border-t pt-2 flex justify-between">
                      <span className="text-gray-600">Cash:</span>
                      <span className="text-gray-800">
                        ₱
                        {safeNumber(orderInfo.bills?.cashAmount || 0).toFixed(
                          2
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Change:</span>
                      <span className="text-green-600 font-semibold">
                        ₱{safeNumber(orderInfo.bills?.change || 0).toFixed(2)}
                      </span>
                    </div>
                  </>
                )}
            </div>
          </div>

          {/* Payment Information */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <h3 className="font-semibold text-gray-700 text-sm mb-2">
              Payment Information
            </h3>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Method:</span>
                <span className="font-medium">
                  {orderInfo.paymentMethod || "Cash"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="font-medium text-green-600">
                  {orderInfo.customerType === "walk-in"
                    ? "Dine-in"
                    : "Take-out"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t bg-gray-50">
          {/* Connection Buttons */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button
              onClick={isConnected ? disconnectBluetooth : connectBluetooth}
              disabled={isConnecting}
              className={`flex items-center justify-center gap-2 px-3 py-3 rounded-lg transition-colors text-xs font-semibold ${
                isConnected
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : isConnecting
                  ? "bg-gray-400 text-white cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {isConnecting ? (
                <IconBluetooth className="text-xs w-4 h-4 animate-pulse" />
              ) : isConnected ? (
                <IconUnlink className="text-xs w-4 h-4" />
              ) : (
                <IconLink className="text-xs w-4 h-4" />
              )}
              {isConnecting
                ? "Connecting..."
                : isConnected
                ? "Disconnect"
                : "Connect BT"}
            </button>

            <button
              onClick={openCashDrawer}
              disabled={!isConnected}
              className={`flex items-center justify-center gap-2 px-3 py-3 rounded-lg transition-colors text-xs font-semibold ${
                isConnected
                  ? "bg-orange-600 text-white hover:bg-orange-700"
                  : "bg-gray-400 text-white cursor-not-allowed"
              }`}
            >
              <IconCashRegister className="text-xs w-4 h-4" />
              Open Drawer
            </button>
          </div>

          {/* Print Buttons */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 bg-blue-600 text-white px-2 py-3 rounded-lg hover:bg-blue-700 transition-colors text-xs font-semibold"
            >
              <IconPrint className="text-xs w-4 h-4" />
              Browser
            </button>

            <button
              onClick={printViaBluetooth}
              disabled={!isConnected || isPrinting}
              className={`flex items-center justify-center gap-2 px-2 py-3 rounded-lg transition-colors text-xs font-semibold ${
                isConnected && !isPrinting
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
                  <IconBluetooth className="text-xs w-4 h-4" />
                  BT Print
                </>
              )}
            </button>

            <button
              onClick={handleThermalPrint}
              className="flex items-center justify-center gap-2 bg-green-600 text-white px-2 py-3 rounded-lg hover:bg-green-700 transition-colors text-xs font-semibold"
            >
              <IconReceipt className="text-xs w-4 h-4" />
              Text Print
            </button>

            <button
              onClick={() => setShowInvoice(false)}
              className="col-span-3 flex items-center justify-center gap-2 bg-gray-600 text-white px-3 py-3 rounded-lg hover:bg-gray-700 transition-colors text-xs font-semibold mt-2"
            >
              <IconTimes className="text-xs w-4 h-4" />
              Close Invoice
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// Main Bill Component
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
  const [mixedPayment, setMixedPayment] = useState({
    isMixed: false,
    cashAmount: 0,
    onlineAmount: 0,
    onlineMethod: null,
  });
  const [showMixedPaymentModal, setShowMixedPaymentModal] = useState(false);

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

    // Continue with order placement
    handlePlaceOrder();
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

  // Prepare order data for submission
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

    // Prepare customer details based on type
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
      user: user?._id || "000000000000000000000001",
      tableId: currentOrder?.tableId || null,
      orderNumber: currentOrder?.number || `ORD-${Date.now()}`,
      totalAmount: Number(totals.total.toFixed(2)),
      cashAmount: Number(cashPaymentAmount.toFixed(2)),
      onlineAmount: Number(onlinePaymentAmount.toFixed(2)),
      change: Number(totals.change.toFixed(2)),
    };
  };

  // Order mutation with complete order handling
  const orderMutation = useMutation({
    mutationFn: (reqData) => addOrder(reqData),
    onSuccess: async (res) => {
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
          onlineAmount: totals.onlineAmount,
          onlineMethod: mixedPayment.onlineMethod,
          change: totals.change,
        },
        paymentMethod: paymentMethod,
        paymentDetails: {
          cashAmount: totals.cashAmount,
          onlineAmount: totals.onlineAmount,
          onlineMethod: mixedPayment.onlineMethod,
          isMixedPayment: mixedPayment.isMixed,
        },
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

      // SHOW INVOICE IMMEDIATELY
      setShowInvoice(true);
      setIsProcessing(false);
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

    // Validate payment amounts
    if (paymentMethod === "Cash") {
      if (totals.cashAmount < totals.total) {
        setShowCashModal(true);
        return;
      }
    } else if (mixedPayment.isMixed) {
      const totalPaid = mixedPayment.cashAmount + mixedPayment.onlineAmount;
      if (totalPaid < totals.total) {
        enqueueSnackbar("Total payment is less than order total", {
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

    const orderData = prepareOrderData();
    console.log("Sending order data:", JSON.stringify(orderData, null, 2));

    // Submit order
    orderMutation.mutate(orderData);
  };

  // Handle cash amount submission
  const handleCashSubmit = () => {
    const cashAmountNum = safeNumber(cashAmount);

    if (cashAmountNum >= totals.total) {
      // Full cash payment
      setShowCashModal(false);
      handlePlaceOrder();
    } else if (cashAmountNum > 0) {
      // Partial cash payment - offer mixed payment
      const remaining = totals.total - cashAmountNum;
      setShowMixedPaymentModal(true);
      setMixedPayment((prev) => ({
        ...prev,
        cashAmount: cashAmountNum,
        onlineAmount: remaining,
      }));
    } else {
      enqueueSnackbar("Please enter a valid cash amount", {
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
                    <span className="font-semibold">Note:</span> Cash amount is
                    insufficient. You can pay the remaining ₱
                    {(totals.total - safeNumber(cashAmount)).toFixed(2)} online.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowCashModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCashSubmit}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors"
              >
                {safeNumber(cashAmount) >= totals.total
                  ? "Confirm Full Payment"
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
                    {Math.max(0, totals.total - safeNumber(cashAmount)).toFixed(
                      2
                    )}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-sm text-gray-600">Change Due:</span>
                  <span className="text-sm font-bold text-green-600">
                    ₱
                    {Math.max(0, safeNumber(cashAmount) - totals.total).toFixed(
                      2
                    )}
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
              "Place Order & Show Invoice"
            )}
          </button>
        </div>

        {/* 📄 INVOICE MODAL - Shows after successful order placement */}
        {showInvoice && orderInfo && (
          <Invoice orderInfo={orderInfo} setShowInvoice={handleCloseInvoice} />
        )}
      </div>
    </div>
  );
};

export default Bill;
