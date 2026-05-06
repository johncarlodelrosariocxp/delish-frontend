import React, { useState, useEffect, useCallback } from "react";
import {
  getMenus,
  createMenu,
  updateMenu,
  deleteMenu,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getItemFlavors,
  createItemFlavor,
  updateItemFlavor,
  deleteItemFlavor,
  getInventory,
} from "../https";
import { MdClose, MdEdit, MdDelete, MdAdd, MdInventory } from "react-icons/md";
import BackButton from "../components/shared/BackButton";
import BottomNav from "../components/shared/BottomNav";

const AdminMenu = () => {
  const [menus, setMenus] = useState([]);
  const [flavors, setFlavors] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState(null);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showFlavorModal, setShowFlavorModal] = useState(false);
  const [editingMenu, setEditingMenu] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [editingFlavor, setEditingFlavor] = useState(null);
  const [menuForm, setMenuForm] = useState({
    name: "",
    bgColor: "#f59e0b",
    icon: "🍽️",
    tag: "food",
  });
  const [itemForm, setItemForm] = useState({
    name: "",
    category: "",
    tag: "food",
    variants: [{ label: "Regular", price: 0 }],
    hasFlavorSelection: false,
    flavorOptions: [],
    trackInventory: false,
    inventoryRequirements: [],
  });
  const [flavorForm, setFlavorForm] = useState({
    label: "",
    price: 0,
    category: "regular",
  });

  // Helper function to save to localStorage with timestamp
  const saveToCache = (key, data) => {
    localStorage.setItem(key, JSON.stringify(data));
    localStorage.setItem(`${key}_timestamp`, Date.now().toString());
  };

  // Helper function to get from cache
  const getFromCache = (key, maxAge = 24 * 60 * 60 * 1000) => {
    const cached = localStorage.getItem(key);
    const timestamp = localStorage.getItem(`${key}_timestamp`);
    const now = Date.now();

    if (cached && timestamp && now - parseInt(timestamp) < maxAge) {
      try {
        return JSON.parse(cached);
      } catch (error) {
        console.error(`Error parsing ${key} from cache:`, error);
        return null;
      }
    }
    return null;
  };

  const loadMenus = useCallback(async () => {
    // Check cache first (24 hours)
    const cachedMenus = getFromCache("admin_cached_menus", 24 * 60 * 60 * 1000);
    if (cachedMenus) {
      setMenus(cachedMenus);
      console.log("✅ Loaded menus from localStorage cache");
      return;
    }

    setLoading(true);
    try {
      const response = await getMenus();
      if (response.data.success) {
        const menusData = response.data.menus || [];
        setMenus(menusData);
        saveToCache("admin_cached_menus", menusData);
        console.log("✅ Loaded fresh menus from API and cached");
      }
    } catch (error) {
      console.error("Error loading menus:", error);
      // Try expired cache as fallback
      const expiredMenus = localStorage.getItem("admin_cached_menus");
      if (expiredMenus) {
        try {
          setMenus(JSON.parse(expiredMenus));
          console.log("⚠️ Using expired menus cache due to API failure");
        } catch (e) {
          console.error("Error parsing fallback menus:", e);
        }
      } else {
        alert("Failed to load menus");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFlavors = useCallback(async () => {
    // Check cache first (24 hours)
    const cachedFlavors = getFromCache(
      "admin_cached_flavors",
      24 * 60 * 60 * 1000,
    );
    if (cachedFlavors) {
      setFlavors(cachedFlavors);
      console.log("✅ Loaded flavors from localStorage cache");
      return;
    }

    try {
      const response = await getItemFlavors();
      if (response.data.success) {
        const flavorsData = response.data.flavors || [];
        setFlavors(flavorsData);
        saveToCache("admin_cached_flavors", flavorsData);
        console.log("✅ Loaded fresh flavors from API and cached");
      }
    } catch (error) {
      console.error("Error loading flavors:", error);
      // Try expired cache as fallback
      const expiredFlavors = localStorage.getItem("admin_cached_flavors");
      if (expiredFlavors) {
        try {
          setFlavors(JSON.parse(expiredFlavors));
          console.log("⚠️ Using expired flavors cache due to API failure");
        } catch (e) {
          console.error("Error parsing fallback flavors:", e);
        }
      }
    }
  }, []);

  const loadInventory = useCallback(async () => {
    // Check cache first (1 hour for inventory as it changes more frequently)
    const cachedInventory = getFromCache(
      "admin_cached_inventory",
      60 * 60 * 1000,
    );
    if (cachedInventory) {
      setInventoryItems(cachedInventory);
      console.log(
        "✅ Loaded inventory from localStorage cache, count:",
        cachedInventory.length,
      );
      return;
    }

    try {
      const response = await getInventory();
      console.log("📦 Inventory API response:", response.data);

      if (response.data.success) {
        const inventoryData = response.data.data || [];
        setInventoryItems(inventoryData);
        saveToCache("admin_cached_inventory", inventoryData);
        console.log(
          "✅ Loaded fresh inventory from API and cached, count:",
          inventoryData.length,
        );
      } else {
        console.error("Inventory API returned success=false:", response.data);
        setInventoryItems([]);
      }
    } catch (error) {
      console.error("Error loading inventory:", error);
      // Try expired cache as fallback
      const expiredInventory = localStorage.getItem("admin_cached_inventory");
      if (expiredInventory) {
        try {
          const parsedInventory = JSON.parse(expiredInventory);
          setInventoryItems(parsedInventory);
          console.log(
            "⚠️ Using expired inventory cache due to API failure, count:",
            parsedInventory.length,
          );
        } catch (e) {
          console.error("Error parsing fallback inventory:", e);
          setInventoryItems([]);
        }
      } else {
        setInventoryItems([]);
      }
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadMenus();
    loadFlavors();
    loadInventory();
  }, [loadMenus, loadFlavors, loadInventory]);

  // Listen for inventory changes from other components (like InventoryForm)
  useEffect(() => {
    const handleInventoryChange = (event) => {
      console.log("🔄 Inventory change detected, refreshing...", event.detail);
      // Clear cache and reload inventory
      localStorage.removeItem("admin_cached_inventory");
      localStorage.removeItem("admin_cached_inventory_timestamp");
      loadInventory();
    };

    window.addEventListener("inventoryChanged", handleInventoryChange);

    // Cleanup listener on component unmount
    return () => {
      window.removeEventListener("inventoryChanged", handleInventoryChange);
    };
  }, [loadInventory]);

  // Refresh cache after mutations
  const refreshMenusCache = async () => {
    try {
      const response = await getMenus();
      if (response.data.success) {
        const menusData = response.data.menus || [];
        setMenus(menusData);
        saveToCache("admin_cached_menus", menusData);
      }
    } catch (error) {
      console.error("Error refreshing menus cache:", error);
    }
  };

  const refreshFlavorsCache = async () => {
    try {
      const response = await getItemFlavors();
      if (response.data.success) {
        const flavorsData = response.data.flavors || [];
        setFlavors(flavorsData);
        saveToCache("admin_cached_flavors", flavorsData);
      }
    } catch (error) {
      console.error("Error refreshing flavors cache:", error);
    }
  };

  const refreshInventoryCache = async () => {
    try {
      const response = await getInventory();
      if (response.data.success) {
        const inventoryData = response.data.data || [];
        setInventoryItems(inventoryData);
        saveToCache("admin_cached_inventory", inventoryData);
        console.log(
          "✅ Inventory cache refreshed, count:",
          inventoryData.length,
        );
      }
    } catch (error) {
      console.error("Error refreshing inventory cache:", error);
    }
  };

  const handleCreateMenu = async () => {
    if (!menuForm.name) {
      alert("Menu Name is required");
      return;
    }

    try {
      const response = await createMenu(menuForm);
      if (response.data.success) {
        alert("Menu created successfully");
        setShowMenuModal(false);
        resetMenuForm();
        await refreshMenusCache();
      }
    } catch (error) {
      console.error("Error creating menu:", error);
      alert(error.response?.data?.message || "Failed to create menu");
    }
  };

  const handleUpdateMenu = async () => {
    if (!editingMenu) return;

    try {
      const response = await updateMenu(editingMenu.id, menuForm);
      if (response.data.success) {
        alert("Menu updated successfully");
        setShowMenuModal(false);
        resetMenuForm();
        setEditingMenu(null);
        await refreshMenusCache();
      }
    } catch (error) {
      console.error("Error updating menu:", error);
      alert(error.response?.data?.message || "Failed to update menu");
    }
  };

  const handleDeleteMenu = async (menu) => {
    if (
      window.confirm(
        `Delete menu "${menu.name}"? This will delete all items too.`,
      )
    ) {
      try {
        const response = await deleteMenu(menu.id);
        if (response.data.success) {
          alert("Menu deleted successfully");
          await refreshMenusCache();
          if (selectedMenu?.id === menu.id) {
            setSelectedMenu(null);
          }
        }
      } catch (error) {
        console.error("Error deleting menu:", error);
        alert(error.response?.data?.message || "Failed to delete menu");
      }
    }
  };

  const handleCreateItem = async () => {
    if (!selectedMenu || !itemForm.name) {
      alert("Item Name is required");
      return;
    }

    try {
      const response = await addMenuItem(selectedMenu.id, itemForm);
      if (response.data.success) {
        alert("Item added successfully");
        setShowItemModal(false);
        resetItemForm();
        await refreshMenusCache();
      }
    } catch (error) {
      console.error("Error adding item:", error);
      alert(error.response?.data?.message || "Failed to add item");
    }
  };

  const handleUpdateItem = async () => {
    if (!selectedMenu || !editingItem) return;

    try {
      const response = await updateMenuItem(
        selectedMenu.id,
        editingItem.id,
        itemForm,
      );
      if (response.data.success) {
        alert("Item updated successfully");
        setShowItemModal(false);
        resetItemForm();
        setEditingItem(null);
        await refreshMenusCache();
      }
    } catch (error) {
      console.error("Error updating item:", error);
      alert(error.response?.data?.message || "Failed to update item");
    }
  };

  const handleDeleteItem = async (menu, item) => {
    if (window.confirm(`Delete item "${item.name}"?`)) {
      try {
        const response = await deleteMenuItem(menu.id, item.id);
        if (response.data.success) {
          alert("Item deleted successfully");
          await refreshMenusCache();
        }
      } catch (error) {
        console.error("Error deleting item:", error);
        alert(error.response?.data?.message || "Failed to delete item");
      }
    }
  };

  const handleCreateFlavor = async () => {
    if (!flavorForm.label || flavorForm.price <= 0) {
      alert("Flavor label and price are required");
      return;
    }

    try {
      const response = await createItemFlavor(flavorForm);
      if (response.data.success) {
        alert("Flavor created successfully");
        setShowFlavorModal(false);
        resetFlavorForm();
        await refreshFlavorsCache();
      }
    } catch (error) {
      console.error("Error creating flavor:", error);
      alert(error.response?.data?.message || "Failed to create flavor");
    }
  };

  const handleUpdateFlavor = async () => {
    if (!editingFlavor) return;

    try {
      const response = await updateItemFlavor(editingFlavor._id, flavorForm);
      if (response.data.success) {
        alert("Flavor updated successfully");
        setShowFlavorModal(false);
        resetFlavorForm();
        setEditingFlavor(null);
        await refreshFlavorsCache();
      }
    } catch (error) {
      console.error("Error updating flavor:", error);
      alert(error.response?.data?.message || "Failed to update flavor");
    }
  };

  const handleDeleteFlavor = async (flavor) => {
    if (window.confirm(`Delete flavor "${flavor.label}"?`)) {
      try {
        const response = await deleteItemFlavor(flavor._id);
        if (response.data.success) {
          alert("Flavor deleted successfully");
          await refreshFlavorsCache();
        }
      } catch (error) {
        console.error("Error deleting flavor:", error);
        alert(error.response?.data?.message || "Failed to delete flavor");
      }
    }
  };

  const resetMenuForm = () => {
    setMenuForm({
      name: "",
      bgColor: "#f59e0b",
      icon: "🍽️",
      tag: "food",
    });
  };

  const resetItemForm = () => {
    setItemForm({
      name: "",
      category: "",
      tag: "food",
      variants: [{ label: "Regular", price: 0 }],
      hasFlavorSelection: false,
      flavorOptions: [],
      trackInventory: false,
      inventoryRequirements: [],
    });
  };

  const resetFlavorForm = () => {
    setFlavorForm({
      label: "",
      price: 0,
      category: "regular",
    });
  };

  const openEditMenu = (menu) => {
    setEditingMenu(menu);
    setMenuForm({
      name: menu.name,
      bgColor: menu.bgColor,
      icon: menu.icon,
      tag: menu.tag,
    });
    setShowMenuModal(true);
  };

  const openEditItem = (menu, item) => {
    setSelectedMenu(menu);
    setEditingItem(item);
    setItemForm({
      name: item.name,
      category: item.category || "",
      tag: item.tag,
      variants: item.variants || [{ label: "Regular", price: 0 }],
      hasFlavorSelection: item.hasFlavorSelection || false,
      flavorOptions: item.flavorOptions || [],
      trackInventory: item.trackInventory || false,
      inventoryRequirements: item.inventoryRequirements || [],
    });
    setShowItemModal(true);
  };

  const openEditFlavor = (flavor) => {
    setEditingFlavor(flavor);
    setFlavorForm({
      label: flavor.label,
      price: flavor.price,
      category: flavor.category,
    });
    setShowFlavorModal(true);
  };

  const addVariant = () => {
    setItemForm({
      ...itemForm,
      variants: [...itemForm.variants, { label: "", price: 0 }],
    });
  };

  const updateVariant = (index, field, value) => {
    const updatedVariants = [...itemForm.variants];
    updatedVariants[index][field] =
      field === "price" ? parseFloat(value) || 0 : value;
    setItemForm({ ...itemForm, variants: updatedVariants });
  };

  const removeVariant = (index) => {
    const updatedVariants = itemForm.variants.filter((_, i) => i !== index);
    setItemForm({ ...itemForm, variants: updatedVariants });
  };

  const addInventoryRequirement = () => {
    setItemForm({
      ...itemForm,
      inventoryRequirements: [
        ...itemForm.inventoryRequirements,
        {
          inventoryItemId: "",
          inventoryItemName: "",
          quantityPerServing: 1,
          unit: "pcs",
        },
      ],
    });
  };

  const updateInventoryRequirement = (index, field, value) => {
    const updatedRequirements = [...itemForm.inventoryRequirements];
    if (field === "inventoryItemId") {
      const selectedItem = inventoryItems.find((i) => i._id === value);
      updatedRequirements[index] = {
        ...updatedRequirements[index],
        inventoryItemId: value,
        inventoryItemName: selectedItem?.itemName || "",
        unit: selectedItem?.unit || "pcs",
      };
    } else {
      updatedRequirements[index][field] =
        field === "quantityPerServing" ? parseFloat(value) || 0 : value;
    }
    setItemForm({ ...itemForm, inventoryRequirements: updatedRequirements });
  };

  const removeInventoryRequirement = (index) => {
    const updatedRequirements = itemForm.inventoryRequirements.filter(
      (_, i) => i !== index,
    );
    setItemForm({ ...itemForm, inventoryRequirements: updatedRequirements });
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <BackButton />
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
            Menu Management
          </h1>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={() => {
              resetMenuForm();
              setEditingMenu(null);
              setShowMenuModal(true);
            }}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center gap-2 text-sm"
          >
            <MdAdd size={18} /> Add Menu Category
          </button>
          <button
            onClick={() => {
              resetFlavorForm();
              setEditingFlavor(null);
              setShowFlavorModal(true);
            }}
            className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 flex items-center gap-2 text-sm"
          >
            <MdAdd size={18} /> Add Flavor
          </button>
          <button
            onClick={async () => {
              await refreshMenusCache();
              await refreshFlavorsCache();
              await refreshInventoryCache();
              alert("All data refreshed from server!");
            }}
            className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 flex items-center gap-2 text-sm"
          >
            🔄 Refresh All Data
          </button>
        </div>

        {/* Inventory Summary */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MdInventory size={20} className="text-blue-600" />
              <span className="font-medium text-blue-800">
                Inventory Items Available:
              </span>
              <span className="text-blue-600 font-bold">
                {inventoryItems.length}
              </span>
            </div>
            <button
              onClick={refreshInventoryCache}
              className="text-blue-600 text-sm hover:text-blue-800"
            >
              Refresh Inventory
            </button>
          </div>
          {inventoryItems.length === 0 && (
            <p className="text-sm text-blue-600 mt-2">
              No inventory items found. Please add inventory items first in the
              Inventory page.
            </p>
          )}
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Menu Categories */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-4">Menu Categories</h2>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {menus.map((menu) => (
                  <div
                    key={menu.id}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      selectedMenu?.id === menu.id
                        ? "bg-blue-100 border-2 border-blue-500"
                        : "bg-gray-50 hover:bg-gray-100 border border-gray-200"
                    }`}
                    onClick={() => setSelectedMenu(menu)}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                          style={{ backgroundColor: menu.bgColor }}
                        >
                          {menu.icon}
                        </div>
                        <div>
                          <h3 className="font-semibold">{menu.name}</h3>
                          <p className="text-xs text-gray-500">ID: {menu.id}</p>
                          <p className="text-xs text-gray-400">
                            {menu.items?.length || 0} items
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditMenu(menu);
                          }}
                          className="p-2 text-blue-500 hover:bg-blue-50 rounded"
                        >
                          <MdEdit size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteMenu(menu);
                          }}
                          className="p-2 text-red-500 hover:bg-red-50 rounded"
                        >
                          <MdDelete size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {menus.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No menu categories. Click "Add Menu Category" to start.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Menu Items */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">
                {selectedMenu
                  ? `Items in ${selectedMenu.name}`
                  : "Select a menu"}
              </h2>
              {selectedMenu && (
                <button
                  onClick={() => {
                    resetItemForm();
                    setEditingItem(null);
                    setShowItemModal(true);
                  }}
                  className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 flex items-center gap-1 text-sm"
                >
                  <MdAdd size={14} /> Add Item
                </button>
              )}
            </div>

            {selectedMenu ? (
              selectedMenu.items?.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No items in this menu. Click "Add Item" to add.
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {selectedMenu.items.map((item) => (
                    <div key={item.id} className="border rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold">{item.name}</h3>
                          <p className="text-xs text-gray-500">ID: {item.id}</p>
                          <p className="text-xs text-gray-500">
                            Category: {item.category || "Uncategorized"}
                          </p>
                          {item.hasFlavorSelection && (
                            <span className="inline-block mt-1 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                              Has Flavors
                            </span>
                          )}
                          {item.trackInventory &&
                            item.inventoryRequirements?.length > 0 && (
                              <div className="mt-2">
                                <span className="inline-block text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded flex items-center gap-1">
                                  <MdInventory size={12} /> Tracks Inventory
                                </span>
                                <div className="mt-1 text-xs text-gray-600">
                                  {item.inventoryRequirements.map(
                                    (req, idx) => (
                                      <div key={idx}>
                                        • {req.quantityPerServing} {req.unit}{" "}
                                        {req.inventoryItemName}
                                      </div>
                                    ),
                                  )}
                                </div>
                              </div>
                            )}
                          <div className="mt-2">
                            <p className="text-xs font-semibold text-gray-600">
                              Variants:
                            </p>
                            {item.variants?.map((variant, idx) => (
                              <p key={idx} className="text-xs text-gray-500">
                                {variant.label}: ₱
                                {variant.price.toLocaleString()}
                              </p>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => openEditItem(selectedMenu, item)}
                            className="p-2 text-blue-500 hover:bg-blue-50 rounded"
                          >
                            <MdEdit size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(selectedMenu, item)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded"
                          >
                            <MdDelete size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div className="text-center py-8 text-gray-500">
                Select a menu category to view its items
              </div>
            )}
          </div>
        </div>

        {/* Flavors Section */}
        <div className="mt-6 bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-4">Flavors</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {flavors.map((flavor) => (
              <div
                key={flavor._id}
                className="border rounded-lg p-3 flex justify-between items-center"
              >
                <div>
                  <h3 className="font-semibold">{flavor.label}</h3>
                  <p className="text-sm text-gray-500">
                    ₱{flavor.price.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400 capitalize">
                    {flavor.category}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEditFlavor(flavor)}
                    className="p-2 text-blue-500 hover:bg-blue-50 rounded"
                  >
                    <MdEdit size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteFlavor(flavor)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded"
                  >
                    <MdDelete size={16} />
                  </button>
                </div>
              </div>
            ))}
            {flavors.length === 0 && (
              <div className="text-center py-4 text-gray-500 col-span-full">
                No flavors. Click "Add Flavor" to add.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Menu Modal */}
      {showMenuModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {editingMenu ? "Edit Menu" : "Add Menu"}
              </h2>
              <button
                onClick={() => setShowMenuModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <MdClose size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Menu Name"
                value={menuForm.name}
                onChange={(e) =>
                  setMenuForm({ ...menuForm, name: e.target.value })
                }
                className="w-full p-2 border rounded"
              />
              <input
                type="color"
                value={menuForm.bgColor}
                onChange={(e) =>
                  setMenuForm({ ...menuForm, bgColor: e.target.value })
                }
                className="w-full p-2 border rounded h-12"
              />
              <input
                type="text"
                placeholder="Icon (emoji)"
                value={menuForm.icon}
                onChange={(e) =>
                  setMenuForm({ ...menuForm, icon: e.target.value })
                }
                className="w-full p-2 border rounded"
              />
              <select
                value={menuForm.tag}
                onChange={(e) =>
                  setMenuForm({ ...menuForm, tag: e.target.value })
                }
                className="w-full p-2 border rounded"
              >
                <option value="food">Food</option>
                <option value="drink">Drink</option>
              </select>
              <button
                onClick={editingMenu ? handleUpdateMenu : handleCreateMenu}
                className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
              >
                {editingMenu ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item Modal */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {editingItem ? "Edit Item" : "Add Item"}
              </h2>
              <button
                onClick={() => setShowItemModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <MdClose size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Item Name"
                value={itemForm.name}
                onChange={(e) =>
                  setItemForm({ ...itemForm, name: e.target.value })
                }
                className="w-full p-2 border rounded"
              />
              <input
                type="text"
                placeholder="Category"
                value={itemForm.category}
                onChange={(e) =>
                  setItemForm({ ...itemForm, category: e.target.value })
                }
                className="w-full p-2 border rounded"
              />
              <select
                value={itemForm.tag}
                onChange={(e) =>
                  setItemForm({ ...itemForm, tag: e.target.value })
                }
                className="w-full p-2 border rounded"
              >
                <option value="food">Food</option>
                <option value="drink">Drink</option>
              </select>

              {/* Inventory Tracking Toggle */}
              <div className="border rounded-lg p-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={itemForm.trackInventory}
                    onChange={(e) =>
                      setItemForm({
                        ...itemForm,
                        trackInventory: e.target.checked,
                      })
                    }
                    className="w-4 h-4"
                  />
                  <span className="font-medium">
                    Track Inventory for this Item
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  When enabled, ordering this item will automatically deduct
                  from inventory
                </p>
              </div>

              {/* Inventory Requirements */}
              {itemForm.trackInventory && (
                <div className="border rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold">Inventory Requirements</h3>
                    <button
                      onClick={addInventoryRequirement}
                      className="text-blue-500 text-sm hover:text-blue-700"
                    >
                      + Add Requirement
                    </button>
                  </div>
                  {itemForm.inventoryRequirements.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-2">
                      No inventory requirements added. Add ingredients/supplies
                      needed for this item.
                    </p>
                  )}
                  {itemForm.inventoryRequirements.map((req, idx) => (
                    <div
                      key={idx}
                      className="flex gap-2 mb-2 p-2 bg-gray-50 rounded"
                    >
                      <select
                        value={req.inventoryItemId}
                        onChange={(e) =>
                          updateInventoryRequirement(
                            idx,
                            "inventoryItemId",
                            e.target.value,
                          )
                        }
                        className="flex-1 p-2 border rounded text-sm"
                      >
                        <option value="">Select Inventory Item</option>
                        {inventoryItems.map((inv) => (
                          <option key={inv._id} value={inv._id}>
                            {inv.itemName} (
                            {inv.remainingQuantity || inv.quantity || 0}{" "}
                            {inv.unit} left)
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        placeholder="Qty"
                        value={req.quantityPerServing}
                        onChange={(e) =>
                          updateInventoryRequirement(
                            idx,
                            "quantityPerServing",
                            e.target.value,
                          )
                        }
                        className="w-20 p-2 border rounded text-sm"
                        min="0"
                        step="0.01"
                      />
                      <span className="text-sm text-gray-500 py-2">
                        {req.unit || "pcs"}
                      </span>
                      <button
                        onClick={() => removeInventoryRequirement(idx)}
                        className="text-red-500 px-2"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Flavor Selection Toggle */}
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={itemForm.hasFlavorSelection}
                  onChange={(e) =>
                    setItemForm({
                      ...itemForm,
                      hasFlavorSelection: e.target.checked,
                    })
                  }
                />
                Has Flavor Selection
              </label>

              {/* Variants */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold">Variants</h3>
                  <button
                    onClick={addVariant}
                    className="text-blue-500 text-sm"
                  >
                    + Add Variant
                  </button>
                </div>
                {itemForm.variants.map((variant, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Label (e.g., Regular, Large)"
                      value={variant.label}
                      onChange={(e) =>
                        updateVariant(idx, "label", e.target.value)
                      }
                      className="flex-1 p-2 border rounded"
                    />
                    <input
                      type="number"
                      placeholder="Price"
                      value={variant.price}
                      onChange={(e) =>
                        updateVariant(idx, "price", e.target.value)
                      }
                      className="w-24 p-2 border rounded"
                    />
                    <button
                      onClick={() => removeVariant(idx)}
                      className="text-red-500 px-2"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={editingItem ? handleUpdateItem : handleCreateItem}
                className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600"
              >
                {editingItem ? "Update" : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Flavor Modal */}
      {showFlavorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {editingFlavor ? "Edit Flavor" : "Add Flavor"}
              </h2>
              <button
                onClick={() => setShowFlavorModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <MdClose size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Flavor Label"
                value={flavorForm.label}
                onChange={(e) =>
                  setFlavorForm({ ...flavorForm, label: e.target.value })
                }
                className="w-full p-2 border rounded"
              />
              <input
                type="number"
                placeholder="Price"
                value={flavorForm.price}
                onChange={(e) =>
                  setFlavorForm({
                    ...flavorForm,
                    price: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full p-2 border rounded"
              />
              <select
                value={flavorForm.category}
                onChange={(e) =>
                  setFlavorForm({ ...flavorForm, category: e.target.value })
                }
                className="w-full p-2 border rounded"
              >
                <option value="regular">Regular</option>
                <option value="keto">Keto</option>
              </select>
              <button
                onClick={
                  editingFlavor ? handleUpdateFlavor : handleCreateFlavor
                }
                className="w-full bg-purple-500 text-white py-2 rounded hover:bg-purple-600"
              >
                {editingFlavor ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default AdminMenu;
