// 🍰 Image Imports
import cheesecake1 from "../assets/images/cheesecake1.jpg";
import cheesecake2 from "../assets/images/cheesecake1.jpg";
import cheesecake3 from "../assets/images/cheesecake1.jpg";
import cheesecake4 from "../assets/images/cheesecake1.jpg";
import cheesecake5 from "../assets/images/cheesecake1.jpg";
import cheesecake6 from "../assets/images/cheesecake1.jpg";
import coffee from "../assets/images/cheesecake1.jpg";
import frappe from "../assets/images/cheesecake1.jpg";
import smoothie from "../assets/images/cheesecake1.jpg";
import icedtea from "../assets/images/cheesecake1.jpg";

// Cheesecake flavor options (shared across categories)
export const cheesecakeFlavorOptions = [
  { label: "Mangoes & Cream", price: 220 },
  { label: "Ube Macapuno", price: 220 },
  { label: "Strawberry", price: 220 },
  { label: "Blueberry", price: 220 },
  { label: "Queso de Bola", price: 220 },
  { label: "New York", price: 220 },
  { label: "Baileys", price: 220 },
  { label: "Coffee Caramel", price: 220 },
  { label: "Dark Chocolate", price: 220 },
  { label: "Oreo", price: 220 },
  { label: "Matcha Zebra", price: 220 },
];

// Additional Keto Mini flavors
export const ketoMiniFlavorOptions = [
  { label: "Lemon", price: 160 },
  { label: "New York", price: 160 },
  { label: "Dark Chocolate", price: 160 },
  { label: "Coffee Caramel", price: 160 },
  { label: "Queso de Bola", price: 160 },
];

// Helper function to format Bento & Mini items with all flavor options
const createBentoItem = (id, name, image, baseOptions) => {
  // Base options (size/type options)
  const bases = baseOptions.map((base) => ({
    ...base,
    type: "base",
    hasFlavors: true,
    description: `${name} (${base.label})`,
  }));

  // Create flavor variants for EACH base option
  const flavorVariants = [];

  baseOptions.forEach((base) => {
    cheesecakeFlavorOptions.forEach((flavor) => {
      // For each base, create a flavor variant
      flavorVariants.push({
        ...flavor,
        type: "flavor",
        baseLabel: base.label,
        basePrice: base.price,
        description: `${name} (${base.label}) with ${flavor.label} flavor`,
        totalPrice: base.price + (flavor.price - 220), // Adjust price calculation
      });
    });
  });

  return {
    id,
    name,
    image,
    category: "Bento & Mini",
    hasFlavorSelection: true,
    variants: [...bases, ...flavorVariants],
  };
};

// 🍳 All-Day Breakfast (Updated from image)
export const breakfastItems = [
  {
    id: 1,
    name: "Longanisa Breakfast",
    image: cheesecake1,
    category: "Breakfast",
    variants: [
      { label: "Regular", price: 119 },
      { label: "With Brewed Coffee", price: 149 },
    ],
  },
  {
    id: 2,
    name: "Omelette Breakfast",
    image: cheesecake1,
    category: "Breakfast",
    variants: [
      { label: "Regular", price: 129 },
      { label: "With Brewed Coffee", price: 159 },
    ],
  },
  {
    id: 3,
    name: "Spam Breakfast",
    image: cheesecake1,
    category: "Breakfast",
    variants: [
      { label: "Regular", price: 149 },
      { label: "With Brewed Coffee", price: 179 },
    ],
  },
  {
    id: 4,
    name: "Hungarian Breakfast",
    image: cheesecake1,
    category: "Breakfast",
    variants: [
      { label: "Regular", price: 149 },
      { label: "With Brewed Coffee", price: 179 },
    ],
  },
  {
    id: 5,
    name: "Tapa Breakfast",
    image: cheesecake1,
    category: "Breakfast",
    variants: [
      { label: "Regular", price: 169 },
      { label: "With Brewed Coffee", price: 199 },
    ],
  },
  // Breakfast Add-ons (moved from Add-ons category)
  {
    id: 6,
    name: "Add Rice",
    image: cheesecake1,
    category: "Breakfast",
    variants: [{ label: "Side", price: 25 }],
  },
  {
    id: 7,
    name: "Add Egg",
    image: cheesecake1,
    category: "Breakfast",
    variants: [{ label: "Extra", price: 15 }],
  },
];

// 🍝 Pasta (Updated from image)
export const pastaItems = [
  {
    id: 1,
    name: "Carbonara",
    image: cheesecake1,
    category: "Pasta",
    variants: [
      { label: "Solo", price: 189 },
      { label: "Tray", price: 600 },
    ],
  },
  {
    id: 2,
    name: "Pesto",
    image: cheesecake1,
    category: "Pasta",
    variants: [
      { label: "Solo", price: 189 },
      { label: "Tray", price: 600 },
    ],
  },
];

// 🍰 Regular Cheesecakes (Updated with Keto flavors moved here)
export const regularCheesecakes = [
  {
    id: 1,
    name: "Regular Cheesecake - Whole",
    image: cheesecake1,
    category: "Cheesecake",
    variants: [{ label: "Whole", price: 2200 }],
  },
  {
    id: 2,
    name: "Regular Cheesecake - Slice",
    image: cheesecake2,
    category: "Cheesecake",
    variants: [
      { label: "Slice", price: 230, type: "base" },
      ...cheesecakeFlavorOptions.map((flavor) => ({
        ...flavor,
        type: "flavor",
        baseLabel: "Slice",
        basePrice: 230,
        totalPrice: flavor.price,
      })),
    ],
  },
  {
    id: 3,
    name: "Regular Cheesecake - Tin Can",
    image: cheesecake3,
    category: "Cheesecake",
    variants: [{ label: "Tin Can", price: 700 }],
  },
  {
    id: 4,
    name: "Regular Cheesecake - Bento",
    image: cheesecake4,
    category: "Cheesecake",
    variants: [{ label: "Bento", price: 350 }],
  },
];

// 🍰 Keto Cheesecakes (Updated - with all flavor variations)
export const ketoCheesecakes = [
  {
    id: 1,
    name: "Keto Cheesecake - Whole",
    image: cheesecake5,
    category: "Keto Cheesecake",
    variants: [{ label: "Whole", price: 3200 }],
  },
  {
    id: 2,
    name: "Keto Cheesecake - Slice",
    image: cheesecake6,
    category: "Keto Cheesecake",
    variants: [
      { label: "Slice", price: 180, type: "base" },
      ...cheesecakeFlavorOptions.map((flavor) => ({
        ...flavor,
        type: "flavor",
        baseLabel: "Slice",
        basePrice: 180,
        totalPrice: flavor.price,
      })),
    ],
  },
  {
    id: 3,
    name: "Keto Cheesecake - Mini",
    image: cheesecake1,
    category: "Keto Cheesecake",
    variants: [
      { label: "Original", price: 160 },
      ...ketoMiniFlavorOptions.map((flavor) => ({
        ...flavor,
        description: `Keto Cheesecake - Mini (${flavor.label})`,
      })),
    ],
  },
  {
    id: 4,
    name: "Keto Cheesecake - Can",
    image: cheesecake2,
    category: "Keto Cheesecake",
    variants: [{ label: "Can", price: 1200 }],
  },
];

// 🍱 Bento & Mini Items - ALL with flavor selection
export const bentoItems = [
  // Bento Combo - Regular base with all flavor options
  {
    id: 1,
    name: "Bento Combo",
    image: cheesecake1,
    category: "Bento & Mini",
    hasFlavorSelection: true,
    baseOptions: [{ label: "Regular", price: 500, type: "size" }],
    variants: [
      { label: "Regular", price: 500, type: "base", hasFlavors: true },
      // All flavor options for Regular base
      ...cheesecakeFlavorOptions.map((flavor) => ({
        ...flavor,
        type: "flavor",
        baseLabel: "Regular",
        basePrice: 500,
        description: `Bento Combo (Regular) with ${flavor.label} flavor`,
        totalPrice: 500 + (flavor.price - 220), // Base price + (flavor price - base flavor price)
      })),
    ],
  },

  // Mini Box 6s - Box base with all flavor options
  {
    id: 2,
    name: "Mini Box 6s",
    image: cheesecake2,
    category: "Bento & Mini",
    hasFlavorSelection: true,
    baseOptions: [{ label: "Box", price: 450, type: "size" }],
    variants: [
      { label: "Box", price: 450, type: "base", hasFlavors: true },
      // All flavor options for Box base
      ...cheesecakeFlavorOptions.map((flavor) => ({
        ...flavor,
        type: "flavor",
        baseLabel: "Box",
        basePrice: 450,
        description: `Mini Box 6s (Box) with ${flavor.label} flavor`,
        totalPrice: 450 + (flavor.price - 220), // Base price + (flavor price - base flavor price)
      })),
    ],
  },

  // Mini Box 4s - Box base with all flavor options
  {
    id: 3,
    name: "Mini Box 4s",
    image: cheesecake3,
    category: "Bento & Mini",
    hasFlavorSelection: true,
    baseOptions: [{ label: "Box", price: 350, type: "size" }],
    variants: [
      { label: "Box", price: 350, type: "base", hasFlavors: true },
      // All flavor options for Box base
      ...cheesecakeFlavorOptions.map((flavor) => ({
        ...flavor,
        type: "flavor",
        baseLabel: "Box",
        basePrice: 350,
        description: `Mini Box 4s (Box) with ${flavor.label} flavor`,
        totalPrice: 350 + (flavor.price - 220), // Base price + (flavor price - base flavor price)
      })),
    ],
  },

  // Mini Cake - Single base with all flavor options
  {
    id: 4,
    name: "Mini Cake",
    image: cheesecake4,
    category: "Bento & Mini",
    hasFlavorSelection: true,
    baseOptions: [{ label: "Single", price: 85, type: "size" }],
    variants: [
      { label: "Single", price: 85, type: "base", hasFlavors: true },
      // All flavor options for Single base
      ...cheesecakeFlavorOptions.map((flavor) => ({
        ...flavor,
        type: "flavor",
        baseLabel: "Single",
        basePrice: 85,
        description: `Mini Cake (Single) with ${flavor.label} flavor`,
        totalPrice: 85 + (flavor.price - 220), // Base price + (flavor price - base flavor price)
      })),
    ],
  },
];

// 🍟 Snacks Category
export const snackItems = [
  {
    id: 1,
    name: "Fries",
    image: cheesecake1,
    category: "Snacks",
    variants: [
      { label: "Regular", price: 80 },
      { label: "Large", price: 120 },
      { label: "Cheese", price: 100 },
    ],
  },
  {
    id: 2,
    name: "Nachos",
    image: cheesecake2,
    category: "Snacks",
    variants: [
      { label: "Regular", price: 150 },
      { label: "Large", price: 200 },
      { label: "Supreme", price: 250 },
    ],
  },
  {
    id: 3,
    name: "Garlic Bread",
    image: cheesecake3,
    category: "Snacks",
    variants: [
      { label: "3pcs", price: 75 },
      { label: "6pcs", price: 140 },
    ],
  },
  {
    id: 4,
    name: "Chicken Wings",
    image: cheesecake4,
    category: "Snacks",
    variants: [
      { label: "4pcs", price: 180 },
      { label: "8pcs", price: 320 },
      { label: "12pcs", price: 450 },
    ],
  },
  {
    id: 5,
    name: "Fish Balls",
    image: cheesecake5,
    category: "Snacks",
    variants: [
      { label: "10pcs", price: 50 },
      { label: "20pcs", price: 90 },
    ],
  },
];

// ☕ Hot Coffee
export const hotCoffeeItems = [
  {
    id: 1,
    name: "Brewed Coffee",
    image: coffee,
    category: "Hot Coffee",
    variants: [
      { label: "12oz", price: 50 },
      { label: "16oz", price: 85 },
      { label: "22oz", price: 100 },
    ],
  },
  {
    id: 2,
    name: "Americano",
    image: coffee,
    category: "Hot Coffee",
    variants: [
      { label: "12oz", price: 50 },
      { label: "16oz", price: 55 },
      { label: "22oz", price: 140 },
    ],
  },
  {
    id: 3,
    name: "Cappuccino",
    image: coffee,
    category: "Hot Coffee",
    variants: [
      { label: "12oz", price: 50 },
      { label: "16oz", price: 65 },
      { label: "22oz", price: 150 },
    ],
  },
  {
    id: 4,
    name: "Latte",
    image: coffee,
    category: "Hot Coffee",
    variants: [
      { label: "12oz", price: 50 },
      { label: "16oz", price: 60 },
      { label: "22oz", price: 145 },
    ],
  },
  {
    id: 5,
    name: "Vanilla Latte",
    image: coffee,
    category: "Hot Coffee",
    variants: [
      { label: "12oz", price: 55 },
      { label: "16oz", price: 65 },
      { label: "22oz", price: 150 },
    ],
  },
  {
    id: 6,
    name: "Hazelnut Latte",
    image: coffee,
    category: "Hot Coffee",
    variants: [
      { label: "12oz", price: 55 },
      { label: "16oz", price: 65 },
      { label: "22oz", price: 150 },
    ],
  },
  {
    id: 7,
    name: "Macchiato",
    image: coffee,
    category: "Hot Coffee",
    variants: [
      { label: "12oz", price: 60 },
      { label: "16oz", price: 70 },
      { label: "22oz", price: 155 },
    ],
  },
  {
    id: 8,
    name: "Mocha",
    image: coffee,
    category: "Hot Coffee",
    variants: [
      { label: "12oz", price: 45 },
      { label: "16oz", price: 60 },
      { label: "22oz", price: 145 },
    ],
  },
  {
    id: 9,
    name: "White Mocha",
    image: coffee,
    category: "Hot Coffee",
    variants: [
      { label: "12oz", price: 45 },
      { label: "16oz", price: 60 },
      { label: "22oz", price: 145 },
    ],
  },
  {
    id: 10,
    name: "Salted Caramel Macchiato",
    image: coffee,
    category: "Hot Coffee",
    variants: [
      { label: "12oz", price: 60 },
      { label: "16oz", price: 70 },
      { label: "22oz", price: 155 },
    ],
  },
  {
    id: 11,
    name: "Hazelnut Macchiato",
    image: coffee,
    category: "Hot Coffee",
    variants: [
      { label: "12oz", price: 55 },
      { label: "16oz", price: 65 },
      { label: "22oz", price: 150 },
    ],
  },
  {
    id: 12,
    name: "Matcha",
    image: coffee,
    category: "Hot Coffee",
    variants: [
      { label: "12oz", price: 45 },
      { label: "16oz", price: 60 },
      { label: "22oz", price: 145 },
    ],
  },
  {
    id: 13,
    name: "Strawberry Milk",
    image: coffee,
    category: "Hot Coffee",
    variants: [
      { label: "12oz", price: 60 },
      { label: "16oz", price: 70 },
      { label: "22oz", price: 155 },
    ],
  },
  {
    id: 14,
    name: "Chocolate",
    image: coffee,
    category: "Hot Coffee",
    variants: [
      { label: "12oz", price: 55 },
      { label: "16oz", price: 70 },
      { label: "22oz", price: 155 },
    ],
  },
  {
    id: 15,
    name: "Spanish Latte",
    image: coffee,
    category: "Hot Coffee",
    variants: [
      { label: "12oz", price: 45 },
      { label: "16oz", price: 60 },
      { label: "22oz", price: 145 },
    ],
  },
  {
    id: 16,
    name: "Delish Signature",
    image: coffee,
    category: "Hot Coffee",
    variants: [
      { label: "12oz", price: 55 },
      { label: "16oz", price: 65 },
      { label: "22oz", price: 150 },
    ],
  },
];

// 🧊 Iced Coffee
export const icedCoffeeItems = [
  {
    id: 1,
    name: "Iced Americano",
    image: coffee,
    category: "Iced Coffee",
    variants: [
      { label: "16oz", price: 140 },
      { label: "22oz", price: 155 },
    ],
  },
  {
    id: 2,
    name: "Iced Cappuccino",
    image: coffee,
    category: "Iced Coffee",
    variants: [
      { label: "16oz", price: 150 },
      { label: "22oz", price: 165 },
    ],
  },
  {
    id: 3,
    name: "Iced Latte",
    image: coffee,
    category: "Iced Coffee",
    variants: [
      { label: "16oz", price: 145 },
      { label: "22oz", price: 160 },
    ],
  },
  {
    id: 4,
    name: "Iced Vanilla Latte",
    image: coffee,
    category: "Iced Coffee",
    variants: [
      { label: "16oz", price: 150 },
      { label: "22oz", price: 165 },
    ],
  },
  {
    id: 5,
    name: "Iced Hazelnut Latte",
    image: coffee,
    category: "Iced Coffee",
    variants: [
      { label: "16oz", price: 150 },
      { label: "22oz", price: 165 },
    ],
  },
  {
    id: 6,
    name: "Iced Macchiato",
    image: coffee,
    category: "Iced Coffee",
    variants: [
      { label: "16oz", price: 155 },
      { label: "22oz", price: 170 },
    ],
  },
  {
    id: 7,
    name: "Iced Mocha",
    image: coffee,
    category: "Iced Coffee",
    variants: [
      { label: "16oz", price: 145 },
      { label: "22oz", price: 160 },
    ],
  },
  {
    id: 8,
    name: "Iced White Mocha",
    image: coffee,
    category: "Iced Coffee",
    variants: [
      { label: "16oz", price: 145 },
      { label: "22oz", price: 160 },
    ],
  },
  {
    id: 9,
    name: "Iced Salted Caramel Macchiato",
    image: coffee,
    category: "Iced Coffee",
    variants: [
      { label: "16oz", price: 155 },
      { label: "22oz", price: 170 },
    ],
  },
  {
    id: 10,
    name: "Iced Hazelnut Macchiato",
    image: coffee,
    category: "Iced Coffee",
    variants: [
      { label: "16oz", price: 150 },
      { label: "22oz", price: 165 },
    ],
  },
  {
    id: 11,
    name: "Iced Matcha",
    image: coffee,
    category: "Iced Coffee",
    variants: [
      { label: "16oz", price: 145 },
      { label: "22oz", price: 160 },
    ],
  },
  {
    id: 12,
    name: "Iced Strawberry Milk",
    image: coffee,
    category: "Iced Coffee",
    variants: [
      { label: "16oz", price: 155 },
      { label: "22oz", price: 170 },
    ],
  },
  {
    id: 13,
    name: "Iced Chocolate",
    image: coffee,
    category: "Iced Coffee",
    variants: [
      { label: "16oz", price: 155 },
      { label: "22oz", price: 170 },
    ],
  },
  {
    id: 14,
    name: "Iced Spanish Latte",
    image: coffee,
    category: "Iced Coffee",
    variants: [
      { label: "16oz", price: 145 },
      { label: "22oz", price: 160 },
    ],
  },
  {
    id: 15,
    name: "Iced Delish Signature",
    image: coffee,
    category: "Iced Coffee",
    variants: [
      { label: "16oz", price: 150 },
      { label: "22oz", price: 165 },
    ],
  },
];

// 🧊 Frappe
export const frappeItems = [
  {
    id: 1,
    name: "Espresso Frappe",
    image: frappe,
    category: "Frappe",
    variants: [
      { label: "16oz", price: 65 },
      { label: "22oz", price: 70 },
    ],
  },
  {
    id: 2,
    name: "Hazelnut Frappe",
    image: frappe,
    category: "Frappe",
    variants: [
      { label: "16oz", price: 70 },
      { label: "22oz", price: 85 },
    ],
  },
  {
    id: 3,
    name: "Caramel Frappe",
    image: frappe,
    category: "Frappe",
    variants: [
      { label: "16oz", price: 55 },
      { label: "22oz", price: 70 },
    ],
  },
  {
    id: 4,
    name: "Mocha Frappe",
    image: frappe,
    category: "Frappe",
    variants: [
      { label: "16oz", price: 55 },
      { label: "22oz", price: 70 },
    ],
  },
  {
    id: 5,
    name: "White Mocha Frappe",
    image: frappe,
    category: "Frappe",
    variants: [
      { label: "16oz", price: 55 },
      { label: "22oz", price: 70 },
    ],
  },
  {
    id: 6,
    name: "Choco Cream Frappe",
    image: frappe,
    category: "Frappe",
    variants: [
      { label: "16oz", price: 85 },
      { label: "22oz", price: 95 },
    ],
  },
  {
    id: 7,
    name: "Vanilla Cream Frappe",
    image: frappe,
    category: "Frappe",
    variants: [
      { label: "16oz", price: 75 },
      { label: "22oz", price: 85 },
    ],
  },
  {
    id: 8,
    name: "Caramel Cream Frappe",
    image: frappe,
    category: "Frappe",
    variants: [
      { label: "16oz", price: 80 },
      { label: "22oz", price: 90 },
    ],
  },
  {
    id: 9,
    name: "Oreo Frappe",
    image: frappe,
    category: "Frappe",
    variants: [
      { label: "16oz", price: 85 },
      { label: "22oz", price: 95 },
    ],
  },
  {
    id: 10,
    name: "Choco Hazelnut Frappe",
    image: frappe,
    category: "Frappe",
    variants: [
      { label: "16oz", price: 80 },
      { label: "22oz", price: 90 },
    ],
  },
  {
    id: 11,
    name: "Chocochip Frappe",
    image: frappe,
    category: "Frappe",
    variants: [
      { label: "16oz", price: 90 },
      { label: "22oz", price: 100 },
    ],
  },
  {
    id: 12,
    name: "Matcha Frappe",
    image: frappe,
    category: "Frappe",
    variants: [
      { label: "16oz", price: 80 },
      { label: "22oz", price: 90 },
    ],
  },
  {
    id: 13,
    name: "Ube Frappe",
    image: frappe,
    category: "Frappe",
    variants: [
      { label: "16oz", price: 80 },
      { label: "22oz", price: 90 },
    ],
  },
];

// 🍓 Smoothies
export const smoothieItems = [
  {
    id: 1,
    name: "Mango Smoothie",
    image: smoothie,
    category: "Smoothie",
    variants: [
      { label: "16oz", price: 120 },
      { label: "22oz", price: 190 },
    ],
  },
  {
    id: 2,
    name: "Strawberry Smoothie",
    image: smoothie,
    category: "Smoothie",
    variants: [
      { label: "16oz", price: 120 },
      { label: "22oz", price: 190 },
    ],
  },
  {
    id: 3,
    name: "Strawberry Mango Smoothie",
    image: smoothie,
    category: "Smoothie",
    variants: [
      { label: "16oz", price: 130 },
      { label: "22oz", price: 200 },
    ],
  },
];

// 🍹 Iced Tea
export const icedTeaItems = [
  {
    id: 1,
    name: "Red Iced Tea",
    image: icedtea,
    category: "Iced Tea",
    variants: [
      { label: "16oz", price: 70 },
      { label: "1 Liter", price: 155 },
    ],
  },
  {
    id: 2,
    name: "Honey Peach Iced Tea",
    image: icedtea,
    category: "Iced Tea",
    variants: [
      { label: "16oz", price: 70 },
      { label: "22oz", price: 140 },
    ],
  },
  {
    id: 3,
    name: "Honey Lemon Iced Tea",
    image: icedtea,
    category: "Iced Tea",
    variants: [
      { label: "16oz", price: 70 },
      { label: "22oz", price: 180 },
    ],
  },
];

// ➕ Add-ons Category (Updated - removed rice and egg)
export const addOnsItems = [
  {
    id: 1,
    name: "Add Shot",
    image: coffee,
    category: "Add-ons",
    variants: [{ label: "Single", price: 30 }],
  },
  {
    id: 2,
    name: "Add Whip",
    image: coffee,
    category: "Add-ons",
    variants: [{ label: "Regular", price: 20 }],
  },
  {
    id: 3,
    name: "Add Syrup",
    image: coffee,
    category: "Add-ons",
    variants: [{ label: "Pump", price: 20 }],
  },
  {
    id: 4,
    name: "Soy Milk",
    image: coffee,
    category: "Add-ons",
    variants: [{ label: "Substitute", price: 35 }],
  },
  {
    id: 5,
    name: "Almond Milk",
    image: coffee,
    category: "Add-ons",
    variants: [{ label: "Substitute", price: 45 }],
  },
  {
    id: 6,
    name: "Oat Milk",
    image: coffee,
    category: "Add-ons",
    variants: [{ label: "Substitute", price: 35 }],
  },
  {
    id: 7,
    name: "Extra Cheese",
    image: cheesecake1,
    category: "Add-ons",
    variants: [{ label: "Serving", price: 25 }],
  },
  {
    id: 8,
    name: "Extra Sauce",
    image: cheesecake1,
    category: "Add-ons",
    variants: [{ label: "Side", price: 15 }],
  },
];

// 🛍️ Popular Dishes
export const popularDishes = [
  {
    id: 1,
    image: cheesecake1,
    name: "Longanisa Breakfast",
    numberOfOrders: 150,
  },
  {
    id: 2,
    image: cheesecake2,
    name: "Tapa Breakfast",
    numberOfOrders: 140,
  },
  {
    id: 3,
    image: cheesecake3,
    name: "Carbonara Pasta",
    numberOfOrders: 135,
  },
  {
    id: 4,
    image: cheesecake4,
    name: "Regular Cheesecake Slice",
    numberOfOrders: 120,
  },
  {
    id: 5,
    image: cheesecake5,
    name: "Bento Combo",
    numberOfOrders: 110,
  },
  {
    id: 6,
    image: cheesecake6,
    name: "Keto Cheesecake Slice",
    numberOfOrders: 100,
  },
  {
    id: 7,
    image: frappe,
    name: "Caramel Frappe",
    numberOfOrders: 180,
  },
  {
    id: 8,
    image: coffee,
    name: "Spanish Latte",
    numberOfOrders: 200,
  },
];

// 📊 Menu Sections (Updated with all categories)
export const menus = [
  {
    id: 1,
    name: "Breakfast",
    bgColor: "#4CAF50",
    icon: "🍳",
    items: breakfastItems,
  },
  {
    id: 2,
    name: "Pasta",
    bgColor: "#FF5722",
    icon: "🍝",
    items: pastaItems,
  },
  {
    id: 3,
    name: "Regular Cheesecakes",
    bgColor: "#f6b100",
    icon: "🍰",
    items: regularCheesecakes,
  },
  {
    id: 4,
    name: "Keto Cheesecakes",
    bgColor: "#9C27B0",
    icon: "🥑",
    items: ketoCheesecakes,
  },
  {
    id: 5,
    name: "Bento & Mini",
    bgColor: "#FF9800",
    icon: "🍱",
    items: bentoItems,
  },
  {
    id: 6,
    name: "Snacks",
    bgColor: "#FF5252",
    icon: "🍟",
    items: snackItems,
  },
  {
    id: 7,
    name: "Hot Coffee",
    bgColor: "#8B4513",
    icon: "☕",
    items: hotCoffeeItems,
  },
  {
    id: 8,
    name: "Iced Coffee",
    bgColor: "#025cca",
    icon: "🧊",
    items: icedCoffeeItems,
  },
  {
    id: 9,
    name: "Frappe",
    bgColor: "#8a2be2",
    icon: "🥤",
    items: frappeItems,
  },
  {
    id: 10,
    name: "Smoothies",
    bgColor: "#ff4081",
    icon: "🍓",
    items: smoothieItems,
  },
  {
    id: 11,
    name: "Iced Tea",
    bgColor: "#ff9800",
    icon: "🍹",
    items: icedTeaItems,
  },
  {
    id: 12,
    name: "Add-ons",
    bgColor: "#607D8B",
    icon: "➕",
    items: addOnsItems,
  },
];

// 🪑 Table Data
export const tables = [
  { id: 1, name: "Table 1", capacity: 4, status: "Available" },
  { id: 2, name: "Table 2", capacity: 2, status: "Occupied" },
  { id: 3, name: "Table 3", capacity: 6, status: "Reserved" },
  { id: 4, name: "Table 4", capacity: 4, status: "Available" },
  { id: 5, name: "Table 5", capacity: 2, status: "Cleaning" },
];

// 📦 Recent Orders
export const orders = [
  {
    id: 1,
    customer: "Juan Dela Cruz",
    item: "Longanisa Breakfast",
    quantity: 1,
    total: 119,
    status: "Completed",
  },
  {
    id: 2,
    customer: "Maria Santos",
    item: "Carbonara Pasta (Solo)",
    quantity: 1,
    total: 189,
    status: "Pending",
  },
  {
    id: 3,
    customer: "Carlos Reyes",
    item: "Regular Cheesecake Slice",
    quantity: 2,
    total: 460,
    status: "Preparing",
  },
  {
    id: 4,
    customer: "Ana Cruz",
    item: "Bento Combo",
    quantity: 1,
    total: 500,
    status: "Completed",
  },
  {
    id: 5,
    customer: "Mark Villanueva",
    item: "Tapa Breakfast with Coffee",
    quantity: 1,
    total: 199,
    status: "Pending",
  },
];

// ✅ Aliases for component compatibility
export const itemsData = popularDishes;
export const metricsData = menus;

// 🔄 Combined Cheesecakes (if needed for backward compatibility)
export const cheesecakes = [...regularCheesecakes, ...ketoCheesecakes];

// 🔄 Helper functions for cheesecake flavors
export const getAllCheesecakeFlavors = () => {
  const allFlavors = [];

  // Get flavors from regular cheesecakes
  regularCheesecakes.forEach((item) => {
    if (item.name.includes("Slice")) {
      item.variants.forEach((variant) => {
        if (variant.label !== "Slice") {
          allFlavors.push({
            name: variant.label,
            category: "Regular Cheesecake",
            price: variant.price,
          });
        }
      });
    }
  });

  // Get flavors from keto cheesecakes
  ketoCheesecakes.forEach((item) => {
    if (item.name.includes("Slice")) {
      item.variants.forEach((variant) => {
        if (variant.label !== "Slice") {
          allFlavors.push({
            name: variant.label,
            category: "Keto Cheesecake",
            price: variant.price,
          });
        }
      });
    }
  });

  return allFlavors;
};

// Get unique flavor names
export const cheesecakeFlavors = getAllCheesecakeFlavors();

// Function to check if an item is a Bento & Mini item
export const isBentoMiniItem = (item) => {
  return item.category === "Bento & Mini";
};

// Function to get all variants for a Bento item
export const getAllVariantsForBentoItem = (itemId) => {
  const item = bentoItems.find((item) => item.id === itemId);
  return item ? item.variants : [];
};

// Function to check if item has flavor selection
export const itemHasFlavorSelection = (item) => {
  return item.hasFlavorSelection || false;
};

// Function to check if item is a Snack item
export const isSnackItem = (item) => {
  return item.category === "Snacks";
};

// Function to get all Keto Mini flavors
export const getAllKetoMiniFlavors = () => {
  return ketoMiniFlavorOptions;
};

// Function to get Keto Mini item with flavors
export const getKetoMiniWithFlavors = () => {
  const ketoMiniItem = ketoCheesecakes.find(
    (item) => item.name === "Keto Cheesecake - Mini"
  );
  return ketoMiniItem || null;
};
