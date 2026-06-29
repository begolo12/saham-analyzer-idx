"use client";

import { useEffect, useState, useCallback } from "react";

export interface NetworkStatus {
  /** Whether the browser reports being online */
  isOnline: boolean;
  /** Whether the connection is slow (based on Network Information API) */
  isSlow: boolean;
  /** Effective connection type if available (e.g. '4g', '3g', '2g', 'slow-2g') */
  effectiveType: string | null;
  /** Downlink speed in Mbps if available */
  downlink: number | null;
  /** Whether the user has data-saver enabled */
  saveData: boolean;
}

/**
 * Hook to track network connectivity status.
 * Listens for online/offline events and queries the Network Information API.
 */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(() => {
    if (typeof navigator === "undefined") {
      return {
        isOnline: true,
        isSlow: false,
        effectiveType: null,
        downlink: null,
        saveData: false,
      };
    }
    return {
      isOnline: navigator.onLine,
      isSlow: false,
      effectiveType: null,
      downlink: null,
      saveData: false,
    };
  });

  const updateConnectionInfo = useCallback(() => {
    if (typeof navigator === "undefined") return;

    const conn = (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection;

    if (conn) {
      setStatus((prev) => ({
        ...prev,
        effectiveType: conn.effectiveType ?? null,
        downlink: conn.downlink ?? null,
        saveData: conn.saveData ?? false,
        isSlow:
          conn.effectiveType === "slow-2g" ||
          conn.effectiveType === "2g" ||
          (conn.downlink != null && conn.downlink < 1.5),
      }));
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () =>
      setStatus((prev) => ({ ...prev, isOnline: true }));
    const handleOffline = () =>
      setStatus((prev) => ({ ...prev, isOnline: false }));

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Listen for connection changes
    const conn = (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection;

    if (conn) {
      conn.addEventListener("change", updateConnectionInfo);
      updateConnectionInfo();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (conn) {
        conn.removeEventListener("change", updateConnectionInfo);
      }
    };
  }, [updateConnectionInfo]);

  return status;
}
