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
    role: "Cashier",
  });

  const [isMobile, setIsMobile] = useState(false);
  const [isProduction, setIsProduction] = useState(false);
  const [backendStatus, setBackendStatus] = useState("checking");
  const [backendUrl, setBackendUrl] = useState("");
  const [backendError, setBackendError] = useState("");

  // Detect environment and device type
  useEffect(() => {
    setIsProduction(import.meta.env.PROD);

    const checkMobile = () => {
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
    };

    setIsMobile(checkMobile());
    checkBackendConnection();
  }, []);

  // Check if backend is running - IMPROVED VERSION
  const checkBackendConnection = async () => {
    try {
      // Use Render production URL
      const RENDER_URL = "https://delish-backend-1.onrender.com";
      const LOCAL_URL = "http://localhost:8000";

      // Try production URL first
      const apiUrl = RENDER_URL;
      setBackendUrl(apiUrl);
      setBackendError("");

      console.log("🔗 Testing connection to:", apiUrl);

      // Try multiple endpoints - the health endpoint might not exist
      const endpoints = [
        "/api/health",
        "/health",
        "/api/user/test",
        "/",
        "/api/test",
      ];

      let connected = false;
      let errorDetails = {};

      for (const endpoint of endpoints) {
        try {
          console.log(`🔄 Trying endpoint: ${apiUrl}${endpoint}`);
          const response = await fetch(`${apiUrl}${endpoint}`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
            mode: "cors",
          });

          console.log(`📊 Response for ${endpoint}:`, {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
          });

          if (response.ok) {
            const data = await response.json().catch(() => ({}));
            console.log(`✅ Connected via ${endpoint}:`, data);
            setBackendStatus("connected");
            connected = true;
            enqueueSnackbar(`✅ Backend connected via ${endpoint}`, {
              variant: "success",
              autoHideDuration: 3000,
            });
            break;
          } else {
            errorDetails[endpoint] = {
              status: response.status,
              statusText: response.statusText,
            };
          }
        } catch (endpointError) {
          console.log(`❌ Endpoint ${endpoint} failed:`, endpointError.message);
          errorDetails[endpoint] = endpointError.message;
        }
      }

      if (!connected) {
        console.log("⚠️ All endpoints failed:", errorDetails);
        setBackendStatus("error");
        setBackendError(JSON.stringify(errorDetails, null, 2));

        // Try localhost as fallback
        try {
          console.log("🔄 Trying localhost as fallback...");
          const localResponse = await fetch(`${LOCAL_URL}/api/health`);
          if (localResponse.ok) {
            setBackendUrl(LOCAL_URL);
            setBackendStatus("connected");
            console.log("✅ Connected to local backend");
            enqueueSnackbar("Connected to local backend", { variant: "info" });
          }
        } catch (localError) {
          console.log("❌ Local backend also not available");
        }
      }
    } catch (error) {
      console.error("❌ Backend connection check failed:", error.message);
      setBackendStatus("disconnected");
      setBackendError(error.message);
    }
  };

  // Test specific registration endpoint
  const testRegistrationEndpoint = async () => {
    try {
      console.log("🧪 Testing registration endpoint directly...");

      const testResponse = await fetch(`${backendUrl}/api/user/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Test User",
          email: `test${Date.now()}@delish.com`,
          phone: "1234567890",
          password: "password123",
          role: "Cashier",
        }),
      });

      console.log("Registration test response:", {
        status: testResponse.status,
        statusText: testResponse.statusText,
        ok: testResponse.ok,
      });

      if (testResponse.ok) {
        const data = await testResponse.json();
        console.log("✅ Registration endpoint works:", data);
        setBackendStatus("connected");
        enqueueSnackbar("✅ Registration endpoint is functional!", {
          variant: "success",
        });
        return true;
      } else {
        const errorText = await testResponse.text();
        console.log("❌ Registration endpoint error:", errorText);
        setBackendError(`HTTP ${testResponse.status}: ${errorText}`);
        return false;
      }
    } catch (error) {
      console.error("❌ Registration test failed:", error);
      setBackendError(error.message);
      return false;
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
    async (e) => {
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

      // First test the registration endpoint
      enqueueSnackbar("Testing backend connection...", { variant: "info" });

      const isEndpointWorking = await testRegistrationEndpoint();

      if (!isEndpointWorking) {
        enqueueSnackbar(
          `Backend registration endpoint is not working. Please check backend deployment.`,
          {
            variant: "error",
            autoHideDuration: 8000,
          }
        );
        return;
      }

      // Log what we're sending
      console.log("📤 Sending registration data:", {
        url: `${backendUrl}/api/user/register`,
        data: formData,
      });

      registerMutation.mutate(formData);
    },
    [formData, backendUrl]
  );

  // =============================
  // 📌 Register Mutation
  // =============================
  const registerMutation = useMutation({
    mutationFn: async (reqData) => {
      console.log("📡 Registering user to:", `${backendUrl}/api/user/register`);

      const response = await fetch(`${backendUrl}/api/user/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(reqData),
        mode: "cors",
      });

      const responseText = await response.text();
      console.log("Raw response:", responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error("Failed to parse response as JSON:", responseText);
        throw new Error(
          `Invalid JSON response: ${responseText.substring(0, 100)}`
        );
      }

      if (!response.ok) {
        throw new Error(
          data.message || `HTTP error! status: ${response.status}`
        );
      }

      return data;
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

        setFormData({
          name: "",
          email: "",
          phone: "",
          password: "",
          role: "Cashier",
        });

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
      console.error("❌ Registration error:", error.message);

      let errorMessage = "Registration failed. Please try again.";

      if (
        error?.message?.includes("NetworkError") ||
        error?.message?.includes("Failed to fetch")
      ) {
        errorMessage = `Cannot connect to backend at ${backendUrl}.`;
      } else if (error?.message?.includes("Invalid JSON")) {
        errorMessage = "Backend returned invalid response. Check server logs.";
      } else {
        errorMessage = error.message;
      }

      enqueueSnackbar(errorMessage, {
        variant: "error",
        autoHideDuration: 5000,
      });
    },
  });

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
        return `✅ Backend Connected`;
      case "disconnected":
        return `❌ Backend Disconnected`;
      case "error":
        return `⚠️ Backend Error`;
      default:
        return "🔍 Checking Backend...";
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6">
    

      {/* Show error details if available */}
      {backendError && (
        <div className="mb-4 p-3 bg-red-900 bg-opacity-20 border border-red-700 rounded-lg">
          <p className="text-red-300 text-sm font-semibold mb-1">
            Error Details:
          </p>
          <pre className="text-red-400 text-xs whitespace-pre-wrap overflow-auto max-h-32">
            {backendError}
          </pre>
        </div>
      )}

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
              disabled={registerMutation.isLoading}
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
              disabled={registerMutation.isLoading}
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
              disabled={registerMutation.isLoading}
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
              disabled={registerMutation.isLoading}
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
                disabled={registerMutation.isLoading}
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
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={registerMutation.isLoading}
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

      {/* Quick Test Credentials */}
  
      {/* Manual Backend Check */}
      <div className="mt-4 p-3 bg-gray-900 rounded-lg">
        <p className="text-gray-400 text-xs mb-2">
          <strong>Manual Check:</strong> Open these links in new tab:
        </p>
        <div className="space-y-1">
          <a
            href={`${backendUrl}/api/health`}
            target="_blank"
            rel="noopener noreferrer"
            className="block px-3 py-1 bg-blue-800 hover:bg-blue-700 text-blue-300 text-xs rounded text-center"
          >
            Check /api/health
          </a>
          <a
            href={`${backendUrl}/api/user/register`}
            target="_blank"
            rel="noopener noreferrer"
            className="block px-3 py-1 bg-blue-800 hover:bg-blue-700 text-blue-300 text-xs rounded text-center"
          >
            Check /api/user/register
          </a>
          <a
            href={backendUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block px-3 py-1 bg-blue-800 hover:bg-blue-700 text-blue-300 text-xs rounded text-center"
          >
            Check Root URL
          </a>
        </div>
      </div>
    </div>
  );
};

Register.propTypes = {
  setIsRegister: PropTypes.func.isRequired,
};

export default memo(Register);
