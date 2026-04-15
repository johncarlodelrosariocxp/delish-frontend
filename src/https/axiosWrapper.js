import axios from "axios";

// ✅ PRODUCTION BACKEND URL (Render)
const API_BASE_URL = "https://delish-backend-1.onrender.com";

// Get current frontend URL
const FRONTEND_URL = window.location.origin;
const IS_VERCEL = FRONTEND_URL.includes("vercel.app");

console.log("🚀 Frontend Platform:", IS_VERCEL ? "Vercel" : "Local");
console.log("📍 Frontend URL:", FRONTEND_URL);
console.log("🔗 Backend URL:", API_BASE_URL);

// ✅ Create Axios instance with increased timeout for large reports
const axiosWrapper = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false, // Must be false for Vercel → Render
  timeout: 120000, // Increased from 30000 to 120000 (2 minutes) for large profit/loss reports
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

    // Log request details (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log(`📤 ${config.method?.toUpperCase()} ${config.url}`);
      console.log("Headers:", config.headers);
    }

    return config;
  },
  (error) => {
    console.error("❌ Request Error:", error);
    return Promise.reject(error);
  }
);

// ✅ Response interceptor with improved error handling
axiosWrapper.interceptors.response.use(
  (response) => {
    // Log only in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ ${response.status} ${response.config.url}`);
    }

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
    const errorMessage = error.message;

    // Log error details
    console.error(`❌ API Error [${status || 'Network'}]:`, errorMessage);
    
    // Handle timeout errors specifically
    if (errorMessage.includes("timeout") || error.code === "ECONNABORTED") {
      console.error("⏰ Request Timeout - The server is taking too long to respond");
      console.error("This may happen for large reports or slow network connections");
      
      error.userMessage = "Request is taking too long. The server might be processing a large amount of data. Please try again or select a smaller date range.";
    }
    
    // Handle network/CORS errors
    if (
      error.code === "ERR_NETWORK" ||
      error.code === "ECONNABORTED" ||
      errorMessage.includes("Network Error") ||
      errorMessage.includes("CORS") ||
      errorMessage.includes("cross-origin")
    ) {
      console.error("🌐 Network/CORS Issue Detected!");
      
      error.userMessage = `Connection failed. Please check:
      1. Backend server is running (${API_BASE_URL})
      2. Your internet connection is stable
      3. Try refreshing the page
      
      Frontend: ${FRONTEND_URL}
      Backend: ${API_BASE_URL}`;
    }

    // Handle slow response but not timeout (keep connection alive)
    if (errorMessage.includes("timeout of") && !errorMessage.includes("120000")) {
      console.warn("⚠️ Response slower than expected, but connection is still active");
    }

    // Clear token on 401 (unauthorized)
    if (status === 401) {
      localStorage.removeItem("authToken");
      
      // Redirect to login if not already there
      const currentPath = window.location.pathname;
      if (!currentPath.includes("/login") && !currentPath.includes("/register")) {
        // Use setTimeout to avoid interrupting the error flow
        setTimeout(() => {
          window.location.href = "/login";
        }, 100);
      }
    }

    return Promise.reject(error);
  }
);

// ✅ Test backend connection with better error handling
const testBackendConnection = async () => {
  try {
    console.log("🔍 Testing connection to Render...");
    
    // Use a health check endpoint if available
    const healthUrl = `${API_BASE_URL}/health`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(healthUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "x-frontend-source": IS_VERCEL ? "vercel" : "local",
        "x-frontend-url": FRONTEND_URL,
      },
      mode: "cors",
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    return {
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      frontend: FRONTEND_URL,
      backend: API_BASE_URL,
    };
  } catch (error) {
    console.error("❌ Connection test failed:", error.message);
    
    return {
      success: false,
      error: error.name === 'AbortError' ? 'Connection timeout' : error.message,
      frontend: FRONTEND_URL,
      backend: API_BASE_URL,
    };
  }
};

// ✅ Test API connection with axios
const testApiConnection = async () => {
  try {
    console.log("🔍 Testing API connection...");
    
    // Try health endpoint first, fallback to root
    const response = await axiosWrapper.get("/health").catch(() => {
      return axiosWrapper.get("/");
    });
    
    console.log("✅ API connection successful");
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
const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem("authToken", token);
  }
};

// ✅ Quick connection test on page load
if (typeof window !== "undefined") {
  // Only run test in development or on specific pages
  if (
    process.env.NODE_ENV === 'development' ||
    window.location.pathname === "/login" || 
    window.location.pathname === "/"
  ) {
    // Run test after a short delay to not block rendering
    setTimeout(() => {
      console.log("🔄 Running connection tests...");
      testBackendConnection().then((result) => {
        if (!result.success) {
          console.warn("⚠️ Backend connection issue detected");
          // Try API test as well
          testApiConnection();
        }
      });
    }, 1500);
  }
}

// ✅ Debug function to check current configuration
const debugConfig = () => {
  return {
    frontend: FRONTEND_URL,
    backend: API_BASE_URL,
    isVercel: IS_VERCEL,
    tokenExists: !!localStorage.getItem("authToken"),
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
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
};
