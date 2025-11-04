import React, { useState } from "react";
import { menus } from "../../constants";
import { GrRadialSelected } from "react-icons/gr";
import { FaShoppingCart } from "react-icons/fa";
import { useDispatch } from "react-redux";
import { addItems } from "../../redux/slices/cartSlice";

const MenuContainer = () => {
  const [selected, setSelected] = useState(menus[0]);
  const [itemCounts, setItemCounts] = useState({});
  const dispatch = useDispatch();

  const increment = (id, variantLabel) => {
    const key = `${id}-${variantLabel}`;
    setItemCounts((prev) => {
      const current = prev[key] || 0;
      if (current >= 10) return prev;
      return { ...prev, [key]: current + 1 };
    });
  };

  const decrement = (id, variantLabel) => {
    const key = `${id}-${variantLabel}`;
    setItemCounts((prev) => {
      const current = prev[key] || 0;
      if (current <= 0) return prev;
      return { ...prev, [key]: current - 1 };
    });
  };

  const handleAddToCart = (item) => {
    let added = false;

    item.variants.forEach((variant) => {
      const key = `${item.id}-${variant.label}`;
      const count = itemCounts[key] || 0;

      if (count > 0) {
        const newObj = {
          id: `${item.id}-${variant.label}`,
          name: `${item.name} (${variant.label})`,
          pricePerQuantity: variant.price,
          quantity: count,
          price: variant.price,
        };
        dispatch(addItems(newObj));
        added = true;
      }
    });

    if (added) {
      const resetCounts = { ...itemCounts };
      item.variants.forEach((variant) => {
        const key = `${item.id}-${variant.label}`;
        resetCounts[key] = 0;
      });
      setItemCounts(resetCounts);
    }
  };

  return (
    <div className="w-full h-[calc(100vh-8rem)] flex bg-gray-50">
      {/* 🟡 Category Sidebar - 2 Columns */}
      <div className="w-48 sm:w-56 md:w-60 lg:w-64 bg-white shadow-md overflow-y-auto flex-shrink-0">
        <div className="grid grid-cols-2 gap-2 p-3">
          {menus.map((menu) => (
            <div
              key={menu.id}
              onClick={() => {
                setSelected(menu);
                setItemCounts({});
              }}
              className={`flex flex-col items-center justify-center p-3 rounded-lg cursor-pointer transition-all duration-200 hover:scale-105 min-h-[80px] ${
                selected.id === menu.id
                  ? "border-2 border-yellow-400 shadow-lg scale-105"
                  : "border border-gray-200 shadow-sm"
              }`}
              style={{ backgroundColor: menu.bgColor }}
            >
              <div className="text-white text-sm lg:text-base font-semibold text-center mb-1">
                {menu.icon}
              </div>
              <h1 className="text-white text-[0.7rem] sm:text-[0.75rem] font-semibold text-center leading-tight line-clamp-2">
                {menu.name}
              </h1>
              <p className="text-gray-100 text-[0.6rem] font-medium text-center mt-1">
                {menu.items.length} Items
              </p>
              {selected.id === menu.id && (
                <GrRadialSelected className="text-white mt-1" size={10} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 🟢 Scrollable Menu Grid */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Current Category Header */}
        <div className="bg-white shadow-sm border-b border-gray-200 px-4 py-3">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
              style={{ backgroundColor: selected.bgColor }}
            >
              {selected.icon}
            </div>
            <div>
              <h1 className="text-gray-900 text-lg font-bold">
                {selected.name}
              </h1>
              <p className="text-gray-500 text-sm">
                {selected.items.length} items available
              </p>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-4 md:px-6 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3 sm:gap-4">
            {selected?.items.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-3 p-3 rounded-xl bg-white shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 hover:border-yellow-200"
              >
                {/* 🖼️ Image */}
                {item.image && (
                  <div className="w-full h-32 sm:h-36 md:h-40 rounded-lg overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                    />
                  </div>
                )}

                {/* 🏷️ Name + Add Button */}
                <div className="flex justify-between items-start gap-2">
                  <h1 className="text-gray-900 text-sm sm:text-[0.9rem] font-bold leading-tight flex-1 line-clamp-2">
                    {item.name}
                  </h1>
                  <button
                    onClick={() => handleAddToCart(item)}
                    className="bg-yellow-400 text-gray-900 p-2 rounded-lg shadow hover:bg-yellow-500 active:scale-95 transition-colors flex-shrink-0"
                  >
                    <FaShoppingCart size={14} />
                  </button>
                </div>

                {/* 💵 Variants */}
                <div className="space-y-2">
                  {item.variants.map((variant) => {
                    const key = `${item.id}-${variant.label}`;
                    const count = itemCounts[key] || 0;
                    return (
                      <div key={variant.label} className="flex flex-col gap-2">
                        <p className="text-gray-700 text-xs sm:text-[0.8rem] font-medium leading-tight">
                          ₱{variant.price.toLocaleString()} / {variant.label}
                        </p>
                        <div className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                          <button
                            onClick={() => decrement(item.id, variant.label)}
                            className="bg-red-500 text-white w-6 h-6 flex items-center justify-center rounded-full active:scale-90 text-sm transition-transform hover:bg-red-600"
                          >
                            &minus;
                          </button>
                          <span className="text-gray-900 text-sm font-bold min-w-[24px] text-center">
                            {count}
                          </span>
                          <button
                            onClick={() => increment(item.id, variant.label)}
                            className="bg-green-500 text-white w-6 h-6 flex items-center justify-center rounded-full active:scale-90 text-sm transition-transform hover:bg-green-600"
                          >
                            &#43;
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {selected?.items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <div className="text-6xl mb-4">🍽️</div>
              <h3 className="text-lg font-semibold mb-2">No items available</h3>
              <p className="text-sm">Please check back later</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MenuContainer;
