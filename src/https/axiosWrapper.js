import axios from "axios";

// 🚨 FORCE RENDER BACKEND - FIXED VERSION
const getApiBaseUrl = () => {
  // Priority 1: ALWAYS use Render backend in production
  if (import.meta.env.PROD) {
    return "https://delish-backend-1.onrender.com";
  }

  // Priority 2: Vite environment variable
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // Priority 3: Only use localhost in development
  return "http://localhost:8000";
};

const API_BASE_URL = getApiBaseUrl();

console.log("🚀 Environment:", import.meta.env.MODE);
console.log("🌐 Frontend URL:", window.location.origin);
console.log("🔗 Backend API:", API_BASE_URL);
console.log("📱 Production Mode:", import.meta.env.PROD);

// Create Axios instance with enhanced configuration
const axiosWrapper = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Request interceptor
axiosWrapper.interceptors.request.use(
  (config) => {
    console.log(`📤 ${config.method?.toUpperCase()} ${config.url}`);
    console.log(`🔗 Base URL: ${API_BASE_URL}`);

    // Add auth token if available
    const token = localStorage.getItem("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log("🔑 Token attached to request");
    } else {
      console.log("⚠️ No auth token found");
    }

    return config;
  },
  (error) => {
    console.error("❌ Request Error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor with enhanced error handling
axiosWrapper.interceptors.response.use(
  (response) => {
    console.log(`✅ ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url;
    const method = error.config?.method;

    console.error(`❌ API Error [${status}]:`, {
      method: method?.toUpperCase(),
      url: url,
      message: error.message,
      response: error.response?.data,
      backendUrl: API_BASE_URL,
    });

    // Enhanced error messages
    if (error.code === "NETWORK_ERROR" || error.code === "ECONNREFUSED") {
      error.userMessage =
        "Cannot connect to server. Please check:\n" +
        "• Backend server is running\n" +
        "• Network connectivity\n" +
        `• Backend URL: ${API_BASE_URL}`;
    } else if (status === 404) {
      error.userMessage = "Requested resource not found on server.";
    } else if (status === 500) {
      error.userMessage = "Server error. Please try again later.";
    } else if (status === 401) {
      error.userMessage = "Authentication failed. Please login again.";
      localStorage.removeItem("authToken");

      // 🚨 AUTO-REDIRECT TO LOGIN ON 401
      if (!window.location.pathname.includes("/login")) {
        console.log("🔐 Redirecting to login due to 401...");
        setTimeout(() => {
          window.location.href = "/login?session=expired";
        }, 1000);
      }
    } else if (status === 403) {
      error.userMessage = "Access denied. Insufficient permissions.";
    }

    return Promise.reject(error);
  }
);

// Enhanced connection test
const testConnection = async () => {
  try {
    console.log("🔍 Testing connection to:", API_BASE_URL);
    const response = await axiosWrapper.get("/health", {
      timeout: 15000,
      headers: { "Cache-Control": "no-cache" },
    });

    console.log("✅ Backend connection successful:", response.data);
    return {
      success: true,
      data: response.data,
      backend: API_BASE_URL,
      environment: import.meta.env.MODE,
    };
  } catch (error) {
    console.error("❌ Backend connection failed:", error.message);

    return {
      success: false,
      error: error.message,
      userMessage: error.userMessage,
      backendUrl: API_BASE_URL,
      frontendUrl: window.location.origin,
    };
  }
};

// 🚨 TEST FUNCTION - Run this in browser console to verify
export const debugBackendConnection = async () => {
  console.log("=== 🚨 BACKEND CONNECTION DEBUG ===");
  console.log("Frontend URL:", window.location.origin);
  console.log("Backend URL:", API_BASE_URL);
  console.log("Production Mode:", import.meta.env.PROD);
  console.log("VITE_API_URL:", import.meta.env.VITE_API_URL);
  console.log("Environment:", import.meta.env.MODE);

  const token = localStorage.getItem("authToken");
  console.log("Token exists:", !!token);
  if (token) {
    console.log("Token length:", token.length);
  }

  await testConnection();
  console.log("=== 🚨 DEBUG COMPLETE ===");
};

export {
  axiosWrapper as default,
  axiosWrapper,
  API_BASE_URL,
  testConnection,
  debugBackendConnection,
};
