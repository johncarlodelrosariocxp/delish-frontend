import { useState, useCallback, memo, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { login, register } from "../../https";
import { enqueueSnackbar } from "notistack";
import { useDispatch } from "react-redux";
import { setUser } from "../../redux/slices/userSlice";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [activeTab, setActiveTab] = useState("login");
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [registerData, setRegisterData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    role: "Cashier",
  });
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Handlers
  const handleLoginChange = useCallback((e) => {
    const { name, value } = e.target;
    setLoginData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleRegisterChange = useCallback((e) => {
    const { name, value } = e.target;
    setRegisterData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleLoginSubmit = useCallback(
    (e) => {
      e.preventDefault();
      loginMutation.mutate(loginData);
    },
    [loginData]
  );

  const handleRegisterSubmit = useCallback(
    (e) => {
      e.preventDefault();
      if (registerData.password !== registerData.confirmPassword) {
        enqueueSnackbar("Passwords do not match", { variant: "error" });
        return;
      }
      const { confirmPassword, ...payload } = registerData;
      registerMutation.mutate(payload);
    },
    [registerData]
  );

  // Login Mutation
  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (res) => {
      try {
        const token = res.data?.token;
        const user = res.data?.data?.user || res.data?.user;

        if (res.data?.success && token) {
          localStorage.setItem("token", token);
          dispatch(
            setUser({
              _id: user?._id,
              name: user?.name || "User",
              email: loginData.email,
              role: user?.role || "cashier",
              token: token,
            })
          );
          navigate("/", { replace: true });
        }
      } catch (error) {
        enqueueSnackbar("Login failed", { variant: "error" });
      }
    },
    onError: () => {
      enqueueSnackbar("Invalid credentials", { variant: "error" });
    },
  });

  // Register Mutation
  const registerMutation = useMutation({
    mutationFn: register,
    onSuccess: (res) => {
      if (res.data?.success) {
        enqueueSnackbar("Registration successful! You can now login.", {
          variant: "success",
        });
        setActiveTab("login");
        setLoginData((prev) => ({ ...prev, email: registerData.email }));
      }
    },
    onError: () => {
      enqueueSnackbar("Registration failed", { variant: "error" });
    },
  });

  // Simple UI
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-800 rounded-2xl p-6">
        <div className="flex mb-6 border-b border-gray-700">
          <button
            className={`flex-1 py-3 ${
              activeTab === "login"
                ? "text-yellow-400 border-b-2 border-yellow-400"
                : "text-gray-400"
            }`}
            onClick={() => setActiveTab("login")}
          >
            Login
          </button>
          <button
            className={`flex-1 py-3 ${
              activeTab === "register"
                ? "text-yellow-400 border-b-2 border-yellow-400"
                : "text-gray-400"
            }`}
            onClick={() => setActiveTab("register")}
          >
            Register
          </button>
        </div>

        {activeTab === "login" && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <input
              type="email"
              name="email"
              value={loginData.email}
              onChange={handleLoginChange}
              placeholder="Email"
              className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg text-white"
              required
            />
            <input
              type="password"
              name="password"
              value={loginData.password}
              onChange={handleLoginChange}
              placeholder="Password"
              className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg text-white"
              required
            />
            <button
              type="submit"
              className="w-full p-3 bg-yellow-500 text-gray-900 font-bold rounded-lg"
              disabled={loginMutation.isLoading}
            >
              {loginMutation.isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        )}

        {activeTab === "register" && (
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <input
              type="text"
              name="name"
              value={registerData.name}
              onChange={handleRegisterChange}
              placeholder="Full Name"
              className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg text-white"
              required
            />
            <input
              type="email"
              name="email"
              value={registerData.email}
              onChange={handleRegisterChange}
              placeholder="Email"
              className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg text-white"
              required
            />
            <input
              type="password"
              name="password"
              value={registerData.password}
              onChange={handleRegisterChange}
              placeholder="Password"
              className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg text-white"
              required
            />
            <input
              type="password"
              name="confirmPassword"
              value={registerData.confirmPassword}
              onChange={handleRegisterChange}
              placeholder="Confirm Password"
              className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg text-white"
              required
            />
            <button
              type="submit"
              className="w-full p-3 bg-green-500 text-white font-bold rounded-lg"
              disabled={registerMutation.isLoading}
            >
              {registerMutation.isLoading ? "Creating..." : "Create Account"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default memo(Login);
