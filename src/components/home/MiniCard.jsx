import React from "react";
import PropTypes from "prop-types";

const MiniCard = ({
  title,
  icon,
  number,
  footerNum,
  footerText,
  currency,
  loading = false,
  onClick,
  period,
  comparisonPeriod,
}) => {
  // Format number with proper currency formatting and error handling
  const formatNumber = (num) => {
    if (loading) return currency ? "₱---" : "---";

    try {
      // Handle null, undefined, or invalid values
      if (num === null || num === undefined || num === "") {
        return currency ? "₱0.00" : "0";
      }

      const numericValue = Number(num);

      // Handle NaN, Infinity
      if (!isFinite(numericValue)) {
        return currency ? "₱0.00" : "0";
      }

      if (currency) {
        return `₱${numericValue.toLocaleString("en-PH", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
      }

      // For non-currency numbers, format based on whether it's a whole number
      return Number.isInteger(numericValue)
        ? numericValue.toLocaleString("en-PH")
        : numericValue.toLocaleString("en-PH", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
    } catch (error) {
      console.error("Error formatting number:", error);
      return currency ? "₱0.00" : "0";
    }
  };

  // Determine footer number display and color with proper validation
  const getFooterDisplay = () => {
    if (loading) return { text: "---", color: "text-gray-400" };

    try {
      // Handle null, undefined, or invalid values
      if (footerNum === null || footerNum === undefined || footerNum === "") {
        return { text: "0%", color: "text-gray-400" };
      }

      const numericFooterNum = Number(footerNum);

      // Handle invalid footer numbers
      if (!isFinite(numericFooterNum)) {
        return { text: "0%", color: "text-gray-400" };
      }

      // Format percentage with proper sign
      const formattedPercentage = Math.abs(numericFooterNum).toFixed(1);

      if (numericFooterNum > 0)
        return {
          text: `+${formattedPercentage}%`,
          color: "text-green-600",
        };
      if (numericFooterNum < 0)
        return {
          text: `-${formattedPercentage}%`,
          color: "text-red-500",
        };
      return { text: "0%", color: "text-gray-400" };
    } catch (error) {
      console.error("Error processing footer number:", error);
      return { text: "0%", color: "text-gray-400" };
    }
  };

  const footerDisplay = getFooterDisplay();

  // Color mapping based on title
  const getColorScheme = () => {
    const safeTitle = title?.toLowerCase() || "metric";

    const colorSchemes = {
      // Earnings/Revenue/Sales
      earning: { bg: "from-yellow-100 to-amber-100", text: "text-yellow-600" },
      revenue: { bg: "from-yellow-100 to-amber-100", text: "text-yellow-600" },
      sales: { bg: "from-yellow-100 to-amber-100", text: "text-yellow-600" },

      // Orders (non-completed)
      order: { bg: "from-blue-100 to-cyan-100", text: "text-blue-600" },

      // Completed/Success
      complete: { bg: "from-green-100 to-emerald-100", text: "text-green-600" },
      success: { bg: "from-green-100 to-emerald-100", text: "text-green-600" },

      // Progress/Processing
      progress: { bg: "from-orange-100 to-red-100", text: "text-orange-600" },
      processing: { bg: "from-orange-100 to-red-100", text: "text-orange-600" },

      // Customer/People
      customer: {
        bg: "from-purple-100 to-indigo-100",
        text: "text-purple-600",
      },
      people: { bg: "from-purple-100 to-indigo-100", text: "text-purple-600" },

      // Product/Inventory
      product: { bg: "from-pink-100 to-rose-100", text: "text-pink-600" },
      inventory: { bg: "from-pink-100 to-rose-100", text: "text-pink-600" },

      // Average/Value
      average: { bg: "from-teal-100 to-cyan-100", text: "text-teal-600" },
      value: { bg: "from-teal-100 to-cyan-100", text: "text-teal-600" },
    };

    // Find the first matching color scheme
    const matchedScheme = Object.entries(colorSchemes).find(([key]) =>
      safeTitle.includes(key)
    );

    return matchedScheme
      ? matchedScheme[1]
      : { bg: "from-gray-100 to-slate-100", text: "text-gray-600" };
  };

  const colorScheme = getColorScheme();

  // Format period for display
  const formatPeriod = (period) => {
    if (!period) return "";

    const periodMap = {
      today: "Today",
      yesterday: "Yesterday",
      week: "This Week",
      lastWeek: "Last Week",
      month: "This Month",
      lastMonth: "Last Month",
      year: "This Year",
      lastYear: "Last Year",
      all: "All Time",
    };

    return periodMap[period] || period;
  };

  // Get comparison text based on period
  const getComparisonText = () => {
    if (!comparisonPeriod) return "vs previous period";

    const comparisonMap = {
      today: "vs yesterday",
      yesterday: "vs day before",
      week: "vs last week",
      lastWeek: "vs two weeks ago",
      month: "vs last month",
      lastMonth: "vs two months ago",
      year: "vs last year",
      lastYear: "vs two years ago",
      all: "vs previous period",
    };

    return comparisonMap[comparisonPeriod] || "vs previous period";
  };

  // Safe icon rendering
  const renderIcon = () => {
    try {
      // If icon is a Promise, return loading state
      if (icon && typeof icon.then === "function") {
        console.warn("Icon prop is a Promise, rendering fallback");
        return "📊";
      }

      // If icon is a React element or valid JSX, return it
      if (React.isValidElement(icon)) {
        return icon;
      }

      // If icon is a string or number, return it
      if (typeof icon === "string" || typeof icon === "number") {
        return icon;
      }

      // Fallback for any other invalid values
      return "📊";
    } catch (error) {
      console.error("Error rendering icon:", error);
      return "📊";
    }
  };

  // Validate props and provide defaults
  const safeTitle = title || "Metric";
  const safeIcon = renderIcon();
  const safeNumber = number ?? 0;
  const safeFooterText = footerText || getComparisonText();
  const safePeriod = formatPeriod(period);

  return (
    <div
      className={`bg-white/80 backdrop-blur-xl text-gray-900 py-4 px-5 rounded-2xl w-full shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 hover:scale-105 ${
        onClick ? "cursor-pointer hover:border-blue-300" : ""
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold tracking-wide text-gray-700 line-clamp-1">
            {safeTitle}
          </h1>
          {safePeriod && (
            <p className="text-xs text-gray-500 mt-1">{safePeriod}</p>
          )}
        </div>
        <div
          className={`bg-gradient-to-r ${colorScheme.bg} p-3 rounded-xl ${colorScheme.text} text-lg transition-all duration-300 flex items-center justify-center min-w-[2.5rem] shadow-md ml-2 flex-shrink-0`}
        >
          {safeIcon}
        </div>
      </div>

      <div className="mt-4">
        <h1
          className={`text-2xl font-bold text-gray-900 break-words ${
            loading ? "animate-pulse bg-gray-200 rounded h-8 w-24" : ""
          }`}
        >
          {formatNumber(safeNumber)}
        </h1>
        <div className="text-sm mt-2 flex items-center gap-1 flex-wrap">
          <span
            className={`font-medium ${footerDisplay.color} whitespace-nowrap ${
              loading ? "animate-pulse bg-gray-200 rounded h-4 w-12" : ""
            }`}
          >
            {footerDisplay.text}
          </span>
          <span className="text-gray-500 text-xs whitespace-nowrap">
            {safeFooterText}
          </span>
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="absolute inset-0 bg-white/50 backdrop-blur-sm rounded-2xl flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        </div>
      )}
    </div>
  );
};

// Add prop validation
MiniCard.propTypes = {
  title: PropTypes.string,
  icon: PropTypes.oneOfType([
    PropTypes.node,
    PropTypes.string,
    PropTypes.number,
    PropTypes.element,
  ]),
  number: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  footerNum: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  footerText: PropTypes.string,
  currency: PropTypes.bool,
  loading: PropTypes.bool,
  onClick: PropTypes.func,
  period: PropTypes.string,
  comparisonPeriod: PropTypes.string,
};

MiniCard.defaultProps = {
  title: "Metric",
  icon: "📊",
  number: 0,
  footerNum: 0,
  footerText: "vs previous period",
  currency: false,
  loading: false,
  onClick: undefined,
  period: "",
  comparisonPeriod: "",
};

export default MiniCard;
