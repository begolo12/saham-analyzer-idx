"use client";

import React from "react";
import { useRef, useState, useCallback } from "react";
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

export const CompactStockRow = React.memo(function CompactStockRow({
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
  const [flashKey, setFlashKey] = useState(0);
  const prevPrice = useRef(price);

  // Trigger flash animation on price change
  const priceRef = useCallback(
    (node: HTMLSpanElement | null) => {
      if (!node) return;
      if (prevPrice.current !== price && price !== null) {
        setFlashKey((k) => k + 1);
        prevPrice.current = price;
      }
    },
    [price],
  );

  return (
    <Link
      href={`/stock/${ticker}`}
      className={cn(
        "group flex items-center gap-2.5 px-4 py-3",
        "min-h-[52px]",
        "transition-all duration-fast ease-spring",
        "hover:bg-accent/40",
        "active:bg-accent/60",
        highlighted === "bull" &&
          "bg-success/[0.06] hover:bg-success/[0.10] dark:bg-success/[0.08]",
        highlighted === "bear" &&
          "bg-destructive/[0.06] hover:bg-destructive/[0.10] dark:bg-destructive/[0.08]",
        // Subtle divider between rows (applied by parent via divide-y)
        "border-b border-b-border/10 last:border-b-0",
      )}
    >
      {/* Ticker + sector pill */}
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          <span className="font-extrabold text-sm font-num tracking-tight text-foreground transition-colors duration-fast">
            {ticker}
          </span>
          {sector && (
            <span
              className={cn(
                "inline-flex items-center rounded-full px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider",
                "bg-muted text-muted-foreground/70",
              )}
            >
              {sector.length > 8 ? sector.slice(0, 8) : sector}
            </span>
          )}
        </div>
        {name && !hideNameOnMobile && (
          <span className="text-[11px] text-muted-foreground truncate hidden sm:inline leading-tight">
            {name}
          </span>
        )}
      </div>

      {/* Secondary (optional) */}
      {secondary && (
        <div className="text-[10px] text-muted-foreground hidden md:block font-num">
          {secondary}
        </div>
      )}

      {/* Price + change badge */}
      <div className="flex items-center gap-2 shrink-0 font-num">
        <span
          ref={priceRef}
          key={flashKey}
          className={cn(
            "text-sm font-semibold tracking-tight tabular-nums",
            flashKey > 0 && "animate-price-flash",
          )}
        >
          {price !== null && price !== undefined ? formatIDR(price) : "—"}
        </span>
        {showChange && (
          <span
            className={cn(
              "inline-flex items-center justify-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold min-w-[3.5rem]",
              "transition-colors duration-fast",
              isFlat
                ? "bg-muted text-muted-foreground"
                : isUp
                  ? "bg-success/10 text-success dark:bg-success/15 dark:text-success"
                  : "bg-destructive/10 text-destructive dark:bg-destructive/15 dark:text-destructive",
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
});
