import axios from "axios";

// Smart API URL detection
const getApiBaseUrl = () => {
  // Priority 1: Environment variable
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // Priority 2: Vercel production environment
  if (import.meta.env.PROD) {
    return "https://delish-backend-1.onrender.com";
  }

  // Priority 3: Local development with mobile detection
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
};

const API_BASE_URL = getApiBaseUrl();

console.log("🚀 Environment:", import.meta.env.MODE);
console.log("🌐 Frontend URL:", window.location.origin);
console.log("🔗 Backend API:", API_BASE_URL);
console.log("📱 Mobile Device:", /Mobi|Android/i.test(navigator.userAgent));

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

    // Add auth token if available
    const token = localStorage.getItem("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
    });

    // Enhanced error messages
    if (error.code === "NETWORK_ERROR" || error.code === "ECONNREFUSED") {
      error.userMessage =
        "Cannot connect to server. Please check:\n" +
        "• Backend server is running\n" +
        "• Network connectivity\n" +
        "• CORS configuration";

      console.error("🌐 Network Connection Details:");
      console.error("   Frontend:", window.location.origin);
      console.error("   Backend:", API_BASE_URL);
      console.error("   Mobile:", /Mobi|Android/i.test(navigator.userAgent));
    } else if (status === 404) {
      error.userMessage = "Requested resource not found on server.";
    } else if (status === 500) {
      error.userMessage = "Server error. Please try again later.";
    } else if (status === 401) {
      error.userMessage = "Authentication failed. Please login again.";
      localStorage.removeItem("authToken");
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

    const troubleshooting = {
      development: [
        "1. Check if backend server is running: cd delish-backend && npm start",
        "2. Verify backend is on port 8000",
        "3. For mobile access: Use computer's IP address in backend (0.0.0.0)",
        "4. Check CORS configuration in backend",
      ],
      production: [
        "1. Check if backend is deployed to Render/Railway",
        "2. Verify environment variables are set correctly",
        "3. Check backend logs for deployment errors",
        "4. Verify CORS allows your frontend domain",
      ],
    };

    console.log("🔧 Troubleshooting Steps:");
    const steps = import.meta.env.DEV
      ? troubleshooting.development
      : troubleshooting.production;
    steps.forEach((step) => console.log("   " + step));

    return {
      success: false,
      error: error.message,
      userMessage: error.userMessage,
      code: error.code,
      backendUrl: API_BASE_URL,
      frontendUrl: window.location.origin,
    };
  }
};

// Export all required variables
export { axiosWrapper as default, axiosWrapper, API_BASE_URL, testConnection };
