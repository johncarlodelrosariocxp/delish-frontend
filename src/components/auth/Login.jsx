import { useState, useCallback, memo, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { login } from "../../https";
import { enqueueSnackbar } from "notistack";
import { useDispatch } from "react-redux";
import { setUser } from "../../redux/slices/userSlice";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [backendUrl, setBackendUrl] = useState("");

  // Test backend connection on load
  useEffect(() => {
    const testBackend = async () => {
      console.log("🔧 ===== LOGIN DEBUG INFO =====");
      console.log("🌐 Frontend URL:", window.location.origin);

      // Try to connect to Render backend
      const RENDER_URL = "https://delish-backend-1.onrender.com";

      try {
        console.log("🔗 Testing connection to:", RENDER_URL);
        const response = await fetch(RENDER_URL);
        const data = await response.json();

        console.log("✅ Backend connected! Status:", response.status);
        console.log("📊 Backend response:", data);

        setBackendUrl(RENDER_URL);

        // Show success message
        enqueueSnackbar("✅ Connected to production backend", {
          variant: "success",
          autoHideDuration: 3000,
        });
      } catch (error) {
        console.error("❌ Cannot connect to backend:", error.message);
        console.log("⚠️ Backend might be down or CORS issue");

        // Show error message
        enqueueSnackbar(
          `❌ Cannot connect to backend server. Please check deployment.`,
          {
            variant: "error",
            autoHideDuration: 5000,
          }
        );
      }

      console.log("🚀 =============================");
    };

    testBackend();
  }, []);

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

  // =============================
  // 📌 Login Mutation - FIXED VERSION
  // =============================
  const loginMutation = useMutation({
    mutationFn: (reqData) => login(reqData),
    onSuccess: (res) => {
      console.log("🔐 Full login response:", res.data);

      // Token is at res.data.data.token (FIXED!)
      const token = res.data?.data?.token;

      console.log("✅ Token found:", token);

      if (res.data?.success && token) {
        const user = res.data.data.user;
        const { _id, name, email, phone, role } = user;

        console.log("✅ User data:", { _id, name, email, phone, role });

        // Save token to localStorage (FIXED!)
        localStorage.setItem("authToken", token);
        localStorage.setItem("token", token);
        console.log("✅ Token saved to localStorage");

        // Force authentication check
        window.dispatchEvent(new Event("storage"));

        // Save user in Redux
        dispatch(
          setUser({
            _id,
            name,
            email,
            phone,
            role,
            token: token,
          })
        );

        // Navigate after a short delay
        setTimeout(() => {
          console.log(
            "🔍 Final auth check:",
            localStorage.getItem("authToken")
          );
          navigate("/", { replace: true });
          console.log("🚀 Navigated to home");
        }, 300);
      } else {
        enqueueSnackbar(
          res.data?.message || "Login failed - no token received",
          {
            variant: "error",
          }
        );
      }
    },
    onError: (error) => {
      console.error("❌ Login error:", {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        url: error.config?.url,
      });

      let errorMessage = "Wrong password or email";
      let helpMessage = "";

      if (error?.code === "NETWORK_ERROR" || error?.code === "ERR_NETWORK") {
        errorMessage = "Cannot connect to backend server";
        helpMessage = `Please check if backend is running at: https://delish-backend-1.onrender.com`;
      } else if (error?.response?.status === 404) {
        errorMessage = "Login endpoint not found";
        helpMessage =
          "Backend API endpoint is not available. Check deployment.";
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      enqueueSnackbar(errorMessage, {
        variant: "error",
        autoHideDuration: 6000,
      });

      if (helpMessage) {
        setTimeout(() => {
          enqueueSnackbar(helpMessage, {
            variant: "info",
            autoHideDuration: 8000,
          });
        }, 1000);
      }
    },
  });

  // Emergency: Create user directly
  const handleEmergencyCreateUser = async () => {
    try {
      console.log("🚨 Creating emergency user...");

      const response = await fetch(
        "https://delish-backend-1.onrender.com/api/force-create-user",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: "Admin User",
            email: "admin@delish.com",
            phone: "1234567890",
            password: "admin123",
            role: "admin",
          }),
        }
      );

      const data = await response.json();
      console.log("Emergency user result:", data);

      if (data.success) {
        enqueueSnackbar(
          "✅ Emergency user created! Try logging in with admin@delish.com / admin123",
          {
            variant: "success",
            autoHideDuration: 8000,
          }
        );

        // Auto-fill the form
        setFormData({
          email: "admin@delish.com",
          password: "admin123",
        });
      }
    } catch (error) {
      console.error("Emergency user failed:", error);
      enqueueSnackbar("❌ Cannot create user: " + error.message, {
        variant: "error",
      });
    }
  };

  // Quick login test function
  const handleQuickLoginTest = async () => {
    try {
      console.log("🧪 Testing quick login...");

      const response = await fetch(
        "https://delish-backend-1.onrender.com/api/user/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "admin@delish.com",
            password: "admin123",
          }),
        }
      );

      const data = await response.json();
      console.log("Quick test response:", data);

      if (data.success && data.data?.token) {
        // Auto-fill form with test credentials
        setFormData({
          email: "admin@delish.com",
          password: "admin123",
        });

        enqueueSnackbar("✅ Test credentials ready! Click Sign In", {
          variant: "success",
        });
      }
    } catch (error) {
      console.error("Quick test failed:", error);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6">
      {/* Production Status Banner */}
      <div className="mb-6 p-4 bg-blue-900 bg-opacity-20 border border-blue-700 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-blue-300">
              🚀 Production Mode
            </h3>
            <p className="text-blue-400 text-sm">
              Backend:{" "}
              <code className="bg-blue-900 px-2 py-1 rounded">
                https://delish-backend-1.onrender.com
              </code>
            </p>
          </div>
          <button
            onClick={handleEmergencyCreateUser}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded"
            title="Create emergency admin user"
          >
            Create Test User
          </button>
        </div>

        {backendUrl ? (
          <div className="mt-2 p-2 bg-green-900 bg-opacity-20 border border-green-700 rounded">
            <p className="text-green-300 text-sm">✅ Backend connected</p>
          </div>
        ) : (
          <div className="mt-2 p-2 bg-red-900 bg-opacity-20 border border-red-700 rounded">
            <p className="text-red-300 text-sm">❌ Backend not connected</p>
            <p className="text-red-400 text-xs">Check Render dashboard</p>
          </div>
        )}
      </div>

      {!showForgotPassword ? (
        <form onSubmit={handleSubmit}>
          <div>
            <label className="block text-[#ababab] mb-2 text-sm font-medium">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="admin@delish.com"
              className="w-full p-3 bg-[#1f1f1f] border border-gray-700 rounded-lg text-white mb-4"
              required
            />
          </div>

          <div>
            <label className="block text-[#ababab] mb-2 text-sm font-medium">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="admin123"
              className="w-full p-3 bg-[#1f1f1f] border border-gray-700 rounded-lg text-white mb-4"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loginMutation.isLoading}
            className="w-full p-4 bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold rounded-lg mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loginMutation.isLoading ? "Signing in..." : "Sign In"}
          </button>

          {/* Quick Actions */}
          <div className="mt-4 space-y-2">
            <button
              type="button"
              onClick={() =>
                setFormData({ email: "admin@delish.com", password: "admin123" })
              }
              className="w-full p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded"
            >
              Fill Test Credentials
            </button>
            <button
              type="button"
              onClick={handleQuickLoginTest}
              className="w-full p-2 bg-blue-800 hover:bg-blue-700 text-blue-300 text-sm rounded"
            >
              Test Login Connection
            </button>
          </div>

          {/* Forgot Password Link */}
          <div className="text-center mt-4">
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="text-yellow-400 hover:text-yellow-300 text-sm font-medium"
            >
              Forgot Password?
            </button>
          </div>
        </form>
      ) : (
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-4">Forgot Password</h2>
          <p className="text-gray-400 mb-4">
            Enter your email to receive a reset link.
          </p>
          <input
            type="email"
            value={forgotPasswordEmail}
            onChange={(e) => setForgotPasswordEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-full p-3 bg-[#1f1f1f] border border-gray-700 rounded-lg text-white mb-4"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowForgotPassword(false)}
              className="flex-1 p-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleEmergencyCreateUser}
              className="flex-1 p-3 bg-red-600 hover:bg-red-700 text-white rounded-lg"
            >
              Create Test User
            </button>
          </div>
        </div>
      )}

      {/* Debug Info */}
      <div className="mt-6 p-3 bg-gray-900 rounded-lg text-xs text-gray-400">
        <p className="font-semibold mb-1">Debug Info:</p>
        <p>Token location: res.data.data.token</p>
        <p>User location: res.data.data.user</p>
        <p>Backend: Render</p>
      </div>
    </div>
  );
};

export default memo(Login);
