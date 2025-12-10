import React, { useState } from "react";
import { menus } from "../../constants";
import { GrRadialSelected } from "react-icons/gr";
import { useDispatch } from "react-redux";
import { addItemsToOrder } from "../../redux/slices/orderSlice";

const MenuContainer = ({ orderId }) => {
  const [selected, setSelected] = useState(menus[0]);
  const [selectedSlice, setSelectedSlice] = useState(null);
  const [showRegularFlavors, setShowRegularFlavors] = useState(false);
  const [showKetoFlavors, setShowKetoFlavors] = useState(false);
  const [selectedRegularItem, setSelectedRegularItem] = useState(null);
  const [selectedRegularBase, setSelectedRegularBase] = useState(null);
  const [availableRegularFlavors, setAvailableRegularFlavors] = useState([]);
  const [selectedKetoItem, setSelectedKetoItem] = useState(null);
  const [selectedKetoBase, setSelectedKetoBase] = useState(null);
  const [availableKetoFlavors, setAvailableKetoFlavors] = useState([]);
  const [selectedKetoMiniItem, setSelectedKetoMiniItem] = useState(null);
  const [selectedKetoMiniBase, setSelectedKetoMiniBase] = useState(null);
  const [availableKetoMiniFlavors, setAvailableKetoMiniFlavors] = useState([]);

  const dispatch = useDispatch();

  // Update the Keto Cheesecake - Slices price to 330 pesos
  const updatedMenus = menus.map((menu) => {
    if (menu.name === "Keto Cheesecakes") {
      return {
        ...menu,
        items: menu.items.map((item) => {
          if (item.name === "Keto Cheesecake - Slices") {
            return {
              ...item,
              variants: item.variants.map((variant) => ({
                ...variant,
                price: 330, // Set price to 330 pesos
              })),
            };
          }
          return item;
        }),
      };
    }
    return menu;
  });

  // Handle regular item add to cart
  const handleAddToCart = (item, variant) => {
    const newObj = {
      id: `${item.id}-${variant.label}`,
      name: `${item.name} (${variant.label})`,
      pricePerQuantity: variant.price,
      quantity: 1,
      price: variant.price,
    };

    dispatch(addItemsToOrder({ orderId, item: newObj }));
  };

  // Handle Bento & Mini item add to cart
  const handleAddBentoToCart = (item, variant) => {
    const newObj = {
      id: `${item.id}-${variant.label}`,
      name: `${item.name}`,
      pricePerQuantity: variant.price,
      quantity: 1,
      price: variant.price,
    };

    dispatch(addItemsToOrder({ orderId, item: newObj }));
  };

  // Handle Regular Cheesecake Slice Base selection
  const handleRegularSliceClick = (item, baseVariant) => {
    setSelectedRegularItem(item);
    setSelectedRegularBase(baseVariant);

    const allFlavors =
      item.flavorOptions?.map((flavor) => ({
        ...flavor,
        description: `${item.name} with ${flavor.label} flavor`,
      })) || [];

    setAvailableRegularFlavors(allFlavors);
    setShowRegularFlavors(true);
  };

  const handleRegularFlavorSelect = (flavor) => {
    if (!selectedRegularItem || !selectedRegularBase) return;

    const newObj = {
      id: `${selectedRegularItem.id}-${selectedRegularBase.label}-${flavor.label}`,
      name: `${selectedRegularItem.name} - ${flavor.label}`,
      pricePerQuantity: flavor.price,
      quantity: 1,
      price: flavor.price,
    };

    dispatch(addItemsToOrder({ orderId, item: newObj }));
    setShowRegularFlavors(false);
    setSelectedRegularItem(null);
    setSelectedRegularBase(null);
  };

  // Handle Keto Cheesecake Slices Base selection
  const handleKetoSliceClick = (item, baseVariant) => {
    setSelectedKetoItem(item);
    setSelectedKetoBase(baseVariant);

    const allFlavors =
      item.flavorOptions?.map((flavor) => ({
        ...flavor,
        description: `${item.name} with ${flavor.label} flavor`,
      })) || [];

    setAvailableKetoFlavors(allFlavors);
    setShowKetoFlavors(true);
  };

  const handleKetoFlavorSelect = (flavor) => {
    if (!selectedKetoItem || !selectedKetoBase) return;

    const newObj = {
      id: `${selectedKetoItem.id}-${selectedKetoBase.label}-${flavor.label}`,
      name: `${selectedKetoItem.name} - ${flavor.label}`,
      pricePerQuantity: flavor.price,
      quantity: 1,
      price: flavor.price,
    };

    dispatch(addItemsToOrder({ orderId, item: newObj }));
    setShowKetoFlavors(false);
    setSelectedKetoItem(null);
    setSelectedKetoBase(null);
  };

  // Handle Keto Cheesecake Mini Base selection
  const handleKetoMiniClick = (item, baseVariant) => {
    setSelectedKetoMiniItem(item);
    setSelectedKetoMiniBase(baseVariant);

    const allFlavors =
      item.flavorOptions?.map((flavor) => ({
        ...flavor,
        description: `${item.name} with ${flavor.label} flavor`,
      })) || [];

    setAvailableKetoMiniFlavors(allFlavors);
    setShowKetoFlavors(true);
  };

  const handleKetoMiniFlavorSelect = (flavor) => {
    if (!selectedKetoMiniItem || !selectedKetoMiniBase) return;

    const newObj = {
      id: `${selectedKetoMiniItem.id}-${selectedKetoMiniBase.label}-${flavor.label}`,
      name: `${selectedKetoMiniItem.name} - ${flavor.label}`,
      pricePerQuantity: flavor.price,
      quantity: 1,
      price: flavor.price,
    };

    dispatch(addItemsToOrder({ orderId, item: newObj }));
    setShowKetoFlavors(false);
    setSelectedKetoMiniItem(null);
    setSelectedKetoMiniBase(null);
  };

  const isRegularCheesecakes = selected.name === "Regular Cheesecakes";
  const isKetoCheesecakes = selected.name === "Keto Cheesecakes";
  const isBentoMini = selected.name === "Bento & Mini";

  // Check item types
  const isRegularSliceItem = (item) =>
    isRegularCheesecakes && item.name === "Regular Cheesecake - Slice";

  const isKetoSliceItem = (item) =>
    isKetoCheesecakes && item.name === "Keto Cheesecake - Slices";

  const isKetoMiniItem = (item) =>
    isKetoCheesecakes && item.name === "Keto Cheesecake - Mini";

  // Get display name for Bento items
  const getDisplayName = (item) => {
    if (isBentoMini) {
      return item.name;
    }
    return item.name;
  };

  return (
    <div className="w-full h-[calc(100vh-8rem)] flex bg-gray-50">
      {/* 🟡 Category Sidebar */}
      <div className="w-48 sm:w-56 md:w-60 lg:w-64 bg-white shadow-md overflow-y-auto flex-shrink-0">
        <div className="grid grid-cols-2 gap-2 p-3">
          {updatedMenus.map((menu) => (
            <div
              key={menu.id}
              onClick={() => {
                setSelected(menu);
                setSelectedSlice(null);
                setShowRegularFlavors(false);
                setShowKetoFlavors(false);
                setSelectedRegularItem(null);
                setSelectedRegularBase(null);
                setSelectedKetoItem(null);
                setSelectedKetoBase(null);
                setSelectedKetoMiniItem(null);
                setSelectedKetoMiniBase(null);
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
                {isRegularCheesecakes && " - Slices customizable with flavors!"}
                {isKetoCheesecakes &&
                  " - Slices and Mini customizable with flavors!"}
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
                className={`flex flex-col gap-3 p-3 rounded-xl bg-white shadow-sm border transition-all duration-200 hover:shadow-md ${
                  isRegularCheesecakes && isRegularSliceItem(item)
                    ? "border-yellow-100 hover:border-yellow-300"
                    : isKetoSliceItem(item) || isKetoMiniItem(item)
                    ? "border-purple-100 hover:border-purple-300"
                    : isBentoMini
                    ? "border-orange-100 hover:border-orange-300"
                    : "border-gray-100 hover:border-yellow-200"
                }`}
              >
                {/* Name */}
                <div className="flex justify-between items-start gap-2">
                  <h1 className="text-gray-900 text-sm sm:text-[0.9rem] font-bold leading-tight flex-1 line-clamp-2">
                    {getDisplayName(item)}
                    {isRegularSliceItem(item) && (
                      <span className="inline-block ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                        Customizable
                      </span>
                    )}
                    {isKetoSliceItem(item) && (
                      <span className="inline-block ml-2 text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                        Customizable
                      </span>
                    )}
                    {isKetoMiniItem(item) && (
                      <span className="inline-block ml-2 text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                        Customizable
                      </span>
                    )}
                  </h1>
                </div>

                {/* Variants */}
                <div className="space-y-2">
                  {isBentoMini
                    ? item.variants.map((variant) => (
                        <div
                          key={variant.label}
                          className="flex flex-col gap-2"
                        >
                          <div className="flex justify-between items-center">
                            <p className="text-gray-700 text-xs sm:text-[0.8rem] font-medium leading-tight">
                              ₱{variant.price.toLocaleString()}
                            </p>
                          </div>

                          <button
                            onClick={() => handleAddBentoToCart(item, variant)}
                            className="bg-yellow-400 text-gray-900 py-2 rounded-lg shadow hover:bg-yellow-500 active:scale-95 transition-colors font-semibold text-sm w-full"
                          >
                            Add
                          </button>
                        </div>
                      ))
                    : isRegularSliceItem(item)
                    ? item.variants.map((variant) => (
                        <div
                          key={variant.label}
                          className="flex flex-col gap-2"
                        >
                          <div className="flex justify-between items-center">
                            <p className="text-gray-700 text-xs sm:text-[0.8rem] font-medium leading-tight">
                              ₱{variant.price.toLocaleString()} per slice
                            </p>
                            <span className="text-xs text-yellow-600 font-semibold">
                              + Flavors
                            </span>
                          </div>

                          <button
                            onClick={() =>
                              handleRegularSliceClick(item, variant)
                            }
                            className="bg-yellow-400 text-gray-900 py-2 rounded-lg shadow hover:bg-yellow-500 active:scale-95 transition-colors font-semibold text-sm w-full"
                          >
                            Select Flavor
                          </button>
                        </div>
                      ))
                    : isKetoSliceItem(item)
                    ? item.variants.map((variant) => (
                        <div
                          key={variant.label}
                          className="flex flex-col gap-2"
                        >
                          <div className="flex justify-between items-center">
                            <p className="text-gray-700 text-xs sm:text-[0.8rem] font-medium leading-tight">
                              ₱{variant.price.toLocaleString()} per slice
                            </p>
                            <span className="text-xs text-purple-600 font-semibold">
                              + Flavors
                            </span>
                          </div>

                          <button
                            onClick={() => handleKetoSliceClick(item, variant)}
                            className="bg-purple-500 text-white py-2 rounded-lg shadow hover:bg-purple-600 active:scale-95 transition-colors font-semibold text-sm w-full"
                          >
                            Select Flavor
                          </button>
                        </div>
                      ))
                    : isKetoMiniItem(item)
                    ? item.variants.map((variant) => (
                        <div
                          key={variant.label}
                          className="flex flex-col gap-2"
                        >
                          <div className="flex justify-between items-center">
                            <p className="text-gray-700 text-xs sm:text-[0.8rem] font-medium leading-tight">
                              ₱{variant.price.toLocaleString()} per piece
                            </p>
                            <span className="text-xs text-purple-600 font-semibold">
                              + Flavors
                            </span>
                          </div>

                          <button
                            onClick={() => handleKetoMiniClick(item, variant)}
                            className="bg-purple-500 text-white py-2 rounded-lg shadow hover:bg-purple-600 active:scale-95 transition-colors font-semibold text-sm w-full"
                          >
                            Select Flavor
                          </button>
                        </div>
                      ))
                    : item.variants.map((variant) => (
                        <div
                          key={variant.label}
                          className="flex flex-col gap-2"
                        >
                          <p className="text-gray-700 text-xs sm:text-[0.8rem] font-medium leading-tight">
                            ₱{variant.price.toLocaleString()}
                            {variant.label !== "Slice" &&
                            variant.label !== "Mini"
                              ? ` / ${variant.label}`
                              : ""}
                          </p>

                          <button
                            onClick={() => handleAddToCart(item, variant)}
                            className="bg-yellow-400 text-gray-900 py-2 rounded-lg shadow hover:bg-yellow-500 active:scale-95 transition-colors font-semibold text-sm w-full"
                          >
                            Add
                          </button>
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

      {/* Regular Cheesecake Slice Flavors Modal */}
      {showRegularFlavors && selectedRegularItem && selectedRegularBase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Choose Flavor for {selectedRegularItem.name}
              </h2>
              <button
                onClick={() => {
                  setShowRegularFlavors(false);
                  setSelectedRegularItem(null);
                  setSelectedRegularBase(null);
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <h3 className="font-semibold text-gray-900 mb-2">
                Regular Cheesecake Slice
              </h3>
              <p className="text-gray-600">
                Price per slice: ₱{selectedRegularBase.price.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Choose your favorite flavor
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {availableRegularFlavors.map((flavor) => (
                <div
                  key={flavor.label}
                  className="border border-gray-200 rounded-lg p-4 hover:border-yellow-400 transition-colors cursor-pointer"
                  onClick={() => handleRegularFlavorSelect(flavor)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {flavor.label}
                      </h3>
                      <p className="text-gray-600 text-sm">
                        Regular Cheesecake Slice
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-yellow-600">
                        ₱{flavor.price.toLocaleString()}
                      </p>
                      <button className="bg-yellow-500 text-white px-3 py-1 rounded text-sm hover:bg-yellow-600 transition-colors mt-1">
                        Add Flavor
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Keto Cheesecake Flavors Modal */}
      {showKetoFlavors && (selectedKetoItem || selectedKetoMiniItem) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Choose Flavor for{" "}
                {selectedKetoItem?.name || selectedKetoMiniItem?.name}
              </h2>
              <button
                onClick={() => {
                  setShowKetoFlavors(false);
                  setSelectedKetoItem(null);
                  setSelectedKetoBase(null);
                  setSelectedKetoMiniItem(null);
                  setSelectedKetoMiniBase(null);
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h3 className="font-semibold text-gray-900 mb-2">
                {selectedKetoItem
                  ? "Keto Cheesecake Slice"
                  : "Keto Cheesecake Mini"}
              </h3>
              <p className="text-gray-600">
                Price: ₱
                {(
                  selectedKetoBase?.price || selectedKetoMiniBase?.price
                ).toLocaleString()}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Choose your favorite flavor
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(selectedKetoItem
                ? availableKetoFlavors
                : availableKetoMiniFlavors
              ).map((flavor) => (
                <div
                  key={flavor.label}
                  className="border border-gray-200 rounded-lg p-4 hover:border-purple-400 transition-colors cursor-pointer"
                  onClick={() =>
                    selectedKetoItem
                      ? handleKetoFlavorSelect(flavor)
                      : handleKetoMiniFlavorSelect(flavor)
                  }
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {flavor.label}
                      </h3>
                      <p className="text-gray-600 text-sm">
                        {selectedKetoItem
                          ? "Keto Cheesecake Slice"
                          : "Keto Cheesecake Mini"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-purple-600">
                        ₱{flavor.price.toLocaleString()}
                      </p>
                      <button className="bg-purple-500 text-white px-3 py-1 rounded text-sm hover:bg-purple-600 transition-colors mt-1">
                        Add Flavor
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuContainer;
