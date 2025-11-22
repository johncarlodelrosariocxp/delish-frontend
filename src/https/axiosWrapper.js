import axios from "axios";

// 🌐 Smart API URL detection for both development and production
const getApiBaseUrl = () => {
  // Use VITE_API_URL if defined (set in Vercel environment variables)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // Auto-detect for local development and mobile access
  if (import.meta.env.DEV) {
    const currentHostname = window.location.hostname;

    // If accessing via IP address (mobile), use same IP for backend
    if (
      currentHostname !== "localhost" &&
      currentHostname !== "127.0.0.1" &&
      currentHostname.match(/^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$/)
    ) {
      return `http://${currentHostname}:8000`;
    }

    // Default local development
    return "http://localhost:8000";
  }

  // Production fallback - your deployed backend
  return "https://delish-backend-1.onrender.com";
};

const API_BASE_URL = getApiBaseUrl();

console.log("🚀 Environment:", import.meta.env.MODE);
console.log("🌐 Frontend:", window.location.origin);
console.log("🔗 Backend API:", API_BASE_URL);
console.log("📱 Mobile:", /Mobi|Android/i.test(navigator.userAgent));

// 🛠️ Create Axios instance
const axiosWrapper = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 30000, // Increased timeout for mobile networks
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// 🔄 Request interceptor
axiosWrapper.interceptors.request.use(
  (config) => {
    console.log(`📤 ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error("❌ Request Error:", error);
    return Promise.reject(error);
  }
);

// 🚨 Response interceptor with mobile-friendly error handling
axiosWrapper.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url;

    console.error(`❌ API Error [${status}]:`, error.message);

    // Enhanced mobile error handling
    if (error.code === "NETWORK_ERROR" || error.code === "ECONNREFUSED") {
      console.error("🌐 Network Error Details:");
      console.error("   Frontend URL:", window.location.origin);
      console.error("   Backend URL:", API_BASE_URL);
      console.error("   User Agent:", navigator.userAgent);

      // Provide user-friendly error message
      error.userMessage =
        "Cannot connect to server. Please check:\n" +
        "• Backend server is running\n" +
        "• Correct API URL configuration\n" +
        "• Network connectivity";
    }

    if (error.response?.status === 404) {
      error.userMessage =
        "Server endpoint not found. Please check backend deployment.";
    }

    if (error.response?.status === 500) {
      error.userMessage = "Server error. Please try again later.";
    }

    return Promise.reject(error);
  }
);

// Connection test with production support
const testConnection = async () => {
  try {
    console.log("🔍 Testing connection to:", API_BASE_URL);
    const response = await axiosWrapper.get("/health", { timeout: 10000 });
    console.log("✅ Backend connection successful");
    return { success: true, data: response.data };
  } catch (error) {
    console.error("❌ Backend connection failed");

    // Production vs development specific messages
    if (import.meta.env.PROD) {
      console.log("🔧 Production Fix:");
      console.log("   1. Check if backend is deployed to Render/Railway");
      console.log("   2. Verify CORS settings in backend");
      console.log("   3. Check backend logs for errors");
    } else {
      console.log("🔧 Development Fix:");
      console.log("   1. Run: cd delish-backend && npm start");
      console.log("   2. Check if backend is on port 8000");
      console.log("   3. For mobile: Use computer IP address");
    }

    return {
      success: false,
      error: error.message,
      userMessage: error.userMessage,
      code: error.code,
    };
  }
};

// ✅ EXPORT ALL REQUIRED VARIABLES
export { axiosWrapper as default, axiosWrapper, API_BASE_URL, testConnection };
