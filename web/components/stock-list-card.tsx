"use client";

import React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn, formatIDR, formatPercent } from "@/lib/utils";

interface StockListCardProps {
  ticker: string;
  name?: string;
  sector?: string;
  price: number | null;
  change: number | null;
  changePct: number | null;
  recommendation?: {
    action: "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "STRONG_SELL";
  };
}

const actionColors: Record<string, string> = {
  STRONG_BUY: "bg-bull-600",
  BUY: "bg-bull-500",
  HOLD: "bg-amber-500",
  SELL: "bg-bear-500",
  STRONG_SELL: "bg-bear-700",
};

export const StockListCard = React.memo(function StockListCard({
  ticker,
  name,
  sector,
  price,
  change,
  changePct,
  recommendation,
}: StockListCardProps) {
  const isUp = (change ?? 0) >= 0;

  return (
    <Link href={`/stock/${ticker.replace(".JK", "")}`}>
      <Card className="p-4 card-hover cursor-pointer h-full">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-base">{ticker.replace(".JK", "")}</span>
              {recommendation && (
                <Badge variant="outline" className={cn("text-white text-[10px] px-1.5 py-0", actionColors[recommendation.action])}>
                  {recommendation.action.replace("_", " ")}
                </Badge>
              )}
            </div>
            {name && (
              <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{name}</div>
            )}
            {sector && (
              <div className="text-[10px] text-muted-foreground/70 mt-0.5">{sector}</div>
            )}
          </div>
          {changePct !== null && (
            <div
              className={cn(
                "flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full",
                isUp ? "bg-bull-100 text-bull-700 dark:bg-bull-700/30 dark:text-bull-500" : "bg-bear-100 text-bear-700 dark:bg-bear-700/30 dark:text-bear-500",
              )}
            >
              {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {formatPercent(changePct)}
            </div>
          )}
        </div>

        <div className="mt-3">
          <div className="text-2xl font-bold tabular-nums">
            {price ? formatIDR(price) : "N/A"}
          </div>
          {change !== null && (
            <div className={cn("text-xs tabular-nums", isUp ? "text-bull-600" : "text-bear-600")}>
              {isUp ? "+" : ""}
              {change ? Math.round(change).toLocaleString("id-ID") : 0}
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
});
