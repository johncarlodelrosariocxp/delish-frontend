import React, { useState, useEffect } from "react";
import { addInventoryItem, updateInventoryItem, getMenus } from "../../https";

const InventoryForm = ({ item, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    itemName: "",
    description: "",
    category: "Ingredients",
    quantity: "",
    unit: "pcs",
    unitPrice: "1",
    supplier: "",
    datePurchased: new Date().toISOString().split("T")[0],
    receiptNumber: "",
    notes: "",
    linkedMenuItems: [],
  });
  const [allMenuItems, setAllMenuItems] = useState([]);
  const [loadingMenus, setLoadingMenus] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadAllMenus();
  }, []);

  const loadAllMenus = async () => {
    setLoadingMenus(true);
    try {
      const response = await getMenus();
      if (response.data.success && response.data.menus) {
        const items = [];
        response.data.menus.forEach((menu) => {
          if (menu.items && menu.items.length > 0) {
            menu.items.forEach((menuItem) => {
              items.push({
                id: menuItem.id,
                name: menuItem.name,
                menuName: menu.name,
                uniqueKey: `${menu.id}_${menuItem.id}`,
                fullName: `${menu.name} → ${menuItem.name}`,
              });
            });
          }
        });
        setAllMenuItems(items);
      }
    } catch (error) {
      console.error("Error loading menus:", error);
    } finally {
      setLoadingMenus(false);
    }
  };

  useEffect(() => {
    if (item) {
      setFormData({
        itemName: item.itemName || "",
        description: item.description || "",
        category: item.category || "Ingredients",
        quantity: item.quantity || "",
        unit: item.unit || "pcs",
        unitPrice:
          item.unitPrice !== undefined && item.unitPrice !== null
            ? item.unitPrice.toString()
            : "1",
        supplier: item.supplier || "",
        datePurchased: item.datePurchased
          ? new Date(item.datePurchased).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        receiptNumber: item.receiptNumber || "",
        notes: item.notes || "",
        linkedMenuItems: item.linkedMenuItems || [],
      });
    }
  }, [item]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError("");
  };

  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value === "" ? "" : parseFloat(value),
    }));
    if (error) setError("");
  };

  const addLinkedMenuItem = () => {
    setFormData((prev) => ({
      ...prev,
      linkedMenuItems: [
        ...prev.linkedMenuItems,
        { menuItemId: "", menuItemName: "", quantityPerUnit: 1, menuName: "" },
      ],
    }));
  };

  const updateLinkedMenuItem = (index, field, value) => {
    const updated = [...formData.linkedMenuItems];

    if (field === "menuItemId") {
      const numValue = value === "" ? null : Number(value);
      const selectedItem = allMenuItems.find((i) => i.id === numValue);
      if (selectedItem) {
        updated[index] = {
          ...updated[index],
          menuItemId: selectedItem.id,
          menuItemName: selectedItem.name,
          menuName: selectedItem.menuName,
        };
      } else {
        updated[index] = {
          ...updated[index],
          menuItemId: null,
          menuItemName: "",
          menuName: "",
        };
      }
    } else if (field === "quantityPerUnit") {
      updated[index][field] = parseFloat(value) || 0;
    }

    setFormData({ ...formData, linkedMenuItems: updated });
  };

  const removeLinkedMenuItem = (index) => {
    setFormData({
      ...formData,
      linkedMenuItems: formData.linkedMenuItems.filter((_, i) => i !== index),
    });
  };

  // Function to notify other components that inventory has changed
  const notifyInventoryChange = () => {
    // Clear all inventory caches
    localStorage.removeItem("admin_cached_inventory");
    localStorage.removeItem("admin_cached_inventory_timestamp");
    localStorage.removeItem("cached_inventory");
    localStorage.removeItem("cached_inventory_timestamp");

    // Dispatch a custom event that other components can listen to
    const event = new CustomEvent("inventoryChanged", {
      detail: { message: "Inventory has been updated", timestamp: Date.now() },
    });
    window.dispatchEvent(event);

    console.log("📢 Inventory change notification sent to all components");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!formData.itemName.trim()) {
      setError("Item name is required");
      setLoading(false);
      return;
    }

    if (!formData.quantity || formData.quantity <= 0) {
      setError("Quantity must be greater than 0");
      setLoading(false);
      return;
    }

    // Handle unit price - if empty or invalid, default to 1
    let unitPriceValue = 1;
    if (
      formData.unitPrice !== "" &&
      formData.unitPrice !== null &&
      formData.unitPrice !== undefined
    ) {
      const parsedPrice = parseFloat(formData.unitPrice);
      if (!isNaN(parsedPrice) && parsedPrice > 0) {
        unitPriceValue = parsedPrice;
      }
    }

    const submitData = {
      itemName: formData.itemName.trim(),
      description: formData.description || "",
      category: formData.category,
      quantity: Number(formData.quantity),
      unit: formData.unit,
      unitPrice: unitPriceValue,
      supplier: formData.supplier || "",
      datePurchased: formData.datePurchased,
      receiptNumber: formData.receiptNumber || "",
      notes: formData.notes || "",
      linkedMenuItems: formData.linkedMenuItems
        .filter((link) => link.menuItemId && link.menuItemId !== "")
        .map((link) => ({
          menuItemId: Number(link.menuItemId),
          menuItemName: link.menuItemName,
          quantityPerUnit: Number(link.quantityPerUnit),
        })),
    };

    console.log("📤 SUBMITTING:", submitData);

    try {
      let response;
      if (item) {
        response = await updateInventoryItem(item._id, submitData);
      } else {
        response = await addInventoryItem(submitData);
      }

      if (response && (response.status === 200 || response.status === 201)) {
        // Notify all components that inventory has changed
        notifyInventoryChange();
        onSave();
      } else {
        throw new Error(response?.data?.message || "Unknown error");
      }
    } catch (error) {
      console.error("❌ ERROR:", error);
      let errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Error creating inventory item";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    "Ingredients",
    "Supplies",
    "Equipment",
    "Utilities",
    "Other",
  ];
  const units = [
    "pcs",
    "kg",
    "g",
    "L",
    "ml",
    "box",
    "pack",
    "sack",
    "bottle",
    "cup",
    "oz",
    "lb",
  ];

  const totalCost = (() => {
    const quantity = Number(formData.quantity);
    const unitPrice =
      formData.unitPrice === "" ? 1 : Number(formData.unitPrice);
    if (quantity && !isNaN(quantity) && unitPrice && !isNaN(unitPrice)) {
      return (quantity * unitPrice).toFixed(2);
    }
    return "0.00";
  })();

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          <span className="font-medium">{error}</span>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Item Name *
        </label>
        <input
          type="text"
          name="itemName"
          value={formData.itemName}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Category *
        </label>
        <select
          name="category"
          value={formData.category}
          onChange={handleChange}
          className="w-full px-3 py-2 border rounded-md"
          disabled={loading}
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Quantity *
          </label>
          <input
            type="number"
            name="quantity"
            value={formData.quantity}
            onChange={handleNumberChange}
            min="0"
            step="0.01"
            required
            className="w-full px-3 py-2 border rounded-md"
            disabled={loading}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Unit *
          </label>
          <select
            name="unit"
            value={formData.unit}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-md"
            disabled={loading}
          >
            {units.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Unit Price (₱)
          </label>
          <input
            type="number"
            name="unitPrice"
            value={formData.unitPrice}
            onChange={handleNumberChange}
            min="0"
            step="0.01"
            className="w-full px-3 py-2 border rounded-md"
            disabled={loading}
            placeholder="Optional - defaults to 1"
          />
          <p className="text-xs text-gray-500 mt-1">
            Optional - will default to ₱1.00 if left empty
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Total Cost
          </label>
          <div className="w-full px-3 py-2 bg-gray-100 border rounded-md text-gray-700">
            ₱{totalCost}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Auto-calculated from quantity × unit price (defaults to 1 if empty)
          </p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Supplier
        </label>
        <input
          type="text"
          name="supplier"
          value={formData.supplier}
          onChange={handleChange}
          className="w-full px-3 py-2 border rounded-md"
          disabled={loading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Date Purchased
        </label>
        <input
          type="date"
          name="datePurchased"
          value={formData.datePurchased}
          onChange={handleChange}
          className="w-full px-3 py-2 border rounded-md"
          disabled={loading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows="2"
          className="w-full px-3 py-2 border rounded-md"
          disabled={loading}
        />
      </div>

      <div className="flex space-x-3 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
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
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Saving...
            </>
          ) : (
            `${item ? "Update" : "Create"} Item`
          )}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="flex-1 px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default InventoryForm;
