import { FaCheckDouble, FaLongArrowAltRight, FaCircle } from "react-icons/fa";
import { getAvatarName } from "../../utils/index";
import PropTypes from "prop-types";

const OrderList = ({ order }) => {
  // Safe access to nested properties with fallbacks
  const customerName = order?.customerDetails?.name || "Guest";
  const itemCount = order?.items?.length || 0;
  const tableNumber = order?.table?.tableNo || "N/A";
  const orderStatus = order?.orderStatus || "Unknown";

  return (
    <div className="flex items-center gap-5 mb-3 bg-white p-4 rounded-lg shadow-sm">
      <button className="bg-[#f6b100] p-3 text-xl font-bold rounded-lg text-white">
        {getAvatarName(customerName)}
      </button>
      <div className="flex items-center justify-between w-full">
        <div className="flex flex-col items-start gap-1">
          <h1 className="text-[#333333] text-lg font-semibold tracking-wide">
            {customerName}
          </h1>
          <p className="text-[#666666] text-sm">{itemCount} Items</p>
        </div>

        <h1 className="text-[#f6b100] font-semibold border border-[#f6b100] rounded-lg p-1">
          Table <FaLongArrowAltRight className="text-[#ababab] ml-2 inline" />{" "}
          {tableNumber}
        </h1>

        <div className="flex flex-col items-end gap-2">
          {orderStatus === "Ready" ? (
            <p className="text-green-600 bg-[#e6f4ec] px-2 py-1 rounded-lg">
              <FaCheckDouble className="inline mr-2" /> {orderStatus}
            </p>
          ) : (
            <p className="text-yellow-600 bg-[#fdf6e3] px-2 py-1 rounded-lg">
              <FaCircle className="inline mr-2" /> {orderStatus}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// Add PropTypes validation
OrderList.propTypes = {
  order: PropTypes.shape({
    customerDetails: PropTypes.shape({
      name: PropTypes.string,
    }),
    items: PropTypes.array,
    table: PropTypes.shape({
      tableNo: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    }),
    orderStatus: PropTypes.string,
  }),
};

// Add default props for safety
OrderList.defaultProps = {
  order: {
    customerDetails: {
      name: "Guest",
    },
    items: [],
    table: {
      tableNo: "N/A",
    },
    orderStatus: "Unknown",
  },
};

export default OrderList;
