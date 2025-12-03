import axios from "axios";

// ✅ PRODUCTION BACKEND URL (Render)
const API_BASE_URL = "https://delish-backend-1.onrender.com";

// Get current frontend URL
const FRONTEND_URL = window.location.origin;
const IS_VERCEL = FRONTEND_URL.includes("vercel.app");

console.log("🚀 Frontend Platform:", IS_VERCEL ? "Vercel" : "Local");
console.log("📍 Frontend URL:", FRONTEND_URL);
console.log("🔗 Backend URL:", API_BASE_URL);

// ✅ Create Axios instance with safe configuration
const axiosWrapper = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false, // Must be false for Vercel → Render
  timeout: 30000, // 30 seconds for Render free tier
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// ✅ Safe request interceptor (NO UNSAFE HEADERS)
axiosWrapper.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // ✅ SAFE headers only - browsers block Origin and Referer
    if (IS_VERCEL) {
      config.headers["X-Frontend-Source"] = "vercel";
      config.headers["X-Frontend-URL"] = FRONTEND_URL;
    }

    console.log(`📤 ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error("❌ Request Error:", error);
    return Promise.reject(error);
  }
);

// ✅ Response interceptor
axiosWrapper.interceptors.response.use(
  (response) => {
    console.log(`✅ ${response.status} ${response.config.url}`);

    // Auto-save token from auth responses
    if (response.data?.token) {
      localStorage.setItem("authToken", response.data.token);
    } else if (response.data?.data?.token) {
      localStorage.setItem("authToken", response.data.data.token);
    }

    return response;
  },
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url;

    console.error(`❌ API Error [${status}]:`, error.message);
    console.error("URL:", url);

    // Handle network/CORS errors
    if (
      error.code === "ERR_NETWORK" ||
      error.code === "ECONNREFUSED" ||
      error.message.includes("CORS")
    ) {
      console.error("🌐 Network/CORS Issue Detected!");
      console.error("Frontend:", FRONTEND_URL);
      console.error("Backend:", API_BASE_URL);

      error.userMessage = `Connection failed. Please check:
      1. Backend server is running (${API_BASE_URL})
      2. CORS is configured on backend
      3. Network connection is stable`;
    }

    // Clear token on 401
    if (status === 401) {
      localStorage.removeItem("authToken");
      if (!window.location.pathname.includes("/login")) {
        setTimeout(() => {
          window.location.href = "/login";
        }, 1000);
      }
    }

    return Promise.reject(error);
  }
);

// ✅ Test backend connection
const testBackendConnection = async () => {
  try {
    console.log("🔍 Testing connection to Render...");

    const response = await fetch(API_BASE_URL, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    const success = response.ok;
    console.log(success ? "✅ Backend reachable" : "❌ Backend not reachable");

    return {
      success,
      status: response.status,
      frontend: FRONTEND_URL,
      backend: API_BASE_URL,
    };
  } catch (error) {
    console.error("❌ Connection test failed:", error.message);

    return {
      success: false,
      error: error.message,
      frontend: FRONTEND_URL,
      backend: API_BASE_URL,
    };
  }
};

// ✅ Auth helper functions
const isAuthenticated = () => !!localStorage.getItem("authToken");
const getAuthToken = () => localStorage.getItem("authToken");
const setAuthToken = (token) => localStorage.setItem("authToken", token);
const removeAuthToken = () => localStorage.removeItem("authToken");

// ✅ Quick connection test on page load
if (typeof window !== "undefined") {
  setTimeout(() => {
    if (IS_VERCEL && window.location.pathname === "/login") {
      testBackendConnection().then((result) => {
        if (!result.success) {
          console.warn("⚠️  Backend connection issue detected");
        }
      });
    }
  }, 2000);
}

// ✅ SINGLE EXPORT SECTION - No duplicate exports
export default axiosWrapper;
export {
  axiosWrapper,
  API_BASE_URL,
  testBackendConnection,
  isAuthenticated,
  getAuthToken,
  setAuthToken,
  removeAuthToken,
};
