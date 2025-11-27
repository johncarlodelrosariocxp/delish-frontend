import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  FaCheck,
  FaPrint,
  FaTimes,
  FaReceipt,
  FaBluetooth,
  FaCashRegister,
  FaLink,
  FaUnlink,
} from "react-icons/fa";

const Invoice = ({ orderInfo, setShowInvoice }) => {
  const invoiceRef = useRef(null);
  const [bluetoothDevice, setBluetoothDevice] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Thermal printer ESC/POS commands
  const thermalCommands = {
    INIT: "\x1B\x40", // Initialize printer
    ALIGN_LEFT: "\x1B\x61\x00", // Left alignment
    ALIGN_CENTER: "\x1B\x61\x01", // Center alignment
    ALIGN_RIGHT: "\x1B\x61\x02", // Right alignment
    BOLD_ON: "\x1B\x45\x01", // Bold on
    BOLD_OFF: "\x1B\x45\x00", // Bold off
    CUT: "\x1D\x56\x41\x10", // Full cut
    FEED_LINE: "\x0A", // Feed line
    TEXT_NORMAL: "\x1B\x21\x00", // Normal text
    TEXT_LARGE: "\x1B\x21\x10", // Double height
    // Cash drawer commands for POS58D_UB
    DRAWER_KICK_2: "\x1B\x70\x00\x19\xFA", // Kick drawer pin 2
    DRAWER_KICK_5: "\x1B\x70\x01\x19\xFA", // Kick drawer pin 5
  };

  // Connect to Bluetooth printer
  const connectBluetooth = async () => {
    try {
      if (!navigator.bluetooth) {
        alert(
          "Bluetooth is not supported in this browser. Please use Chrome Mobile or Samsung Internet browser."
        );
        return;
      }

      setIsConnecting(true);
      console.log("Searching for Bluetooth printer...");

      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          "000018f0-0000-1000-8000-00805f9b34fb",
          "00001101-0000-1000-8000-00805f9b34fb",
        ],
      });

      console.log("Connecting to device...");
      const server = await device.gatt.connect();

      let service;
      try {
        service = await server.getPrimaryService(
          "000018f0-0000-1000-8000-00805f9b34fb"
        );
      } catch (error) {
        service = await server.getPrimaryService(
          "00001101-0000-1000-8000-00805f9b34fb"
        );
      }

      const characteristics = await service.getCharacteristics();
      const writeCharacteristic = characteristics.find(
        (char) => char.properties.write || char.properties.writeWithoutResponse
      );

      if (!writeCharacteristic) {
        throw new Error("No writable characteristic found");
      }

      setBluetoothDevice({ device, server, writeCharacteristic });
      setIsConnected(true);
      setIsConnecting(false);

      alert("Successfully connected to Bluetooth printer!");

      // Handle device disconnection
      device.addEventListener("gattserverdisconnected", () => {
        setIsConnected(false);
        setBluetoothDevice(null);
        console.log("Bluetooth device disconnected");
      });
    } catch (error) {
      setIsConnecting(false);
      console.error("Bluetooth connection failed:", error);

      if (error.name === "NotFoundError") {
        alert(
          "No Bluetooth printer found. Please:\n1. Turn on your POS58D_UB printer\n2. Make sure it's in pairing mode\n3. Check Bluetooth is enabled on your device"
        );
      } else if (error.name === "NetworkError") {
        alert(
          "Connection failed. Please check:\n1. Printer is within range\n2. No other device is connected to the printer\n3. Try re-pairing the device"
        );
      } else if (error.name === "SecurityError") {
        alert(
          "Bluetooth permission denied. Please allow Bluetooth access in your browser settings."
        );
      } else {
        alert(`Connection error: ${error.message}`);
      }
    }
  };

  // Disconnect from Bluetooth printer
  const disconnectBluetooth = async () => {
    if (bluetoothDevice) {
      try {
        bluetoothDevice.device.gatt.disconnect();
        setIsConnected(false);
        setBluetoothDevice(null);
        alert("Disconnected from Bluetooth printer");
      } catch (error) {
        console.error("Error disconnecting:", error);
      }
    }
  };

  // Function to open cash drawer
  const openCashDrawer = async () => {
    try {
      console.log("Attempting to open cash drawer...");

      if (bluetoothDevice && isConnected) {
        await sendDrawerCommandViaBluetooth();
      } else {
        // If not connected, try to connect first
        alert(
          "Not connected to printer. Please connect to Bluetooth first or open drawer manually."
        );
      }
    } catch (error) {
      console.error("Failed to open cash drawer:", error);
      alert("Please open the cash drawer manually.");
    }
  };

  // Send drawer command via Bluetooth
  const sendDrawerCommandViaBluetooth = async () => {
    try {
      if (!bluetoothDevice || !isConnected) {
        throw new Error("Not connected to Bluetooth device");
      }

      const encoder = new TextEncoder();
      const drawerCommand = encoder.encode(thermalCommands.DRAWER_KICK_2);
      await bluetoothDevice.writeCharacteristic.writeValue(drawerCommand);
      console.log("Cash drawer command sent successfully");
      alert("Cash drawer opened successfully!");
    } catch (error) {
      console.error("Bluetooth drawer command failed:", error);
      throw error;
    }
  };

  // Print via Bluetooth
  const printViaBluetooth = async () => {
    try {
      if (!bluetoothDevice || !isConnected) {
        alert("Please connect to Bluetooth printer first.");
        return;
      }

      // Generate receipt with drawer command
      const receiptText = generateThermalText(true);

      const encoder = new TextEncoder();
      const data = encoder.encode(receiptText);

      console.log("Sending data to printer...");
      await bluetoothDevice.writeCharacteristic.writeValue(data);

      console.log("Print job sent successfully!");
      alert("Receipt printed successfully! Cash drawer should open.");
    } catch (error) {
      console.error("Bluetooth printing failed:", error);
      alert(`Printing error: ${error.message}. Please try again.`);
    }
  };

  const handlePrint = () => {
    if (!invoiceRef.current) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Order Receipt - DELISH</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            /* Thermal printer friendly styles */
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
              .border-top { 
                border-top: 1px dashed #000 !important; 
                margin: 6px 0 !important; 
                padding-top: 6px !important;
              }
              .success-icon { 
                text-align: center !important; 
                margin: 8px 0 !important;
                font-size: 20px !important;
                color: green !important;
              }
            }
            
            /* Common styles */
            .receipt-container { 
              width: 100%;
              border: 1px solid #000;
              padding: 12px;
              background: white;
            }
            .header {
              text-align: center;
              margin-bottom: 12px;
            }
            .company-name {
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 4px;
            }
            .receipt-title {
              font-size: 14px;
              margin-bottom: 8px;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin: 8px 0;
            }
            .items-table td {
              padding: 1px 0;
              font-size: 10px;
            }
            .discount-item {
              color: #059669;
              font-size: 9px;
            }
            .free-item {
              color: #dc2626;
              font-weight: bold;
            }
            .thank-you {
              text-align: center;
              margin-top: 12px;
              font-style: italic;
              font-size: 10px;
            }
          </style>
        </head>
        <body>
          <div class="receipt-container">
            <div class="header">
              <div class="company-name">DELISH RESTAURANT</div>
              <div class="receipt-title">ORDER RECEIPT</div>
              <div class="success-icon">✓</div>
              <div>Thank you for your order!</div>
            </div>
            
            <div class="border-top">
              <table width="100%">
                <tr><td><strong>Order ID:</strong></td><td>${
                  orderInfo.orderDate
                    ? Math.floor(new Date(orderInfo.orderDate).getTime())
                    : "N/A"
                }</td></tr>
                <tr><td><strong>Name:</strong></td><td>${
                  orderInfo.customerDetails?.name || "Walk-in Customer"
                }</td></tr>
                <tr><td><strong>Date:</strong></td><td>${new Date(
                  orderInfo.orderDate
                ).toLocaleString()}</td></tr>
              </table>
            </div>
            
            <div class="border-top">
              <div class="text-bold">ORDER ITEMS</div>
              <table class="items-table">
                ${orderInfo.items
                  ?.map(
                    (item) => `
                  <tr>
                    <td>${item.name}${item.isFree ? " (FREE)" : ""} x${
                      item.quantity
                    }</td>
                    <td class="text-right">₱${(
                      item.price * item.quantity
                    ).toFixed(2)}</td>
                  </tr>
                `
                  )
                  .join("")}
              </table>
            </div>
            
            <div class="border-top">
              <table width="100%">
                <tr><td>Subtotal:</td><td class="text-right">₱${
                  orderInfo.bills?.total?.toFixed(2) || "0.00"
                }</td></tr>
                ${
                  orderInfo.bills?.pwdSssDiscount > 0
                    ? `<tr><td class="discount-item">PWD/SSS Discount:</td><td class="text-right discount-item">-₱${orderInfo.bills.pwdSssDiscount.toFixed(
                        2
                      )}</td></tr>`
                    : ""
                }
                ${
                  orderInfo.bills?.employeeDiscount > 0
                    ? `<tr><td class="discount-item">Employee Discount:</td><td class="text-right discount-item">-₱${orderInfo.bills.employeeDiscount.toFixed(
                        2
                      )}</td></tr>`
                    : ""
                }
                <tr><td>VAT (12%):</td><td class="text-right">₱${
                  orderInfo.bills?.tax?.toFixed(2) || "0.00"
                }</td></tr>
                <tr class="text-bold">
                  <td>TOTAL:</td>
                  <td class="text-right">₱${
                    orderInfo.bills?.totalWithTax?.toFixed(2) || "0.00"
                  }</td>
                </tr>
              </table>
            </div>
            
            <div class="border-top">
              <table width="100%">
                <tr><td><strong>Payment:</strong></td><td>${
                  orderInfo.paymentMethod || "Cash"
                }</td></tr>
                <tr><td><strong>Status:</strong></td><td>${
                  orderInfo.orderStatus || "In Progress"
                }</td></tr>
              </table>
            </div>
            
            <div class="thank-you">
              <div>Thank you for your purchase!</div>
            </div>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank", "width=300,height=500");
    if (!printWindow) {
      alert("Please allow popups for printing");
      return;
    }

    printWindow.document.write(printContent);
    printWindow.document.close();

    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.onafterprint = () => {
          // Open cash drawer after printing
          openCashDrawer();
          setTimeout(() => printWindow.close(), 100);
        };
      }, 250);
    };
  };

  const generateThermalText = (includeDrawerCommand = false) => {
    const orderId = orderInfo.orderDate
      ? Math.floor(new Date(orderInfo.orderDate).getTime()).toString().slice(-6)
      : "N/A";

    const customerName = orderInfo.customerDetails?.name || "Walk-in Customer";
    const orderDate = new Date(orderInfo.orderDate).toLocaleString();

    let receiptText = thermalCommands.INIT; // Initialize printer

    // Header
    receiptText += thermalCommands.ALIGN_CENTER;
    receiptText += thermalCommands.TEXT_LARGE;
    receiptText += "DELISH RESTAURANT\n";
    receiptText += thermalCommands.TEXT_NORMAL;
    receiptText += "ORDER RECEIPT\n";
    receiptText += "✓ Thank you!\n\n";

    // Order Info
    receiptText += thermalCommands.ALIGN_LEFT;
    receiptText += thermalCommands.BOLD_ON;
    receiptText += `Order ID: ${orderId}\n`;
    receiptText += `Name: ${customerName}\n`;
    receiptText += `Date: ${orderDate}\n`;
    receiptText += thermalCommands.BOLD_OFF;
    receiptText += "=".repeat(32) + "\n\n";

    // Items
    receiptText += thermalCommands.BOLD_ON;
    receiptText += "ORDER ITEMS:\n";
    receiptText += thermalCommands.BOLD_OFF;

    orderInfo.items?.forEach((item) => {
      const itemName =
        item.name.length > 20 ? item.name.substring(0, 17) + "..." : item.name;
      const line = `${itemName}${item.isFree ? " (FREE)" : ""} x${
        item.quantity
      }`;
      const price = item.isFree
        ? "FREE"
        : `₱${(item.price * item.quantity).toFixed(2)}`;

      receiptText += line;
      receiptText += " ".repeat(Math.max(1, 32 - line.length - price.length));
      receiptText += price + "\n";
    });

    receiptText += "\n" + "=".repeat(32) + "\n";

    // Bill Summary
    receiptText += "Subtotal:";
    receiptText += " ".repeat(
      32 -
        "Subtotal:".length -
        (orderInfo.bills?.total?.toFixed(2) || "0.00").length -
        1
    );
    receiptText += `₱${orderInfo.bills?.total?.toFixed(2) || "0.00"}\n`;

    if (orderInfo.bills?.pwdSssDiscount > 0) {
      receiptText += "PWD/SSS Discount:";
      receiptText += " ".repeat(
        32 -
          "PWD/SSS Discount:".length -
          orderInfo.bills.pwdSssDiscount.toFixed(2).length -
          1
      );
      receiptText += `-₱${orderInfo.bills.pwdSssDiscount.toFixed(2)}\n`;
    }

    if (orderInfo.bills?.employeeDiscount > 0) {
      receiptText += "Employee Discount:";
      receiptText += " ".repeat(
        32 -
          "Employee Discount:".length -
          orderInfo.bills.employeeDiscount.toFixed(2).length -
          1
      );
      receiptText += `-₱${orderInfo.bills.employeeDiscount.toFixed(2)}\n`;
    }

    receiptText += "VAT (12%):";
    receiptText += " ".repeat(
      32 -
        "VAT (12%):".length -
        (orderInfo.bills?.tax?.toFixed(2) || "0.00").length -
        1
    );
    receiptText += `₱${orderInfo.bills?.tax?.toFixed(2) || "0.00"}\n`;

    receiptText += thermalCommands.BOLD_ON;
    receiptText += "TOTAL:";
    receiptText += " ".repeat(
      32 -
        "TOTAL:".length -
        (orderInfo.bills?.totalWithTax?.toFixed(2) || "0.00").length -
        1
    );
    receiptText += `₱${orderInfo.bills?.totalWithTax?.toFixed(2) || "0.00"}\n`;
    receiptText += thermalCommands.BOLD_OFF;

    receiptText += "=".repeat(32) + "\n\n";

    // Payment Info
    receiptText += thermalCommands.BOLD_ON;
    receiptText += `Payment: ${orderInfo.paymentMethod || "Cash"}\n`;
    receiptText += `Status: ${orderInfo.orderStatus || "In Progress"}\n`;
    receiptText += thermalCommands.BOLD_OFF;

    receiptText += "\n" + thermalCommands.ALIGN_CENTER;
    receiptText += "Thank you for your purchase!\n";
    receiptText += "Please come again!\n\n";

    // Add cash drawer command if requested
    if (includeDrawerCommand) {
      receiptText += thermalCommands.DRAWER_KICK_2;
    }

    // Feed and cut
    receiptText += thermalCommands.FEED_LINE;
    receiptText += thermalCommands.FEED_LINE;
    receiptText += thermalCommands.CUT;

    return receiptText;
  };

  const handleThermalPrint = () => {
    const receiptText = generateThermalText();

    // Remove ESC/POS commands for text display
    const cleanText = receiptText
      .replace(/\x1B\[[0-9;]*[A-Za-z]/g, "")
      .replace(/\x1B\x40/g, "")
      .replace(/\x1D\x56\x41\x10/g, "")
      .trim();

    const textBlob = new Blob([cleanText], { type: "text/plain" });
    const textUrl = URL.createObjectURL(textBlob);

    const textWindow = window.open(textUrl, "_blank");
    if (textWindow) {
      setTimeout(() => {
        textWindow.print();
        // Open cash drawer after thermal print
        openCashDrawer();
        setTimeout(() => {
          textWindow.close();
          URL.revokeObjectURL(textUrl);
        }, 100);
      }, 500);
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
            <FaCheck className="text-white text-base" />
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
                  {orderInfo.orderDate
                    ? Math.floor(new Date(orderInfo.orderDate).getTime())
                        .toString()
                        .slice(-6)
                    : "N/A"}
                </p>
              </div>
              <div>
                <span className="text-gray-600">Date:</span>
                <p className="font-medium">
                  {new Date(orderInfo.orderDate).toLocaleDateString()}
                </p>
              </div>
              <div className="col-span-2">
                <span className="text-gray-600">Customer:</span>
                <p className="font-medium truncate">
                  {orderInfo.customerDetails?.name || "Walk-in"}
                </p>
              </div>
            </div>
          </div>

          {/* Items Ordered */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <h3 className="font-semibold text-gray-700 text-sm mb-2">
              Items Ordered
            </h3>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {orderInfo.items?.map((item, index) => (
                <div
                  key={index}
                  className={`flex justify-between items-start p-2 rounded text-xs ${
                    item.isFree ? "bg-red-50 border border-red-200" : "bg-white"
                  }`}
                >
                  <div className="flex-1 pr-2">
                    <p className="font-medium truncate">
                      {item.name}
                      {item.isFree && (
                        <span className="ml-1 text-red-600 font-semibold">
                          (FREE)
                        </span>
                      )}
                    </p>
                    <p className="text-gray-600">
                      {item.quantity} × ₱{item.pricePerQuantity?.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right min-w-16">
                    <p
                      className={`font-semibold ${
                        item.isFree ? "text-red-600" : "text-gray-800"
                      }`}
                    >
                      {item.isFree
                        ? "FREE"
                        : `₱${(item.price * item.quantity).toFixed(2)}`}
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
                <span>₱{orderInfo.bills?.total?.toFixed(2) || "0.00"}</span>
              </div>

              {orderInfo.bills?.pwdSssDiscount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>PWD/SSS:</span>
                  <span>-₱{orderInfo.bills.pwdSssDiscount.toFixed(2)}</span>
                </div>
              )}

              {orderInfo.bills?.employeeDiscount > 0 && (
                <div className="flex justify-between text-yellow-600">
                  <span>Emp Disc:</span>
                  <span>-₱{orderInfo.bills.employeeDiscount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>VAT (12%):</span>
                <span>₱{orderInfo.bills?.tax?.toFixed(2) || "0.00"}</span>
              </div>

              <div className="border-t pt-2 mt-2 flex justify-between font-bold text-sm">
                <span>Total:</span>
                <span className="text-green-600">
                  ₱{orderInfo.bills?.totalWithTax?.toFixed(2) || "0.00"}
                </span>
              </div>
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
                  {orderInfo.orderStatus || "In Progress"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons - Mobile Optimized */}
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
                <FaBluetooth className="text-xs animate-pulse" />
              ) : isConnected ? (
                <FaUnlink className="text-xs" />
              ) : (
                <FaLink className="text-xs" />
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
              <FaCashRegister className="text-xs" />
              Open Drawer
            </button>
          </div>

          {/* Print Buttons */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 bg-blue-600 text-white px-3 py-3 rounded-lg hover:bg-blue-700 transition-colors text-xs font-semibold"
            >
              <FaPrint className="text-xs" />
              Print
            </button>

            <button
              onClick={printViaBluetooth}
              disabled={!isConnected}
              className={`flex items-center justify-center gap-2 px-3 py-3 rounded-lg transition-colors text-xs font-semibold ${
                isConnected
                  ? "bg-purple-600 text-white hover:bg-purple-700"
                  : "bg-gray-400 text-white cursor-not-allowed"
              }`}
            >
              <FaBluetooth className="text-xs" />
              Print via BT
            </button>

            <button
              onClick={handleThermalPrint}
              className="flex items-center justify-center gap-2 bg-green-600 text-white px-3 py-3 rounded-lg hover:bg-green-700 transition-colors text-xs font-semibold"
            >
              <FaReceipt className="text-xs" />
              Thermal
            </button>

            <button
              onClick={() => setShowInvoice(false)}
              className="flex items-center justify-center gap-2 bg-gray-600 text-white px-3 py-3 rounded-lg hover:bg-gray-700 transition-colors text-xs font-semibold"
            >
              <FaTimes className="text-xs" />
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Invoice;
