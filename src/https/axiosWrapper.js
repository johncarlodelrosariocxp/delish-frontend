// src/https/axiosWrapper.js
import axios from "axios";

// Automatically detect whether you're running in development or production
const isProd = import.meta.env.MODE === "production";

// ✅ Dynamically pick the base URL
// If VITE_API_URL is set in .env, it takes priority
const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (isProd
    ? "https://delish-backend-1.onrender.com" // Production (Render)
    : "http://localhost:8000"); // Local development

// ✅ Create axios instance with proper configuration
export const axiosWrapper = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Important for cookies/sessions
  timeout: 30000, // 30 second timeout
  headers: {
    "Content-Type": "application/json",
  },
});

// ✅ Request interceptor - Add auth token to every request
axiosWrapper.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      sessionStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    console.log(`🔄 API Call: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error("❌ Request Error:", error);
    return Promise.reject(error);
  }
);

// ✅ Response interceptor - Handle global errors and auto-logout
axiosWrapper.interceptors.response.use(
  (response) => {
    console.log(`✅ API Success: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    const { response } = error;
    const url = error.config?.url;

    console.error(
      `❌ API Error [${response?.status}]: ${url}`,
      error.response?.data || error.message
    );

    // Handle specific error cases
    if (response?.status === 401) {
      // Unauthorized - auto logout user
      console.log("🛑 401 Unauthorized - Auto logging out");

      // Clear all local storage
      localStorage.clear();
      sessionStorage.clear();

      // Clear cookies
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });

      // Redirect to login page after a short delay
      setTimeout(() => {
        if (!window.location.pathname.includes("/auth")) {
          window.location.href = "/auth";
        }
      }, 1000);
    }

    if (response?.status === 403) {
      console.log("🚫 403 Forbidden - Access denied");
    }

    if (response?.status === 404) {
      console.log("🔍 404 Not Found - API endpoint not found");
    }

    if (response?.status >= 500) {
      console.log("🔥 500+ Server Error - Backend issue");
    }

    // Network errors
    if (!response) {
      console.log("🌐 Network Error - Check internet connection or CORS");
    }

    return Promise.reject(error);
  }
);

// ✅ Export the base URL for use in other files if needed
export { API_BASE_URL };
