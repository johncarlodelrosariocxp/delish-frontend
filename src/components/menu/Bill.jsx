import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  removeItemFromOrder,
  incrementQuantityInOrder,
  decrementQuantityInOrder,
  redeemItemInOrder,
  removeRedemptionFromOrder,
  completeOrder,
  processOrder,
  resetOrderStatus,
  clearCurrentOrder,
  setActiveOrder,
} from "../../redux/slices/orderSlice";
import { addOrder } from "../../https/index";
import { enqueueSnackbar } from "notistack";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

// Import Invoice component
import Invoice from "../../components/invoice/Invoice";

const Bill = ({ orderId }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Get order-specific data
  const orders = useSelector((state) => state.order.orders);
  const activeOrderId = useSelector((state) => state.order.activeOrderId);

  // ✅ Get user data
  const userState = useSelector((state) => state.auth);

  // ✅ Extract user with multiple fallbacks
  const user = React.useMemo(() => {
    const possiblePaths = [
      userState?.user,
      userState?.data?.user,
      userState?.data?.data?.user,
      userState?.userData,
      userState?.currentUser,
    ];

    const foundUser = possiblePaths.find(Boolean);
    if (foundUser) return foundUser;

    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) return JSON.parse(storedUser);
    } catch (error) {
      console.error("Error parsing localStorage user:", error);
    }

    try {
      const token = localStorage.getItem("authToken");
      if (token) {
        const payload = JSON.parse(atob(token.split(".")[1]));
        return {
          _id: payload?._id || payload?.userId || payload?.id,
          name: payload?.name || "Cashier",
          role: payload?.role || "cashier",
          email: payload?.email || "",
        };
      }
    } catch (error) {
      console.error("Error extracting user from token:", error);
    }

    return {
      _id: "000000000000000000000001",
      name: "Admin",
      role: "admin",
    };
  }, [userState]);

  // ✅ FIXED: Find current order and next order
  const findCurrentOrder = () => {
    if (orderId) {
      return orders.find((order) => order.id === orderId);
    }

    if (activeOrderId) {
      return orders.find((order) => order.id === activeOrderId);
    }

    return orders.find(
      (order) =>
        !order.orderStatus ||
        order.orderStatus === "pending" ||
        order.orderStatus === "processing" ||
        order.orderStatus === "in-progress" ||
        order.status === "pending" ||
        order.status === "processing" ||
        order.status === "in-progress"
    );
  };

  // ✅ Find the next pending order
  const findNextPendingOrder = () => {
    const pendingOrders = orders.filter(
      (order) =>
        !order.orderStatus ||
        order.orderStatus === "pending" ||
        order.orderStatus === "processing" ||
        order.orderStatus === "in-progress" ||
        order.status === "pending" ||
        order.status === "processing" ||
        order.status === "in-progress"
    );

    return pendingOrders.find((order) => order.id !== currentOrder?.id);
  };

  // ✅ NEW: Get all pending orders in sequence
  const getAllPendingOrders = () => {
    return orders.filter(
      (order) =>
        !order.orderStatus ||
        order.orderStatus === "pending" ||
        order.orderStatus === "processing" ||
        order.orderStatus === "in-progress" ||
        order.status === "pending" ||
        order.status === "processing" ||
        order.status === "in-progress"
    );
  };

  const currentOrder = findCurrentOrder();
  const nextOrder = findNextPendingOrder();
  const pendingOrders = getAllPendingOrders();
  const cartData = currentOrder?.items || [];

  const vatRate = 12;
  const pwdSeniorDiscountRate = 0.2;
  const employeeDiscountRate = 0.15;
  const shareholderDiscountRate = 0.1;

  const [pwdSeniorDiscountApplied, setPwdSeniorDiscountApplied] =
    useState(false);
  const [employeeDiscountApplied, setEmployeeDiscountApplied] = useState(false);
  const [shareholderDiscountApplied, setShareholderDiscountApplied] =
    useState(false);
  // ✅ ADDED: Custom discount state
  const [customDiscountApplied, setCustomDiscountApplied] = useState(false);
  const [customDiscountAmount, setCustomDiscountAmount] = useState(0);
  const [customDiscountType, setCustomDiscountType] = useState("percentage"); // 'percentage' or 'fixed'
  const [customDiscountValue, setCustomDiscountValue] = useState(0);
  const [showCustomDiscountModal, setShowCustomDiscountModal] = useState(false);
  const [customDiscountReason, setCustomDiscountReason] = useState("");
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [showRedeemOptions, setShowRedeemOptions] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pwdSeniorDiscountItems, setPwdSeniorDiscountItems] = useState([]);
  const [showPwdSeniorSelection, setShowPwdSeniorSelection] = useState(false);
  const [pwdSeniorDetails, setPwdSeniorDetails] = useState({
    name: "",
    idNumber: "",
    type: "PWD",
  });
  const [customerType, setCustomerType] = useState("walk-in");
  const [customerPhone, setCustomerPhone] = useState("");
  const [cashAmount, setCashAmount] = useState(0);
  const [showCashModal, setShowCashModal] = useState(false);
  const [showOnlineOptions, setShowOnlineOptions] = useState(false);
  const [mixedPayment, setMixedPayment] = useState({
    isMixed: false,
    cashAmount: 0,
    onlineAmount: 0,
    onlineMethod: null,
  });
  const [showMixedPaymentModal, setShowMixedPaymentModal] = useState(false);
  const [activeCategory, setActiveCategory] = useState("drinks"); // Start with drinks tab active

  // ✅ FIXED: State for showing Invoice component
  const [showInvoice, setShowInvoice] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null);

  // ✅ FIXED: Added missing state declaration
  const [showNextOrderConfirm, setShowNextOrderConfirm] = useState(false);

  // ✅ NEW: Track processed orders to prevent double switching
  const [processedOrders, setProcessedOrders] = useState(new Set());

  // Safe number conversion helper
  const safeNumber = (value) => {
    if (value === undefined || value === null) return 0;
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  };

  // Combine same items in cart
  const combineCartItems = (cart) => {
    const combinedItems = {};

    cart.forEach((item) => {
      if (!item || !item.id) return;

      const key = `${item.id}-${item.pricePerQuantity}-${item.isRedeemed}-${
        item.tag || ""
      }`;
      if (combinedItems[key]) {
        combinedItems[key].quantity += safeNumber(item.quantity);
        combinedItems[key].originalItems = [
          ...combinedItems[key].originalItems,
          item,
        ];
      } else {
        combinedItems[key] = {
          ...item,
          quantity: safeNumber(item.quantity),
          originalItems: [item],
        };
      }
    });

    return Object.values(combinedItems);
  };

  // ✅ FIXED: Improved drink item detection - ONLY drinks
  const isDrinkItem = (item) => {
    if (!item) return false;

    // Check tag first (most reliable)
    if (item.tag === "drink" || item.tag === "beverage") {
      return true;
    }

    // Check category from database
    if (item.category) {
      const category = item.category.toLowerCase().trim();
      const drinkCategories = [
        "drink",
        "drinks",
        "beverage",
        "beverages",
        "juice",
        "soda",
        "water",
        "coffee",
        "tea",
        "milkshake",
        "smoothie",
        "softdrink",
        "coke",
        "cola",
        "pepsi",
        "lemonade",
        "iced tea",
        "iced coffee",
        "frappe",
        "frappuccino",
        "bubble tea",
        "brewed",
        "milk",
        "cocoa",
        "hot chocolate",
        "latte",
        "cappuccino",
        "espresso",
        "americano",
        "macchiato",
        "mocha",
        "choco",
        "matcha",
        "ube",
        "vanilla",
        "caramel",
        "hazelnut",
        "biscoff",
        "white mocha",
        "oreo",
        "chocolate",
        "choco chip",
        "general beverage",
        "cold drink",
        "hot drink",
      ];

      if (drinkCategories.some((drinkCat) => category.includes(drinkCat))) {
        return true;
      }
    }

    // Check name for drink keywords - ONLY drink-specific keywords
    const name = item.name ? item.name.toLowerCase() : "";

    // First, check for food items that might be misclassified
    const foodKeywordsInName = [
      "cheesecake",
      "cake",
      "bread",
      "cookie",
      "bento",
      "box",
      "combo",
      "rice",
      "egg",
      "bacon",
      "sausage",
      "tapa",
      "tocino",
      "longganisa",
      "bangus",
      "spam",
      "embutido",
      "hungarian",
      "carbonara",
      "pesto",
      "tart",
      "wedges",
      "nachos",
      "omelette",
      "shanghai",
    ];

    // If it has any food keyword in the name, it's NOT a drink
    if (foodKeywordsInName.some((keyword) => name.includes(keyword))) {
      return false;
    }

    // Now check for drink-specific keywords
    const drinkKeywords = [
      "drink",
      "juice",
      "soda",
      "water",
      "coffee",
      "tea",
      "milkshake",
      "smoothie",
      "softdrink",
      "beverage",
      "shake",
      "coke",
      "pepsi",
      "cola",
      "lemonade",
      "iced tea",
      "iced coffee",
      "hot coffee",
      "frappe",
      "frappuccino",
      "bubble tea",
      "milk tea",
      "brewed",
      "milk",
      "cocoa",
      "hot chocolate",
      "latte",
      "cappuccino",
      "espresso",
      "americano",
      "macchiato",
      "mocha",
      "matcha",
      "ube",
      "vanilla",
      "caramel",
      "hazelnut",
      "biscoff",
      "white mocha",
      "oreo",
      "chocolate",
      "choco",
    ];

    // Check if any drink keyword is in the name
    return drinkKeywords.some((keyword) => name.includes(keyword));
  };

  // ✅ FIXED: Improved food item detection - ONLY food
  const isFoodItem = (item) => {
    if (!item) return false;

    // Check tag first (most reliable)
    if (item.tag === "food") {
      return true;
    }

    // Check category from database
    if (item.category) {
      const category = item.category.toLowerCase().trim();
      const foodCategories = [
        "food",
        "meal",
        "breakfast",
        "lunch",
        "dinner",
        "appetizer",
        "appetizers",
        "main course",
        "entree",
        "dessert",
        "desserts",
        "snack",
        "snacks",
        "cake",
        "cakes",
        "pie",
        "pies",
        "bread",
        "breads",
        "roll",
        "rolls",
        "egg",
        "eggs",
        "bacon",
        "sausage",
        "sausages",
        "ham",
        "cheese",
        "butter",
        "sauce",
        "sauces",
        "gravy",
        "potato",
        "potatoes",
        "vegetable",
        "vegetables",
        "fruit",
        "fruits",
        "seafood",
        "meat",
        "meats",
        "nugget",
        "nuggets",
        "wing",
        "wings",
        "drumstick",
        "drumsticks",
        "fillet",
        "fillets",
        "cutlet",
        "cutlets",
        "patty",
        "patties",
        "ball",
        "balls",
        "stick",
        "sticks",
        "finger",
        "fingers",
        "dumpling",
        "dumplings",
        "spring roll",
        "spring rolls",
        "lumpia",
        "siomai",
        "keto",
        "bento",
        "tart",
        "cookie",
        "wedges",
        "nachos",
        "longganisa",
      ];

      if (foodCategories.some((foodCat) => category.includes(foodCat))) {
        return true;
      }
    }

    // Check name for food keywords - ONLY food
    const name = item.name ? item.name.toLowerCase() : "";

    // First, check for drink keywords in the name
    const drinkKeywordsInName = [
      "drink",
      "juice",
      "soda",
      "water",
      "coffee",
      "tea",
      "milkshake",
      "smoothie",
      "softdrink",
      "beverage",
      "shake",
      "coke",
      "pepsi",
      "cola",
      "lemonade",
      "iced tea",
      "iced coffee",
      "hot coffee",
      "frappe",
      "frappuccino",
      "bubble tea",
      "milk tea",
      "brewed",
      "milk",
      "cocoa",
      "hot chocolate",
      "latte",
      "cappuccino",
      "espresso",
      "americano",
      "macchiato",
      "mocha",
      "matcha",
    ];

    // If it has any drink keyword in the name, it's NOT food
    if (drinkKeywordsInName.some((keyword) => name.includes(keyword))) {
      return false;
    }

    // Now check for food keywords
    const foodKeywords = [
      // Specific food items from your list
      "omelette",
      "pork shanghai",
      "shanghai",
      "longganisa",
      "longanisa",
      "bangus shanghai",
      "bangus",
      "milkfish",
      "spam",
      "embutido",
      "hungarian",
      "sausage",
      "tapa",
      "beef tapa",
      "pork tocino",
      "tocino",
      "bacon",
      "keto pandesal",
      "pandesal",
      "rice",
      "egg",
      "eggs",
      "carbonara",
      "pesto",
      "egg tart",
      "tart",
      "banana bread",
      "bread",
      "cookies",
      "cookie",
      "potato wedges",
      "potato",
      "wedges",
      "nachos",
      "cheesecake",
      "regular cheesecake",
      "keto cheesecake",
      "bento combo",
      "bento",
      "mini box",
      "box",
      "mini cake",

      // General food keywords
      "burger",
      "sandwich",
      "steak",
      "pizza",
      "salad",
      "soup",
      "fries",
      "noodle",
      "curry",
      "taco",
      "burrito",
      "filipino",
      "asian",
      "western",
      "meal",
      "platter",
      "combo",
      "set",
      "dish",
      "pasta",
      "spaghetti",
      "noodles",
      "carbonara",
      "pesto",
    ];

    // Check for exact match first
    const exactMatches = [
      "omelette",
      "pork shanghai",
      "longganisa",
      "bangus shanghai",
      "spam",
      "embutido",
      "hungarian",
      "tapa",
      "pork tocino",
      "bacon",
      "keto pandesal",
      "rice",
      "egg",
      "carbonara",
      "pesto",
      "egg tart",
      "banana bread",
      "cookies",
      "potato wedges",
      "nachos",
      "regular cheesecake",
      "keto cheesecake",
      "bento combo",
      "bento",
      "mini box",
      "mini cake",
    ];

    // Check for exact match
    for (const exactName of exactMatches) {
      if (name.includes(exactName)) {
        return true;
      }
    }

    // Check for partial matches
    return foodKeywords.some((keyword) => name.includes(keyword));
  };

  // Get item tag (food or drink)
  const getItemTag = (item) => {
    if (!item) return "food"; // Default to food

    // Check if item has tag property
    if (item.tag) {
      return item.tag;
    }

    // Determine based on category/name
    const isDrink = isDrinkItem(item);
    const isFood = isFoodItem(item);

    // If it's both or neither, use default logic
    if (isDrink && !isFood) return "drink";
    if (isFood && !isDrink) return "food";

    // Default to food if ambiguous
    return "food";
  };

  // Get unique key for an item
  const getItemKey = (item) => {
    if (!item) return "unknown";
    return `${item.id || "unknown"}-${item.pricePerQuantity || 0}-${
      item.isRedeemed || false
    }-${getItemTag(item)}`;
  };

  // Calculate totals - UPDATED to include custom discount
  const calculateTotals = () => {
    try {
      const baseGrossTotal = cartData.reduce(
        (sum, item) =>
          item &&
          item.pricePerQuantity !== undefined &&
          item.quantity !== undefined
            ? sum +
              safeNumber(item.quantity) * safeNumber(item.pricePerQuantity)
            : sum,
        0
      );

      let pwdSeniorDiscountAmount = 0;
      let discountedItemsTotal = 0;

      if (pwdSeniorDiscountApplied && pwdSeniorDiscountItems.length > 0) {
        discountedItemsTotal = pwdSeniorDiscountItems.reduce(
          (sum, item) =>
            item &&
            item.pricePerQuantity !== undefined &&
            item.quantity !== undefined
              ? sum +
                safeNumber(item.quantity) * safeNumber(item.pricePerQuantity)
              : sum,
          0
        );
        pwdSeniorDiscountAmount = discountedItemsTotal * pwdSeniorDiscountRate;
      }

      const redemptionAmount = cartData.reduce((sum, item) => {
        if (!item) return sum;
        return item.isRedeemed &&
          item.pricePerQuantity !== undefined &&
          item.quantity !== undefined
          ? sum + safeNumber(item.quantity) * safeNumber(item.pricePerQuantity)
          : sum;
      }, 0);

      // ✅ ADDED: Calculate custom discount amount
      let customDiscountAmount = 0;
      if (customDiscountApplied && customDiscountValue > 0) {
        if (customDiscountType === "percentage") {
          // Apply percentage discount to subtotal after other discounts
          const subtotalBeforeCustom =
            baseGrossTotal - pwdSeniorDiscountAmount - redemptionAmount;
          customDiscountAmount =
            (subtotalBeforeCustom * customDiscountValue) / 100;
        } else {
          // Fixed amount discount
          customDiscountAmount = customDiscountValue;
        }
      }

      const subtotalAfterPwdSeniorRedemptionAndCustom =
        baseGrossTotal -
        pwdSeniorDiscountAmount -
        redemptionAmount -
        customDiscountAmount;

      const employeeDiscountAmount = employeeDiscountApplied
        ? Math.max(0, subtotalAfterPwdSeniorRedemptionAndCustom) *
          employeeDiscountRate
        : 0;

      const subtotalAfterEmployeeDiscount =
        Math.max(0, subtotalAfterPwdSeniorRedemptionAndCustom) -
        employeeDiscountAmount;

      const shareholderDiscountAmount = shareholderDiscountApplied
        ? Math.max(0, subtotalAfterEmployeeDiscount) * shareholderDiscountRate
        : 0;

      const discountedTotal = Math.max(
        0,
        Math.max(0, subtotalAfterEmployeeDiscount) - shareholderDiscountAmount
      );
      const netSales = discountedTotal / (1 + vatRate / 100);
      const vatAmount = discountedTotal - netSales;
      const total = Math.max(0, Number(discountedTotal.toFixed(2)));

      const totalDiscountAmount =
        pwdSeniorDiscountAmount +
        employeeDiscountAmount +
        shareholderDiscountAmount +
        redemptionAmount +
        customDiscountAmount; // ✅ Added custom discount to total

      // Calculate change
      const cashAmountNum = safeNumber(cashAmount);
      const onlineAmountNum = safeNumber(mixedPayment.onlineAmount);
      const totalPaid = cashAmountNum + onlineAmountNum;

      let change = 0;
      if (paymentMethod === "Cash") {
        change = Math.max(0, cashAmountNum - total);
      } else if (paymentMethod === "Mixed" || mixedPayment.isMixed) {
        change = Math.max(0, totalPaid - total);
      }

      return {
        baseGrossTotal,
        pwdSeniorDiscountAmount,
        discountedItemsTotal,
        redemptionAmount,
        employeeDiscountAmount,
        shareholderDiscountAmount,
        customDiscountAmount, // ✅ Added custom discount
        netSales,
        vatAmount,
        total,
        totalDiscountAmount,
        subtotalAfterPwdSeniorAndRedemption:
          subtotalAfterPwdSeniorRedemptionAndCustom,
        cashAmount: cashAmountNum,
        onlineAmount: onlineAmountNum,
        totalPaid,
        change,
        remainingBalance: Math.max(0, total - totalPaid),
      };
    } catch (error) {
      console.error("Error calculating totals:", error);
      return {
        baseGrossTotal: 0,
        pwdSeniorDiscountAmount: 0,
        discountedItemsTotal: 0,
        redemptionAmount: 0,
        employeeDiscountAmount: 0,
        shareholderDiscountAmount: 0,
        customDiscountAmount: 0, // ✅ Added custom discount
        netSales: 0,
        vatAmount: 0,
        total: 0,
        totalDiscountAmount: 0,
        subtotalAfterPwdSeniorAndRedemption: 0,
        cashAmount: 0,
        onlineAmount: 0,
        totalPaid: 0,
        change: 0,
        remainingBalance: 0,
      };
    }
  };

  const totals = calculateTotals();

  // Add default discountedPrice field
  const addDefaultDiscountedPrice = (cart) => {
    return cart.map((item) => ({
      ...item,
      discountedPrice:
        item.discountedPrice ?? safeNumber(item.pricePerQuantity),
      pricePerQuantity: safeNumber(item.pricePerQuantity),
      price: safeNumber(item.price),
    }));
  };

  const processedCart = addDefaultDiscountedPrice(cartData);
  const combinedCart = combineCartItems(processedCart);

  // Calculate item total
  const calculateItemTotal = (item) => {
    if (!item) return 0;

    if (item.isRedeemed) return 0;

    const isDiscounted = pwdSeniorDiscountItems.some(
      (discountedItem) => getItemKey(discountedItem) === getItemKey(item)
    );

    if (isDiscounted) {
      const originalTotal =
        safeNumber(item.quantity) * safeNumber(item.pricePerQuantity);
      return originalTotal * (1 - pwdSeniorDiscountRate);
    }

    return safeNumber(item.quantity) * safeNumber(item.pricePerQuantity);
  };

  // Calculate original item total price
  const calculateItemTotalPrice = (item) => {
    if (!item) return 0;
    return safeNumber(item.quantity) * safeNumber(item.pricePerQuantity);
  };

  // Calculate discount amount for an item
  const calculateItemDiscountAmount = (item) => {
    if (!item) return 0;

    if (item.isRedeemed) {
      return safeNumber(item.quantity) * safeNumber(item.pricePerQuantity);
    }

    const isDiscounted = pwdSeniorDiscountItems.some(
      (discountedItem) => getItemKey(discountedItem) === getItemKey(item)
    );

    if (isDiscounted) {
      const originalTotal =
        safeNumber(item.quantity) * safeNumber(item.pricePerQuantity);
      return originalTotal * pwdSeniorDiscountRate;
    }

    return 0;
  };

  // Generate unique key for each cart item
  const getUniqueKey = (item, index) => {
    if (!item) return `item-${index}`;
    return `${item.id || "unknown"}-${index}-${item.quantity || 0}-${
      item.pricePerQuantity || 0
    }-${item.isRedeemed || false}-${getItemTag(item)}`;
  };

  // Quantity handlers
  const handleIncrement = (itemId) => {
    if (!currentOrder || !itemId) return;
    dispatch(incrementQuantityInOrder({ orderId: currentOrder.id, itemId }));
  };

  const handleDecrement = (itemId) => {
    if (!currentOrder || !itemId) return;
    dispatch(decrementQuantityInOrder({ orderId: currentOrder.id, itemId }));
  };

  // Individual redeem handler
  const handleRedeemItem = (itemId, itemName) => {
    if (!currentOrder || !itemId) return;
    dispatch(redeemItemInOrder({ orderId: currentOrder.id, itemId }));
    setShowRedeemOptions(false);
    enqueueSnackbar(`${itemName || "Item"} redeemed for free!`, {
      variant: "success",
    });
  };

  // Remove redemption handler
  const handleRemoveRedemption = () => {
    if (!currentOrder) return;
    dispatch(removeRedemptionFromOrder({ orderId: currentOrder.id }));
    setShowRedeemOptions(false);
    enqueueSnackbar("Redemption removed!", { variant: "info" });
  };

  // Check if any item is redeemed
  const hasRedeemedItem = combinedCart.some((item) => item && item.isRedeemed);

  // Get discounted items info for display
  const getDiscountedItemsInfo = () => {
    if (!pwdSeniorDiscountApplied || totals.pwdSeniorDiscountAmount === 0)
      return null;

    const drinkCount = pwdSeniorDiscountItems.filter((item) =>
      isDrinkItem(item)
    ).length;

    const foodCount = pwdSeniorDiscountItems.filter((item) =>
      isFoodItem(item)
    ).length;

    let info = "PWD/Senior Discount (20% on selected items)";

    if (drinkCount === 1 && foodCount === 2) {
      info = "PWD/Senior Discount (20% – 1 drink + 2 food)";
    } else if (drinkCount === 1 && foodCount === 1) {
      info = "PWD/Senior Discount (20% – 1 drink + 1 food)";
    } else if (drinkCount === 1) {
      info = "PWD/Senior Discount (20% – 1 drink)";
    } else if (foodCount === 2) {
      info = "PWD/Senior Discount (20% – 2 food items)";
    } else if (foodCount === 1) {
      info = "PWD/Senior Discount (20% – 1 food item)";
    }

    const discountAmount = totals.pwdSeniorDiscountAmount.toFixed(2);
    return `${info} (-₱${discountAmount})`;
  };

  const discountedItemsInfo = getDiscountedItemsInfo();

  // ✅ ADDED: Handle custom discount
  const handleCustomDiscount = () => {
    if (!customDiscountApplied) {
      setShowCustomDiscountModal(true);
    } else {
      setCustomDiscountApplied(false);
      setCustomDiscountAmount(0);
      setCustomDiscountValue(0);
      setCustomDiscountReason("");
      setCustomDiscountType("percentage");
      enqueueSnackbar("Custom discount removed", { variant: "info" });
    }
  };

  // ✅ ADDED: Apply custom discount
  const handleApplyCustomDiscount = () => {
    if (customDiscountValue <= 0) {
      enqueueSnackbar("Please enter a valid discount value", {
        variant: "warning",
      });
      return;
    }

    if (customDiscountType === "percentage" && customDiscountValue > 100) {
      enqueueSnackbar("Percentage discount cannot exceed 100%", {
        variant: "warning",
      });
      return;
    }

    // Calculate current subtotal for validation
    const subtotalAfterPwdSeniorAndRedemption =
      totals.baseGrossTotal -
      totals.pwdSeniorDiscountAmount -
      totals.redemptionAmount;

    let calculatedDiscount = 0;

    if (customDiscountType === "percentage") {
      calculatedDiscount =
        (subtotalAfterPwdSeniorAndRedemption * customDiscountValue) / 100;
    } else {
      // Fixed amount
      calculatedDiscount = customDiscountValue;

      // Check if fixed discount exceeds subtotal
      if (calculatedDiscount > subtotalAfterPwdSeniorAndRedemption) {
        enqueueSnackbar(
          `Fixed discount (₱${calculatedDiscount.toFixed(
            2
          )}) cannot exceed subtotal (₱${subtotalAfterPwdSeniorAndRedemption.toFixed(
            2
          )})`,
          { variant: "warning" }
        );
        return;
      }
    }

    if (calculatedDiscount <= 0) {
      enqueueSnackbar("Invalid discount amount", { variant: "warning" });
      return;
    }

    setCustomDiscountAmount(calculatedDiscount);
    setCustomDiscountApplied(true);
    setShowCustomDiscountModal(false);

    // Clear other discount types when applying custom discount
    setPwdSeniorDiscountApplied(false);
    setPwdSeniorDiscountItems([]);
    setEmployeeDiscountApplied(false);
    setShareholderDiscountApplied(false);

    const reasonText = customDiscountReason
      ? ` for ${customDiscountReason}`
      : "";
    const typeText =
      customDiscountType === "percentage"
        ? `${customDiscountValue}%`
        : `₱${customDiscountValue.toFixed(2)}`;

    enqueueSnackbar(
      `Custom discount of ${typeText} applied${reasonText} (-₱${calculatedDiscount.toFixed(
        2
      )})`,
      { variant: "success" }
    );
  };

  // ✅ ADDED: Cancel custom discount modal
  const handleCancelCustomDiscount = () => {
    setShowCustomDiscountModal(false);
    setCustomDiscountValue(0);
    setCustomDiscountReason("");
    setCustomDiscountType("percentage");
  };

  // Handle PWD/Senior discount
  const handlePwdSeniorDiscount = () => {
    if (!pwdSeniorDiscountApplied) {
      setShowPwdSeniorSelection(true);
    } else {
      setPwdSeniorDiscountApplied(false);
      setPwdSeniorDiscountItems([]);
      setPwdSeniorDetails({ name: "", idNumber: "", type: "PWD" });
      setEmployeeDiscountApplied(false);
      setShareholderDiscountApplied(false);
      setCustomDiscountApplied(false); // Clear custom discount too
      enqueueSnackbar("PWD/Senior discount removed", { variant: "info" });
    }
  };

  const handleEmployeeDiscount = () => {
    setEmployeeDiscountApplied(!employeeDiscountApplied);
    setPwdSeniorDiscountApplied(false);
    setPwdSeniorDiscountItems([]);
    setPwdSeniorDetails({ name: "", idNumber: "", type: "PWD" });
    setShareholderDiscountApplied(false);
    setCustomDiscountApplied(false); // Clear custom discount too
  };

  const handleShareholderDiscount = () => {
    setShareholderDiscountApplied(!shareholderDiscountApplied);
    setPwdSeniorDiscountApplied(false);
    setPwdSeniorDiscountItems([]);
    setPwdSeniorDetails({ name: "", idNumber: "", type: "PWD" });
    setEmployeeDiscountApplied(false);
    setCustomDiscountApplied(false); // Clear custom discount too
  };

  // ✅ FIXED: Get all eligible items for PWD/Senior discount - NOW PROPERLY SEPARATED
  const getEligibleItemsForDiscount = () => {
    const eligibleItems = combinedCart.filter((item) => {
      if (!item) return false;

      // Items that are already redeemed cannot be discounted
      if (item.isRedeemed) return false;

      const isDrink = isDrinkItem(item);
      const isFood = isFoodItem(item);

      // Only food and drink items are eligible
      return isFood || isDrink;
    });

    return eligibleItems;
  };

  // ✅ FIXED: Get eligible items by type - NOW PROPERLY SEPARATED
  const getEligibleItemsByType = () => {
    const eligibleItems = getEligibleItemsForDiscount();
    const drinks = eligibleItems.filter((item) => isDrinkItem(item));
    const foods = eligibleItems.filter((item) => isFoodItem(item));

    return { drinks, foods };
  };

  // Toggle item selection in modal
  const toggleItemSelection = (item) => {
    if (!item) return;

    const itemKey = getItemKey(item);
    const isSelected = pwdSeniorDiscountItems.some(
      (selected) => getItemKey(selected) === itemKey
    );

    if (isSelected) {
      // Remove item if already selected
      setPwdSeniorDiscountItems(
        pwdSeniorDiscountItems.filter(
          (selected) => getItemKey(selected) !== itemKey
        )
      );
    } else {
      // Check selection limits before adding
      const selectedDrinks = pwdSeniorDiscountItems.filter((item) =>
        isDrinkItem(item)
      ).length;
      const selectedFoods = pwdSeniorDiscountItems.filter((item) =>
        isFoodItem(item)
      ).length;
      const isDrink = isDrinkItem(item);
      const isFood = isFoodItem(item);

      // ✅ FIXED: Strictly enforce 1 drink + 2 food rule
      if (isDrink && selectedDrinks >= 1) {
        enqueueSnackbar(
          "Maximum 1 drink can be selected for PWD/Senior discount",
          { variant: "warning" }
        );
        return;
      }

      if (isFood && selectedFoods >= 2) {
        enqueueSnackbar(
          "Maximum 2 food items can be selected for PWD/Senior discount",
          { variant: "warning" }
        );
        return;
      }

      // Total items limit (1 drink + 2 food = 3 items max)
      if (pwdSeniorDiscountItems.length >= 3) {
        enqueueSnackbar(
          "Maximum 3 items can be selected for PWD/Senior discount (1 drink + 2 food)",
          { variant: "warning" }
        );
        return;
      }

      if (!isDrink && !isFood) {
        enqueueSnackbar(
          "Only drinks and food items are eligible for PWD/Senior discount",
          { variant: "warning" }
        );
        return;
      }

      // Add item to selection
      setPwdSeniorDiscountItems([...pwdSeniorDiscountItems, item]);
    }
  };

  // Apply the selection with PWD/Senior details
  const handleApplyPwdSeniorSelection = () => {
    if (pwdSeniorDiscountItems.length === 0) {
      enqueueSnackbar("Please select at least 1 item for PWD/Senior discount", {
        variant: "warning",
      });
      return;
    }

    // ✅ FIXED: Check selection composition
    const selectedDrinks = pwdSeniorDiscountItems.filter((item) =>
      isDrinkItem(item)
    ).length;
    const selectedFoods = pwdSeniorDiscountItems.filter((item) =>
      isFoodItem(item)
    ).length;

    // Check if we have at least 1 drink or 1 food item
    if (selectedDrinks === 0 && selectedFoods === 0) {
      enqueueSnackbar("Please select at least 1 food or drink item", {
        variant: "warning",
      });
      return;
    }

    // Warn if not following 1 drink + 2 food pattern
    if (selectedDrinks > 1 || selectedFoods > 2) {
      enqueueSnackbar(
        "For maximum discount, select 1 drink and 2 food items (total 3 items)",
        { variant: "info" }
      );
    }

    if (!pwdSeniorDetails.name.trim()) {
      enqueueSnackbar("Please enter PWD/Senior holder name", {
        variant: "warning",
      });
      return;
    }

    if (!pwdSeniorDetails.idNumber.trim()) {
      enqueueSnackbar("Please enter PWD/Senior ID number", {
        variant: "warning",
      });
      return;
    }

    setPwdSeniorDiscountApplied(true);
    setEmployeeDiscountApplied(false);
    setShareholderDiscountApplied(false);
    setCustomDiscountApplied(false); // Clear custom discount too
    setShowPwdSeniorSelection(false);

    const selectedValue = pwdSeniorDiscountItems.reduce(
      (sum, item) => sum + calculateItemTotalPrice(item),
      0
    );

    const discountAmount = selectedValue * pwdSeniorDiscountRate;

    const drinks = pwdSeniorDiscountItems.filter((item) => isDrinkItem(item));
    const foods = pwdSeniorDiscountItems.filter((item) => isFoodItem(item));

    let message = "";
    if (drinks.length === 1 && foods.length === 2) {
      message = `PWD/Senior discount applied to 1 drink and 2 food items (-₱${discountAmount.toFixed(
        2
      )})`;
    } else if (drinks.length === 1 && foods.length === 1) {
      message = `PWD/Senior discount applied to 1 drink and 1 food item (-₱${discountAmount.toFixed(
        2
      )})`;
    } else if (drinks.length === 1) {
      message = `PWD/Senior discount applied to 1 drink (-₱${discountAmount.toFixed(
        2
      )})`;
    } else if (foods.length === 2) {
      message = `PWD/Senior discount applied to 2 food items (-₱${discountAmount.toFixed(
        2
      )})`;
    } else if (foods.length === 1) {
      message = `PWD/Senior discount applied to 1 food item (-₱${discountAmount.toFixed(
        2
      )})`;
    } else {
      message = `PWD/Senior discount applied to ${
        pwdSeniorDiscountItems.length
      } item(s) (-₱${discountAmount.toFixed(2)})`;
    }

    message += ` for ${pwdSeniorDetails.type}: ${pwdSeniorDetails.name}`;

    enqueueSnackbar(message, { variant: "success" });
  };

  // Cancel selection
  const handleCancelPwdSeniorSelection = () => {
    setShowPwdSeniorSelection(false);
    setPwdSeniorDiscountItems([]);
    setActiveCategory("drinks");
  };

  // Clear PWD/Senior discount
  const clearPwdSeniorDiscount = () => {
    setPwdSeniorDiscountApplied(false);
    setPwdSeniorDiscountItems([]);
    setPwdSeniorDetails({ name: "", idNumber: "", type: "PWD" });
    enqueueSnackbar("PWD/Senior discount removed", { variant: "info" });
  };

  // Handle PWD/Senior details change
  const handlePwdSeniorDetailsChange = (e) => {
    const { name, value } = e.target;
    setPwdSeniorDetails((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle customer type change
  const handleCustomerTypeChange = (type) => {
    setCustomerType(type);
    enqueueSnackbar(
      `Customer type set to ${type === "walk-in" ? "Walk-in" : "Take-out"}`,
      { variant: "info" }
    );
  };

  // Handle customer phone input
  const handlePhoneChange = (e) => {
    setCustomerPhone(e.target.value);
  };

  // ✅ FIXED: Handle cash payment selection
  const handleCashPayment = () => {
    setPaymentMethod("Cash");
    setCashAmount(0);
    setMixedPayment({
      isMixed: false,
      cashAmount: 0,
      onlineAmount: 0,
      onlineMethod: null,
    });
    setShowCashModal(true);
  };

  // ✅ FIXED: Handle online payment selection
  const handleOnlinePaymentSelect = (method) => {
    setPaymentMethod(method);
    setCashAmount(0);
    setMixedPayment({
      isMixed: false,
      cashAmount: 0,
      onlineAmount: totals.total,
      onlineMethod: method,
    });
    setShowOnlineOptions(false);
    enqueueSnackbar(`Full payment via ${method}: ₱${totals.total.toFixed(2)}`, {
      variant: "success",
    });
  };

  // ✅ FIXED: Handle mixed payment selection
  const handleMixedPaymentSelect = () => {
    if (cashAmount > 0) {
      setMixedPayment({
        isMixed: true,
        cashAmount: cashAmount,
        onlineAmount: Math.max(0, totals.total - cashAmount),
        onlineMethod: null,
      });
    } else {
      setMixedPayment({
        isMixed: true,
        cashAmount: 0,
        onlineAmount: totals.total,
        onlineMethod: null,
      });
    }
    setShowMixedPaymentModal(true);
  };

  // ✅ FIXED: Handle mixed payment confirmation
  const handleMixedPaymentConfirm = () => {
    const cashAmountNum = safeNumber(mixedPayment.cashAmount);
    const onlineAmountNum = safeNumber(mixedPayment.onlineAmount);
    const totalPaid = cashAmountNum + onlineAmountNum;

    if (totalPaid < totals.total) {
      const remaining = totals.total - totalPaid;
      const confirm = window.confirm(
        `Total payment (₱${totalPaid.toFixed(
          2
        )}) is less than order total (₱${totals.total.toFixed(
          2
        )}). Remaining balance: ₱${remaining.toFixed(
          2
        )}\n\nProceed with partial payment?`
      );
      if (!confirm) return;
    }

    setPaymentMethod("Mixed");
    setCashAmount(cashAmountNum);
    setShowMixedPaymentModal(false);
    setShowCashModal(false);

    let message = `Mixed payment: ₱${cashAmountNum.toFixed(2)} Cash`;
    if (mixedPayment.onlineMethod) {
      message += ` + ₱${onlineAmountNum.toFixed(2)} ${
        mixedPayment.onlineMethod
      }`;
    }
    if (totalPaid < totals.total) {
      message += ` (Partial Payment - Balance: ₱${(
        totals.total - totalPaid
      ).toFixed(2)})`;
    }

    enqueueSnackbar(message, { variant: "success" });
  };

  // Handle denomination button click
  const handleDenominationClick = (amount) => {
    setCashAmount((prev) => safeNumber(prev) + amount);
  };

  // Handle cash amount change for mixed payment
  const handleMixedPaymentCashChange = (e) => {
    const newCashAmount = safeNumber(e.target.value);
    setCashAmount(newCashAmount);

    const remaining = Math.max(0, totals.total - newCashAmount);
    setMixedPayment((prev) => ({
      ...prev,
      cashAmount: newCashAmount,
      onlineAmount: remaining,
      isMixed: true,
    }));
  };

  // Generate unique order number
  const generateOrderNumber = () => {
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 1000);
    return `ORD-${timestamp}-${randomSuffix}`;
  };

  // ✅ FIXED: Prepare order data with correct category values and always completed status
  const prepareOrderData = () => {
    // Determine payment details
    let paymentMethodValue = "Cash";
    let cashPaymentAmount = safeNumber(cashAmount);
    let onlinePaymentAmount = 0;
    let onlinePaymentMethod = null;
    let isMixedPayment = false;

    // Calculate totals
    const totalPaid = cashPaymentAmount + onlinePaymentAmount;
    const isPartialPayment = totalPaid < totals.total;
    const remainingBalance = isPartialPayment ? totals.total - totalPaid : 0;

    // Set payment method based on selection
    if (paymentMethod === "Cash") {
      paymentMethodValue = "Cash";
    } else if (paymentMethod === "BDO") {
      paymentMethodValue = "BDO";
      onlinePaymentAmount = totals.total;
      onlinePaymentMethod = "BDO";
      cashPaymentAmount = 0;
    } else if (paymentMethod === "GCASH") {
      paymentMethodValue = "GCASH";
      onlinePaymentAmount = totals.total;
      onlinePaymentMethod = "GCASH";
      cashPaymentAmount = 0;
    } else if (paymentMethod === "Mixed") {
      paymentMethodValue = "Mixed";
      isMixedPayment = true;
      onlinePaymentAmount = safeNumber(mixedPayment.onlineAmount);
      onlinePaymentMethod = mixedPayment.onlineMethod;
      cashPaymentAmount = safeNumber(mixedPayment.cashAmount);
    }

    // ✅ FIXED: Always set status to "completed" after placing order
    const paymentStatusValue = "completed"; // Always completed
    const orderStatusValue = "completed"; // Always completed

    // Prepare bills data - UPDATED to include custom discount
    const bills = {
      total: Number(totals.baseGrossTotal.toFixed(2)),
      tax: Number(totals.vatAmount.toFixed(2)),
      totalWithTax: Number(totals.total.toFixed(2)),
      discount: Number(totals.totalDiscountAmount.toFixed(2)),
      pwdSeniorDiscount: Number(totals.pwdSeniorDiscountAmount.toFixed(2)),
      pwdSeniorDiscountedValue: Number(totals.discountedItemsTotal.toFixed(2)),
      employeeDiscount: Number(totals.employeeDiscountAmount.toFixed(2)),
      shareholderDiscount: Number(totals.shareholderDiscountAmount.toFixed(2)),
      redemptionDiscount: Number(totals.redemptionAmount.toFixed(2)),
      customDiscount: Number(totals.customDiscountAmount.toFixed(2)), // ✅ Added custom discount
      customDiscountType: customDiscountApplied ? customDiscountType : null, // ✅ Added custom discount type
      customDiscountValue: customDiscountApplied ? customDiscountValue : 0, // ✅ Added custom discount value
      customDiscountReason: customDiscountApplied ? customDiscountReason : null, // ✅ Added custom discount reason
      netSales: Number(totals.netSales.toFixed(2)),
      cashAmount: Number(cashPaymentAmount.toFixed(2)),
      onlineAmount: Number(onlinePaymentAmount.toFixed(2)),
      onlineMethod: onlinePaymentMethod,
      change: Number(totals.change.toFixed(2)),
      isPartialPayment: isPartialPayment,
      remainingBalance: Number(remainingBalance.toFixed(2)),
      amountPaid: Number(totalPaid.toFixed(2)),
    };

    // Prepare items data - FIXED: Only use 'drink' or 'food' for category
    const items = cartData
      .map((item) => {
        if (!item) return null;

        const isPwdSeniorDiscounted = pwdSeniorDiscountItems.some(
          (discountedItem) => getItemKey(discountedItem) === getItemKey(item)
        );

        // ✅ FIXED: Determine category correctly - only 'drink' or 'food'
        let category = getItemTag(item); // Use the tag: 'food' or 'drink'

        return {
          name: item.name || "Unknown Item",
          quantity: safeNumber(item.quantity),
          pricePerQuantity: safeNumber(item.pricePerQuantity),
          price: calculateItemTotal(item),
          originalPrice: safeNumber(item.pricePerQuantity),
          isRedeemed: Boolean(item.isRedeemed),
          isPwdSeniorDiscounted: isPwdSeniorDiscounted,
          category: category, // ✅ Will only be 'drink' or 'food'
          tag: getItemTag(item), // ✅ Added tag field
          id: item.id || Date.now().toString(),
        };
      })
      .filter((item) => item !== null);

    // Prepare customer details
    const customerName =
      customerType === "walk-in" ? "Walk-in Customer" : "Take-out Customer";

    // Use customer phone if provided, otherwise use "0000000000"
    const customerPhoneValue = customerPhone.trim() || "0000000000";

    // Get user ID
    let userId = user?._id;
    if (!userId || userId === "000000000000000000000001") {
      try {
        const token = localStorage.getItem("authToken");
        if (token) {
          const payload = JSON.parse(atob(token.split(".")[1]));
          userId = payload?._id || payload?.userId || payload?.id;
        }
      } catch (error) {
        console.error("Error extracting user ID from token:", error);
      }
    }

    const orderIdValue = currentOrder?.id || `order-${Date.now()}`;
    const orderNumber = generateOrderNumber();

    // ✅ FIXED: Prepare pwdSeniorSelectedItems with correct category
    const pwdSeniorSelectedItems = pwdSeniorDiscountApplied
      ? pwdSeniorDiscountItems.map((item) => {
          const category = getItemTag(item);
          return {
            ...item,
            category: category,
            quantity: safeNumber(item.quantity),
            pricePerQuantity: safeNumber(item.pricePerQuantity),
            tag: getItemTag(item), // ✅ Added tag field
          };
        })
      : [];

    return {
      customerDetails: {
        name: customerName,
        phone: customerPhoneValue,
        email: "",
        address: "",
        guests: 1,
      },
      customerType: customerType,
      customerStatus: customerType === "walk-in" ? "Dine-in" : "Take-out",
      items,
      bills,
      paymentMethod: paymentMethodValue,
      paymentDetails: {
        cashAmount: cashPaymentAmount,
        onlineAmount: onlinePaymentAmount,
        onlineMethod: onlinePaymentMethod,
        isMixedPayment: isMixedPayment,
        isPartialPayment: isPartialPayment,
        remainingBalance: remainingBalance,
        paymentMethodDisplay: getPaymentMethodDisplay(
          paymentMethodValue,
          mixedPayment
        ),
      },
      paymentStatus: paymentStatusValue, // ✅ Always "completed"
      orderStatus: orderStatusValue, // ✅ Always "completed"
      pwdSeniorDetails: pwdSeniorDiscountApplied ? pwdSeniorDetails : null,
      pwdSeniorDiscountApplied: pwdSeniorDiscountApplied,
      pwdSeniorSelectedItems: pwdSeniorSelectedItems, // ✅ Fixed category values
      customDiscountApplied: customDiscountApplied, // ✅ Added custom discount flag
      customDiscountDetails: customDiscountApplied
        ? {
            type: customDiscountType,
            value: customDiscountValue,
            amount: totals.customDiscountAmount,
            reason: customDiscountReason,
          }
        : null, // ✅ Added custom discount details
      cashier: user?.name || "Admin",
      user: userId || "000000000000000000000001",
      orderNumber: orderNumber,
      totalAmount: Number(totals.total.toFixed(2)),
      cashAmount: Number(cashPaymentAmount.toFixed(2)),
      onlineAmount: Number(onlinePaymentAmount.toFixed(2)),
      change: Number(totals.change.toFixed(2)),
      orderId: orderIdValue,
      isPartialPayment: isPartialPayment,
      remainingBalance: Number(remainingBalance.toFixed(2)),
      amountPaid: Number(totalPaid.toFixed(2)),
      table: null,
    };
  };

  // Helper function to get payment method display text
  const getPaymentMethodDisplay = (method, mixedPayment) => {
    if (method === "Mixed" && mixedPayment.onlineMethod) {
      return `Mixed (Cash + ${mixedPayment.onlineMethod})`;
    }
    return method;
  };

  // Generate invoice data for display
  const generateInvoiceData = (orderData, backendData) => {
    const invoiceItems = combinedCart
      .map((item) => {
        if (!item) return null;

        const isDiscounted = pwdSeniorDiscountItems.some(
          (discountedItem) => getItemKey(discountedItem) === getItemKey(item)
        );

        return {
          name: item.name,
          quantity: item.quantity,
          price: calculateItemTotal(item),
          originalPrice: safeNumber(item.pricePerQuantity),
          pricePerQuantity: safeNumber(item.pricePerQuantity),
          isFree: item.isRedeemed || false,
          isPwdSeniorDiscounted: isDiscounted,
          tag: getItemTag(item), // ✅ Added tag field
        };
      })
      .filter((item) => item !== null);

    return {
      ...orderData,
      id: backendData?._id || currentOrder?.id || orderData.orderId,
      number: backendData?.orderNumber || orderData.orderNumber,
      items: invoiceItems,
      customer: {
        customerName: orderData.customerDetails.name,
        ...currentOrder?.customer,
      },
      bills: {
        ...orderData.bills,
        netSales: totals.netSales,
      },
      orderStatus: orderData.orderStatus,
      orderDate: new Date().toISOString(),
      cashier: user?.name || "Admin",
      orderNumber: backendData?.orderNumber || orderData.orderNumber,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      paymentMethod: orderData.paymentDetails.paymentMethodDisplay,
      isPartialPayment: orderData.isPartialPayment,
      remainingBalance: orderData.remainingBalance,
      table: null,
    };
  };

  // ✅ FIXED: Handle cash amount submission
  const handleCashSubmit = () => {
    const cashAmountNum = safeNumber(cashAmount);

    if (cashAmountNum <= 0) {
      enqueueSnackbar("Please enter a valid cash amount", {
        variant: "error",
      });
      return;
    }

    if (cashAmountNum >= totals.total) {
      // Full cash payment
      setPaymentMethod("Cash");
      setShowCashModal(false);
      enqueueSnackbar(`Full cash payment: ₱${cashAmountNum.toFixed(2)}`, {
        variant: "success",
      });
    } else {
      // Partial cash payment - offer mixed payment
      const remaining = totals.total - cashAmountNum;
      setMixedPayment({
        cashAmount: cashAmountNum,
        onlineAmount: remaining,
        onlineMethod: null,
        isMixed: true,
      });
      setShowMixedPaymentModal(true);
      setShowCashModal(false);
      enqueueSnackbar(
        `Partial cash payment: ₱${cashAmountNum.toFixed(
          2
        )}. Please complete payment online.`,
        { variant: "info" }
      );
    }
  };

  // ✅ FIXED: Order mutation
  const orderMutation = useMutation({
    mutationFn: (reqData) => {
      console.log(
        "📤 Sending order to backend:",
        JSON.stringify(reqData, null, 2)
      );
      return addOrder(reqData);
    },
    onSuccess: async (res) => {
      console.log("✅ Order success response:", res);

      if (!res || !res.data) {
        throw new Error("Invalid response from server");
      }

      const { data } = res.data;

      // Generate order data
      const orderData = prepareOrderData();

      // Mark current order as processed
      if (currentOrder) {
        setProcessedOrders((prev) => new Set(prev).add(currentOrder.id));

        console.log("✅ Completing order in Redux with order data");
        dispatch(
          completeOrder({
            orderId: currentOrder.id,
            orderData: {
              ...orderData,
              _id: data._id || orderData._id,
              orderNumber: data.orderNumber || orderData.orderNumber,
              bills: data.bills || orderData.bills,
            },
          })
        );
      }

      // Clear current order
      dispatch(clearCurrentOrder());

      enqueueSnackbar("Order placed successfully! Invoice is ready.", {
        variant: "success",
      });

      setIsProcessing(false);

      // ✅ FIXED: Generate invoice data and show Invoice component - This is the key fix
      const invoiceData = generateInvoiceData(orderData, data);
      setInvoiceData(invoiceData);

      // ✅ FIXED: Delay showing invoice to ensure state is updated
      setTimeout(() => {
        setShowInvoice(true);
      }, 100);
    },
    onError: (error) => {
      console.error("❌ Order placement error:", error);

      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to place order. Please try again.";

      enqueueSnackbar(errorMessage, { variant: "error" });
      setIsProcessing(false);

      // Reset order status on error
      if (currentOrder) {
        dispatch(resetOrderStatus(currentOrder.id));
      }
    },
  });

  // ✅ FIXED: Main handlePlaceOrder function
  const handlePlaceOrder = async () => {
    if (isProcessing) return;

    console.log("Starting order placement...");

    // Basic validation
    if (!paymentMethod) {
      enqueueSnackbar("Please select a payment method!", {
        variant: "warning",
      });
      return;
    }

    if (!cartData || cartData.length === 0) {
      enqueueSnackbar("Cart is empty!", { variant: "warning" });
      return;
    }

    // Validate total amount
    if (totals.total <= 0) {
      enqueueSnackbar("Invalid order total. Please check your items.", {
        variant: "error",
      });
      return;
    }

    // Validate PWD/Senior discount if applied
    if (pwdSeniorDiscountApplied) {
      if (!pwdSeniorDetails.name.trim()) {
        enqueueSnackbar("Please enter PWD/Senior holder name", {
          variant: "error",
        });
        return;
      }
      if (!pwdSeniorDetails.idNumber.trim()) {
        enqueueSnackbar("Please enter PWD/Senior ID number", {
          variant: "error",
        });
        return;
      }
    }

    // Check if payment is sufficient
    const totalPaid = totals.cashAmount + totals.onlineAmount;
    if (totalPaid < totals.total) {
      const confirm = window.confirm(
        `Total payment (₱${totalPaid.toFixed(
          2
        )}) is less than order total (₱${totals.total.toFixed(
          2
        )}). Remaining balance: ₱${(totals.total - totalPaid).toFixed(
          2
        )}\n\nProceed with partial payment?`
      );
      if (!confirm) return;
    }

    setIsProcessing(true);

    // MARK ORDER AS PROCESSING FIRST
    if (currentOrder) {
      console.log("Dispatching processOrder for:", currentOrder.id);
      dispatch(processOrder(currentOrder.id));
    }

    const orderData = prepareOrderData();
    console.log("📦 Sending order data:", JSON.stringify(orderData, null, 2));

    // Submit order
    orderMutation.mutate(orderData);
  };

  // Handle cancel in cash modal
  const handleCancelCashModal = () => {
    setShowCashModal(false);
  };

  // Handle redeem button click
  const handleShowRedeemOptions = () => {
    if (combinedCart.length === 0) {
      enqueueSnackbar("Cart is empty!", { variant: "warning" });
      return;
    }
    setShowRedeemOptions(true);
  };

  // Cancel redeem selection
  const handleCancelRedeem = () => {
    setShowRedeemOptions(false);
  };

  // ✅ FIXED: Handle invoice close - auto go to next order
  const handleCloseInvoice = () => {
    setShowInvoice(false);
    setInvoiceData(null);

    // Reset all states for next order
    setPwdSeniorDiscountApplied(false);
    setEmployeeDiscountApplied(false);
    setShareholderDiscountApplied(false);
    setCustomDiscountApplied(false); // ✅ Reset custom discount
    setCustomDiscountAmount(0);
    setCustomDiscountValue(0);
    setCustomDiscountReason("");
    setCustomDiscountType("percentage");
    setPaymentMethod(null);
    setShowRedeemOptions(false);
    setPwdSeniorDiscountItems([]);
    setShowPwdSeniorSelection(false);
    setPwdSeniorDetails({
      name: "",
      idNumber: "",
      type: "PWD",
    });
    setCustomerType("walk-in");
    setCustomerPhone("");
    setCashAmount(0);
    setShowCashModal(false);
    setShowOnlineOptions(false);
    setMixedPayment({
      isMixed: false,
      cashAmount: 0,
      onlineAmount: 0,
      onlineMethod: null,
    });
    setShowMixedPaymentModal(false);
    setShowCustomDiscountModal(false); // ✅ Reset custom discount modal
    setActiveCategory("drinks");
    setIsProcessing(false);
    setShowNextOrderConfirm(false);

    // Check if there's a next order
    if (nextOrder && !processedOrders.has(nextOrder.id)) {
      // Set the next order as active
      dispatch(setActiveOrder(nextOrder.id));
      enqueueSnackbar(`Now working on Order ${nextOrder.number}`, {
        variant: "info",
      });
    } else {
      // Try to find any other pending order
      const pendingOrders = getAllPendingOrders();
      const nextPendingOrder = pendingOrders.find(
        (order) =>
          !processedOrders.has(order.id) && order.id !== currentOrder?.id
      );

      if (nextPendingOrder) {
        dispatch(setActiveOrder(nextPendingOrder.id));
        enqueueSnackbar(`Now working on Order ${nextPendingOrder.number}`, {
          variant: "info",
        });
      } else {
        // No next order - show empty state
        enqueueSnackbar(
          "No more pending orders. Start a new order from menu.",
          {
            variant: "info",
          }
        );
      }
    }
  };

  // ✅ NEW: Handle go to next order directly
  const handleGoToNextOrder = () => {
    if (nextOrder && !processedOrders.has(nextOrder.id)) {
      dispatch(setActiveOrder(nextOrder.id));
      setShowNextOrderConfirm(false);
      enqueueSnackbar(`Now working on Order ${nextOrder.number}`, {
        variant: "info",
      });
    } else {
      enqueueSnackbar("Next order is already processed", {
        variant: "warning",
      });
      setShowNextOrderConfirm(false);
    }
  };

  // ✅ NEW: Pending orders counter
  const pendingOrderCount = pendingOrders.length;

  // ✅ FIXED: Get items for active category
  const getItemsForActiveCategory = () => {
    if (activeCategory === "drinks") {
      return getEligibleItemsForDiscount().filter((item) => isDrinkItem(item));
    } else if (activeCategory === "food") {
      return getEligibleItemsForDiscount().filter((item) => isFoodItem(item));
    }
    return [];
  };

  // ✅ FIXED: Main render logic
  if (!currentOrder && !showInvoice) {
    return (
      <div className="w-full h-screen overflow-y-auto bg-gray-100 px-4 py-6">
        <div className="max-w-[600px] mx-auto text-center">
          <div className="bg-white rounded-lg p-8 shadow-md">
            <div className="mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                  />
                </svg>
              </div>
              <h2 className="text-gray-900 text-xl font-semibold mb-2">
                {pendingOrderCount > 0
                  ? "Pending Orders Available"
                  : "No Active Order"}
              </h2>
              <p className="text-gray-500 text-sm mb-6">
                {pendingOrderCount > 0
                  ? `There are ${pendingOrderCount} pending order${
                      pendingOrderCount > 1 ? "s" : ""
                    }.`
                  : "Please select items from the menu to create an order."}
              </p>
              {pendingOrderCount > 0 && (
                <div className="mb-6">
                  <button
                    onClick={() => {
                      // Get the first pending order
                      const firstPendingOrder = pendingOrders[0];
                      dispatch(setActiveOrder(firstPendingOrder.id));
                      enqueueSnackbar(
                        `Now working on Order ${firstPendingOrder.number}`,
                        {
                          variant: "success",
                        }
                      );
                    }}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors"
                  >
                    Start First Pending Order
                  </button>
                </div>
              )}
              <div className="text-sm text-gray-600">
                <p className="mb-2">To start a new order:</p>
                <ol className="list-decimal list-inside space-y-1 text-left max-w-md mx-auto">
                  <li>Go to the menu section</li>
                  <li>Select items to add to cart</li>
                  <li>A new order will automatically appear here</li>
                </ol>
              </div>
            </div>
            <button
              onClick={() => navigate("/menu")}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors"
            >
              Go to Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ✅ FIXED: Invoice Component - Now properly pops up */}
      {showInvoice && invoiceData && (
        <div className="fixed inset-0 z-[9999] bg-black bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-fadeIn">
            <div className="relative">
              <button
                onClick={handleCloseInvoice}
                className="absolute top-4 right-4 z-10 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg hover:shadow-xl"
              >
                ✕
              </button>
              <div className="max-h-[85vh] overflow-y-auto">
                <Invoice
                  key={Date.now()}
                  orderInfo={invoiceData}
                  setShowInvoice={handleCloseInvoice}
                  disableAutoPrint={false}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ ADDED: Custom Discount Modal */}
      {showCustomDiscountModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">
              Apply Custom Discount
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Discount Type
              </label>
              <div className="flex gap-3 mb-4">
                <button
                  onClick={() => setCustomDiscountType("percentage")}
                  className={`flex-1 px-4 py-3 rounded-lg font-semibold text-sm ${
                    customDiscountType === "percentage"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                  } transition-colors`}
                >
                  Percentage
                </button>
                <button
                  onClick={() => setCustomDiscountType("fixed")}
                  className={`flex-1 px-4 py-3 rounded-lg font-semibold text-sm ${
                    customDiscountType === "fixed"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                  } transition-colors`}
                >
                  Fixed Amount
                </button>
              </div>

              <label className="block text-sm font-medium text-gray-700 mb-2">
                {customDiscountType === "percentage"
                  ? "Discount Percentage (%)"
                  : "Discount Amount (₱)"}
              </label>
              <input
                type="number"
                value={customDiscountValue}
                onChange={(e) =>
                  setCustomDiscountValue(parseFloat(e.target.value) || 0)
                }
                className="w-full px-3 py-3 border border-gray-300 rounded-lg text-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none mb-4"
                placeholder={
                  customDiscountType === "percentage"
                    ? "Enter percentage"
                    : "Enter amount"
                }
                min="0"
                step={customDiscountType === "percentage" ? "0.1" : "0.01"}
                autoFocus
              />

              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason (Optional)
              </label>
              <input
                type="text"
                value={customDiscountReason}
                onChange={(e) => setCustomDiscountReason(e.target.value)}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none mb-4"
                placeholder="e.g., Staff discount, Promo, etc."
              />

              {/* Preview */}
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Discount Preview
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium text-gray-900">
                      ₱
                      {(
                        totals.baseGrossTotal -
                        totals.pwdSeniorDiscountAmount -
                        totals.redemptionAmount
                      ).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      {customDiscountType === "percentage"
                        ? `Discount (${customDiscountValue}%):`
                        : "Discount (Fixed):"}
                    </span>
                    <span className="font-bold text-red-600">
                      -₱
                      {customDiscountType === "percentage"
                        ? (
                            ((totals.baseGrossTotal -
                              totals.pwdSeniorDiscountAmount -
                              totals.redemptionAmount) *
                              customDiscountValue) /
                            100
                          ).toFixed(2)
                        : customDiscountValue.toFixed(2)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-gray-200">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700 font-medium">
                        New Subtotal:
                      </span>
                      <span className="font-bold text-green-600">
                        ₱
                        {(
                          totals.baseGrossTotal -
                          totals.pwdSeniorDiscountAmount -
                          totals.redemptionAmount -
                          (customDiscountType === "percentage"
                            ? ((totals.baseGrossTotal -
                                totals.pwdSeniorDiscountAmount -
                                totals.redemptionAmount) *
                                customDiscountValue) /
                              100
                            : customDiscountValue)
                        ).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-500">
                Note: Custom discount will replace any other discounts
                (PWD/Senior, Employee, VIP).
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCancelCustomDiscount}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyCustomDiscount}
                disabled={customDiscountValue <= 0}
                className={`flex-1 px-4 py-3 rounded-lg font-medium text-sm ${
                  customDiscountValue > 0
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-blue-300 text-white cursor-not-allowed"
                } transition-colors`}
              >
                Apply Discount
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ FIXED: PWD/Senior Selection Modal - Now properly separates drinks and food */}
      {showPwdSeniorSelection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg w-full max-w-6xl h-[90vh] max-h-[90vh] flex flex-col shadow-xl overflow-hidden">
            {/* Header */}
            <div className="p-4 sm:p-6 border-b">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                    Select Items for PWD/Senior Discount
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Select 1 drink + 2 food items (20% discount on selected
                    items)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                    <span className="font-bold">
                      {getEligibleItemsForDiscount().length}
                    </span>{" "}
                    eligible items
                  </div>
                  <div className="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">
                    <span className="font-bold">
                      {pwdSeniorDiscountItems.length}/3
                    </span>{" "}
                    selected
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content - Fixed layout with tabs */}
            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
              {/* Left Side - Form and Selection */}
              <div className="lg:w-1/2 xl:w-2/5 p-4 sm:p-6 border-r overflow-y-auto">
                {/* PWD/Senior Details Section */}
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">
                    PWD/Senior Details
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Holder Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={pwdSeniorDetails.name}
                        onChange={handlePwdSeniorDetailsChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                        placeholder="Enter full name"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        ID Number *
                      </label>
                      <input
                        type="text"
                        name="idNumber"
                        value={pwdSeniorDetails.idNumber}
                        onChange={handlePwdSeniorDetailsChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                        placeholder="Enter ID number"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Type
                    </label>
                    <div className="flex gap-3">
                      <button
                        onClick={() =>
                          setPwdSeniorDetails((prev) => ({
                            ...prev,
                            type: "PWD",
                          }))
                        }
                        className={`flex-1 px-4 py-3 rounded-lg font-medium text-sm transition-all ${
                          pwdSeniorDetails.type === "PWD"
                            ? "bg-blue-600 text-white shadow-md"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        PWD
                      </button>
                      <button
                        onClick={() =>
                          setPwdSeniorDetails((prev) => ({
                            ...prev,
                            type: "Senior",
                          }))
                        }
                        className={`flex-1 px-4 py-3 rounded-lg font-medium text-sm transition-all ${
                          pwdSeniorDetails.type === "Senior"
                            ? "bg-green-600 text-white shadow-md"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        Senior Citizen
                      </button>
                    </div>
                  </div>
                </div>

                {/* Selection Stats */}
                <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-100">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">
                    Selection Summary
                  </h4>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-white border-2 border-blue-200 rounded-full flex items-center justify-center mx-auto mb-2">
                        <span className="text-lg font-bold text-blue-600">
                          {pwdSeniorDiscountItems.length}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">Selected Items</p>
                      <p className="text-xs font-medium text-blue-700">
                        Max: 3
                      </p>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 bg-white border-2 border-green-200 rounded-full flex items-center justify-center mx-auto mb-2">
                        <span className="text-lg font-bold text-green-600">
                          {
                            pwdSeniorDiscountItems.filter((item) =>
                              isDrinkItem(item)
                            ).length
                          }
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">Drinks</p>
                      <p className="text-xs font-medium text-green-700">
                        Max: 1
                      </p>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 bg-white border-2 border-yellow-200 rounded-full flex items-center justify-center mx-auto mb-2">
                        <span className="text-lg font-bold text-yellow-600">
                          {
                            pwdSeniorDiscountItems.filter((item) =>
                              isFoodItem(item)
                            ).length
                          }
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">Food Items</p>
                      <p className="text-xs font-medium text-yellow-700">
                        Max: 2
                      </p>
                    </div>
                  </div>

                  {/* Selected Items List */}
                  {pwdSeniorDiscountItems.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-blue-100">
                      <h5 className="text-xs font-semibold text-gray-700 mb-2">
                        Selected Items:
                      </h5>
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {pwdSeniorDiscountItems.map((item, index) => (
                          <div
                            key={index}
                            className="flex justify-between items-center bg-white p-2 rounded border border-gray-200"
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-2 h-2 rounded-full ${
                                  isDrinkItem(item)
                                    ? "bg-blue-500"
                                    : "bg-green-500"
                                }`}
                              ></div>
                              <span className="text-xs text-gray-700 truncate max-w-[120px] sm:max-w-[150px]">
                                {item.name} (×{item.quantity})
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-gray-900">
                                ₱{calculateItemTotalPrice(item).toFixed(2)}
                              </span>
                              <span className="text-xs font-bold text-green-600">
                                -₱
                                {(
                                  calculateItemTotalPrice(item) *
                                  pwdSeniorDiscountRate
                                ).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                      {pwdSeniorDiscountItems.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-green-200">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-green-800">
                              Total Discount (20%):
                            </span>
                            <span className="text-lg font-bold text-green-800">
                              -₱
                              {(
                                pwdSeniorDiscountItems.reduce(
                                  (sum, item) =>
                                    sum + calculateItemTotalPrice(item),
                                  0
                                ) * pwdSeniorDiscountRate
                              ).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 mt-auto">
                  <button
                    onClick={handleCancelPwdSeniorSelection}
                    className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-300 transition-all duration-200 hover:shadow-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApplyPwdSeniorSelection}
                    className={`flex-1 px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 ${
                      pwdSeniorDiscountItems.length > 0 &&
                      pwdSeniorDetails.name.trim() &&
                      pwdSeniorDetails.idNumber.trim()
                        ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 hover:shadow-lg transform hover:-translate-y-0.5"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    }`}
                    disabled={
                      pwdSeniorDiscountItems.length === 0 ||
                      !pwdSeniorDetails.name.trim() ||
                      !pwdSeniorDetails.idNumber.trim()
                    }
                  >
                    {pwdSeniorDiscountItems.length > 0 ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        Apply Discount
                      </span>
                    ) : (
                      "Select Items"
                    )}
                  </button>
                </div>
              </div>

              {/* Right Side - Items List with Tabs */}
              <div className="lg:w-1/2 xl:w-3/5 p-4 sm:p-6 overflow-hidden flex flex-col">
                {/* Tabs for Drinks and Food */}
                <div className="mb-4">
                  <div className="flex border-b border-gray-200">
                    <button
                      onClick={() => setActiveCategory("drinks")}
                      className={`px-4 py-2 text-sm font-medium border-b-2 ${
                        activeCategory === "drinks"
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      Drinks
                      <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                        {
                          getEligibleItemsForDiscount().filter((item) =>
                            isDrinkItem(item)
                          ).length
                        }
                      </span>
                    </button>
                    <button
                      onClick={() => setActiveCategory("food")}
                      className={`px-4 py-2 text-sm font-medium border-b-2 ${
                        activeCategory === "food"
                          ? "border-green-500 text-green-600"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      Food Items
                      <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                        {
                          getEligibleItemsForDiscount().filter((item) =>
                            isFoodItem(item)
                          ).length
                        }
                      </span>
                    </button>
                  </div>
                </div>

                {/* Items Grid - Filtered by active category */}
                <div className="flex-1 overflow-y-auto">
                  {(() => {
                    const itemsToShow = getItemsForActiveCategory();

                    if (itemsToShow.length > 0) {
                      return (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3">
                          {itemsToShow.map((item, index) => {
                            if (!item) return null;

                            const isDrink = isDrinkItem(item);
                            const isFood = isFoodItem(item);
                            const isSelected = pwdSeniorDiscountItems.some(
                              (selected) =>
                                getItemKey(selected) === getItemKey(item)
                            );

                            // Check selection limits
                            const selectedDrinks =
                              pwdSeniorDiscountItems.filter((item) =>
                                isDrinkItem(item)
                              ).length;
                            const selectedFoods = pwdSeniorDiscountItems.filter(
                              (item) => isFoodItem(item)
                            ).length;

                            let canSelect = true;
                            let limitReached = false;

                            if (isSelected) {
                              canSelect = true; // Can always unselect
                            } else if (pwdSeniorDiscountItems.length >= 3) {
                              canSelect = false;
                              limitReached = true;
                            } else if (isDrink && selectedDrinks >= 1) {
                              canSelect = false;
                              limitReached = true;
                            } else if (isFood && selectedFoods >= 2) {
                              canSelect = false;
                              limitReached = true;
                            }

                            return (
                              <div
                                key={getUniqueKey(item, index)}
                                className={`relative p-4 border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
                                  isSelected
                                    ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-300 shadow-sm"
                                    : !canSelect && !isSelected
                                    ? "bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed"
                                    : "bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                                }`}
                                onClick={() =>
                                  canSelect && toggleItemSelection(item)
                                }
                              >
                                {/* Selection Indicator */}
                                <div className="absolute top-3 right-3">
                                  <div
                                    className={`w-6 h-6 border-2 rounded-full flex items-center justify-center ${
                                      isSelected
                                        ? "border-green-500 bg-green-500"
                                        : "border-gray-300"
                                    } ${
                                      !canSelect && !isSelected
                                        ? "border-gray-200"
                                        : ""
                                    }`}
                                  >
                                    {isSelected && (
                                      <svg
                                        className="w-3 h-3 text-white"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth="3"
                                          d="M5 13l4 4L19 7"
                                        />
                                      </svg>
                                    )}
                                  </div>
                                  {limitReached && !isSelected && (
                                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-white"></div>
                                  )}
                                </div>

                                {/* Item Content */}
                                <div className="pr-8">
                                  <div className="flex items-start justify-between mb-2">
                                    <h5 className="text-sm font-semibold text-gray-900 truncate pr-2">
                                      {item.name}
                                    </h5>
                                    <span
                                      className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${
                                        isDrink
                                          ? "bg-blue-100 text-blue-800 border border-blue-200"
                                          : "bg-green-100 text-green-800 border border-green-200"
                                      }`}
                                    >
                                      {isDrink ? "🍹 Drink" : "🍴 Food"}
                                    </span>
                                  </div>

                                  <div className="flex items-center justify-between mb-3">
                                    <div className="text-xs text-gray-500">
                                      <span className="font-medium">
                                        ₱
                                        {safeNumber(
                                          item.pricePerQuantity
                                        ).toFixed(2)}
                                      </span>
                                      <span className="mx-1">×</span>
                                      <span className="font-bold">
                                        {item.quantity}
                                      </span>
                                    </div>
                                    <div className="text-sm font-bold text-gray-900">
                                      ₱
                                      {calculateItemTotalPrice(item).toFixed(2)}
                                    </div>
                                  </div>

                                  {isSelected && (
                                    <div className="mt-2 pt-2 border-t border-green-200">
                                      <div className="flex justify-between items-center">
                                        <span className="text-xs text-green-600 font-medium">
                                          Discount (20%):
                                        </span>
                                        <span className="text-xs font-bold text-green-600">
                                          -₱
                                          {(
                                            calculateItemTotalPrice(item) *
                                            pwdSeniorDiscountRate
                                          ).toFixed(2)}
                                        </span>
                                      </div>
                                      <div className="flex justify-between items-center mt-1">
                                        <span className="text-xs text-gray-600 font-medium">
                                          Final Price:
                                        </span>
                                        <span className="text-sm font-bold text-green-700">
                                          ₱{calculateItemTotal(item).toFixed(2)}
                                        </span>
                                      </div>
                                    </div>
                                  )}

                                  {!canSelect &&
                                    !isSelected &&
                                    limitReached && (
                                      <div className="mt-2 pt-2 border-t border-gray-200">
                                        <p className="text-xs text-red-500 font-medium">
                                          {isDrink
                                            ? "Max 1 drink allowed"
                                            : isFood
                                            ? "Max 2 food items allowed"
                                            : "Max 3 items allowed"}
                                        </p>
                                      </div>
                                    )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    } else {
                      return (
                        <div className="h-full flex flex-col items-center justify-center p-8">
                          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            {activeCategory === "drinks" ? (
                              <span className="text-3xl">🍹</span>
                            ) : (
                              <span className="text-3xl">🍴</span>
                            )}
                          </div>
                          <h5 className="text-gray-500 font-medium mb-2">
                            No {activeCategory} items found
                          </h5>
                          <p className="text-gray-400 text-sm text-center max-w-md">
                            {activeCategory === "drinks"
                              ? "Add drink items to cart to apply discount"
                              : "Add food items to cart to apply discount"}
                          </p>
                        </div>
                      );
                    }
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Next Order Confirmation Modal */}
      {showNextOrderConfirm && nextOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Switch to Next Order?
              </h3>
              <p className="text-gray-600 mb-4">
                Do you want to start working on Order {nextOrder.number}?
              </p>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-gray-800">
                  Order {nextOrder.number} has {nextOrder.items?.length || 0}{" "}
                  items.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowNextOrderConfirm(false)}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-300 transition-colors"
              >
                Stay on Current
              </button>
              <button
                onClick={handleGoToNextOrder}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors"
              >
                Yes, Switch Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="w-full h-screen overflow-y-auto bg-gray-100 px-4 py-6 pb-32">
        {/* Cash Modal */}
        {showCashModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">
                Enter Cash Amount
              </h3>

              <div className="mb-4">
                <p className="text-gray-600 mb-2">
                  Total Amount: ₱{totals.total.toFixed(2)}
                </p>
                <input
                  type="number"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg text-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none mb-4"
                  placeholder="Enter cash amount"
                  min="0"
                  step="0.01"
                  autoFocus
                />

                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[10, 20, 50, 100, 500, 1000].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => handleDenominationClick(amount)}
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-200 transition-colors"
                    >
                      ₱{amount}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Entered Amount:</span>
                  <span className="text-lg font-bold text-gray-900">
                    ₱{safeNumber(cashAmount).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Remaining:</span>
                  <span className="text-lg font-bold text-orange-600">
                    ₱
                    {Math.max(0, totals.total - safeNumber(cashAmount)).toFixed(
                      2
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-gray-600">Change:</span>
                  <span className="text-lg font-bold text-green-600">
                    ₱
                    {Math.max(0, safeNumber(cashAmount) - totals.total).toFixed(
                      2
                    )}
                  </span>
                </div>

                {safeNumber(cashAmount) < totals.total && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      <span className="font-semibold">Note:</span> Cash amount
                      is insufficient. You can:
                    </p>
                    <ul className="text-xs text-yellow-700 mt-2 list-disc pl-5">
                      <li>
                        Pay the remaining ₱
                        {(totals.total - safeNumber(cashAmount)).toFixed(2)}{" "}
                        online
                      </li>
                      <li>Submit as partial payment</li>
                      <li>Add more cash</li>
                    </ul>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={handleCashSubmit}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors"
                >
                  {safeNumber(cashAmount) >= totals.total
                    ? "Confirm Full Payment"
                    : "Continue with Partial Payment"}
                </button>
                <button
                  onClick={handleCancelCashModal}
                  className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mixed Payment Modal */}
        {showMixedPaymentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">
                Complete Payment
              </h3>

              <div className="mb-4">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cash Amount
                  </label>
                  <input
                    type="number"
                    value={cashAmount}
                    onChange={handleMixedPaymentCashChange}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg text-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg mb-4">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-600">Order Total:</span>
                    <span className="text-sm font-bold text-gray-900">
                      ₱{totals.total.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-600">Cash Payment:</span>
                    <span className="text-sm font-bold text-gray-900">
                      ₱{safeNumber(cashAmount).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600">Remaining:</span>
                    <span className="text-sm font-bold text-orange-600">
                      ₱
                      {Math.max(
                        0,
                        totals.total - safeNumber(cashAmount)
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pay Remaining Online (Optional):
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() =>
                        setMixedPayment((prev) => ({
                          ...prev,
                          onlineMethod: "BDO",
                        }))
                      }
                      className={`px-4 py-3 rounded-lg font-semibold text-sm ${
                        mixedPayment.onlineMethod === "BDO"
                          ? "bg-blue-600 text-white"
                          : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                      } transition-colors`}
                    >
                      BDO
                    </button>
                    <button
                      onClick={() =>
                        setMixedPayment((prev) => ({
                          ...prev,
                          onlineMethod: "GCASH",
                        }))
                      }
                      className={`px-4 py-3 rounded-lg font-semibold text-sm ${
                        mixedPayment.onlineMethod === "GCASH"
                          ? "bg-green-600 text-white"
                          : "bg-green-100 text-green-700 hover:bg-green-200"
                      } transition-colors`}
                    >
                      GCASH
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Online payment is optional. You can submit as partial
                    payment.
                  </p>
                </div>

                {mixedPayment.onlineMethod && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-blue-800">
                          Online Payment ({mixedPayment.onlineMethod})
                        </p>
                        <p className="text-xs text-blue-600">
                          Amount: ₱
                          {Math.max(
                            0,
                            totals.total - safeNumber(cashAmount)
                          ).toFixed(2)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-blue-800">
                          ₱
                          {Math.max(
                            0,
                            totals.total - safeNumber(cashAmount)
                          ).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowMixedPaymentModal(false);
                    setShowCashModal(true);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-300 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleMixedPaymentConfirm}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors"
                >
                  {mixedPayment.onlineMethod
                    ? "Confirm Mixed Payment"
                    : "Submit Partial Payment"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Online Payment Options Modal */}
        {showOnlineOptions && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">
                Select Digital Payment Method
              </h3>
              <div className="space-y-3">
                <button
                  onClick={() => handleOnlinePaymentSelect("BDO")}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors"
                >
                  BDO (Full Payment)
                </button>
                <button
                  onClick={() => handleOnlinePaymentSelect("GCASH")}
                  className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-semibold text-sm hover:bg-green-700 transition-colors"
                >
                  GCASH (Full Payment)
                </button>
                <button
                  onClick={() => {
                    setShowOnlineOptions(false);
                  }}
                  className="w-full px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold text-sm hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Show bill if there's a current order */}
        {currentOrder && (
          <div className="max-w-[600px] mx-auto space-y-4 pb-8">
            {/* Next Order Banner */}
            {nextOrder && !processedOrders.has(nextOrder.id) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-800">
                      Next Order Available
                    </p>
                    <p className="text-xs text-blue-600">
                      Order {nextOrder.number} has{" "}
                      {nextOrder.items?.length || 0} items
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {pendingOrderCount - 1} more order
                      {pendingOrderCount - 1 > 1 ? "s" : ""} pending
                    </p>
                  </div>
                  <button
                    onClick={() => setShowNextOrderConfirm(true)}
                    className="text-sm text-blue-700 hover:text-blue-900 font-medium"
                  >
                    Switch Now →
                  </button>
                </div>
              </div>
            )}

            {/* 🧾 CUSTOMER TYPE & PHONE */}
            <div className="bg-white rounded-lg p-4 shadow-md">
              <h2 className="text-gray-900 text-sm font-semibold mb-3">
                Customer Details
              </h2>
              <div className="flex gap-3 mb-3">
                <button
                  onClick={() => handleCustomerTypeChange("walk-in")}
                  className={`flex-1 px-4 py-3 rounded-lg font-semibold text-sm ${
                    customerType === "walk-in"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  } transition-colors`}
                >
                  Walk-in
                </button>
                <button
                  onClick={() => handleCustomerTypeChange("take-out")}
                  className={`flex-1 px-4 py-3 rounded-lg font-semibold text-sm ${
                    customerType === "take-out"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  } transition-colors`}
                >
                  Take-out
                </button>
              </div>
              <div className="mt-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Customer Phone (Optional)
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={handlePhoneChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Enter phone number (optional)"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Phone number is optional for walk-in customers
                </p>
              </div>
            </div>

            {/* 🛒 CART ITEMS - UPDATED WITH WHITE TAGS */}
            <div className="bg-white rounded-lg p-4 shadow-md max-h-64 overflow-y-auto">
              <h2 className="text-gray-900 text-sm font-semibold mb-2">
                Cart Items (Order {currentOrder?.number})
              </h2>
              {combinedCart.length === 0 ? (
                <p className="text-gray-500 text-xs">No items added yet.</p>
              ) : (
                combinedCart.map((item, index) => {
                  if (!item) return null;
                  const itemKey = getItemKey(item);
                  const isDiscounted = pwdSeniorDiscountItems.some(
                    (discountedItem) => getItemKey(discountedItem) === itemKey
                  );
                  const isDrink = isDrinkItem(item);
                  const isFood = isFoodItem(item);
                  const itemType = getItemTag(item); // Use the tag: 'food' or 'drink'

                  const originalTotal = calculateItemTotalPrice(item);
                  const displayedTotal = calculateItemTotal(item);
                  const discountAmount = calculateItemDiscountAmount(item);

                  return (
                    <div
                      key={getUniqueKey(item, index)}
                      className={`flex justify-between items-center px-3 py-2 rounded-md border mb-2 ${
                        item.isRedeemed
                          ? "bg-green-50 border-green-200"
                          : isDiscounted
                          ? "bg-green-50 border-green-300"
                          : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-gray-900 text-sm font-medium">
                            {item.name}
                            {item.isRedeemed && (
                              <span className="ml-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                                FREE
                              </span>
                            )}
                            {isDiscounted && !item.isRedeemed && (
                              <span className="ml-2 bg-green-600 text-white text-xs px-2 py-1 rounded-full">
                                PWD/SENIOR -20%
                              </span>
                            )}
                          </p>
                          {/* WHITE TAG FOR FOOD/DRINK */}
                          <span
                            className={`text-xs px-2 py-1 rounded-full font-medium ${
                              itemType === "drink"
                                ? "bg-white text-blue-600 border border-blue-200"
                                : "bg-white text-green-600 border border-green-200"
                            }`}
                          >
                            {itemType === "drink" ? "Drink" : "Food"}
                          </span>
                        </div>
                        <p className="text-gray-500 text-xs">
                          {item.quantity} × ₱
                          {safeNumber(item.pricePerQuantity).toFixed(2)}
                          {isDiscounted ? (
                            <>
                              {" "}
                              = ₱{originalTotal.toFixed(2)} → ₱
                              {displayedTotal.toFixed(2)}{" "}
                              <span className="text-green-600">
                                (-₱{discountAmount.toFixed(2)})
                              </span>
                            </>
                          ) : item.isRedeemed ? (
                            <>
                              {" "}
                              = ₱{originalTotal.toFixed(2)} → FREE{" "}
                              <span className="text-blue-600">
                                (-₱{discountAmount.toFixed(2)})
                              </span>
                            </>
                          ) : (
                            ` = ₱${originalTotal.toFixed(2)}`
                          )}
                        </p>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2 mr-3">
                        <button
                          onClick={() => handleDecrement(item.id)}
                          className="w-6 h-6 flex items-center justify-center bg-gray-200 rounded-full text-gray-600 hover:bg-gray-300 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={item.quantity <= 1 || item.isRedeemed}
                        >
                          -
                        </button>
                        <span className="text-gray-900 text-sm font-medium min-w-6 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleIncrement(item.id)}
                          className="w-6 h-6 flex items-center justify-center bg-gray-200 rounded-full text-gray-600 hover:bg-gray-300 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={item.isRedeemed}
                        >
                          +
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <p className="text-gray-900 text-sm font-bold min-w-20 text-right">
                          {item.isRedeemed ? (
                            <span className="text-green-600">FREE</span>
                          ) : (
                            `₱${displayedTotal.toFixed(2)}`
                          )}
                        </p>
                        <div className="flex flex-col gap-1">
                          {showRedeemOptions && !item.isRedeemed && (
                            <button
                              onClick={() =>
                                handleRedeemItem(item.id, item.name)
                              }
                              className="text-blue-500 hover:text-blue-700 text-xs font-semibold"
                            >
                              Redeem
                            </button>
                          )}
                          <button
                            onClick={() =>
                              dispatch(
                                removeItemFromOrder({
                                  orderId: currentOrder.id,
                                  itemId: item.id,
                                })
                              )
                            }
                            className="text-red-500 hover:text-red-700 text-xs font-semibold"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* 🧾 TOTALS */}
            <div className="bg-white rounded-lg p-4 shadow-md space-y-2">
              <div className="flex justify-between items-center">
                <p className="text-xs text-gray-500 font-medium">
                  Items ({cartData?.length || 0})
                </p>
                <h1 className="text-gray-900 text-md font-bold">
                  ₱{totals.baseGrossTotal.toFixed(2)}
                </h1>
              </div>

              {pwdSeniorDiscountApplied &&
                totals.pwdSeniorDiscountAmount > 0 && (
                  <div className="flex justify-between items-center text-green-600">
                    <div className="flex items-center">
                      <p className="text-xs font-medium mr-2">
                        {discountedItemsInfo}
                        {pwdSeniorDetails.name && ` (${pwdSeniorDetails.name})`}
                      </p>
                      <button
                        onClick={clearPwdSeniorDiscount}
                        className="text-xs text-red-500 hover:text-red-700 font-medium"
                        disabled={isProcessing}
                      >
                        (Clear)
                      </button>
                    </div>
                    <h1 className="text-md font-bold">
                      -₱{totals.pwdSeniorDiscountAmount.toFixed(2)}
                    </h1>
                  </div>
                )}

              {hasRedeemedItem && (
                <div className="flex justify-between items-center text-blue-600">
                  <p className="text-xs font-medium">Redemption Discount</p>
                  <h1 className="text-md font-bold">
                    -₱{totals.redemptionAmount.toFixed(2)}
                  </h1>
                </div>
              )}

              {/* ✅ ADDED: Custom Discount Display */}
              {customDiscountApplied && totals.customDiscountAmount > 0 && (
                <div className="flex justify-between items-center text-purple-600">
                  <div className="flex items-center">
                    <p className="text-xs font-medium mr-2">
                      Custom Discount{" "}
                      {customDiscountType === "percentage"
                        ? `(${customDiscountValue}%)`
                        : `(₱${customDiscountValue.toFixed(2)})`}
                      {customDiscountReason && ` - ${customDiscountReason}`}
                    </p>
                    <button
                      onClick={() => {
                        setCustomDiscountApplied(false);
                        setCustomDiscountAmount(0);
                        setCustomDiscountValue(0);
                        setCustomDiscountReason("");
                        enqueueSnackbar("Custom discount removed", {
                          variant: "info",
                        });
                      }}
                      className="text-xs text-red-500 hover:text-red-700 font-medium"
                      disabled={isProcessing}
                    >
                      (Clear)
                    </button>
                  </div>
                  <h1 className="text-md font-bold">
                    -₱{totals.customDiscountAmount.toFixed(2)}
                  </h1>
                </div>
              )}

              {employeeDiscountApplied && totals.employeeDiscountAmount > 0 && (
                <div className="flex justify-between items-center text-yellow-600">
                  <p className="text-xs font-medium">Employee Discount (15%)</p>
                  <h1 className="text-md font-bold">
                    -₱{totals.employeeDiscountAmount.toFixed(2)}
                  </h1>
                </div>
              )}

              {shareholderDiscountApplied &&
                totals.shareholderDiscountAmount > 0 && (
                  <div className="flex justify-between items-center text-purple-600">
                    <p className="text-xs font-medium">
                      Shareholder Discount (10%)
                    </p>
                    <h1 className="text-md font-bold">
                      -₱{totals.shareholderDiscountAmount.toFixed(2)}
                    </h1>
                  </div>
                )}

              <div className="flex justify-between items-center">
                <p className="text-xs text-gray-500 font-medium">Net of VAT</p>
                <h1 className="text-gray-900 text-md font-bold">
                  ₱{totals.netSales.toFixed(2)}
                </h1>
              </div>

              <div className="flex justify-between items-center">
                <p className="text-xs text-gray-500 font-medium">VAT (12%)</p>
                <h1 className="text-gray-900 text-md font-bold">
                  ₱{totals.vatAmount.toFixed(2)}
                </h1>
              </div>

              <div className="flex justify-between items-center border-t pt-2">
                <p className="text-sm text-gray-700 font-semibold">TOTAL</p>
                <h1 className="text-gray-900 text-xl font-bold">
                  ₱{totals.total.toFixed(2)}
                </h1>
              </div>

              {/* Show payment details */}
              {paymentMethod &&
                (totals.cashAmount > 0 || totals.onlineAmount > 0) && (
                  <>
                    <div className="flex justify-between items-center border-t pt-2">
                      <p className="text-xs text-gray-600 font-medium">
                        Amount Paid
                      </p>
                      <p className="text-md text-gray-800 font-bold">
                        ₱{totals.totalPaid.toFixed(2)}
                      </p>
                    </div>

                    {totals.cashAmount > 0 && (
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-gray-600 font-medium">
                          Cash
                        </p>
                        <p className="text-md text-gray-800 font-bold">
                          ₱{totals.cashAmount.toFixed(2)}
                        </p>
                      </div>
                    )}

                    {totals.onlineAmount > 0 && (
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-gray-600 font-medium">
                          Online ({mixedPayment.onlineMethod})
                        </p>
                        <p className="text-md text-blue-800 font-bold">
                          ₱{totals.onlineAmount.toFixed(2)}
                        </p>
                      </div>
                    )}

                    {/* Show remaining balance if partial payment */}
                    {totals.remainingBalance > 0 && (
                      <div className="flex justify-between items-center text-red-600 bg-red-50 p-2 rounded">
                        <p className="text-xs font-bold">Remaining Balance:</p>
                        <p className="text-md font-bold">
                          ₱{totals.remainingBalance.toFixed(2)}
                        </p>
                      </div>
                    )}

                    {totals.change > 0 && (
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-gray-600 font-medium">
                          Change
                        </p>
                        <p className="text-md text-green-600 font-bold">
                          ₱{totals.change.toFixed(2)}
                        </p>
                      </div>
                    )}
                  </>
                )}
            </div>

            {/* 🎟 DISCOUNT & REDEMPTION BUTTONS - UPDATED with Custom Discount */}
            <div className="grid grid-cols-2 gap-3">
              {/* First Row */}
              <div className="flex gap-2">
                <button
                  onClick={handlePwdSeniorDiscount}
                  disabled={isProcessing || customDiscountApplied}
                  className={`flex-1 px-3 py-3 rounded-lg font-semibold text-xs ${
                    pwdSeniorDiscountApplied
                      ? "bg-green-500 text-white hover:bg-green-600"
                      : "bg-green-100 text-green-700 hover:bg-green-200"
                  } ${
                    customDiscountApplied ? "opacity-50 cursor-not-allowed" : ""
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {pwdSeniorDiscountApplied ? "✓ PWD/SENIOR" : "PWD/SENIOR"}
                </button>

                <button
                  onClick={handleEmployeeDiscount}
                  disabled={isProcessing || customDiscountApplied}
                  className={`flex-1 px-3 py-3 rounded-lg font-semibold text-xs ${
                    employeeDiscountApplied
                      ? "bg-yellow-500 text-white hover:bg-yellow-600"
                      : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                  } ${
                    customDiscountApplied ? "opacity-50 cursor-not-allowed" : ""
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {employeeDiscountApplied ? "✓ Employee" : "Employee"}
                </button>
              </div>

              {/* Second Row */}
              <div className="flex gap-2">
                <button
                  onClick={handleShareholderDiscount}
                  disabled={isProcessing || customDiscountApplied}
                  className={`flex-1 px-3 py-3 rounded-lg font-semibold text-xs ${
                    shareholderDiscountApplied
                      ? "bg-purple-500 text-white hover:bg-purple-600"
                      : "bg-purple-100 text-purple-700 hover:bg-purple-200"
                  } ${
                    customDiscountApplied ? "opacity-50 cursor-not-allowed" : ""
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {shareholderDiscountApplied ? "✓ VIP" : "VIP"}
                </button>

                {/* ✅ ADDED: Custom Discount Button */}
                <button
                  onClick={handleCustomDiscount}
                  disabled={isProcessing}
                  className={`flex-1 px-3 py-3 rounded-lg font-semibold text-xs ${
                    customDiscountApplied
                      ? "bg-red-500 text-white hover:bg-red-600"
                      : "bg-red-100 text-red-700 hover:bg-red-200"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {customDiscountApplied ? "✓ Custom" : "Custom"}
                </button>
              </div>

              {/* ✅ ADDED: Redemption Button Row */}
              <div className="col-span-2">
                {!hasRedeemedItem ? (
                  <button
                    onClick={handleShowRedeemOptions}
                    disabled={isProcessing || combinedCart.length === 0}
                    className="w-full px-3 py-3 rounded-lg font-semibold text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Redeem Item for Free
                  </button>
                ) : (
                  <button
                    onClick={handleRemoveRedemption}
                    disabled={isProcessing}
                    className="w-full px-3 py-3 rounded-lg font-semibold text-xs bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Remove Redemption
                  </button>
                )}
              </div>
            </div>

            {/* 💳 PAYMENT BUTTONS */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleCashPayment}
                disabled={isProcessing}
                className={`flex-1 px-3 py-3 rounded-lg font-semibold text-sm ${
                  paymentMethod === "Cash" || paymentMethod === "Mixed"
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {paymentMethod === "Mixed" ? "✓ Mixed Payment" : "Cash"}
              </button>

              <button
                onClick={() => setShowOnlineOptions(true)}
                disabled={isProcessing}
                className={`flex-1 px-3 py-3 rounded-lg font-semibold text-sm ${
                  paymentMethod === "BDO" || paymentMethod === "GCASH"
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {paymentMethod === "BDO"
                  ? "✓ BDO"
                  : paymentMethod === "GCASH"
                  ? "✓ GCASH"
                  : "Online"}
              </button>
            </div>

            {/* 🧾 PLACE ORDER BUTTON */}
            <div className="flex flex-col sm:flex-row gap-3 mt-6 mb-6 pb-8">
              <button
                onClick={handlePlaceOrder}
                disabled={
                  isProcessing || !paymentMethod || cartData.length === 0
                }
                className="w-full px-4 py-4 rounded-lg font-semibold text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    Place Order & Show Invoice
                    {totals.remainingBalance > 0 && (
                      <span className="text-xs bg-yellow-500 text-white px-2 py-1 rounded-full">
                        Partial
                      </span>
                    )}
                  </>
                )}
              </button>
            </div>

            {/* Extra spacing for bottom navigation safety */}
            <div className="h-12"></div>
          </div>
        )}
      </div>
    </>
  );
};

// Add CSS animations
const styles = `
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes pulse-subtle {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.9; }
}

.animate-fadeIn {
  animation: fadeIn 0.3s ease-out;
}

.animate-pulse-subtle {
  animation: pulse-subtle 2s ease-in-out infinite;
}

.hover\\:scale-\\[1\\.01\\]:hover {
  transform: scale(1.01);
}
`;

// Add styles to document head
if (typeof document !== "undefined") {
  const styleSheet = document.createElement("style");
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);
}

export default Bill;
