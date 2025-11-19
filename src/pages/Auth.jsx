import React, { useEffect, useState, useCallback } from "react";
import restaurant from "../assets/images/restaurant-img.jpg";
import logo from "../assets/images/delish.png";
import Register from "../components/auth/Register";
import Login from "../components/auth/Login";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

const Auth = () => {
  const navigate = useNavigate();
  const userData = useSelector((state) => state.user);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isRegister, setIsRegister] = useState(false);

  // Optimized authentication check with useCallback
  const checkAuthentication = useCallback(() => {
    if (userData?._id) {
      navigate("/", { replace: true });
    } else {
      setIsCheckingAuth(false);
    }
  }, [userData, navigate]);

  useEffect(() => {
    document.title = "POS | Auth";
    checkAuthentication();
  }, [checkAuthentication]);

  // Preload main application routes for faster navigation
  useEffect(() => {
    // Preload main application chunks
    const preloadRoutes = async () => {
      try {
        // This will preload the main bundle for faster navigation after login
        const module = await import(
          /* webpackChunkName: "main-app" */ "../App"
        );
      } catch (error) {
        console.log("Preloading main app");
      }
    };

    preloadRoutes();
  }, []);

  // Show loading while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="relative flex items-center justify-center min-h-screen w-full overflow-hidden bg-black">
        {/* Optimized Background with lower quality placeholder technique */}
        <div
          className="absolute inset-0 w-full h-full bg-cover bg-center scale-105 animate-zoom-fast"
          style={{
            backgroundImage: `url(${restaurant})`,
            filter: "brightness(0.55)",
          }}
        />

        {/* Minimal overlay */}
        <div className="absolute inset-0 bg-black/60"></div>

        {/* Fast loading spinner */}
        <div className="relative z-10 flex flex-col items-center justify-center gap-4">
          <div className="h-12 w-12 border-3 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-yellow-300 text-sm font-medium">
            Checking authentication...
          </p>
        </div>

        {/* Inline minimal animations */}
        <style>{`
          @keyframes zoom-fast {
            0%, 100% { transform: scale(1.05); }
            50% { transform: scale(1.08); }
          }
          .animate-zoom-fast {
            animation: zoom-fast 8s ease-in-out infinite;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="relative flex items-center justify-center min-h-screen w-full overflow-hidden bg-black">
      {/* Optimized Background Image */}
      <div
        className="absolute inset-0 w-full h-full bg-cover bg-center scale-105 animate-zoom-fast"
        style={{
          backgroundImage: `url(${restaurant})`,
          filter: "brightness(0.55)",
        }}
      />

      {/* Simplified Overlay */}
      <div className="absolute inset-0 bg-black/50"></div>

      {/* Minimal Ambient Effects */}
      <div className="absolute w-60 h-60 bg-yellow-500/10 rounded-full blur-100 top-10 left-8" />
      <div className="absolute w-80 h-80 bg-yellow-400/10 rounded-full blur-120 bottom-10 right-10" />

      {/* Main Content */}
      <div className="relative z-10 flex flex-col lg:flex-row items-center justify-center w-full max-w-6xl mx-auto px-4 py-8 gap-8">
        {/* Left Section (Form) */}
        <div className="flex-1 flex flex-col items-center justify-center w-full">
          <div className="relative bg-white/5 backdrop-blur-md border border-yellow-200/10 rounded-2xl shadow-xl p-8 w-full max-w-sm text-white">
            {/* Logo & Title */}
            <div className="flex flex-col items-center gap-3 mb-6">
              <div className="relative h-20 w-20 flex items-center justify-center rounded-full bg-white shadow-md border border-yellow-200/30">
                <img
                  src={logo}
                  alt="Delish Logo"
                  className="h-18 w-18 object-contain"
                  loading="eager"
                />
              </div>
              <h1 className="text-2xl font-semibold text-yellow-300 text-center">
                Delish Cheesecake
              </h1>
            </div>

            {/* Title */}
            <h2 className="text-lg text-center font-semibold text-yellow-300 mb-6">
              {isRegister ? "Employee Registration" : "Employee Login"}
            </h2>

            {/* Forms */}
            <div className="w-full">
              {isRegister ? (
                <Register setIsRegister={setIsRegister} />
              ) : (
                <Login />
              )}
            </div>

            {/* Switch Text */}
            <div className="flex justify-center mt-6">
              <p className="text-xs text-gray-300">
                {isRegister
                  ? "Already have an account?"
                  : "Don't have an account?"}{" "}
                <button
                  onClick={() => setIsRegister(!isRegister)}
                  className="text-yellow-400 font-semibold hover:text-yellow-300 transition-colors focus:outline-none"
                >
                  {isRegister ? "Sign in" : "Sign up"}
                </button>
              </p>
            </div>
          </div>
        </div>

        {/* Right Section (Quote) */}
        <div className="flex-1 flex items-center justify-center w-full">
          <div className="relative bg-white/5 backdrop-blur-md border border-yellow-200/10 rounded-2xl shadow-xl p-8 text-center text-white max-w-md">
            <h3 className="text-xl font-semibold text-yellow-300 mb-3">
              "At Delish Cheesecake..."
            </h3>
            <blockquote className="text-sm italic leading-relaxed text-gray-100">
              We don't just serve desserts — we serve{" "}
              <span className="text-yellow-400 font-medium">moments</span>.
              Every plate is a promise of warmth, flavor, and{" "}
              <span className="text-yellow-300 font-medium">
                Filipino hospitality
              </span>
              .
            </blockquote>
          </div>
        </div>
      </div>

      {/* Optimized Animations */}
      <style>{`
        @keyframes zoom-fast {
          0%, 100% { transform: scale(1.05); }
          50% { transform: scale(1.08); }
        }
        .animate-zoom-fast {
          animation: zoom-fast 10s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default React.memo(Auth);
