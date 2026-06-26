/**
 * Watchlist Storage Hook — React-friendly API for watchlist.
 * Wraps the lower-level functions in components/watchlist-button.tsx.
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getWatchlistItems,
  getWatchlist,
  setWatchlist,
  clearAllWatchlist as clearAllWatchlistRaw,
  bumpWatchView,
  addToWatchlistWithPrice,
  type WatchlistItem,
} from "@/components/watchlist-button";

export { getWatchlistItems, setWatchlist, clearAllWatchlistRaw as clearAllWatchlist, bumpWatchView, addToWatchlistWithPrice, type WatchlistItem };

/**
 * React hook untuk watchlist. Returns current tickers and reload-on-update.
 */
export function useWatchlist(): { tickers: string[]; items: WatchlistItem[]; mounted: boolean } {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setItems(getWatchlistItems());

    const handler = () => setItems(getWatchlistItems());
    window.addEventListener("watchlist-updated", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("watchlist-updated", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  return {
    items,
    tickers: items.map((i) => i.ticker),
    mounted,
  };
}

/**
 * Add a ticker to watchlist. Triggers watchlist-updated event.
 */
export function addToWatchlist(ticker: string): void {
  const key = ticker.toUpperCase();
  const current = getWatchlist();
  if (current.includes(key)) return;
  setWatchlist([...current, key]);
}

/**
 * Remove a ticker from watchlist.
 */
export function removeFromWatchlist(ticker: string): void {
  const key = ticker.toUpperCase();
  const current = getWatchlist();
  setWatchlist(current.filter((t) => t !== key));
}
