import React, { useEffect, useState } from "react";
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

  useEffect(() => {
    document.title = "POS | Auth";

    // ✅ FIXED: Immediate authentication check - removed artificial delay
    if (userData && userData._id) {
      navigate("/");
    } else {
      // ✅ FIXED: Remove setTimeout for immediate rendering
      setIsCheckingAuth(false);
    }
  }, [userData, navigate]);

  const [isRegister, setIsRegister] = useState(false);

  // Show loading while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="relative flex items-center justify-center min-h-screen w-full overflow-hidden bg-black">
        {/* 🔹 Background Image */}
        <img
          src={restaurant}
          alt="Restaurant Background"
          className="absolute inset-0 w-full h-full object-cover brightness-[0.55] scale-105 animate-zoom-fast"
          loading="eager"
        />

        {/* 🔹 Overlay & Depth Layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/75 to-yellow-900/10"></div>

        {/* 🔹 Ambient Glow Lights */}
        <div className="absolute w-72 h-72 bg-yellow-500/25 rounded-full blur-[120px] top-[10%] left-[8%] animate-glow-fast" />
        <div className="absolute w-96 h-96 bg-yellow-400/20 rounded-full blur-[150px] bottom-[10%] right-[10%] animate-glow-slow" />

        {/* 🔹 Loading Spinner */}
        <div className="relative z-10 flex flex-col items-center justify-center gap-4">
          <div className="h-16 w-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-yellow-300 text-lg font-semibold">
            Checking authentication...
          </p>
        </div>

        {/* 🔹 Animations */}
        <style>{`
          @keyframes zoom-fast {
            0%, 100% { transform: scale(1.05); }
            50% { transform: scale(1.08); }
          }
          @keyframes glow-fast {
            0%, 100% { opacity: 0.25; transform: scale(1); }
            50% { opacity: 0.4; transform: scale(1.05); }
          }
          @keyframes glow-slow {
            0%, 100% { opacity: 0.2; transform: scale(1); }
            50% { opacity: 0.3; transform: scale(1.1); }
          }
          .animate-zoom-fast {
            animation: zoom-fast 10s ease-in-out infinite;
          }
          .animate-glow-fast {
            animation: glow-fast 6s ease-in-out infinite;
          }
          .animate-glow-slow {
            animation: glow-slow 12s ease-in-out infinite;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="relative flex items-center justify-center min-h-screen w-full overflow-hidden bg-black">
      {/* 🔹 Background Image */}
      <img
        src={restaurant}
        alt="Restaurant Background"
        className="absolute inset-0 w-full h-full object-cover brightness-[0.55] scale-105 animate-zoom-fast"
        loading="eager"
      />

      {/* 🔹 Overlay & Depth Layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/75 to-yellow-900/10"></div>

      {/* 🔹 Ambient Glow Lights */}
      <div className="absolute w-72 h-72 bg-yellow-500/25 rounded-full blur-[120px] top-[10%] left-[8%] animate-glow-fast" />
      <div className="absolute w-96 h-96 bg-yellow-400/20 rounded-full blur-[150px] bottom-[10%] right-[10%] animate-glow-slow" />

      {/* 🔹 Main Content */}
      <div className="relative z-10 flex flex-col lg:flex-row items-center justify-center w-full max-w-6xl mx-auto px-6 py-10 gap-10">
        {/* Left Section (Form) */}
        <div className="flex-1 flex flex-col items-center justify-center w-full">
          <div className="relative bg-white/10 backdrop-blur-xl border border-yellow-200/20 rounded-3xl shadow-2xl p-10 w-full max-w-sm text-white transition-all duration-300 hover:bg-white/15">
            {/* Border Glow */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-yellow-400/20 to-transparent opacity-40 blur-2xl pointer-events-none" />

            {/* Logo & Title */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative h-28 w-28 flex items-center justify-center rounded-full bg-white shadow-lg shadow-yellow-400/40 border border-yellow-200/40 transition-transform duration-300 hover:scale-105">
                <img
                  src={logo}
                  alt="Delish Logo"
                  className="h-26 w-26 object-contain"
                />
                {/* Soft outer glow */}
                <div className="absolute inset-0 rounded-full bg-yellow-400/30 blur-md opacity-40"></div>
              </div>

              <h1 className="text-3xl font-semibold text-yellow-300 text-center drop-shadow-lg">
                Delish Cheesecake
              </h1>
            </div>

            {/* Title */}
            <h2 className="text-xl text-center mt-6 font-semibold text-yellow-300 mb-6">
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
              <p className="text-sm text-gray-300">
                {isRegister
                  ? "Already have an account?"
                  : "Don't have an account?"}{" "}
                <span
                  onClick={() => setIsRegister(!isRegister)}
                  className="text-yellow-400 font-semibold hover:underline cursor-pointer hover:text-yellow-300 transition-all"
                >
                  {isRegister ? "Sign in" : "Sign up"}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Right Section (Quote) */}
        <div className="flex-1 flex items-center justify-center w-full">
          <div className="relative bg-white/10 backdrop-blur-xl border border-yellow-200/20 rounded-3xl shadow-2xl p-10 text-center text-white transition-all duration-300 hover:bg-white/15 max-w-md">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-yellow-400/20 to-transparent opacity-40 blur-2xl pointer-events-none" />
            <h3 className="text-2xl font-semibold text-yellow-300 mb-3 drop-shadow-md">
              "At Delish Cheesecake..."
            </h3>
            <blockquote className="text-lg italic leading-relaxed text-gray-100">
              We don't just serve desserts — we serve{" "}
              <span className="text-yellow-400 font-medium">moments</span>. From
              the first sip of coffee to the last bite of cheesecake, every
              plate is a promise of warmth, flavor, and{" "}
              <span className="text-yellow-300 font-medium">
                Filipino hospitality
              </span>
              .
            </blockquote>
          </div>
        </div>
      </div>

      {/* 🔹 Animations */}
      <style>{`
        @keyframes zoom-fast {
          0%, 100% { transform: scale(1.05); }
          50% { transform: scale(1.08); }
        }
        @keyframes glow-fast {
          0%, 100% { opacity: 0.25; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.05); }
        }
        @keyframes glow-slow {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(1.1); }
        }
        .animate-zoom-fast {
          animation: zoom-fast 10s ease-in-out infinite;
        }
        .animate-glow-fast {
          animation: glow-fast 6s ease-in-out infinite;
        }
        .animate-glow-slow {
          animation: glow-slow 12s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default Auth;
