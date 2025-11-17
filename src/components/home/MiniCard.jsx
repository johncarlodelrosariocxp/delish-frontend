import PropTypes from "prop-types";

const MiniCard = ({ title, icon, number, footerNum, footerText, currency }) => {
  // Format number with proper currency formatting and error handling
  const formatNumber = (num) => {
    try {
      const numericValue = Number(num);

      // Handle NaN, Infinity, and negative numbers
      if (!isFinite(numericValue) || numericValue < 0) {
        return currency ? "₱0.00" : "0";
      }

      if (currency) {
        return `₱${numericValue.toLocaleString("en-PH", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
      }

      // For non-currency numbers, remove decimal places if whole number
      if (Number.isInteger(numericValue)) {
        return numericValue.toLocaleString("en-PH");
      }

      // For decimal numbers, show 2 decimal places
      return numericValue.toLocaleString("en-PH", {
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
    try {
      const numericFooterNum = Number(footerNum);

      // Handle invalid footer numbers
      if (!isFinite(numericFooterNum)) {
        return { text: "0%", color: "text-gray-400" };
      }

      if (numericFooterNum > 0)
        return {
          text: `+${Math.abs(numericFooterNum).toFixed(1)}%`,
          color: "text-[#02ca3a]",
        };
      if (numericFooterNum < 0)
        return {
          text: `-${Math.abs(numericFooterNum).toFixed(1)}%`,
          color: "text-red-500",
        };
      return { text: "0%", color: "text-gray-400" };
    } catch (error) {
      console.error("Error processing footer number:", error);
      return { text: "0%", color: "text-gray-400" };
    }
  };

  const footerDisplay = getFooterDisplay();

  // Determine button background color based on title
  const getButtonColor = () => {
    switch (title) {
      case "Total Earnings":
        return "bg-[#02ca3a] hover:bg-[#02a32a]";
      case "Total Orders":
        return "bg-blue-500 hover:bg-blue-600";
      case "In Progress":
        return "bg-orange-500 hover:bg-orange-600";
      case "Completed":
        return "bg-green-500 hover:bg-green-600";
      case "Pending":
        return "bg-yellow-500 hover:bg-yellow-600";
      case "Cancelled":
        return "bg-red-500 hover:bg-red-600";
      default:
        return "bg-[#f6b100] hover:bg-[#e6a100]";
    }
  };

  // Validate props and provide defaults
  const safeTitle = title || "Metric";
  const safeIcon = icon || "📊";
  const safeNumber = number !== undefined && number !== null ? number : 0;
  const safeFooterText = footerText || "vs previous period";

  return (
    <div className="bg-white text-black py-4 px-5 rounded-xl w-full sm:w-[48%] lg:w-[49%] shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 hover:border-gray-200">
      <div className="flex items-start justify-between">
        <h1 className="text-lg font-semibold tracking-wide text-gray-800 line-clamp-1">
          {safeTitle}
        </h1>
        <div
          className={`${getButtonColor()} p-3 rounded-lg text-white text-2xl transition-colors duration-200 flex items-center justify-center min-w-[3rem]`}
        >
          {safeIcon}
        </div>
      </div>

      <div className="mt-4">
        <h1 className="text-3xl font-bold text-gray-900 break-words">
          {formatNumber(safeNumber)}
        </h1>
        <div className="text-base mt-2 flex items-center gap-1 flex-wrap">
          <span
            className={`font-semibold ${footerDisplay.color} whitespace-nowrap`}
          >
            {footerDisplay.text}
          </span>
          <span className="text-gray-600 text-sm whitespace-nowrap">
            {safeFooterText}
          </span>
        </div>
      </div>

      {/* Debug info - remove in production */}
      {process.env.NODE_ENV === "development" && (
        <div className="mt-2 text-xs text-gray-400">
          Raw: {safeNumber} | Footer: {footerNum}
        </div>
      )}
    </div>
  );
};

// Add prop validation
MiniCard.propTypes = {
  title: PropTypes.string,
  icon: PropTypes.node,
  number: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  footerNum: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  footerText: PropTypes.string,
  currency: PropTypes.bool,
};

MiniCard.defaultProps = {
  title: "Metric",
  icon: "📊",
  number: 0,
  footerNum: 0,
  footerText: "vs previous period",
  currency: false,
};

export default MiniCard;
