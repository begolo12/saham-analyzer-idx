"use client";

import { useEffect, useState, useRef } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface DataFreshnessPillProps {
  /** ISO timestamp or null/undefined to show offline */
  updatedAt?: string | Date | null;
  /** Threshold in minutes before considered stale (>15 = stale, >60 = offline) */
  staleAfterMin?: number;
  /** Show auto-refresh countdown (seconds until next refresh) */
  refreshInterval?: number;
  /** Callback when auto-refresh fires */
  onRefresh?: () => void;
  className?: string;
}

function timeAgo(date: Date): string {
  const diffSec = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (diffSec < 60) return "Baru saja";
  const min = Math.round(diffSec / 60);
  if (min < 60) return `${min}m lalu`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}j lalu`;
  const day = Math.round(hr / 24);
  return `${day}h lalu`;
}

export function DataFreshnessPill({
  updatedAt,
  staleAfterMin = 15,
  refreshInterval,
  onRefresh,
  className,
}: DataFreshnessPillProps) {
  const [now, setNow] = useState(() => Date.now());
  const [countdown, setCountdown] = useState(refreshInterval ?? 0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Tick every 30s for time-ago updates
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  // Auto-refresh countdown
  useEffect(() => {
    if (!refreshInterval || !onRefresh) return;
    setCountdown(refreshInterval);

    const tick = () => {
      setCountdown((prev) => {
        if (prev <= 1) {
          onRefresh();
          return refreshInterval;
        }
        return prev - 1;
      });
    };

    timerRef.current = setInterval(tick, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [refreshInterval, onRefresh]);

  if (!updatedAt) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium",
          "bg-muted/60 text-muted-foreground",
          "shadow-[2px_2px_4px_rgba(0,0,0,0.04),-2px_-2px_4px_rgba(255,255,255,0.3)]",
          className,
        )}
        aria-label="Belum ada data"
        title="Belum ada data"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" aria-hidden />
        Offline
      </span>
    );
  }

  const date = typeof updatedAt === "string" ? new Date(updatedAt) : updatedAt;
  const ageMin = (now - date.getTime()) / 60_000;
  const isStale = ageMin > staleAfterMin;
  const isOffline = ageMin > 60;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium",
        "shadow-[2px_2px_4px_rgba(0,0,0,0.04),-2px_-2px_4px_rgba(255,255,255,0.3)]",
        isOffline && "bg-muted/60 text-muted-foreground",
        !isOffline && isStale && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
        !isOffline && !isStale && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
        className,
      )}
      aria-label={`Data diperbarui ${timeAgo(date)}`}
      title={`Update: ${date.toLocaleString("id-ID")}`}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full",
          isOffline && "bg-muted-foreground/40",
          !isOffline && isStale && "bg-amber-500",
          !isOffline && !isStale && "bg-emerald-500 animate-pulse-soft",
        )}
        aria-hidden
      />
      {isOffline ? "Kadaluarsa" : `Update ${timeAgo(date)}`}
      {refreshInterval && onRefresh && countdown > 0 && !isOffline && (
        <span className="inline-flex items-center gap-0.5 text-[9px] opacity-60 tabular-nums font-num">
          <RefreshCw className="h-2.5 w-2.5" />
          {countdown}s
        </span>
      )}
    </span>
  );
}
