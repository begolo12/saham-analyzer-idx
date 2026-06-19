"use client";

import { useEffect } from "react";

/**
 * Register service worker for PWA support.
 * Should be mounted once in root layout.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    // Only register in production or when explicitly enabled
    if (process.env.NODE_ENV !== "production" && !window.location.search.includes("sw=1")) {
      return;
    }

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });
        // Check for updates every page load
        registration.update();
        console.log("[SW] Registered:", registration.scope);
      } catch (err) {
        console.warn("[SW] Registration failed:", err);
      }
    };

    // Defer registration until page is idle to avoid blocking
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(registerSW);
    } else {
      setTimeout(registerSW, 1500);
    }
  }, []);

  return null;
}
