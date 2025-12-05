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

    // ✅ Use lowercase headers to match CORS configuration
    if (IS_VERCEL) {
      config.headers["x-frontend-source"] = "vercel";
      config.headers["x-frontend-url"] = FRONTEND_URL;
      // Also include uppercase for compatibility
      config.headers["X-Frontend-Source"] = "vercel";
      config.headers["X-Frontend-URL"] = FRONTEND_URL;
    }

    // Log request details
    console.log(`📤 ${config.method?.toUpperCase()} ${config.url}`);
    console.log("Headers:", config.headers);

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
    console.log("Response headers:", response.headers);

    // Auto-save token from auth responses
    if (response.data?.token) {
      localStorage.setItem("authToken", response.data.token);
      console.log("🔐 Token saved to localStorage");
    } else if (response.data?.data?.token) {
      localStorage.setItem("authToken", response.data.data.token);
      console.log("🔐 Token saved to localStorage");
    }

    return response;
  },
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url;

    console.error(`❌ API Error [${status}]:`, error.message);
    console.error("URL:", url);
    console.error("Full error:", error);

    // Handle network/CORS errors
    if (
      error.code === "ERR_NETWORK" ||
      error.code === "ECONNREFUSED" ||
      error.message.includes("CORS") ||
      error.message.includes("cross-origin")
    ) {
      console.error("🌐 Network/CORS Issue Detected!");
      console.error("Frontend:", FRONTEND_URL);
      console.error("Backend:", API_BASE_URL);
      console.error("Error code:", error.code);

      error.userMessage = `Connection failed. Please check:
      1. Backend server is running (${API_BASE_URL})
      2. CORS is configured on backend
      3. Network connection is stable
      
      Frontend: ${FRONTEND_URL}
      Backend: ${API_BASE_URL}`;
    }

    // Clear token on 401
    if (status === 401) {
      localStorage.removeItem("authToken");
      console.log("🔓 Token removed due to 401");
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
    console.log("Testing URL:", API_BASE_URL);

    const response = await fetch(API_BASE_URL, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "x-frontend-source": "vercel",
        "x-frontend-url": FRONTEND_URL,
      },
      mode: "cors", // Explicitly set CORS mode
    });

    const success = response.ok;
    console.log(success ? "✅ Backend reachable" : "❌ Backend not reachable");
    console.log("Response status:", response.status);
    console.log("Response headers:", [...response.headers.entries()]);

    return {
      success,
      status: response.status,
      frontend: FRONTEND_URL,
      backend: API_BASE_URL,
    };
  } catch (error) {
    console.error("❌ Connection test failed:", error.message);
    console.error("Error details:", error);

    return {
      success: false,
      error: error.message,
      frontend: FRONTEND_URL,
      backend: API_BASE_URL,
    };
  }
};

// ✅ Test API connection with axios
const testApiConnection = async () => {
  try {
    console.log("🔍 Testing API connection...");
    const response = await axiosWrapper.get("/health");
    console.log("✅ API connection successful:", response.data);
    return {
      success: true,
      data: response.data,
      status: response.status,
    };
  } catch (error) {
    console.error("❌ API connection test failed:", error.message);
    return {
      success: false,
      error: error.message,
      code: error.code,
    };
  }
};

// ✅ Auth helper functions
const isAuthenticated = () => !!localStorage.getItem("authToken");
const getAuthToken = () => localStorage.getItem("authToken");
const setAuthToken = (token) => localStorage.setItem("authToken", token);
// Note: removeAuthToken function removed as requested

// ✅ Quick connection test on page load
if (typeof window !== "undefined") {
  setTimeout(() => {
    if (
      window.location.pathname === "/login" ||
      window.location.pathname === "/"
    ) {
      console.log("🔄 Running connection tests...");
      testBackendConnection().then((result) => {
        if (!result.success) {
          console.warn("⚠️ Backend connection issue detected");
          // Try API test as well
          testApiConnection();
        }
      });
    }
  }, 1000);
}

// ✅ Debug function to check current configuration
const debugConfig = () => {
  return {
    frontend: FRONTEND_URL,
    backend: API_BASE_URL,
    isVercel: IS_VERCEL,
    tokenExists: !!localStorage.getItem("authToken"),
    userAgent: navigator.userAgent,
  };
};

// ✅ SINGLE EXPORT SECTION
export default axiosWrapper;
export {
  axiosWrapper,
  API_BASE_URL,
  testBackendConnection,
  testApiConnection,
  debugConfig,
  isAuthenticated,
  getAuthToken,
  setAuthToken,
  // removeAuthToken is not exported (removed as requested)
};
