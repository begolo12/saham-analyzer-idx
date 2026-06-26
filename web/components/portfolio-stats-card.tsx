"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { cn, formatPercent } from "@/lib/utils";
import type { PortfolioStats } from "@/lib/portfolio";
import {
  TrendingUp,
  TrendingDown,
  Shield,
  Target,
  Clock,
  BarChart3,
  Zap,
  Award,
} from "lucide-react";

interface PortfolioStatsCardProps {
  stats: PortfolioStats;
  className?: string;
}

const TONE_STYLES = {
  bull: {
    bg: "bg-emerald-500/10 dark:bg-emerald-500/15",
    icon: "text-emerald-600 dark:text-emerald-400",
    value: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-500/15",
  },
  bear: {
    bg: "bg-rose-500/10 dark:bg-rose-500/15",
    icon: "text-rose-600 dark:text-rose-400",
    value: "text-rose-700 dark:text-rose-400",
    border: "border-rose-500/15",
  },
  neutral: {
    bg: "bg-slate-500/8 dark:bg-slate-400/10",
    icon: "text-slate-500 dark:text-slate-400",
    value: "text-foreground",
    border: "border-border/50",
  },
  primary: {
    bg: "bg-blue-500/10 dark:bg-blue-500/15",
    icon: "text-blue-600 dark:text-blue-400",
    value: "text-blue-700 dark:text-blue-400",
    border: "border-blue-500/15",
  },
} as const;

/**
 * Portfolio Statistics Card — menampilkan metrik risiko dan performa.
 * iOS 18 aesthetic, dark mode support.
 */
export function PortfolioStatsCard({ stats, className }: PortfolioStatsCardProps) {
  const metrics = useMemo(() => {
    const items: Array<{
      label: string;
      value: string;
      icon: React.ReactNode;
      tone: "bull" | "bear" | "neutral" | "primary";
      tooltip?: string;
    }> = [];

    // Sharpe Ratio
    items.push({
      label: "Sharpe Ratio",
      value: stats.sharpeRatio !== null ? stats.sharpeRatio.toFixed(2) : "—",
      icon: <Shield className="h-4 w-4" />,
      tone:
        stats.sharpeRatio !== null
          ? stats.sharpeRatio >= 1
            ? "bull"
            : stats.sharpeRatio >= 0
              ? "neutral"
              : "bear"
          : "neutral",
      tooltip: "Risk-adjusted return (>1 bagus, >2 excellent)",
    });

    // Max Drawdown
    items.push({
      label: "Max Drawdown",
      value: stats.maxDrawdown > 0 ? `-${stats.maxDrawdown.toFixed(2)}%` : "0%",
      icon: <TrendingDown className="h-4 w-4" />,
      tone: stats.maxDrawdown > 20 ? "bear" : stats.maxDrawdown > 10 ? "neutral" : "bull",
      tooltip: "Penurunan terbesar dari puncak ke palung",
    });

    // Annualized Return
    items.push({
      label: "Return Tahunan",
      value: formatPercent(stats.annualizedReturn),
      icon: <TrendingUp className="h-4 w-4" />,
      tone: stats.annualizedReturn >= 0 ? "bull" : "bear",
      tooltip: "Return yang diproyeksikan per tahun",
    });

    // Avg Holding Period
    items.push({
      label: "Rata-rata Hold",
      value: stats.avgHoldingPeriod > 0 ? `${stats.avgHoldingPeriod} hari` : "—",
      icon: <Clock className="h-4 w-4" />,
      tone: "neutral",
      tooltip: "Rata-rata waktu holding sebelum jual",
    });

    // Volatility
    items.push({
      label: "Volatilitas",
      value: stats.volatility > 0 ? `${stats.volatility.toFixed(2)}%` : "—",
      icon: <Zap className="h-4 w-4" />,
      tone:
        stats.volatility > 30
          ? "bear"
          : stats.volatility > 15
            ? "neutral"
            : "bull",
      tooltip: "Annualized volatility — semakin rendah semakin stabil",
    });

    // Beta
    items.push({
      label: "Beta (vs IHSG)",
      value: stats.beta !== null ? stats.beta.toFixed(2) : "—",
      icon: <BarChart3 className="h-4 w-4" />,
      tone:
        stats.beta !== null
          ? stats.beta > 1.3
            ? "bear"
            : stats.beta >= 0.7
              ? "neutral"
              : "bull"
          : "neutral",
      tooltip: "1 = sama dengan IHSG, >1 lebih volatile, <1 lebih defensive",
    });

    // Win Rate
    items.push({
      label: "Win Rate",
      value: `${stats.winRate}%`,
      icon: <Target className="h-4 w-4" />,
      tone: stats.winRate >= 60 ? "bull" : stats.winRate >= 40 ? "neutral" : "bear",
      tooltip: "Persentase trade yang menguntungkan",
    });

    // Total Return
    items.push({
      label: "Total Return",
      value: formatPercent(stats.totalReturnPct),
      icon: <Award className="h-4 w-4" />,
      tone: stats.totalReturnPct >= 0 ? "bull" : "bear",
      tooltip: "Total return keseluruhan dari modal",
    });

    return items;
  }, [stats]);

  return (
    <Card
      className={cn(
        "p-5 sm:p-6",
        /* subtle iOS-style elevation */
        "shadow-[0_1px_3px_hsl(222_25%_11%/0.06),0_6px_16px_hsl(222_25%_11%/0.05)]",
        "dark:shadow-[0_1px_3px_hsl(0_0%_0%/0.3),0_6px_16px_hsl(0_0%_0%/0.2)]",
        className,
      )}
    >
      <h3 className="text-sm font-bold mb-4 flex items-center gap-2 tracking-tight">
        📊 Statistik & Risiko
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {metrics.map((m) => {
          const tone = TONE_STYLES[m.tone];
          return (
            <div
              key={m.label}
              className={cn(
                "rounded-2xl border p-3.5 transition-colors",
                tone.border,
                tone.bg,
              )}
            >
              {/* Icon badge */}
              <div
                className={cn(
                  "inline-flex items-center justify-center w-7 h-7 rounded-lg mb-2",
                  tone.bg,
                  tone.icon,
                )}
              >
                {m.icon}
              </div>

              {/* Label */}
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold leading-tight truncate">
                {m.label}
              </div>

              {/* Value */}
              <div
                className={cn(
                  "text-lg font-black tabular-nums mt-1 leading-tight tracking-tight",
                  tone.value,
                )}
              >
                {m.value}
              </div>

              {/* Tooltip hint */}
              {m.tooltip && (
                <div className="text-[9px] text-muted-foreground/70 mt-1.5 leading-snug line-clamp-2">
                  {m.tooltip}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Best / Worst Trade */}
      {(stats.bestTrade || stats.worstTrade) && (
        <div className="grid grid-cols-2 gap-2.5 mt-4">
          {stats.bestTrade && (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/8 dark:bg-emerald-500/10 p-3.5">
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 uppercase tracking-wider">
                🏆 Best Trade
              </div>
              <div className="font-bold text-sm mt-1">{stats.bestTrade.ticker}</div>
              <div className="text-emerald-600 dark:text-emerald-400 font-bold tabular-nums text-xs mt-0.5">
                +{stats.bestTrade.pl.toLocaleString("id-ID")} ({formatPercent(stats.bestTrade.plPercent)})
              </div>
            </div>
          )}
          {stats.worstTrade && (
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/8 dark:bg-rose-500/10 p-3.5">
              <div className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1 uppercase tracking-wider">
                💀 Worst Trade
              </div>
              <div className="font-bold text-sm mt-1">{stats.worstTrade.ticker}</div>
              <div className="text-rose-600 dark:text-rose-400 font-bold tabular-nums text-xs mt-0.5">
                {stats.worstTrade.pl.toLocaleString("id-ID")} ({formatPercent(stats.worstTrade.plPercent)})
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
