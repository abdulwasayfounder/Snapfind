import React, { useEffect, useRef } from "react";

/**
 * Global Route Scroll Restoration Reset Hook
 *
 * Ensures that whenever the active route/view or browser navigation (back/forward)
 * changes, the main scroll container (and window/body) is immediately and reliably
 * reset to the top (0, 0), preventing stale scroll positions from leaking across pages.
 */
export function useRouteScrollReset(
  currentRoute: string,
  containerRef?: React.RefObject<HTMLElement | null>
) {
  const isFirstMount = useRef(true);

  // Set browser scroll restoration to manual so the browser does not restore previous scroll positions
  useEffect(() => {
    if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
      try {
        window.history.scrollRestoration = "manual";
      } catch {
        // Fallback for environments with restricted history API
      }
    }
  }, []);

  // Trigger instantaneous scroll reset whenever the route/view changes
  useEffect(() => {
    const resetScroll = () => {
      // 1. Reset main content container if ref provided
      if (containerRef?.current) {
        containerRef.current.scrollTop = 0;
        containerRef.current.scrollLeft = 0;
      }

      // 2. Also query DOM element for main content container
      if (typeof document !== "undefined") {
        const mainContainer = document.getElementById("main-content-scroll-container");
        if (mainContainer) {
          mainContainer.scrollTop = 0;
          mainContainer.scrollLeft = 0;
        }

        if (document.documentElement) {
          document.documentElement.scrollTop = 0;
          document.documentElement.scrollLeft = 0;
        }

        if (document.body) {
          document.body.scrollTop = 0;
          document.body.scrollLeft = 0;
        }
      }

      // 3. Reset window
      if (typeof window !== "undefined") {
        window.scrollTo({
          top: 0,
          left: 0,
          behavior: "instant",
        });
      }
    };

    resetScroll();

    // In case motion layout animations or async DOM updates settle in next frames
    const frameId1 = requestAnimationFrame(() => {
      resetScroll();
    });
    const timerId = setTimeout(() => {
      resetScroll();
    }, 50);

    isFirstMount.current = false;

    return () => {
      cancelAnimationFrame(frameId1);
      clearTimeout(timerId);
    };
  }, [currentRoute, containerRef]);

  // Handle browser popstate / back / forward navigation
  useEffect(() => {
    const handlePopState = () => {
      if (containerRef?.current) {
        containerRef.current.scrollTop = 0;
        containerRef.current.scrollLeft = 0;
      }

      if (typeof document !== "undefined") {
        const mainContainer = document.getElementById("main-content-scroll-container");
        if (mainContainer) {
          mainContainer.scrollTop = 0;
          mainContainer.scrollLeft = 0;
        }
        if (document.documentElement) {
          document.documentElement.scrollTop = 0;
        }
        if (document.body) {
          document.body.scrollTop = 0;
        }
      }

      if (typeof window !== "undefined") {
        window.scrollTo({
          top: 0,
          left: 0,
          behavior: "instant",
        });
      }
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("hashchange", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("hashchange", handlePopState);
    };
  }, [containerRef]);
}
