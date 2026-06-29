"use client";

import { useCallback, useRef } from "react";

/** Haptic feedback patterns via navigator.vibrate() */
const PATTERNS = {
  /** Light tap — button press, toggle */
  tap: [10],
  /** Success — added to watchlist, completed action */
  success: [10, 30, 10],
  /** Signal tap — tapping a stock signal */
  signal: [15, 20, 15],
  /** Swipe — swipe gesture recognized */
  swipe: [8],
  /** Error / warning */
  error: [30, 50, 30],
  /** Pull threshold reached */
  pull: [12],
} as const;

export type HapticPattern = keyof typeof PATTERNS;

/**
 * Haptic feedback hook using navigator.vibrate().
 * No-ops gracefully when vibration API is unavailable.
 * Respects prefers-reduced-motion.
 */
export function useHaptic() {
  const reducedMotionRef = useRef<boolean | null>(null);

  const shouldVibrate = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.vibrate) return false;
    if (reducedMotionRef.current === null) {
      reducedMotionRef.current = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
    }
    return !reducedMotionRef.current;
  }, []);

  const vibrate = useCallback(
    (pattern: HapticPattern = "tap") => {
      if (!shouldVibrate()) return;
      try {
        navigator.vibrate(PATTERNS[pattern]);
      } catch {
        // silently ignore
      }
    },
    [shouldVibrate]
  );

  /** Fire a custom vibration pattern (ms array) */
  const vibrateCustom = useCallback(
    (pattern: number[]) => {
      if (!shouldVibrate()) return;
      try {
        navigator.vibrate(pattern);
      } catch {
        // silently ignore
      }
    },
    [shouldVibrate]
  );

  return { vibrate, vibrateCustom };
}
