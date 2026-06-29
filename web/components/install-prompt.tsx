"use client";

import { useEffect, useState, useCallback } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Custom PWA install prompt banner.
 *
 * Intercepts the `beforeinstallprompt` event and shows a branded
 * install banner instead of the default browser prompt.
 */
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Don't show if already installed
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true
    ) {
      return;
    }

    // Don't show if previously dismissed
    try {
      if (localStorage.getItem("pwa-install-dismissed") === "true") return;
    } catch {
      // ignore
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show after a short delay so it doesn't feel jarring
      setTimeout(() => setIsVisible(true), 2000);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    setIsInstalling(true);
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsVisible(false);
      }
    } catch {
      // ignore
    } finally {
      setDeferredPrompt(null);
      setIsInstalling(false);
    }
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    try {
      localStorage.setItem("pwa-install-dismissed", "true");
    } catch {
      // ignore
    }
  }, []);

  // Re-show after 7 days if dismissed
  useEffect(() => {
    try {
      const dismissedAt = localStorage.getItem("pwa-install-dismissed-at");
      if (dismissedAt) {
        const daysSinceDismiss =
          (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60 * 24);
        if (daysSinceDismiss > 7) {
          localStorage.removeItem("pwa-install-dismissed");
          localStorage.removeItem("pwa-install-dismissed-at");
        }
      }
    } catch {
      // ignore
    }
  }, []);

  if (!isVisible || !deferredPrompt) return null;

  return (
    <div
      className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-6 md:w-80"
      role="dialog"
      aria-label="Install aplikasi"
    >
      <div className="rounded-xl border bg-card p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 p-2 rounded-lg bg-primary/10">
            <Download className="h-5 w-5 text-primary" aria-hidden />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold">Install SahamIDX</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Akses lebih cepat, bisa offline, dan tanpa browser chrome.
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 rounded hover:bg-muted"
            aria-label="Tutup"
          >
            <X className="h-4 w-4 text-muted-foreground" aria-hidden />
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          <Button
            size="sm"
            onClick={handleInstall}
            disabled={isInstalling}
            className="flex-1 min-h-9"
          >
            {isInstalling ? "Menginstall..." : "Install"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDismiss}
            className="min-h-9"
          >
            Nanti
          </Button>
        </div>
      </div>
    </div>
  );
}
