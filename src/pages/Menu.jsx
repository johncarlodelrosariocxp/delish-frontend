import React, { useEffect } from "react";
import BottomNav from "../components/shared/BottomNav";
import BackButton from "../components/shared/BackButton";
import { MdRestaurantMenu } from "react-icons/md";
import MenuContainer from "../components/menu/MenuContainer";
import CustomerInfo from "../components/menu/CustomerInfo";
import CartInfo from "../components/menu/CartInfo";
import Bill from "../components/menu/Bill";
import { useSelector } from "react-redux";

const Menu = () => {
  useEffect(() => {
    document.title = "POS | Menu";
  }, []);

  const customerData = useSelector((state) => state.customer);

  return (
    <section className="bg-white min-h-screen flex flex-col">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-col lg:flex-row gap-3 p-3 pb-20 lg:pb-3">
        {/* Left Div - Menu Section - Always at top on mobile/tablet */}
        <div className="flex-1 lg:flex-[3] flex flex-col min-h-0 order-1">
          {/* Menu Container with scrollable area */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <MenuContainer />
          </div>
        </div>

        {/* Right Div - Sidebar - Always at bottom on mobile/tablet, side on desktop */}
        <div className="flex-1 lg:flex-[1] bg-gray-100 rounded-lg shadow-md mt-3 lg:mt-0 h-auto lg:h-[calc(100vh-8rem)] flex flex-col order-2">
          {/* Customer Info */}
          <div className="flex-shrink-0">
            <CustomerInfo />
          </div>

          <hr className="border-gray-300 border-t-2" />

          {/* Cart Info with scroll */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <CartInfo />
          </div>

          <hr className="border-gray-300 border-t-2" />

          {/* Bills - Fixed at bottom */}
          <div className="flex-shrink-0">
            <Bill />
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <BottomNav />
      </div>
    </section>
  );
};

export default Menu;
