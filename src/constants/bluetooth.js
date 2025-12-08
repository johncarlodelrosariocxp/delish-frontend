// src/constants/bluetooth.js

// POS58D Specific Bluetooth Configuration
export const POS58D_CONFIG = {
  TARGET_NAME: "POS58D",
  ALTERNATIVE_NAMES: ["POS-58D", "POS58", "BlueTooth Printer", "58mm"],

  // Service UUIDs for POS58D
  SERVICE_UUIDS: [
    "000018f0-0000-1000-8000-00805f9b34fb", // Primary service UUID
    "e7810a71-73ae-499d-8c15-faa9aef0c3f2", // Alternative
    "0000ff00-0000-1000-8000-00805f9b34fb", // Common Bluetooth printer service
    "00001101-0000-1000-8000-00805f9b34fb", // Serial Port Profile (SPP)
  ],

  // Characteristic UUID for writing
  WRITE_CHARACTERISTIC_UUIDS: [
    "00002af1-0000-1000-8000-00805f9b34fb", // Primary write characteristic
    "bef8d6c9-9c21-4c9e-b632-bd58c1009f9f", // Alternative
    "0000ff02-0000-1000-8000-00805f9b34fb", // Common write characteristic
  ],

  // Connection parameters
  CONNECTION_PARAMS: {
    keepAliveInterval: 15000, // Send keep-alive every 15 seconds
    maxReconnectAttempts: 10, // Maximum reconnection attempts
    reconnectDelay: 2000, // Delay between reconnection attempts (ms)
    connectionTimeout: 10000, // Connection timeout (ms)
    scanDuration: 10000, // Scan duration for device discovery
  },
};

// ESC/POS Commands for POS58D
export const ESC_POS_COMMANDS = {
  INIT: [0x1b, 0x40], // Initialize printer
  CUT: [0x1d, 0x56, 0x00], // Full cut
  PARTIAL_CUT: [0x1d, 0x56, 0x42, 0x00], // Partial cut
  BOLD_ON: [0x1b, 0x45, 0x01], // Bold on
  BOLD_OFF: [0x1b, 0x45, 0x00], // Bold off
  ALIGN_LEFT: [0x1b, 0x61, 0x00],
  ALIGN_CENTER: [0x1b, 0x61, 0x01],
  ALIGN_RIGHT: [0x1b, 0x61, 0x02],
  LINE_SPACING: [0x1b, 0x33, 0x60], // Set line spacing
  FEED_LINE: [0x0a], // Feed one line
  FEED_LINES: (n) => [0x1b, 0x64, n], // Feed n lines
  TEST: [0x1b, 0x74, 0x08], // Test print
  OPEN_DRAWER: [0x1b, 0x70, 0x00, 0x19, 0xfa], // Open cash drawer
  SET_SIZE: (n) => [0x1d, 0x21, n], // Set text size
  KEEP_ALIVE: [0x1b, 0x3f], // Keep-alive command
};

// Connection states
export const CONNECTION_STATES = {
  DISCONNECTED: "disconnected",
  SCANNING: "scanning",
  CONNECTING: "connecting",
  CONNECTED: "connected",
  RECONNECTING: "reconnecting",
  ERROR: "error",
  PAIRING: "pairing",
};

// Maximum values
export const MAX_RECONNECT_ATTEMPTS = 50; // High number for all-day connection
export const RECONNECT_DELAY = 2000; // 2 seconds between attempts
export const KEEP_ALIVE_INTERVAL = 10000; // Send keep-alive every 10 seconds
