"use client";

import Link from "next/link";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
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
  const isFlat = changePct === 0;
  const showChange = changePct !== null && changePct !== undefined;

  return (
    <Link
      href={`/stock/${ticker}`}
      className={cn(
        "group flex items-center gap-2.5 rounded-lg px-2.5 py-2",
        "transition-colors duration-fast ease-smooth",
        "hover:bg-accent/60 active:bg-accent",
        highlighted === "bull" &&
          "bg-success/[0.06] hover:bg-success/[0.10] dark:bg-success/[0.08]",
        highlighted === "bear" &&
          "bg-destructive/[0.06] hover:bg-destructive/[0.10] dark:bg-destructive/[0.08]",
      )}
    >
      {/* Ticker + name */}
      <div className="flex-1 min-w-0 flex items-baseline gap-1.5">
        <span className="font-bold text-sm font-num tracking-tight">
          {ticker}
        </span>
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
        <div className="text-[10px] text-muted-foreground hidden md:block font-num">
          {secondary}
        </div>
      )}

      {/* Price + change */}
      <div className="flex items-center gap-1.5 shrink-0 font-num">
        <span className="text-sm font-semibold tracking-tight">
          {price !== null && price !== undefined ? formatIDR(price) : "—"}
        </span>
        {showChange && (
          <span
            className={cn(
              "inline-flex items-center justify-end gap-0.5 text-xs font-bold min-w-[3.5rem] text-right",
              isFlat
                ? "text-muted-foreground"
                : isUp
                  ? "text-success"
                  : "text-destructive",
            )}
          >
            {isFlat ? (
              <Minus className="h-3 w-3" aria-hidden />
            ) : isUp ? (
              <TrendingUp
                className="h-3 w-3 transition-transform group-hover:-translate-y-0.5 duration-fast ease-spring"
                aria-hidden
              />
            ) : (
              <TrendingDown
                className="h-3 w-3 transition-transform group-hover:translate-y-0.5 duration-fast ease-spring"
                aria-hidden
              />
            )}
            {isUp ? "+" : ""}
            {changePct.toFixed(2)}%
          </span>
        )}
      </div>
    </Link>
  );
}
