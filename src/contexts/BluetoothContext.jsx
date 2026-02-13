import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";

// Create the context
const BluetoothContext = createContext();

// Custom hook to use the Bluetooth context
export const useBluetooth = () => {
  const context = useContext(BluetoothContext);
  if (!context) {
    throw new Error("useBluetooth must be used within BluetoothProvider");
  }
  return context;
};

export const BluetoothProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [printerName, setPrinterName] = useState(null);
  const [bluetoothDevice, setBluetoothDevice] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [debugLog, setDebugLog] = useState([]);
  const reconnectAttemptsRef = useRef(0);
  const isAutoConnectingRef = useRef(false);

  // Add debug log
  const addDebugLog = (message, type = "info") => {
    const timestamp = new Date().toLocaleTimeString();
    const log = `[${timestamp}] ${type.toUpperCase()}: ${message}`;
    console.log(log);
    setDebugLog((prev) => [...prev.slice(-10), log]); // Keep last 10 logs
  };

  // POS58D printer configuration - Expanded for compatibility
  const PRINTER_CONFIG = {
    TARGET_NAME: "POS58D",
    ALTERNATIVE_NAMES: [
      "POS-58D",
      "POS58",
      "BlueTooth Printer",
      "58mm",
      "POS",
      "BT",
      "Printer",
      "BTP",
      "BLE",
    ],
    SERVICE_UUIDS: [
      "000018f0-0000-1000-8000-00805f9b34fb", // Common thermal printer service
      "e7810a71-73ae-499d-8c15-faa9aef0c3f2", // Nordic UART service
      "0000ff00-0000-1000-8000-00805f9b34fb", // Custom service
      "00001101-0000-1000-8000-00805f9b34fb", // Serial port profile
      "0000fee0-0000-1000-8000-00805f9b34fb", // Battery service
      "0000ffe0-0000-1000-8000-00805f9b34fb", // Generic access
    ],
    WRITE_CHARACTERISTIC_UUIDS: [
      "00002af1-0000-1000-8000-00805f9b34fb", // Common write characteristic
      "bef8d6c9-9c21-4c9e-b632-bd58c1009f9f", // Nordic UART write
      "0000ff02-0000-1000-8000-00805f9b34fb", // Custom write
      "0000ffe1-0000-1000-8000-00805f9b34fb", // Generic write
    ],
  };

  // Thermal printer ESC/POS commands
  const thermalCommands = {
    INIT: "\x1B\x40",
    ALIGN_LEFT: "\x1B\x61\x00",
    ALIGN_CENTER: "\x1B\x61\x01",
    ALIGN_RIGHT: "\x1B\x61\x02",
    BOLD_ON: "\x1B\x45\x01",
    BOLD_OFF: "\x1B\x45\x00",
    CUT_PARTIAL: "\x1B\x69",
    FEED_N_LINES: (n) => `\x1B\x64${String.fromCharCode(n)}`,
    TEXT_NORMAL: "\x1B\x21\x00",
    TEXT_LARGE: "\x1B\x21\x10",
    DRAWER_KICK: "\x1B\x70\x00\x19\xFA",
  };

  // Load saved printer connection on startup
  useEffect(() => {
    const loadSavedPrinter = () => {
      const savedPrinter = localStorage.getItem("pos58d_connection");
      if (savedPrinter) {
        try {
          const { id, name, timestamp } = JSON.parse(savedPrinter);
          setPrinterName(name);
          addDebugLog(`Loaded saved printer: ${name}`, "info");

          // Check if saved within last 24 hours
          const savedTime = new Date(timestamp);
          const now = new Date();
          const hoursDiff = (now - savedTime) / (1000 * 60 * 60);

          if (hoursDiff < 24) {
            // Attempt auto-connection after a delay
            setTimeout(() => {
              addDebugLog(
                "Attempting auto-connection to saved printer...",
                "info"
              );
              autoConnectToPrinter();
            }, 2000);
          }
        } catch (error) {
          addDebugLog(`Error loading saved printer: ${error.message}`, "error");
        }
      }
    };

    loadSavedPrinter();
  }, []);

  // Check Bluetooth availability
  const checkBluetoothSupport = () => {
    if (!navigator.bluetooth) {
      addDebugLog("Web Bluetooth API not available", "error");
      alert(
        "Your browser doesn't support Web Bluetooth. Please use Chrome/Edge on desktop or Android."
      );
      return false;
    }

    if (navigator.bluetooth.getAvailability) {
      navigator.bluetooth.getAvailability().then((available) => {
        if (!available) {
          addDebugLog("Bluetooth is not available on this device", "warning");
        } else {
          addDebugLog("Bluetooth is available", "success");
        }
      });
    }

    return true;
  };

  // Scan for available devices (for debugging)
  const scanForDevices = async () => {
    if (!checkBluetoothSupport()) return [];

    try {
      addDebugLog("Starting device scan...", "info");
      const devices = [];

      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [], // No services needed for discovery
      });

      addDebugLog(
        `Found device: ${device.name || "Unknown"} (ID: ${device.id})`,
        "info"
      );
      devices.push({
        name: device.name || "Unnamed",
        id: device.id,
      });

      return devices;
    } catch (error) {
      addDebugLog(`Scan failed: ${error.message}`, "error");
      return [];
    }
  };

  const setupDisconnectHandler = (device) => {
    device.addEventListener("gattserverdisconnected", () => {
      addDebugLog("Printer disconnected", "warning");
      setIsConnected(false);
      setBluetoothDevice(null);
      setConnectionStatus("disconnected");

      // Attempt reconnection only if we were previously connected
      if (isConnected) {
        setTimeout(() => {
          if (reconnectAttemptsRef.current < 3) {
            reconnectAttemptsRef.current++;
            addDebugLog(
              `Reconnection attempt ${reconnectAttemptsRef.current}`,
              "info"
            );
            autoConnectToPrinter();
          } else {
            reconnectAttemptsRef.current = 0;
            addDebugLog("Max reconnection attempts reached", "warning");
          }
        }, 3000);
      }
    });
  };

  // Test connection with simple command
  const testPrinterConnection = async (characteristic) => {
    try {
      addDebugLog("Testing printer connection...", "info");
      const testCommand = thermalCommands.INIT;
      const encoder = new TextEncoder();
      const dataArray = encoder.encode(testCommand);

      await characteristic.writeValue(dataArray);
      addDebugLog("Printer test successful", "success");
      return true;
    } catch (error) {
      addDebugLog(`Printer test failed: ${error.message}`, "error");
      return false;
    }
  };

  // Try to find compatible characteristic
  const findWriteCharacteristic = async (server) => {
    addDebugLog("Searching for compatible characteristics...", "info");

    for (const serviceUUID of PRINTER_CONFIG.SERVICE_UUIDS) {
      try {
        addDebugLog(`Trying service: ${serviceUUID}`, "debug");
        const service = await server.getPrimaryService(serviceUUID);
        addDebugLog(`Found service: ${serviceUUID}`, "success");

        const characteristics = await service.getCharacteristics();
        addDebugLog(`Found ${characteristics.length} characteristics`, "info");

        for (const characteristic of characteristics) {
          addDebugLog(`Characteristic: ${characteristic.uuid}`, "debug");

          // Check if it's a known write characteristic
          if (
            PRINTER_CONFIG.WRITE_CHARACTERISTIC_UUIDS.includes(
              characteristic.uuid
            )
          ) {
            addDebugLog(
              `Found compatible write characteristic: ${characteristic.uuid}`,
              "success"
            );
            return characteristic;
          }

          // Try to find any characteristic with write property
          const properties = characteristic.properties;
          addDebugLog(`Properties: ${JSON.stringify(properties)}`, "debug");

          if (properties.write || properties.writeWithoutResponse) {
            addDebugLog(
              `Found write-capable characteristic: ${characteristic.uuid}`,
              "success"
            );
            return characteristic;
          }
        }
      } catch (error) {
        addDebugLog(`Service ${serviceUUID} failed: ${error.message}`, "debug");
        continue;
      }
    }

    return null;
  };

  const autoConnectToPrinter = async () => {
    if (!checkBluetoothSupport()) return null;

    if (isConnected || isConnecting || isAutoConnectingRef.current) {
      addDebugLog("Already connected or connecting", "warning");
      return null;
    }

    isAutoConnectingRef.current = true;
    setIsConnecting(true);
    setConnectionStatus("connecting");

    try {
      addDebugLog("Searching for Bluetooth printers...", "info");

      // Try multiple discovery methods
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { name: PRINTER_CONFIG.TARGET_NAME },
          { namePrefix: "POS" },
          { namePrefix: "BT" },
          { namePrefix: "BLE" },
          { services: PRINTER_CONFIG.SERVICE_UUIDS },
        ],
        optionalServices: PRINTER_CONFIG.SERVICE_UUIDS,
        acceptAllDevices: false,
      });

      addDebugLog(`Device selected: ${device.name || "Unknown"}`, "info");
      addDebugLog(`Device ID: ${device.id}`, "debug");

      // Connect to GATT server
      addDebugLog("Connecting to GATT server...", "info");
      const server = await device.gatt.connect();
      addDebugLog("GATT server connected", "success");

      // Find write characteristic
      const characteristic = await findWriteCharacteristic(server);

      if (!characteristic) {
        throw new Error(
          "No compatible write characteristic found. Try manual connection."
        );
      }

      // Test the connection
      const testResult = await testPrinterConnection(characteristic);
      if (!testResult) {
        throw new Error("Printer test failed");
      }

      // Setup device
      const btDevice = { device, server, characteristic };
      setBluetoothDevice(btDevice);
      setIsConnected(true);
      setConnectionStatus("connected");
      reconnectAttemptsRef.current = 0;
      setPrinterName(device.name || "Unknown Printer");

      // Save connection
      localStorage.setItem(
        "pos58d_connection",
        JSON.stringify({
          id: device.id,
          name: device.name || "Unknown Printer",
          timestamp: new Date().toISOString(),
        })
      );

      // Setup disconnect handler
      setupDisconnectHandler(device);

      addDebugLog("Bluetooth printer connected and ready", "success");
      return btDevice;
    } catch (error) {
      addDebugLog(`Auto-connect failed: ${error.message}`, "error");
      setConnectionStatus("error");

      if (error.name === "NotFoundError") {
        addDebugLog("No printer selected or found", "warning");
      } else if (error.name === "SecurityError") {
        addDebugLog("Bluetooth permission denied", "error");
        alert("Please allow Bluetooth access in your browser.");
      } else {
        addDebugLog(`Connection error: ${error.message}`, "error");
      }

      return null;
    } finally {
      setIsConnecting(false);
      isAutoConnectingRef.current = false;
    }
  };

  // MANUAL CONNECTION - Try all devices
  const connectBluetooth = async () => {
    if (!checkBluetoothSupport()) return null;

    try {
      setIsConnecting(true);
      setConnectionStatus("connecting");
      addDebugLog("Starting manual Bluetooth connection...", "info");

      // Try accepting all devices first
      addDebugLog("Showing all available Bluetooth devices...", "info");

      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: PRINTER_CONFIG.SERVICE_UUIDS,
      });

      addDebugLog(`Selected device: ${device.name || "Unknown"}`, "info");

      if (!device) {
        throw new Error("No device selected");
      }

      // Connect to GATT server
      addDebugLog("Connecting to device...", "info");
      const server = await device.gatt.connect();
      addDebugLog("Connected to device", "success");

      // Find write characteristic
      let characteristic = await findWriteCharacteristic(server);

      if (!characteristic) {
        // Try to get ALL characteristics if no specific one found
        addDebugLog(
          "Trying to discover all services and characteristics...",
          "info"
        );
        const services = await server.getPrimaryServices();

        for (const service of services) {
          const characteristics = await service.getCharacteristics();
          for (const char of characteristics) {
            const props = char.properties;
            if (props.write || props.writeWithoutResponse) {
              addDebugLog(`Using characteristic: ${char.uuid}`, "info");
              characteristic = char;
              break;
            }
          }
          if (characteristic) break;
        }

        if (!characteristic) {
          throw new Error(
            "Could not find any write characteristic. Make sure printer is compatible."
          );
        }
      }

      // Test the connection
      addDebugLog("Testing printer communication...", "info");
      const testResult = await testPrinterConnection(characteristic);
      if (!testResult) {
        throw new Error("Printer is not responding");
      }

      // Setup device
      const btDevice = { device, server, characteristic };
      setBluetoothDevice(btDevice);
      setIsConnected(true);
      setConnectionStatus("connected");
      reconnectAttemptsRef.current = 0;
      setPrinterName(device.name || "Bluetooth Printer");

      // Save connection
      localStorage.setItem(
        "pos58d_connection",
        JSON.stringify({
          id: device.id,
          name: device.name || "Bluetooth Printer",
          timestamp: new Date().toISOString(),
        })
      );

      // Setup disconnect handler
      setupDisconnectHandler(device);

      addDebugLog("✅ Printer connected successfully!", "success");

      // Show success message
      alert(`✅ Connected to printer: ${device.name || "Bluetooth Printer"}`);

      return btDevice;
    } catch (error) {
      console.error("Connection failed:", error);
      setConnectionStatus("error");

      let errorMessage = "Connection failed. ";

      if (error.name === "NotFoundError") {
        errorMessage += "No device selected or Bluetooth is off.";
      } else if (error.name === "SecurityError") {
        errorMessage += "Permission denied. Please allow Bluetooth access.";
      } else if (error.name === "NetworkError") {
        errorMessage += "Connection lost. Check printer is ON and in range.";
      } else {
        errorMessage += error.message;
      }

      addDebugLog(`Connection error: ${errorMessage}`, "error");
      alert(
        `❌ ${errorMessage}\n\nMake sure:\n1. Printer is ON and charged\n2. Bluetooth is enabled\n3. Printer is in pairing mode\n4. You allow browser permissions`
      );

      return null;
    } finally {
      setIsConnecting(false);
    }
  };

  const sendToPrinter = useCallback(
    async (data) => {
      if (!bluetoothDevice || !isConnected) {
        throw new Error("Not connected to Bluetooth device");
      }

      try {
        addDebugLog(`Sending data to printer (${data.length} chars)`, "info");

        const encoder = new TextEncoder();
        const dataArray = encoder.encode(data);
        const CHUNK_SIZE = 20; // Some printers have small MTU

        addDebugLog(
          `Sending in ${Math.ceil(dataArray.length / CHUNK_SIZE)} chunks`,
          "debug"
        );

        for (let i = 0; i < dataArray.length; i += CHUNK_SIZE) {
          const chunk = dataArray.slice(i, i + CHUNK_SIZE);
          addDebugLog(`Sending chunk ${i / CHUNK_SIZE + 1}`, "debug");

          try {
            await bluetoothDevice.characteristic.writeValue(chunk);
            await new Promise((resolve) => setTimeout(resolve, 10)); // Small delay between chunks
          } catch (chunkError) {
            addDebugLog(`Chunk error: ${chunkError.message}`, "error");
            throw chunkError;
          }
        }

        addDebugLog("✅ Data sent to printer successfully", "success");
        return true;
      } catch (error) {
        addDebugLog(`❌ Error sending data: ${error.message}`, "error");
        setIsConnected(false);
        setConnectionStatus("error");
        throw error;
      }
    },
    [bluetoothDevice, isConnected]
  );

  const disconnectBluetooth = useCallback(() => {
    if (bluetoothDevice) {
      try {
        if (bluetoothDevice.device.gatt.connected) {
          addDebugLog("Disconnecting from printer...", "info");
          bluetoothDevice.device.gatt.disconnect();
        }
      } catch (error) {
        addDebugLog(`Error disconnecting: ${error.message}`, "error");
      }
    }
    setIsConnected(false);
    setBluetoothDevice(null);
    setPrinterName(null);
    setConnectionStatus("disconnected");
    reconnectAttemptsRef.current = 0;
    localStorage.removeItem("pos58d_connection");
    addDebugLog("Printer disconnected", "info");
  }, [bluetoothDevice]);

  const printReceipt = useCallback(
    async (receiptText) => {
      if (!isConnected || !bluetoothDevice) {
        throw new Error("Not connected to printer");
      }

      try {
        addDebugLog("Printing receipt...", "info");
        await sendToPrinter(receiptText);
        addDebugLog("Receipt printed successfully", "success");
        return true;
      } catch (error) {
        addDebugLog(`Print receipt error: ${error.message}`, "error");
        throw error;
      }
    },
    [isConnected, bluetoothDevice, sendToPrinter]
  );

  const openCashDrawer = useCallback(async () => {
    if (isConnected && bluetoothDevice) {
      try {
        addDebugLog("Opening cash drawer...", "info");
        await sendToPrinter(thermalCommands.DRAWER_KICK);
        addDebugLog("Cash drawer opened", "success");
        return true;
      } catch (error) {
        addDebugLog(`Cannot open drawer: ${error.message}`, "error");
        throw error;
      }
    } else {
      throw new Error("Not connected to printer");
    }
  }, [isConnected, bluetoothDevice, sendToPrinter]);

  // Clear debug log
  const clearDebugLog = () => {
    setDebugLog([]);
  };

  // Test printer connection
  const testConnection = async () => {
    if (!isConnected || !bluetoothDevice) {
      throw new Error("Not connected to printer");
    }

    try {
      return await testPrinterConnection(bluetoothDevice.characteristic);
    } catch (error) {
      addDebugLog(`Test connection failed: ${error.message}`, "error");
      return false;
    }
  };

  const value = {
    isConnected,
    isConnecting,
    printerName,
    connectionStatus,
    connectBluetooth,
    disconnectBluetooth,
    printReceipt,
    openCashDrawer,
    thermalCommands,
    autoConnectToPrinter,
    debugLog,
    clearDebugLog,
    testConnection,
    scanForDevices,
  };

  return (
    <BluetoothContext.Provider value={value}>
      {children}
    </BluetoothContext.Provider>
  );
};

// Export default
export default BluetoothContext;
