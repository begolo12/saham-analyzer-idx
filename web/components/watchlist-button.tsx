"use client";

import { useEffect, useState, useCallback } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "saham_watchlist";

/**
 * Watchlist item — extended with metadata for self-learning & smart UX.
 * Backward compatible: if old format (just ticker strings) is found,
 * it's migrated to the new shape on first read.
 */
export interface WatchlistItem {
  ticker: string;
  addedAt: number; // ms timestamp
  viewCount: number;
  lastViewed: number | null; // ms timestamp
  priceAtAdded: number | null; // price when added, for return tracking
  sector: string | null; // sector snapshot when added
}

function migrate(list: unknown): WatchlistItem[] {
  if (!Array.isArray(list)) return [];
  return list.map((entry) => {
    if (typeof entry === "string") {
      return {
        ticker: entry.toUpperCase(),
        addedAt: Date.now(),
        viewCount: 0,
        lastViewed: null,
        priceAtAdded: null,
        sector: null,
      };
    }
    // Already an object — fill missing fields
    const e = entry as Partial<WatchlistItem>;
    return {
      ticker: (e.ticker ?? "").toUpperCase(),
      addedAt: e.addedAt ?? Date.now(),
      viewCount: e.viewCount ?? 0,
      lastViewed: e.lastViewed ?? null,
      priceAtAdded: (e as Record<string, unknown>).priceAtAdded as number | null ?? null,
      sector: (e as Record<string, unknown>).sector as string | null ?? null,
    };
  });
}

export function getWatchlist(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return migrate(JSON.parse(stored ?? "[]")).map((i) => i.ticker);
  } catch {
    return [];
  }
}

export function getWatchlistItems(): WatchlistItem[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return migrate(JSON.parse(stored ?? "[]"));
  } catch {
    return [];
  }
}

export function setWatchlist(tickers: string[]): void {
  if (typeof window === "undefined") return;
  // Preserve metadata for tickers that already exist
  const existing = getWatchlistItems();
  const map = new Map(existing.map((i) => [i.ticker, i]));
  const next: WatchlistItem[] = tickers.map((t) => {
    const key = t.toUpperCase();
    const prev = map.get(key);
    return (
      prev ?? {
        ticker: key,
        addedAt: Date.now(),
        viewCount: 0,
        lastViewed: null,
        priceAtAdded: null,
        sector: null,
      }
    );
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("watchlist-updated"));
}

/**
 * Add a single ticker to watchlist with optional price snapshot.
 */
export function addToWatchlistWithPrice(ticker: string, price?: number | null, sector?: string | null): void {
  if (typeof window === "undefined") return;
  const key = ticker.toUpperCase();
  const items = getWatchlistItems();
  if (items.some((i) => i.ticker === key)) return;
  items.push({
    ticker: key,
    addedAt: Date.now(),
    viewCount: 0,
    lastViewed: null,
    priceAtAdded: price ?? null,
    sector: sector ?? null,
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("watchlist-updated"));
}

/**
 * Track view of a stock detail page — bumps viewCount + lastViewed.
 * Only acts if ticker is in watchlist; no-op otherwise.
 */
export function bumpWatchView(ticker: string): void {
  if (typeof window === "undefined") return;
  const key = ticker.toUpperCase();
  const items = getWatchlistItems();
  const idx = items.findIndex((i) => i.ticker === key);
  if (idx === -1) return; // not in watchlist
  items[idx] = {
    ...items[idx],
    viewCount: items[idx].viewCount + 1,
    lastViewed: Date.now(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("watchlist-updated"));
}

export function clearAllWatchlist(): void {
  setWatchlist([]);
}

export function WatchlistButton({
  ticker,
  compact = false,
}: {
  ticker: string;
  compact?: boolean;
}) {
  const [isWatched, setIsWatched] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsWatched(getWatchlist().includes(ticker));

    const handler = () => setIsWatched(getWatchlist().includes(ticker));
    window.addEventListener("watchlist-updated", handler);
    return () => window.removeEventListener("watchlist-updated", handler);
  }, [ticker]);

  const toggle = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Trigger animation
    setAnimating(true);
    setTimeout(() => setAnimating(false), 400);

    const items = getWatchlistItems();
    const isIn = items.some((i) => i.ticker === ticker.toUpperCase());
    if (isIn) {
      const next = items
        .filter((i) => i.ticker !== ticker.toUpperCase())
        .map((i) => i.ticker);
      setWatchlist(next);
      setIsWatched(false);
      toast.success(`Removed ${ticker} from watchlist`);
    } else {
      const next = [...items.map((i) => i.ticker), ticker.toUpperCase()];
      setWatchlist(next);
      setIsWatched(true);
      toast.success(`⭐ ${ticker} added to watchlist`);
    }
  }, [ticker]);

  if (!mounted) {
    return (
      <Button variant="outline" size="icon" disabled className="rounded-xl">
        <Star className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button
      variant={isWatched ? "default" : "outline"}
      size="icon"
      onClick={toggle}
      data-watchlist-toggle
      className={cn(
        "rounded-xl",
        compact ? "min-h-11 min-w-11" : "min-h-9",
        isWatched && "bg-amber-500 hover:bg-amber-600 border-amber-500",
        animating && "scale-90",
        "transition-all duration-150 ease-out",
        "shadow-[3px_3px_6px_rgba(0,0,0,0.08),-3px_-3px_6px_rgba(255,255,255,0.5)]",
        "active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.1),inset_-2px_-2px_4px_rgba(255,255,255,0.3)]",
      )}
      aria-label={
        isWatched ? `Hapus ${ticker} dari watchlist` : `Tambah ${ticker} ke watchlist`
      }
    >
      <Star
        className={cn(
          "h-4 w-4 transition-all duration-300",
          isWatched && "fill-white",
          animating && isWatched && "scale-125 rotate-12",
          animating && !isWatched && "scale-75 -rotate-12",
        )}
      />
    </Button>
  );
}

export { STORAGE_KEY };
