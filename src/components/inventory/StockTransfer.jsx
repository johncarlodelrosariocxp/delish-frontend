import React, { useState, useEffect } from "react";
import { transferStock } from "../../https";

const StockTransfer = ({ item, visible, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    from: "",
    to: "",
    quantity: 1,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && item) {
      setFormData({
        from: "",
        to: "",
        quantity: 1,
      });
    }
  }, [visible, item]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Auto-set the opposite location
    if (name === "from") {
      setFormData((prev) => ({
        ...prev,
        to: value === "stockRoom" ? "shop" : "stockRoom",
      }));
    }
  };

  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: parseInt(value) || 0,
    }));
  };

  const getMaxQuantity = () => {
    if (!item) return 0;
    return formData.from === "stockRoom"
      ? item.stockRoomQuantity
      : item.shopQuantity;
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await transferStock(item._id, formData);
      alert("Stock transferred successfully");
      onSuccess();
      onClose();
    } catch (error) {
      alert(error.response?.data?.message || "Error transferring stock");
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">
            Transfer Stock - {item?.name}
          </h3>
        </div>

        {item && (
          <div className="p-4 bg-blue-50 border-b border-blue-200">
            <h4 className="font-medium text-blue-800 mb-2">
              Current Stock Levels
            </h4>
            <div className="text-sm text-blue-700">
              <p>
                <strong>Stock Room:</strong> {item.stockRoomQuantity}{" "}
                {item.unit}
              </p>
              <p>
                <strong>Shop:</strong> {item.shopQuantity} {item.unit}
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleTransfer} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From *
            </label>
            <select
              name="from"
              value={formData.from}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select source</option>
              <option value="stockRoom">Stock Room</option>
              <option value="shop">Shop</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To *
            </label>
            <select
              name="to"
              value={formData.to}
              onChange={handleChange}
              required
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100"
            >
              <option value="shop">Shop</option>
              <option value="stockRoom">Stock Room</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity *
            </label>
            <input
              type="number"
              name="quantity"
              value={formData.quantity}
              onChange={handleNumberChange}
              min="1"
              max={getMaxQuantity()}
              required
              disabled={!formData.from}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              placeholder="Enter quantity"
            />
            {formData.from && (
              <p className="text-xs text-gray-500 mt-1">
                Maximum: {getMaxQuantity()} {item?.unit}
              </p>
            )}
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              disabled={loading || !formData.from}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? "Transferring..." : "Transfer Stock"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StockTransfer;
