// src/https/axiosWrapper.js
import axios from "axios";

// 🌐 Detect environment mode
const isProd = import.meta.env.MODE === "production";

// 🔧 Dynamically resolve API base URL
const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (isProd
    ? "https://delish-backend-1.onrender.com" // Production fallback
    : "http://localhost:8000"); // Local development

// 🛠️ Create Axios instance
export const axiosWrapper = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Include cookies/session tokens if needed
});

// 🧠 Optional: Log missing env variable for debugging
if (!import.meta.env.VITE_API_URL) {
  console.warn(
    `[axiosWrapper] VITE_API_URL not set. Using fallback: ${API_BASE_URL}`
  );
}

// 🚨 Global error interceptor
axiosWrapper.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data || error.message;
    console.error("API Error:", message);
    return Promise.reject(error);
  }
);
