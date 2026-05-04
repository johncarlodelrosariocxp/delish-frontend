import React, { useState, useEffect } from "react";
import InventoryForm from "../components/inventory/InventoryForm";
import InventoryList from "../components/inventory/InventoryList";
import { getInventory, deleteInventoryItem } from "../https";
import BackButton from "../components/shared/BackButton";
import BottomNav from "../components/shared/BottomNav";

const Inventory = () => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const response = await getInventory();
      console.log("📦 Inventory response:", response.data);

      if (response.data.success) {
        setInventory(response.data.data || []);
        if (response.data.summary) {
          setSummary(response.data.summary);
        }
      } else {
        setInventory([]);
      }
    } catch (error) {
      console.error("Error fetching inventory:", error);
      alert(
        "Error fetching inventory: " +
          (error.response?.data?.message || error.message),
      );
    } finally {
      setLoading(false);
    }
  };

  const getFilteredInventory = () => {
    switch (activeTab) {
      case "lowStock":
        return inventory.filter(
          (item) => item.remainingQuantity <= 10 && item.remainingQuantity > 0,
        );
      case "outOfStock":
        return inventory.filter((item) => item.remainingQuantity <= 0);
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

  const handleDelete = async (item) => {
    if (window.confirm(`Are you sure you want to delete "${item.itemName}"?`)) {
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

  const handleRefresh = () => {
    fetchInventory();
  };

  const filteredInventory = getFilteredInventory();

  const totalValue =
    summary?.totalValue ||
    inventory.reduce(
      (sum, item) => sum + item.remainingQuantity * item.unitPrice,
      0,
    );
  const totalItems = inventory.length;
  const lowStockCount = inventory.filter(
    (item) => item.remainingQuantity <= 10 && item.remainingQuantity > 0,
  ).length;
  const outOfStockCount = inventory.filter(
    (item) => item.remainingQuantity <= 0,
  ).length;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BackButton />
              <h1 className="text-xl font-bold text-gray-800">Inventory</h1>
            </div>
            <button
              onClick={handleCreate}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm"
            >
              <svg
                className="w-4 h-4"
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
              Add Item
            </button>
          </div>
        </div>

        <div className="px-4 py-3 border-t bg-gray-50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white p-3 rounded-lg shadow-sm">
              <p className="text-xs text-gray-500">Total Items</p>
              <p className="text-xl font-bold text-blue-600">{totalItems}</p>
            </div>
            <div className="bg-white p-3 rounded-lg shadow-sm">
              <p className="text-xs text-gray-500">Inventory Value</p>
              <p className="text-sm font-bold text-green-600">
                {formatCurrency(totalValue)}
              </p>
            </div>
            <div className="bg-white p-3 rounded-lg shadow-sm">
              <p className="text-xs text-gray-500">Low Stock</p>
              <p className="text-xl font-bold text-orange-600">
                {lowStockCount}
              </p>
            </div>
            <div className="bg-white p-3 rounded-lg shadow-sm">
              <p className="text-xs text-gray-500">Out of Stock</p>
              <p className="text-xl font-bold text-red-600">
                {outOfStockCount}
              </p>
            </div>
          </div>
        </div>

        <div className="px-4 border-b">
          <div className="flex space-x-6">
            <button
              onClick={() => setActiveTab("all")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "all"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              All Items ({totalItems})
            </button>
            <button
              onClick={() => setActiveTab("lowStock")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "lowStock"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Low Stock ({lowStockCount})
            </button>
            <button
              onClick={() => setActiveTab("outOfStock")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "outOfStock"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Out of Stock ({outOfStockCount})
            </button>
          </div>
        </div>
      </div>

      <div className="p-4">
        <InventoryList
          data={filteredInventory}
          loading={loading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onRefresh={handleRefresh}
        />
      </div>

      {formVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 sticky top-0 bg-white">
              <h3 className="text-lg font-semibold text-gray-800">
                {selectedItem ? "Edit Item" : "Add New Item"}
              </h3>
            </div>
            <div className="p-4">
              <InventoryForm
                item={selectedItem}
                onSave={handleFormSuccess}
                onCancel={handleFormClose}
              />
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default Inventory;
