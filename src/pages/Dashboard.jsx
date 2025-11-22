import React, { useState, useEffect } from "react";
import { MdCategory } from "react-icons/md";
import { BiSolidDish } from "react-icons/bi";
import Metrics from "../components/dashboard/Metrics";
import RecentOrders from "../components/dashboard/RecentOrders";
import Modal from "../components/dashboard/Modal";

const buttons = [
  { label: "Add Category", icon: <MdCategory />, action: "category" },
  { label: "Add Coffee", icon: <BiSolidDish />, action: "coffee" },
];

const tabs = ["Metrics", "Orders", "Payments"];

const Dashboard = () => {
  useEffect(() => {
    document.title = "POS | Admin Dashboard";
  }, []);

  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("Metrics");

  const handleOpenModal = (action) => {
    if (action === "table") {
      setIsTableModalOpen(true);
    }
    // Extend here for category or coffee modals
  };

  return (
    <div className="bg-white min-h-screen">
      {/* Top Controls */}
      <div className="container mx-auto flex flex-col md:flex-row items-start md:items-center justify-between py-14 px-6 md:px-4 gap-6">
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          {buttons.map(({ label, icon, action }) => (
            <button
              key={action}
              onClick={() => handleOpenModal(action)}
              className="bg-gray-100 hover:bg-gray-200 px-8 py-3 rounded-lg text-black font-semibold text-md flex items-center gap-2 transition-colors"
            >
              {label} {icon}
            </button>
          ))}
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap gap-3">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-8 py-3 rounded-lg text-black font-semibold text-md flex items-center gap-2 transition-colors ${
                activeTab === tab
                  ? "bg-gray-200"
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="container mx-auto px-6 md:px-4 pb-20">
        {activeTab === "Metrics" && <Metrics />}
        {activeTab === "Orders" && <RecentOrders />}
        {activeTab === "Payments" && (
          <div className="text-black p-6 text-lg font-medium">
            Payment Component Coming Soon
          </div>
        )}
      </div>

      {/* Modal */}
      {isTableModalOpen && <Modal setIsTableModalOpen={setIsTableModalOpen} />}
    </div>
  );
};

export default Dashboard;
