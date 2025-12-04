// 🍰 Cheesecake flavor options (shared across categories)
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

// Additional Keto Mini flavors (from image: Lemon, Queso de Bola, Dark Chocolate, New York, Coffee)
export const ketoMiniFlavorOptions = [
  { label: "Lemon", price: 160 },
  { label: "Queso de Bola", price: 160 },
  { label: "Dark Chocolate", price: 160 },
  { label: "New York", price: 160 },
  { label: "Coffee", price: 160 },
];

// 🍳 All-Day Breakfast (Updated from image)
export const breakfastItems = [
  {
    id: 1,
    name: "Omelette",
    category: "Breakfast",
    variants: [
      { label: "Regular", price: 119 },
      { label: "With Brewed Coffee", price: 149 },
    ],
  },
  {
    id: 2,
    name: "Pork Shanghai",
    category: "Breakfast",
    variants: [
      { label: "Regular", price: 159 },
      { label: "With Brewed Coffee", price: 189 },
    ],
  },
  {
    id: 3,
    name: "Longganisa",
    category: "Breakfast",
    variants: [
      { label: "Regular", price: 149 },
      { label: "With Brewed Coffee", price: 179 },
    ],
  },
  {
    id: 4,
    name: "Bangus Shanghai",
    category: "Breakfast",
    variants: [
      { label: "Regular", price: 159 },
      { label: "With Brewed Coffee", price: 189 },
    ],
  },
  {
    id: 5,
    name: "Spam",
    category: "Breakfast",
    variants: [
      { label: "Regular", price: 149 },
      { label: "With Brewed Coffee", price: 179 },
    ],
  },
  {
    id: 6,
    name: "Embutido",
    category: "Breakfast",
    variants: [
      { label: "Regular", price: 159 },
      { label: "With Brewed Coffee", price: 189 },
    ],
  },
  {
    id: 7,
    name: "Hungarian",
    category: "Breakfast",
    variants: [
      { label: "Regular", price: 149 },
      { label: "With Brewed Coffee", price: 179 },
    ],
  },
  {
    id: 8,
    name: "Tapa",
    category: "Breakfast",
    variants: [
      { label: "Regular", price: 149 },
      { label: "With Brewed Coffee", price: 179 },
    ],
  },
  {
    id: 9,
    name: "Pork Tocino",
    category: "Breakfast",
    variants: [
      { label: "Regular", price: 149 },
      { label: "With Brewed Coffee", price: 179 },
    ],
  },
  {
    id: 10,
    name: "Bacon",
    category: "Breakfast",
    variants: [
      { label: "Regular", price: 149 },
      { label: "With Brewed Coffee", price: 179 },
    ],
  },
  {
    id: 11,
    name: "Keto Pandesal",
    category: "Breakfast",
    variants: [{ label: "With bacon and egg", price: 199 }],
  },
  {
    id: 12,
    name: "Rice",
    category: "Breakfast",
    variants: [{ label: "Regular", price: 25 }],
  },
  {
    id: 13,
    name: "Egg",
    category: "Breakfast",
    variants: [{ label: "Regular", price: 15 }],
  },
];

// 🍝 Pasta (Updated from image)
export const pastaItems = [
  {
    id: 1,
    name: "Carbonara",
    category: "Pasta",
    variants: [
      { label: "Solo", price: 189 },
      { label: "Tray", price: 600 },
    ],
  },
  {
    id: 2,
    name: "Pesto",
    category: "Pasta",
    variants: [
      { label: "Solo", price: 189 },
      { label: "Tray", price: 600 },
    ],
  },
];

// 🍰 Regular Cheesecakes (Updated from image)
export const regularCheesecakes = [
  {
    id: 1,
    name: "Regular Cheesecake - Whole",
    category: "Cheesecake",
    variants: [{ label: "Whole", price: 2200 }],
  },
  {
    id: 2,
    name: "Regular Cheesecake - Pinwheel",
    category: "Cheesecake",
    variants: [{ label: "Pinwheel", price: 2300 }],
  },
  {
    id: 3,
    name: "Regular Cheesecake - Slice",
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
    id: 4,
    name: "Regular Cheesecake - Can",
    category: "Cheesecake",
    variants: [{ label: "Can", price: 750 }],
  },
  {
    id: 5,
    name: "Regular Cheesecake - Mini",
    category: "Cheesecake",
    variants: [{ label: "Mini / pc", price: 85 }],
  },
  {
    id: 6,
    name: "Regular Cheesecake - Box of Minis (4s)",
    category: "Cheesecake",
    variants: [{ label: "Box", price: 350 }],
  },
  {
    id: 7,
    name: "Regular Cheesecake - Box of Minis (6s)",
    category: "Cheesecake",
    variants: [{ label: "Box", price: 450 }],
  },
  {
    id: 8,
    name: "Regular Cheesecake - Bento",
    category: "Cheesecake",
    variants: [{ label: "Bento", price: 350 }],
  },
  {
    id: 9,
    name: "Regular Cheesecake - Bento Combo",
    category: "Cheesecake",
    variants: [{ label: "Bento Combo", price: 500 }],
  },
];

// 🍰 Keto Cheesecakes (Updated from image)
export const ketoCheesecakes = [
  {
    id: 1,
    name: "Keto Cheesecake - Whole",
    category: "Keto Cheesecake",
    variants: [{ label: "Whole", price: 3200 }],
  },
  {
    id: 2,
    name: "Keto Cheesecake - Pinwheel",
    category: "Keto Cheesecake",
    variants: [{ label: "Pinwheel", price: 3400 }],
  },
  {
    id: 3,
    name: "Keto Cheesecake - Slices",
    category: "Keto Cheesecake",
    variants: [
      { label: "Slice", price: 330, type: "base" },
      ...cheesecakeFlavorOptions.map((flavor) => ({
        ...flavor,
        type: "flavor",
        baseLabel: "Slice",
        basePrice: 330,
        totalPrice: flavor.price,
      })),
    ],
  },
  {
    id: 4,
    name: "Keto Cheesecake - Can",
    category: "Keto Cheesecake",
    variants: [{ label: "Can", price: 1200 }],
  },
  {
    id: 5,
    name: "Keto Cheesecake - Mini",
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
    id: 6,
    name: "Keto Cheesecake - Box of Minis (6s)",
    category: "Keto Cheesecake",
    variants: [{ label: "Box", price: 900 }],
  },
];

// 🍱 Bento & Mini Items - ALL with flavor selection
export const bentoItems = [
  // Bento Combo - Regular base with all flavor options
  {
    id: 1,
    name: "Bento Combo",
    category: "Bento & Mini",
    hasFlavorSelection: true,
    baseOptions: [{ label: "Regular", price: 500, type: "size" }],
    variants: [
      { label: "Regular", price: 500, type: "base", hasFlavors: true },
      ...cheesecakeFlavorOptions.map((flavor) => ({
        ...flavor,
        type: "flavor",
        baseLabel: "Regular",
        basePrice: 500,
        description: `Bento Combo (Regular) with ${flavor.label} flavor`,
        totalPrice: 500 + (flavor.price - 220),
      })),
    ],
  },

  // Bento - Single base with all flavor options
  {
    id: 2,
    name: "Bento",
    category: "Bento & Mini",
    hasFlavorSelection: true,
    baseOptions: [{ label: "Single", price: 350, type: "size" }],
    variants: [
      { label: "Single", price: 350, type: "base", hasFlavors: true },
      ...cheesecakeFlavorOptions.map((flavor) => ({
        ...flavor,
        type: "flavor",
        baseLabel: "Single",
        basePrice: 350,
        description: `Bento (Single) with ${flavor.label} flavor`,
        totalPrice: 350 + (flavor.price - 220),
      })),
    ],
  },

  // Mini Box 6s - Box base with all flavor options
  {
    id: 3,
    name: "Mini Box 6s",
    category: "Bento & Mini",
    hasFlavorSelection: true,
    baseOptions: [{ label: "Box", price: 450, type: "size" }],
    variants: [
      { label: "Box", price: 450, type: "base", hasFlavors: true },
      ...cheesecakeFlavorOptions.map((flavor) => ({
        ...flavor,
        type: "flavor",
        baseLabel: "Box",
        basePrice: 450,
        description: `Mini Box 6s (Box) with ${flavor.label} flavor`,
        totalPrice: 450 + (flavor.price - 220),
      })),
    ],
  },

  // Mini Box 4s - Box base with all flavor options
  {
    id: 4,
    name: "Mini Box 4s",
    category: "Bento & Mini",
    hasFlavorSelection: true,
    baseOptions: [{ label: "Box", price: 350, type: "size" }],
    variants: [
      { label: "Box", price: 350, type: "base", hasFlavors: true },
      ...cheesecakeFlavorOptions.map((flavor) => ({
        ...flavor,
        type: "flavor",
        baseLabel: "Box",
        basePrice: 350,
        description: `Mini Box 4s (Box) with ${flavor.label} flavor`,
        totalPrice: 350 + (flavor.price - 220),
      })),
    ],
  },

  // Mini Cake - Single base with all flavor options
  {
    id: 5,
    name: "Mini Cake",
    category: "Bento & Mini",
    hasFlavorSelection: true,
    baseOptions: [{ label: "Single", price: 85, type: "size" }],
    variants: [
      { label: "Single", price: 85, type: "base", hasFlavors: true },
      ...cheesecakeFlavorOptions.map((flavor) => ({
        ...flavor,
        type: "flavor",
        baseLabel: "Single",
        basePrice: 85,
        description: `Mini Cake (Single) with ${flavor.label} flavor`,
        totalPrice: 85 + (flavor.price - 220),
      })),
    ],
  },
];

// 🍟 Snacks (Updated from image)
export const snackItems = [
  {
    id: 1,
    name: "Potato Wedges",
    category: "Snacks",
    variants: [{ label: "Regular", price: 119 }],
  },
  {
    id: 2,
    name: "Nachos",
    category: "Snacks",
    variants: [{ label: "Regular", price: 249 }],
  },
];

// ☕ Hot Coffee (Updated from image)
export const hotCoffeeItems = [
  {
    id: 1,
    name: "Brewed Coffee",
    category: "Hot Coffee",
    variants: [
      { label: "12oz", price: 75 },
      { label: "16oz", price: 90 },
    ],
  },
  {
    id: 2,
    name: "Americano",
    category: "Hot Coffee",
    variants: [
      { label: "12oz", price: 90 },
      { label: "16oz", price: 105 },
    ],
  },
  {
    id: 3,
    name: "Cappuccino",
    category: "Hot Coffee",
    variants: [
      { label: "12oz", price: 115 },
      { label: "16oz", price: 130 },
    ],
  },
  {
    id: 4,
    name: "Cafe Latte",
    category: "Hot Coffee",
    variants: [
      { label: "12oz", price: 115 },
      { label: "16oz", price: 130 },
    ],
  },
  {
    id: 5,
    name: "Vanilla Latte",
    category: "Hot Coffee",
    variants: [
      { label: "12oz", price: 125 },
      { label: "16oz", price: 140 },
    ],
  },
  {
    id: 6,
    name: "Hazelnut Latte",
    category: "Hot Coffee",
    variants: [
      { label: "12oz", price: 125 },
      { label: "16oz", price: 140 },
    ],
  },
  {
    id: 7,
    name: "Caramel Macchiato",
    category: "Hot Coffee",
    variants: [
      { label: "12oz", price: 140 },
      { label: "16oz", price: 155 },
    ],
  },
  {
    id: 8,
    name: "Cafe Mocha",
    category: "Hot Coffee",
    variants: [
      { label: "12oz", price: 140 },
      { label: "16oz", price: 155 },
    ],
  },
  {
    id: 9,
    name: "White Mocha",
    category: "Hot Coffee",
    variants: [
      { label: "12oz", price: 140 },
      { label: "16oz", price: 155 },
    ],
  },
  {
    id: 10,
    name: "Strawberry Macchiato",
    category: "Hot Coffee",
    variants: [
      { label: "12oz", price: 140 },
      { label: "16oz", price: 155 },
    ],
  },
  {
    id: 11,
    name: "Hazelnut Macchiato",
    category: "Hot Coffee",
    variants: [
      { label: "12oz", price: 140 },
      { label: "16oz", price: 155 },
    ],
  },
  {
    id: 12,
    name: "Matcha Latte",
    category: "Hot Coffee",
    variants: [
      { label: "12oz", price: 130 },
      { label: "16oz", price: 145 },
    ],
  },
  {
    id: 13,
    name: "Spanish Latte",
    category: "Hot Coffee",
    variants: [
      { label: "12oz", price: 140 },
      { label: "16oz", price: 155 },
    ],
  },
  {
    id: 14,
    name: "Delish Signature",
    category: "Hot Coffee",
    variants: [
      { label: "12oz", price: 140 },
      { label: "16oz", price: 155 },
    ],
  },
  {
    id: 15,
    name: "Biscoff Latte",
    category: "Hot Coffee",
    variants: [
      { label: "12oz", price: 140 },
      { label: "16oz", price: 155 },
    ],
  },
  {
    id: 16,
    name: "Strawberry Milk",
    category: "Hot Coffee",
    variants: [
      { label: "12oz", price: 125 },
      { label: "16oz", price: 140 },
    ],
  },
  {
    id: 17,
    name: "Choco",
    category: "Hot Coffee",
    variants: [
      { label: "12oz", price: 115 },
      { label: "16oz", price: 130 },
    ],
  },
  {
    id: 18,
    name: "White Choco",
    category: "Hot Coffee",
    variants: [
      { label: "12oz", price: 115 },
      { label: "16oz", price: 130 },
    ],
  },
];

// 🧊 Iced Coffee (Updated from image)
export const icedCoffeeItems = [
  {
    id: 1,
    name: "Americano",
    category: "Iced Coffee",
    variants: [
      { label: "16oz", price: 105 },
      { label: "22oz", price: 120 },
    ],
  },
  {
    id: 2,
    name: "Cafe Latte",
    category: "Iced Coffee",
    variants: [
      { label: "16oz", price: 130 },
      { label: "22oz", price: 145 },
    ],
  },
  {
    id: 3,
    name: "Vanilla Latte",
    category: "Iced Coffee",
    variants: [
      { label: "16oz", price: 140 },
      { label: "22oz", price: 155 },
    ],
  },
  {
    id: 4,
    name: "Hazelnut Latte",
    category: "Iced Coffee",
    variants: [
      { label: "16oz", price: 140 },
      { label: "22oz", price: 155 },
    ],
  },
  {
    id: 5,
    name: "Caramel Macchiato",
    category: "Iced Coffee",
    variants: [
      { label: "16oz", price: 155 },
      { label: "22oz", price: 170 },
    ],
  },
  {
    id: 6,
    name: "Cafe Mocha",
    category: "Iced Coffee",
    variants: [
      { label: "16oz", price: 155 },
      { label: "22oz", price: 170 },
    ],
  },
  {
    id: 7,
    name: "White Mocha",
    category: "Iced Coffee",
    variants: [
      { label: "16oz", price: 155 },
      { label: "22oz", price: 170 },
    ],
  },
  {
    id: 8,
    name: "Strawberry Macchiato",
    category: "Iced Coffee",
    variants: [
      { label: "16oz", price: 155 },
      { label: "22oz", price: 170 },
    ],
  },
  {
    id: 9,
    name: "Hazelnut Macchiato",
    category: "Iced Coffee",
    variants: [
      { label: "16oz", price: 155 },
      { label: "22oz", price: 170 },
    ],
  },
  {
    id: 10,
    name: "Matcha Latte",
    category: "Iced Coffee",
    variants: [
      { label: "16oz", price: 145 },
      { label: "22oz", price: 160 },
    ],
  },
  {
    id: 11,
    name: "Spanish Latte",
    category: "Iced Coffee",
    variants: [
      { label: "16oz", price: 155 },
      { label: "22oz", price: 170 },
    ],
  },
  {
    id: 12,
    name: "Delish Signature",
    category: "Iced Coffee",
    variants: [
      { label: "16oz", price: 155 },
      { label: "22oz", price: 170 },
    ],
  },
  {
    id: 13,
    name: "Biscoff Latte",
    category: "Iced Coffee",
    variants: [
      { label: "16oz", price: 155 },
      { label: "22oz", price: 170 },
    ],
  },
  {
    id: 14,
    name: "Strawberry Milk",
    category: "Iced Coffee",
    variants: [
      { label: "16oz", price: 140 },
      { label: "22oz", price: 155 },
    ],
  },
  {
    id: 15,
    name: "Choco",
    category: "Iced Coffee",
    variants: [
      { label: "16oz", price: 130 },
      { label: "22oz", price: 145 },
    ],
  },
  {
    id: 16,
    name: "White Choco",
    category: "Iced Coffee",
    variants: [
      { label: "16oz", price: 130 },
      { label: "22oz", price: 145 },
    ],
  },
];

// 🧊 Frappe (Updated from image)
export const frappeItems = [
  {
    id: 1,
    name: "Espresso Blended",
    category: "Frappe",
    variants: [
      { label: "16oz", price: 155 },
      { label: "22oz", price: 170 },
    ],
  },
  {
    id: 2,
    name: "Hazelnut",
    category: "Frappe",
    variants: [
      { label: "16oz", price: 160 },
      { label: "22oz", price: 175 },
    ],
  },
  {
    id: 3,
    name: "Caramel",
    category: "Frappe",
    variants: [
      { label: "16oz", price: 175 },
      { label: "22oz", price: 190 },
    ],
  },
  {
    id: 4,
    name: "Mocha",
    category: "Frappe",
    variants: [
      { label: "16oz", price: 175 },
      { label: "22oz", price: 190 },
    ],
  },
  {
    id: 5,
    name: "White Mocha",
    category: "Frappe",
    variants: [
      { label: "16oz", price: 175 },
      { label: "22oz", price: 190 },
    ],
  },
  {
    id: 6,
    name: "Biscoff",
    category: "Frappe",
    variants: [
      { label: "16oz", price: 180 },
      { label: "22oz", price: 195 },
    ],
  },
  {
    id: 7,
    name: "Vanilla Cream",
    category: "Frappe",
    variants: [
      { label: "16oz", price: 155 },
      { label: "22oz", price: 170 },
    ],
  },
  {
    id: 8,
    name: "Ube",
    category: "Frappe",
    variants: [
      { label: "16oz", price: 160 },
      { label: "22oz", price: 185 },
    ],
  },
  {
    id: 9,
    name: "Caramel Cream",
    category: "Frappe",
    variants: [
      { label: "16oz", price: 165 },
      { label: "22oz", price: 180 },
    ],
  },
  {
    id: 10,
    name: "Choco Cream",
    category: "Frappe",
    variants: [
      { label: "16oz", price: 165 },
      { label: "22oz", price: 180 },
    ],
  },
  {
    id: 11,
    name: "Choco Hazelnut",
    category: "Frappe",
    variants: [
      { label: "16oz", price: 165 },
      { label: "22oz", price: 180 },
    ],
  },
  {
    id: 12,
    name: "Oreo",
    category: "Frappe",
    variants: [
      { label: "16oz", price: 165 },
      { label: "22oz", price: 180 },
    ],
  },
  {
    id: 13,
    name: "Matcha",
    category: "Frappe",
    variants: [
      { label: "16oz", price: 165 },
      { label: "22oz", price: 180 },
    ],
  },
  {
    id: 14,
    name: "Choco Chip",
    category: "Frappe",
    variants: [
      { label: "16oz", price: 160 },
      { label: "22oz", price: 175 },
    ],
  },
  {
    id: 15,
    name: "Biscoff Cream",
    category: "Frappe",
    variants: [
      { label: "16oz", price: 175 },
      { label: "22oz", price: 190 },
    ],
  },
];

// 🍓 Smoothies (Updated from image)
export const smoothieItems = [
  {
    id: 1,
    name: "Mango",
    category: "Smoothie",
    variants: [
      { label: "16oz", price: 185 },
      { label: "22oz", price: 200 },
    ],
  },
  {
    id: 2,
    name: "Strawberry",
    category: "Smoothie",
    variants: [
      { label: "16oz", price: 185 },
      { label: "22oz", price: 200 },
    ],
  },
  {
    id: 3,
    name: "Strawberry-Mango",
    category: "Smoothie",
    variants: [
      { label: "16oz", price: 185 },
      { label: "22oz", price: 200 },
    ],
  },
];

// 🍹 Iced Tea
export const icedTeaItems = [
  {
    id: 1,
    name: "Red Iced Tea",
    category: "Iced Tea",
    variants: [
      { label: "16oz", price: 70 },
      { label: "22oz", price: 85 },
    ],
  },
  {
    id: 2,
    name: "Honey Peach",
    category: "Iced Tea",
    variants: [
      { label: "16oz", price: 150 },
      { label: "22oz", price: 165 },
    ],
  },
  {
    id: 3,
    name: "Honey Lemon",
    category: "Iced Tea",
    variants: [
      { label: "16oz", price: 150 },
      { label: "22oz", price: 165 },
    ],
  },
];

// ➕ Add-ons Category (Coffee Add-ons from the drinks menu)
export const addOnsItems = [
  {
    id: 1,
    name: "Add Shot",
    category: "Add-ons",
    variants: [{ label: "Single", price: 30 }],
  },
  {
    id: 2,
    name: "Soy Milk",
    category: "Add-ons",
    variants: [{ label: "Substitute", price: 35 }],
  },
  {
    id: 3,
    name: "Almond Milk",
    category: "Add-ons",
    variants: [{ label: "Substitute", price: 45 }],
  },
  {
    id: 4,
    name: "Oat Milk",
    category: "Add-ons",
    variants: [{ label: "Substitute", price: 35 }],
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
    name: "Snacks",
    bgColor: "#FF5252",
    icon: "🍟",
    items: snackItems,
  },
  {
    id: 4,
    name: "Regular Cheesecakes",
    bgColor: "#f6b100",
    icon: "🍰",
    items: regularCheesecakes,
  },
  {
    id: 5,
    name: "Keto Cheesecakes",
    bgColor: "#9C27B0",
    icon: "🥑",
    items: ketoCheesecakes,
  },
  {
    id: 6,
    name: "Bento & Mini",
    bgColor: "#FF9800",
    icon: "🍱",
    items: bentoItems,
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
    item: "Longganisa Breakfast",
    quantity: 1,
    total: 149,
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
    total: 179,
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
    if (item.name.includes("Slices")) {
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

// 🛍️ Popular Dishes (sample data - adjust as needed)
export const popularDishes = [
  {
    id: 1,
    name: "Longganisa Breakfast",
    numberOfOrders: 150,
  },
  {
    id: 2,
    name: "Tapa Breakfast",
    numberOfOrders: 140,
  },
  {
    id: 3,
    name: "Carbonara Pasta",
    numberOfOrders: 135,
  },
  {
    id: 4,
    name: "Regular Cheesecake Slice",
    numberOfOrders: 120,
  },
  {
    id: 5,
    name: "Bento Combo",
    numberOfOrders: 110,
  },
  {
    id: 6,
    name: "Keto Cheesecake Slice",
    numberOfOrders: 100,
  },
  {
    id: 7,
    name: "Caramel Frappe",
    numberOfOrders: 180,
  },
  {
    id: 8,
    name: "Spanish Latte",
    numberOfOrders: 200,
  },
];
