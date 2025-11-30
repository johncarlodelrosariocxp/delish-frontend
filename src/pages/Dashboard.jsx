import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { MdCategory, MdAnalytics, MdReceipt, MdPayment } from "react-icons/md";
import { BiSolidDish } from "react-icons/bi";
import Metrics from "../components/dashboard/Metrics";
import RecentOrders from "../components/dashboard/RecentOrders";
import SalesAnalytics from "../components/dashboard/SalesAnalytics"; // You'll create this
import Modal from "../components/dashboard/Modal";

// Enhanced Debug Component - Optional for production
const DebugInfo = () => {
  const user = useSelector((state) => state.user);

  if (process.env.NODE_ENV === "production") return null; // Hide in production

  return (
    <div className="fixed top-4 left-4 bg-blue-600 text-white p-4 rounded-lg z-50 shadow-xl max-w-xs">
      <div className="text-sm space-y-2">
        <p>
          <strong>Role:</strong> {user.role || "Unknown"}
        </p>
        <p>
          <strong>Name:</strong> {user.name || "Unknown"}
        </p>
        <p>
          <strong>Is Admin:</strong>{" "}
          {user.role?.toLowerCase() === "admin" ? "✅ YES" : "❌ NO"}
        </p>
      </div>
    </div>
  );
};

// Updated buttons and tabs
const adminButtons = [
  { label: "Add Category", icon: <MdCategory />, action: "category" },
  { label: "Add Coffee", icon: <BiSolidDish />, action: "coffee" },
];

const tabs = [
  { key: "Metrics", label: "Metrics", icon: <MdAnalytics /> },
  { key: "Orders", label: "Orders", icon: <MdReceipt /> },
  { key: "Analytics", label: "Analytics", icon: <MdAnalytics /> },
  { key: "Payments", label: "Payments", icon: <MdPayment /> },
];

const Dashboard = () => {
  const user = useSelector((state) => state.user);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("Metrics");

  const isAdmin = user.role?.toLowerCase() === "admin";

  useEffect(() => {
    console.log("🛠️ DASHBOARD MOUNTED - USER DATA:", {
      role: user.role,
      isAdmin: user.role?.toLowerCase() === "admin",
      name: user.name,
    });

    document.title = isAdmin ? "POS | Admin Dashboard" : "POS | User Dashboard";
  }, [user.role, user.name, isAdmin]);

  const handleOpenModal = (action) => {
    if (action === "table") {
      setIsTableModalOpen(true);
    }
    // Add other modal handlers as needed
  };

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case "Metrics":
        return <Metrics />;
      case "Orders":
        return <RecentOrders />;
      case "Analytics":
        return <SalesAnalytics />;
      case "Payments":
        return (
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
            <div className="text-center py-12">
              <MdPayment className="mx-auto text-4xl text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                Payments Dashboard
              </h3>
              <p className="text-gray-500">
                Payment analytics and transaction history coming soon
              </p>
            </div>
          </div>
        );
      default:
        return <Metrics />;
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <DebugInfo />

      {/* Top Controls - Only show for admins */}
      {isAdmin && (
        <div className="bg-white border-b border-gray-200">
          <div className="container mx-auto flex flex-col md:flex-row items-start md:items-center justify-between py-6 px-6 md:px-4 gap-6">
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              {adminButtons.map(({ label, icon, action }) => (
                <button
                  key={action}
                  onClick={() => handleOpenModal(action)}
                  className="bg-blue-500 hover:bg-blue-600 px-6 py-3 rounded-xl text-white font-semibold text-sm flex items-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>

            {/* Tab Switcher */}
            <div className="flex flex-wrap gap-2 bg-gray-100 p-2 rounded-2xl">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-6 py-3 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all duration-200 ${
                    activeTab === tab.key
                      ? "bg-white text-blue-600 shadow-md"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Welcome Message for Regular Users */}
      {!isAdmin && (
        <div className="bg-white border-b border-gray-200">
          <div className="container mx-auto py-8 px-6 md:px-4">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Welcome, {user.name || "User"}!
              </h1>
              <p className="text-gray-600 text-lg">
                {user.role === "cashier"
                  ? "Manage your orders and track sales performance"
                  : "Access your personalized dashboard"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="container mx-auto px-6 md:px-4 py-8">
        {renderTabContent()}
      </div>

      {/* Modal */}
      {isTableModalOpen && <Modal setIsTableModalOpen={setIsTableModalOpen} />}
    </div>
  );
};

export default Dashboard;
