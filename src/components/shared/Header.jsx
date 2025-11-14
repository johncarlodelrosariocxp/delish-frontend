// Header.jsx
import { useState, useEffect } from "react";
import { FaUserCircle, FaBell, FaBars, FaTimes, FaBox } from "react-icons/fa";
import logo from "../../assets/images/delish.jpg";
import { useDispatch, useSelector } from "react-redux";
import { IoLogOut } from "react-icons/io5";
import { useMutation } from "@tanstack/react-query";
import { logout } from "../../https";
import { removeUser } from "../../redux/slices/userSlice";
import { useNavigate } from "react-router-dom";
import { MdDashboard } from "react-icons/md";

const Header = () => {
  const userData = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const logoutMutation = useMutation({
    mutationFn: () => logout(),
    onSuccess: () => {
      console.log("Logout successful, redirecting to /auth");
      handleSuccessfulLogout();
    },
    onError: (error) => {
      console.error("Logout API error:", error);
      console.log("Clearing local state despite API error");
      // Even if API call fails, clear local state and redirect
      handleSuccessfulLogout();
    },
  });

  const handleSuccessfulLogout = () => {
    // Clear Redux state
    dispatch(removeUser());

    // Clear any localStorage/sessionStorage if used
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");

    // Redirect to auth page
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

  // Navigation items for mobile menu
  const mobileMenuItems = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: <MdDashboard className="text-white text-xl" />,
      show: userData.role === "Admin",
    },
    {
      name: "Inventory",
      path: "/inventory",
      icon: <FaBox className="text-white text-xl" />,
      show: true,
    },
    {
      name: "Notifications",
      path: "#",
      icon: <FaBell className="text-white text-xl" />,
      show: true,
    },
  ];

  return (
    <>
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center py-3 px-4 sm:px-6 bg-gray-500 relative">
        {/* Logo and Hamburger */}
        <div className="flex items-center justify-between w-full sm:w-auto">
          <div
            onClick={() => {
              navigate("/");
              setIsMobileMenuOpen(false);
            }}
            className="flex items-center gap-2 cursor-pointer"
          >
            <img src={logo} className="h-7 w-7" alt="delish logo" />
            <h1 className="text-base font-semibold text-white tracking-wide">
              DELISH
            </h1>
          </div>

          {/* Hamburger Button - Mobile Only */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="sm:hidden text-white text-xl p-1"
          >
            {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>

        {/* Desktop Navigation - Hidden on mobile */}
        <div className="hidden sm:flex items-center gap-4">
          {/* Inventory Button for Desktop */}
          <button
            onClick={() => navigate("/inventory")}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            <FaBox className="text-white text-lg" />
            <span className="text-sm font-medium">Inventory</span>
          </button>

          {/* Desktop User Info */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              {userData.role === "Admin" && (
                <MdDashboard
                  onClick={() => navigate("/dashboard")}
                  className="text-white text-xl cursor-pointer hover:text-gray-200 transition-colors"
                />
              )}
              <FaBell className="text-white text-xl cursor-pointer hover:text-gray-200 transition-colors" />
            </div>

            <div className="flex items-center gap-3 cursor-pointer">
              <FaUserCircle className="text-white text-2xl" />
              <div className="flex flex-col items-start">
                <h1 className="text-sm text-white font-semibold tracking-wide">
                  {userData.name || "TEST USER"}
                </h1>
                <p className="text-xs text-gray-300 font-medium">
                  {userData.role || "Role"}
                </p>
              </div>
              <button
                onClick={handleLogoutClick}
                disabled={logoutMutation.isLoading}
                className="text-white ml-1 hover:text-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <IoLogOut size={24} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="sm:hidden fixed inset-0 bg-gray-500 z-50 mt-16">
          <div className="flex flex-col p-6 space-y-6">
            {/* User Info */}
            <div className="flex items-center gap-3 p-4 bg-gray-600 rounded-lg">
              <FaUserCircle className="text-white text-3xl" />
              <div className="flex flex-col items-start">
                <h1 className="text-lg text-white font-semibold tracking-wide">
                  {userData.name || "TEST USER"}
                </h1>
                <p className="text-sm text-gray-300 font-medium">
                  {userData.role || "Role"}
                </p>
              </div>
            </div>

            {/* Menu Items */}
            <div className="space-y-4">
              {/* Inventory Button for Mobile */}
              <div
                onClick={() => {
                  navigate("/inventory");
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-3 p-3 bg-gray-600 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors"
              >
                <FaBox className="text-white text-xl" />
                <span className="text-white font-medium">Inventory</span>
              </div>

              {/* Other Menu Items */}
              {mobileMenuItems.map((item) =>
                item.show ? (
                  <div
                    key={item.name}
                    onClick={() => {
                      if (item.path !== "#") {
                        navigate(item.path);
                        setIsMobileMenuOpen(false);
                      }
                    }}
                    className="flex items-center gap-3 p-3 bg-gray-600 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors"
                  >
                    {item.icon}
                    <span className="text-white font-medium">{item.name}</span>
                  </div>
                ) : null
              )}

              {/* Logout Button */}
              <button
                onClick={handleLogoutClick}
                disabled={logoutMutation.isLoading}
                className="flex items-center gap-3 p-3 bg-red-600 rounded-lg cursor-pointer hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full text-left"
              >
                <IoLogOut className="text-white text-xl" />
                <span className="text-white font-medium">
                  {logoutMutation.isLoading ? "Logging out..." : "Logout"}
                </span>
              </button>
            </div>

            {/* Quick Navigation Links */}
            <div className="pt-4 border-t border-gray-400">
              <h3 className="text-white font-medium mb-3">Quick Links</h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    navigate("/orders");
                    setIsMobileMenuOpen(false);
                  }}
                  className="p-2 bg-gray-600 rounded text-white text-sm hover:bg-gray-700 transition-colors"
                >
                  Orders
                </button>
                <button
                  onClick={() => {
                    navigate("/tables");
                    setIsMobileMenuOpen(false);
                  }}
                  className="p-2 bg-gray-600 rounded text-white text-sm hover:bg-gray-700 transition-colors"
                >
                  Tables
                </button>
                <button
                  onClick={() => {
                    navigate("/menu");
                    setIsMobileMenuOpen(false);
                  }}
                  className="p-2 bg-gray-600 rounded text-white text-sm hover:bg-gray-700 transition-colors"
                >
                  Menu
                </button>
                <button
                  onClick={() => {
                    navigate("/");
                    setIsMobileMenuOpen(false);
                  }}
                  className="p-2 bg-gray-600 rounded text-white text-sm hover:bg-gray-700 transition-colors"
                >
                  Home
                </button>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="mt-8 flex items-center justify-center gap-2 p-3 bg-gray-700 rounded-lg text-white font-medium hover:bg-gray-600 transition-colors"
            >
              <FaTimes className="text-sm" />
              Close Menu
            </button>
          </div>
        </div>
      )}

      {/* Logout Confirmation Popup */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Confirm Logout
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to logout?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelLogout}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                disabled={logoutMutation.isLoading}
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
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
