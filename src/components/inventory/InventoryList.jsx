import React from "react";
import {
  EditOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";

const InventoryList = ({ data, onEdit, onDelete, loading }) => {
  const [selectedItems, setSelectedItems] = React.useState([]);

  React.useEffect(() => {
    setSelectedItems([]);
  }, [data]);

  const handleSelectItem = (itemId) => {
    setSelectedItems((prev) => {
      if (prev.includes(itemId)) {
        return prev.filter((id) => id !== itemId);
      } else {
        return [...prev, itemId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedItems.length === data.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(data.map((item) => item._id));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedItems.length === 0) return;
    selectedItems.forEach((itemId) => {
      const item = data.find((i) => i._id === itemId);
      if (item) onDelete(item);
    });
    setSelectedItems([]);
  };

  const isAllSelected = data.length > 0 && selectedItems.length === data.length;

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow">
      {selectedItems.length > 0 && (
        <div className="bg-blue-50 px-4 py-2 flex justify-between items-center border-b border-gray-200">
          <span className="text-sm text-blue-700">
            {selectedItems.length} item(s) selected
          </span>
          <button
            onClick={handleDeleteSelected}
            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
          >
            <DeleteOutlined /> Delete Selected
          </button>
        </div>
      )}
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={handleSelectAll}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                disabled={data.length === 0}
              />
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Item
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Category
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Quantity
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Used
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Remaining
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Unit Price
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Total
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Linked Menu
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((item) => {
            const quantity = item.quantity || 0;
            const usedQuantity = item.usedQuantity || 0;
            const remainingQuantity = item.remainingQuantity || 0;
            const isLowStock = remainingQuantity <= 10 && remainingQuantity > 0;
            const isOutOfStock = remainingQuantity <= 0;

            return (
              <tr key={item._id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedItems.includes(item._id)}
                    onChange={() => handleSelectItem(item._id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <div className="text-sm font-medium text-gray-900">
                      {item.itemName}
                    </div>
                    {item.description && (
                      <div className="text-xs text-gray-500">
                        {item.description}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                    {item.category}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium min-w-12 justify-center ${
                        isOutOfStock
                          ? "bg-gray-300 text-gray-600"
                          : isLowStock
                            ? "bg-red-100 text-red-800 border border-red-300"
                            : "bg-green-100 text-green-800 border border-green-300"
                      }`}
                    >
                      {quantity} {item.unit}
                    </span>
                    {isLowStock && !isOutOfStock && (
                      <div
                        className="text-red-500 cursor-help"
                        title="Low stock - needs restocking"
                      >
                        <ExclamationCircleOutlined />
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {usedQuantity} {item.unit}
                </td>
                <td className="px-4 py-3 text-sm font-medium">
                  <span
                    className={
                      remainingQuantity <= 0 ? "text-red-600" : "text-green-600"
                    }
                  >
                    {remainingQuantity} {item.unit}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {formatCurrency(item.unitPrice)}
                </td>
                <td className="px-4 py-3 text-sm font-medium">
                  {formatCurrency(item.totalCost)}
                </td>
                <td className="px-4 py-3 text-sm">
                  {item.linkedMenuItems && item.linkedMenuItems.length > 0 ? (
                    <div className="text-xs">
                      {item.linkedMenuItems.map((link, i) => (
                        <div key={i} className="text-green-600">
                          {link.menuItemName} (x{link.quantityPerUnit})
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-400">Not linked</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm font-medium">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => onEdit(item)}
                      className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                      title="Edit item"
                    >
                      <EditOutlined />
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
