"use client";

import Link from "next/link";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn, formatIDR, formatPercent } from "@/lib/utils";

interface CompactStockRowProps {
  ticker: string;
  name?: string;
  sector?: string;
  price: number | null;
  changePct: number | null;
  /** Optional secondary text on right (e.g. volume, alert count) */
  secondary?: React.ReactNode;
  /** Highlight row (e.g. alert triggered) */
  highlighted?: "bull" | "bear" | "neutral";
  /** Hide name on mobile to save space */
  hideNameOnMobile?: boolean;
}

export function CompactStockRow({
  ticker,
  name,
  sector,
  price,
  changePct,
  secondary,
  highlighted,
  hideNameOnMobile = true,
}: CompactStockRowProps) {
  const isUp = (changePct ?? 0) >= 0;
  const showChange = changePct !== null && changePct !== undefined;

  return (
    <Link
      href={`/stock/${ticker}`}
      className={cn(
        "flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors",
        "hover:bg-accent/60 active:bg-accent",
        highlighted === "bull" && "bg-bull-50/50 dark:bg-bull-700/10",
        highlighted === "bear" && "bg-bear-50/50 dark:bg-bear-700/10",
      )}
    >
      {/* Ticker + name */}
      <div className="flex-1 min-w-0 flex items-baseline gap-1.5">
        <span className="font-bold text-sm tabular-nums">{ticker}</span>
        {name && !hideNameOnMobile && (
          <span className="text-xs text-muted-foreground truncate hidden sm:inline">
            {name}
          </span>
        )}
        {sector && !name && (
          <span className="text-[10px] text-muted-foreground truncate hidden sm:inline">
            {sector}
          </span>
        )}
      </div>

      {/* Secondary (optional) */}
      {secondary && (
        <div className="text-[10px] text-muted-foreground hidden md:block tabular-nums">
          {secondary}
        </div>
      )}

      {/* Price + change */}
      <div className="flex items-center gap-1.5 shrink-0 tabular-nums">
        <span className="text-sm font-semibold">
          {price !== null && price !== undefined ? formatIDR(price) : "—"}
        </span>
        {showChange && (
          <span
            className={cn(
              "text-xs font-bold min-w-12 text-right",
              isUp ? "text-bull-600" : "text-bear-600",
            )}
          >
            {isUp ? "+" : ""}
            {changePct.toFixed(2)}%
          </span>
        )}
        {showChange &&
          (isUp ? (
            <TrendingUp className="h-3 w-3 text-bull-600" />
          ) : (
            <TrendingDown className="h-3 w-3 text-bear-600" />
          ))}
      </div>
    </Link>
  );
}
