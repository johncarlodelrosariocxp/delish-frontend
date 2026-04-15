import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  lazy,
  Suspense,
} from "react";
import loginBg from "../assets/images/loginbg.jpeg";
import logo from "../assets/images/delish.png";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

// Lazy load components with preloading
const Register = lazy(() => import("../components/auth/Register"));
const Login = lazy(() => import("../components/auth/Login"));

// Preload critical components immediately
const preloadComponents = () => {
  import("../components/auth/Login");
  import("../components/auth/Register");
};

const Auth = () => {
  const navigate = useNavigate();
  const userData = useSelector((state) => state.user);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isRegister, setIsRegister] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Preload components on mount
  useEffect(() => {
    preloadComponents();
  }, []);

  // Ultra-fast authentication check
  const checkAuthentication = useCallback(() => {
    // Check both Redux state and localStorage
    const token = localStorage.getItem("token");
    if (userData?._id && token) {
      navigate("/", { replace: true });
      return true;
    }
    setIsCheckingAuth(false);
    return false;
  }, [userData, navigate]);

  // Optimized effect with immediate execution
  useEffect(() => {
    document.title = "POS | Auth";

    // Immediate check on mount
    const timer = setTimeout(() => {
      if (!checkAuthentication()) {
        setIsCheckingAuth(false);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [checkAuthentication]);

  // Preload main app routes in background
  useEffect(() => {
    const preloadApp = () => {
      // Use requestIdleCallback for non-critical preloading
      if ("requestIdleCallback" in window) {
        requestIdleCallback(() => {
          import(/* webpackPrefetch: true */ "../App");
        });
      } else {
        setTimeout(() => {
          import(/* webpackPrefetch: true */ "../App");
        }, 1000);
      }
    };

    preloadApp();
  }, []);

  // Fast loading fallback
  if (isCheckingAuth) {
    return (
      <div className="relative flex items-center justify-center min-h-screen w-full overflow-hidden bg-black">
        {/* Background with actual image */}
        <div className="absolute inset-0 w-full h-full">
          <img
            src="/delish.jpg"
            alt="Restaurant Background"
            className="w-full h-full object-cover"
            style={{ filter: "brightness(0.85)" }}
            loading="eager"
          />
        </div>
        {/* Fast loading indicator */}
        <div className="relative z-10 flex flex-col items-center justify-center gap-3">
          <div className="h-8 w-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-yellow-300 text-xs font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex items-center justify-center min-h-screen w-full overflow-hidden bg-black">
      {/* Background Layer - delish.jpg */}
      <div className="fixed inset-0 w-full h-full -z-20">
        <img
          src="/delish.jpg"
          alt="Restaurant Background"
          className="w-full h-full object-cover"
          style={{ 
            filter: "brightness(0.85)",
            objectPosition: "center"
          }}
          loading="eager"
          decoding="async"
          onLoad={() => setImageLoaded(true)}
        />
        {!imageLoaded && (
          <div className="absolute inset-0 bg-gray-900 animate-pulse"></div>
        )}
      </div>

      {/* Overlay Layer - Lighter overlay for better readability */}
      <div className="fixed inset-0 bg-black/10 -z-10"></div>

     

      {/* Main Content Container - CENTERED */}
      <div className="relative z-20 flex items-center justify-center w-full max-w-md mx-auto px-4 py-6 min-h-screen">
        {/* Form Section - Centered */}
        <div className="w-full">
          <div className="bg-transparent backdrop-blur-sm border border-yellow-200/30 rounded-xl shadow-lg p-6 w-full text-white">
            {/* Optimized Logo Section */}
            <div className="flex flex-col items-center gap-2 mb-4">
              <div className="h-16 w-16 flex items-center justify-center rounded-full bg-white/90 shadow-sm">
                <img
                  src={logo}
                  alt="Delish Logo"
                  className="h-14 w-14 object-contain"
                  loading="eager"
                  decoding="sync"
                />
              </div>
              <h1 className="text-xl font-semibold text-yellow-300 text-center">
                Delish Cheesecake
              </h1>
            </div>

            {/* Form Title */}
            <h2 className="text-base text-center font-semibold text-yellow-300 mb-4">
              {isRegister ? "Employee Registration" : "Employee Login"}
            </h2>

            {/* Lazy Loaded Forms with Suspense */}
            <Suspense
              fallback={
                <div className="flex justify-center py-8">
                  <div className="h-6 w-6 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                </div>
              }
            >
              {isRegister ? (
                <Register setIsRegister={setIsRegister} />
              ) : (
                <Login />
              )}
            </Suspense>

            {/* Switch Auth Mode */}
            <div className="flex justify-center mt-4">
              <p className="text-xs text-gray-300">
                {isRegister ? "Have an account?" : "No account?"}{" "}
                <button
                  onClick={() => setIsRegister(!isRegister)}
                  className="text-yellow-400 font-medium hover:text-yellow-300 transition-colors duration-150 focus:outline-none"
                  aria-label={
                    isRegister ? "Switch to login" : "Switch to register"
                  }
                >
                  {isRegister ? "Sign in" : "Sign up"}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Export with React.memo and display name
export default React.memo(Auth);