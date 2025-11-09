import React, { useState, useEffect } from "react";
import InventoryForm from "../components/inventory/InventoryForm";
import InventoryList from "../components/inventory/InventoryList";
import StockTransfer from "../components/inventory/StockTransfer";
import { getInventory, deleteInventoryItem, getLowStockItems } from "../https";

const Inventory = () => {
  const [inventory, setInventory] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [transferVisible, setTransferVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [activeTab, setActiveTab] = useState("all"); // "all", "shop", "stockRoom"
  const [stats, setStats] = useState({
    totalItems: 0,
    totalValue: 0,
    lowStockCount: 0,
    shopItems: 0,
    stockRoomItems: 0,
  });

  useEffect(() => {
    fetchInventory();
    fetchLowStockItems();
  }, []);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const response = await getInventory();
      setInventory(response.data.data || response.data);
      calculateStats(response.data.data || response.data);
    } catch (error) {
      alert("Error fetching inventory");
    } finally {
      setLoading(false);
    }
  };

  const fetchLowStockItems = async () => {
    try {
      const response = await getLowStockItems();
      setLowStockItems(response.data.data || response.data);
    } catch (error) {
      console.error("Error fetching low stock items:", error);
    }
  };

  const calculateStats = (items) => {
    const totalItems = items.length;
    const totalValue = items.reduce(
      (sum, item) =>
        sum + item.cost * (item.stockRoomQuantity + item.shopQuantity),
      0
    );

    const lowStockCount = items.filter(
      (item) =>
        item.stockRoomQuantity <= item.minStockLevel ||
        item.shopQuantity <= item.minStockLevel
    ).length;

    const shopItems = items.filter((item) => item.shopQuantity > 0).length;
    const stockRoomItems = items.filter(
      (item) => item.stockRoomQuantity > 0
    ).length;

    setStats({
      totalItems,
      totalValue,
      lowStockCount,
      shopItems,
      stockRoomItems,
    });
  };

  // Filter inventory based on active tab
  const getFilteredInventory = () => {
    switch (activeTab) {
      case "shop":
        return inventory.filter((item) => item.shopQuantity > 0);
      case "stockRoom":
        return inventory.filter((item) => item.stockRoomQuantity > 0);
      case "all":
      default:
        return inventory;
    }
  };

  const handleCreate = () => {
    setSelectedItem(null);
    setFormVisible(true);
  };

  const handleEdit = (item) => {
    setSelectedItem(item);
    setFormVisible(true);
  };

  const handleTransfer = (item) => {
    setSelectedItem(item);
    setTransferVisible(true);
  };

  const handleDelete = (item) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${item.name}"? This action cannot be undone.`
      )
    ) {
      try {
        deleteInventoryItem(item._id);
        alert("Item deleted successfully");
        fetchInventory();
        fetchLowStockItems();
      } catch (error) {
        alert("Error deleting item");
      }
    }
  };

  const handleFormClose = () => {
    setFormVisible(false);
    setSelectedItem(null);
  };

  const handleFormSuccess = () => {
    setFormVisible(false);
    setSelectedItem(null);
    fetchInventory();
    fetchLowStockItems();
  };

  const handleTransferSuccess = () => {
    setTransferVisible(false);
    setSelectedItem(null);
    fetchInventory();
    fetchLowStockItems();
  };

  const filteredInventory = getFilteredInventory();

  return (
    <div style={{ padding: "24px" }}>
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Total Items</h3>
          <p className="text-2xl font-bold text-blue-600">{stats.totalItems}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">
            Total Inventory Value
          </h3>
          <p className="text-2xl font-bold text-green-600">
            ₱{stats.totalValue.toFixed(2)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">
            Low Stock Items
          </h3>
          <p
            className={`text-2xl font-bold ${
              stats.lowStockCount > 0 ? "text-red-600" : "text-green-600"
            }`}
          >
            {stats.lowStockCount}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Shop Items</h3>
          <p className="text-2xl font-bold text-purple-600">
            {stats.shopItems}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">
            Stock Room Items
          </h3>
          <p className="text-2xl font-bold text-orange-600">
            {stats.stockRoomItems}
          </p>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
          <div className="flex items-center">
            <svg
              className="w-4 h-4 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <strong className="font-bold">Warning! </strong>
            <span className="ml-1">
              You have {lowStockItems.length} items with low stock levels.
              Please restock these items to avoid running out.
            </span>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        {/* Header with Tabs */}
        <div className="border-b border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-xl font-semibold text-gray-800">
                Inventory Management
              </h2>
              <div className="flex space-x-2">
                <button
                  onClick={fetchInventory}
                  disabled={loading}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 flex items-center"
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Refresh
                </button>
                <button
                  onClick={handleCreate}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center"
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Add New Item
                </button>
              </div>
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className="px-6">
            <div className="flex space-x-8">
              <button
                onClick={() => setActiveTab("all")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "all"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                All Items ({stats.totalItems})
              </button>
              <button
                onClick={() => setActiveTab("shop")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "shop"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Shop Stock ({stats.shopItems})
              </button>
              <button
                onClick={() => setActiveTab("stockRoom")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "stockRoom"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Stock Room ({stats.stockRoomItems})
              </button>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Tab Description */}
          <div className="mb-4">
            {activeTab === "all" && (
              <p className="text-sm text-gray-600">
                Showing all inventory items across both shop and stock room
                locations.
              </p>
            )}
            {activeTab === "shop" && (
              <p className="text-sm text-gray-600">
                Showing items currently available in the shop for sales. Total:{" "}
                {stats.shopItems} items.
              </p>
            )}
            {activeTab === "stockRoom" && (
              <p className="text-sm text-gray-600">
                Showing items stored in the stock room (backup inventory).
                Total: {stats.stockRoomItems} items.
              </p>
            )}
          </div>

          <InventoryList
            data={filteredInventory}
            loading={loading}
            onEdit={handleEdit}
            onTransfer={handleTransfer}
            onDelete={handleDelete}
          />
        </div>
      </div>

      {/* Inventory Form Modal */}
      {formVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">
                {selectedItem
                  ? "Edit Inventory Item"
                  : "Add New Inventory Item"}
              </h3>
            </div>
            <div className="p-6">
              <InventoryForm
                item={selectedItem}
                onSave={handleFormSuccess}
                onCancel={handleFormClose}
              />
            </div>
          </div>
        </div>
      )}

      {/* Stock Transfer Modal */}
      {transferVisible && (
        <StockTransfer
          item={selectedItem}
          visible={transferVisible}
          onClose={() => setTransferVisible(false)}
          onSuccess={handleTransferSuccess}
        />
      )}
    </div>
  );
};

export default Inventory;
