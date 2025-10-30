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
      if (current >= 10) return prev; // max 10
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
          id: `${item.id}-${variant.label}`, // stable id per product+variant
          name: `${item.name} (${variant.label})`,
          pricePerQuantity: variant.price,
          quantity: count,
          price: variant.price, // unit price
        };
        dispatch(addItems(newObj));
        added = true;
      }
    });

    if (added) {
      // reset counts for this product
      const resetCounts = { ...itemCounts };
      item.variants.forEach((variant) => {
        const key = `${item.id}-${variant.label}`;
        resetCounts[key] = 0;
      });
      setItemCounts(resetCounts);
    }
  };

  return (
    <div className="w-full h-screen overflow-y-auto bg-gray-50">
      {/* Category Tabs */}
      <div className="sticky top-0 z-10 bg-white shadow-md">
        <div className="flex overflow-x-auto gap-3 px-4 py-4 md:grid md:grid-cols-4 md:px-10">
          {menus.map((menu) => (
            <div
              key={menu.id}
              className="flex-shrink-0 md:flex-col items-start justify-between p-3 rounded-lg min-w-[140px] h-[90px] cursor-pointer shadow-sm hover:shadow-md transition transform hover:scale-105"
              style={{ backgroundColor: menu.bgColor }}
              onClick={() => {
                setSelected(menu);
                setItemCounts({});
              }}
            >
              <div className="flex items-center justify-between w-full">
                <h1 className="text-white text-sm font-semibold flex items-center gap-2">
                  {menu.icon} {menu.name}
                </h1>
                {selected.id === menu.id && (
                  <GrRadialSelected className="text-white" size={16} />
                )}
              </div>
              <p className="text-gray-100 text-xs font-medium">
                {menu.items.length} Items
              </p>
            </div>
          ))}
        </div>
        <hr className="border-gray-200 border-t-2" />
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 px-4 py-6 md:px-10">
        {selected?.items.map((item) => (
          <div
            key={item.id}
            className="flex flex-col gap-4 p-5 rounded-xl bg-white shadow-md hover:shadow-xl transition transform hover:scale-105"
          >
            {/* Product Image */}
            {item.image && (
              <img
                src={item.image}
                alt={item.name}
                className="w-full h-32 object-cover rounded-lg shadow-sm"
              />
            )}

            {/* Header with name + cart */}
            <div className="flex justify-between items-center">
              <h1 className="text-gray-900 text-lg font-bold">{item.name}</h1>
              <button
                onClick={() => handleAddToCart(item)}
                className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900 p-2 rounded-lg shadow-md hover:shadow-lg transition"
              >
                <FaShoppingCart size={18} />
              </button>
            </div>

            {/* Variants with + / - */}
            {item.variants.map((variant) => {
              const key = `${item.id}-${variant.label}`;
              const count = itemCounts[key] || 0;

              return (
                <div key={variant.label} className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <p className="text-gray-800 text-sm font-semibold">
                      ₱{variant.price} / {variant.label}
                    </p>
                  </div>
                  <div className="flex items-center justify-between bg-gray-100 px-4 py-3 rounded-lg shadow-inner">
                    <button
                      onClick={() => decrement(item.id, variant.label)}
                      className="bg-red-500 text-white w-8 h-8 flex items-center justify-center rounded-full shadow hover:bg-red-600 transition"
                    >
                      &minus;
                    </button>
                    <span className="text-gray-900 text-base font-bold">
                      {count}
                    </span>
                    <button
                      onClick={() => increment(item.id, variant.label)}
                      className="bg-green-500 text-white w-8 h-8 flex items-center justify-center rounded-full shadow hover:bg-green-600 transition"
                    >
                      &#43;
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MenuContainer;
