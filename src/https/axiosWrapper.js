// src/https/axiosWrapper.js
import axios from "axios";

// Automatically detect whether you’re running in development or production
const isProd = import.meta.env.MODE === "production";

// ✅ Dynamically pick the base URL
// If VITE_API_URL is set in .env, it takes priority
const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (isProd
    ? "https://delish-backend-1.onrender.com" // Production (Render)
    : "http://localhost:8000"); // Local development

// ✅ Create axios instance
export const axiosWrapper = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // include cookies or session tokens if needed
});

// Optional: Add global error logging
axiosWrapper.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", error.response?.data || error.message);
    return Promise.reject(error);
  }
);
