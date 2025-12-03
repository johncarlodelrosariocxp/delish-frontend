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
    <path d="M470.6 105.4c12.5 12.5 12.5 32.8 0 45.3l-256 256c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L192 338.7 425.4 105.4c12.5-12.5 32.8-12.5 45.3 0z" />
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

const Invoice = ({ orderInfo, setShowInvoice }) => {
  const invoiceRef = useRef(null);
  const [bluetoothDevice, setBluetoothDevice] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Thermal printer ESC/POS commands
  const thermalCommands = {
    INIT: "\x1B\x40", // Initialize printer
    ALIGN_LEFT: "\x1B\x61\x00", // Left alignment
    ALIGN_CENTER: "\x1B\x61\x01", // Center alignment
    ALIGN_RIGHT: "\x1B\x61\x02", // Right alignment
    BOLD_ON: "\x1B\x45\x01", // Bold on
    BOLD_OFF: "\x1B\x45\x00", // Bold off
    CUT: "\x1D\x56\x41\x10", // Full cut
    FEED_LINE: "\x0A", // Feed line (LF)
    TEXT_NORMAL: "\x1B\x21\x00", // Normal text
    TEXT_LARGE: "\x1B\x21\x10", // Double height
    // Cash drawer commands (POS58D_UB specific)
    DRAWER_KICK_2: "\x1B\x70\x00\x19\xFA", // Kick drawer pin 2
    DRAWER_KICK_5: "\x1B\x70\x01\x19\xFA", // Kick drawer pin 5
  };

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  const alertUser = (message) => {
    setErrorMessage(message);
  };

  // Connect to Bluetooth printer
  const connectBluetooth = async () => {
    if (!navigator.bluetooth) {
      alertUser(
        "Bluetooth is not supported in this browser. Please use Chrome/Edge on Desktop or Chrome/Samsung Internet on Android."
      );
      return;
    }

    try {
      setIsConnecting(true);
      console.log("Searching for Bluetooth printer...");

      // Common UUIDs for thermal printers
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
          "No writable characteristic found in common services. Printer uses a non-standard protocol."
        );
      }

      setBluetoothDevice({ device, server, writeCharacteristic });
      setIsConnected(true);
      setIsConnecting(false);
      alertUser(`Successfully connected to Bluetooth printer: ${device.name}!`);

      // Handle device disconnection
      device.addEventListener("gattserverdisconnected", () => {
        setIsConnected(false);
        setBluetoothDevice(null);
        alertUser("Bluetooth device disconnected.");
        console.log("Bluetooth device disconnected");
      });
    } catch (error) {
      setIsConnecting(false);
      console.error("Bluetooth connection failed:", error);

      if (error.name === "NotFoundError") {
        alertUser(
          "Connection cancelled or no device found. Ensure the printer is ON and unpaired from OS settings."
        );
      } else if (error.name === "NetworkError") {
        alertUser(
          "Connection failed (NetworkError). Check printer range and ensure no other app is connected."
        );
      } else if (error.name === "SecurityError") {
        alertUser(
          "Security error. Please ensure the page is served over HTTPS."
        );
      } else {
        alertUser(`Connection failed: ${error.message}`);
      }
    }
  };

  // Disconnect from Bluetooth printer
  const disconnectBluetooth = () => {
    if (bluetoothDevice) {
      try {
        bluetoothDevice.device.gatt.disconnect();
        setIsConnected(false);
        setBluetoothDevice(null);
        alertUser("Disconnected from Bluetooth printer.");
      } catch (error) {
        console.error("Error disconnecting:", error);
      }
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
    } catch (error) {
      console.error("Bluetooth drawer command failed:", error);
      throw error;
    }
  };

  // Function to open cash drawer
  const openCashDrawer = async () => {
    try {
      console.log("Attempting to open cash drawer...");

      if (bluetoothDevice && isConnected) {
        await sendDrawerCommandViaBluetooth();
        alertUser("Cash drawer opened successfully!");
      } else {
        // If not connected, try to connect first
        alertUser(
          "Not connected to printer. Please connect to Bluetooth first or open drawer manually."
        );
      }
    } catch (error) {
      console.error("Failed to open cash drawer:", error);
      alertUser(
        "Failed to send drawer command. Please open the cash drawer manually."
      );
    }
  };

  // Print via Bluetooth
  const printViaBluetooth = async () => {
    try {
      if (!bluetoothDevice || !isConnected) {
        alertUser("Please connect to Bluetooth printer first.");
        return;
      }

      // Generate receipt *with* the drawer command included (true)
      const receiptText = generateThermalText(true);

      const encoder = new TextEncoder();
      const data = encoder.encode(receiptText);

      console.log("Sending data to printer (including drawer kick)...");
      // Split the data into chunks (e.g., 20 bytes) to prevent overflow on some printers
      const chunkSize = 20;
      for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        await bluetoothDevice.writeCharacteristic.writeValue(chunk);
      }

      console.log("Print job sent successfully!");
      alertUser("Receipt printed successfully! Cash drawer should open.");
    } catch (error) {
      console.error("Bluetooth printing failed:", error);
      alertUser(`Printing error: ${error.message}. Please try again.`);
    }
  };

  // Print via Web Print API (HTML)
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
                width: 80mm !important; /* Standard thermal width */
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
                        .toString()
                        .slice(-6)
                    : "N/A"
                }</td></tr>
                <tr><td><strong>Customer:</strong></td><td>${
                  orderInfo.customerDetails?.name || "Walk-in Customer"
                }</td></tr>
                <tr><td><strong>Cashier:</strong></td><td>${
                  orderInfo.cashier || "Admin"
                }</td></tr>
                <tr><td><strong>Date:</strong></td><td>${new Date(
                  orderInfo.orderDate || Date.now()
                ).toLocaleString()}</td></tr>
              </table>
            </div>
            
            ${
              orderInfo.pwdSssDetails
                ? `
            <div class="border-top">
              <table width="100%">
                <tr><td><strong>PWD/SSS Details:</strong></td></tr>
                <tr><td>Type: ${orderInfo.pwdSssDetails.type}</td></tr>
                <tr><td>Name: ${orderInfo.pwdSssDetails.name}</td></tr>
                <tr><td>ID: ${orderInfo.pwdSssDetails.idNumber}</td></tr>
              </table>
            </div>
            `
                : ""
            }
            
            <div class="border-top">
              <div class="text-bold">ORDER ITEMS</div>
              <table class="items-table">
                ${(orderInfo.items || [])
                  .map(
                    (item) => `
                  <tr>
                    <td>${item.name}${item.isFree ? " (FREE)" : ""} x${
                      item.quantity || 1
                    }</td>
                    <td class="text-right">₱${(
                      (item.price || 0) * (item.quantity || 1)
                    ).toFixed(2)}</td>
                  </tr>
                `
                  )
                  .join("")}
              </table>
            </div>
            
            <div class="border-top">
              <table width="100%">
                <tr><td>Subtotal:</td><td class="text-right">₱${(
                  orderInfo.bills?.total || 0
                ).toFixed(2)}</td></tr>
                ${
                  orderInfo.bills?.pwdSssDiscount > 0
                    ? `<tr><td class="discount-item">PWD/SSS Discount:</td><td class="text-right discount-item">-₱${(
                        orderInfo.bills.pwdSssDiscount || 0
                      ).toFixed(2)}</td></tr>`
                    : ""
                }
                ${
                  orderInfo.bills?.employeeDiscount > 0
                    ? `<tr><td class="discount-item">Employee Discount:</td><td class="text-right discount-item">-₱${(
                        orderInfo.bills.employeeDiscount || 0
                      ).toFixed(2)}</td></tr>`
                    : ""
                }
                <tr><td>VAT (12%):</td><td class="text-right">₱${(
                  orderInfo.bills?.tax || 0
                ).toFixed(2)}</td></tr>
                <tr class="text-bold">
                  <td>TOTAL:</td>
                  <td class="text-right">₱${(
                    orderInfo.bills?.totalWithTax || 0
                  ).toFixed(2)}</td>
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
      alertUser("Please allow popups for printing");
      return;
    }

    printWindow.document.write(printContent);
    printWindow.document.close();

    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.onafterprint = () => {
          // Attempt to open cash drawer after the browser print dialog closes
          openCashDrawer();
          setTimeout(() => printWindow.close(), 100);
        };
      }, 250);
    };
  };

  const generateThermalText = (includeDrawerCommand = false) => {
    const LINE_WIDTH = 32;
    const orderId = orderInfo.orderDate
      ? Math.floor(new Date(orderInfo.orderDate).getTime()).toString().slice(-6)
      : "N/A";

    const customerName = orderInfo.customerDetails?.name || "Walk-in Customer";
    const cashierName = orderInfo.cashier || "Admin";
    const orderDate = new Date(
      orderInfo.orderDate || Date.now()
    ).toLocaleString();

    let receiptText = thermalCommands.INIT;

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
    receiptText += `Customer: ${customerName}\n`;
    receiptText += `Cashier: ${cashierName}\n`;
    receiptText += `Date: ${orderDate}\n`;
    receiptText += thermalCommands.BOLD_OFF;
    receiptText += "=".repeat(LINE_WIDTH) + "\n\n";

    // PWD/SSS Details if available
    if (orderInfo.pwdSssDetails) {
      receiptText += thermalCommands.BOLD_ON;
      receiptText += `PWD/SSS DETAILS:\n`;
      receiptText += thermalCommands.BOLD_OFF;
      receiptText += `Type: ${orderInfo.pwdSssDetails.type}\n`;
      receiptText += `Name: ${orderInfo.pwdSssDetails.name}\n`;
      receiptText += `ID: ${orderInfo.pwdSssDetails.idNumber}\n`;
      receiptText += "-".repeat(LINE_WIDTH) + "\n\n";
    }

    // Items
    receiptText += thermalCommands.BOLD_ON;
    receiptText += "ORDER ITEMS:\n";
    receiptText += thermalCommands.BOLD_OFF;

    (orderInfo.items || []).forEach((item) => {
      const itemQuantity = item.quantity || 1;
      const itemPrice = item.price || 0;
      const isFree = item.isFree;

      const itemName =
        item.name && item.name.length > 17
          ? item.name.substring(0, 14) + "..."
          : item.name || "Item";

      const lineStart = `${itemName} x${itemQuantity}`;
      const priceString = isFree
        ? "FREE"
        : `₱${(itemPrice * itemQuantity).toFixed(2)}`;

      receiptText += lineStart;
      receiptText += " ".repeat(
        Math.max(1, LINE_WIDTH - lineStart.length - priceString.length)
      );
      receiptText += priceString + "\n";
    });

    receiptText += "\n" + "=".repeat(LINE_WIDTH) + "\n";

    // Bill Summary
    const subtotal = orderInfo.bills?.total || 0;
    const pwdDiscount = orderInfo.bills?.pwdSssDiscount || 0;
    const empDiscount = orderInfo.bills?.employeeDiscount || 0;
    const tax = orderInfo.bills?.tax || 0;
    const total = orderInfo.bills?.totalWithTax || 0;

    const billItems = [
      { label: "Subtotal:", value: subtotal, isDiscount: false },
      { label: "PWD/SSS Discount:", value: pwdDiscount, isDiscount: true },
      { label: "Employee Discount:", value: empDiscount, isDiscount: true },
      { label: "VAT (12%):", value: tax, isDiscount: false },
    ];

    billItems.forEach(({ label, value, isDiscount }) => {
      if (value > 0 || label === "Subtotal:" || label === "VAT (12%):") {
        const displayValue = isDiscount
          ? `-₱${value.toFixed(2)}`
          : `₱${value.toFixed(2)}`;
        const spacing = " ".repeat(
          Math.max(1, LINE_WIDTH - label.length - displayValue.length)
        );
        if (isDiscount) {
          receiptText += `${label.padEnd(
            LINE_WIDTH - displayValue.length,
            " "
          )}${displayValue}\n`;
        } else {
          receiptText += `${label}${spacing}${displayValue}\n`;
        }
      }
    });

    receiptText += thermalCommands.BOLD_ON;
    const totalLabel = "TOTAL:";
    const totalDisplayValue = `₱${total.toFixed(2)}`;
    const totalSpacing = " ".repeat(
      Math.max(1, LINE_WIDTH - totalLabel.length - totalDisplayValue.length)
    );
    receiptText += `${totalLabel}${totalSpacing}${totalDisplayValue}\n`;
    receiptText += thermalCommands.BOLD_OFF;

    receiptText += "=".repeat(LINE_WIDTH) + "\n\n";

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
      .replace(/[\x00-\x1F\x7F-\x9F]/g, (char) => {
        return char === "\x0A" ? "\n" : "";
      })
      .trim();

    const textBlob = new Blob([cleanText], { type: "text/plain" });
    const textUrl = URL.createObjectURL(textBlob);

    const textWindow = window.open(textUrl, "_blank");
    if (textWindow) {
      textWindow.document.write(
        `<pre style="font-family: 'Courier New', monospace; font-size: 10px; line-height: 1.1;">${cleanText}</pre>`
      );
      textWindow.document.close();

      textWindow.onload = () => {
        setTimeout(() => {
          textWindow.print();
          // Open cash drawer after thermal print
          openCashDrawer();
          setTimeout(() => {
            textWindow.close();
            URL.revokeObjectURL(textUrl);
          }, 100);
        }, 500);
      };
    } else {
      alertUser("Please allow popups to open the text print preview.");
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
                  {new Date(
                    orderInfo.orderDate || Date.now()
                  ).toLocaleDateString()}
                </p>
              </div>
              <div className="col-span-2">
                <span className="text-gray-600">Customer:</span>
                <p className="font-medium truncate">
                  {orderInfo.customerDetails?.name || "Walk-in"}
                </p>
              </div>
              <div className="col-span-2">
                <span className="text-gray-600">Cashier:</span>
                <p className="font-medium truncate text-green-600">
                  {orderInfo.cashier || "Admin"}
                </p>
              </div>
            </div>
          </div>

          {/* PWD/SSS Details */}
          {orderInfo.pwdSssDetails && (
            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
              <h3 className="font-semibold text-green-700 text-sm mb-2 flex items-center gap-2">
                <IconIdCard className="w-4 h-4" />
                PWD/SSS Details
              </h3>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Type:</span>
                  <span className="font-medium text-green-700">
                    {orderInfo.pwdSssDetails.type}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Name:</span>
                  <span className="font-medium truncate">
                    {orderInfo.pwdSssDetails.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">ID Number:</span>
                  <span className="font-medium">
                    {orderInfo.pwdSssDetails.idNumber}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Items Ordered */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <h3 className="font-semibold text-gray-700 text-sm mb-2">
              Items Ordered
            </h3>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {(orderInfo.items || []).map((item, index) => (
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
                      {item.isPwdSssDiscounted && (
                        <span className="ml-1 text-green-600 font-semibold">
                          (PWD/SSS -20%)
                        </span>
                      )}
                    </p>
                    <p className="text-gray-600">
                      {item.quantity || 1} × ₱
                      {(item.pricePerQuantity || item.price || 0).toFixed(2)}
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
                        : `₱${(
                            (item.price || 0) * (item.quantity || 1)
                          ).toFixed(2)}`}
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
                <span>₱{(orderInfo.bills?.total || 0).toFixed(2)}</span>
              </div>

              {(orderInfo.bills?.pwdSssDiscount || 0) > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>PWD/SSS:</span>
                  <span>
                    -₱{(orderInfo.bills.pwdSssDiscount || 0).toFixed(2)}
                  </span>
                </div>
              )}

              {(orderInfo.bills?.employeeDiscount || 0) > 0 && (
                <div className="flex justify-between text-yellow-600">
                  <span>Emp Disc:</span>
                  <span>
                    -₱{(orderInfo.bills.employeeDiscount || 0).toFixed(2)}
                  </span>
                </div>
              )}

              <div className="flex justify-between">
                <span>VAT (12%):</span>
                <span>₱{(orderInfo.bills?.tax || 0).toFixed(2)}</span>
              </div>

              <div className="border-t pt-2 mt-2 flex justify-between font-bold text-sm">
                <span>Total:</span>
                <span className="text-green-600">
                  ₱{(orderInfo.bills?.totalWithTax || 0).toFixed(2)}
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
              disabled={!isConnected}
              className={`flex items-center justify-center gap-2 px-2 py-3 rounded-lg transition-colors text-xs font-semibold ${
                isConnected
                  ? "bg-purple-600 text-white hover:bg-purple-700"
                  : "bg-gray-400 text-white cursor-not-allowed"
              }`}
            >
              <IconBluetooth className="text-xs w-4 h-4" />
              BT Print
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

export default Invoice;
