"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface DataFreshnessPillProps {
  /** ISO timestamp or null/undefined to show offline */
  updatedAt?: string | Date | null;
  /** Threshold in minutes before considered stale (>15 = stale, >60 = offline) */
  staleAfterMin?: number;
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
  className,
}: DataFreshnessPillProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  if (!updatedAt) {
    return (
      <span
        className={cn("freshness-pill freshness-pill--offline", className)}
        aria-label="Belum ada data"
        title="Belum ada data"
      >
        <span className="freshness-pill__dot" aria-hidden />
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
        "freshness-pill",
        isOffline && "freshness-pill--offline",
        !isOffline && isStale && "freshness-pill--stale",
        className,
      )}
      aria-label={`Data diperbarui ${timeAgo(date)}`}
      title={`Update: ${date.toLocaleString("id-ID")}`}
    >
      <span className="freshness-pill__dot" aria-hidden />
      {isOffline ? "Kadaluarsa" : `Update ${timeAgo(date)}`}
    </span>
  );
}
