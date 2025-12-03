import { useState, useCallback, memo, useEffect } from "react";
import { register } from "../../https/index";
import { useMutation } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";

const Register = ({ setIsRegister }) => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "Cashier", // Set default role
  });

  const [isMobile, setIsMobile] = useState(false);
  const [isProduction, setIsProduction] = useState(false);
  const [backendStatus, setBackendStatus] = useState("checking");
  const [backendUrl, setBackendUrl] = useState("");

  // Detect environment and device type
  useEffect(() => {
    // Check if production
    setIsProduction(import.meta.env.PROD);

    // Check if mobile device
    const checkMobile = () => {
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
    };

    setIsMobile(checkMobile());

    // Check backend connection
    checkBackendConnection();
  }, []);

  // Check if backend is running - FIXED VERSION
  const checkBackendConnection = async () => {
    try {
      // Use Render production URL
      const RENDER_URL = "https://delish-backend-1.onrender.com";
      const LOCAL_URL = "http://localhost:8000";

      // Try production URL first
      const apiUrl = RENDER_URL;
      setBackendUrl(apiUrl);

      console.log("🔗 Testing connection to:", apiUrl);

      const response = await fetch(`${apiUrl}/api/health`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        mode: "cors", // Add CORS mode
      });

      if (response.ok) {
        const data = await response.json();
        console.log("✅ Backend connected! Status:", response.status);
        console.log("📊 Health check response:", data);
        setBackendStatus("connected");
      } else {
        console.log("⚠️ Backend returned non-OK status:", response.status);
        setBackendStatus("error");

        // Try localhost as fallback
        try {
          console.log("🔄 Trying localhost as fallback...");
          const localResponse = await fetch(`${LOCAL_URL}/api/health`);
          if (localResponse.ok) {
            setBackendUrl(LOCAL_URL);
            setBackendStatus("connected");
            console.log("✅ Connected to local backend");
          }
        } catch (localError) {
          console.log("❌ Local backend also not available");
        }
      }
    } catch (error) {
      console.error("❌ Backend connection failed:", error.message);
      setBackendStatus("disconnected");

      // Try localhost as last resort
      const LOCAL_URL = "http://localhost:8000";
      console.log("🔄 Attempting local connection:", LOCAL_URL);
      try {
        const localResponse = await fetch(`${LOCAL_URL}/api/health`);
        if (localResponse.ok) {
          setBackendUrl(LOCAL_URL);
          setBackendStatus("connected");
          console.log("✅ Connected to local backend");
          enqueueSnackbar("Connected to local backend", { variant: "info" });
        }
      } catch (localError) {
        console.log("❌ Cannot connect to any backend");
      }
    }
  };

  // =============================
  // 📌 Handlers
  // =============================
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleRoleSelection = useCallback((selectedRole) => {
    setFormData((prev) => ({ ...prev, role: selectedRole }));
  }, []);

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();

      // Basic validation
      if (
        !formData.name ||
        !formData.email ||
        !formData.phone ||
        !formData.password ||
        !formData.role
      ) {
        enqueueSnackbar("Please fill in all fields", { variant: "error" });
        return;
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        enqueueSnackbar("Please enter a valid email address", {
          variant: "error",
        });
        return;
      }

      // Phone validation (basic)
      if (formData.phone.length < 10) {
        enqueueSnackbar("Please enter a valid phone number", {
          variant: "error",
        });
        return;
      }

      // Password validation
      if (formData.password.length < 6) {
        enqueueSnackbar("Password must be at least 6 characters long", {
          variant: "error",
        });
        return;
      }

      // Check backend before submitting
      if (backendStatus !== "connected") {
        enqueueSnackbar(`Backend server is not running. URL: ${backendUrl}`, {
          variant: "error",
          autoHideDuration: 8000,
        });
        return;
      }

      // Log what we're sending
      console.log("📤 Sending registration data:", {
        url: `${backendUrl}/api/user/register`,
        data: formData,
      });

      registerMutation.mutate(formData);
    },
    [formData, backendStatus, backendUrl]
  );

  // =============================
  // 📌 Register Mutation - FIXED
  // =============================
  const registerMutation = useMutation({
    mutationFn: async (reqData) => {
      // Override the API URL if backendUrl is set
      const apiUrl = backendUrl || "https://delish-backend-1.onrender.com";

      console.log("📡 Registering user to:", `${apiUrl}/api/user/register`);

      // Make direct fetch call to ensure we're using correct URL
      const response = await fetch(`${apiUrl}/api/user/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(reqData),
        mode: "cors", // Important for CORS
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      return response.json();
    },
    onSuccess: (res) => {
      console.log("✅ Registration response:", res);

      if (res?.success) {
        enqueueSnackbar(
          res.message || "Account created successfully! You can now login.",
          {
            variant: "success",
            autoHideDuration: 5000,
          }
        );

        // Reset form
        setFormData({
          name: "",
          email: "",
          phone: "",
          password: "",
          role: "Cashier",
        });

        // Switch to login after delay
        setTimeout(() => {
          setIsRegister(false);
        }, 2000);
      } else {
        enqueueSnackbar(res?.message || "Registration failed", {
          variant: "error",
        });
      }
    },
    onError: (error) => {
      console.error("❌ Registration error details:", {
        message: error.message,
        stack: error.stack,
      });

      let errorMessage = "Registration failed. Please try again.";

      if (
        error?.message?.includes("NetworkError") ||
        error?.message?.includes("Failed to fetch")
      ) {
        errorMessage = `Cannot connect to backend at ${backendUrl}. Please check:`;

        enqueueSnackbar(errorMessage, {
          variant: "error",
          autoHideDuration: 8000,
        });

        // Show detailed instructions
        setTimeout(() => {
          enqueueSnackbar(
            `1. Ensure backend is running: ${backendUrl}\n2. Check CORS settings\n3. Try restarting backend server`,
            { variant: "info", autoHideDuration: 10000 }
          );
        }, 1000);
      } else if (error?.message?.includes("409")) {
        errorMessage = "User with this email already exists.";
        enqueueSnackbar(errorMessage, {
          variant: "error",
          autoHideDuration: 5000,
        });
      } else {
        enqueueSnackbar(error.message || errorMessage, {
          variant: "error",
          autoHideDuration: 5000,
        });
      }
    },
  });

  // Test registration endpoint directly
  const handleTestRegistration = async () => {
    try {
      const testData = {
        name: "Test User",
        email: `test${Date.now()}@delish.com`,
        phone: "1234567890",
        password: "password123",
        role: "Cashier",
      };

      console.log("🧪 Testing registration endpoint...");

      const response = await fetch(`${backendUrl}/api/user/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(testData),
      });

      const data = await response.json();
      console.log("Test registration result:", data);

      if (data.success) {
        enqueueSnackbar("✅ Registration endpoint is working!", {
          variant: "success",
        });
      } else {
        enqueueSnackbar("❌ Registration failed: " + data.message, {
          variant: "error",
        });
      }
    } catch (error) {
      console.error("Test failed:", error);
      enqueueSnackbar("❌ Test failed: " + error.message, {
        variant: "error",
      });
    }
  };

  // Get backend status color
  const getBackendStatusColor = () => {
    switch (backendStatus) {
      case "connected":
        return "bg-green-900 border-green-700 text-green-300";
      case "disconnected":
        return "bg-red-900 border-red-700 text-red-300";
      case "error":
        return "bg-yellow-900 border-yellow-700 text-yellow-300";
      default:
        return "bg-blue-900 border-blue-700 text-blue-300";
    }
  };

  const getBackendStatusText = () => {
    switch (backendStatus) {
      case "connected":
        return `✅ Backend Connected (${backendUrl})`;
      case "disconnected":
        return `❌ Backend Disconnected (${backendUrl})`;
      case "error":
        return `⚠️ Backend Error (${backendUrl})`;
      default:
        return "🔍 Checking Backend...";
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6">
      {/* Backend Status Indicator */}
      <div
        className={`mb-4 p-3 rounded-lg border text-center text-sm ${getBackendStatusColor()}`}
      >
        <p>{getBackendStatusText()}</p>
        {backendStatus === "connected" ? (
          <button
            onClick={handleTestRegistration}
            className="mt-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded"
          >
            Test Registration
          </button>
        ) : (
          <p className="text-xs mt-1 opacity-80">
            Backend URL: {backendUrl || "Not detected"}
          </p>
        )}
      </div>

      {/* Environment Indicator */}
      <div
        className={`mb-4 p-3 rounded-lg border text-center text-sm ${
          isProduction
            ? "bg-green-900 bg-opacity-20 border-green-700 text-green-300"
            : "bg-blue-900 bg-opacity-20 border-blue-700 text-blue-300"
        }`}
      >
        <p>
          {isProduction ? "🚀 PRODUCTION" : "🔧 DEVELOPMENT"} |
          {isMobile ? " 📱 MOBILE" : " 💻 DESKTOP"}
        </p>
      </div>

      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Create Account</h2>
        <p className="text-[#ababab] text-sm">
          Create a new employee account for Delish POS
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Name Field */}
        <div>
          <label className="block text-[#ababab] mb-2 mt-3 text-sm font-medium">
            Employee Name
          </label>
          <div className="flex items-center rounded-lg p-4 bg-[#1f1f1f] border border-gray-700 focus-within:border-yellow-400 transition-colors">
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter employee full name"
              className="bg-transparent flex-1 text-white focus:outline-none placeholder-gray-500 w-full"
              required
              minLength={2}
              disabled={
                registerMutation.isLoading || backendStatus !== "connected"
              }
            />
          </div>
        </div>

        {/* Email Field */}
        <div>
          <label className="block text-[#ababab] mb-2 mt-3 text-sm font-medium">
            Employee Email
          </label>
          <div className="flex items-center rounded-lg p-4 bg-[#1f1f1f] border border-gray-700 focus-within:border-yellow-400 transition-colors">
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter employee email"
              className="bg-transparent flex-1 text-white focus:outline-none placeholder-gray-500 w-full"
              required
              disabled={
                registerMutation.isLoading || backendStatus !== "connected"
              }
            />
          </div>
        </div>

        {/* Phone Field */}
        <div>
          <label className="block text-[#ababab] mb-2 mt-3 text-sm font-medium">
            Employee Phone
          </label>
          <div className="flex items-center rounded-lg p-4 bg-[#1f1f1f] border border-gray-700 focus-within:border-yellow-400 transition-colors">
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Enter employee phone number"
              className="bg-transparent flex-1 text-white focus:outline-none placeholder-gray-500 w-full"
              required
              minLength={10}
              disabled={
                registerMutation.isLoading || backendStatus !== "connected"
              }
            />
          </div>
        </div>

        {/* Password Field */}
        <div>
          <label className="block text-[#ababab] mb-2 mt-3 text-sm font-medium">
            Password
          </label>
          <div className="flex items-center rounded-lg p-4 bg-[#1f1f1f] border border-gray-700 focus-within:border-yellow-400 transition-colors">
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter password (min. 6 characters)"
              className="bg-transparent flex-1 text-white focus:outline-none placeholder-gray-500 w-full"
              required
              minLength={6}
              disabled={
                registerMutation.isLoading || backendStatus !== "connected"
              }
            />
          </div>
        </div>

        {/* Role Selection */}
        <div>
          <label className="block text-[#ababab] mb-2 mt-3 text-sm font-medium">
            Choose your role
          </label>
          <div className="flex gap-3 mt-4">
            {["Cashier", "Admin"].map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => handleRoleSelection(role)}
                disabled={
                  registerMutation.isLoading || backendStatus !== "connected"
                }
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                  formData.role === role
                    ? "bg-yellow-400 text-gray-900 shadow-lg"
                    : "bg-[#1f1f1f] text-[#ababab] border border-gray-700 hover:border-yellow-400"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {role}
              </button>
            ))}
          </div>
          {formData.role && (
            <p className="text-yellow-400 text-xs mt-2 text-center">
              Selected: <strong>{formData.role}</strong>
              {formData.role === "Admin" && " (Full system access)"}
              {formData.role === "Cashier" && " (Limited access)"}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={registerMutation.isLoading || backendStatus !== "connected"}
          className="w-full rounded-lg mt-6 py-4 text-lg bg-yellow-400 text-gray-900 font-bold hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-yellow-500/25"
        >
          {registerMutation.isLoading ? (
            <span className="flex items-center justify-center">
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-900"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Creating Account...
            </span>
          ) : backendStatus !== "connected" ? (
            "Backend Not Connected"
          ) : (
            "Create Account"
          )}
        </button>

        {/* Back to Login */}
        <div className="text-center mt-4">
          <button
            type="button"
            onClick={() => setIsRegister(false)}
            disabled={registerMutation.isLoading}
            className="text-yellow-400 hover:text-yellow-300 text-sm font-medium transition-colors disabled:opacity-50"
          >
            ← Back to Login
          </button>
        </div>
      </form>

      {/* Troubleshooting Guide */}
      {backendStatus !== "connected" && (
        <div className="mt-4 p-3 bg-red-900 bg-opacity-20 border border-red-700 rounded-lg">
          <p className="text-red-300 text-xs">
            🔧 <strong>To fix this issue:</strong>
            <br />
            1. Check if backend is running at: {backendUrl}
            <br />
            2. For Render: Check deployment status on dashboard
            <br />
            3. For Local: Run <code>cd delish-backend && npm start</code>
            <br />
            4. Wait for server to start completely
            <br />
            5. Check CORS settings in backend
            <br />
            6. Refresh this page
          </p>
        </div>
      )}

      {/* Debug Info */}
      <div className="mt-4 p-3 bg-gray-900 rounded-lg">
        <p className="text-gray-400 text-xs">
          <strong>Debug Info:</strong>
          <br />
          Backend URL: {backendUrl}
          <br />
          Status: {backendStatus}
          <br />
          Environment: {isProduction ? "Production" : "Development"}
          <br />
          Current API endpoint: {backendUrl}/api/user/register
        </p>
        <button
          onClick={checkBackendConnection}
          className="mt-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded"
        >
          Re-check Backend
        </button>
      </div>
    </div>
  );
};

// PropTypes validation
Register.propTypes = {
  setIsRegister: PropTypes.func.isRequired,
};

export default memo(Register);
