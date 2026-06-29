"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { cn, formatPercent } from "@/lib/utils";
import { Loader2, Activity, Award, TrendingDown } from "lucide-react";

interface BenchmarkChartProps {
  /** Portfolio snapshots (daily values) */
  snapshots: Array<{ date: string; totalValue: number }>;
  /** IHSG closing prices aligned with snapshot dates */
  ihsgData: Array<{ date: string; close: number }>;
  /** Loading state */
  loading?: boolean;
  /** Error message */
  error?: string | null;
  className?: string;
}

/**
 * Dual-line chart comparing portfolio vs IHSG benchmark.
 * Both lines are indexed to 100 at start for fair comparison.
 * Pure inline SVG — no chart library.
 */
export function BenchmarkChart({
  snapshots,
  ihsgData,
  loading,
  error,
  className,
}: BenchmarkChartProps) {
  const chartData = useMemo(() => {
    if (snapshots.length < 2 || ihsgData.length < 2) return null;

    // Index both series to 100 at their respective starts
    const portBase = snapshots[0].totalValue || 1;
    const ihsgBase = ihsgData[0].close || 1;

    const portIndexed = snapshots.map((s) => ({
      date: s.date,
      value: (s.totalValue / portBase) * 100,
    }));

    const ihsgIndexed = ihsgData.map((s) => ({
      date: s.date,
      value: (s.close / ihsgBase) * 100,
    }));

    // Use the shorter series length
    const len = Math.min(portIndexed.length, ihsgIndexed.length);
    if (len < 2) return null;

    const portSlice = portIndexed.slice(0, len);
    const ihsgSlice = ihsgIndexed.slice(0, len);

    const width = 600;
    const height = 260;
    const padding = { top: 28, right: 20, bottom: 40, left: 56 };

    const allValues = [...portSlice.map((p) => p.value), ...ihsgSlice.map((p) => p.value)];
    const min = Math.min(...allValues) * 0.995;
    const max = Math.max(...allValues) * 1.005;
    const range = max - min || 1;

    const xFor = (i: number) =>
      padding.left +
      (i / (len - 1)) * (width - padding.left - padding.right);
    const yFor = (v: number) =>
      padding.top +
      (1 - (v - min) / range) * (height - padding.top - padding.bottom);

    const portPoints = portSlice
      .map((s, i) => `${xFor(i).toFixed(1)},${yFor(s.value).toFixed(1)}`)
      .join(" ");
    const ihsgPoints = ihsgSlice
      .map((s, i) => `${xFor(i).toFixed(1)},${yFor(s.value).toFixed(1)}`)
      .join(" ");

    // Area fill under portfolio
    const fillPath = `${xFor(0)},${height - padding.bottom} ${portPoints} ${xFor(len - 1)},${height - padding.bottom}`;

    // Y-axis ticks
    const ticks = 4;
    const yTicks = Array.from({ length: ticks + 1 }, (_, i) => {
      const value = min + (range * i) / ticks;
      return { y: yFor(value), value };
    });

    // X-axis labels (first, mid, last)
    const xLabels = [
      { x: xFor(0), label: portSlice[0].date.slice(5) },
      {
        x: xFor(Math.floor((len - 1) / 2)),
        label: portSlice[Math.floor((len - 1) / 2)].date.slice(5),
      },
      {
        x: xFor(len - 1),
        label: portSlice[len - 1].date.slice(5),
      },
    ];

    // Final values for comparison
    const portFinal = portSlice[len - 1].value;
    const ihsgFinal = ihsgSlice[len - 1].value;
    const portReturn = portFinal - 100;
    const ihsgReturn = ihsgFinal - 100;
    const alpha = portReturn - ihsgReturn;

    return {
      width,
      height,
      padding,
      portPoints,
      ihsgPoints,
      fillPath,
      yTicks,
      xLabels,
      portReturn,
      ihsgReturn,
      alpha,
      len,
    };
  }, [snapshots, ihsgData]);

  if (loading) {
    return (
      <Card
        className={cn(
          "p-5 sm:p-6",
          "shadow-[0_1px_3px_hsl(222_25%_11%/0.06),0_6px_16px_hsl(222_25%_11%/0.05)]",
          "dark:shadow-[0_1px_3px_hsl(0_0%_0%/0.3),0_6px_16px_hsl(0_0%_0%/0.2)]",
          className,
        )}
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-blue-500/10">
            <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-sm font-bold tracking-tight">Portfolio vs IHSG</h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-10 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" />
          Memuat data benchmark...
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card
        className={cn(
          "p-5 sm:p-6",
          "shadow-[0_1px_3px_hsl(222_25%_11%/0.06),0_6px_16px_hsl(222_25%_11%/0.05)]",
          "dark:shadow-[0_1px_3px_hsl(0_0%_0%/0.3),0_6px_16px_hsl(0_0%_0%/0.2)]",
          className,
        )}
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-blue-500/10">
            <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-sm font-bold tracking-tight">Portfolio vs IHSG</h3>
        </div>
        <div className="text-xs text-muted-foreground text-center py-10">{error}</div>
      </Card>
    );
  }

  if (!chartData) {
    return (
      <Card
        className={cn(
          "p-5 sm:p-6",
          "shadow-[0_1px_3px_hsl(222_25%_11%/0.06),0_6px_16px_hsl(222_25%_11%/0.05)]",
          "dark:shadow-[0_1px_3px_hsl(0_0%_0%/0.3),0_6px_16px_hsl(0_0%_0%/0.2)]",
          className,
        )}
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-blue-500/10">
            <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-sm font-bold tracking-tight">Portfolio vs IHSG</h3>
        </div>
        <div className="text-xs text-muted-foreground text-center py-10">
          Butuh minimal 2 hari snapshot untuk perbandingan benchmark.
        </div>
      </Card>
    );
  }

  const isOutperforming = chartData.alpha >= 0;

  return (
    <Card
      className={cn(
        "p-5 sm:p-6",
        "shadow-[0_1px_3px_hsl(222_25%_11%/0.06),0_6px_16px_hsl(222_25%_11%/0.05)]",
        "dark:shadow-[0_1px_3px_hsl(0_0%_0%/0.3),0_6px_16px_hsl(0_0%_0%/0.2)]",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4 gap-2 flex-wrap">
        <h3 className="text-sm font-bold flex items-center gap-2 tracking-tight">
          <div className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-blue-500/10">
            <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          Portfolio vs IHSG
        </h3>
        <div
          className={cn(
            "text-xs font-bold tabular-nums px-2.5 py-1 rounded-full",
            isOutperforming
              ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400"
              : "bg-rose-500/12 text-rose-700 dark:text-rose-400",
          )}
        >
          Alpha: {isOutperforming ? "+" : ""}
          {chartData.alpha.toFixed(2)}%
        </div>
      </div>

      {/* Return comparison boxes */}
      <div className="grid grid-cols-2 gap-2.5 mb-5">
        <div
          className={cn(
            "rounded-2xl border p-3",
            chartData.portReturn >= 0
              ? "border-emerald-500/15 bg-emerald-500/8 dark:bg-emerald-500/10"
              : "border-rose-500/15 bg-rose-500/8 dark:bg-rose-500/10",
          )}
        >
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
            Portfolio
          </div>
          <div
            className={cn(
              "text-xl font-black tabular-nums mt-1 tracking-tight",
              chartData.portReturn >= 0
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-rose-700 dark:text-rose-400",
            )}
          >
            {chartData.portReturn >= 0 ? "+" : ""}
            {chartData.portReturn.toFixed(2)}%
          </div>
        </div>
        <div
          className={cn(
            "rounded-2xl border p-3",
            chartData.ihsgReturn >= 0
              ? "border-amber-500/15 bg-amber-500/8 dark:bg-amber-500/10"
              : "border-rose-500/15 bg-rose-500/8 dark:bg-rose-500/10",
          )}
        >
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
            IHSG
          </div>
          <div
            className={cn(
              "text-xl font-black tabular-nums mt-1 tracking-tight",
              chartData.ihsgReturn >= 0
                ? "text-amber-700 dark:text-amber-400"
                : "text-rose-700 dark:text-rose-400",
            )}
          >
            {chartData.ihsgReturn >= 0 ? "+" : ""}
            {chartData.ihsgReturn.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="w-full rounded-xl overflow-hidden bg-muted/20 dark:bg-muted/10 p-2">
        <svg
          viewBox={`0 0 ${chartData.width} ${chartData.height}`}
          className="w-full h-auto"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="benchGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
            <filter id="lineShadow" x="-2%" y="-10%" width="104%" height="120%">
              <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#10b981" floodOpacity="0.2" />
            </filter>
          </defs>

          {/* Y-axis grid */}
          {chartData.yTicks.map((tick, i) => (
            <g key={i}>
              <line
                x1={chartData.padding.left}
                x2={chartData.width - chartData.padding.right}
                y1={tick.y}
                y2={tick.y}
                stroke="currentColor"
                className="text-border/40"
                strokeWidth="0.75"
                strokeDasharray="3,4"
              />
              <text
                x={chartData.padding.left - 8}
                y={tick.y + 3.5}
                textAnchor="end"
                fontSize="10"
                fontWeight="500"
                className="fill-muted-foreground"
              >
                {tick.value.toFixed(1)}
              </text>
            </g>
          ))}

          {/* X-axis labels */}
          {chartData.xLabels.map((label, i) => (
            <text
              key={i}
              x={label.x}
              y={chartData.height - 12}
              textAnchor={
                i === 0 ? "start" : i === chartData.xLabels.length - 1 ? "end" : "middle"
              }
              fontSize="10"
              fontWeight="500"
              className="fill-muted-foreground"
            >
              {label.label}
            </text>
          ))}

          {/* Baseline at 100 */}
          {(() => {
            const tickMin = Math.min(...chartData.yTicks.map((t) => t.value));
            const tickMax = Math.max(...chartData.yTicks.map((t) => t.value));
            const tickRange = tickMax - tickMin || 1;
            const baseline100Y =
              chartData.padding.top +
              (1 - (100 - tickMin) / tickRange) *
                (chartData.height - chartData.padding.top - chartData.padding.bottom);
            if (baseline100Y >= chartData.padding.top && baseline100Y <= chartData.height - chartData.padding.bottom) {
              return (
                <line
                  x1={chartData.padding.left}
                  x2={chartData.width - chartData.padding.right}
                  y1={baseline100Y}
                  y2={baseline100Y}
                  stroke="#6b7280"
                  strokeWidth="0.75"
                  strokeDasharray="4,4"
                  opacity="0.35"
                />
              );
            }
            return null;
          })()}

          {/* Area fill under portfolio */}
          <polygon points={chartData.fillPath} fill="url(#benchGradient)" />

          {/* IHSG line (amber, dashed) */}
          <polyline
            points={chartData.ihsgPoints}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="6,4"
            opacity="0.85"
          />

          {/* Portfolio line (emerald, solid with shadow) */}
          <polyline
            points={chartData.portPoints}
            fill="none"
            stroke="#10b981"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#lineShadow)"
          />

          {/* End dots */}
          {(() => {
            const points = chartData.portPoints.split(" ");
            const lastPt = points[points.length - 1];
            if (!lastPt) return null;
            const [cx, cy] = lastPt.split(",");
            return <circle cx={cx} cy={cy} r="3.5" fill="#10b981" stroke="white" strokeWidth="1.5" />;
          })()}
          {(() => {
            const points = chartData.ihsgPoints.split(" ");
            const lastPt = points[points.length - 1];
            if (!lastPt) return null;
            const [cx, cy] = lastPt.split(",");
            return <circle cx={cx} cy={cy} r="3" fill="#f59e0b" stroke="white" strokeWidth="1.5" />;
          })()}
        </svg>
      </div>

      {/* Legend — clean, below chart */}
      <div className="flex items-center justify-center gap-6 mt-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="inline-block w-5 h-[3px] rounded-full bg-emerald-500" />
          <span className="font-medium">Portfolio</span>
          <span
            className={cn(
              "tabular-nums font-bold",
              chartData.portReturn >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
            )}
          >
            {chartData.portReturn >= 0 ? "+" : ""}
            {chartData.portReturn.toFixed(1)}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-5 h-[3px] rounded-full bg-amber-500" style={{ backgroundImage: "repeating-linear-gradient(to right, #f59e0b 0, #f59e0b 4px, transparent 4px, transparent 7px)" }} />
          <span className="font-medium">IHSG</span>
          <span
            className={cn(
              "tabular-nums font-bold",
              chartData.ihsgReturn >= 0 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400",
            )}
          >
            {chartData.ihsgReturn >= 0 ? "+" : ""}
            {chartData.ihsgReturn.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Outperformance badge */}
      <div
        className={cn(
          "mt-4 rounded-2xl p-3.5 flex items-center gap-3",
          isOutperforming
            ? "bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 dark:from-emerald-500/12 dark:to-emerald-500/5"
            : "bg-gradient-to-r from-rose-500/10 to-rose-500/5 dark:from-rose-500/12 dark:to-rose-500/5",
        )}
      >
        {isOutperforming ? (
          <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-500/12 shrink-0">
            <Award className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
        ) : (
          <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-rose-500/12 shrink-0">
            <TrendingDown className="h-5 w-5 text-rose-600 dark:text-rose-400" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold">
            {isOutperforming
              ? "🎉 Portfolio outperform IHSG!"
              : "IHSG lebih baik dari portfolio"}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            {isOutperforming ? "+" : ""}
            {chartData.alpha.toFixed(2)}% lebih{" "}
            {isOutperforming ? "tinggi" : "rendah"} dari IHSG
          </div>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground/60 mt-3 italic text-center">
        Indexed to 100 — perbandingan return relatif dari titik awal yang sama.
      </p>
    </Card>
  );
}
