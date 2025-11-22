import React, { useState, useEffect } from "react";
import { addInventoryItem, updateInventoryItem } from "../../https";

const InventoryForm = ({ item, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    stockRoomQuantity: 0,
    shopQuantity: 0,
    minStockLevel: 5,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || "",
        category: item.category || "",
        stockRoomQuantity: item.stockRoomQuantity || 0,
        shopQuantity: item.shopQuantity || 0,
        minStockLevel: item.minStockLevel || 5,
      });
    }
  }, [item]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (error) setError("");
  };

  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    const numericValue = value === "" ? 0 : parseInt(value, 10) || 0;

    setFormData((prev) => ({
      ...prev,
      [name]: numericValue,
    }));
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Validate form data
    if (!formData.name.trim()) {
      setError("Item name is required");
      setLoading(false);
      return;
    }

    if (!formData.category.trim()) {
      setError("Category is required");
      setLoading(false);
      return;
    }

    console.log("Form data being submitted:", formData);

    try {
      let response;
      if (item) {
        console.log("Updating item:", item._id);
        response = await updateInventoryItem({ itemId: item._id, ...formData });
      } else {
        console.log("Creating new item");
        response = await addInventoryItem(formData);
      }

      console.log("API Response:", response);

      if (response && (response.status === 200 || response.status === 201)) {
        console.log("Item saved successfully");
        onSave();
      } else {
        throw new Error(response?.data?.message || "Unknown error occurred");
      }
    } catch (error) {
      console.error("Full error object:", error);
      console.error("Error response data:", error.response?.data);
      console.error("Error status:", error.response?.status);

      let errorMessage = "Error creating inventory item";

      if (error.response) {
        // Try to get detailed error message from backend
        const backendError = error.response.data;
        errorMessage =
          backendError?.message ||
          backendError?.error ||
          backendError?.details?.[0]?.message ||
          `Server error: ${error.response.status}`;

        console.log("Backend error details:", backendError);
      } else if (error.request) {
        errorMessage = "No response from server. Please check your connection.";
      } else {
        errorMessage = error.message || "Error creating inventory item";
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Debug info - remove in production
  const debugInfo = `
Form Data: ${JSON.stringify(formData, null, 2)}
Loading: ${loading}
Error: ${error}
  `;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          <div className="flex items-center">
            <svg
              className="w-5 h-5 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* Debug info - remove in production */}
      {process.env.NODE_ENV === "development" && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded-md text-xs">
          <strong>Debug Info:</strong>
          <pre>{debugInfo}</pre>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Item Name *
        </label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter item name"
          disabled={loading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Category *
        </label>
        <input
          type="text"
          name="category"
          value={formData.category}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter category"
          disabled={loading}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Shop Quantity
          </label>
          <input
            type="number"
            name="shopQuantity"
            value={formData.shopQuantity}
            onChange={handleNumberChange}
            min="0"
            step="1"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Stock Room Quantity
          </label>
          <input
            type="number"
            name="stockRoomQuantity"
            value={formData.stockRoomQuantity}
            onChange={handleNumberChange}
            min="0"
            step="1"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Min Stock Level
          </label>
          <input
            type="number"
            name="minStockLevel"
            value={formData.minStockLevel}
            onChange={handleNumberChange}
            min="1"
            step="1"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="5"
            disabled={loading}
          />
        </div>
      </div>

      <div className="flex space-x-3 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {loading ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Saving...
            </>
          ) : (
            `${item ? "Update" : "Create"} Item`
          )}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default InventoryForm;
