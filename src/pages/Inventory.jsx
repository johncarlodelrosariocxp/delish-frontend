import React, { useState, useEffect } from "react";
import InventoryForm from "../components/inventory/InventoryForm";
import InventoryList from "../components/inventory/InventoryList";
import StockTransfer from "../components/inventory/StockTransfer";
import { getInventory, deleteInventoryItem, getLowStockItems } from "../https";

const Inventory = () => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [transferVisible, setTransferVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const response = await getInventory();
      setInventory(response.data.data || response.data);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      alert("Error fetching inventory");
    } finally {
      setLoading(false);
    }
  };

  // Filter inventory based on active tab
  const getFilteredInventory = () => {
    switch (activeTab) {
      case "shop":
        return inventory.filter((item) => item.shopQuantity > 0);
      case "stockRoom":
        return inventory.filter((item) => item.stockRoomQuantity > 0);
      case "lowStock":
        return inventory.filter(
          (item) =>
            item.shopQuantity <= item.minStockLevel ||
            item.stockRoomQuantity <= item.minStockLevel
        );
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

  const handleDelete = async (item) => {
    if (window.confirm(`Are you sure you want to delete "${item.name}"?`)) {
      try {
        await deleteInventoryItem(item._id);
        alert("Item deleted successfully");
        fetchInventory();
      } catch (error) {
        console.error("Error deleting item:", error);
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
  };

  const handleTransferSuccess = () => {
    setTransferVisible(false);
    setSelectedItem(null);
    fetchInventory();
  };

  const handleRefresh = () => {
    fetchInventory();
  };

  const filteredInventory = getFilteredInventory();

  // Calculate statistics
  const stats = {
    totalItems: inventory.length,
    shopItems: inventory.filter((item) => item.shopQuantity > 0).length,
    stockRoomItems: inventory.filter((item) => item.stockRoomQuantity > 0)
      .length,
    lowStockItems: inventory.filter(
      (item) =>
        item.shopQuantity <= item.minStockLevel ||
        item.stockRoomQuantity <= item.minStockLevel
    ).length,
  };

  return (
    <div style={{ padding: "24px" }}>
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Total Items</h3>
          <p className="text-2xl font-bold text-blue-600">{stats.totalItems}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Shop Items</h3>
          <p className="text-2xl font-bold text-purple-600">
            {stats.shopItems}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Stock Room</h3>
          <p className="text-2xl font-bold text-orange-600">
            {stats.stockRoomItems}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Low Stock</h3>
          <p className="text-2xl font-bold text-red-600">
            {stats.lowStockItems}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        {/* Header */}
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
        <div className="px-6 border-b border-gray-200">
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
              Shop ({stats.shopItems})
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
            <button
              onClick={() => setActiveTab("lowStock")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "lowStock"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Low Stock ({stats.lowStockItems})
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          <InventoryList
            data={filteredInventory}
            loading={loading}
            onEdit={handleEdit}
            onTransfer={handleTransfer}
            onDelete={handleDelete}
            onRefresh={fetchInventory} // Pass refresh function to child
          />
        </div>
      </div>

      {/* Inventory Form Modal */}
      {formVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">
                {selectedItem ? "Edit Item" : "Add New Item"}
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
