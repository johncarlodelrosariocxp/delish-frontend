import React, { memo } from "react";
import { MdOutlineReorder } from "react-icons/md";
import { BiSolidDish } from "react-icons/bi";
import { useNavigate, useLocation } from "react-router-dom";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <>
      <style jsx>{`
        .glass-container {
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(15px) saturate(180%);
          -webkit-backdrop-filter: blur(15px) saturate(180%);
          border: 1px solid rgba(255, 255, 255, 0.18);
          box-shadow: 
            0 4px 20px rgba(0, 0, 0, 0.08),
            inset 0 1px 0 rgba(255, 255, 255, 0.15);
        }
        
        .glass-button {
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.15);
        }
        
        .glass-button-active {
          background: linear-gradient(135deg, 
            rgba(246, 177, 0, 0.85), 
            rgba(255, 215, 0, 0.95)
          );
          border: 1px solid rgba(255, 228, 77, 0.25);
          box-shadow: 
            0 2px 12px rgba(246, 177, 0, 0.25),
            inset 0 1px 0 rgba(255, 255, 255, 0.25);
        }
        
        .glass-button-orders-active {
          background: linear-gradient(135deg, 
            rgba(79, 70, 229, 0.85), 
            rgba(124, 115, 255, 0.95)
          );
          border: 1px solid rgba(165, 180, 252, 0.25);
          box-shadow: 
            0 2px 12px rgba(79, 70, 229, 0.25),
            inset 0 1px 0 rgba(255, 255, 255, 0.25);
        }
        
        .liquid-shine {
          background: linear-gradient(
            120deg,
            transparent 30%,
            rgba(255, 255, 255, 0.2) 50%,
            transparent 70%
          );
          background-size: 200% 100%;
          animation: shine 3s infinite;
        }
        
        @keyframes shine {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        
        .hover-lift {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        
        .hover-lift:hover {
          transform: translateY(-1px);
        }
      `}</style>

      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 w-[90%] max-w-sm z-50">
        <div className="glass-container rounded-2xl relative overflow-hidden">
          <div className="absolute inset-0 rounded-2xl liquid-shine opacity-25" />
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 via-transparent to-white/3" />
          <div className="absolute inset-0 rounded-2xl border border-white/15 pointer-events-none" />
          
          <div className="relative p-1.5 flex justify-between items-center h-14">
            {/* Menu Button */}
            <button
              onClick={() => {
                if (!isActive("/menu")) {
                  navigate("/menu");
                }
              }}
              className={`relative flex items-center justify-center font-medium h-12 rounded-xl transition-all duration-200 hover-lift ${
                isActive("/menu")
                  ? "glass-button-active text-white"
                  : "glass-button text-gray-800 hover:text-gray-900"
              } w-[48%] overflow-hidden`}
            >
              <div className="absolute top-0 left-0 right-0 h-1/2 rounded-t-xl bg-gradient-to-b from-white/25 to-transparent" />
              <div className="relative flex items-center justify-center space-x-1.5 z-10">
                <BiSolidDish 
                  className={`transition-transform duration-200 ${
                    isActive("/menu") ? "scale-105" : ""
                  }`} 
                  size={20} 
                /> 
                <p className="text-sm font-semibold tracking-tight">Menu</p>
              </div>
              {isActive("/menu") && (
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#F6B100]/15 to-[#FFD700]/15 blur-sm" />
              )}
            </button>

            {/* Orders Button */}
            <button
              onClick={() => {
                if (!isActive("/orders")) {
                  navigate("/orders");
                }
              }}
              className={`relative flex items-center justify-center font-medium h-12 rounded-xl transition-all duration-200 hover-lift ${
                isActive("/orders")
                  ? "glass-button-orders-active text-white"
                  : "glass-button text-gray-800 hover:text-gray-900"
              } w-[48%] overflow-hidden`}
            >
              <div className="absolute top-0 left-0 right-0 h-1/2 rounded-t-xl bg-gradient-to-b from-white/25 to-transparent" />
              <div className="relative flex items-center justify-center space-x-1.5 z-10">
                <MdOutlineReorder 
                  className={`transition-transform duration-200 ${
                    isActive("/orders") ? "scale-105" : ""
                  }`} 
                  size={20} 
                /> 
                <p className="text-sm font-semibold tracking-tight">Orders</p>
              </div>
              {isActive("/orders") && (
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#4F46E5]/15 to-[#7C73FF]/15 blur-sm" />
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default memo(BottomNav);