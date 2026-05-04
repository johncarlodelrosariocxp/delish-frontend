import React, { useState, useEffect } from "react";
import { GrRadialSelected } from "react-icons/gr";
import { useDispatch } from "react-redux";
import { addItemsToOrder } from "../../redux/slices/orderSlice";
import { getItemFlavors, checkMenuItemAvailability } from "../../https";

const MenuContainer = ({ orderId, menus, loadingMenus }) => {
  const [selected, setSelected] = useState(null);
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
  const [flavors, setFlavors] = useState([]);
  const [checkingAvailability, setCheckingAvailability] = useState({});
  const [stockStatus, setStockStatus] = useState({});

  const dispatch = useDispatch();

  // Load flavors from API
  useEffect(() => {
    const loadFlavors = async () => {
      try {
        const response = await getItemFlavors();
        if (response.data.success) {
          setFlavors(response.data.flavors);
        }
      } catch (error) {
        console.error("Error loading flavors:", error);
      }
    };
    loadFlavors();
  }, []);

  // Check stock availability for menu items
  const checkItemStock = async (menuId, itemId, itemName) => {
    const key = `${menuId}-${itemId}`;
    if (checkingAvailability[key]) return;

    setCheckingAvailability((prev) => ({ ...prev, [key]: true }));

    try {
      const response = await checkMenuItemAvailability(menuId, itemId, 1);
      if (response.data.success && response.data.data) {
        setStockStatus((prev) => ({
          ...prev,
          [key]: {
            available: response.data.data.available,
            requirements: response.data.data.requirements || [],
            totalIngredientCost: response.data.data.totalIngredientCost || 0,
            message: response.data.data.available ? "In Stock" : "Out of Stock",
          },
        }));
      }
    } catch (error) {
      console.error(`Error checking stock for ${itemName}:`, error);
      setStockStatus((prev) => ({
        ...prev,
        [key]: { available: true, message: "Stock check failed" },
      }));
    } finally {
      setCheckingAvailability((prev) => ({ ...prev, [key]: false }));
    }
  };

  // Check stock when menus load
  useEffect(() => {
    if (menus && menus.length > 0) {
      menus.forEach((menu) => {
        if (menu.items && menu.items.length > 0) {
          menu.items.forEach((item) => {
            if (item.trackInventory && item.inventoryRequirements?.length > 0) {
              checkItemStock(menu.id, item.id, item.name);
            }
          });
        }
      });
    }
  }, [menus]);

  // Set first menu as selected when menus load
  useEffect(() => {
    if (menus && menus.length > 0 && !selected) {
      setSelected(menus[0]);
    }
  }, [menus, selected]);

  // Handle add to cart with stock check
  const handleAddToCart = async (item, variant, menu) => {
    // Check if item requires inventory tracking
    if (item.trackInventory && item.inventoryRequirements?.length > 0) {
      const key = `${menu.id}-${item.id}`;
      const stock = stockStatus[key];

      if (!stock || !stock.available) {
        // Show detailed out of stock message
        const requirementsList =
          stock?.requirements || item.inventoryRequirements;
        let message = `❌ Cannot add ${item.name} to order.\n\nMissing ingredients:\n`;
        requirementsList.forEach((req) => {
          message += `• ${req.inventoryItemName}: Need ${req.quantityPerServing} ${req.unit}\n`;
        });
        message += `\nPlease restock these items first.`;
        alert(message);
        return;
      }
    }

    // Proceed with adding to cart
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
  const handleAddBentoToCart = async (item, variant, menu) => {
    // Check if item requires inventory tracking
    if (item.trackInventory && item.inventoryRequirements?.length > 0) {
      const key = `${menu.id}-${item.id}`;
      const stock = stockStatus[key];

      if (!stock || !stock.available) {
        const requirementsList =
          stock?.requirements || item.inventoryRequirements;
        let message = `❌ Cannot add ${item.name} to order.\n\nMissing ingredients:\n`;
        requirementsList.forEach((req) => {
          message += `• ${req.inventoryItemName}: Need ${req.quantityPerServing} ${req.unit}\n`;
        });
        message += `\nPlease restock these items first.`;
        alert(message);
        return;
      }
    }

    const newObj = {
      id: `${item.id}-${variant.label}`,
      name: `${item.name}`,
      pricePerQuantity: variant.price,
      quantity: 1,
      price: variant.price,
    };

    dispatch(addItemsToOrder({ orderId, item: newObj }));
  };

  // Handle Regular Item with flavor selection
  const handleRegularItemClick = (item, baseVariant) => {
    setSelectedRegularItem(item);
    setSelectedRegularBase(baseVariant);

    const regularFlavors = flavors.filter((f) => f.category === "regular");
    const allFlavors = regularFlavors.map((flavor) => ({
      ...flavor,
      description: `${item.name} with ${flavor.label} flavor`,
    }));

    setAvailableRegularFlavors(allFlavors);
    setShowRegularFlavors(true);
  };

  const handleRegularFlavorSelect = async (flavor, menu) => {
    if (!selectedRegularItem || !selectedRegularBase) return;

    // Check stock for the flavor item if it tracks inventory
    if (
      selectedRegularItem.trackInventory &&
      selectedRegularItem.inventoryRequirements?.length > 0
    ) {
      const key = `${menu.id}-${selectedRegularItem.id}`;
      const stock = stockStatus[key];

      if (!stock || !stock.available) {
        alert(
          `❌ Cannot add ${selectedRegularItem.name} - ${flavor.label}.\n\nOut of stock! Please restock ingredients.`,
        );
        setShowRegularFlavors(false);
        setSelectedRegularItem(null);
        setSelectedRegularBase(null);
        return;
      }
    }

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

  // Handle Keto Item with flavor selection
  const handleKetoItemClick = (item, baseVariant, isMini = false, menu) => {
    if (isMini) {
      setSelectedKetoMiniItem(item);
      setSelectedKetoMiniBase(baseVariant);
      const ketoFlavors = flavors.filter((f) => f.category === "keto");
      const allFlavors = ketoFlavors.map((flavor) => ({
        ...flavor,
        description: `${item.name} with ${flavor.label} flavor`,
      }));
      setAvailableKetoMiniFlavors(allFlavors);
    } else {
      setSelectedKetoItem(item);
      setSelectedKetoBase(baseVariant);
      const ketoFlavors = flavors.filter((f) => f.category === "keto");
      const allFlavors = ketoFlavors.map((flavor) => ({
        ...flavor,
        description: `${item.name} with ${flavor.label} flavor`,
      }));
      setAvailableKetoFlavors(allFlavors);
    }
    setShowKetoFlavors(true);
  };

  const handleKetoFlavorSelect = async (flavor, menu) => {
    let item = null;
    let baseVariant = null;

    if (selectedKetoItem && selectedKetoBase) {
      item = selectedKetoItem;
      baseVariant = selectedKetoBase;
    } else if (selectedKetoMiniItem && selectedKetoMiniBase) {
      item = selectedKetoMiniItem;
      baseVariant = selectedKetoMiniBase;
    }

    if (!item) return;

    // Check stock for the keto item if it tracks inventory
    if (item.trackInventory && item.inventoryRequirements?.length > 0) {
      const key = `${menu.id}-${item.id}`;
      const stock = stockStatus[key];

      if (!stock || !stock.available) {
        alert(
          `❌ Cannot add ${item.name} - ${flavor.label}.\n\nOut of stock! Please restock ingredients.`,
        );
        setShowKetoFlavors(false);
        setSelectedKetoItem(null);
        setSelectedKetoBase(null);
        setSelectedKetoMiniItem(null);
        setSelectedKetoMiniBase(null);
        return;
      }
    }

    if (selectedKetoItem && selectedKetoBase) {
      const newObj = {
        id: `${selectedKetoItem.id}-${selectedKetoBase.label}-${flavor.label}`,
        name: `${selectedKetoItem.name} - ${flavor.label}`,
        pricePerQuantity: flavor.price,
        quantity: 1,
        price: flavor.price,
      };
      dispatch(addItemsToOrder({ orderId, item: newObj }));
    } else if (selectedKetoMiniItem && selectedKetoMiniBase) {
      const newObj = {
        id: `${selectedKetoMiniItem.id}-${selectedKetoMiniBase.label}-${flavor.label}`,
        name: `${selectedKetoMiniItem.name} - ${flavor.label}`,
        pricePerQuantity: flavor.price,
        quantity: 1,
        price: flavor.price,
      };
      dispatch(addItemsToOrder({ orderId, item: newObj }));
    }

    setShowKetoFlavors(false);
    setSelectedKetoItem(null);
    setSelectedKetoBase(null);
    setSelectedKetoMiniItem(null);
    setSelectedKetoMiniBase(null);
  };

  const isRegularMenu = selected?.name?.toLowerCase().includes("regular");
  const isKetoMenu = selected?.name?.toLowerCase().includes("keto");
  const isBentoMini = selected?.name?.toLowerCase().includes("bento");

  // Check if item has flavor selection
  const hasFlavorSelection = (item) => {
    return (
      item.hasFlavorSelection === true ||
      item.name?.toLowerCase().includes("cheesecake") ||
      item.name?.toLowerCase().includes("slice") ||
      item.name?.toLowerCase().includes("mini")
    );
  };

  // Check if item is available (has stock)
  const isItemAvailable = (item, menu) => {
    if (!item.trackInventory || !item.inventoryRequirements?.length) {
      return true; // No inventory tracking = always available
    }
    const key = `${menu.id}-${item.id}`;
    const stock = stockStatus[key];
    return stock ? stock.available : true; // Assume available if not checked yet
  };

  // Get stock status message
  const getStockStatusMessage = (item, menu) => {
    if (!item.trackInventory || !item.inventoryRequirements?.length) {
      return null;
    }
    const key = `${menu.id}-${item.id}`;
    const stock = stockStatus[key];
    if (!stock) return null;
    if (!stock.available) {
      return "Out of Stock";
    }
    return null;
  };

  if (loadingMenus) {
    return (
      <div className="w-full h-[calc(100vh-8rem)] flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading menu...</p>
        </div>
      </div>
    );
  }

  if (!menus || menus.length === 0) {
    return (
      <div className="w-full h-[calc(100vh-8rem)] flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">No menu categories found.</p>
          <p className="text-sm text-gray-500 mt-2">
            Please add menus in the admin panel.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[calc(100vh-8rem)] flex bg-gray-50">
      {/* 🟡 Category Sidebar */}
      <div className="w-48 sm:w-56 md:w-60 lg:w-64 bg-white shadow-md overflow-y-auto flex-shrink-0">
        <div className="grid grid-cols-2 gap-2 p-3">
          {menus.map((menu) => (
            <div
              key={menu.id}
              onClick={() => setSelected(menu)}
              className={`flex flex-col items-center justify-center p-3 rounded-lg cursor-pointer transition-all duration-200 hover:scale-105 min-h-[80px] ${
                selected?.id === menu.id
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
                {menu.items?.length || 0} Items
              </p>
              {selected?.id === menu.id && (
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
              style={{ backgroundColor: selected?.bgColor }}
            >
              {selected?.icon}
            </div>
            <div>
              <h1 className="text-gray-900 text-lg font-bold">
                {selected?.name}
              </h1>
              <p className="text-gray-500 text-sm">
                {selected?.items?.length || 0} items available
              </p>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-4 md:px-6 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3 sm:gap-4">
            {selected?.items?.map((item) => {
              const available = isItemAvailable(item, selected);
              const stockMessage = getStockStatusMessage(item, selected);
              const isChecking =
                checkingAvailability[`${selected.id}-${item.id}`];

              return (
                <div
                  key={item.id}
                  className={`flex flex-col gap-3 p-3 rounded-xl bg-white shadow-sm border transition-all duration-200 ${
                    !available
                      ? "opacity-60 border-red-200 bg-red-50"
                      : "hover:shadow-md"
                  } ${
                    hasFlavorSelection(item)
                      ? isRegularMenu
                        ? "border-yellow-100 hover:border-yellow-300"
                        : isKetoMenu
                          ? "border-purple-100 hover:border-purple-300"
                          : "border-gray-100 hover:border-yellow-200"
                      : "border-gray-100 hover:border-yellow-200"
                  }`}
                >
                  {/* Name and Stock Status */}
                  <div className="flex justify-between items-start gap-2">
                    <h1 className="text-gray-900 text-sm sm:text-[0.9rem] font-bold leading-tight flex-1 line-clamp-2">
                      {item.name}
                      {hasFlavorSelection(item) && (
                        <span className="inline-block ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                          Customizable
                        </span>
                      )}
                    </h1>
                    {stockMessage && (
                      <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full whitespace-nowrap">
                        {isChecking ? "Checking..." : "⚠️ Out of Stock"}
                      </span>
                    )}
                  </div>

                  {/* Inventory Requirements (show what's needed) */}
                  {item.trackInventory &&
                    item.inventoryRequirements?.length > 0 &&
                    !stockMessage && (
                      <div className="text-xs text-gray-500 border-t pt-1">
                        <span className="font-medium">📦 Needs:</span>
                        {item.inventoryRequirements.map((req, idx) => (
                          <span key={idx} className="ml-1">
                            {req.quantityPerServing} {req.unit}{" "}
                            {req.inventoryItemName}
                            {idx < item.inventoryRequirements.length - 1
                              ? ","
                              : ""}
                          </span>
                        ))}
                      </div>
                    )}

                  {/* Variants */}
                  <div className="space-y-2">
                    {item.variants?.map((variant) => (
                      <div key={variant.label} className="flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                          <p className="text-gray-700 text-xs sm:text-[0.8rem] font-medium leading-tight">
                            ₱{variant.price.toLocaleString()}
                            {variant.label !== "Slice" &&
                            variant.label !== "Mini"
                              ? ` / ${variant.label}`
                              : ""}
                          </p>
                          {hasFlavorSelection(item) && (
                            <span className="text-xs text-yellow-600 font-semibold">
                              + Flavors
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => {
                            if (!available) {
                              alert(
                                `❌ ${item.name} is out of stock!\n\nPlease restock ingredients first.`,
                              );
                              return;
                            }

                            if (hasFlavorSelection(item)) {
                              if (isRegularMenu) {
                                handleRegularItemClick(item, variant);
                              } else if (isKetoMenu) {
                                const isMini = item.name
                                  ?.toLowerCase()
                                  .includes("mini");
                                handleKetoItemClick(
                                  item,
                                  variant,
                                  isMini,
                                  selected,
                                );
                              } else {
                                handleAddToCart(item, variant, selected);
                              }
                            } else {
                              if (isBentoMini) {
                                handleAddBentoToCart(item, variant, selected);
                              } else {
                                handleAddToCart(item, variant, selected);
                              }
                            }
                          }}
                          disabled={!available || isChecking}
                          className={`py-2 rounded-lg shadow active:scale-95 transition-colors font-semibold text-sm w-full ${
                            !available || isChecking
                              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                              : hasFlavorSelection(item)
                                ? isRegularMenu
                                  ? "bg-yellow-400 text-gray-900 hover:bg-yellow-500"
                                  : isKetoMenu
                                    ? "bg-purple-500 text-white hover:bg-purple-600"
                                    : "bg-yellow-400 text-gray-900 hover:bg-yellow-500"
                                : "bg-yellow-400 text-gray-900 hover:bg-yellow-500"
                          }`}
                        >
                          {isChecking ? (
                            <span className="flex items-center justify-center gap-2">
                              <svg
                                className="animate-spin h-4 w-4"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                  fill="none"
                                />
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                />
                              </svg>
                              Checking...
                            </span>
                          ) : !available ? (
                            "Out of Stock"
                          ) : hasFlavorSelection(item) ? (
                            "Select Flavor"
                          ) : (
                            "Add"
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Empty State */}
          {(!selected?.items || selected.items.length === 0) && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <div className="text-6xl mb-4">🍽️</div>
              <h3 className="text-lg font-semibold mb-2">No items available</h3>
              <p className="text-sm">Please add items to this menu category</p>
            </div>
          )}
        </div>
      </div>

      {/* Regular Flavors Modal */}
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
                {selectedRegularItem.name}
              </h3>
              <p className="text-gray-600">
                Price: ₱{selectedRegularBase.price.toLocaleString()}
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
                  onClick={() => handleRegularFlavorSelect(flavor, selected)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {flavor.label}
                      </h3>
                      <p className="text-gray-600 text-sm">
                        {selectedRegularItem.name}
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

      {/* Keto Flavors Modal */}
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
                {selectedKetoItem?.name || selectedKetoMiniItem?.name}
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
                  onClick={() => handleKetoFlavorSelect(flavor, selected)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {flavor.label}
                      </h3>
                      <p className="text-gray-600 text-sm">
                        {selectedKetoItem ? "Keto Cheesecake" : "Keto Mini"}
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
