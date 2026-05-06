// hooks/usePreventPullToRefresh.js
import { useEffect } from "react";

const usePreventPullToRefresh = (enabled = true) => {
  useEffect(() => {
    if (!enabled) return;

    let touchStartY = 0;
    let touchStartX = 0;
    let scrollElement = null;

    const findScrollableParent = (element, direction = "vertical") => {
      let parent = element;
      while (
        parent &&
        parent !== document.body &&
        parent !== document.documentElement
      ) {
        const style = window.getComputedStyle(parent);
        const overflow =
          direction === "vertical" ? style.overflowY : style.overflowX;
        if (overflow === "auto" || overflow === "scroll") {
          return parent;
        }
        parent = parent.parentElement;
      }
      return null;
    };

    const handleTouchStart = (e) => {
      touchStartY = e.touches[0].clientY;
      touchStartX = e.touches[0].clientX;

      // Find the actual scrollable element that contains the target
      scrollElement = findScrollableParent(e.target, "vertical");

      // If no scrollable parent found, use the root element
      if (!scrollElement) {
        const root = document.getElementById("root");
        if (root && root.scrollHeight > root.clientHeight) {
          scrollElement = root;
        }
      }
    };

    const handleTouchMove = (e) => {
      if (!scrollElement) return;

      const touchY = e.touches[0].clientY;
      const deltaY = touchY - touchStartY;
      const isPullingDown = deltaY > 0;

      // Check if at top of scroll container
      const isAtTop = scrollElement.scrollTop <= 0;

      // Prevent pull-to-refresh only when at top and pulling down
      if (isAtTop && isPullingDown) {
        e.preventDefault();
      }
    };

    document.addEventListener("touchstart", handleTouchStart, {
      passive: false,
    });
    document.addEventListener("touchmove", handleTouchMove, { passive: false });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
    };
  }, [enabled]);
};

export default usePreventPullToRefresh;
