import { useState, useCallback, memo } from "react";
import { register } from "../../https";
import { useMutation } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import PropTypes from "prop-types";

const Register = ({ setIsRegister }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "",
  });

  const [errors, setErrors] = useState({});

  // =============================
  // 📌 Handlers
  // =============================
  const handleChange = useCallback(
    (e) => {
      const { name, value } = e.target;
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));

      // Clear error when user starts typing
      if (errors[name]) {
        setErrors((prev) => ({ ...prev, [name]: "" }));
      }
    },
    [errors]
  );

  const handleRoleSelection = useCallback(
    (selectedRole) => {
      setFormData((prev) => ({ ...prev, role: selectedRole }));

      // Clear role error
      if (errors.role) {
        setErrors((prev) => ({ ...prev, role: "" }));
      }
    },
    [errors]
  );

  // =============================
  // 📌 Validation
  // =============================
  const validateForm = () => {
    const newErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    // Phone validation
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^\d{10,15}$/.test(formData.phone.replace(/\D/g, ""))) {
      newErrors.phone = "Please enter a valid phone number (10-15 digits)";
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    // Role validation
    if (!formData.role) {
      newErrors.role = "Please select a role";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();

      if (validateForm()) {
        registerMutation.mutate(formData);
      } else {
        enqueueSnackbar("Please fix the errors in the form", {
          variant: "error",
        });
      }
    },
    [formData]
  );

  // =============================
  // 📌 Register Mutation
  // =============================
  const registerMutation = useMutation({
    mutationFn: (reqData) => register(reqData),
    onSuccess: (res) => {
      if (res?.data?.success) {
        enqueueSnackbar(res.data.message || "Account created successfully!", {
          variant: "success",
        });

        // Reset form
        setFormData({
          name: "",
          email: "",
          phone: "",
          password: "",
          role: "",
        });
        setErrors({});

        // Switch to login after delay
        setTimeout(() => {
          setIsRegister(false);
        }, 1500);
      } else {
        enqueueSnackbar(res?.data?.message || "Registration failed", {
          variant: "error",
        });
      }
    },
    onError: (error) => {
      console.error("Registration error:", error);

      let errorMessage = "Registration failed. Please try again.";

      if (error?.code === "NETWORK_ERROR" || error?.code === "ECONNREFUSED") {
        errorMessage =
          "Cannot connect to server. Please check your connection.";
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.response?.data?.error) {
        // Handle validation errors from backend
        if (typeof error.response.data.error === "object") {
          const backendErrors = error.response.data.error;
          const firstError = Object.values(backendErrors)[0];
          errorMessage = firstError || "Please check your input";
        } else {
          errorMessage = error.response.data.error;
        }
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
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Create Account</h2>
        <p className="text-[#ababab] text-sm">
          Create a new employee account for Delish POS
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Name Field */}
        <div className="mb-4">
          <label className="block text-[#ababab] mb-2 text-sm font-medium">
            Employee Name *
          </label>
          <div
            className={`flex items-center rounded-lg p-4 bg-[#1f1f1f] border transition-colors ${
              errors.name
                ? "border-red-500"
                : "border-gray-700 focus-within:border-yellow-400"
            }`}
          >
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter employee name"
              className="bg-transparent flex-1 text-white focus:outline-none placeholder-gray-500 w-full"
              required
              disabled={registerMutation.isLoading}
            />
          </div>
          {errors.name && (
            <p className="text-red-400 text-xs mt-1">{errors.name}</p>
          )}
        </div>

        {/* Email Field */}
        <div className="mb-4">
          <label className="block text-[#ababab] mb-2 text-sm font-medium">
            Employee Email *
          </label>
          <div
            className={`flex items-center rounded-lg p-4 bg-[#1f1f1f] border transition-colors ${
              errors.email
                ? "border-red-500"
                : "border-gray-700 focus-within:border-yellow-400"
            }`}
          >
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
          {errors.email && (
            <p className="text-red-400 text-xs mt-1">{errors.email}</p>
          )}
        </div>

        {/* Phone Field */}
        <div className="mb-4">
          <label className="block text-[#ababab] mb-2 text-sm font-medium">
            Employee Phone *
          </label>
          <div
            className={`flex items-center rounded-lg p-4 bg-[#1f1f1f] border transition-colors ${
              errors.phone
                ? "border-red-500"
                : "border-gray-700 focus-within:border-yellow-400"
            }`}
          >
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Enter employee phone"
              className="bg-transparent flex-1 text-white focus:outline-none placeholder-gray-500 w-full"
              required
              disabled={registerMutation.isLoading}
            />
          </div>
          {errors.phone && (
            <p className="text-red-400 text-xs mt-1">{errors.phone}</p>
          )}
        </div>

        {/* Password Field */}
        <div className="mb-4">
          <label className="block text-[#ababab] mb-2 text-sm font-medium">
            Password *
          </label>
          <div
            className={`flex items-center rounded-lg p-4 bg-[#1f1f1f] border transition-colors ${
              errors.password
                ? "border-red-500"
                : "border-gray-700 focus-within:border-yellow-400"
            }`}
          >
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter password (min. 6 characters)"
              className="bg-transparent flex-1 text-white focus:outline-none placeholder-gray-500 w-full"
              required
              disabled={registerMutation.isLoading}
            />
          </div>
          {errors.password && (
            <p className="text-red-400 text-xs mt-1">{errors.password}</p>
          )}
        </div>

        {/* Role Selection */}
        <div className="mb-6">
          <label className="block text-[#ababab] mb-2 text-sm font-medium">
            Choose your role *
          </label>
          {errors.role && (
            <p className="text-red-400 text-xs mb-2">{errors.role}</p>
          )}

          <div className="flex gap-3">
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
          className="w-full rounded-lg py-4 text-lg bg-yellow-400 text-gray-900 font-bold hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-yellow-500/25"
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

      {/* Help Text */}
      <div className="mt-6 p-3 bg-gray-800 rounded-lg">
        <p className="text-gray-400 text-xs text-center">
          💡 <strong>Note:</strong> Admin accounts have full access to all
          features. Cashier accounts have limited access for daily operations.
        </p>
      </div>
    </div>
  );
};

// PropTypes validation
Register.propTypes = {
  setIsRegister: PropTypes.func.isRequired,
};

export default memo(Register);
