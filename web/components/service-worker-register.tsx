"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Register service worker for PWA support.
 * Shows an update banner when a new version is available.
 * Should be mounted once in root layout.
 */
export function ServiceWorkerRegister() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  const handleUpdate = useCallback(() => {
    if (!registration?.waiting) return;
    // Tell the waiting SW to skip waiting
    registration.waiting.postMessage({ type: "SKIP_WAITING" });
    // Reload once the new SW takes over
    const onControllerChange = () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
  }, [registration]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    // Only register in production or when explicitly enabled
    if (process.env.NODE_ENV !== "production" && !window.location.search.includes("sw=1")) {
      return;
    }

    const registerSW = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });
        setRegistration(reg);

        // Check for updates
        reg.update();

        // Listen for new service worker installing
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              // New content available, show update prompt
              setUpdateAvailable(true);
            }
          });
        });

        console.log("[SW] Registered:", reg.scope);
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

  if (!updateAvailable) return null;

  return (
    <div
      className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-6 md:w-80"
      role="alert"
      aria-label="Pembaruan tersedia"
    >
      <div className="rounded-xl border bg-card p-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 p-2 rounded-lg bg-primary/10">
            <RefreshCw className="h-4 w-4 text-primary" aria-hidden />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Versi baru tersedia</p>
            <p className="text-xs text-muted-foreground">
              Muat ulang untuk mendapatkan fitur terbaru.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={handleUpdate}
          className="w-full mt-3 min-h-9"
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" aria-hidden />
          Muat Ulang
        </Button>
      </div>
    </div>
  );
}
