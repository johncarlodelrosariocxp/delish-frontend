import { useState, useCallback, memo } from "react";
import { useMutation } from "@tanstack/react-query";
import { login } from "../../https/index";
import { enqueueSnackbar } from "notistack";
import { useDispatch } from "react-redux";
import { setUser } from "../../redux/slices/userSlice";
import { useNavigate } from "react-router-dom";

// Preload main app components
const preloadMainApp = () => {
  // Preload critical chunks for main app
  if (typeof window !== "undefined") {
    // Preload main app bundle
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "script";
    link.href = "/assets/main-app-chunk.js";
    document.head.appendChild(link);
  }
};

const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");

  // Memoized handlers
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

  // Preload main app on component mount
  useState(() => {
    preloadMainApp();
  });

  const loginMutation = useMutation({
    mutationFn: (reqData) => login(reqData),
    onSuccess: (res) => {
      if (res?.data?.success) {
        const { data } = res;
        const { _id, name, email, phone, role } = data.data;

        // Dispatch user data
        dispatch(setUser({ _id, name, email, phone, role }));

        // Preload dashboard data before navigation
        Promise.all([
          // Preload essential data for main app
          import("../../redux/store").then((module) => {
            // Store reference for faster access
          }),
          // Small delay to ensure state is updated
          new Promise((resolve) => setTimeout(resolve, 10)),
        ]).then(() => {
          // Instant navigation - no loading states
          navigate("/", { replace: true });
        });
      } else {
        enqueueSnackbar(res?.data?.message || "Login failed", {
          variant: "error",
        });
      }
    },
    onError: (error) => {
      const errorMessage =
        error?.response?.data?.message || "Wrong password or email";
      enqueueSnackbar(errorMessage, { variant: "error" });
    },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: async (email) => {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        enqueueSnackbar("Password reset link sent to your email", {
          variant: "success",
        });
        setShowForgotPassword(false);
        setForgotPasswordEmail("");
      } else {
        enqueueSnackbar(data.message || "Failed to send reset link", {
          variant: "error",
        });
      }
    },
    onError: () => {
      enqueueSnackbar("Network error. Please try again.", {
        variant: "error",
      });
    },
  });

  return (
    <div>
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
            <div className="flex item-center rounded-lg p-5 px-4 bg-[#1f1f1f]">
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter employee email"
                autoComplete="email"
                className="bg-transparent flex-1 text-white focus:outline-none"
                required
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
            <div className="flex item-center rounded-lg p-5 px-4 bg-[#1f1f1f]">
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter password"
                autoComplete="current-password"
                className="bg-transparent flex-1 text-white focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Forgot Password Link */}
          <div className="text-right mt-3">
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="text-yellow-400 hover:text-yellow-300 text-sm font-medium transition-colors"
            >
              Forgot Password?
            </button>
          </div>

          <button
            type="submit"
            disabled={loginMutation.isLoading}
            className="w-full rounded-lg mt-6 py-3 text-lg bg-yellow-400 text-gray-900 font-bold hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loginMutation.isLoading ? "Signing in..." : "Sign in"}
          </button>
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
              <div className="flex item-center rounded-lg p-5 px-4 bg-[#1f1f1f]">
                <input
                  type="email"
                  id="forgotPasswordEmail"
                  value={forgotPasswordEmail}
                  onChange={(e) => setForgotPasswordEmail(e.target.value)}
                  placeholder="Enter your email address"
                  autoComplete="email"
                  className="bg-transparent flex-1 text-white focus:outline-none"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={forgotPasswordMutation.isLoading}
              className="w-full rounded-lg py-3 text-lg bg-yellow-400 text-gray-900 font-bold hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-3"
            >
              {forgotPasswordMutation.isLoading
                ? "Sending Reset Link..."
                : "Send Reset Link"}
            </button>

            <button
              type="button"
              onClick={() => {
                setShowForgotPassword(false);
                setForgotPasswordEmail("");
              }}
              className="text-yellow-400 hover:text-yellow-300 text-sm font-medium transition-colors"
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
