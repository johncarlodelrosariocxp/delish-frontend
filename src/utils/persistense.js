// Simple data persistence without external dependencies
export class DataPersistence {
  constructor() {
    this.storageKey = "delish_pos_data";
    this.autoSaveInterval = null;
  }

  // Save data to localStorage
  async saveData(key, data) {
    try {
      const dataToStore = {
        data,
        timestamp: new Date().toISOString(),
        version: "1.0",
      };

      localStorage.setItem(
        `${this.storageKey}_${key}`,
        JSON.stringify(dataToStore)
      );

      // Also save to session storage for immediate access
      sessionStorage.setItem(
        `${this.storageKey}_${key}`,
        JSON.stringify(dataToStore)
      );

      return true;
    } catch (error) {
      console.error("Error saving data:", error);
      // Fallback to sessionStorage if localStorage fails
      try {
        const dataToStore = {
          data,
          timestamp: new Date().toISOString(),
          version: "1.0",
        };
        sessionStorage.setItem(
          `${this.storageKey}_${key}`,
          JSON.stringify(dataToStore)
        );
        return true;
      } catch (fallbackError) {
        console.error("Fallback save also failed:", fallbackError);
        return false;
      }
    }
  }

  // Load data from storage
  async loadData(key, defaultValue = null) {
    try {
      // Try localStorage first
      let storedData = localStorage.getItem(`${this.storageKey}_${key}`);

      // If not in localStorage, try sessionStorage
      if (!storedData) {
        storedData = sessionStorage.getItem(`${this.storageKey}_${key}`);
      }

      if (!storedData) {
        return defaultValue;
      }

      const parsedData = JSON.parse(storedData);

      // Validate data structure
      if (parsedData && parsedData.data !== undefined) {
        return parsedData.data;
      }

      return parsedData || defaultValue;
    } catch (error) {
      console.error("Error loading data:", error);
      return defaultValue;
    }
  }

  // Start auto-save interval
  startAutoSave(getStateFunc, interval = 10000) {
    // 10 seconds
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }

    this.autoSaveInterval = setInterval(async () => {
      const state = getStateFunc();
      await this.saveData("pos_state", state);
      console.log("Auto-saved data");
    }, interval);
  }

  // Stop auto-save
  stopAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  // Clear all stored data
  async clearAllData() {
    try {
      // Clear all keys related to this app
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith(this.storageKey)) {
          localStorage.removeItem(key);
        }
      });

      Object.keys(sessionStorage).forEach((key) => {
        if (key.startsWith(this.storageKey)) {
          sessionStorage.removeItem(key);
        }
      });

      return true;
    } catch (error) {
      console.error("Error clearing data:", error);
      return false;
    }
  }

  // Setup emergency save
  setupEmergencySave(getStateFunc) {
    // Save on page unload
    window.addEventListener("beforeunload", async (event) => {
      const state = getStateFunc();
      await this.saveData("emergency_state", state);
    });

    // Save when page becomes hidden (mobile app switching)
    document.addEventListener("visibilitychange", async () => {
      if (document.visibilityState === "hidden") {
        const state = getStateFunc();
        await this.saveData("last_state", state);
      }
    });

    // Save when window loses focus
    window.addEventListener("blur", async () => {
      const state = getStateFunc();
      await this.saveData("blur_state", state);
    });
  }

  // Get all stored keys
  getAllKeys() {
    const keys = [];

    // Get from localStorage
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith(this.storageKey)) {
        keys.push(key.replace(`${this.storageKey}_`, ""));
      }
    });

    // Get from sessionStorage
    Object.keys(sessionStorage).forEach((key) => {
      if (key.startsWith(this.storageKey)) {
        const cleanKey = key.replace(`${this.storageKey}_`, "");
        if (!keys.includes(cleanKey)) {
          keys.push(cleanKey);
        }
      }
    });

    return keys;
  }
}

// Create singleton instance
export const dataPersistence = new DataPersistence();

// PWA Installation helpers
export const isAppInstalled = () => {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
};

export const showInstallPrompt = async () => {
  let deferredPrompt;

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;

    // Create and show install button
    const installButton = document.createElement("button");
    installButton.textContent = "📱 Install App";
    installButton.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 12px 24px;
      background-color: #2563eb;
      color: white;
      border: none;
      border-radius: 25px;
      cursor: pointer;
      font-weight: bold;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
      z-index: 10000;
      font-size: 14px;
    `;

    installButton.onclick = async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === "accepted") {
          console.log("User accepted the install prompt");
          installButton.remove();
        } else {
          console.log("User dismissed the install prompt");
        }

        deferredPrompt = null;
      }
    };

    document.body.appendChild(installButton);

    // Auto-hide after 30 seconds
    setTimeout(() => {
      if (installButton.parentNode) {
        installButton.remove();
      }
    }, 30000);
  });
};

// Service Worker Registration
export const registerServiceWorker = async () => {
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      });

      console.log("Service Worker registered with scope:", registration.scope);

      // Check for updates
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;

        newWorker.addEventListener("statechange", () => {
          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            // New update available
            if (confirm("New version available! Reload to update?")) {
              window.location.reload();
            }
          }
        });
      });

      return registration;
    } catch (error) {
      console.error("Service Worker registration failed:", error);
      return null;
    }
  }
  return null;
};

// Prevent accidental refresh
export const preventAccidentalRefresh = (shouldPrevent = true) => {
  if (shouldPrevent) {
    window.addEventListener("beforeunload", (e) => {
      e.preventDefault();
      e.returnValue =
        "You have unsaved changes. Are you sure you want to leave?";
      return e.returnValue;
    });
  } else {
    window.removeEventListener("beforeunload", () => {});
  }
};
