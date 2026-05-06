// src/components/inventory/InventoryTransactionReport.jsx
import React, { useState, useEffect } from "react";
import { getInventoryTransactionReport, getInventory } from "../../https";

const InventoryTransactionReport = () => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    itemId: "",
    transactionType: "all",
  });

  useEffect(() => {
    loadInventoryItems();
  }, []);

  const loadInventoryItems = async () => {
    try {
      const response = await getInventory();
      if (response.data.success) {
        setInventoryItems(response.data.data);
      }
    } catch (error) {
      console.error("Error loading inventory items:", error);
      setError("Failed to load inventory items");
    }
  };

  const loadReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.itemId) params.itemId = filters.itemId;
      if (filters.transactionType && filters.transactionType !== "all") {
        params.transactionType = filters.transactionType;
      }

      console.log("Fetching report with params:", params);
      const response = await getInventoryTransactionReport(params);

      if (response.data.success) {
        setReportData(response.data.data);
      } else {
        setError(response.data.message || "Failed to load report");
      }
    } catch (error) {
      console.error("Error loading transaction report:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Error loading report";
      setError(errorMessage);
      alert(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    setFilters({
      startDate: "",
      endDate: "",
      itemId: "",
      transactionType: "all",
    });
    setReportData(null);
    setError(null);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Filter Transactions</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              name="startDate"
              value={filters.startDate}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              name="endDate"
              value={filters.endDate}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Inventory Item
            </label>
            <select
              name="itemId"
              value={filters.itemId}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="">All Items</option>
              {inventoryItems.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.itemName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Transaction Type
            </label>
            <select
              name="transactionType"
              value={filters.transactionType}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="all">All</option>
              <option value="add">Added Stock</option>
              <option value="remove">Removed Stock</option>
              <option value="create">Initial Creation</option>
            </select>
          </div>
        </div>
        <div className="flex space-x-3 mt-4">
          <button
            onClick={loadReport}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Loading..." : "Generate Report"}
          </button>
          <button
            onClick={resetFilters}
            className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error Loading Report
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
                <p className="mt-1 text-xs">
                  Please check the backend server logs for more details.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Results */}
      {reportData && !error && (
        <>
          {/* Summary */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Total Transactions</div>
                <div className="text-2xl font-bold text-blue-600">
                  {reportData.summary?.totalTransactions || 0}
                </div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">
                  Total Added (Quantity)
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {reportData.summary?.totalAdded || 0}
                </div>
                <div className="text-sm text-green-600">
                  {formatCurrency(reportData.summary?.totalAddedValue || 0)}
                </div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">
                  Total Removed (Quantity)
                </div>
                <div className="text-2xl font-bold text-red-600">
                  {reportData.summary?.totalRemoved || 0}
                </div>
                <div className="text-sm text-red-600">
                  {formatCurrency(reportData.summary?.totalRemovedValue || 0)}
                </div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Net Change</div>
                <div className="text-2xl font-bold text-purple-600">
                  {(reportData.summary?.totalAdded || 0) -
                    (reportData.summary?.totalRemoved || 0)}
                </div>
                <div className="text-sm text-purple-600">
                  {formatCurrency(
                    (reportData.summary?.totalAddedValue || 0) -
                      (reportData.summary?.totalRemovedValue || 0),
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Daily Report */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">
              Daily Transaction Report
            </h2>
            {!reportData.dailyReport || reportData.dailyReport.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No transactions found for the selected date range
              </div>
            ) : (
              <div className="space-y-6">
                {reportData.dailyReport.map((day) => (
                  <div
                    key={day.date}
                    className="border rounded-lg overflow-hidden"
                  >
                    <div className="bg-gray-50 px-4 py-3 border-b">
                      <h3 className="font-semibold text-lg">{day.date}</h3>
                      <div className="flex space-x-4 text-sm mt-1">
                        <span className="text-green-600">
                          Added: {day.totalAdded || 0} units (
                          {formatCurrency(day.totalAddedValue || 0)})
                        </span>
                        <span className="text-red-600">
                          Removed: {day.totalRemoved || 0} units (
                          {formatCurrency(day.totalRemovedValue || 0)})
                        </span>
                      </div>
                    </div>

                    {/* Added Items */}
                    {day.added && day.added.length > 0 && (
                      <div className="p-4 border-b">
                        <h4 className="font-medium text-green-600 mb-2">
                          ✓ Stock Added
                        </h4>
                        <div className="space-y-2">
                          {day.added.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex justify-between text-sm"
                            >
                              <div>
                                <span className="font-medium">
                                  {item.itemName}
                                </span>
                                <span className="text-gray-600 ml-2">
                                  +{item.quantity} {item.unit}
                                </span>
                                {item.reason && (
                                  <span className="text-gray-400 ml-2 text-xs">
                                    ({item.reason})
                                  </span>
                                )}
                              </div>
                              <div className="text-green-600">
                                {formatCurrency(item.value)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Removed Items */}
                    {day.removed && day.removed.length > 0 && (
                      <div className="p-4">
                        <h4 className="font-medium text-red-600 mb-2">
                          ✗ Stock Removed
                        </h4>
                        <div className="space-y-2">
                          {day.removed.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex justify-between text-sm"
                            >
                              <div>
                                <span className="font-medium">
                                  {item.itemName}
                                </span>
                                <span className="text-gray-600 ml-2">
                                  -{item.quantity} {item.unit}
                                </span>
                                {item.reason && (
                                  <span className="text-gray-400 ml-2 text-xs">
                                    ({item.reason})
                                  </span>
                                )}
                              </div>
                              <div className="text-red-600">
                                {formatCurrency(item.value)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Detailed Transaction History */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">
              Detailed Transaction History
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Date & Time
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Item
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Quantity
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Previous Qty
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      New Qty
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Value
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Reason
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Performed By
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.allTransactions &&
                    reportData.allTransactions.map((transaction, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">
                          {formatDate(transaction.transaction?.timestamp)}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">
                          {transaction.itemName}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`inline-flex px-2 py-1 text-xs rounded-full ${
                              transaction.transaction?.type === "add"
                                ? "bg-green-100 text-green-800"
                                : transaction.transaction?.type === "remove"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {transaction.transaction?.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {transaction.transaction?.quantity} {transaction.unit}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {transaction.transaction?.previousQuantity}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {transaction.transaction?.newQuantity}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">
                          {formatCurrency(
                            (transaction.transaction?.quantity || 0) *
                              (transaction.unitPrice || 0),
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {transaction.transaction?.reason || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {transaction.transaction?.performedByName}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default InventoryTransactionReport;
