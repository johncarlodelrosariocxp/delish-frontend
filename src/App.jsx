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
import PropTypes from "prop-types";
import { setUser } from "./redux/slices/userSlice";

// Debug component - remove after testing
function DebugAuth() {
  const user = useSelector((state) => state.user);
  const token = localStorage.getItem("token");
  console.log("🔍 AUTH DEBUG:", {
    reduxIsAuth: user.isAuth,
    reduxToken: user.token,
    localStorageToken: token,
    userData: user,
  });
  return null;
}

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

// Service Worker Registration
const registerServiceWorker = async () => {
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      });

      console.log("✅ Service Worker registered:", registration.scope);
      return registration;
    } catch (error) {
      console.error("❌ Service Worker registration failed:", error);
      return null;
    }
  }
  return null;
};

// Install Prompt Component
const InstallPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    const checkIfStandalone = () => {
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        window.navigator.standalone === true;
      setIsStandalone(standalone);

      if (!standalone) {
        // Check if user declined recently (24-hour cooldown)
        const declinedTime = localStorage.getItem("install_prompt_declined");
        if (declinedTime) {
          const hoursSinceDecline =
            (Date.now() - parseInt(declinedTime)) / (1000 * 60 * 60);
          if (hoursSinceDecline < 24) {
            return;
          }
        }

        // Show prompt after 10 seconds
        setTimeout(() => {
          setShowPrompt(true);
        }, 10000);
      }
    };

    checkIfStandalone();
  }, []);

  const handleInstallClick = () => {
    setShowPrompt(false);

    // Show browser-specific instructions
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);

    let message = "";
    if (isIOS) {
      message =
        'To install:\n1. Tap the Share button (square with arrow up)\n2. Scroll down and tap "Add to Home Screen"';
    } else if (isAndroid) {
      message =
        'To install:\n1. Tap the menu (⋮) in your browser\n2. Select "Install app" or "Add to Home Screen"';
    } else {
      message =
        "To install:\nClick the install icon (📱) in your browser address bar";
    }

    alert(message);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("install_prompt_declined", Date.now());
  };

  if (isStandalone || !showPrompt) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        left: "20px",
        right: "20px",
        backgroundColor: "white",
        borderRadius: "12px",
        padding: "16px",
        boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
        zIndex: 10000,
        border: "1px solid #e5e7eb",
        maxWidth: "500px",
        margin: "0 auto",
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

function Layout() {
  const dispatch = useDispatch();
  const isLoading = useLoadData();
  const location = useLocation();
  const hideHeaderRoutes = ["/auth"];
  const user = useSelector((state) => state.user);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [autoSaveInterval, setAutoSaveInterval] = useState(null);

  // ✅ FIXED: Check both Redux state AND localStorage as fallback
  const isAuthenticated = user.isAuth || localStorage.getItem("token");

  // Setup data persistence when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      // Load saved data
      const savedState = loadAppData("app_state");
      if (savedState?.user && !user.isAuth) {
        dispatch(setUser(savedState.user));
      }

      // Setup auto-save every 30 seconds
      const interval = setInterval(() => {
        if (hasUnsavedChanges) {
          saveCurrentState();
          setHasUnsavedChanges(false);
        }
      }, 30000);

      setAutoSaveInterval(interval);

      // Setup emergency save
      const handleBeforeUnload = () => {
        saveCurrentState();
      };

      const handleVisibilityChange = () => {
        if (document.visibilityState === "hidden") {
          saveCurrentState();
        }
      };

      window.addEventListener("beforeunload", handleBeforeUnload);
      document.addEventListener("visibilitychange", handleVisibilityChange);

      // Register service worker for PWA
      registerServiceWorker();

      return () => {
        clearInterval(interval);
        window.removeEventListener("beforeunload", handleBeforeUnload);
        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange
        );
      };
    }
  }, [isAuthenticated, hasUnsavedChanges, user.isAuth, dispatch]);

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

  // Listen for save events from index.html
  useEffect(() => {
    const handleSaveState = () => {
      saveCurrentState();
    };

    const handleLoadState = (event) => {
      loadStateFromStorage(event.detail);
    };

    window.addEventListener("saveAppState", handleSaveState);
    window.addEventListener("loadAppState", handleLoadState);

    return () => {
      window.removeEventListener("saveAppState", handleSaveState);
      window.removeEventListener("loadAppState", handleLoadState);
    };
  }, []);

  const loadStateFromStorage = (savedData) => {
    if (savedData && !user.isAuth) {
      // Try to restore user session from localStorage
      const token = localStorage.getItem("token");
      const userData = localStorage.getItem("user");

      if (token && userData) {
        try {
          const parsedUser = JSON.parse(userData);
          dispatch(
            setUser({
              ...parsedUser,
              token,
              isAuth: true,
            })
          );
          console.log("🔐 Restored user session from localStorage");
        } catch (error) {
          console.error("Error parsing saved user data:", error);
        }
      }
    }
  };

  const getCurrentState = () => {
    // Get all Redux state
    const state = {
      user: user,
      timestamp: new Date().toISOString(),
      // Add other state slices here as needed
    };
    return state;
  };

  const saveCurrentState = () => {
    if (!isAuthenticated) return;

    const currentState = getCurrentState();

    saveAppData("app_state", currentState);
    localStorage.setItem("delish_pos_state", JSON.stringify(currentState));

    // Dispatch event to clear unsaved changes flag
    window.dispatchEvent(new CustomEvent("dataSaved"));

    console.log("💾 App state saved");
  };

  // Mark data as changed (call this whenever user modifies data)
  const markDataChanged = () => {
    setHasUnsavedChanges(true);
    window.markDataChanged?.();

    // Debounced save after 2 seconds of inactivity
    setTimeout(() => {
      if (hasUnsavedChanges) {
        saveCurrentState();
        setHasUnsavedChanges(false);
      }
    }, 2000);
  };

  if (isLoading) return <FullScreenLoader />;

  return (
    <>
      <DebugAuth /> {/* Remove this line after debugging */}
      {/* Offline Indicator */}
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
      {/* Auto-save Indicator */}
      {hasUnsavedChanges && (
        <div
          style={{
            position: "fixed",
            bottom: 10,
            left: 10,
            backgroundColor: "#F59E0B",
            color: "white",
            padding: "5px 10px",
            borderRadius: "5px",
            fontSize: "12px",
            zIndex: 9998,
          }}
        >
          ⚡ Changes not saved
        </div>
      )}
      {/* Install Prompt for Mobile */}
      <InstallPrompt />
      {!hideHeaderRoutes.includes(location.pathname) && isAuthenticated && (
        <Header />
      )}
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoutes>
              <Home markDataChanged={markDataChanged} />
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
              <Orders markDataChanged={markDataChanged} />
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
  );
}

function ProtectedRoutes({ children, markDataChanged }) {
  const user = useSelector((state) => state.user);
  const dispatch = useDispatch();

  // ✅ FIXED: Check both Redux state AND localStorage as fallback
  const isAuthenticated = user.isAuth || localStorage.getItem("token");

  // Attempt to restore session from localStorage if Redux doesn't have it
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
          console.log("🔄 Restored user session from localStorage");
        } catch (error) {
          console.error("Error parsing user data from localStorage:", error);
        }
      }
    }
  }, [user.isAuth, dispatch]);

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  // Clone children and pass markDataChanged prop
  const childrenWithProps = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, { markDataChanged });
    }
    return child;
  });

  return childrenWithProps;
}

ProtectedRoutes.propTypes = {
  children: PropTypes.node.isRequired,
  markDataChanged: PropTypes.func,
};

function App() {
  // Clear app data on logout
  useEffect(() => {
    const handleLogout = () => {
      // Clear all delish app data
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("delish_")) {
          localStorage.removeItem(key);
        }
      });
      localStorage.removeItem("delish_pos_state");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    };

    // Listen for logout events
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
