// src/components/auth/Login.jsx
import { useState, useCallback, memo, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { login } from "../../https/index";
import { enqueueSnackbar } from "notistack";
import { useDispatch } from "react-redux";
import { setUser } from "../../redux/slices/userSlice";
import { useNavigate } from "react-router-dom";
import { axiosWrapper } from "../../https/axiosWrapper"; // Fixed import

const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [isProduction, setIsProduction] = useState(false);

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

    // Log connection info for debugging
    console.log("🔧 Login Environment Info:");
    console.log("   Mode:", import.meta.env.MODE);
    console.log("   Production:", import.meta.env.PROD);
    console.log("   Mobile Device:", checkMobile());
    console.log("   VITE_API_URL:", import.meta.env.VITE_API_URL);
  }, []);

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
      loginMutation.mutate(formData);
    },
    [formData]
  );

  const handleForgotPassword = useCallback(
    (e) => {
      e.preventDefault();
      if (!forgotPasswordEmail) {
        enqueueSnackbar("Please enter your email address", {
          variant: "error",
        });
        return;
      }
      forgotPasswordMutation.mutate(forgotPasswordEmail);
    },
    [forgotPasswordEmail]
  );

  // =============================
  // 📌 Login Mutation
  // =============================
  const loginMutation = useMutation({
    mutationFn: (reqData) => login(reqData),
    onSuccess: (res) => {
      if (res?.data?.success) {
        const { _id, name, email, phone, role } = res.data.data;

        // Save user in Redux
        dispatch(setUser({ _id, name, email, phone, role }));

        // Navigate immediately without preloading
        navigate("/", { replace: true });
      } else {
        enqueueSnackbar(res?.data?.message || "Login failed", {
          variant: "error",
        });
      }
    },
    onError: (error) => {
      console.error("Login error details:", {
        code: error.code,
        message: error.message,
        response: error.response?.data,
        url: error.config?.url,
      });

      let errorMessage = "Wrong password or email";
      let helpMessage = "";

      if (error?.code === "NETWORK_ERROR" || error?.code === "ECONNREFUSED") {
        if (isProduction) {
          errorMessage = "Cannot connect to backend server";
          helpMessage =
            "The backend server might be down or not deployed. Please check your backend deployment on Render/Railway.";
        } else {
          errorMessage = "Cannot connect to server";
          helpMessage =
            "Please ensure:\n• Backend is running on port 8000\n• You're on the same WiFi network\n• Using correct IP address for mobile";
        }
      } else if (error?.response?.status === 404) {
        errorMessage = "Server endpoint not found";
        helpMessage =
          "The backend API endpoint is not available. Please check backend deployment.";
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      enqueueSnackbar(errorMessage, {
        variant: "error",
        autoHideDuration: 6000,
      });

      // Show additional help for mobile users in development
      if (helpMessage && isMobile && !isProduction) {
        setTimeout(() => {
          enqueueSnackbar(helpMessage, {
            variant: "info",
            autoHideDuration: 8000,
          });
        }, 1000);
      }
    },
  });

  // =============================
  // 📌 Forgot Password Mutation
  // =============================
  const forgotPasswordMutation = useMutation({
    mutationFn: (email) =>
      axiosWrapper.post("/api/user/forgot-password", { email }),
    onSuccess: (res) => {
      if (res?.data?.success) {
        enqueueSnackbar("Password reset link sent to your email", {
          variant: "success",
        });
        setShowForgotPassword(false);
        setForgotPasswordEmail("");
      } else {
        enqueueSnackbar(res?.data?.message || "Failed to send reset link", {
          variant: "error",
        });
      }
    },
    onError: (error) => {
      console.error("Forgot password error:", error);

      let errorMessage = "Network error. Please try again.";

      if (error?.code === "NETWORK_ERROR") {
        errorMessage =
          "Cannot connect to server. Please check your internet connection.";
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      enqueueSnackbar(errorMessage, {
        variant: "error",
        autoHideDuration: 5000,
      });
    },
  });

  // =============================
  // 📌 Render
  // =============================
  return (
    <div className="w-full max-w-md mx-auto p-6">
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

      {!showForgotPassword ? (
        // Login Form
        <form onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="email"
              className="block text-[#ababab] mb-2 mt-3 text-sm font-medium"
            >
              Employee Email
            </label>
            <div className="flex items-center rounded-lg p-4 bg-[#1f1f1f] border border-gray-700 focus-within:border-yellow-400 transition-colors">
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter employee email"
                autoComplete="email"
                aria-label="Employee Email"
                className="bg-transparent flex-1 text-white focus:outline-none placeholder-gray-500 w-full"
                required
                disabled={loginMutation.isLoading}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-[#ababab] mb-2 mt-3 text-sm font-medium"
            >
              Password
            </label>
            <div className="flex items-center rounded-lg p-4 bg-[#1f1f1f] border border-gray-700 focus-within:border-yellow-400 transition-colors">
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter password"
                autoComplete="current-password"
                aria-label="Employee Password"
                className="bg-transparent flex-1 text-white focus:outline-none placeholder-gray-500 w-full"
                required
                disabled={loginMutation.isLoading}
              />
            </div>
          </div>

          {/* Forgot Password Link */}
          <div className="text-right mt-3">
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="text-yellow-400 hover:text-yellow-300 text-sm font-medium transition-colors disabled:opacity-50"
              disabled={loginMutation.isLoading}
            >
              Forgot Password?
            </button>
          </div>

          <button
            type="submit"
            disabled={loginMutation.isLoading}
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
                Signing in...
              </span>
            ) : (
              "Sign in"
            )}
          </button>

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
        </form>
      ) : (
        // Forgot Password Form
        <div className="text-center">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">
              Forgot Password?
            </h2>
            <p className="text-[#ababab] text-sm">
              No worries! Enter your email and we&apos;ll send you a reset link.
            </p>
          </div>

          <form onSubmit={handleForgotPassword}>
            <div className="mb-4">
              <div className="flex items-center rounded-lg p-4 bg-[#1f1f1f] border border-gray-700 focus-within:border-yellow-400 transition-colors">
                <input
                  type="email"
                  id="forgotPasswordEmail"
                  value={forgotPasswordEmail}
                  onChange={(e) => setForgotPasswordEmail(e.target.value)}
                  placeholder="Enter your email address"
                  autoComplete="email"
                  aria-label="Forgot Password Email"
                  className="bg-transparent flex-1 text-white focus:outline-none placeholder-gray-500 w-full"
                  required
                  disabled={forgotPasswordMutation.isLoading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={forgotPasswordMutation.isLoading}
              className="w-full rounded-lg py-4 text-lg bg-yellow-400 text-gray-900 font-bold hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-3 shadow-lg hover:shadow-yellow-500/25"
            >
              {forgotPasswordMutation.isLoading ? (
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
                  Sending...
                </span>
              ) : (
                "Send Reset Link"
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setShowForgotPassword(false);
                setForgotPasswordEmail("");
              }}
              className="text-yellow-400 hover:text-yellow-300 text-sm font-medium transition-colors disabled:opacity-50"
              disabled={forgotPasswordMutation.isLoading}
            >
              ← Back to Login
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default memo(Login);
