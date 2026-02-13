// src/main.jsx
import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { Provider } from "react-redux";
import store from "./redux/store.js";
import { SnackbarProvider } from "notistack";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
    },
  },
});

// Check for Bluetooth support on startup
if (!navigator.bluetooth) {
  console.warn(
    "⚠️ Web Bluetooth API is not available in this browser. Printing will be disabled."
  );

  // Show warning to user
  setTimeout(() => {
    if (localStorage.getItem("bluetooth_warning_shown") !== "true") {
      alert(
        "⚠️ Bluetooth printing is not supported in your browser.\n\n" +
          "Please use Chrome, Edge, or Opera on desktop, " +
          "or Chrome on Android for full printer functionality."
      );
      localStorage.setItem("bluetooth_warning_shown", "true");
    }
  }, 5000);
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <SnackbarProvider autoHideDuration={3000}>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </SnackbarProvider>
    </Provider>
  </React.StrictMode>
);
