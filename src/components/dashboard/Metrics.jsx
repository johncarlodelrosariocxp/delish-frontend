import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { getOrders } from "../../https/index";
import { FaChartLine, FaShoppingCart, FaMoneyBillWave } from "react-icons/fa";

const Metrics = ({
  rawMetricsData = [], // optional if you want to inject custom data
  rawItemsData = [],
  title = "Overall Performance",
  subtitle = "Performance summary for the selected period",
  itemTitle = "Item Details",
  itemSubtitle = "Breakdown of key items",
}) => {
  const [period, setPeriod] = useState("Week");
  const [metricsData, setMetricsData] = useState([]);
  const [itemsData, setItemsData] = useState([]);

  const {
    data: resData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["ordersForMetrics"],
    queryFn: getOrders,
  });

  useEffect(() => {
    if (resData?.data?.data) {
      const orders = resData.data.data;
      const sumSales = orders.reduce(
        (sum, o) => sum + (o.bills?.totalWithTax || 0),
        0
      );
      const numOrders = orders.length;
      const avgValue = numOrders > 0 ? sumSales / numOrders : 0;

      // Here we map for display purposes
      setMetricsData([
        {
          title: "Total Orders",
          value: numOrders,
          percentage: "-", // modify if you have percentage/trend logic
          isIncrease: true,
          color: "#6b7280",
        },
        {
          title: "Total Sales",
          value: `₱${sumSales.toFixed(2)}`,
          percentage: "-",
          isIncrease: true,
          color: "#6b7280",
        },
        {
          title: "Avg. Order Value",
          value: `₱${avgValue.toFixed(2)}`,
          percentage: "-",
          isIncrease: true,
          color: "#6b7280",
        },
      ]);

      // If you have items data, you can compute itemsData similarly
      setItemsData([]); // no items data for now
    } else {
      // When there are no orders
      setMetricsData([]);
      setItemsData([]);
    }
  }, [resData, period]);

  if (isLoading) {
    return (
      <div className="text-center text-gray-600 py-10">Loading metrics…</div>
    );
  }

  if (isError) {
    enqueueSnackbar("Failed to load metrics!", { variant: "error" });
    return (
      <div className="text-center text-gray-600 py-10">
        Metrics failed to load.
      </div>
    );
  }

  return (
    <div className="container mx-auto py-2 px-6 md:px-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-semibold text-black text-xl">{title}</h2>
          <p className="text-sm text-gray-600">{subtitle}</p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="bg-gray-200 text-black border border-gray-400 px-4 py-2 rounded-md"
        >
          <option value="Day">Last 1 Day</option>
          <option value="Week">Last 1 Week</option>
          <option value="Month">Last 1 Month</option>
        </select>
      </div>

      {/* Metrics Grid */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {metricsData.length === 0 && (
          <div className="col-span-3 text-gray-600 text-center py-10">
            No metric data available for the selected period.
          </div>
        )}
        {metricsData.map((metric, index) => (
          <div
            key={index}
            className="shadow-sm rounded-lg p-4"
            style={{ backgroundColor: metric.color }}
          >
            <div className="flex justify-between items-center">
              <p className="font-medium text-xs text-white">{metric.title}</p>
              <div className="flex items-center gap-1">
                <svg
                  className="w-3 h-3"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  style={{ color: metric.isIncrease ? "#ffffff" : "#ef4444" }}
                >
                  <path
                    d={metric.isIncrease ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"}
                  />
                </svg>
                <p
                  className="font-medium text-xs"
                  style={{ color: metric.isIncrease ? "#ffffff" : "#ef4444" }}
                >
                  {metric.percentage}
                </p>
              </div>
            </div>
            <p className="mt-1 font-semibold text-2xl text-white">
              {metric.value}
            </p>
          </div>
        ))}
      </div>

      {/* Item Details */}
      <div className="flex flex-col justify-between mt-12">
        <div>
          <h2 className="font-semibold text-black text-xl">{itemTitle}</h2>
          <p className="text-sm text-gray-600">{itemSubtitle}</p>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {itemsData.length === 0 && (
            <div className="col-span-4 text-gray-600 text-center py-10">
              No item details available for the selected period.
            </div>
          )}
          {itemsData.map((item, idx) => (
            <div
              key={idx}
              className="shadow-sm rounded-lg p-4"
              style={{ backgroundColor: item.color }}
            >
              <div className="flex justify-between items-center">
                <p className="font-medium text-xs text-white">{item.title}</p>
                <div className="flex items-center gap-1">
                  <svg
                    className="w-3 h-3 text-white"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  >
                    <path d="M5 15l7-7 7 7" />
                  </svg>
                  <p className="font-medium text-xs text-white">
                    {item.percentage}
                  </p>
                </div>
              </div>
              <p className="mt-1 font-semibold text-2xl text-white">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Metrics;
