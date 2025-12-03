import { useState, useCallback, memo, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { login } from "../../https";
import { enqueueSnackbar } from "notistack";
import { useDispatch } from "react-redux";
import { setUser } from "../../redux/slices/userSlice";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";

const Login = ({ setIsRegister }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [backendStatus, setBackendStatus] = useState("checking");
  const [isProduction, setIsProduction] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect environment and check backend
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

  // Check backend connection
  const checkBackendConnection = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/health`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        setBackendStatus("connected");
        console.log("✅ Backend is running");
      } else {
        setBackendStatus("error");
        console.log("❌ Backend returned error status");
      }
    } catch (error) {
      setBackendStatus("disconnected");
      console.log("❌ Backend connection failed:", error.message);
    }
  };

  // =============================
  // 📌 Handlers
  // =============================
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();

      // Basic validation
      if (!formData.email || !formData.password) {
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

      // Check backend before submitting
      if (backendStatus !== "connected") {
        enqueueSnackbar(
          "Backend server is not running. Please start the backend server first.",
          {
            variant: "error",
            autoHideDuration: 8000,
          }
        );
        return;
      }

      loginMutation.mutate(formData);
    },
    [formData, backendStatus]
  );

  // =============================
  // 📌 Login Mutation
  // =============================
  const loginMutation = useMutation({
    mutationFn: (reqData) => login(reqData),
    onSuccess: (res) => {
      try {
        // Get token from response
        const token = res.data?.token || res.data?.data?.token;
        const user = res.data?.data?.user || res.data?.user || res.data?.data;

        if (res.data?.success && token) {
          // Save token to localStorage
          localStorage.setItem("authToken", token);

          // Extract user data with fallbacks
          const userData = {
            _id: user?._id || "unknown-id",
            name: user?.name || "User",
            email: formData.email,
            phone: user?.phone || "",
            role: user?.role || "cashier",
            token: token,
          };

          // Save user in Redux
          dispatch(setUser(userData));

          // Save to localStorage for persistence
          localStorage.setItem("user", JSON.stringify(userData));

          // Force authentication check
          window.dispatchEvent(new Event("storage"));

          enqueueSnackbar("Login successful! Redirecting...", {
            variant: "success",
            autoHideDuration: 3000,
          });

          // Navigate after a short delay
          setTimeout(() => {
            navigate("/", { replace: true });
          }, 1500);
        } else {
          enqueueSnackbar(res.data?.message || "Login failed", {
            variant: "error",
          });
        }
      } catch (error) {
        console.error("Error in login handler:", error);
        enqueueSnackbar("Login processing error. Please try again.", {
          variant: "error",
        });
      }
    },
    onError: (error) => {
      let errorMessage = "Wrong password or email";

      if (error?.code === "NETWORK_ERROR" || error?.code === "ERR_NETWORK") {
        errorMessage = "Cannot connect to backend server";
      } else if (error?.response?.status === 404) {
        errorMessage = "Login endpoint not found";
      } else if (error?.response?.status === 401) {
        errorMessage = "Invalid email or password";
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
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
        return "✅ Backend Connected";
      case "disconnected":
        return "❌ Backend Disconnected";
      case "error":
        return "⚠️ Backend Error";
      default:
        return "🔍 Checking Backend...";
    }
  };

  // =============================
  // 📌 Render
  // =============================
  return (
    <div className="w-full max-w-md mx-auto p-6">
      {/* Backend Status Indicator */}
      <div
        className={`mb-4 p-3 rounded-lg border text-center text-sm ${getBackendStatusColor()}`}
      >
        <p>{getBackendStatusText()}</p>
        {backendStatus !== "connected" && (
          <p className="text-xs mt-1 opacity-80">
            Start backend: <code>cd delish-backend && npm start</code>
          </p>
        )}
      </div>

      {/* Environment Indicator */}
      <div
        className={`mb-6 p-3 rounded-lg border text-center text-sm ${
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

      {!showForgotPassword ? (
        <>
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Welcome Back</h2>
            <p className="text-[#ababab] text-sm">
              Sign in to your Delish POS account
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Email Field */}
            <div>
              <label className="block text-[#ababab] mb-2 text-sm font-medium">
                Email
              </label>
              <div className="flex items-center rounded-lg p-4 bg-[#1f1f1f] border border-gray-700 focus-within:border-yellow-400 transition-colors">
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  className="bg-transparent flex-1 text-white focus:outline-none placeholder-gray-500 w-full"
                  required
                  disabled={
                    loginMutation.isLoading || backendStatus !== "connected"
                  }
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="mt-4">
              <label className="block text-[#ababab] mb-2 text-sm font-medium">
                Password
              </label>
              <div className="flex items-center rounded-lg p-4 bg-[#1f1f1f] border border-gray-700 focus-within:border-yellow-400 transition-colors">
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  className="bg-transparent flex-1 text-white focus:outline-none placeholder-gray-500 w-full"
                  required
                  disabled={
                    loginMutation.isLoading || backendStatus !== "connected"
                  }
                />
              </div>
            </div>

            {/* Forgot Password Link */}
            <div className="text-right mt-2">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-yellow-400 hover:text-yellow-300 text-xs font-medium"
                disabled={loginMutation.isLoading}
              >
                Forgot Password?
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={
                loginMutation.isLoading || backendStatus !== "connected"
              }
              className="w-full rounded-lg mt-6 py-4 text-lg bg-yellow-400 text-gray-900 font-bold hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-yellow-500/25"
            >
              {loginMutation.isLoading ? (
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
                  Signing In...
                </span>
              ) : backendStatus !== "connected" ? (
                "Start Backend First"
              ) : (
                "Sign In"
              )}
            </button>

            {/* Switch to Register */}
            <div className="text-center mt-4">
              <p className="text-[#ababab] text-sm">
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => setIsRegister(true)}
                  disabled={loginMutation.isLoading}
                  className="text-yellow-400 hover:text-yellow-300 font-medium"
                >
                  Create Account
                </button>
              </p>
            </div>

            {/* Test Credentials Hint */}
            <div className="mt-4 p-3 bg-gray-800 rounded-lg">
              <p className="text-gray-400 text-xs text-center">
                💡 <strong>Demo Credentials:</strong>
                <br />
                Email: admin@delish.com
                <br />
                Password: password123
              </p>
            </div>
          </form>
        </>
      ) : (
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">
            Forgot Password
          </h2>
          <p className="text-[#ababab] text-sm mb-6">
            Enter your email to receive a reset link.
          </p>

          <div className="mb-6">
            <div className="flex items-center rounded-lg p-4 bg-[#1f1f1f] border border-gray-700 focus-within:border-yellow-400 transition-colors">
              <input
                type="email"
                value={forgotPasswordEmail}
                onChange={(e) => setForgotPasswordEmail(e.target.value)}
                placeholder="your@email.com"
                className="bg-transparent flex-1 text-white focus:outline-none placeholder-gray-500 w-full"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowForgotPassword(false)}
              className="flex-1 py-3 px-4 bg-[#1f1f1f] text-[#ababab] border border-gray-700 hover:border-yellow-400 rounded-lg font-medium transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                enqueueSnackbar("Reset link sent to your email", {
                  variant: "info",
                });
                setShowForgotPassword(false);
              }}
              className="flex-1 py-3 px-4 bg-yellow-400 text-gray-900 font-bold hover:bg-yellow-500 rounded-lg transition-colors"
            >
              Send Reset Link
            </button>
          </div>

          <div className="mt-6">
            <button
              type="button"
              onClick={() => setShowForgotPassword(false)}
              className="text-yellow-400 hover:text-yellow-300 text-sm font-medium"
            >
              ← Back to Login
            </button>
          </div>
        </div>
      )}

      {/* Troubleshooting Guide */}
      {backendStatus !== "connected" && (
        <div className="mt-4 p-3 bg-red-900 bg-opacity-20 border border-red-700 rounded-lg">
          <p className="text-red-300 text-xs">
            🔧 <strong>To fix this issue:</strong>
            <br />
            1. Open terminal in <code>delish-backend</code> folder
            <br />
            2. Run: <code>npm start</code>
            <br />
            3. Wait for "POS Server is listening on port 8000" message
            <br />
            4. Refresh this page
          </p>
        </div>
      )}

      {/* Environment-specific Help Text */}
      <div className="mt-4 p-3 bg-gray-800 rounded-lg">
        <p className="text-gray-400 text-xs text-center">
          {isProduction ? (
            <>
              🚀 <strong>Production Mode</strong>
              <br />
              Ensure backend is deployed and running
            </>
          ) : (
            <>
              💡 <strong>Development Tips:</strong>
              <br />• Backend running on port 8000
              <br />• Same WiFi network for mobile
              <br />• Use computer IP for mobile access
            </>
          )}
        </p>
      </div>
    </div>
  );
};

// PropTypes validation
Login.propTypes = {
  setIsRegister: PropTypes.func.isRequired,
};

export default memo(Login);
