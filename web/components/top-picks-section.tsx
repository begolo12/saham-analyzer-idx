"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Action } from "@/lib/recommender";

export interface TopPick {
  ticker: string;
  name?: string;
  sector?: string;
  price: number;
  changePct: number;
  action: Action;
  confidence: number;
  rank: number;
}

interface TopPicksSectionProps {
  picks: TopPick[];
  loading?: boolean;
  className?: string;
}

const ACTION_SHORT: Record<Action, string> = {
  STRONG_BUY: "BELI KUAT",
  BUY: "BELI",
  HOLD: "TAHAN",
  SELL: "JUAL",
  STRONG_SELL: "JUAL KUAT",
};

function toneForAction(a: Action): "bull" | "bear" | "neutral" {
  if (a === "STRONG_BUY" || a === "BUY") return "bull";
  if (a === "STRONG_SELL" || a === "SELL") return "bear";
  return "neutral";
}

export function TopPicksSection({ picks, loading = false, className }: TopPicksSectionProps) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!loading && picks.length > 0) {
      // Small delay to trigger stagger animation
      const t = requestAnimationFrame(() => setRevealed(true));
      return () => cancelAnimationFrame(t);
    }
    setRevealed(false);
  }, [loading, picks.length]);

  if (loading) {
    return (
      <div className={cn("flex gap-3 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1 md:space-y-2 md:overflow-visible md:block", className)}>
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="shrink-0 w-[260px] md:w-auto rounded-2xl bg-card p-4 space-y-2 animate-pulse shadow-[0_1px_3px_hsl(222_25%_11%/0.06),0_4px_16px_hsl(222_25%_11%/0.08)] dark:shadow-[0_1px_3px_hsl(0_0%_0%/0.3),0_4px_16px_hsl(0_0%_0%/0.2)] border border-border/30"
          >
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-muted" />
              <div className="space-y-1.5 flex-1">
                <div className="h-3.5 w-20 rounded bg-muted" />
                <div className="h-2.5 w-28 rounded bg-muted/60" />
              </div>
            </div>
            <div className="h-2.5 w-full rounded bg-muted/40" />
          </div>
        ))}
      </div>
    );
  }

  if (!picks.length) {
    return (
      <div className="rounded-2xl border border-dashed border-muted-foreground/20 bg-muted/20 p-6 text-center">
        <div className="text-sm font-semibold text-muted-foreground">Belum ada sinyal tersedia</div>
        <div className="text-[11px] text-muted-foreground/70 mt-1">Data akan muncul saat market buka</div>
      </div>
    );
  }

  return (
    <div className={cn("flex gap-3 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1 md:space-y-2 md:overflow-visible md:block", className)}>
      {picks.map((p, idx) => {
        const tone = toneForAction(p.action);
        const TrendIcon =
          p.changePct > 0 ? TrendingUp : p.changePct < 0 ? TrendingDown : Minus;
        return (
          <Link
            key={p.ticker}
            href={`/stock/${p.ticker}`}
            className={cn(
              "shrink-0 w-[260px] md:w-auto block rounded-2xl p-4",
              "transition-all duration-base ease-spring",
              "hover:shadow-md active:scale-[0.98]",
              "shadow-[0_1px_3px_hsl(222_25%_11%/0.06),0_4px_16px_hsl(222_25%_11%/0.08)]",
              "dark:shadow-[0_1px_3px_hsl(0_0%_0%/0.3),0_4px_16px_hsl(0_0%_0%/0.2)]",
              "backdrop-blur-sm bg-card/80",
              "border border-border/30",
              tone === "bull" && "bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-card dark:from-emerald-500/15 dark:via-emerald-500/8 dark:to-card",
              tone === "bear" && "bg-gradient-to-br from-red-500/10 via-red-500/5 to-card dark:from-red-500/15 dark:via-red-500/8 dark:to-card",
              tone === "neutral" && "bg-gradient-to-br from-amber-500/8 via-amber-500/4 to-card dark:from-amber-500/12 dark:via-amber-500/6 dark:to-card",
              // Stagger reveal animation
              revealed
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-3",
            )}
            style={{
              transitionDelay: revealed ? `${idx * 60}ms` : "0ms",
            }}
          >
            {/* Top row: rank + ticker + change */}
            <div className="flex items-start gap-2.5">
              <div
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-black",
                  tone === "bull" && "bg-ios-green/10 text-ios-green",
                  tone === "bear" && "bg-ios-red/10 text-ios-red",
                  tone === "neutral" && "bg-muted text-muted-foreground",
                )}
              >
                {p.rank}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-extrabold text-sm tracking-tight">{p.ticker}</span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-0.5 text-[12px] font-bold tabular-nums",
                      p.changePct >= 0 ? "text-success" : "text-destructive",
                    )}
                  >
                    <TrendIcon className="h-3 w-3" aria-hidden />
                    {p.changePct >= 0 ? "+" : ""}
                    {p.changePct.toFixed(2)}%
                  </span>
                </div>
                {(p.name || p.sector) && (
                  <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                    {p.name ?? p.sector}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom row: action badge + confidence bar */}
            <div className="mt-2.5 flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                  tone === "bull" && "bg-ios-green/12 text-ios-green",
                  tone === "bear" && "bg-ios-red/12 text-ios-red",
                  tone === "neutral" && "bg-muted text-muted-foreground",
                )}
              >
                {ACTION_SHORT[p.action]}
              </span>
              <div className="flex-1 flex items-center gap-1.5">
                <div className="flex-1 h-1.5 rounded-full bg-muted/60 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      tone === "bull" && "bg-ios-blue",
                      tone === "bear" && "bg-ios-blue",
                      tone === "neutral" && "bg-muted-foreground/40",
                    )}
                    style={{ width: `${Math.min(p.confidence, 100)}%` }}
                  />
                </div>
                <span className="text-xs font-extrabold text-foreground tabular-nums shrink-0">
                  {p.confidence.toFixed(0)}%
                </span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
