import React, { useEffect, useState } from "react";
import BottomNav from "../components/shared/BottomNav";
import {
  MdRestaurantMenu,
  MdAdd,
  MdClose,
  MdCheckCircle,
  MdPrint,
  MdBluetooth,
  MdBluetoothDisabled,
} from "react-icons/md";
import MenuContainer from "../components/menu/MenuContainer";
import CustomerInfo from "../components/menu/CustomerInfo";
import CartInfo from "../components/menu/CartInfo";
import Bill from "../components/menu/Bill";
import { useSelector, useDispatch } from "react-redux";
import {
  createNewOrder,
  switchOrder,
  closeOrder,
  loadOrdersFromStorage,
} from "../redux/slices/orderSlice";

const Menu = () => {
  useEffect(() => {
    document.title = "POS | Menu";

    // Load orders from localStorage on component mount
    dispatch(loadOrdersFromStorage());

    // Initialize Bluetooth printer
    initializeBluetooth();
  }, []);

  const dispatch = useDispatch();
  const { orders, activeOrderId, completedOrders } = useSelector(
    (state) => state.order
  );
  const [activeTab, setActiveTab] = useState("active");
  const [printingOrderId, setPrintingOrderId] = useState(null);
  const [bluetoothDevice, setBluetoothDevice] = useState(null);
  const [isBluetoothConnected, setIsBluetoothConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [printMethod, setPrintMethod] = useState("browser"); // "browser", "bluetooth", "clipboard"

  // Filter orders - only active and completed
  const activeOrders = orders.filter((order) => order.status === "active");

  // Initialize Bluetooth functionality
  const initializeBluetooth = () => {
    // Check if browser supports Web Bluetooth API
    if (navigator.bluetooth) {
      console.log("Web Bluetooth API is supported");

      // Check for saved Bluetooth device
      const savedDeviceId = localStorage.getItem("bluetoothDeviceId");
      if (savedDeviceId) {
        // Try to reconnect to saved device
        reconnectBluetoothDevice(savedDeviceId);
      }
    } else {
      console.warn("Web Bluetooth API not supported. Using fallback printing.");
    }
  };

  // Reconnect to previously paired Bluetooth device
  const reconnectBluetoothDevice = async (deviceId) => {
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ["000018f0-0000-1000-8000-00805f9b34fb"] }], // Common thermal printer service
      });

      if (device.id === deviceId) {
        const server = await device.gatt.connect();
        setBluetoothDevice(device);
        setIsBluetoothConnected(true);
        console.log("Reconnected to Bluetooth printer:", device.name);
      }
    } catch (error) {
      console.error("Failed to reconnect to Bluetooth device:", error);
      localStorage.removeItem("bluetoothDeviceId");
    }
  };

  // Connect to Bluetooth thermal printer
  const connectBluetoothPrinter = async () => {
    if (!navigator.bluetooth) {
      alert(
        "Bluetooth is not supported in your browser. Please use Chrome, Edge, or Opera."
      );
      return;
    }

    setIsConnecting(true);

    try {
      console.log("Requesting Bluetooth Device...");

      // Request Bluetooth device (thermal printers typically use these services)
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { namePrefix: "BT" }, // Common thermal printer naming pattern
          { namePrefix: "Blue" },
          { namePrefix: "Printer" },
          { namePrefix: "POS" },
        ],
        optionalServices: [
          "000018f0-0000-1000-8000-00805f9b34fb", // Common printer service
          "00001101-0000-1000-8000-00805f9b34fb", // Serial Port Profile (SPP)
          "00001800-0000-1000-8000-00805f9b34fb", // Generic Access
          "00001801-0000-1000-8000-00805f9b34fb", // Generic Attribute
        ],
      });

      console.log("Connecting to GATT Server...");
      const server = await device.gatt.connect();

      // Save device ID for reconnection
      localStorage.setItem("bluetoothDeviceId", device.id);

      setBluetoothDevice(device);
      setIsBluetoothConnected(true);
      setIsConnecting(false);

      console.log("Connected to Bluetooth device:", device.name);

      // Listen for device disconnection
      device.addEventListener("gattserverdisconnected", () => {
        console.log("Bluetooth device disconnected");
        setIsBluetoothConnected(false);
        setBluetoothDevice(null);
      });
    } catch (error) {
      setIsConnecting(false);
      console.error("Bluetooth connection error:", error);

      if (error.name === "NotFoundError") {
        alert(
          "No Bluetooth printer found. Please make sure your printer is turned on and in pairing mode."
        );
      } else if (error.name === "SecurityError") {
        alert(
          "Bluetooth permission denied. Please enable Bluetooth permissions in your browser settings."
        );
      } else {
        alert(`Bluetooth connection failed: ${error.message}`);
      }
    }
  };

  // Disconnect Bluetooth printer
  const disconnectBluetoothPrinter = () => {
    if (bluetoothDevice && bluetoothDevice.gatt.connected) {
      bluetoothDevice.gatt.disconnect();
    }
    setBluetoothDevice(null);
    setIsBluetoothConnected(false);
    localStorage.removeItem("bluetoothDeviceId");
  };

  // Send data to Bluetooth printer (ESC/POS commands)
  const sendToBluetoothPrinter = async (data) => {
    if (!bluetoothDevice || !isBluetoothConnected) {
      throw new Error("Bluetooth printer not connected");
    }

    try {
      const server = await bluetoothDevice.gatt.connect();

      // Try to find the printer service
      const services = await server.getPrimaryServices();
      let printerService = null;
      let printerCharacteristic = null;

      for (const service of services) {
        const characteristics = await service.getCharacteristics();
        for (const characteristic of characteristics) {
          // Look for write characteristic
          if (characteristic.properties.write) {
            printerService = service;
            printerCharacteristic = characteristic;
            break;
          }
        }
        if (printerCharacteristic) break;
      }

      if (!printerCharacteristic) {
        throw new Error("No writable characteristic found");
      }

      // Convert string to ArrayBuffer (ESC/POS commands)
      const encoder = new TextEncoder();
      const encodedData = encoder.encode(data);

      // Send data in chunks to avoid packet size issues
      const chunkSize = 20; // Adjust based on your printer
      for (let i = 0; i < encodedData.length; i += chunkSize) {
        const chunk = encodedData.slice(i, i + chunkSize);
        await printerCharacteristic.writeValue(chunk);
        // Small delay between chunks
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      console.log("Data sent to Bluetooth printer successfully");
      return true;
    } catch (error) {
      console.error("Error sending to Bluetooth printer:", error);
      setIsBluetoothConnected(false);
      throw error;
    }
  };

  // ESC/POS commands for thermal printer
  const escPosCommands = {
    // Initialize printer
    initialize: "\x1B\x40",

    // Text formatting
    alignLeft: "\x1B\x61\x00",
    alignCenter: "\x1B\x61\x01",
    alignRight: "\x1B\x61\x02",

    // Font size
    normalText: "\x1D\x21\x00",
    doubleHeight: "\x1D\x21\x01",
    doubleWidth: "\x1D\x21\x10",
    doubleSize: "\x1D\x21\x11",

    // Barcode
    barcodeHeight: "\x1D\x68\x64",
    barcodeWidth: "\x1D\x77\x03",
    barcodeTextBelow: "\x1D\x48\x02",

    // Cut paper (partial/full)
    cutPartial: "\x1D\x56\x41\x10",
    cutFull: "\x1D\x56\x42\x10",

    // Line feed
    lineFeed: "\x0A",
    multipleLineFeed: (lines) => `\x1B\x64${String.fromCharCode(lines)}`,
  };

  const handleAddNewOrder = () => {
    dispatch(createNewOrder());
    setActiveTab("active");
  };

  const handleSwitchOrder = (orderId) => {
    const order = orders.find((order) => order.id === orderId);
    if (order && order.status === "active") {
      dispatch(switchOrder(orderId));
      setActiveTab("active");
    }
  };

  const handleCloseOrder = (orderId, event) => {
    event.stopPropagation();
    if (activeOrders.length > 1) {
      dispatch(closeOrder(orderId));
    }
  };

  // Format currency using locale
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Format date using locale
  const formatDate = (date) => {
    return new Date(date).toLocaleString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  // Generate ESC/POS formatted receipt for thermal printer
  const generateEscPosReceipt = (order) => {
    let receipt = "";

    // Initialize printer
    receipt += escPosCommands.initialize;

    // Header - Center aligned, double size
    receipt += escPosCommands.alignCenter;
    receipt += escPosCommands.doubleSize;
    receipt += "DELISH RESTAURANT\n";
    receipt += escPosCommands.normalText;
    receipt += "===============================\n";

    // Order info
    receipt += escPosCommands.alignLeft;
    receipt += `Order: #${order.id?.slice(-8) || order.number}\n`;
    receipt += `Date: ${formatDate(order.completedAt || Date.now())}\n`;
    receipt += `Customer: ${order.customer?.customerName || "Walk-in"}\n`;
    receipt += "--------------------------------\n";

    // Items header
    receipt += escPosCommands.alignCenter;
    receipt += "ORDER ITEMS\n";
    receipt += escPosCommands.alignLeft;
    receipt += "--------------------------------\n";

    // Items
    order.items?.forEach((item) => {
      const itemName =
        item.name.length > 24 ? item.name.substring(0, 21) + "..." : item.name;
      const quantity = item.quantity || 1;
      const pricePerQuantity = item.pricePerQuantity || item.price || 0;
      const total = quantity * pricePerQuantity;

      receipt += `${itemName}\n`;
      receipt += `  ${quantity}x ${formatCurrency(pricePerQuantity)}\n`;
      receipt += `  ${formatCurrency(total)}${
        item.isRedeemed ? " (REDEEMED)" : ""
      }\n`;
      if (item.isPwdSssDiscounted) {
        receipt += "  PWD/SSS 20% Discount Applied\n";
      }
      receipt += "\n";
    });

    receipt += "--------------------------------\n";

    // Calculate totals
    const subtotal =
      order.items?.reduce((sum, item) => {
        return (
          sum +
          (item.quantity || 1) * (item.pricePerQuantity || item.price || 0)
        );
      }, 0) || 0;

    const vat = order.bills?.tax || subtotal * 0.12;
    const total = order.bills?.total || subtotal + vat;

    // Totals - Right aligned for better formatting
    receipt += escPosCommands.alignRight;
    receipt += `SUBTOTAL: ${formatCurrency(subtotal)}\n`;

    if (order.bills?.pwdSssDiscount > 0) {
      receipt += `PWD/SSS DISC: -${formatCurrency(
        order.bills.pwdSssDiscount
      )}\n`;
    }

    if (order.bills?.redemptionDiscount > 0) {
      receipt += `REDEMPTION: -${formatCurrency(
        order.bills.redemptionDiscount
      )}\n`;
    }

    if (order.bills?.employeeDiscount > 0) {
      receipt += `EMP DISC: -${formatCurrency(order.bills.employeeDiscount)}\n`;
    }

    if (order.bills?.shareholderDiscount > 0) {
      receipt += `SH DISC: -${formatCurrency(
        order.bills.shareholderDiscount
      )}\n`;
    }

    receipt += `VAT (12%): ${formatCurrency(vat)}\n`;
    receipt += "===============================\n";
    receipt += escPosCommands.doubleHeight;
    receipt += `TOTAL: ${formatCurrency(total)}\n`;
    receipt += escPosCommands.normalText;
    receipt += "===============================\n";

    // Payment info
    receipt += escPosCommands.alignLeft;
    receipt += `Payment: ${order.paymentMethod || "Cash"}\n`;
    receipt += "Status: COMPLETED\n";
    receipt += escPosCommands.lineFeed;
    receipt += "Thank you for dining with us!\n";
    receipt += "Visit us again soon!\n";
    receipt += escPosCommands.lineFeed;
    receipt += escPosCommands.lineFeed;
    receipt += escPosCommands.lineFeed;

    // Cut paper (partial cut)
    receipt += escPosCommands.cutPartial;

    return receipt;
  };

  // Print completed order receipt with selected method
  const handlePrintOrder = async (order, event) => {
    event.stopPropagation();
    setPrintingOrderId(order.id);

    try {
      let receiptText = "";

      if (printMethod === "bluetooth") {
        // Generate ESC/POS formatted receipt
        receiptText = generateEscPosReceipt(order);

        try {
          await sendToBluetoothPrinter(receiptText);
          alert("Receipt sent to Bluetooth printer successfully!");
        } catch (error) {
          console.error(
            "Bluetooth print failed, falling back to browser print:",
            error
          );
          // Fallback to browser print
          receiptText = generateReceiptText(order);
          printUsingBrowser(receiptText);
        }
      } else if (printMethod === "browser") {
        // Regular browser print
        receiptText = generateReceiptText(order);
        printUsingBrowser(receiptText);
      } else {
        // Clipboard fallback
        receiptText = generateReceiptText(order);
        copyToClipboard(receiptText);
      }
    } catch (error) {
      console.error("Printing error:", error);
      alert(`Failed to print receipt: ${error.message}`);
    } finally {
      setTimeout(() => setPrintingOrderId(null), 1000);
    }
  };

  // Browser print function
  const printUsingBrowser = (receiptText) => {
    const printWindow = window.open("", "_blank", "width=400,height=600");
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - Order ${printingOrderId}</title>
        <style>
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.4;
            margin: 0;
            padding: 10px;
            white-space: pre-wrap;
            word-wrap: break-word;
          }
          @media print {
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <pre>${receiptText}</pre>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() {
              window.close();
            }, 500);
          }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Copy to clipboard function
  const copyToClipboard = (text) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    document.body.appendChild(textArea);
    textArea.select();

    try {
      document.execCommand("copy");
      alert(
        "Receipt copied to clipboard. You can paste it into any text editor or print dialog."
      );
    } catch (err) {
      console.error("Failed to copy:", err);
      alert(
        "Failed to copy receipt to clipboard. Please try printing using another method."
      );
    }

    document.body.removeChild(textArea);
  };

  // Original text receipt generator (unchanged)
  const generateReceiptText = (order) => {
    const lineBreak = "\n";
    const dashedLine = "--------------------------------";
    const doubleLine = "===============================";

    let receipt = "";

    // Header
    receipt += doubleLine + lineBreak;
    receipt += "      DELISH RESTAURANT" + lineBreak;
    receipt += doubleLine + lineBreak;
    receipt += `Order: #${order.id?.slice(-8) || order.number}` + lineBreak;
    receipt +=
      `Date: ${formatDate(order.completedAt || Date.now())}` + lineBreak;
    receipt +=
      `Customer: ${order.customer?.customerName || "Walk-in"}` + lineBreak;
    receipt += dashedLine + lineBreak;

    // Items
    receipt += "           ORDER ITEMS" + lineBreak;
    receipt += dashedLine + lineBreak;

    order.items?.forEach((item, index) => {
      const itemName =
        item.name.length > 20 ? item.name.substring(0, 17) + "..." : item.name;
      const quantity = item.quantity || 1;
      const pricePerQuantity = item.pricePerQuantity || item.price || 0;
      const total = quantity * pricePerQuantity;

      receipt += `${itemName}` + lineBreak;
      receipt +=
        `  ${quantity}x ${formatCurrency(pricePerQuantity)}` + lineBreak;
      receipt +=
        `  ${formatCurrency(total)}${item.isRedeemed ? " (REDEEMED)" : ""}` +
        lineBreak;
      if (item.isPwdSssDiscounted) {
        receipt += `  PWD/SSS 20% Discount Applied` + lineBreak;
      }
      receipt += lineBreak;
    });

    receipt += dashedLine + lineBreak;

    // Calculate totals
    const subtotal =
      order.items?.reduce((sum, item) => {
        return (
          sum +
          (item.quantity || 1) * (item.pricePerQuantity || item.price || 0)
        );
      }, 0) || 0;

    const vat = order.bills?.tax || subtotal * 0.12;
    const total = order.bills?.total || subtotal + vat;

    // Totals
    receipt +=
      "SUBTOTAL:" + `${formatCurrency(subtotal)}`.padStart(20) + lineBreak;

    if (order.bills?.pwdSssDiscount > 0) {
      receipt +=
        "PWD/SSS DISC:" +
        `-${formatCurrency(order.bills.pwdSssDiscount)}`.padStart(17) +
        lineBreak;
    }

    if (order.bills?.redemptionDiscount > 0) {
      receipt +=
        "REDEMPTION:" +
        `-${formatCurrency(order.bills.redemptionDiscount)}`.padStart(19) +
        lineBreak;
    }

    if (order.bills?.employeeDiscount > 0) {
      receipt +=
        "EMP DISCOUNT:" +
        `-${formatCurrency(order.bills.employeeDiscount)}`.padStart(17) +
        lineBreak;
    }

    if (order.bills?.shareholderDiscount > 0) {
      receipt +=
        "SH DISCOUNT:" +
        `-${formatCurrency(order.bills.shareholderDiscount)}`.padStart(18) +
        lineBreak;
    }

    receipt += "VAT (12%):" + `${formatCurrency(vat)}`.padStart(20) + lineBreak;
    receipt += doubleLine + lineBreak;
    receipt += "TOTAL:" + `${formatCurrency(total)}`.padStart(24) + lineBreak;
    receipt += doubleLine + lineBreak;

    receipt += `Payment: ${order.paymentMethod || "Cash"}` + lineBreak;
    receipt += "Status: COMPLETED" + lineBreak;
    receipt += lineBreak;
    receipt += "Thank you for dining with us!" + lineBreak;
    receipt += "Visit us again soon!" + lineBreak;
    receipt += lineBreak;
    receipt += lineBreak;
    receipt += lineBreak; // Extra lines for paper cut

    return receipt;
  };

  // Calculate total amount for display
  const calculateTotalAmount = (order) => {
    if (order.bills?.total) {
      return formatCurrency(order.bills.total);
    }

    const total =
      order.items?.reduce((sum, item) => {
        return (
          sum +
          (item.quantity || 1) * (item.pricePerQuantity || item.price || 0)
        );
      }, 0) || 0;

    return formatCurrency(total);
  };

  return (
    <section className="bg-white min-h-screen flex flex-col">
      {/* Bluetooth Connection Status */}
      <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isBluetoothConnected ? (
            <>
              <MdBluetooth className="text-blue-600" />
              <span className="text-sm text-blue-700">
                Connected to: {bluetoothDevice?.name || "Bluetooth Printer"}
              </span>
            </>
          ) : (
            <>
              <MdBluetoothDisabled className="text-gray-400" />
              <span className="text-sm text-gray-600">
                Bluetooth Printer Not Connected
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={printMethod}
            onChange={(e) => setPrintMethod(e.target.value)}
            className="text-sm border border-gray-300 rounded px-2 py-1 bg-white"
          >
            <option value="browser">Browser Print</option>
            <option value="bluetooth">Bluetooth Printer</option>
            <option value="clipboard">Copy to Clipboard</option>
          </select>

          {!isBluetoothConnected ? (
            <button
              onClick={connectBluetoothPrinter}
              disabled={isConnecting}
              className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {isConnecting ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <MdBluetooth size={14} />
                  <span>Connect Printer</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={disconnectBluetoothPrinter}
              className="flex items-center gap-1 bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
            >
              <MdBluetoothDisabled size={14} />
              <span>Disconnect</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Tabs */}
      <div className="bg-gray-200 px-3 pt-3 flex items-center gap-2 overflow-x-auto border-b">
        <button
          onClick={() => setActiveTab("active")}
          className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-colors ${
            activeTab === "active"
              ? "bg-white text-blue-600 border-t border-l border-r border-gray-300"
              : "bg-gray-300 text-gray-600 hover:bg-gray-250"
          }`}
        >
          Active Orders ({activeOrders.length})
        </button>

        <button
          onClick={() => setActiveTab("completed")}
          className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-colors ${
            activeTab === "completed"
              ? "bg-white text-green-600 border-t border-l border-r border-gray-300"
              : "bg-gray-300 text-gray-600 hover:bg-gray-250"
          }`}
        >
          Completed ({completedOrders.length})
        </button>
      </div>

      {/* Order Tabs - Only show for active orders */}
      {activeTab === "active" && (
        <div className="bg-gray-200 px-3 pb-1 flex items-center gap-2 overflow-x-auto">
          {activeOrders.map((order) => (
            <div
              key={order.id}
              className={`flex items-center gap-2 px-3 py-2 rounded-t-lg cursor-pointer transition-colors min-w-0 flex-shrink-0 ${
                order.id === activeOrderId
                  ? "bg-white border-t border-l border-r border-gray-300 shadow-sm"
                  : "bg-gray-300 hover:bg-gray-250"
              } ${
                order.items.length > 0 ? "border-l-4 border-l-green-500" : ""
              }`}
              onClick={() => handleSwitchOrder(order.id)}
            >
              <span className="text-sm font-medium whitespace-nowrap">
                Order {order.number}
              </span>
              {order.items.length > 0 && (
                <span className="bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                  {order.items.reduce(
                    (total, item) => total + item.quantity,
                    0
                  )}
                </span>
              )}
              {activeOrders.length > 1 && (
                <button
                  onClick={(e) => handleCloseOrder(order.id, e)}
                  className="text-gray-500 hover:text-red-500 transition-colors flex-shrink-0"
                  title="Close Order"
                >
                  <MdClose size={16} />
                </button>
              )}
            </div>
          ))}

          {/* Add New Order Button */}
          <button
            onClick={handleAddNewOrder}
            className="flex items-center gap-1 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex-shrink-0"
          >
            <MdAdd size={18} />
            <span className="text-sm whitespace-nowrap">New Order</span>
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-col lg:flex-row gap-3 p-3 pb-20 lg:pb-3">
        {activeTab === "active" ? (
          activeOrders.length === 0 ? (
            // No active orders state
            <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 rounded-lg p-8">
              <div className="text-center">
                <MdRestaurantMenu className="text-gray-300 text-6xl mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">
                  No Active Orders
                </h3>
                <p className="text-gray-500 mb-6">
                  Create a new order to get started
                </p>
                <button
                  onClick={handleAddNewOrder}
                  className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors font-semibold"
                >
                  Create New Order
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Left Div - Menu Section */}
              <div className="flex-1 lg:flex-[3] flex flex-col min-h-0 order-1">
                <div className="flex-1 min-h-0 overflow-hidden">
                  <MenuContainer orderId={activeOrderId} />
                </div>
              </div>

              {/* Right Div - Sidebar */}
              <div className="flex-1 lg:flex-[1] bg-gray-100 rounded-lg shadow-md mt-3 lg:mt-0 h-auto lg:h-[calc(100vh-13rem)] flex flex-col order-2">
                {/* Customer Info */}
                <div className="flex-shrink-0">
                  <CustomerInfo orderId={activeOrderId} />
                </div>

                <hr className="border-gray-300 border-t-2" />

                {/* Cart Info with scroll */}
                <div className="flex-1 min-h-0 overflow-hidden">
                  <CartInfo orderId={activeOrderId} />
                </div>

                <hr className="border-gray-300 border-t-2" />

                {/* Bills - Fixed at bottom */}
                <div className="flex-shrink-0">
                  <Bill orderId={activeOrderId} />
                </div>
              </div>
            </>
          )
        ) : (
          /* Completed Orders View */
          <div className="flex-1 bg-white rounded-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                Completed Orders
              </h2>
              <div className="flex items-center gap-4">
                {completedOrders.length > 0 && (
                  <span className="bg-green-100 text-green-800 text-sm font-medium px-3 py-1 rounded-full">
                    {completedOrders.length} orders
                  </span>
                )}
                <div className="text-sm text-gray-600">
                  Print Method:{" "}
                  <span className="font-medium capitalize">{printMethod}</span>
                </div>
              </div>
            </div>

            {completedOrders.length === 0 ? (
              <div className="text-center py-12">
                <MdCheckCircle className="text-gray-300 text-6xl mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No completed orders yet</p>
                <p className="text-gray-400 text-sm mt-2">
                  Completed orders will appear here after they are placed
                </p>
                <button
                  onClick={() => setActiveTab("active")}
                  className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Go to Active Orders
                </button>
              </div>
            ) : (
              <div className="space-y-4 max-h-[calc(100vh-16rem)] overflow-y-auto">
                {completedOrders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-green-50 border border-green-200 rounded-lg p-4 hover:bg-green-100 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-green-800 text-lg">
                          Order {order.number}
                        </h3>
                        <p className="text-green-700 font-medium">
                          {order.customer?.customerName || "Walk-in Customer"}
                        </p>
                        <p className="text-green-600 text-sm mt-1">
                          Completed:{" "}
                          {order.completedAt
                            ? formatDate(order.completedAt)
                            : "N/A"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => handlePrintOrder(order, e)}
                          disabled={printingOrderId === order.id}
                          className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title={`Print using ${printMethod}`}
                        >
                          {printingOrderId === order.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          ) : (
                            <MdPrint size={20} />
                          )}
                        </button>
                        <MdCheckCircle className="text-green-500 text-2xl flex-shrink-0" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-green-700 text-sm">
                      <div>
                        <p className="font-medium">Items</p>
                        <p>{order.items?.length || 0} items</p>
                      </div>
                      <div>
                        <p className="font-medium">Total Amount</p>
                        <p className="font-bold">
                          {calculateTotalAmount(order)}
                        </p>
                      </div>
                      {order.paymentMethod && (
                        <div className="col-span-2">
                          <p className="font-medium">Payment Method</p>
                          <p className="font-bold">{order.paymentMethod}</p>
                        </div>
                      )}
                    </div>

                    {order.items && order.items.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-green-200">
                        <p className="text-green-600 text-sm font-medium mb-2">
                          Items Ordered:
                        </p>
                        <div className="space-y-1">
                          {order.items.slice(0, 3).map((item, index) => (
                            <div
                              key={index}
                              className="flex justify-between text-green-700 text-xs"
                            >
                              <span>
                                {item.quantity}x {item.name}
                                {item.isRedeemed && (
                                  <span className="ml-1 text-blue-600">
                                    (Redeemed)
                                  </span>
                                )}
                                {item.isPwdSssDiscounted && (
                                  <span className="ml-1 text-green-600">
                                    (PWD/SSS 20% off)
                                  </span>
                                )}
                              </span>
                              <span>
                                {formatCurrency(
                                  (item.quantity || 1) *
                                    (item.pricePerQuantity || item.price || 0)
                                )}
                              </span>
                            </div>
                          ))}
                          {order.items.length > 3 && (
                            <p className="text-green-600 text-xs">
                              +{order.items.length - 3} more items
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Show discounts if available */}
                    {order.bills && (
                      <div className="mt-3 pt-3 border-t border-green-200">
                        <p className="text-green-600 text-sm font-medium mb-2">
                          Discounts Applied:
                        </p>
                        <div className="space-y-1 text-green-700 text-xs">
                          {order.bills.pwdSssDiscount > 0 && (
                            <div className="flex justify-between">
                              <span>PWD/SSS Discount:</span>
                              <span className="text-red-600">
                                -{formatCurrency(order.bills.pwdSssDiscount)}
                              </span>
                            </div>
                          )}
                          {order.bills.redemptionDiscount > 0 && (
                            <div className="flex justify-between">
                              <span>Redemption Discount:</span>
                              <span className="text-red-600">
                                -
                                {formatCurrency(order.bills.redemptionDiscount)}
                              </span>
                            </div>
                          )}
                          {order.bills.employeeDiscount > 0 && (
                            <div className="flex justify-between">
                              <span>Employee Discount:</span>
                              <span className="text-red-600">
                                -{formatCurrency(order.bills.employeeDiscount)}
                              </span>
                            </div>
                          )}
                          {order.bills.shareholderDiscount > 0 && (
                            <div className="flex justify-between">
                              <span>Shareholder Discount:</span>
                              <span className="text-red-600">
                                -
                                {formatCurrency(
                                  order.bills.shareholderDiscount
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <BottomNav />
      </div>
    </section>
  );
};

export default Menu;
