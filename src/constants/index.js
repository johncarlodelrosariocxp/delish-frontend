// 🍰 Image Imports
import cheesecake1 from "../assets/images/cheesecake1.jpg";
import cheesecake2 from "../assets/images/cheesecake2.jpg";
import cheesecake3 from "../assets/images/cheesecake3.jpg";
import cheesecake4 from "../assets/images/cheesecake4.jpg";
import cheesecake5 from "../assets/images/cheesecake5.jpg";
import cheesecake6 from "../assets/images/cheesecake6.jpg";
import combo1 from "../assets/images/combo1.jpg";
import coffee from "../assets/images/coffee.jpg";

// 🛍️ Popular Dishes
export const popularDishes = [
  { id: 1, image: cheesecake1, name: "Cheesecake 1", numberOfOrders: 120 },
  { id: 2, image: cheesecake2, name: "Cheesecake 2", numberOfOrders: 95 },
  { id: 3, image: cheesecake3, name: "Cheesecake 3", numberOfOrders: 110 },
  { id: 4, image: cheesecake4, name: "Cheesecake 4", numberOfOrders: 130 },
  { id: 5, image: cheesecake5, name: "Cheesecake 5", numberOfOrders: 105 },
  { id: 6, image: cheesecake6, name: "Cheesecake 6", numberOfOrders: 90 },
  { id: 7, image: combo1, name: "Combo 1", numberOfOrders: 150 },
  { id: 8, image: coffee, name: "Coffee", numberOfOrders: 200 },
];

// 🍰 Cheesecakes
export const cheesecakes = [
  {
    id: 1,
    name: "Cheesecake 1",
    image: cheesecake1,
    price: 180,
    category: "Dessert",
  },
  {
    id: 2,
    name: "Cheesecake 2",
    image: cheesecake2,
    price: 190,
    category: "Dessert",
  },
  {
    id: 3,
    name: "Cheesecake 3",
    image: cheesecake3,
    price: 200,
    category: "Dessert",
  },
  {
    id: 4,
    name: "Cheesecake 4",
    image: cheesecake4,
    price: 210,
    category: "Dessert",
  },
  {
    id: 5,
    name: "Cheesecake 5",
    image: cheesecake5,
    price: 220,
    category: "Dessert",
  },
  {
    id: 6,
    name: "Cheesecake 6",
    image: cheesecake6,
    price: 230,
    category: "Dessert",
  },
];

// 🍱 Combo Meals
export const comboItems = [
  { id: 1, name: "Combo 1", image: combo1, price: 350, category: "Combo" },
];

// ☕ Coffee
export const coffeeItems = [
  { id: 1, name: "Coffee", image: coffee, price: 120, category: "Beverage" },
];

// 📊 Menu Sections
export const menus = [
  {
    id: 1,
    name: "Cheesecakes",
    bgColor: "#f6b100",
    icon: "🍰",
    items: cheesecakes,
  },
  {
    id: 2,
    name: "Combo Meals",
    bgColor: "#02ca3a",
    icon: "🍱",
    items: comboItems,
  },
  {
    id: 3,
    name: "Coffee",
    bgColor: "#025cca",
    icon: "☕",
    items: coffeeItems,
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
    item: "Cheesecake 3",
    quantity: 2,
    total: 400,
    status: "Completed",
  },
  {
    id: 2,
    customer: "Maria Santos",
    item: "Coffee",
    quantity: 1,
    total: 120,
    status: "Pending",
  },
  {
    id: 3,
    customer: "Carlos Reyes",
    item: "Combo 1",
    quantity: 1,
    total: 350,
    status: "Preparing",
  },
];

// ✅ Aliases for component compatibility (must come last!)
export const itemsData = popularDishes;
export const metricsData = menus;
