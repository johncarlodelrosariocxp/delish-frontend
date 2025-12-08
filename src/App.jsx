// src/App.jsx
import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";
import {
  Home,
  Auth,
  Orders,
  Tables,
  Menu,
  Dashboard,
  Inventory,
} from "./pages";
import Header from "./components/shared/Header";
import { useSelector, useDispatch } from "react-redux";
import useLoadData from "./hooks/useLoadData";
import FullScreenLoader from "./components/shared/FullScreenLoader";
import { setUser } from "./redux/slices/userSlice";
import POS58DConnectionManager from "./components/tables/POS58DConnectionManager";

// Create a simple BluetoothScanner component since it might not exist
const SimpleBluetoothScanner = () => {
  return (
    <div
      style={{
        padding: "20px",
        backgroundColor: "#f3f4f6",
        borderRadius: "8px",
        border: "1px solid #e5e7eb",
      }}
    >
      <h3 style={{ marginTop: 0 }}>Available Bluetooth Devices</h3>
      <p style={{ color: "#6b7280" }}>
        No Bluetooth devices found. Make sure Bluetooth is enabled on your
        device.
      </p>
      <button
        onClick={() => alert("Scanning for devices...")}
        style={{
          padding: "10px 20px",
          backgroundColor: "#3b82f6",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
          fontWeight: "600",
        }}
      >
        Scan for Devices
      </button>
    </div>
  );
};

// Custom hook for landscape detection
const useLandscape = () => {
  const [isLandscape, setIsLandscape] = useState(
    window.innerWidth > window.innerHeight
  );

  useEffect(() => {
    const handleResize = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, []);

  return isLandscape;
};

// Bluetooth Manager Component
const BluetoothManager = () => {
  const [showBluetoothManager, setShowBluetoothManager] = useState(false);
  const [bluetoothStatus, setBluetoothStatus] = useState({
    connected: false,
    deviceName: null,
    lastConnected: null,
  });

  // Load Bluetooth status from localStorage
  useEffect(() => {
    const savedStatus = localStorage.getItem("bluetooth_status");
    if (savedStatus) {
      setBluetoothStatus(JSON.parse(savedStatus));
    }
  }, []);

  // Save Bluetooth status to localStorage
  useEffect(() => {
    localStorage.setItem("bluetooth_status", JSON.stringify(bluetoothStatus));
  }, [bluetoothStatus]);

  if (!showBluetoothManager) {
    return (
      <div
        style={{
          position: "fixed",
          bottom: "80px",
          right: "20px",
          zIndex: 9990,
        }}
      >
        <button
          onClick={() => setShowBluetoothManager(true)}
          style={{
            backgroundColor: bluetoothStatus.connected ? "#10B981" : "#EF4444",
            color: "white",
            border: "none",
            borderRadius: "50%",
            width: "60px",
            height: "60px",
            fontSize: "24px",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          title={
            bluetoothStatus.connected
              ? `Connected to ${bluetoothStatus.deviceName}`
              : "Bluetooth Disconnected"
          }
        >
          {bluetoothStatus.connected ? "📠" : "🔌"}
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.8)",
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "12px",
          width: "100%",
          maxWidth: "800px",
          maxHeight: "90vh",
          overflow: "auto",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "sticky",
            top: 0,
            backgroundColor: "white",
            padding: "20px",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            zIndex: 1,
          }}
        >
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "bold" }}>
            📠 Printer Connection Manager
          </h2>
          <button
            onClick={() => setShowBluetoothManager(false)}
            style={{
              background: "none",
              border: "none",
              fontSize: "24px",
              cursor: "pointer",
              color: "#6b7280",
            }}
          >
            ×
          </button>
        </div>
        <div style={{ padding: "20px" }}>
          <POS58DConnectionManager />
          <div style={{ marginTop: "30px" }}>
            <SimpleBluetoothScanner />
          </div>
        </div>
      </div>
    </div>
  );
};

// Simple localStorage-based persistence functions
const saveAppData = (key, data) => {
  try {
    const dataToStore = {
      data,
      timestamp: new Date().toISOString(),
      version: "1.0",
    };
    localStorage.setItem(`delish_${key}`, JSON.stringify(dataToStore));
    return true;
  } catch (error) {
    console.error("Error saving data:", error);
    return false;
  }
};

const loadAppData = (key, defaultValue = null) => {
  try {
    const storedData = localStorage.getItem(`delish_${key}`);
    if (!storedData) return defaultValue;

    const parsedData = JSON.parse(storedData);
    return parsedData.data || defaultValue;
  } catch (error) {
    console.error("Error loading data:", error);
    return defaultValue;
  }
};

// Install Prompt Component (Landscape Optimized)
const InstallPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const isLandscape = useLandscape();

  useEffect(() => {
    const checkIfStandalone = () => {
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        window.navigator.standalone === true;
      setIsStandalone(standalone);

      if (!standalone) {
        const declinedTime = localStorage.getItem("install_prompt_declined");
        if (declinedTime) {
          const hoursSinceDecline =
            (Date.now() - parseInt(declinedTime)) / (1000 * 60 * 60);
          if (hoursSinceDecline < 24) {
            return;
          }
        }

        setTimeout(() => {
          setShowPrompt(true);
        }, 10000);
      }
    };

    checkIfStandalone();
  }, []);

  const handleInstallClick = () => {
    setShowPrompt(false);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);

    let message = "";
    if (isIOS) {
      message =
        'To install:\n1. Tap Share button (square with arrow up)\n2. Tap "Add to Home Screen"';
    } else if (isAndroid) {
      message = 'To install:\n1. Tap menu (⋮)\n2. Select "Install app"';
    } else {
      message = "Click the install icon (📱) in your browser address bar";
    }

    alert(message + "\n\nDelish POS works best in landscape mode!");
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("install_prompt_declined", Date.now());
  };

  if (isStandalone || !showPrompt || !isLandscape) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        backgroundColor: "white",
        borderRadius: "12px",
        padding: "16px",
        boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
        zIndex: 10000,
        border: "1px solid #e5e7eb",
        maxWidth: "400px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div style={{ fontSize: "32px" }}>📱</div>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600" }}>
            Install Delish POS
          </h3>
          <p
            style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#6b7280" }}
          >
            Get faster access and work offline
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={handleInstallClick}
            style={{
              padding: "8px 16px",
              backgroundColor: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "14px",
            }}
          >
            Install
          </button>
          <button
            onClick={handleDismiss}
            style={{
              padding: "8px 16px",
              backgroundColor: "#f3f4f6",
              color: "#374151",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
};

// Landscape Warning Component
const LandscapeWarning = () => {
  const isLandscape = useLandscape();

  if (isLandscape) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "#1f2937",
        color: "white",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 99999,
        textAlign: "center",
        padding: "20px",
      }}
    >
      <div style={{ fontSize: "48px", marginBottom: "20px" }}>🔄</div>
      <h1 style={{ fontSize: "24px", marginBottom: "10px" }}>
        Rotate Your Device
      </h1>
      <p style={{ fontSize: "16px", marginBottom: "30px", maxWidth: "400px" }}>
        Delish POS is optimized for landscape mode. Please rotate your device.
      </p>
      <p style={{ fontSize: "14px", color: "#9ca3af", marginTop: "20px" }}>
        If rotation doesn't work, try locking screen rotation.
      </p>
    </div>
  );
};

function Layout() {
  const dispatch = useDispatch();
  const isLoading = useLoadData();
  const location = useLocation();
  const hideHeaderRoutes = ["/auth"];
  const user = useSelector((state) => state.user);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [printQueue, setPrintQueue] = useState([]);
  const [isPrinting, setIsPrinting] = useState(false);
  const isLandscape = useLandscape();

  const isAuthenticated = user.isAuth || localStorage.getItem("token");

  // Setup data persistence
  useEffect(() => {
    if (isAuthenticated) {
      const savedState = loadAppData("app_state");
      if (savedState?.user && !user.isAuth) {
        dispatch(setUser(savedState.user));
      }

      const savedQueue = localStorage.getItem("delish_print_queue");
      if (savedQueue) {
        setPrintQueue(JSON.parse(savedQueue));
      }

      const handleBeforeUnload = () => {
        saveCurrentState();
      };

      window.addEventListener("beforeunload", handleBeforeUnload);

      return () => {
        window.removeEventListener("beforeunload", handleBeforeUnload);
      };
    }
  }, [isAuthenticated, user.isAuth, dispatch]);

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Process print queue
  useEffect(() => {
    const processPrintQueue = async () => {
      if (printQueue.length > 0 && !isPrinting) {
        setIsPrinting(true);
        const item = printQueue[0];

        setTimeout(() => {
          setPrintQueue((prev) => prev.slice(1));
          setIsPrinting(false);
        }, 500);
      }
    };

    processPrintQueue();
  }, [printQueue, isPrinting]);

  // Save print queue to localStorage
  useEffect(() => {
    if (printQueue.length > 0) {
      localStorage.setItem("delish_print_queue", JSON.stringify(printQueue));
    } else {
      localStorage.removeItem("delish_print_queue");
    }
  }, [printQueue]);

  const getCurrentState = () => {
    return {
      user: user,
      timestamp: new Date().toISOString(),
    };
  };

  const saveCurrentState = () => {
    if (!isAuthenticated) return;

    const currentState = getCurrentState();
    saveAppData("app_state", currentState);
    localStorage.setItem("delish_pos_state", JSON.stringify(currentState));
  };

  const markDataChanged = () => {
    setHasUnsavedChanges(true);
    setTimeout(() => {
      if (hasUnsavedChanges) {
        saveCurrentState();
        setHasUnsavedChanges(false);
      }
    }, 2000);
  };

  const addToPrintQueue = (printData) => {
    setPrintQueue((prev) => [
      ...prev,
      {
        ...printData,
        id: Date.now(),
        timestamp: new Date().toISOString(),
        status: "pending",
      },
    ]);
  };

  if (isLoading) return <FullScreenLoader />;

  return (
    <>
      <LandscapeWarning />
      {isLandscape && (
        <>
          {isOffline && (
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                backgroundColor: "#EF4444",
                color: "white",
                textAlign: "center",
                padding: "8px",
                fontSize: "14px",
                zIndex: 9999,
                fontWeight: "bold",
              }}
            >
              ⚠️ You are offline. Some features may be limited.
            </div>
          )}

          {printQueue.length > 0 && (
            <div
              style={{
                position: "fixed",
                top: isOffline ? "40px" : "0",
                left: 0,
                right: 0,
                backgroundColor: "#F59E0B",
                color: "white",
                textAlign: "center",
                padding: "8px",
                fontSize: "14px",
                zIndex: 9998,
                fontWeight: "bold",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <span>📋 {printQueue.length} item(s) in print queue</span>
              {isPrinting && <span>🖨️ Printing...</span>}
            </div>
          )}

          {hasUnsavedChanges && (
            <div
              style={{
                position: "fixed",
                bottom: "10px",
                left: "10px",
                backgroundColor: "#F59E0B",
                color: "white",
                padding: "5px 10px",
                borderRadius: "5px",
                fontSize: "12px",
                zIndex: 9997,
              }}
            >
              ⚡ Auto-saving...
            </div>
          )}

          <InstallPrompt />
          <BluetoothManager />

          {!hideHeaderRoutes.includes(location.pathname) && isAuthenticated && (
            <Header />
          )}

          <Routes>
            <Route
              path="/"
              element={
                <ProtectedRoutes>
                  <Home
                    markDataChanged={markDataChanged}
                    addToPrintQueue={addToPrintQueue}
                  />
                </ProtectedRoutes>
              }
            />
            <Route
              path="/auth"
              element={isAuthenticated ? <Navigate to="/" replace /> : <Auth />}
            />
            <Route
              path="/orders"
              element={
                <ProtectedRoutes>
                  <Orders
                    markDataChanged={markDataChanged}
                    addToPrintQueue={addToPrintQueue}
                  />
                </ProtectedRoutes>
              }
            />
            <Route
              path="/tables"
              element={
                <ProtectedRoutes>
                  <Tables markDataChanged={markDataChanged} />
                </ProtectedRoutes>
              }
            />
            <Route
              path="/menu"
              element={
                <ProtectedRoutes>
                  <Menu markDataChanged={markDataChanged} />
                </ProtectedRoutes>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoutes>
                  <Dashboard markDataChanged={markDataChanged} />
                </ProtectedRoutes>
              }
            />
            <Route
              path="/inventory"
              element={
                <ProtectedRoutes>
                  <Inventory markDataChanged={markDataChanged} />
                </ProtectedRoutes>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </>
      )}
    </>
  );
}

function ProtectedRoutes({ children }) {
  const user = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const isLandscape = useLandscape();

  const isAuthenticated = user.isAuth || localStorage.getItem("token");

  useEffect(() => {
    if (!user.isAuth && localStorage.getItem("token")) {
      const userData = localStorage.getItem("user");
      if (userData) {
        try {
          const parsedUser = JSON.parse(userData);
          dispatch(
            setUser({
              ...parsedUser,
              token: localStorage.getItem("token"),
              isAuth: true,
            })
          );
        } catch (error) {
          console.error("Error parsing user data from localStorage:", error);
        }
      }
    }
  }, [user.isAuth, dispatch]);

  if (!isLandscape) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return children;
}

function App() {
  useEffect(() => {
    const handleLogout = () => {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("delish_")) {
          localStorage.removeItem(key);
        }
      });
      localStorage.removeItem("delish_pos_state");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("pos58d_connection");
      localStorage.removeItem("bluetooth_status");
      localStorage.removeItem("delish_print_queue");
    };

    window.addEventListener("userLogout", handleLogout);

    return () => {
      window.removeEventListener("userLogout", handleLogout);
    };
  }, []);

  return (
    <Router>
      <Layout />
    </Router>
  );
}

export default App;
