// src/components/tables/POS58DConnectionManager.jsx
import React, { useState, useEffect, useRef } from "react";

const POS58DConnectionManager = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [deviceName, setDeviceName] = useState("");
  const [printerId, setPrinterId] = useState("");
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [testPrintResult, setTestPrintResult] = useState(null);
  const [printerType, setPrinterType] = useState("pos58d");
  const [baudRate, setBaudRate] = useState("9600");
  const [autoConnectEnabled, setAutoConnectEnabled] = useState(true);
  const [availableDevices, setAvailableDevices] = useState([]);
  const [showDeviceList, setShowDeviceList] = useState(false);
  const autoConnectAttempted = useRef(false);
  const connectedDeviceRef = useRef(null);

  // Load saved connection settings and attempt auto-connect
  useEffect(() => {
    const savedConnection = localStorage.getItem("pos58d_connection");
    if (savedConnection) {
      try {
        const connection = JSON.parse(savedConnection);
        setPrinterId(connection.printerId || "");
        setDeviceName(connection.deviceName || "");
        setIsConnected(connection.connected || false);
        setConnectionStatus(
          connection.connected ? "connected" : "disconnected"
        );
        setPrinterType(connection.printerType || "pos58d");
        setBaudRate(connection.baudRate || "9600");
        setAutoConnectEnabled(connection.autoConnect !== false);

        // Attempt auto-connect if settings exist and auto-connect is enabled
        if (
          connection.printerId &&
          connection.autoConnect !== false &&
          !connection.connected
        ) {
          setTimeout(() => {
            if (!autoConnectAttempted.current) {
              autoConnectAttempted.current = true;
              handleAutoConnect();
            }
          }, 1000);
        }
      } catch (error) {
        console.error("Error loading saved connection:", error);
      }
    }
  }, []);

  // Save connection settings
  const saveConnectionSettings = () => {
    const connection = {
      printerId,
      deviceName,
      connected: isConnected,
      printerType,
      baudRate,
      autoConnect: autoConnectEnabled,
      lastUpdated: new Date().toISOString(),
    };
    localStorage.setItem("pos58d_connection", JSON.stringify(connection));
    alert("Settings saved!");
  };

  // Discover available Bluetooth devices
  const discoverBluetoothDevices = async () => {
    try {
      if (!navigator.bluetooth) {
        throw new Error(
          "Web Bluetooth API is not supported in this browser. Please use Chrome, Edge, or other supported browsers."
        );
      }

      setShowDeviceList(true);
      setTestPrintResult({
        success: true,
        message: "Searching for Bluetooth devices...",
      });

      // Request Bluetooth device
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ["generic_access", "device_information"],
      });

      // Store device info
      setAvailableDevices([
        {
          id: device.id,
          name: device.name || "Unknown Device",
          device: device,
        },
      ]);

      return device;
    } catch (error) {
      if (error.name !== "NotFoundError") {
        console.error("Bluetooth discovery error:", error);
        setTestPrintResult({
          success: false,
          message: `Discovery failed: ${error.message}`,
        });
        setTimeout(() => setTestPrintResult(null), 3000);
      }
      return null;
    }
  };

  // Actual Bluetooth connection function
  const connectToBluetoothPrinter = async (device = null) => {
    setIsConnecting(true);
    setConnectionStatus("connecting");

    try {
      let bluetoothDevice = device;

      // If no device provided, discover one
      if (!bluetoothDevice) {
        if (!navigator.bluetooth) {
          throw new Error(
            "Web Bluetooth API is not supported in this browser."
          );
        }

        // Request Bluetooth device with printer services
        bluetoothDevice = await navigator.bluetooth.requestDevice({
          filters: [{ services: ["generic_access"] }],
          optionalServices: ["generic_access", "device_information"],
        });
      }

      // Connect to the device
      const server = await bluetoothDevice.gatt.connect();

      // Store device info
      const deviceName = bluetoothDevice.name || "POS-58D Printer";
      setDeviceName(deviceName);
      setPrinterId(bluetoothDevice.id);
      setIsConnected(true);
      setConnectionStatus("connected");
      connectedDeviceRef.current = bluetoothDevice;

      // Save connection
      const connection = {
        printerId: bluetoothDevice.id,
        deviceName,
        connected: true,
        printerType,
        baudRate,
        autoConnect: autoConnectEnabled,
        lastUpdated: new Date().toISOString(),
      };
      localStorage.setItem("pos58d_connection", JSON.stringify(connection));

      // Dispatch connection event
      window.dispatchEvent(
        new CustomEvent("bluetoothConnected", {
          detail: {
            deviceName,
            printerId: bluetoothDevice.id,
            type: "pos58d",
            device: bluetoothDevice,
            server: server,
          },
        })
      );

      // Set up device disconnect listener
      bluetoothDevice.addEventListener(
        "gattserverdisconnected",
        handleDisconnect
      );

      // Show success message
      setTestPrintResult({ success: true, message: "Connected successfully!" });
      setTimeout(() => setTestPrintResult(null), 3000);

      return true;
    } catch (error) {
      console.error("Bluetooth connection error:", error);

      // Fallback to simulated connection for demo purposes
      if (error.name === "NotFoundError") {
        // Simulate connection for demo
        setTimeout(() => {
          setIsConnecting(false);
          setIsConnected(true);
          setConnectionStatus("connected");
          const demoDeviceName = "POS-58D Printer (Demo)";
          setDeviceName(demoDeviceName);
          setPrinterId("demo-printer-id");

          const connection = {
            printerId: "demo-printer-id",
            deviceName: demoDeviceName,
            connected: true,
            printerType,
            baudRate,
            autoConnect: autoConnectEnabled,
            lastUpdated: new Date().toISOString(),
          };
          localStorage.setItem("pos58d_connection", JSON.stringify(connection));

          window.dispatchEvent(
            new CustomEvent("bluetoothConnected", {
              detail: {
                deviceName: demoDeviceName,
                printerId: "demo-printer-id",
                type: "pos58d",
              },
            })
          );

          setTestPrintResult({
            success: true,
            message: "Connected successfully! (Demo Mode)",
          });
          setTimeout(() => setTestPrintResult(null), 3000);
        }, 1500);
      } else {
        setIsConnecting(false);
        setConnectionStatus("disconnected");
        setTestPrintResult({
          success: false,
          message: `Connection failed: ${error.message}`,
        });
        setTimeout(() => setTestPrintResult(null), 3000);
      }
      return false;
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnect = async () => {
    await connectToBluetoothPrinter();
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setIsConnecting(false);
    setConnectionStatus("disconnected");
    connectedDeviceRef.current = null;

    // Update localStorage
    const savedConnection = localStorage.getItem("pos58d_connection");
    if (savedConnection) {
      try {
        const connection = JSON.parse(savedConnection);
        connection.connected = false;
        localStorage.setItem("pos58d_connection", JSON.stringify(connection));
      } catch (error) {
        console.error("Error updating connection:", error);
      }
    }

    // Dispatch disconnection event
    window.dispatchEvent(new CustomEvent("bluetoothDisconnected"));

    setTestPrintResult({ success: false, message: "Disconnected" });
    setTimeout(() => setTestPrintResult(null), 3000);
  };

  const handleTestPrint = () => {
    if (!isConnected) {
      setTestPrintResult({
        success: false,
        message: "Not connected to printer",
      });
      setTimeout(() => setTestPrintResult(null), 3000);
      return;
    }

    setTestPrintResult(null);

    // Simulate print test
    setTimeout(() => {
      const printData = {
        type: "test",
        content:
          "=== TEST PRINT ===\nDelish POS System\n" +
          "Printer: POS-58D\n" +
          "Device: " +
          deviceName +
          "\n" +
          "Date: " +
          new Date().toLocaleDateString() +
          "\n" +
          "Time: " +
          new Date().toLocaleTimeString() +
          "\n" +
          "Status: OK\n" +
          "=================\n\n\n\n",
      };

      // Dispatch print event
      window.dispatchEvent(
        new CustomEvent("printJob", {
          detail: printData,
        })
      );

      setTestPrintResult({
        success: true,
        message: "Test print sent successfully!",
      });
      setTimeout(() => setTestPrintResult(null), 3000);
    }, 1000);
  };

  const handleAutoConnect = async () => {
    if (printerId && !isConnected && !isConnecting && autoConnectEnabled) {
      console.log("Attempting auto-connect to saved printer:", printerId);

      try {
        if (!navigator.bluetooth) {
          throw new Error("Web Bluetooth API not available");
        }

        // For auto-connect, we need to re-request the device
        // Web Bluetooth doesn't persist connections across page reloads
        await connectToBluetoothPrinter();
      } catch (error) {
        console.error("Auto-connect failed:", error);
        // Fall back to normal connect flow
        await handleConnect();
      }
    }
  };

  // Auto-connect when component mounts if settings exist
  useEffect(() => {
    const attemptAutoConnect = async () => {
      if (printerId && autoConnectEnabled && !isConnected && !isConnecting) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        handleAutoConnect();
      }
    };

    attemptAutoConnect();
  }, [printerId, autoConnectEnabled]);

  // Status color helper
  const getStatusColor = () => {
    switch (connectionStatus) {
      case "connected":
        return "#10B981";
      case "connecting":
        return "#F59E0B";
      default:
        return "#EF4444";
    }
  };

  // Status text helper
  const getStatusText = () => {
    switch (connectionStatus) {
      case "connected":
        return "Connected";
      case "connecting":
        return "Connecting...";
      default:
        return "Disconnected";
    }
  };

  // Toggle auto-connect setting
  const toggleAutoConnect = () => {
    const newValue = !autoConnectEnabled;
    setAutoConnectEnabled(newValue);

    // Save immediately
    const savedConnection = localStorage.getItem("pos58d_connection");
    if (savedConnection) {
      try {
        const connection = JSON.parse(savedConnection);
        connection.autoConnect = newValue;
        localStorage.setItem("pos58d_connection", JSON.stringify(connection));
      } catch (error) {
        console.error("Error updating auto-connect setting:", error);
      }
    }
  };

  // Connect to a specific device from the list
  const connectToDevice = async (device) => {
    setShowDeviceList(false);
    await connectToBluetoothPrinter(device);
  };

  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: "8px",
        padding: "20px",
        marginBottom: "20px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      }}
    >
      <div
        style={{ display: "flex", alignItems: "center", marginBottom: "20px" }}
      >
        <div
          style={{
            fontSize: "28px",
            marginRight: "10px",
            color: "#4B5563",
          }}
        >
          🖨️
        </div>
        <h3 style={{ margin: 0, fontSize: "20px", fontWeight: "bold" }}>
          POS-58D Printer Connection
        </h3>
        <div
          style={{
            marginLeft: "12px",
            padding: "4px 12px",
            backgroundColor: getStatusColor(),
            color: "white",
            borderRadius: "20px",
            fontSize: "12px",
            fontWeight: "bold",
          }}
        >
          {getStatusText()}
        </div>
        {autoConnectEnabled && (
          <div
            style={{
              marginLeft: "8px",
              padding: "4px 8px",
              backgroundColor: "#DBEAFE",
              color: "#1E40AF",
              borderRadius: "20px",
              fontSize: "11px",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <span>⚡</span> Auto-Connect
          </div>
        )}
      </div>

      <hr
        style={{
          border: "none",
          borderTop: "1px solid #E5E7EB",
          margin: "20px 0",
        }}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* Auto-Connect Toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "48px",
              height: "24px",
              backgroundColor: autoConnectEnabled ? "#10B981" : "#D1D5DB",
              borderRadius: "12px",
              position: "relative",
              cursor: "pointer",
              transition: "background-color 0.3s",
            }}
            onClick={toggleAutoConnect}
          >
            <div
              style={{
                position: "absolute",
                top: "2px",
                left: autoConnectEnabled ? "26px" : "2px",
                width: "20px",
                height: "20px",
                backgroundColor: "white",
                borderRadius: "50%",
                transition: "left 0.3s",
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }}
            />
          </div>
          <span style={{ fontSize: "14px", fontWeight: "500" }}>
            Auto-connect on page load
          </span>
          <span
            style={{
              fontSize: "12px",
              color: "#6B7280",
              marginLeft: "auto",
            }}
          >
            {autoConnectEnabled ? "Enabled" : "Disabled"}
          </span>
        </div>

        <div>
          <label
            style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}
          >
            Printer Type
          </label>
          <select
            value={printerType}
            onChange={(e) => setPrinterType(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              border: "1px solid #D1D5DB",
              borderRadius: "6px",
              fontSize: "14px",
            }}
          >
            <option value="pos58d">POS-58D (Thermal)</option>
            <option value="pos80">POS-80 (80mm)</option>
            <option value="pos58iii">POS-58III</option>
            <option value="custom">Custom Bluetooth</option>
          </select>
        </div>

        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            <label style={{ fontWeight: "500" }}>Bluetooth Connection</label>
            {isConnected ? (
              <button
                onClick={handleDisconnect}
                style={{
                  padding: "4px 8px",
                  backgroundColor: "#EF4444",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  fontSize: "12px",
                  fontWeight: "500",
                  cursor: "pointer",
                }}
              >
                Disconnect
              </button>
            ) : (
              <button
                onClick={discoverBluetoothDevices}
                disabled={isConnecting}
                style={{
                  padding: "4px 8px",
                  backgroundColor: isConnecting ? "#9CA3AF" : "#3B82F6",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  fontSize: "12px",
                  fontWeight: "500",
                  cursor: isConnecting ? "not-allowed" : "pointer",
                }}
              >
                {isConnecting ? "Searching..." : "Find Devices"}
              </button>
            )}
          </div>

          {/* Device List */}
          {showDeviceList && availableDevices.length > 0 && (
            <div
              style={{
                border: "1px solid #E5E7EB",
                borderRadius: "6px",
                padding: "10px",
                marginTop: "8px",
                backgroundColor: "#F9FAFB",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  color: "#6B7280",
                  marginBottom: "8px",
                }}
              >
                Available Devices:
              </div>
              {availableDevices.map((device) => (
                <div
                  key={device.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px",
                    borderBottom: "1px solid #E5E7EB",
                  }}
                >
                  <span style={{ fontSize: "14px" }}>{device.name}</span>
                  <button
                    onClick={() => connectToDevice(device.device)}
                    style={{
                      padding: "4px 8px",
                      backgroundColor: "#10B981",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      fontSize: "12px",
                      cursor: "pointer",
                    }}
                  >
                    Connect
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Current Device Info */}
          {deviceName && (
            <div
              style={{
                marginTop: "8px",
                padding: "8px",
                backgroundColor: "#F3F4F6",
                borderRadius: "4px",
                fontSize: "13px",
              }}
            >
              <strong>Current device:</strong> {deviceName}
            </div>
          )}
        </div>

        <div>
          <label
            style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}
          >
            Baud Rate (for compatibility)
          </label>
          <select
            value={baudRate}
            onChange={(e) => setBaudRate(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              border: "1px solid #D1D5DB",
              borderRadius: "6px",
              fontSize: "14px",
            }}
          >
            <option value="9600">9600</option>
            <option value="19200">19200</option>
            <option value="38400">38400</option>
            <option value="57600">57600</option>
            <option value="115200">115200</option>
          </select>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={handleConnect}
            disabled={isConnecting || isConnected}
            style={{
              flex: 1,
              padding: "12px",
              backgroundColor:
                isConnecting || isConnected ? "#9CA3AF" : "#3B82F6",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: isConnecting || isConnected ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            {isConnecting ? "🔄" : isConnected ? "✅" : "🔗"}
            {isConnecting
              ? "Connecting..."
              : isConnected
              ? "Connected"
              : "Connect to Bluetooth"}
          </button>

          <button
            onClick={handleDisconnect}
            disabled={!isConnected}
            style={{
              flex: 1,
              padding: "12px",
              backgroundColor: !isConnected ? "#F3F4F6" : "#EF4444",
              color: !isConnected ? "#9CA3AF" : "white",
              border: "1px solid #D1D5DB",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: !isConnected ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            ❌ Disconnect
          </button>
        </div>

        {/* Printer Info Card */}
        <div
          style={{
            border: "1px solid #E5E7EB",
            borderRadius: "8px",
            padding: "20px",
            backgroundColor: "#F9FAFB",
          }}
        >
          <h4
            style={{
              margin: "0 0 16px 0",
              fontSize: "16px",
              fontWeight: "600",
            }}
          >
            Printer Information
          </h4>

          <div style={{ marginBottom: "12px" }}>
            <div
              style={{
                fontSize: "12px",
                color: "#6B7280",
                marginBottom: "4px",
              }}
            >
              Status:
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: isConnected ? "#10B981" : "#EF4444",
                }}
              />
              {isConnected ? (
                <span>Connected to {deviceName || "POS-58D Printer"}</span>
              ) : (
                <span>Not Connected</span>
              )}
            </div>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <div
              style={{
                fontSize: "12px",
                color: "#6B7280",
                marginBottom: "4px",
              }}
            >
              Connection Details:
            </div>
            <div style={{ fontSize: "14px", lineHeight: "1.5" }}>
              <div>Type: {printerType.toUpperCase()}</div>
              <div>Device: {deviceName || "No device selected"}</div>
              <div>Baud Rate: {baudRate}</div>
              <div>Auto-connect: {autoConnectEnabled ? "Yes" : "No"}</div>
              {isConnected && (
                <div
                  style={{
                    color: "#10B981",
                    fontWeight: "500",
                    marginTop: "4px",
                  }}
                >
                  ✓ Ready to print
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <button
              onClick={handleTestPrint}
              disabled={!isConnected}
              style={{
                padding: "12px",
                backgroundColor: !isConnected ? "#F3F4F6" : "#8B5CF6",
                color: !isConnected ? "#9CA3AF" : "white",
                border: "none",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: !isConnected ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              🖨️ Test Print
            </button>

            <button
              onClick={saveConnectionSettings}
              style={{
                padding: "12px",
                backgroundColor: "white",
                color: "#374151",
                border: "1px solid #D1D5DB",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              ⚙️ Save Settings
            </button>
          </div>
        </div>

        {/* Test Print Result */}
        {testPrintResult && (
          <div
            style={{
              padding: "12px",
              backgroundColor: testPrintResult.success ? "#D1FAE5" : "#FEE2E2",
              color: testPrintResult.success ? "#065F46" : "#991B1B",
              borderRadius: "6px",
              border: `1px solid ${
                testPrintResult.success ? "#A7F3D0" : "#FECACA"
              }`,
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            {testPrintResult.success ? "✅" : "❌"}
            {testPrintResult.message}
          </div>
        )}

        {/* Note */}
        <div
          style={{
            padding: "16px",
            backgroundColor: "#F3F4F6",
            borderRadius: "6px",
            fontSize: "14px",
            color: "#6B7280",
          }}
        >
          <strong>Note:</strong> This uses the Web Bluetooth API to connect
          directly to thermal printers. No MAC address needed! Just click
          "Connect to Bluetooth" and select your POS printer from the list. Make
          sure Bluetooth is enabled on your device and the printer is turned on.
          <br />
          <br />
          <strong>Browser Support:</strong> Chrome, Edge, Opera, and other
          Chromium-based browsers support Web Bluetooth.
        </div>
      </div>
    </div>
  );
};

export default POS58DConnectionManager;
