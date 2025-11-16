import React from "react";
import { FaHome } from "react-icons/fa";
import { MdOutlineReorder } from "react-icons/md";
import { BiSolidDish } from "react-icons/bi";
import { useNavigate, useLocation } from "react-router-dom";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-500 p-2 h-16 flex justify-around z-50">
      {/* Home */}
      <button
        onClick={() => navigate("/")}
        className={`flex items-center justify-center font-bold ${
          isActive("/")
            ? "text-white bg-gray-600"
            : "text-gray-200 hover:text-white"
        } w-[300px] rounded-[20px] transition-all`}
      >
        <FaHome className="inline mr-2" size={20} /> <p>Home</p>
      </button>

      {/* Orders */}
      <button
        onClick={() => navigate("/orders")}
        className={`flex items-center justify-center font-bold ${
          isActive("/orders")
            ? "text-white bg-gray-600"
            : "text-gray-200 hover:text-white"
        } w-[300px] rounded-[20px] transition-all`}
      >
        <MdOutlineReorder className="inline mr-2" size={20} /> <p>Orders</p>
      </button>

      {/* Floating Action Button - Direct to Menu */}
      <button
        onClick={() => navigate("/menu")}
        className="absolute bottom-6 bg-[#F6B100] text-white rounded-full p-4 shadow-[0_0_15px_rgba(246,177,0,0.6)] hover:shadow-[0_0_20px_rgba(246,177,0,0.8)] transition-all"
      >
        <BiSolidDish size={40} />
      </button>
    </div>
  );
};

export default BottomNav;
