// src/components/tables/BluetoothScanner.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Button,
  Typography,
  List,
  ListItem,
  ListItemText,
  Paper,
  CircularProgress,
  Alert,
  Snackbar,
  Chip,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  Bluetooth as BluetoothIcon,
  BluetoothConnected as BluetoothConnectedIcon,
  Refresh as RefreshIcon,
  Usb as UsbIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";
import { useBluetooth } from "../../hooks/useBluetooth";
import {
  printerServiceUUID,
  printerCharacteristicUUID,
} from "../../constants/bluetooth";
import ConnectionStatus from "./ConnectionStatus";
import PrinterSettings from "./PrinterSettings";

const BluetoothScanner = () => {
  const {
    devices,
    isScanning,
    connectedDevice,
    isConnecting,
    error,
    scanDevices,
    connectToDevice,
    disconnectDevice,
    sendToPrinter,
    connectionStatus,
    reconnectAttempts,
    autoReconnectEnabled,
    toggleAutoReconnect,
  } = useBluetooth();

  const [selectedDevice, setSelectedDevice] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [testPrintContent, setTestPrintContent] = useState(
    "Test print from React POS"
  );
  const connectionCheckInterval = useRef(null);

  useEffect(() => {
    // Initial scan
    scanDevices();

    // Set up periodic connection health check
    connectionCheckInterval.current = setInterval(() => {
      if (connectedDevice && connectionStatus === "connected") {
        // Check connection health by sending a small ping command
        checkConnectionHealth();
      }
    }, 30000); // Check every 30 seconds

    return () => {
      if (connectionCheckInterval.current) {
        clearInterval(connectionCheckInterval.current);
      }
    };
  }, [connectedDevice, connectionStatus]);

  const checkConnectionHealth = async () => {
    try {
      // Send a small, harmless command to check if connection is still alive
      await sendToPrinter([0x1b, 0x40]); // ESC @ - Initialize printer
    } catch (error) {
      console.warn("Connection health check failed, attempting reconnect...");
      if (autoReconnectEnabled && connectedDevice) {
        await handleReconnect(connectedDevice);
      }
    }
  };

  const handleDeviceSelect = (device) => {
    setSelectedDevice(device);
  };

  const handleConnect = async () => {
    if (selectedDevice) {
      await connectToDevice(selectedDevice);
    }
  };

  const handleDisconnect = async () => {
    await disconnectDevice();
  };

  const handleReconnect = async (device) => {
    if (device) {
      await connectToDevice(device, true);
    }
  };

  const handleTestPrint = async () => {
    if (!connectedDevice) {
      alert("Please connect to a printer first");
      return;
    }

    const testText = `
================================
         TEST PRINT
================================
Date: ${new Date().toLocaleString()}
Device: ${connectedDevice.name}
Status: ${connectionStatus}
Reconnect Attempts: ${reconnectAttempts}
================================
${testPrintContent}
================================
    `;

    try {
      await sendToPrinter(testText);
    } catch (error) {
      console.error("Test print failed:", error);
    }
  };

  const handleRetryConnection = () => {
    if (connectedDevice) {
      handleReconnect(connectedDevice);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, maxWidth: 600, margin: "0 auto" }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h5" component="h2" gutterBottom>
          <BluetoothIcon sx={{ mr: 1, verticalAlign: "middle" }} />
          Bluetooth Printer Connection
        </Typography>
        <Tooltip title="Printer Settings">
          <IconButton onClick={() => setShowSettings(!showSettings)}>
            <SettingsIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <ConnectionStatus
        status={connectionStatus}
        device={connectedDevice}
        reconnectAttempts={reconnectAttempts}
        onRetry={handleRetryConnection}
        autoReconnect={autoReconnectEnabled}
        onToggleAutoReconnect={toggleAutoReconnect}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box mb={3}>
        <Button
          variant="contained"
          startIcon={<RefreshIcon />}
          onClick={scanDevices}
          disabled={isScanning || isConnecting}
          fullWidth
        >
          {isScanning ? "Scanning..." : "Scan for Bluetooth Devices"}
        </Button>
      </Box>

      {devices.length > 0 && (
        <Box mb={3}>
          <Typography variant="h6" gutterBottom>
            Available Devices:
          </Typography>
          <List>
            {devices.map((device) => (
              <ListItem
                key={device.id}
                button
                selected={selectedDevice?.id === device.id}
                onClick={() => handleDeviceSelect(device)}
                sx={{
                  mb: 1,
                  borderRadius: 1,
                  border: "1px solid",
                  borderColor:
                    selectedDevice?.id === device.id
                      ? "primary.main"
                      : "divider",
                  "&:hover": {
                    backgroundColor: "action.hover",
                  },
                }}
              >
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center">
                      <BluetoothIcon sx={{ mr: 1, fontSize: 20 }} />
                      {device.name}
                      {connectedDevice?.id === device.id && (
                        <Chip
                          label="Connected"
                          color="success"
                          size="small"
                          icon={<BluetoothConnectedIcon />}
                          sx={{ ml: 2 }}
                        />
                      )}
                    </Box>
                  }
                  secondary={`ID: ${device.id}`}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      <Box display="flex" gap={2} flexWrap="wrap">
        <Button
          variant="contained"
          color="primary"
          onClick={handleConnect}
          disabled={!selectedDevice || isConnecting || connectedDevice}
          startIcon={<BluetoothConnectedIcon />}
        >
          {isConnecting ? "Connecting..." : "Connect"}
        </Button>

        <Button
          variant="outlined"
          color="secondary"
          onClick={handleDisconnect}
          disabled={!connectedDevice || isConnecting}
        >
          Disconnect
        </Button>

        <Button
          variant="outlined"
          onClick={handleTestPrint}
          disabled={!connectedDevice || connectionStatus !== "connected"}
        >
          Test Print
        </Button>
      </Box>

      {showSettings && (
        <PrinterSettings
          testContent={testPrintContent}
          onTestContentChange={setTestPrintContent}
          onTestPrint={handleTestPrint}
          disabled={!connectedDevice}
        />
      )}
    </Paper>
  );
};

export default BluetoothScanner;
