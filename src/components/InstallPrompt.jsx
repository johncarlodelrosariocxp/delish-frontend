import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";

const InstallPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const user = useSelector((state) => state.user);
  const isAuthenticated = user.isAuth || localStorage.getItem("token");

  useEffect(() => {
    // Only show install prompt to authenticated users
    if (!isAuthenticated) return;

    // Check if already installed
    const isStandalone = window.matchMedia(
      "(display-mode: standalone)"
    ).matches;
    if (isStandalone) return;

    // Check if user declined recently (24-hour cooldown)
    const declinedTime = localStorage.getItem("install_prompt_declined");
    if (declinedTime) {
      const hoursSinceDecline =
        (Date.now() - parseInt(declinedTime)) / (1000 * 60 * 60);
      if (hoursSinceDecline < 24) {
        return;
      }
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Auto-show after 10 seconds
    const timer = setTimeout(() => {
      if (!deferredPrompt && !localStorage.getItem("install_prompt_shown")) {
        setShowPrompt(true);
      }
    }, 10000);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      clearTimeout(timer);
    };
  }, [isAuthenticated, deferredPrompt]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === "accepted") {
        console.log("✅ User accepted the install prompt");
        setShowPrompt(false);
        localStorage.setItem("app_installed", "true");
        localStorage.setItem("install_date", new Date().toISOString());
      } else {
        console.log("❌ User dismissed the install prompt");
        localStorage.setItem("install_prompt_declined", Date.now());
        setShowPrompt(false);
      }

      setDeferredPrompt(null);
    } else {
      // Manual install instructions
      setShowPrompt(false);
      showManualInstallInstructions();
    }
  };

  const showManualInstallInstructions = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);

    let message = "";
    if (isIOS) {
      message =
        'To install: Tap the Share button and select "Add to Home Screen"';
    } else if (isAndroid) {
      message =
        'To install: Tap the menu (⋮) and select "Install app" or "Add to Home Screen"';
    } else {
      message =
        "To install: Click the install icon in your browser address bar";
    }

    alert(message);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("install_prompt_declined", Date.now());
    localStorage.setItem("install_prompt_shown", "true");
  };

  // Don't show if not authenticated or already installed
  if (!isAuthenticated || !showPrompt) return null;

  return (
    <div style={styles.installPrompt}>
      <div style={styles.promptContent}>
        <div style={styles.iconContainer}>
          <span style={styles.icon}>📱</span>
        </div>
        <div style={styles.textContainer}>
          <h3 style={styles.title}>Install Delish POS</h3>
          <p style={styles.description}>
            Install our app for faster access, offline mode, and better
            experience
          </p>
        </div>
        <div style={styles.buttonContainer}>
          <button onClick={handleInstallClick} style={styles.installButton}>
            Install Now
          </button>
          <button onClick={handleDismiss} style={styles.cancelButton}>
            Not Now
          </button>
        </div>
        <button onClick={handleDismiss} style={styles.closeButton}>
          ×
        </button>
      </div>
    </div>
  );
};

const styles = {
  installPrompt: {
    position: "fixed",
    bottom: "20px",
    left: "20px",
    right: "20px",
    backgroundColor: "white",
    borderRadius: "12px",
    padding: "16px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
    zIndex: 10000,
    border: "1px solid #e5e7eb",
    animation: "slideUp 0.3s ease-out",
    maxWidth: "500px",
    margin: "0 auto",
  },
  promptContent: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  iconContainer: {
    flexShrink: 0,
  },
  icon: {
    fontSize: "32px",
  },
  textContainer: {
    flex: 1,
  },
  title: {
    margin: 0,
    fontSize: "16px",
    fontWeight: "600",
    color: "#111827",
  },
  description: {
    margin: "4px 0 0 0",
    fontSize: "14px",
    color: "#6b7280",
    lineHeight: "1.4",
  },
  buttonContainer: {
    display: "flex",
    gap: "8px",
    flexShrink: 0,
  },
  installButton: {
    padding: "8px 16px",
    backgroundColor: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "14px",
    transition: "background-color 0.2s",
    whiteSpace: "nowrap",
  },
  cancelButton: {
    padding: "8px 16px",
    backgroundColor: "#f3f4f6",
    color: "#374151",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "500",
    fontSize: "14px",
    transition: "background-color 0.2s",
    whiteSpace: "nowrap",
  },
  closeButton: {
    position: "absolute",
    top: "-8px",
    right: "-8px",
    width: "24px",
    height: "24px",
    backgroundColor: "#9ca3af",
    color: "white",
    border: "none",
    borderRadius: "50%",
    cursor: "pointer",
    fontSize: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
  },
};

// Add CSS animation
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes slideUp {
    from {
      transform: translateY(100px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
  
  @keyframes pulse {
    0% {
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
    }
    50% {
      box-shadow: 0 4px 20px rgba(37, 99, 235, 0.5);
    }
    100% {
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
    }
  }
`;
document.head.appendChild(styleSheet);

export default InstallPrompt;
