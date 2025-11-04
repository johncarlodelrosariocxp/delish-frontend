import React from "react";

const MiniCard = ({ title, icon, number, footerNum, footerText, currency }) => {
  return (
    <div className="bg-white text-black py-4 px-5 rounded-xl w-full sm:w-[48%] lg:w-[49%] shadow-md hover:shadow-lg transition-all duration-300">
      <div className="flex items-start justify-between">
        <h1 className="text-lg font-semibold tracking-wide">{title}</h1>
        <button
          className={`${
            title === "Total Earnings" ? "bg-[#02ca3a]" : "bg-[#f6b100]"
          } p-3 rounded-lg text-white text-2xl`}
        >
          {icon}
        </button>
      </div>

      <div>
        <h1 className="text-3xl font-bold mt-4">
          {currency ? `₱${number}` : number}
        </h1>
        <h1 className="text-base mt-2">
          <span
            className={`font-semibold ${
              footerNum > 0
                ? "text-[#02ca3a]"
                : footerNum < 0
                ? "text-red-500"
                : "text-gray-400"
            }`}
          >
            {footerNum > 0
              ? `+${footerNum}%`
              : footerNum < 0
              ? `${footerNum}%`
              : "0%"}
          </span>{" "}
          {footerText}
        </h1>
      </div>
    </div>
  );
};

export default MiniCard;
