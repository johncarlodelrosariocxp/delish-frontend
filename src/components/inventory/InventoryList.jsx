import React from "react";
import {
  EditOutlined,
  SwapOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";

const InventoryList = ({ data, onEdit, onTransfer, onDelete, loading }) => {
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
              Item Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Stock Room
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Shop
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Price/Cost
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Supplier
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((item) => {
            // Extract quantity from the string (e.g., "9 pack" -> 9)
            const stockRoomQuantity =
              typeof item.stockRoomQuantity === "string"
                ? parseInt(item.stockRoomQuantity.split(" ")[0]) || 0
                : item.stockRoomQuantity || 0;

            const shopQuantity =
              typeof item.shopQuantity === "string"
                ? parseInt(item.shopQuantity.split(" ")[0]) || 0
                : item.shopQuantity || 0;

            const minStockLevel = item.minStockLevel || 0;
            const unit = item.unit || "pcs";

            const isStockRoomLow = stockRoomQuantity <= minStockLevel;
            const isShopLow = shopQuantity <= minStockLevel;

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

                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        isStockRoomLow
                          ? "bg-red-100 text-red-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {stockRoomQuantity} {unit}
                    </span>
                    {isStockRoomLow && (
                      <div
                        className="ml-1 text-red-500 cursor-help"
                        title="Low stock alert"
                      >
                        <ExclamationCircleOutlined />
                      </div>
                    )}
                  </div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        isShopLow
                          ? "bg-red-100 text-red-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {shopQuantity} {unit}
                    </span>
                    {isShopLow && (
                      <div
                        className="ml-1 text-red-500 cursor-help"
                        title="Low stock alert"
                      >
                        <ExclamationCircleOutlined />
                      </div>
                    )}
                  </div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    Price: ₱{item.price}
                  </div>
                  <div className="text-sm text-gray-500">
                    Cost: ₱{item.cost}
                  </div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {item.supplier || "-"}
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      item.isActive
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {item.isActive ? "Active" : "Inactive"}
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
