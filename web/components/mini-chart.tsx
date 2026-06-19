"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn, formatIDR, formatPercent } from "@/lib/utils";
import { Card } from "@/components/ui/card";

interface MiniChartProps {
  prices: { date: string; close: number }[];
  height?: number;
  color?: "auto" | "bull" | "bear";
}

export function MiniChart({ prices, height = 40, color = "auto" }: MiniChartProps) {
  const isUp = prices.length >= 2 && prices[prices.length - 1].close >= prices[0].close;
  const lineColor =
    color === "auto"
      ? isUp
        ? "#22c55e"
        : "#ef4444"
      : color === "bull"
        ? "#22c55e"
        : "#ef4444";

  if (prices.length < 2) return null;

  const min = Math.min(...prices.map((p) => p.close));
  const max = Math.max(...prices.map((p) => p.close));
  const range = max - min || 1;

  const width = 80;
  const points = prices
    .map((p, i) => {
      const x = (i / (prices.length - 1)) * width;
      const y = height - ((p.close - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className="shrink-0">
      <polyline
        points={points}
        fill="none"
        stroke={lineColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface MetricCardProps {
  label: string;
  value: string | number;
  delta?: string;
  deltaPositive?: boolean;
  icon?: React.ReactNode;
}

export function MetricCard({ label, value, delta, deltaPositive, icon }: MetricCardProps) {
  return (
    <Card className="p-3 sm:p-4">
      <div className="flex items-start justify-between mb-1">
        <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium">
          {label}
        </div>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>
      <div className="text-lg sm:text-2xl font-bold tabular-nums">{value}</div>
      {delta && (
        <div
          className={cn(
            "text-xs mt-0.5 tabular-nums font-medium",
            deltaPositive === true && "text-bull-600",
            deltaPositive === false && "text-bear-600",
            deltaPositive === undefined && "text-muted-foreground",
          )}
        >
          {delta}
        </div>
      )}
    </Card>
  );
}
