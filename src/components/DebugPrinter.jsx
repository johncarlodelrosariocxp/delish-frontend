import React, { useState } from "react";
import { useBluetooth } from "../contexts/BluetoothContext.jsx";

const DebugPrinter = () => {
  const {
    isConnected,
    isConnecting,
    printerName,
    connectionStatus,
    connectBluetooth,
    disconnectBluetooth,
    debugLog,
    clearDebugLog,
    testConnection,
    scanForDevices,
  } = useBluetooth();

  const [showDebug, setShowDebug] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [testing, setTesting] = useState(false);

  const handleScan = async () => {
    setScanning(true);
    try {
      const devices = await scanForDevices();
      alert(
        `Found ${devices.length} device(s):\n${devices
          .map((d) => `• ${d.name}`)
          .join("\n")}`
      );
    } catch (error) {
      alert(`Scan error: ${error.message}`);
    } finally {
      setScanning(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const success = await testConnection();
      alert(success ? "✅ Printer test successful!" : "❌ Printer test failed");
    } catch (error) {
      alert(`Test error: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  // Get status color
  const getStatusColor = () => {
    switch (connectionStatus) {
      case "connected":
        return "#10b981";
      case "connecting":
        return "#f59e0b";
      case "error":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };

  // Get status icon
  const getStatusIcon = () => {
    switch (connectionStatus) {
      case "connected":
        return "🔵";
      case "connecting":
        return "🔄";
      case "error":
        return "🔴";
      default:
        return "⚪";
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        zIndex: 10000,
        background: "#1f2937",
        color: "white",
        borderRadius: "10px",
        padding: "15px",
        width: "400px",
        maxHeight: "500px",
        overflow: "auto",
        boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
        fontFamily: "monospace",
        fontSize: "12px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "15px",
          borderBottom: "1px solid #374151",
          paddingBottom: "10px",
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: "14px", color: "#9ca3af" }}>
            🖨️ Printer Debug Panel
          </h3>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginTop: "5px",
              fontSize: "11px",
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: getStatusColor(),
              }}
            ></span>
            <span>
              {getStatusIcon()} Status: {connectionStatus}
            </span>
            {printerName && <span>| Printer: {printerName}</span>}
          </div>
        </div>
        <button
          onClick={() => setShowDebug(!showDebug)}
          style={{
            background: "#4b5563",
            color: "white",
            border: "none",
            padding: "5px 10px",
            borderRadius: "5px",
            cursor: "pointer",
            fontSize: "11px",
          }}
        >
          {showDebug ? "▲ Hide" : "▼ Show"}
        </button>
      </div>

      {showDebug && (
        <>
          {/* Connection Buttons */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              marginBottom: "15px",
            }}
          >
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={connectBluetooth}
                disabled={isConnecting || isConnected}
                style={{
                  background: isConnected
                    ? "#10b981"
                    : isConnecting
                    ? "#f59e0b"
                    : "#3b82f6",
                  color: "white",
                  border: "none",
                  padding: "8px 12px",
                  borderRadius: "5px",
                  cursor: "pointer",
                  flex: 1,
                  fontSize: "12px",
                  opacity: isConnecting || isConnected ? 0.7 : 1,
                }}
              >
                {isConnecting
                  ? "🔄 Connecting..."
                  : isConnected
                  ? "✓ Connected"
                  : "🔗 Connect Printer"}
              </button>

              {isConnected && (
                <button
                  onClick={disconnectBluetooth}
                  style={{
                    background: "#ef4444",
                    color: "white",
                    border: "none",
                    padding: "8px 12px",
                    borderRadius: "5px",
                    cursor: "pointer",
                    fontSize: "12px",
                  }}
                >
                  ✖ Disconnect
                </button>
              )}
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={handleScan}
                disabled={scanning}
                style={{
                  background: "#8b5cf6",
                  color: "white",
                  border: "none",
                  padding: "8px 12px",
                  borderRadius: "5px",
                  cursor: "pointer",
                  flex: 1,
                  fontSize: "12px",
                }}
              >
                {scanning ? "🔍 Scanning..." : "🔍 Scan All Devices"}
              </button>

              {isConnected && (
                <button
                  onClick={handleTest}
                  disabled={testing}
                  style={{
                    background: "#f59e0b",
                    color: "white",
                    border: "none",
                    padding: "8px 12px",
                    borderRadius: "5px",
                    cursor: "pointer",
                    fontSize: "12px",
                  }}
                >
                  {testing ? "⚡ Testing..." : "⚡ Test Printer"}
                </button>
              )}
            </div>
          </div>

          {/* Troubleshooting Tips */}
          <div
            style={{
              marginBottom: "15px",
              padding: "10px",
              background: "#374151",
              borderRadius: "5px",
              fontSize: "11px",
            }}
          >
            <strong
              style={{
                color: "#9ca3af",
                display: "block",
                marginBottom: "5px",
              }}
            >
              🔧 Troubleshooting:
            </strong>
            <ol style={{ margin: "5px 0 0 15px", padding: 0 }}>
              <li>Turn printer ON and ensure it has paper</li>
              <li>Enable Bluetooth on your computer</li>
              <li>Put printer in pairing mode (blinking light)</li>
              <li>Click "Scan All Devices" to see available devices</li>
              <li>Select your printer from the list</li>
              <li>If still fails, try restarting browser</li>
            </ol>
          </div>

          {/* Debug Log */}
          <div style={{ marginBottom: "10px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "5px",
              }}
            >
              <strong style={{ fontSize: "12px", color: "#9ca3af" }}>
                📝 Debug Log:
              </strong>
              <button
                onClick={clearDebugLog}
                style={{
                  background: "#6b7280",
                  color: "white",
                  border: "none",
                  padding: "3px 8px",
                  borderRadius: "3px",
                  cursor: "pointer",
                  fontSize: "10px",
                }}
              >
                Clear Log
              </button>
            </div>
            <div
              style={{
                height: "200px",
                overflowY: "auto",
                background: "#111827",
                padding: "10px",
                borderRadius: "5px",
                fontSize: "11px",
              }}
            >
              {debugLog.length === 0 ? (
                <div
                  style={{
                    color: "#6b7280",
                    textAlign: "center",
                    padding: "20px",
                  }}
                >
                  No debug logs yet. Try connecting to see logs.
                </div>
              ) : (
                debugLog.map((log, i) => {
                  let color = "#9ca3af"; // Default
                  if (log.includes("ERROR") || log.includes("❌"))
                    color = "#ef4444";
                  if (log.includes("SUCCESS") || log.includes("✅"))
                    color = "#10b981";
                  if (log.includes("WARNING") || log.includes("⚠️"))
                    color = "#f59e0b";
                  if (log.includes("INFO") || log.includes("🔍"))
                    color = "#3b82f6";

                  return (
                    <div
                      key={i}
                      style={{
                        marginBottom: "4px",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        color,
                        borderLeft: `3px solid ${color}`,
                        paddingLeft: "8px",
                      }}
                    >
                      {log}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div
            style={{
              display: "flex",
              gap: "10px",
              fontSize: "11px",
              color: "#9ca3af",
            }}
          >
            <span>💡 Quick test: </span>
            <button
              onClick={() => {
                if (!navigator.bluetooth) {
                  alert("Web Bluetooth not supported in this browser");
                } else {
                  alert("Bluetooth is supported! Try connecting.");
                }
              }}
              style={{
                background: "transparent",
                color: "#3b82f6",
                border: "1px solid #3b82f6",
                padding: "3px 8px",
                borderRadius: "3px",
                cursor: "pointer",
                fontSize: "10px",
              }}
            >
              Test Browser Support
            </button>
            <button
              onClick={() => {
                localStorage.removeItem("pos58d_connection");
                alert("Saved printer connection cleared. Refresh page.");
              }}
              style={{
                background: "transparent",
                color: "#ef4444",
                border: "1px solid #ef4444",
                padding: "3px 8px",
                borderRadius: "3px",
                cursor: "pointer",
                fontSize: "10px",
              }}
            >
              Clear Saved Printer
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default DebugPrinter;
