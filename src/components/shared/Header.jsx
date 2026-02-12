import { useState, useEffect } from "react";
import {
  FaUserCircle,
  FaBars,
  FaTimes,
  FaBox,
  FaTachometerAlt,
  FaBluetooth,
  FaBluetoothB,
} from "react-icons/fa";
import logo from "../../assets/images/delish.jpg";
import { useDispatch, useSelector } from "react-redux";
import { IoLogOut } from "react-icons/io5";
import { useMutation } from "@tanstack/react-query";
import { logout } from "../../https";
import { removeUser } from "../../redux/slices/userSlice";
import { useNavigate, useLocation } from "react-router-dom";
import { useBluetooth } from "../../contexts/BluetoothContext";

const Header = () => {
  const userData = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  // Bluetooth Context
  const {
    isConnected,
    isConnecting,
    printerName,
    connectionStatus,
    connectBluetooth,
    disconnectBluetooth,
  } = useBluetooth();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Debug user data
  useEffect(() => {
    console.log("🔍 HEADER - User Data:", userData);
    console.log("🔍 HEADER - User Role:", userData?.role);
    console.log(
      "🔍 HEADER - Can Access Dashboard:",
      ["Admin", "Manager", "Supervisor"].includes(userData?.role)
    );
  }, [userData]);

  const logoutMutation = useMutation({
    mutationFn: () => logout(),
    onSuccess: () => {
      console.log("Logout successful, redirecting to /auth");
      handleSuccessfulLogout();
    },
    onError: (error) => {
      console.error("Logout API error:", error);
      console.log("Clearing local state despite API error");
      handleSuccessfulLogout();
    },
  });

  const handleSuccessfulLogout = () => {
    dispatch(removeUser());
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    navigate("/auth", { replace: true });
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
    setIsMobileMenuOpen(false);
  };

  const confirmLogout = () => {
    console.log("Logout initiated");
    logoutMutation.mutate();
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Check if user can access dashboard
  const canAccessDashboard = ["Admin", "Manager", "Supervisor"].includes(
    userData?.role
  );

  // Handle Bluetooth connection
  const handleBluetoothClick = () => {
    if (isConnected) {
      disconnectBluetooth();
    } else {
      connectBluetooth();
    }
  };

  // Get Bluetooth status text
  const getBluetoothStatusText = () => {
    if (isConnected) return "Connected";
    if (isConnecting) return "Connecting...";
    return "Disconnected";
  };

  return (
    <>
      {/* Fixed Header - Liquid Glass Design */}
      <header className="fixed top-0 left-0 right-0 z-50 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center py-3 px-4 sm:px-6 bg-gray-500/30 backdrop-blur-xl backdrop-saturate-150 border-b border-white/20 shadow-lg">
        {/* Logo and Hamburger */}
        <div className="flex items-center justify-between w-full sm:w-auto">
          <div
            onClick={() => {
              navigate("/");
              setIsMobileMenuOpen(false);
            }}
            className="flex items-center gap-2 cursor-pointer"
          >
            <img src={logo} className="h-7 w-7 rounded-full" alt="delish logo" />
            <h1 className="text-base font-semibold text-white tracking-wide drop-shadow-md">
              DELISH
            </h1>
          </div>

          {/* Hamburger Button - Mobile Only */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="sm:hidden text-white text-xl p-1 hover:bg-white/10 rounded-lg transition-all"
          >
            {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>

        {/* Desktop Navigation - Hidden on mobile */}
        <div className="hidden sm:flex items-center gap-4">
          {/* Bluetooth Status */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleBluetoothClick}
              disabled={isConnecting}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-sm backdrop-blur-sm shadow-md ${
                isConnected
                  ? "bg-green-600/80 text-white hover:bg-green-700/90 border border-green-400/50"
                  : isConnecting
                  ? "bg-yellow-500/80 text-white cursor-not-allowed border border-yellow-400/50"
                  : "bg-blue-600/80 text-white hover:bg-blue-700/90 border border-blue-400/50"
              }`}
              title={
                printerName
                  ? `Connected to: ${printerName}`
                  : "Connect to Bluetooth printer"
              }
            >
              {isConnected ? <FaBluetoothB /> : <FaBluetooth />}
              <span className="text-xs font-medium">
                {getBluetoothStatusText()}
              </span>
            </button>
          </div>

          {/* Dashboard Button for Desktop */}
          {canAccessDashboard && (
            <button
              onClick={() => navigate("/dashboard")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all backdrop-blur-sm shadow-md ${
                location.pathname === "/dashboard"
                  ? "bg-gray-700/90 text-white shadow-lg border border-white/30"
                  : "bg-gray-600/80 text-white hover:bg-gray-700/90 hover:shadow-md border border-white/10"
              }`}
            >
              <FaTachometerAlt className="text-white text-lg" />
              <span className="text-sm font-medium">Dashboard</span>
            </button>
          )}

          {/* Inventory Button for Desktop */}
          <button
            onClick={() => navigate("/inventory")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all backdrop-blur-sm shadow-md ${
              location.pathname === "/inventory"
                ? "bg-gray-700/90 text-white shadow-lg border border-white/30"
                : "bg-gray-600/80 text-white hover:bg-gray-700/90 hover:shadow-md border border-white/10"
            }`}
          >
            <FaBox className="text-white text-lg" />
            <span className="text-sm font-medium">Inventory</span>
          </button>

          {/* Desktop User Info */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 cursor-pointer bg-white/5 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/10">
              <FaUserCircle className="text-white text-2xl drop-shadow-md" />
              <div className="flex flex-col items-start">
                <h1 className="text-sm text-white font-semibold tracking-wide drop-shadow-md">
                  {userData?.name || "TEST USER"}
                </h1>
                <p className="text-xs text-gray-200 font-medium drop-shadow">
                  {userData?.role || "Role"}
                </p>
              </div>
              <button
                onClick={handleLogoutClick}
                disabled={logoutMutation.isLoading}
                className="text-white ml-1 hover:text-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white/10 p-1 rounded-full hover:bg-white/20"
                title="Logout"
              >
                <IoLogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Spacer to prevent content from hiding under fixed header */}
      <div className="h-[72px] sm:h-[76px]"></div>

      {/* Mobile Menu Overlay - Liquid Glass Design */}
      {isMobileMenuOpen && (
        <div className="sm:hidden fixed inset-0 z-50 mt-[72px] bg-gray-500/30 backdrop-blur-xl backdrop-saturate-150">
          <div className="flex flex-col p-6 space-y-6 h-full overflow-y-auto">
            {/* User Info */}
            <div className="flex items-center gap-3 p-4 bg-gray-600/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-lg">
              <FaUserCircle className="text-white text-3xl drop-shadow-md" />
              <div className="flex flex-col items-start">
                <h1 className="text-lg text-white font-semibold tracking-wide drop-shadow-md">
                  {userData?.name || "TEST USER"}
                </h1>
                <p className="text-sm text-gray-200 font-medium drop-shadow">
                  {userData?.role || "Role"}
                </p>
              </div>
            </div>

            {/* Bluetooth Section */}
            <div className="p-4 bg-gray-700/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-lg">
              <h3 className="text-white font-medium mb-2 drop-shadow-md">Bluetooth Printer</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p
                    className={`text-sm font-semibold drop-shadow ${
                      isConnected
                        ? "text-green-300"
                        : isConnecting
                        ? "text-yellow-300"
                        : "text-gray-300"
                    }`}
                  >
                    {getBluetoothStatusText()}
                  </p>
                  {printerName && (
                    <p className="text-xs text-gray-200 mt-1 truncate drop-shadow">
                      {printerName}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleBluetoothClick}
                  disabled={isConnecting}
                  className={`px-4 py-2 rounded-xl text-sm font-medium backdrop-blur-sm shadow-md border border-white/20 ${
                    isConnected
                      ? "bg-red-600/80 text-white hover:bg-red-700/90"
                      : isConnecting
                      ? "bg-yellow-500/80 text-white cursor-not-allowed"
                      : "bg-blue-600/80 text-white hover:bg-blue-700/90"
                  }`}
                >
                  {isConnected ? "Disconnect" : "Connect"}
                </button>
              </div>
            </div>

            {/* Menu Items */}
            <div className="space-y-4">
              {/* Dashboard Button for Mobile */}
              {canAccessDashboard && (
                <div
                  onClick={() => {
                    navigate("/dashboard");
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all backdrop-blur-sm border ${
                    location.pathname === "/dashboard"
                      ? "bg-gray-700/90 border-white/40 shadow-lg"
                      : "bg-gray-600/80 border-white/10 hover:bg-gray-700/90"
                  }`}
                >
                  <FaTachometerAlt className="text-white text-xl drop-shadow" />
                  <span className="text-white font-medium drop-shadow">Dashboard</span>
                </div>
              )}

              {/* Inventory Button for Mobile */}
              <div
                onClick={() => {
                  navigate("/inventory");
                  setIsMobileMenuOpen(false);
                }}
                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all backdrop-blur-sm border ${
                  location.pathname === "/inventory"
                    ? "bg-gray-700/90 border-white/40 shadow-lg"
                    : "bg-gray-600/80 border-white/10 hover:bg-gray-700/90"
                }`}
              >
                <FaBox className="text-white text-xl drop-shadow" />
                <span className="text-white font-medium drop-shadow">Inventory</span>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogoutClick}
                disabled={logoutMutation.isLoading}
                className="flex items-center gap-3 p-3 bg-red-600/80 backdrop-blur-sm rounded-xl cursor-pointer hover:bg-red-700/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed w-full text-left border border-red-400/30 shadow-lg"
              >
                <IoLogOut className="text-white text-xl drop-shadow" />
                <span className="text-white font-medium drop-shadow">
                  {logoutMutation.isLoading ? "Logging out..." : "Logout"}
                </span>
              </button>
            </div>

            {/* Quick Navigation Links */}
            <div className="pt-4 border-t border-white/20">
              <h3 className="text-white font-medium mb-3 drop-shadow-md">Quick Links</h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    navigate("/orders");
                    setIsMobileMenuOpen(false);
                  }}
                  className="p-2 bg-gray-600/80 backdrop-blur-sm rounded-xl text-white text-sm hover:bg-gray-700/90 transition-all border border-white/10 shadow-md"
                >
                  Orders
                </button>
                <button
                  onClick={() => {
                    navigate("/tables");
                    setIsMobileMenuOpen(false);
                  }}
                  className="p-2 bg-gray-600/80 backdrop-blur-sm rounded-xl text-white text-sm hover:bg-gray-700/90 transition-all border border-white/10 shadow-md"
                >
                  Tables
                </button>
                <button
                  onClick={() => {
                    navigate("/menu");
                    setIsMobileMenuOpen(false);
                  }}
                  className="p-2 bg-gray-600/80 backdrop-blur-sm rounded-xl text-white text-sm hover:bg-gray-700/90 transition-all border border-white/10 shadow-md"
                >
                  Menu
                </button>
                <button
                  onClick={() => {
                    navigate("/");
                    setIsMobileMenuOpen(false);
                  }}
                  className="p-2 bg-gray-600/80 backdrop-blur-sm rounded-xl text-white text-sm hover:bg-gray-700/90 transition-all border border-white/10 shadow-md"
                >
                  Home
                </button>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="mt-8 flex items-center justify-center gap-2 p-3 bg-gray-700/80 backdrop-blur-sm rounded-xl text-white font-medium hover:bg-gray-600/90 transition-all border border-white/20 shadow-lg"
            >
              <FaTimes className="text-sm" />
              Close Menu
            </button>
          </div>
        </div>
      )}

      {/* Logout Confirmation Popup - Glass Design */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-6 w-full max-w-md shadow-2xl border border-white/30">
            <h3 className="text-lg font-semibold text-gray-900 mb-2 drop-shadow">
              Confirm Logout
            </h3>
            <p className="text-gray-700 mb-6 drop-shadow">
              Are you sure you want to logout?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelLogout}
                className="px-4 py-2 text-gray-800 bg-gray-200/80 backdrop-blur-sm rounded-xl hover:bg-gray-300/90 transition-all border border-gray-300/50 shadow-md"
                disabled={logoutMutation.isLoading}
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                className="px-4 py-2 bg-red-600/90 backdrop-blur-sm text-white rounded-xl hover:bg-red-700/90 transition-all flex items-center gap-2 border border-red-400/50 shadow-md"
                disabled={logoutMutation.isLoading}
              >
                {logoutMutation.isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Logging out...
                  </>
                ) : (
                  "Yes, Logout"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;