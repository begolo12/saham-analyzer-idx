"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { RealtimeQuote } from "@/lib/realtime";

interface UseRealtimePriceOptions {
  /** Auto-refresh interval in ms (default: 5 minutes) */
  refreshInterval?: number;
  /** Tickers to fetch (default: [ticker]) */
  watchlist?: string[];
  /** Whether to fetch on mount (default: true) */
  enabled?: boolean;
}

interface UseRealtimePriceReturn {
  quotes: Map<string, RealtimeQuote>;
  loading: boolean;
  error: string | null;
  fetchedAt: string | null;
  refresh: () => Promise<void>;
  lastUpdated: number | null; // unix ms
}

/**
 * React hook for real-time IDX stock prices.
 * Polls /api/realtime endpoint with configurable interval.
 */
export function useRealtimePrice(
  ticker: string,
  options: UseRealtimePriceOptions = {},
): UseRealtimePriceReturn {
  const {
    refreshInterval = 5 * 60 * 1000, // 5 min
    watchlist,
    enabled = true,
  } = options;

  const tickers = watchlist ?? [ticker];
  const [quotes, setQuotes] = useState<Map<string, RealtimeQuote>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled || tickers.length === 0) return;

    // Abort any in-flight request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const url = `/api/realtime?tickers=${encodeURIComponent(tickers.join(","))}`;
      const res = await fetch(url, {
        signal: controller.signal,
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      const map = new Map<string, RealtimeQuote>();
      for (const q of (data.quotes ?? []) as RealtimeQuote[]) {
        map.set(q.ticker, q);
      }
      setQuotes(map);
      setFetchedAt(data.fetchedAt ?? new Date().toISOString());
      setLastUpdated(Date.now());
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [tickers.join(","), enabled]);

  // Initial fetch
  useEffect(() => {
    fetchData();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [fetchData]);

  // Auto-refresh
  useEffect(() => {
    if (refreshInterval <= 0) return;

    intervalRef.current = setInterval(fetchData, refreshInterval);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData, refreshInterval]);

  return {
    quotes,
    loading,
    error,
    fetchedAt,
    lastUpdated,
    refresh: fetchData,
  };
}
