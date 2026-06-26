"use client";

import { useRef, useCallback } from "react";

interface SwipeOptions {
  /** Minimum horizontal distance in px to register as swipe (default 50) */
  threshold?: number;
  /** Max vertical movement allowed before canceling swipe (default 30) */
  verticalTolerance?: number;
  /** Callback for left swipe (swipe-to-left = user swiped from right to left) */
  onSwipeLeft?: () => void;
  /** Callback for right swipe (swipe-to-right = user swiped from left to right) */
  onSwipeRight?: () => void;
  /** Whether swipe is disabled */
  disabled?: boolean;
}

/**
 * Swipe gesture hook. Returns touch event handlers to spread on an element.
 * Cancels if vertical movement exceeds horizontal movement.
 */
export function useSwipe({
  threshold = 50,
  verticalTolerance = 30,
  onSwipeLeft,
  onSwipeRight,
  disabled = false,
}: SwipeOptions) {
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const activeRef = useRef(false);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return;
      startXRef.current = e.touches[0].clientX;
      startYRef.current = e.touches[0].clientY;
      activeRef.current = true;
    },
    [disabled]
  );

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!activeRef.current || disabled) return;
      activeRef.current = false;

      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const dx = endX - startXRef.current;
      const dy = endY - startYRef.current;

      // Cancel if vertical movement exceeds tolerance
      if (Math.abs(dy) > verticalTolerance) return;

      if (Math.abs(dx) >= threshold) {
        if (dx < 0 && onSwipeLeft) {
          onSwipeLeft();
        } else if (dx > 0 && onSwipeRight) {
          onSwipeRight();
        }
      }
    },
    [disabled, threshold, verticalTolerance, onSwipeLeft, onSwipeRight]
  );

  return {
    onTouchStart,
    onTouchEnd,
  };
}
