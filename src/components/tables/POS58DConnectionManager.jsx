// src/components/tables/POS58DConnectionManager.jsx
import React, { useState, useEffect } from "react";

const POS58DConnectionManager = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [deviceName, setDeviceName] = useState("");
  const [printerAddress, setPrinterAddress] = useState("");
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [testPrintResult, setTestPrintResult] = useState(null);
  const [printerType, setPrinterType] = useState("pos58d");
  const [baudRate, setBaudRate] = useState("9600");

  // Load saved connection settings
  useEffect(() => {
    const savedConnection = localStorage.getItem("pos58d_connection");
    if (savedConnection) {
      try {
        const connection = JSON.parse(savedConnection);
        setPrinterAddress(connection.address || "");
        setDeviceName(connection.deviceName || "");
        setIsConnected(connection.connected || false);
        setConnectionStatus(
          connection.connected ? "connected" : "disconnected"
        );
        setPrinterType(connection.printerType || "pos58d");
        setBaudRate(connection.baudRate || "9600");
      } catch (error) {
        console.error("Error loading saved connection:", error);
      }
    }
  }, []);

  // Save connection settings
  const saveConnectionSettings = () => {
    const connection = {
      address: printerAddress,
      deviceName,
      connected: isConnected,
      printerType,
      baudRate,
      lastUpdated: new Date().toISOString(),
    };
    localStorage.setItem("pos58d_connection", JSON.stringify(connection));
    alert("Settings saved!");
  };

  const handleConnect = async () => {
    if (!printerAddress.trim()) {
      alert("Please enter a printer address");
      return;
    }

    setIsConnecting(true);
    setConnectionStatus("connecting");

    // Simulate connection process
    setTimeout(() => {
      setIsConnecting(false);
      setIsConnected(true);
      setConnectionStatus("connected");
      setDeviceName(`POS-58D Printer (${printerAddress})`);

      // Save connection
      saveConnectionSettings();

      // Dispatch connection event
      window.dispatchEvent(
        new CustomEvent("bluetoothConnected", {
          detail: {
            deviceName: `POS-58D Printer (${printerAddress})`,
            address: printerAddress,
            type: "pos58d",
          },
        })
      );

      // Show success message
      setTestPrintResult({ success: true, message: "Connected successfully!" });

      // Auto-hide success message
      setTimeout(() => setTestPrintResult(null), 3000);
    }, 1500);
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setConnectionStatus("disconnected");
    setDeviceName("");

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

  const handleAutoConnect = () => {
    if (printerAddress && !isConnected) {
      handleConnect();
    }
  };

  // Listen for auto-connect events
  useEffect(() => {
    const handleAutoConnectEvent = () => {
      handleAutoConnect();
    };

    window.addEventListener("autoConnectBluetooth", handleAutoConnectEvent);

    return () => {
      window.removeEventListener(
        "autoConnectBluetooth",
        handleAutoConnectEvent
      );
    };
  }, [printerAddress, isConnected]);

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
      </div>

      <hr
        style={{
          border: "none",
          borderTop: "1px solid #E5E7EB",
          margin: "20px 0",
        }}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
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
          <label
            style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}
          >
            Printer Address / MAC
          </label>
          <input
            type="text"
            value={printerAddress}
            onChange={(e) => setPrinterAddress(e.target.value)}
            placeholder="e.g., 00:11:22:33:44:55"
            style={{
              width: "100%",
              padding: "10px",
              border: "1px solid #D1D5DB",
              borderRadius: "6px",
              fontSize: "14px",
            }}
          />
        </div>

        <div>
          <label
            style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}
          >
            Baud Rate
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
              : "Connect"}
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
              <div>Address: {printerAddress || "Not set"}</div>
              <div>Baud Rate: {baudRate}</div>
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
          <strong>Note:</strong> Make sure Bluetooth is enabled on your device
          and the printer is in pairing mode. Common POS-58D addresses start
          with 00:11:22 or similar patterns.
        </div>
      </div>
    </div>
  );
};

export default POS58DConnectionManager;
