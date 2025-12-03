import React, { useState } from "react";
import { menus, bentoItems, cheesecakeFlavorOptions } from "../../constants";
import { GrRadialSelected } from "react-icons/gr";
import { useDispatch } from "react-redux";
import { addItemsToOrder } from "../../redux/slices/orderSlice";

const MenuContainer = ({ orderId }) => {
  const [selected, setSelected] = useState(menus[0]);
  const [selectedSlice, setSelectedSlice] = useState(null);
  const [showKetoFlavors, setShowKetoFlavors] = useState(false);
  const [showBentoFlavors, setShowBentoFlavors] = useState(false);
  const [selectedBentoItem, setSelectedBentoItem] = useState(null);
  const [selectedBentoBase, setSelectedBentoBase] = useState(null);
  const [availableFlavors, setAvailableFlavors] = useState([]);

  // New state for Keto Slice
  const [selectedKetoItem, setSelectedKetoItem] = useState(null);
  const [selectedKetoBase, setSelectedKetoBase] = useState(null);
  const [availableKetoFlavors, setAvailableKetoFlavors] = useState([]);

  const dispatch = useDispatch();

  // Handle regular item add to cart
  const handleAddToCart = (item, variant) => {
    const newObj = {
      id: `${item.id}-${variant.label}`,
      name: `${item.name} (${variant.label})`,
      pricePerQuantity: variant.price,
      quantity: 1,
      price: variant.price,
    };

    console.log("Adding to cart:", { orderId, item: newObj });
    dispatch(addItemsToOrder({ orderId, item: newObj }));
  };

  // Handle Regular Cheesecake Slice selection
  const handleSelectSlice = (item, variant) => {
    setSelectedSlice({
      item,
      variant,
      image: item.image,
    });
  };

  // Handle Keto Cheesecake Base selection (with flavor option)
  const handleKetoBaseClick = (item, baseVariant) => {
    setSelectedKetoItem(item);
    setSelectedKetoBase(baseVariant);

    // Get all flavor options for Keto items
    const allFlavors = cheesecakeFlavorOptions.map((flavor) => ({
      ...flavor,
      basePrice: baseVariant.price,
      description: `${item.name} (${baseVariant.label}) with ${flavor.label} flavor`,
      totalPrice: baseVariant.price + (flavor.price - 220),
    }));

    setAvailableKetoFlavors(allFlavors);
    setShowKetoFlavors(true);
  };

  const handleKetoFlavorSelect = (flavor) => {
    if (!selectedKetoItem || !selectedKetoBase) return;

    const newObj = {
      id: `${selectedKetoItem.id}-${selectedKetoBase.label}-${flavor.label}`,
      name: `${selectedKetoItem.name} (${selectedKetoBase.label}) with ${flavor.label}`,
      pricePerQuantity: flavor.totalPrice || flavor.price,
      quantity: 1,
      price: flavor.totalPrice || flavor.price,
    };

    console.log("Adding keto with flavor:", { orderId, item: newObj });
    dispatch(addItemsToOrder({ orderId, item: newObj }));
    setShowKetoFlavors(false);
    setSelectedKetoItem(null);
    setSelectedKetoBase(null);
  };

  const handleKetoBaseOnly = (item, baseVariant) => {
    const newObj = {
      id: `${item.id}-${baseVariant.label}`,
      name: `${item.name} (${baseVariant.label})`,
      pricePerQuantity: baseVariant.price,
      quantity: 1,
      price: baseVariant.price,
    };

    console.log("Adding keto base only:", { orderId, item: newObj });
    dispatch(addItemsToOrder({ orderId, item: newObj }));
  };

  // Handle Bento flavor selection
  const handleBentoFlavorClick = (item, baseVariant) => {
    setSelectedBentoItem(item);
    setSelectedBentoBase(baseVariant);

    // Get all flavor options for Bento items
    const allFlavors = cheesecakeFlavorOptions.map((flavor) => ({
      ...flavor,
      basePrice: baseVariant.price,
      description: `${item.name} (${baseVariant.label}) with ${flavor.label} flavor`,
      totalPrice: baseVariant.price + (flavor.price - 220),
    }));

    setAvailableFlavors(allFlavors);
    setShowBentoFlavors(true);
  };

  const handleBentoFlavorSelect = (flavor) => {
    if (!selectedBentoItem || !selectedBentoBase) return;

    const newObj = {
      id: `${selectedBentoItem.id}-${selectedBentoBase.label}-${flavor.label}`,
      name: `${selectedBentoItem.name} (${selectedBentoBase.label}) with ${flavor.label}`,
      pricePerQuantity: flavor.totalPrice || flavor.price,
      quantity: 1,
      price: flavor.totalPrice || flavor.price,
    };

    console.log("Adding bento with flavor:", { orderId, item: newObj });
    dispatch(addItemsToOrder({ orderId, item: newObj }));
    setShowBentoFlavors(false);
    setSelectedBentoItem(null);
    setSelectedBentoBase(null);
  };

  const handleBentoBaseOnly = (item, baseVariant) => {
    const newObj = {
      id: `${item.id}-${baseVariant.label}`,
      name: `${item.name} (${baseVariant.label})`,
      pricePerQuantity: baseVariant.price,
      quantity: 1,
      price: baseVariant.price,
    };

    console.log("Adding bento base only:", { orderId, item: newObj });
    dispatch(addItemsToOrder({ orderId, item: newObj }));
  };

  const isRegularCheesecakes = selected.name === "Regular Cheesecakes";
  const isKetoCheesecakes = selected.name === "Keto Cheesecakes";
  const isBentoMini = selected.name === "Bento & Mini";
  const isSliceItem = (item) => item.name.includes("Slice");

  // Check if item is a Bento item
  const isBentoItem = (item) => {
    return item.category === "Bento" || item.category === "Bento & Mini";
  };

  // Check if item is a Keto Slice item
  const isKetoSliceItem = (item) => {
    return isKetoCheesecakes && item.name === "Keto Cheesecake - Slice";
  };

  // Get base options for Bento items
  const getBentoBaseOptions = (item) => {
    return item.variants.filter((variant) => variant.type === "base");
  };

  // Get base options for Keto items
  const getKetoBaseOptions = (item) => {
    if (isKetoSliceItem(item)) {
      return item.variants.filter((variant) => variant.type === "base");
    }
    return item.variants;
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
                setSelectedSlice(null);
                setShowKetoFlavors(false);
                setShowBentoFlavors(false);
                setSelectedBentoItem(null);
                setSelectedBentoBase(null);
                setSelectedKetoItem(null);
                setSelectedKetoBase(null);
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
                {isBentoMini && " - All customizable with flavors!"}
                {isKetoCheesecakes && " - Slices customizable with flavors!"}
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
        {showKetoFlavors && selectedKetoItem && selectedKetoBase && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  Customize {selectedKetoItem.name}
                </h2>
                <button
                  onClick={() => {
                    setShowKetoFlavors(false);
                    setSelectedKetoItem(null);
                    setSelectedKetoBase(null);
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Selected Base: {selectedKetoBase.label}
                </h3>
                <p className="text-gray-600">
                  Base Price: ₱{selectedKetoBase.price.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Choose a flavor or add the base as-is
                </p>
              </div>

              {/* Add Base Only Option */}
              <div
                className="border border-gray-200 rounded-lg p-4 mb-4 hover:border-green-400 transition-colors cursor-pointer bg-green-50"
                onClick={() => {
                  handleKetoBaseOnly(selectedKetoItem, selectedKetoBase);
                  setShowKetoFlavors(false);
                }}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Original (No Flavor)
                    </h3>
                    <p className="text-gray-600 text-sm">
                      Add {selectedKetoItem.name} with original flavor
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">
                      ₱{selectedKetoBase.price.toLocaleString()}
                    </p>
                    <button className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 transition-colors mt-1">
                      Add as-is
                    </button>
                  </div>
                </div>
              </div>

              <h3 className="font-semibold text-gray-900 mb-3">
                Choose a Flavor:
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {availableKetoFlavors.map((flavor) => (
                  <div
                    key={flavor.label}
                    className="border border-gray-200 rounded-lg p-4 hover:border-purple-400 transition-colors cursor-pointer"
                    onClick={() => handleKetoFlavorSelect(flavor)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {flavor.label}
                        </h3>
                        <p className="text-gray-600 text-sm">
                          {selectedKetoItem.name} ({selectedKetoBase.label})
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-purple-600">
                          ₱
                          {(flavor.totalPrice || flavor.price).toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">
                          Base: ₱{selectedKetoBase.price.toLocaleString()} +
                          Flavor: ₱{(flavor.price - 220).toLocaleString()}
                        </p>
                        <button className="bg-purple-500 text-white px-3 py-1 rounded text-sm hover:bg-purple-600 transition-colors mt-1">
                          Add with Flavor
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Bento & Mini Flavors Modal */}
        {showBentoFlavors && selectedBentoItem && selectedBentoBase && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  Customize {selectedBentoItem.name}
                </h2>
                <button
                  onClick={() => {
                    setShowBentoFlavors(false);
                    setSelectedBentoItem(null);
                    setSelectedBentoBase(null);
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="mb-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Selected Base: {selectedBentoBase.label}
                </h3>
                <p className="text-gray-600">
                  Base Price: ₱{selectedBentoBase.price.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Choose a flavor or add the base as-is
                </p>
              </div>

              {/* Add Base Only Option */}
              <div
                className="border border-gray-200 rounded-lg p-4 mb-4 hover:border-green-400 transition-colors cursor-pointer bg-green-50"
                onClick={() => {
                  handleBentoBaseOnly(selectedBentoItem, selectedBentoBase);
                  setShowBentoFlavors(false);
                }}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Original (No Flavor)
                    </h3>
                    <p className="text-gray-600 text-sm">
                      Add {selectedBentoItem.name} with original flavor
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">
                      ₱{selectedBentoBase.price.toLocaleString()}
                    </p>
                    <button className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 transition-colors mt-1">
                      Add as-is
                    </button>
                  </div>
                </div>
              </div>

              <h3 className="font-semibold text-gray-900 mb-3">
                Choose a Flavor:
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {availableFlavors.map((flavor) => (
                  <div
                    key={flavor.label}
                    className="border border-gray-200 rounded-lg p-4 hover:border-orange-400 transition-colors cursor-pointer"
                    onClick={() => handleBentoFlavorSelect(flavor)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {flavor.label}
                        </h3>
                        <p className="text-gray-600 text-sm">
                          {selectedBentoItem.name} ({selectedBentoBase.label})
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-orange-600">
                          ₱
                          {(flavor.totalPrice || flavor.price).toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">
                          Base: ₱{selectedBentoBase.price.toLocaleString()} +
                          Flavor: ₱{(flavor.price - 220).toLocaleString()}
                        </p>
                        <button className="bg-orange-500 text-white px-3 py-1 rounded text-sm hover:bg-orange-600 transition-colors mt-1">
                          Add with Flavor
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
                  isKetoSliceItem(item)
                    ? "border-purple-100 hover:border-purple-300"
                    : ""
                } ${
                  isBentoMini && isBentoItem(item)
                    ? "border-orange-100 hover:border-orange-300"
                    : ""
                }`}
              >
                {/* 🏷️ Name */}
                <div className="flex justify-between items-start gap-2">
                  <h1 className="text-gray-900 text-sm sm:text-[0.9rem] font-bold leading-tight flex-1 line-clamp-2">
                    {item.name}
                    {isBentoMini && (
                      <span className="inline-block ml-2 text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full">
                        Customizable
                      </span>
                    )}
                    {isKetoSliceItem(item) && (
                      <span className="inline-block ml-2 text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                        Customizable
                      </span>
                    )}
                  </h1>
                </div>

                {/* 💵 Variants */}
                <div className="space-y-2">
                  {isBentoMini && isBentoItem(item)
                    ? // Bento & Mini items - Show base options
                      getBentoBaseOptions(item).map((variant) => (
                        <div
                          key={variant.label}
                          className="flex flex-col gap-2"
                        >
                          <div className="flex justify-between items-center">
                            <p className="text-gray-700 text-xs sm:text-[0.8rem] font-medium leading-tight">
                              ₱{variant.price.toLocaleString()} /{" "}
                              {variant.label}
                            </p>
                            <span className="text-xs text-orange-600 font-semibold">
                              + Flavors
                            </span>
                          </div>

                          <div className="flex gap-2">
                            {/* Add Base Only Button */}
                            <button
                              onClick={() => handleBentoBaseOnly(item, variant)}
                              className="flex-1 bg-green-500 text-white py-2 rounded-lg shadow hover:bg-green-600 transition-colors font-semibold text-sm"
                            >
                              Add Base
                            </button>

                            {/* Choose Flavor Button */}
                            <button
                              onClick={() =>
                                handleBentoFlavorClick(item, variant)
                              }
                              className="flex-1 bg-orange-500 text-white py-2 rounded-lg shadow hover:bg-orange-600 transition-colors font-semibold text-sm"
                            >
                              Add Flavor
                            </button>
                          </div>
                        </div>
                      ))
                    : isKetoSliceItem(item)
                    ? // Keto Cheesecake Slice - Show base options
                      getKetoBaseOptions(item).map((variant) => (
                        <div
                          key={variant.label}
                          className="flex flex-col gap-2"
                        >
                          <div className="flex justify-between items-center">
                            <p className="text-gray-700 text-xs sm:text-[0.8rem] font-medium leading-tight">
                              ₱{variant.price.toLocaleString()} /{" "}
                              {variant.label}
                            </p>
                            <span className="text-xs text-purple-600 font-semibold">
                              + Flavors
                            </span>
                          </div>

                          <div className="flex gap-2">
                            {/* Add Base Only Button */}
                            <button
                              onClick={() => handleKetoBaseOnly(item, variant)}
                              className="flex-1 bg-green-500 text-white py-2 rounded-lg shadow hover:bg-green-600 transition-colors font-semibold text-sm"
                            >
                              Add Base
                            </button>

                            {/* Choose Flavor Button */}
                            <button
                              onClick={() => handleKetoBaseClick(item, variant)}
                              className="flex-1 bg-purple-500 text-white py-2 rounded-lg shadow hover:bg-purple-600 transition-colors font-semibold text-sm"
                            >
                              Add Flavor
                            </button>
                          </div>
                        </div>
                      ))
                    : // Regular items (non-Bento, non-Keto Slice)
                      item.variants.map((variant) => (
                        <div
                          key={variant.label}
                          className="flex flex-col gap-2"
                        >
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
