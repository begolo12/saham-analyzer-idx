"use client";

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
  if (loading) {
    return (
      <div className={cn("space-y-2", className)}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="top-pick">
            <div className="top-pick__rank shimmer" />
            <div className="top-pick__body space-y-2">
              <div className="h-3 w-24 rounded bg-muted shimmer" />
              <div className="h-2 w-32 rounded bg-muted shimmer" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!picks.length) {
    return (
      <div className="rounded-2xl border border-dashed border-muted-foreground/20 bg-muted/30 p-6 text-center">
        <div className="text-sm font-semibold text-muted-foreground">Belum ada sinyal tersedia</div>
        <div className="text-[11px] text-muted-foreground/70 mt-1">Data akan muncul saat market buka</div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {picks.map((p) => {
        const tone = toneForAction(p.action);
        const TrendIcon =
          p.changePct > 0 ? TrendingUp : p.changePct < 0 ? TrendingDown : Minus;
        return (
          <Link
            key={p.ticker}
            href={`/stock/${p.ticker}`}
            className={cn("top-pick", tone === "bull" && "top-pick--bull", tone === "bear" && "top-pick--bear")}
          >
            <div className="top-pick__rank">{p.rank}</div>
            <div className="top-pick__body">
              <div className="top-pick__head">
                <span className="top-pick__ticker">{p.ticker}</span>
                <span className="top-pick__name">{p.name ?? p.sector ?? ""}</span>
              </div>
              <div className="top-pick__meta">
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 font-bold",
                    p.changePct >= 0 ? "text-success" : "text-destructive",
                  )}
                >
                  <TrendIcon className="h-3 w-3" aria-hidden />
                  {p.changePct >= 0 ? "+" : ""}
                  {p.changePct.toFixed(2)}%
                </span>
                <span className="text-foreground/70">{ACTION_SHORT[p.action]}</span>
                <span className="top-pick__conf">{p.confidence.toFixed(0)}% conf</span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
