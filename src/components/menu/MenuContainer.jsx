import React, { useState } from "react";
import { menus } from "../../constants";
import { GrRadialSelected } from "react-icons/gr";
import { useDispatch } from "react-redux";
import { addItemsToOrder } from "../../redux/slices/orderSlice";

const MenuContainer = ({ orderId }) => {
  const [selected, setSelected] = useState(menus[0]);
  const [selectedSlice, setSelectedSlice] = useState(null);
  const [showKetoFlavors, setShowKetoFlavors] = useState(false);
  const dispatch = useDispatch();

  // FIXED: Changed payload to item
  const handleAddToCart = (item, variant) => {
    const newObj = {
      id: `${item.id}-${variant.label}`,
      name: `${item.name} (${variant.label})`,
      pricePerQuantity: variant.price,
      quantity: 1,
      price: variant.price,
    };

    console.log("Adding to cart:", { orderId, item: newObj }); // Debug log

    // FIXED: Changed from payload: newObj to item: newObj
    dispatch(addItemsToOrder({ orderId, item: newObj }));
  };

  const handleSelectSlice = (item, variant) => {
    setSelectedSlice({
      item,
      variant,
      image: item.image,
    });
  };

  const handleKetoSliceClick = (item) => {
    setShowKetoFlavors(!showKetoFlavors);
  };

  const handleKetoFlavorSelect = (item, variant) => {
    const newObj = {
      id: `${item.id}-${variant.label}`,
      name: `${item.name} - ${variant.label}`,
      pricePerQuantity: variant.price,
      quantity: 1,
      price: variant.price,
    };

    console.log("Adding keto flavor:", { orderId, item: newObj }); // Debug log

    // FIXED: Changed from payload: newObj to item: newObj
    dispatch(addItemsToOrder({ orderId, item: newObj }));
    setShowKetoFlavors(false);
  };

  const isRegularCheesecakes = selected.name === "Regular Cheesecakes";
  const isKetoCheesecakes = selected.name === "Keto Cheesecakes";
  const isSliceItem = (item) => item.name.includes("Slice");

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
                setSelectedSlice(null);
                setShowKetoFlavors(false);
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

        {/* Selected Slice Preview for Regular Cheesecakes */}
        {isRegularCheesecakes && selectedSlice && (
          <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-lg overflow-hidden border-2 border-yellow-400">
                <img
                  src={selectedSlice.image}
                  alt={selectedSlice.item.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1">
                <h3 className="text-gray-900 font-semibold text-sm">
                  Selected: {selectedSlice.item.name} (
                  {selectedSlice.variant.label})
                </h3>
                <p className="text-gray-600 text-sm">
                  ₱{selectedSlice.variant.price.toLocaleString()}
                </p>
              </div>
              <button
                onClick={() =>
                  handleAddToCart(selectedSlice.item, selectedSlice.variant)
                }
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors font-semibold text-sm"
              >
                Add to Cart
              </button>
            </div>
          </div>
        )}

        {/* Keto Cheesecake Flavors Modal */}
        {showKetoFlavors && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  Select Keto Cheesecake Flavor
                </h2>
                <button
                  onClick={() => setShowKetoFlavors(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selected?.items
                  .find((item) => item.name === "Keto Cheesecake - Slice")
                  ?.variants.map((variant) => (
                    <div
                      key={variant.label}
                      className="border border-gray-200 rounded-lg p-4 hover:border-purple-400 transition-colors cursor-pointer"
                      onClick={() =>
                        handleKetoFlavorSelect(
                          selected.items.find(
                            (item) => item.name === "Keto Cheesecake - Slice"
                          ),
                          variant
                        )
                      }
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {variant.label}
                          </h3>
                          <p className="text-gray-600 text-sm">
                            Keto Cheesecake Slice
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-purple-600">
                            ₱{variant.price.toLocaleString()}
                          </p>
                          <button className="bg-purple-500 text-white px-3 py-1 rounded text-sm hover:bg-purple-600 transition-colors mt-1">
                            Add to Cart
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-4 md:px-6 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3 sm:gap-4">
            {selected?.items.map((item) => (
              <div
                key={item.id}
                className={`flex flex-col gap-3 p-3 rounded-xl bg-white shadow-sm border transition-all duration-200 hover:shadow-md ${
                  isRegularCheesecakes &&
                  isSliceItem(item) &&
                  selectedSlice?.item?.id === item.id
                    ? "border-2 border-yellow-400 bg-yellow-50"
                    : "border-gray-100 hover:border-yellow-200"
                } ${
                  isKetoCheesecakes && isSliceItem(item) && showKetoFlavors
                    ? "border-2 border-purple-400 bg-purple-50"
                    : ""
                }`}
              >
                {/* 🏷️ Name */}
                <div className="flex justify-between items-start gap-2">
                  <h1 className="text-gray-900 text-sm sm:text-[0.9rem] font-bold leading-tight flex-1 line-clamp-2">
                    {item.name}
                  </h1>
                </div>

                {/* 💵 Variants */}
                <div className="space-y-2">
                  {item.variants.map((variant) => (
                    <div key={variant.label} className="flex flex-col gap-2">
                      <p className="text-gray-700 text-xs sm:text-[0.8rem] font-medium leading-tight">
                        ₱{variant.price.toLocaleString()} / {variant.label}
                      </p>

                      {/* Special handling for Regular Cheesecake Slice */}
                      {isRegularCheesecakes &&
                      isSliceItem(item) &&
                      variant.label === "Slice" ? (
                        <button
                          onClick={() => handleSelectSlice(item, variant)}
                          className={`py-2 rounded-lg shadow font-semibold text-sm w-full transition-colors ${
                            selectedSlice?.item?.id === item.id
                              ? "bg-green-500 text-white hover:bg-green-600"
                              : "bg-yellow-400 text-gray-900 hover:bg-yellow-500"
                          }`}
                        >
                          {selectedSlice?.item?.id === item.id
                            ? "Selected"
                            : "Select"}
                        </button>
                      ) : /* Special handling for Keto Cheesecake Slice */
                      isKetoCheesecakes &&
                        isSliceItem(item) &&
                        variant.label === "Slice" ? (
                        <button
                          onClick={() => handleKetoSliceClick(item)}
                          className="bg-purple-500 text-white py-2 rounded-lg shadow hover:bg-purple-600 transition-colors font-semibold text-sm w-full"
                        >
                          Choose Flavor
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAddToCart(item, variant)}
                          className="bg-yellow-400 text-gray-900 py-2 rounded-lg shadow hover:bg-yellow-500 active:scale-95 transition-colors font-semibold text-sm w-full"
                        >
                          Add
                        </button>
                      )}
                    </div>
                  ))}
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
