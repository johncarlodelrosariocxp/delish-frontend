import React from "react";
import PropTypes from "prop-types";
import {
  FaDollarSign,
  FaShoppingCart,
  FaUsers,
  FaChartLine,
  FaBox,
  FaReceipt,
  FaCheckCircle,
  FaClock,
  FaPercent,
  FaSpinner,
} from "react-icons/fa";

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
  variant = "default",
}) => {
  // Local number formatting function
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
        // Use toLocaleString for Philippine Peso formatting
        return `₱${numericValue.toLocaleString("en-PH", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
      }

      // For non-currency numbers
      return numericValue.toLocaleString("en-PH");
    } catch (error) {
      console.error("Error formatting number:", error);
      return currency ? "₱0.00" : "0";
    }
  };

  // Format number without currency symbol for percentage calculations
  const formatPlainNumber = (num) => {
    try {
      if (num === null || num === undefined || num === "") return "0";
      const numericValue = Number(num);
      if (!isFinite(numericValue)) return "0";
      return numericValue.toLocaleString("en-PH");
    } catch (error) {
      return "0";
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

      // Format percentage with proper sign and localization
      const formattedPercentage = Math.abs(numericFooterNum).toLocaleString("en-PH", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      });

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

  // Get icon component based on variant or icon prop
  const getIconComponent = () => {
    if (typeof icon === "string") {
      const iconMap = {
        sales: FaDollarSign,
        revenue: FaDollarSign,
        earnings: FaDollarSign,
        orders: FaShoppingCart,
        customers: FaUsers,
        growth: FaChartLine,
        products: FaBox,
        inventory: FaBox,
        receipts: FaReceipt,
        completed: FaCheckCircle,
        pending: FaClock,
        progress: FaSpinner,
        percentage: FaPercent,
        default: FaChartLine,
      };

      const IconComponent = iconMap[icon.toLowerCase()] || iconMap.default;
      return <IconComponent className="text-lg" />;
    }

    // If icon is already a React component
    return icon || <FaChartLine className="text-lg" />;
  };

  // Color mapping based on variant and title
  const getColorScheme = () => {
    if (variant !== "default") {
      const variantSchemes = {
        primary: {
          bg: "from-blue-100 to-blue-50",
          text: "text-blue-600",
          iconBg: "bg-blue-500",
        },
        secondary: {
          bg: "from-purple-100 to-purple-50",
          text: "text-purple-600",
          iconBg: "bg-purple-500",
        },
        success: {
          bg: "from-green-100 to-green-50",
          text: "text-green-600",
          iconBg: "bg-green-500",
        },
        warning: {
          bg: "from-yellow-100 to-yellow-50",
          text: "text-yellow-600",
          iconBg: "bg-yellow-500",
        },
        danger: {
          bg: "from-red-100 to-red-50",
          text: "text-red-600",
          iconBg: "bg-red-500",
        },
        info: {
          bg: "from-cyan-100 to-cyan-50",
          text: "text-cyan-600",
          iconBg: "bg-cyan-500",
        },
      };

      return variantSchemes[variant] || variantSchemes.primary;
    }

    const safeTitle = title?.toLowerCase() || "metric";

    const colorSchemes = {
      earning: {
        bg: "from-green-100 to-emerald-50",
        text: "text-green-600",
        iconBg: "bg-green-500",
      },
      revenue: {
        bg: "from-green-100 to-emerald-50",
        text: "text-green-600",
        iconBg: "bg-green-500",
      },
      sales: {
        bg: "from-green-100 to-emerald-50",
        text: "text-green-600",
        iconBg: "bg-green-500",
      },
      income: {
        bg: "from-green-100 to-emerald-50",
        text: "text-green-600",
        iconBg: "bg-green-500",
      },
      order: {
        bg: "from-blue-100 to-blue-50",
        text: "text-blue-600",
        iconBg: "bg-blue-500",
      },
      transaction: {
        bg: "from-blue-100 to-blue-50",
        text: "text-blue-600",
        iconBg: "bg-blue-500",
      },
      customer: {
        bg: "from-purple-100 to-purple-50",
        text: "text-purple-600",
        iconBg: "bg-purple-500",
      },
      users: {
        bg: "from-purple-100 to-purple-50",
        text: "text-purple-600",
        iconBg: "bg-purple-500",
      },
      people: {
        bg: "from-purple-100 to-purple-50",
        text: "text-purple-600",
        iconBg: "bg-purple-500",
      },
      product: {
        bg: "from-orange-100 to-orange-50",
        text: "text-orange-600",
        iconBg: "bg-orange-500",
      },
      inventory: {
        bg: "from-orange-100 to-orange-50",
        text: "text-orange-600",
        iconBg: "bg-orange-500",
      },
      items: {
        bg: "from-orange-100 to-orange-50",
        text: "text-orange-600",
        iconBg: "bg-orange-500",
      },
      average: {
        bg: "from-teal-100 to-teal-50",
        text: "text-teal-600",
        iconBg: "bg-teal-500",
      },
      value: {
        bg: "from-teal-100 to-teal-50",
        text: "text-teal-600",
        iconBg: "bg-teal-500",
      },
      avg: {
        bg: "from-teal-100 to-teal-50",
        text: "text-teal-600",
        iconBg: "bg-teal-500",
      },
      completed: {
        bg: "from-green-100 to-green-50",
        text: "text-green-600",
        iconBg: "bg-green-500",
      },
      delivered: {
        bg: "from-green-100 to-green-50",
        text: "text-green-600",
        iconBg: "bg-green-500",
      },
      success: {
        bg: "from-green-100 to-green-50",
        text: "text-green-600",
        iconBg: "bg-green-500",
      },
      pending: {
        bg: "from-yellow-100 to-yellow-50",
        text: "text-yellow-600",
        iconBg: "bg-yellow-500",
      },
      processing: {
        bg: "from-yellow-100 to-yellow-50",
        text: "text-yellow-600",
        iconBg: "bg-yellow-500",
      },
      progress: {
        bg: "from-yellow-100 to-yellow-50",
        text: "text-yellow-600",
        iconBg: "bg-yellow-500",
      },
      cancelled: {
        bg: "from-red-100 to-red-50",
        text: "text-red-600",
        iconBg: "bg-red-500",
      },
      failed: {
        bg: "from-red-100 to-red-50",
        text: "text-red-600",
        iconBg: "bg-red-500",
      },
      rejected: {
        bg: "from-red-100 to-red-50",
        text: "text-red-600",
        iconBg: "bg-red-500",
      },
    };

    const matchedScheme = Object.entries(colorSchemes).find(([key]) =>
      safeTitle.includes(key)
    );

    return matchedScheme
      ? matchedScheme[1]
      : {
          bg: "from-gray-100 to-gray-50",
          text: "text-gray-600",
          iconBg: "bg-gray-500",
        };
  };

  const colorScheme = getColorScheme();
  const IconComponent = getIconComponent();

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

  // Validate props and provide defaults
  const safeTitle = title || "Metric";
  const safeNumber = number ?? 0;
  const safeFooterText = footerText || getComparisonText();
  const safePeriod = formatPeriod(period);

  return (
    <div
      className={`bg-white/80 backdrop-blur-sm text-gray-900 py-4 px-5 rounded-xl w-full shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200/50 ${
        onClick ? "cursor-pointer hover:border-blue-300 hover:scale-[1.02]" : ""
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
          className={`${colorScheme.iconBg} text-white p-3 rounded-lg transition-all duration-200 flex items-center justify-center min-w-[2.5rem] shadow-sm ml-2 flex-shrink-0`}
        >
          {IconComponent}
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
        <div className="absolute inset-0 bg-white/50 backdrop-blur-sm rounded-xl flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        </div>
      )}
    </div>
  );
};

// Add prop validation
MiniCard.propTypes = {
  title: PropTypes.string,
  icon: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  number: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  footerNum: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  footerText: PropTypes.string,
  currency: PropTypes.bool,
  loading: PropTypes.bool,
  onClick: PropTypes.func,
  period: PropTypes.string,
  comparisonPeriod: PropTypes.string,
  variant: PropTypes.oneOf([
    "default",
    "primary",
    "secondary",
    "success",
    "warning",
    "danger",
    "info",
  ]),
};

MiniCard.defaultProps = {
  title: "Metric",
  icon: "default",
  number: 0,
  footerNum: 0,
  footerText: "vs previous period",
  currency: false,
  loading: false,
  onClick: undefined,
  period: "",
  comparisonPeriod: "",
  variant: "default",
};

export default MiniCard;