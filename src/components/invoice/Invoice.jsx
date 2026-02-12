import React, { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useBluetooth } from "../../contexts/BluetoothContext";

// Icon components
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

const safeNumber = (value) => {
  const num = Number(value);
  return isNaN(num) ? 0 : num;
};

const getFirstName = (fullName) => {
  if (!fullName) return "";
  const firstName = fullName.split(" ")[0];
  return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
};

const Invoice = ({ orderInfo, setShowInvoice, disableAutoPrint = false }) => {
  const invoiceRef = useRef(null);

  // Get Bluetooth from context
  const {
    isConnected,
    isConnecting,
    printerName,
    connectionStatus,
    connectBluetooth,
    disconnectBluetooth,
    printReceipt,
    openCashDrawer,
    thermalCommands,
  } = useBluetooth();

  const [isPrinting, setIsPrinting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [hasAutoPrinted, setHasAutoPrinted] = useState(false);
  const [hasAutoPrintAttempted, setHasAutoPrintAttempted] = useState(false);

  // AUTO-SHOW INVOICE WHEN orderInfo CHANGES
  useEffect(() => {
    if (orderInfo && orderInfo._id) {
      console.log("🔄 Invoice auto-show triggered for order:", orderInfo._id);
    }
  }, [orderInfo]);

  // Generate receipt text for thermal printer - EXACT MATCH to original design
  const generateThermalText = () => {
    const orderNumber =
      orderInfo._id?.slice(-8) ||
      (orderInfo.orderNumber) ||
      (orderInfo.orderDate
        ? Math.floor(new Date(orderInfo.orderDate).getTime())
            .toString()
            .slice(-6)
        : "N/A");

    const cashier = getFirstName(orderInfo.cashier || "Admin");
    
    // Format date and time
    const now = new Date();
    const formattedDate = now.toLocaleDateString("en-PH", {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    }).replace(/\//g, '/');
    
    const formattedTime = now.toLocaleTimeString("en-PH", {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    const customerName = orderInfo.customerDetails?.name || 
                        (orderInfo.customerType === "walk-in" ? "Walk-in Customer" : "Take-out Customer") ||
                        "Walk-in Customer";

    let receiptText = thermalCommands.INIT;

    // Header - Store Name with Bold
    receiptText += "\x1B\x45\x01"; // Bold on
    receiptText += "DELISH CHEESECAKE CAFE\n";
    receiptText += "\x1B\x45\x00"; // Bold off
    
    // Order Slip
    receiptText += "  Order Slip\n";
    receiptText += "\n";
    
    // Order details - Left align
    receiptText += "\x1B\x61\x00"; // Left align
    receiptText += `Order# ${orderNumber}\n`;
    receiptText += `Date ${formattedDate}\n`;
    receiptText += `Time ${formattedTime}\n`;
    receiptText += `Cashier ${cashier}\n`;
    receiptText += `Customer name ${customerName}\n`;
    receiptText += "--------------------------------\n";
    
    // Items header - Quantity full view, Amount in PHP
    receiptText += "Quantity \n";
    receiptText += "Amount \n";
    receiptText += "--------------------------------\n";
    
    // Items
    (orderInfo.items || []).forEach((item) => {
      const quantity = (item.quantity || 1).toString();
      const price = `PHP${(item.price || 0).toFixed(2)}`;
      const name = item.name || "Item";
      
      // Format: Quantity and item name on left, price on right with spacing
      const itemLine = `${quantity} x ${name}`;
      const totalWidth = 40; // Approximate character width
      const spacesNeeded = Math.max(1, totalWidth - itemLine.length - price.length);
      
      receiptText += `${quantity} x ${name}`;
      receiptText += " ".repeat(spacesNeeded);
      receiptText += `${price}\n`;
      
      if (item.isRedeemed || item.isFree) {
        receiptText += "  *REDEEMED - FREE*\n";
      }
      if (item.isPwdSeniorDiscounted) {
        receiptText += "  *PWD/SENIOR -20%*\n";
      }
    });
    
    receiptText += "--------------------------------\n";
    
    // Totals - Right align for amount
    receiptText += "\x1B\x61\x02"; // Right align
    
    const subtotal = safeNumber(orderInfo.bills?.total || 0);
    const pwdSeniorDisc = safeNumber(orderInfo.bills?.pwdSeniorDiscount || 0);
    const employeeDisc = safeNumber(orderInfo.bills?.employeeDiscount || 0);
    const shareholderDisc = safeNumber(orderInfo.bills?.shareholderDiscount || 0);
    const redemptionDisc = safeNumber(orderInfo.bills?.redemptionDiscount || 0);
    const customDisc = safeNumber(orderInfo.bills?.customDiscount || 0);
    const totalWithTax = safeNumber(orderInfo.bills?.totalWithTax || 0);
    
    receiptText += `Subtotal:         PHP${subtotal.toFixed(2)}\n`;
    
    if (pwdSeniorDisc > 0) {
      receiptText += `PWD/Senior Disc: -PHP${pwdSeniorDisc.toFixed(2)}\n`;
    }
    if (employeeDisc > 0) {
      receiptText += `Employee Disc:   -PHP${employeeDisc.toFixed(2)}\n`;
    }
    if (shareholderDisc > 0) {
      receiptText += `VIP Disc:        -PHP${shareholderDisc.toFixed(2)}\n`;
    }
    if (redemptionDisc > 0) {
      receiptText += `Redemption:      -PHP${redemptionDisc.toFixed(2)}\n`;
    }
    if (customDisc > 0) {
      receiptText += `Custom Disc:     -PHP${customDisc.toFixed(2)}\n`;
    }
    
    receiptText += "\x1B\x45\x01"; // Bold on
    receiptText += `TOTAL:           PHP${totalWithTax.toFixed(2)}\n`;
    receiptText += "\x1B\x45\x00"; // Bold off
    receiptText += "--------------------------------\n";
    
    // Payment and Change - Left align
    receiptText += "\x1B\x61\x00"; // Left align
    receiptText += `Payment: ${orderInfo.paymentMethod || "Cash"}\n`;
    receiptText += `change: PHP${safeNumber(orderInfo.bills?.change || 0).toFixed(2)}\n`;
    
    if (orderInfo.bills?.isPartialPayment) {
      receiptText += `partial payment:   PHP${safeNumber(orderInfo.bills?.remainingBalance || 0).toFixed(2)}\n`;
    }
    
    receiptText += "--------------------------------\n";
    
    // Center align for footer
    receiptText += "\x1B\x61\x01"; // Center align
    
    // Social media
    receiptText += "follow us on FB IG TIKTOK\n";
    receiptText += "\n";
    receiptText += "Thank you for dining with us !\n";
    receiptText += "Please visit again!\n";
    receiptText += "\n";
    receiptText += "\n";
    
    // Feed and cut
    receiptText += thermalCommands.FEED_N_LINES(3);
    receiptText += thermalCommands.CUT_PARTIAL;

    return receiptText;
  };

  // Print receipt - KEEPS BLUETOOTH CONNECTION ON
  const handlePrintReceipt = async () => {
    if (!isConnected) {
      setErrorMessage("Please connect to Bluetooth printer first.");
      return;
    }

    setIsPrinting(true);
    setErrorMessage(""); // Clear any previous errors
    
    try {
      const receiptText = generateThermalText();
      await printReceipt(receiptText);
      
      // Mark as printed regardless of mode
      setHasAutoPrinted(true);
      setHasAutoPrintAttempted(true);

      // Open cash drawer for cash payments (printer stays connected)
      if (orderInfo.paymentMethod === "Cash") {
        try {
          await new Promise((resolve) => setTimeout(resolve, 500));
          await openCashDrawer();
        } catch (drawerError) {
          console.warn("Could not open cash drawer:", drawerError);
          // Don't show error to user for drawer issues
        }
      }

      console.log("✅ Receipt printed successfully - Bluetooth remains connected");
    } catch (error) {
      console.error("Print receipt error:", error);
      setErrorMessage(`Printing failed: ${error.message}`);
    } finally {
      setIsPrinting(false);
    }
  };

  // AUTO-PRINT - DOES NOT DISCONNECT BLUETOOTH
  useEffect(() => {
    // Only attempt auto-print once per invoice
    if (hasAutoPrintAttempted) {
      return;
    }

    const attemptAutoPrint = async () => {
      // Don't auto-print if disabled
      if (disableAutoPrint) {
        console.log("⏸️ Auto-print disabled - Bluetooth connection will remain on");
        setHasAutoPrintAttempted(true);
        return;
      }

      // Wait for connection and ensure we have order info
      if (!isConnected || !orderInfo || isPrinting) {
        return;
      }

      try {
        console.log("🖨️ Auto-printing receipt - Bluetooth connection remains active");
        await handlePrintReceipt();
      } catch (error) {
        console.error("Auto-print failed:", error);
        setErrorMessage(`Auto-print failed: ${error.message}`);
      }
    };

    // Only attempt auto-print once
    if (!hasAutoPrintAttempted) {
      // Add delay to ensure everything is ready
      const timer = setTimeout(() => {
        attemptAutoPrint();
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [isConnected, orderInfo, disableAutoPrint, hasAutoPrintAttempted, isPrinting]);

  // Handle cash drawer - KEEPS BLUETOOTH CONNECTION ON
  const handleOpenCashDrawer = async () => {
    if (!isConnected) {
      setErrorMessage("Please connect to Bluetooth printer first.");
      return;
    }
    
    try {
      await openCashDrawer();
      setErrorMessage(""); // Clear any previous errors
      console.log("💰 Cash drawer opened - Bluetooth remains connected");
    } catch (error) {
      console.error("Open cash drawer error:", error);
      setErrorMessage(`Cannot open drawer: ${error.message}`);
    }
  };

  // Get connection status text
  const getConnectionStatusText = () => {
    if (isConnected) return "✓ Connected";
    if (isConnecting) return "🔄 Connecting...";
    if (connectionStatus === "error") return "❌ Connection Error";
    return "🔌 Disconnected";
  };

  // CLOSE INVOICE - DOES NOT DISCONNECT BLUETOOTH
  const handleCloseInvoice = () => {
    console.log("🔌 Closing invoice - Bluetooth connection remains on");
    // Reset states but KEEP BLUETOOTH CONNECTION
    setHasAutoPrinted(false);
    setHasAutoPrintAttempted(false);
    setErrorMessage("");
    setShowInvoice(false);
  };

  // CLEANUP ON UNMOUNT - DOES NOT DISCONNECT BLUETOOTH
  useEffect(() => {
    return () => {
      console.log("🧹 Invoice unmounting - Bluetooth connection remains active");
      // Do NOT call disconnectBluetooth() here
      // Just reset local states
      setIsPrinting(false);
      setHasAutoPrinted(false);
      setHasAutoPrintAttempted(false);
    };
  }, []); // Empty dependency array - runs only on unmount

  if (!orderInfo) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-3">
        <div className="bg-white p-3 rounded-lg shadow-lg text-center max-w-[280px]">
          <p className="text-red-500 font-semibold text-xs">
            Invalid order data.
          </p>
          <button
            onClick={handleCloseInvoice}
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
        {/* Header */}
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

          {/* Manual Mode Indicator */}
          {disableAutoPrint && (
            <div className="mt-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-[9px] font-semibold">
              Manual Mode
            </div>
          )}

          {/* Connection Status */}
          <div
            className={`mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
              isConnected
                ? "bg-green-100 text-green-800"
                : isConnecting
                ? "bg-yellow-100 text-yellow-800"
                : connectionStatus === "error"
                ? "bg-red-100 text-red-800"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {getConnectionStatusText()}
            {printerName && isConnected && ` • ${printerName}`}
          </div>

          {/* Print status */}
          {isPrinting && (
            <div className="mt-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-[10px] font-semibold">
              Printing receipt...
            </div>
          )}

          {/* Success message */}
          {hasAutoPrinted && !isPrinting && (
            <div className="mt-1 px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-[10px] font-semibold">
              ✓ Receipt printed successfully
            </div>
          )}

          {/* Error Message */}
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

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2" ref={invoiceRef}>
          {/* Order Details */}
          <div className="bg-gray-50 p-2 rounded-lg">
            <h3 className="font-semibold text-gray-700 text-xs mb-1">
              Order Details
            </h3>
            <div className="grid grid-cols-2 gap-1 text-[10px]">
              <div>
                <span className="text-gray-600">ID:</span>
                <p className="font-medium truncate">
                  {orderInfo._id?.slice(-8) || orderInfo.orderNumber || "N/A"}
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
                  {orderInfo.customerDetails?.name || 
                   (orderInfo.customerType === "walk-in" ? "Walk-in Customer" : "Take-out Customer")}
                </p>
              </div>
            </div>
          </div>

          {/* PWD/Senior Details */}
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

          {/* Items */}
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

          {/* Bill Summary */}
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
                  <span>PWD/Senior Disc:</span>
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
                  <span>Redemption:</span>
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
                  <span>Employee Disc:</span>
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
                  <span>VIP Disc:</span>
                  <span>
                    -PHP
                    {safeNumber(
                      orderInfo.bills?.shareholderDiscount || 0
                    ).toFixed(2)}
                  </span>
                </div>
              )}

              {safeNumber(orderInfo.bills?.customDiscount || 0) > 0 && (
                <div className="flex justify-between text-orange-600">
                  <span>Custom Disc:</span>
                  <span>
                    -PHP
                    {safeNumber(
                      orderInfo.bills?.customDiscount || 0
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
                      <span className="text-gray-600">Payment:</span>
                      <span className="text-gray-800">
                        PHP
                        {safeNumber(orderInfo.bills?.cashAmount || 0).toFixed(
                          2
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">change:</span>
                      <span className="text-green-600 font-semibold">
                        PHP{safeNumber(orderInfo.bills?.change || 0).toFixed(2)}
                      </span>
                    </div>
                  </>
                )}
                
              {orderInfo.bills?.isPartialPayment && (
                <div className="flex justify-between text-orange-600">
                  <span>partial payment:</span>
                  <span>
                    PHP{safeNumber(orderInfo.bills?.remainingBalance || 0).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Social Media */}
          <div className="bg-gradient-to-r from-pink-50 to-purple-50 p-2 rounded-lg border border-pink-200">
            <h3 className="font-semibold text-gray-700 text-xs mb-1 text-center">
              Follow us on Social Media
            </h3>
            <div className="flex justify-center items-center gap-3 mt-1">
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                  <IconFacebook className="text-white text-xs" />
                </div>
                <span className="text-[8px] text-gray-600 mt-0.5">FB</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <IconInstagram className="text-white text-xs" />
                </div>
                <span className="text-[8px] text-gray-600 mt-0.5">IG</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 bg-black rounded-full flex items-center justify-center">
                  <IconTiktok className="text-white text-xs" />
                </div>
                <span className="text-[8px] text-gray-600 mt-0.5">TIKTOK</span>
              </div>
            </div>
            <div className="text-center mt-2">
              <p className="text-[10px] text-gray-600">
                Thank you for dining with us !
              </p>
              <p className="text-[9px] text-gray-500 mt-0.5">
                Please visit again!
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
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
                ? "Disconnect"
                : "Connect BT"}
            </button>

            <button
              onClick={handleOpenCashDrawer}
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
              onClick={handlePrintReceipt}
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
              onClick={handleCloseInvoice}
              className="flex items-center justify-center gap-1 bg-gray-600 text-white px-2 py-2 rounded-lg hover:bg-gray-700 transition-colors text-[10px] font-semibold"
            >
              <IconTimes className="w-3 h-3" />
              Close
            </button>
          </div>

          {/* Auto-print info */}
          <div className="mt-2 text-center">
            <p className="text-[9px] text-gray-600">
              {disableAutoPrint
                ? "Manual mode - Click 'Print Receipt' to print"
                : isConnected && !hasAutoPrinted
                ? "Auto-printing receipt..."
                : "Bluetooth stays connected after printing"}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Invoice;