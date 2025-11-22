import React from "react";
import {
  EditOutlined,
  SwapOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  PlusOutlined,
  MinusOutlined,
} from "@ant-design/icons";
import { updateInventoryItem } from "../../https";

const InventoryList = ({
  data,
  onEdit,
  onTransfer,
  onDelete,
  loading,
  onRefresh,
}) => {
  const handleQuantityUpdate = async (item, location, change) => {
    try {
      const currentQuantity = item[location] || 0;
      const newQuantity = Math.max(0, currentQuantity + change);

      await updateInventoryItem({
        itemId: item._id,
        [location]: newQuantity,
      });

      // Call parent's refresh function instead of reloading the page
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error("Error updating quantity:", error);
      alert("Error updating quantity");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Item
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Shop Stock
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Stock Room
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Min Level
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((item) => {
            const shopQuantity = item.shopQuantity || 0;
            const stockRoomQuantity = item.stockRoomQuantity || 0;
            const minStockLevel = item.minStockLevel || 5;

            const isShopLow = shopQuantity <= minStockLevel;
            const isStockRoomLow = stockRoomQuantity <= minStockLevel;

            return (
              <tr key={item._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col">
                    <div className="text-sm font-medium text-gray-900">
                      {item.name}
                    </div>
                    <div className="text-sm text-gray-500">{item.category}</div>
                  </div>
                </td>

                {/* Shop Quantity */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() =>
                        handleQuantityUpdate(item, "shopQuantity", -1)
                      }
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                      disabled={shopQuantity <= 0}
                    >
                      <MinusOutlined />
                    </button>

                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium min-w-12 justify-center ${
                        isShopLow
                          ? "bg-red-100 text-red-800 border border-red-300"
                          : "bg-green-100 text-green-800 border border-green-300"
                      }`}
                    >
                      {shopQuantity}
                    </span>

                    <button
                      onClick={() =>
                        handleQuantityUpdate(item, "shopQuantity", 1)
                      }
                      className="p-1 text-green-600 hover:bg-green-50 rounded"
                    >
                      <PlusOutlined />
                    </button>

                    {isShopLow && (
                      <div
                        className="text-red-500 cursor-help"
                        title="Low stock - needs restocking"
                      >
                        <ExclamationCircleOutlined />
                      </div>
                    )}
                  </div>
                </td>

                {/* Stock Room Quantity */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() =>
                        handleQuantityUpdate(item, "stockRoomQuantity", -1)
                      }
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                      disabled={stockRoomQuantity <= 0}
                    >
                      <MinusOutlined />
                    </button>

                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium min-w-12 justify-center ${
                        isStockRoomLow
                          ? "bg-red-100 text-red-800 border border-red-300"
                          : "bg-blue-100 text-blue-800 border border-blue-300"
                      }`}
                    >
                      {stockRoomQuantity}
                    </span>

                    <button
                      onClick={() =>
                        handleQuantityUpdate(item, "stockRoomQuantity", 1)
                      }
                      className="p-1 text-green-600 hover:bg-green-50 rounded"
                    >
                      <PlusOutlined />
                    </button>

                    {isStockRoomLow && (
                      <div
                        className="text-red-500 cursor-help"
                        title="Low stock - needs restocking"
                      >
                        <ExclamationCircleOutlined />
                      </div>
                    )}
                  </div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {minStockLevel}
                  </span>
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => onEdit(item)}
                      className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                      title="Edit item"
                    >
                      <EditOutlined />
                    </button>
                    <button
                      onClick={() => onTransfer(item)}
                      className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50"
                      title="Transfer stock"
                    >
                      <SwapOutlined />
                    </button>
                    <button
                      onClick={() => onDelete(item)}
                      className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                      title="Delete item"
                    >
                      <DeleteOutlined />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {data.length === 0 && !loading && (
        <div className="text-center py-8">
          <div className="text-gray-500">No inventory items found</div>
          <div className="text-sm text-gray-400 mt-1">
            Add your first inventory item to get started
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryList;
