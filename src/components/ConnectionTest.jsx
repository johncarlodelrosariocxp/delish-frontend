// src/components/ConnectionTest.jsx
import { useEffect } from "react";
import { testConnection } from "../https/axiosWrapper";

const ConnectionTest = () => {
  useEffect(() => {
    // Test connection on component mount
    testConnection().then((result) => {
      if (!result.success) {
        console.log("🔧 Mobile Connection Tips:");
        console.log(
          "1. Backend URL:",
          window.location.origin.replace(":5173", ":8000")
        );
        console.log(
          "2. Check if backend is running: cd delish-backend && npm start"
        );
        console.log("3. Ensure same WiFi network");
      }
    });
  }, []);

  return null;
};

export default ConnectionTest;
