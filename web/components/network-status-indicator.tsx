"use client";

import { useEffect, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { cn } from "@/lib/utils";

/**
 * Floating banner that appears when the user goes offline,
 * and briefly shows a "back online" message when connectivity returns.
 */
export function NetworkStatusIndicator() {
  const { isOnline } = useNetworkStatus();
  const [show, setShow] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setShow(true);
      setWasOffline(true);
    } else if (wasOffline) {
      // Briefly show "back online" then hide
      setShow(true);
      const timer = setTimeout(() => {
        setShow(false);
        setWasOffline(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  if (!show) return null;

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-2 py-1.5 px-4 text-xs font-medium transition-all duration-300",
        isOnline
          ? "bg-green-600 text-white"
          : "bg-amber-500 text-white",
      )}
      role="status"
      aria-live="assertive"
    >
      {isOnline ? (
        <>
          <Wifi className="h-3.5 w-3.5" aria-hidden />
          <span>Kembali online</span>
        </>
      ) : (
        <>
          <WifiOff className="h-3.5 w-3.5" aria-hidden />
          <span>Tidak ada koneksi internet</span>
        </>
      )}
    </div>
  );
}
