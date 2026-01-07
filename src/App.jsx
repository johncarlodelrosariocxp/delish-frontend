import React, { useState, useEffect, useCallback, lazy, Suspense } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";
import Header from "./components/shared/Header";
import { useSelector, useDispatch } from "react-redux";
import useLoadData from "./hooks/useLoadData";
import FullScreenLoader from "./components/shared/FullScreenLoader";
import PropTypes from "prop-types";
import { setUser } from "./redux/slices/userSlice";
import { BluetoothProvider } from "./contexts/BluetoothContext";

// Lazy load pages - FIXED: Import from direct paths
const Home = lazy(() => import("./pages/Home"));
const Auth = lazy(() => import("./pages/Auth"));
const Orders = lazy(() => import("./pages/Orders"));
const Tables = lazy(() => import("./pages/Tables"));
const Menu = lazy(() => import("./pages/Menu"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Inventory = lazy(() => import("./pages/inventory")); // lowercase 'i'

// Cache
const cache = new Map();

const saveAppData = (key, data) => {
  try {
    const dataToStore = {
      data,
      timestamp: Date.now(),
      version: "1.0",
    };
    cache.set(key, dataToStore);
    localStorage.setItem(`delish_${key}`, JSON.stringify(dataToStore));
    return true;
  } catch (error) {
    console.error("Error saving data:", error);
    return false;
  }
};

const loadAppData = (key, defaultValue = null, maxAge = 5 * 60 * 1000) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < maxAge) {
    return cached.data;
  }

  try {
    const storedData = localStorage.getItem(`delish_${key}`);
    if (!storedData) return defaultValue;

    const parsedData = JSON.parse(storedData);
    if (maxAge && Date.now() - parsedData.timestamp > maxAge) {
      return defaultValue;
    }

    cache.set(key, parsedData);
    return parsedData.data || defaultValue;
  } catch (error) {
    console.error("Error loading data:", error);
    return defaultValue;
  }
};

const InstallPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

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
        right: "20px",
        backgroundColor: "white",
        borderRadius: "12px",
        padding: "16px",
        boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
        zIndex: 10000,
        border: "1px solid #e5e7eb",
        maxWidth: "400px",
        width: "auto",
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

  const isAuthenticated = user.isAuth || localStorage.getItem("token");

  useEffect(() => {
    if (isAuthenticated) {
      const savedState = loadAppData("app_state");
      if (savedState?.user && !user.isAuth) {
        dispatch(setUser(savedState.user));
      }
    }
  }, [isAuthenticated, user.isAuth, dispatch]);

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

  if (isLoading) return <FullScreenLoader />;

  return (
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
            padding: "6px",
            fontSize: "13px",
            zIndex: 9999,
            fontWeight: "bold",
          }}
        >
          ⚠️ Offline
        </div>
      )}
      <InstallPrompt />
      {!hideHeaderRoutes.includes(location.pathname) && isAuthenticated && (
        <Header />
      )}
      <Suspense fallback={<FullScreenLoader />}>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoutes>
                <Home />
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
                <Orders />
              </ProtectedRoutes>
            }
          />
          <Route
            path="/tables"
            element={
              <ProtectedRoutes>
                <Tables />
              </ProtectedRoutes>
            }
          />
          <Route
            path="/menu"
            element={
              <ProtectedRoutes>
                <Menu />
              </ProtectedRoutes>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoutes>
                <Dashboard />
              </ProtectedRoutes>
            }
          />
          <Route
            path="/inventory"
            element={
              <ProtectedRoutes>
                <Inventory />
              </ProtectedRoutes>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}

function ProtectedRoutes({ children }) {
  const user = useSelector((state) => state.user);
  const dispatch = useDispatch();

  const isAuthenticated = user.isAuth || localStorage.getItem("token");

  useEffect(() => {
    if (!user.isAuth && localStorage.getItem("token")) {
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
        } catch (error) {
          console.error("Error parsing user data:", error);
        }
      }
    }
  }, [user.isAuth, dispatch]);

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return children;
}

ProtectedRoutes.propTypes = {
  children: PropTypes.node.isRequired,
};

function App() {
  useEffect(() => {
    const handleLogout = () => {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("delish_")) {
          localStorage.removeItem(key);
        }
      });
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      cache.clear();
    };

    window.addEventListener("userLogout", handleLogout);
    return () => window.removeEventListener("userLogout", handleLogout);
  }, []);

  return (
    <BluetoothProvider>
      <Router>
        <Layout />
      </Router>
    </BluetoothProvider>
  );
}

export default App;
