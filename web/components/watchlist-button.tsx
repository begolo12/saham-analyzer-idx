"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "saham_watchlist";

function getWatchlist(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function setWatchlist(list: string[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  // Notify other components
  window.dispatchEvent(new CustomEvent("watchlist-updated"));
}

export function WatchlistButton({ ticker }: { ticker: string }) {
  const [isWatched, setIsWatched] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsWatched(getWatchlist().includes(ticker));

    const handler = () => setIsWatched(getWatchlist().includes(ticker));
    window.addEventListener("watchlist-updated", handler);
    return () => window.removeEventListener("watchlist-updated", handler);
  }, [ticker]);

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const list = getWatchlist();
    if (list.includes(ticker)) {
      setWatchlist(list.filter((t) => t !== ticker));
      setIsWatched(false);
      toast.success(`Removed ${ticker} from watchlist`);
    } else {
      setWatchlist([...list, ticker]);
      setIsWatched(true);
      toast.success(`⭐ ${ticker} added to watchlist`);
    }
  };

  if (!mounted) {
    return (
      <Button variant="outline" size="icon" disabled>
        <Star className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button
      variant={isWatched ? "default" : "outline"}
      size="icon"
      onClick={toggle}
      className={cn(
        "transition-all",
        isWatched && "bg-amber-500 hover:bg-amber-600 border-amber-500",
      )}
      aria-label={isWatched ? "Remove from watchlist" : "Add to watchlist"}
    >
      <Star
        className={cn("h-4 w-4", isWatched && "fill-white")}
      />
    </Button>
  );
}

export { getWatchlist, setWatchlist, STORAGE_KEY };
