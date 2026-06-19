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
  const lastY = height - ((closes[lastPoint] - min) / range) * (height - 4) - 2;
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
}: WatchlistCardProps) {
  const isUp = (stock.changePct ?? 0) >= 0;
  const { signal, badge, alerts } = useMemo(() => computeSignal(stock), [stock]);

  return (
    <Card
      className={cn(
        "p-4 transition-all hover:shadow-md relative group",
        signal === "hot" && "border-bull-500/30 bg-bull-50/20 dark:bg-bull-700/5",
        signal === "caution" && "border-bear-500/30 bg-bear-50/20 dark:bg-bear-700/5",
        alertTriggered &&
          "ring-2 ring-amber-500/40 bg-amber-50/30 dark:bg-amber-900/10",
      )}
    >
      {/* Remove button */}
      <button
        onClick={() => onRemove(stock.code)}
        className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 hover:bg-bear-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all z-10"
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
              <span className="font-black text-lg">{stock.code}</span>
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
        <div className="flex items-end justify-between gap-3 mb-2">
          <div className="min-w-0 flex-1">
            <div className="text-2xl font-black tabular-nums leading-none">
              {stock.price !== null ? formatIDR(stock.price) : "—"}
            </div>
            <div
              className={cn(
                "text-xs font-bold tabular-nums mt-1 flex items-center gap-1",
                isUp ? "text-bull-600" : "text-bear-600",
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
              <span className="text-muted-foreground">•</span>
              <span>{formatPercent(stock.changePct)}</span>
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
          <div className="flex flex-wrap gap-1 pt-2 border-t">
            {alerts.map((a, i) => (
              <span
                key={i}
                className={cn(
                  "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full",
                  a.type === "hot" && "bg-bull-100 text-bull-700 dark:bg-bull-700/30 dark:text-bull-500",
                  a.type === "drop" && "bg-bear-100 text-bear-700 dark:bg-bear-700/30 dark:text-bear-500",
                  a.type === "target" && "bg-amber-100 text-amber-700 dark:bg-amber-700/30 dark:text-amber-500",
                  a.type === "valley" && "bg-purple-100 text-purple-700 dark:bg-purple-700/30 dark:text-purple-500",
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
          "p-3 transition-all hover:shadow-md",
          isHot
            ? "border-bull-500/40 bg-gradient-to-br from-bull-50 to-bull-100/50 dark:from-bull-700/10 dark:to-bull-700/5"
            : "border-bear-500/40 bg-gradient-to-br from-bear-50 to-bear-100/50 dark:from-bear-700/10 dark:to-bear-700/5",
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {isHot ? (
              <Flame className="h-4 w-4 text-bull-600 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-bear-600 shrink-0" />
            )}
            <span className="font-bold text-sm">{stock.code}</span>
            <span className={cn(
              "text-xs font-bold tabular-nums",
              isHot ? "text-bull-700" : "text-bear-700",
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
    <Card className="p-3 hover:shadow-md transition-all">
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
                "font-bold tabular-nums",
                isUp ? "text-bull-600" : "text-bear-600",
              )}
            >
              {formatPercent(changePct)}
            </span>
          )}
        </div>
      </Link>
      <button
        onClick={onAdd}
        className="w-full mt-1 flex items-center justify-center gap-1 text-[11px] font-bold py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500 hover:text-white text-amber-700 dark:text-amber-500 transition-colors"
      >
        <Plus className="h-3 w-3" />
        Watch
      </button>
    </Card>
  );
}
