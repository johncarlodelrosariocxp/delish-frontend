import axios from "axios";

// 🌐 Smart API URL detection for both development and production
const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  if (import.meta.env.DEV) {
    const currentHostname = window.location.hostname;
    if (
      currentHostname !== "localhost" &&
      currentHostname !== "127.0.0.1" &&
      currentHostname.match(/^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$/)
    ) {
      return `http://${currentHostname}:8000`;
    }
    return "http://localhost:8000";
  }

  return "https://delish-backend-1.onrender.com";
};

const API_BASE_URL = getApiBaseUrl();

console.log("🚀 Environment:", import.meta.env.MODE);
console.log("🌐 Frontend:", window.location.origin);
console.log("🔗 Backend API:", API_BASE_URL);

// 🛠️ Create Axios instance
const axiosWrapper = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false, // ⚠️ CHANGE TO FALSE for production
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// 🔐 AUTH INTERCEPTOR - ADD THIS CRITICAL PART
axiosWrapper.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token =
      localStorage.getItem("authToken") ||
      localStorage.getItem("token") ||
      sessionStorage.getItem("authToken");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log(
        `🔐 Adding auth token to ${config.method?.toUpperCase()} ${config.url}`
      );
    } else {
      console.warn(
        `⚠️ No auth token found for ${config.method?.toUpperCase()} ${
          config.url
        }`
      );
      // Don't redirect here, let the component handle it
    }

    console.log(`📤 ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error("❌ Request Error:", error);
    return Promise.reject(error);
  }
);

// 🚨 Enhanced Response interceptor
axiosWrapper.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url;

    console.error(`❌ API Error [${status}]:`, error.message);

    // Handle 401 Unauthorized specifically
    if (status === 401) {
      console.error("🔐 Authentication failed - clearing token");

      // Clear invalid token
      localStorage.removeItem("authToken");
      localStorage.removeItem("token");
      sessionStorage.removeItem("authToken");

      // Only redirect if not already on login page
      if (!window.location.pathname.includes("/login")) {
        setTimeout(() => {
          window.location.href = "/login";
        }, 2000);
      }

      error.userMessage = "Your session has expired. Please login again.";
    }

    // Handle network errors
    if (error.code === "NETWORK_ERROR" || error.code === "ECONNREFUSED") {
      console.error("🌐 Network Error - Possible CORS issue");
      error.userMessage =
        "Cannot connect to server. Please check backend is running.";
    }

    return Promise.reject(error);
  }
);

// Connection test
const testConnection = async () => {
  try {
    console.log("🔍 Testing connection to:", API_BASE_URL);
    const response = await axiosWrapper.get("/health", { timeout: 10000 });
    console.log("✅ Backend connection successful");
    return { success: true, data: response.data };
  } catch (error) {
    console.error("❌ Backend connection failed:", error.message);
    return {
      success: false,
      error: error.message,
      userMessage: error.userMessage,
      code: error.code,
    };
  }
};

// ✅ Auth helper functions
export const isAuthenticated = () => {
  const token =
    localStorage.getItem("authToken") || localStorage.getItem("token");
  return !!token;
};

export const setAuthToken = (token) => {
  localStorage.setItem("authToken", token);
  console.log("🔐 Auth token saved");
};

export const removeAuthToken = () => {
  localStorage.removeItem("authToken");
  localStorage.removeItem("token");
  sessionStorage.removeItem("authToken");
  console.log("🔐 Auth tokens cleared");
};

export { axiosWrapper as default, axiosWrapper, API_BASE_URL, testConnection };
