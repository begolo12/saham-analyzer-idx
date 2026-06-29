"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Eye,
  Flame,
  AlertTriangle,
  Target,
  ChevronDown,
  Trash2,
  Plus,
  Bell,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatIDR, formatPercent } from "@/lib/utils";
import type { WatchlistItem } from "@/components/watchlist-button";

export interface WatchlistStockData {
  code: string;
  name: string;
  sector: string;
  price: number | null;
  change: number | null;
  changePct: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  volume: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  recentCloses: number[];
}

interface WatchlistCardProps {
  item: WatchlistItem;
  stock: WatchlistStockData;
  onRemove: (ticker: string) => void;
  onSetAlert?: (ticker: string) => void;
  alertTriggered?: boolean;
  alertArmed?: boolean;
  priceAtAdded?: number | null;
}

type Signal = "hot" | "watch" | "hold" | "drop" | "caution";

/**
 * Hitung sinyal & alert berdasarkan perubahan harga + posisi di range 52w.
 */
function computeSignal(stock: WatchlistStockData): {
  signal: Signal;
  badge: string;
  alerts: { type: "hot" | "drop" | "target" | "valley"; text: string }[];
} {
  const { changePct, price, fiftyTwoWeekHigh, fiftyTwoWeekLow } = stock;
  const pct = changePct ?? 0;
  const alerts: { type: "hot" | "drop" | "target" | "valley"; text: string }[] = [];

  // Signal berdasarkan |Δ| hari ini
  let signal: Signal = "hold";
  let badge = "📊 Hold";
  if (pct >= 5) {
    signal = "hot";
    badge = "🚀 Hot";
    alerts.push({ type: "hot", text: `Lonjakan +${pct.toFixed(2)}%` });
  } else if (pct >= 2) {
    signal = "watch";
    badge = "👀 Watch";
  } else if (pct <= -5) {
    signal = "caution";
    badge = "⚠️ Caution";
    alerts.push({ type: "drop", text: `Turun ${pct.toFixed(2)}%` });
  } else if (pct <= -2) {
    signal = "drop";
    badge = "📉 Turun";
  }

  // Proximity check ke 52w high/low
  if (price && fiftyTwoWeekHigh && fiftyTwoWeekHigh > 0) {
    const distFromHigh = ((fiftyTwoWeekHigh - price) / fiftyTwoWeekHigh) * 100;
    if (distFromHigh <= 3 && distFromHigh >= 0) {
      alerts.push({ type: "target", text: `🎯 Dekat 52w High (${distFromHigh.toFixed(1)}%)` });
    }
  }
  if (price && fiftyTwoWeekLow && fiftyTwoWeekLow > 0) {
    const distFromLow = ((price - fiftyTwoWeekLow) / fiftyTwoWeekLow) * 100;
    if (distFromLow <= 3 && distFromLow >= 0) {
      alerts.push({ type: "valley", text: `🕳️ Dekat 52w Low (${distFromLow.toFixed(1)}%)` });
    }
  }

  return { signal, badge, alerts };
}

/**
 * Mini sparkline (line chart) — inline SVG, no library.
 */
function Sparkline({
  closes,
  isUp,
  width = 100,
  height = 36,
}: {
  closes: number[];
  isUp: boolean;
  width?: number;
  height?: number;
}) {
  if (closes.length < 2) {
    return (
      <div
        className="text-[10px] text-muted-foreground italic"
        style={{ width, height }}
      >
        —
      </div>
    );
  }

  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;

  const points = closes
    .map((c, i) => {
      const x = (i / (closes.length - 1)) * width;
      const y = height - ((c - min) / range) * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const stroke = isUp ? "#10b981" : "#ef4444";
  const fill = isUp ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)";

  // Build fill polygon by closing path to baseline
  const lastPoint = closes.length - 1;
  const lastX = (lastPoint / (closes.length - 1)) * width;
  const firstY = height - ((closes[0] - min) / range) * (height - 4) - 2;
  const fillPath = `0,${firstY.toFixed(1)} ${points} ${lastX.toFixed(1)},${height} 0,${height}`;

  return (
    <svg width={width} height={height} className="shrink-0">
      <polygon points={fillPath} fill={fill} />
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function WatchlistCard({
  item,
  stock,
  onRemove,
  onSetAlert,
  alertTriggered,
  alertArmed,
  priceAtAdded,
}: WatchlistCardProps) {
  const isUp = (stock.changePct ?? 0) >= 0;
  const { signal, badge, alerts } = useMemo(() => computeSignal(stock), [stock]);

  // Return since added
  const returnSinceAdded = priceAtAdded && stock.price
    ? ((stock.price - priceAtAdded) / priceAtAdded) * 100
    : null;
  const returnUp = returnSinceAdded !== null ? returnSinceAdded >= 0 : true;

  return (
    <Card
      className={cn(
        "p-4 transition-all relative group",
        /* iOS-style subtle elevation */
        "shadow-[0_1px_3px_hsl(222_25%_11%/0.05),0_4px_12px_hsl(222_25%_11%/0.04)]",
        "dark:shadow-[0_1px_3px_hsl(0_0%_0%/0.25),0_4px_12px_hsl(0_0%_0%/0.15)]",
        "hover:shadow-[0_2px_6px_hsl(222_25%_11%/0.07),0_8px_20px_hsl(222_25%_11%/0.06)]",
        "dark:hover:shadow-[0_2px_6px_hsl(0_0%_0%/0.3),0_8px_20px_hsl(0_0%_0%/0.2)]",
        signal === "hot" && "border-emerald-500/25 bg-emerald-500/[0.04] dark:bg-emerald-500/[0.06]",
        signal === "caution" && "border-rose-500/25 bg-rose-500/[0.04] dark:bg-rose-500/[0.06]",
        alertTriggered &&
          "ring-2 ring-amber-500/40 bg-amber-50/30 dark:bg-amber-900/10",
      )}
    >
      {/* Remove button */}
      <button
        onClick={() => onRemove(stock.code)}
        className="absolute right-2 top-2 z-10 rounded-full bg-background/90 backdrop-blur-sm p-1.5 opacity-100 transition-all hover:bg-rose-500 hover:text-white md:opacity-0 md:group-hover:opacity-100"
        aria-label="Remove from watchlist"
      >
        <Trash2 className="h-3 w-3" />
      </button>

      {/* Alert indicator (top-left corner) */}
      {(alertArmed || alertTriggered) && (
        <div
          className={cn(
            "absolute top-2 left-2 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider flex items-center gap-0.5",
            alertTriggered
              ? "bg-amber-500 text-white animate-pulse"
              : "bg-muted text-muted-foreground",
          )}
          title={alertTriggered ? "Alert triggered!" : "Alert armed"}
        >
          <Bell className="h-2.5 w-2.5" />
          {alertTriggered ? "Hit" : "Set"}
        </div>
      )}

      <Link href={`/stock/${stock.code}`} className="block">
        {/* Header: Ticker + Signal badge */}
        <div className={cn(
          "flex items-start justify-between gap-2 mb-2",
          (alertArmed || alertTriggered) && "ml-12",
        )}>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-black text-lg tracking-tight">{stock.code}</span>
              <Badge
                variant={
                  signal === "hot"
                    ? "bull"
                    : signal === "caution" || signal === "drop"
                      ? "bear"
                      : "neutral"
                }
                className="text-[10px]"
              >
                {badge}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
              {stock.name}
            </div>
          </div>
        </div>

        {/* Price + Change + Sparkline */}
        <div className="flex items-end justify-between gap-3 mb-2.5">
          <div className="min-w-0 flex-1">
            <div className="text-2xl font-black tabular-nums leading-none tracking-tight">
              {stock.price !== null ? formatIDR(stock.price) : "—"}
            </div>
            {/* Performance indicator — colored pill */}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <div
                className={cn(
                  "inline-flex items-center gap-1 text-xs font-bold tabular-nums px-2 py-0.5 rounded-full",
                  isUp
                    ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400"
                    : "bg-rose-500/12 text-rose-700 dark:text-rose-400",
                )}
              >
                {isUp ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {stock.change !== null && (
                  <span>{isUp ? "+" : ""}{Math.round(stock.change).toLocaleString("id-ID")}</span>
                )}
                <span className="opacity-50">·</span>
                <span>{formatPercent(stock.changePct)}</span>
              </div>

              {/* Return since added — if available */}
              {returnSinceAdded !== null && (
                <span
                  className={cn(
                    "inline-flex items-center text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-full",
                    returnUp
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-500"
                      : "bg-rose-500/10 text-rose-600 dark:text-rose-500",
                  )}
                >
                  {returnUp ? "▲" : "▼"} {returnUp ? "+" : ""}{returnSinceAdded.toFixed(1)}% sejak ditambah
                </span>
              )}
            </div>
          </div>
          <Sparkline closes={stock.recentCloses} isUp={isUp} />
        </div>

        {/* Sector + Self-learning view indicator */}
        <div className="flex items-center gap-2 flex-wrap text-[10px] mb-2">
          <Badge variant="outline" className="text-[10px]">
            {stock.sector}
          </Badge>
          {item.viewCount > 0 && (
            <span
              className="flex items-center gap-1 text-muted-foreground"
              title={`Dilihat ${item.viewCount} kali`}
            >
              <Eye className="h-3 w-3" />
              {item.viewCount}×
            </span>
          )}
          {onSetAlert && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSetAlert(stock.code);
              }}
              className={cn(
                "ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors",
                alertTriggered
                  ? "bg-amber-500 text-white hover:bg-amber-600"
                  : alertArmed
                    ? "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400"
                    : "bg-muted text-muted-foreground hover:bg-accent",
              )}
            >
              <Bell className="h-2.5 w-2.5" />
              {alertTriggered
                ? "Triggered"
                : alertArmed
                  ? "Edit Alert"
                  : "Set Alert"}
            </button>
          )}
        </div>

        {/* Smart Alerts */}
        {alerts.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-2.5 border-t border-border/50">
            {alerts.map((a, i) => (
              <span
                key={i}
                className={cn(
                  "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full",
                  a.type === "hot" && "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-700/30 dark:text-emerald-400",
                  a.type === "drop" && "bg-rose-500/10 text-rose-700 dark:bg-rose-700/30 dark:text-rose-400",
                  a.type === "target" && "bg-amber-500/10 text-amber-700 dark:bg-amber-700/30 dark:text-amber-400",
                  a.type === "valley" && "bg-purple-500/10 text-purple-700 dark:bg-purple-700/30 dark:text-purple-400",
                )}
              >
                {a.type === "hot" && <Flame className="h-2.5 w-2.5" />}
                {a.type === "drop" && <AlertTriangle className="h-2.5 w-2.5" />}
                {a.type === "target" && <Target className="h-2.5 w-2.5" />}
                {a.text}
              </span>
            ))}
          </div>
        )}
      </Link>
    </Card>
  );
}

/**
 * Compact alert card untuk Smart Alerts section di atas.
 */
export function AlertCard({
  stock,
  alertType,
  text,
}: {
  stock: WatchlistStockData;
  alertType: "hot" | "drop";
  text: string;
}) {
  const isHot = alertType === "hot";
  return (
    <Link href={`/stock/${stock.code}`}>
      <Card
        className={cn(
          "p-3 transition-all",
          /* subtle elevation */
          "shadow-[0_1px_3px_hsl(222_25%_11%/0.05),0_4px_12px_hsl(222_25%_11%/0.04)]",
          "dark:shadow-[0_1px_3px_hsl(0_0%_0%/0.25),0_4px_12px_hsl(0_0%_0%/0.15)]",
          "hover:shadow-[0_2px_6px_hsl(222_25%_11%/0.07),0_8px_20px_hsl(222_25%_11%/0.06)]",
          isHot
            ? "border-emerald-500/30 bg-gradient-to-br from-emerald-500/8 to-emerald-500/3 dark:from-emerald-500/10 dark:to-emerald-500/4"
            : "border-rose-500/30 bg-gradient-to-br from-rose-500/8 to-rose-500/3 dark:from-rose-500/10 dark:to-rose-500/4",
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {isHot ? (
              <div className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-500/12">
                <Flame className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              </div>
            ) : (
              <div className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-rose-500/12">
                <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
              </div>
            )}
            <span className="font-bold text-sm">{stock.code}</span>
            <span className={cn(
              "text-xs font-bold tabular-nums",
              isHot ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
            )}>
              {text}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 -rotate-90 text-muted-foreground" />
        </div>
      </Card>
    </Link>
  );
}

interface DiscoveryCardProps {
  code: string;
  name: string;
  sector: string;
  price: number | null;
  changePct: number | null;
  onAdd: () => void;
}

/**
 * Card untuk Discovery section — saham dari sektor watchlist yang belum di-watch.
 */
export function DiscoveryCard({
  code,
  name,
  sector,
  price,
  changePct,
  onAdd,
}: DiscoveryCardProps) {
  const isUp = (changePct ?? 0) >= 0;
  return (
    <Card
      className={cn(
        "p-3 transition-all",
        "shadow-[0_1px_3px_hsl(222_25%_11%/0.05),0_4px_12px_hsl(222_25%_11%/0.04)]",
        "dark:shadow-[0_1px_3px_hsl(0_0%_0%/0.25),0_4px_12px_hsl(0_0%_0%/0.15)]",
        "hover:shadow-[0_2px_6px_hsl(222_25%_11%/0.07),0_8px_20px_hsl(222_25%_11%/0.06)]",
      )}
    >
      <Link href={`/stock/${code}`} className="block mb-2">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="font-bold text-sm">{code}</span>
          {price !== null && (
            <span className="text-sm font-bold tabular-nums">
              {formatIDR(price)}
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground line-clamp-1 mb-1">
          {name}
        </div>
        <div className="flex items-center justify-between gap-2 text-[10px]">
          <Badge variant="outline" className="text-[10px]">
            {sector}
          </Badge>
          {changePct !== null && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-bold tabular-nums px-1.5 py-0.5 rounded-full",
                isUp
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400",
              )}
            >
              {isUp ? "▲" : "▼"} {formatPercent(changePct)}
            </span>
          )}
        </div>
      </Link>
      <button
        onClick={onAdd}
        className="w-full mt-1 flex items-center justify-center gap-1 text-[11px] font-bold py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500 hover:text-white text-amber-700 dark:text-amber-500 transition-colors"
      >
        <Plus className="h-3 w-3" />
        Watch
      </button>
    </Card>
  );
}
