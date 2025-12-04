// Simple localStorage-based persistence without external dependencies
export class DataPersistence {
  constructor() {
    this.storageKey = "delish_pos";
    this.autoSaveInterval = null;
  }

  // Save data with timestamp
  async saveData(key, data) {
    try {
      const dataToStore = {
        data,
        timestamp: new Date().toISOString(),
        version: "2.0",
      };

      localStorage.setItem(
        `${this.storageKey}_${key}`,
        JSON.stringify(dataToStore)
      );
      return true;
    } catch (error) {
      console.error("Error saving data:", error);
      return false;
    }
  }

  // Load data
  async loadData(key, defaultValue = null) {
    try {
      const storedData = localStorage.getItem(`${this.storageKey}_${key}`);

      if (!storedData) {
        return defaultValue;
      }

      const parsedData = JSON.parse(storedData);
      return parsedData.data || defaultValue;
    } catch (error) {
      console.error("Error loading data:", error);
      return defaultValue;
    }
  }

  // Start auto-save interval
  startAutoSave(getStateFunc, interval = 30000) {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }

    this.autoSaveInterval = setInterval(async () => {
      const state = getStateFunc();
      await this.saveData("app_state", state);
      console.log("Auto-saved app state");
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
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith(this.storageKey)) {
          localStorage.removeItem(key);
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
    window.addEventListener("beforeunload", async (event) => {
      const state = getStateFunc();
      await this.saveData("emergency_state", state);
    });

    document.addEventListener("visibilitychange", async () => {
      if (document.visibilityState === "hidden") {
        const state = getStateFunc();
        await this.saveData("last_state", state);
      }
    });
  }
}

// Create singleton instance
export const dataPersistence = new DataPersistence();

// Service Worker Registration
export const registerServiceWorker = async () => {
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      });

      console.log("✅ Service Worker registered:", registration.scope);

      // Check for updates
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;

        newWorker.addEventListener("statechange", () => {
          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            console.log("🔄 New version available!");
            // You can show a notification to the user here
          }
        });
      });

      return registration;
    } catch (error) {
      console.error("❌ Service Worker registration failed:", error);
      return null;
    }
  }
  return null;
};

// PWA Installation helpers
export const isAppInstalled = () => {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true ||
    localStorage.getItem("app_installed") === "true"
  );
};

// Show install prompt
export const showInstallPrompt = () => {
  // This function will be called from index.html script
  console.log("Install prompt ready");
};

// Handle logout and clear data
export const handleLogout = () => {
  dataPersistence.clearAllData();
  localStorage.removeItem("delish_pos_state");
  localStorage.removeItem("token");
  localStorage.removeItem("user");

  // Dispatch logout event
  window.dispatchEvent(new CustomEvent("userLogout"));
};
