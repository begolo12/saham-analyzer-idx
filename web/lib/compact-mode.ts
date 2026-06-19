/**
 * Compact Mode — global toggle for denser UI.
 *
 * When ON:
 * - Smaller font sizes (12px base instead of 14px)
 * - Tighter padding (compact-p class)
 * - Hide secondary subtitles
 *
 * When OFF (default):
 * - Normal padding, font sizes
 */

"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "saham_compact_mode";

export function useCompactMode(): {
  compact: boolean;
  setCompact: (v: boolean) => void;
  mounted: boolean;
} {
  const [compact, setCompactState] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const isCompact = stored === "1";
      setCompactState(isCompact);
      // Apply class immediately to avoid FOUC
      if (typeof document !== "undefined" && isCompact) {
        document.documentElement.classList.add("compact");
      }
    } catch {
      // ignore
    }
  }, []);

  const setCompact = (v: boolean) => {
    setCompactState(v);
    try {
      localStorage.setItem(STORAGE_KEY, v ? "1" : "0");
    } catch {
      // ignore
    }
    // Apply/remove class on html
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("compact", v);
    }
  };

  return { compact, setCompact, mounted };
}
