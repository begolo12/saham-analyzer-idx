"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface PullToRefreshOptions {
  /** Threshold in px to trigger refresh (default 80) */
  threshold?: number;
  /** Max pull distance in px (default 120) */
  maxPull?: number;
  /** Refresh callback — should return a promise */
  onRefresh: () => Promise<void>;
  /** Whether refresh is currently in progress */
  disabled?: boolean;
}

interface PullToRefreshState {
  /** Current pull distance in px */
  pullDistance: number;
  /** Whether threshold has been reached */
  isThresholdReached: boolean;
  /** Whether refresh is in progress */
  isRefreshing: boolean;
  /** Bind this to the scrollable container */
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
  };
}

export function usePullToRefresh({
  threshold = 80,
  maxPull = 120,
  onRefresh,
  disabled = false,
}: PullToRefreshOptions): PullToRefreshState {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isThresholdReached, setIsThresholdReached] = useState(false);

  const startYRef = useRef(0);
  const pullingRef = useRef(false);
  const scrollableRef = useRef(false);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || isRefreshing) return;
      // Only activate if scrolled to top
      const el = e.currentTarget as HTMLElement;
      if (el.scrollTop > 0) {
        scrollableRef.current = true;
        return;
      }
      scrollableRef.current = false;
      startYRef.current = e.touches[0].clientY;
      pullingRef.current = true;
    },
    [disabled, isRefreshing]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!pullingRef.current || scrollableRef.current || disabled || isRefreshing) return;

      const currentY = e.touches[0].clientY;
      const diff = currentY - startYRef.current;

      if (diff <= 0) {
        setPullDistance(0);
        setIsThresholdReached(false);
        return;
      }

      // Apply resistance curve (diminishing returns)
      const resistance = 0.5;
      const distance = Math.min(diff * resistance, maxPull);

      e.preventDefault(); // prevent native scroll while pulling
      setPullDistance(distance);
      setIsThresholdReached(distance >= threshold);
    },
    [disabled, isRefreshing, threshold, maxPull]
  );

  const handleTouchEnd = useCallback(() => {
    if (!pullingRef.current || disabled) return;
    pullingRef.current = false;

    if (isThresholdReached && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(threshold * 0.6); // snap to partial

      onRefresh().finally(() => {
        setIsRefreshing(false);
        setPullDistance(0);
        setIsThresholdReached(false);
      });
    } else {
      setPullDistance(0);
      setIsThresholdReached(false);
    }
  }, [disabled, isThresholdReached, isRefreshing, onRefresh, threshold]);

  return {
    pullDistance,
    isThresholdReached,
    isRefreshing,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}
