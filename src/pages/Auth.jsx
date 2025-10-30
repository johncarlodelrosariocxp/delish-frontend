import React, { useEffect, useState } from "react";
import restaurant from "../assets/images/restaurant-img.jpg";
import logo from "../assets/images/delish.png";
import Register from "../components/auth/Register";
import Login from "../components/auth/Login";

const Auth = () => {
  useEffect(() => {
    document.title = "POS | Auth";
  }, []);

  const [isRegister, setIsRegister] = useState(false);

  return (
    <div className="flex flex-col lg:flex-row min-h-screen w-full">
      {/* Form Section (Top on mobile, right on desktop) */}
      <div className="w-full lg:w-1/2 min-h-screen bg-gray-300 p-6 md:p-10 flex flex-col justify-center">
        <div className="flex flex-col items-center gap-4">
          <img
            src={logo}
            alt="Delish Logo"
            className="h-44 w-44 border-2 rounded-full p-1"
          />
          <h1 className="text-2xl font-semibold text-gray-800 tracking-wide text-center">
            Delish Cheesecake
          </h1>
        </div>

        <h2 className="text-2xl md:text-3xl text-center mt-10 font-semibold text-yellow-500 mb-10">
          {isRegister ? "Employee Registration" : "Employee Login"}
        </h2>

        <div className="w-full max-w-md mx-auto">
          {isRegister ? <Register setIsRegister={setIsRegister} /> : <Login />}
        </div>

        <div className="flex justify-center mt-6">
          <p className="text-sm text-gray-700">
            {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
            <span
              onClick={() => setIsRegister(!isRegister)}
              className="text-yellow-600 font-semibold hover:underline cursor-pointer"
            >
              {isRegister ? "Sign in" : "Sign up"}
            </span>
          </p>
        </div>
      </div>

      {/* Image Section (Bottom on mobile, left on desktop) */}
      <div className="w-full lg:w-1/2 relative flex items-center justify-center bg-cover">
        <img
          className="w-full h-full object-cover"
          src={restaurant}
          alt="Restaurant Image"
        />
        <div className="absolute inset-0 bg-black bg-opacity-80"></div>
        <blockquote className="absolute bottom-10 px-8 mb-10 text-xl md:text-2xl italic text-white text-center">
          “At Delish Cheesecake, we don’t just serve desserts. We serve moments.
          From the first sip of coffee to the last bite of cheesecake, every
          plate is a promise of warmth, flavor, and Filipino hospitality."
        </blockquote>
      </div>
    </div>
  );
};

export default Auth;
