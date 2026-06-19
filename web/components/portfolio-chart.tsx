"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { formatIDR, formatPercent, cn } from "@/lib/utils";
import type { PortfolioSnapshot } from "@/lib/portfolio-snapshots";

interface PortfolioChartProps {
  snapshots: PortfolioSnapshot[];
  className?: string;
}

/**
 * Portfolio performance line chart — pure inline SVG, no library.
 * Menampilkan 2 garis: Total Value & Net Invested, dengan area fill untuk value.
 */
export function PortfolioChart({ snapshots, className }: PortfolioChartProps) {
  const data = useMemo(() => {
    if (snapshots.length < 2) {
      return null;
    }

    const width = 600;
    const height = 220;
    const padding = { top: 24, right: 16, bottom: 32, left: 56 };

    const allValues = snapshots.flatMap((s) => [s.totalValue, s.netInvested]);
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const range = max - min || 1;

    const xFor = (i: number) =>
      padding.left +
      (i / (snapshots.length - 1)) * (width - padding.left - padding.right);
    const yFor = (v: number) =>
      padding.top +
      (1 - (v - min) / range) * (height - padding.top - padding.bottom);

    const valuePoints = snapshots
      .map((s, i) => `${xFor(i).toFixed(1)},${yFor(s.totalValue).toFixed(1)}`)
      .join(" ");

    const investedPoints = snapshots
      .map((s, i) => `${xFor(i).toFixed(1)},${yFor(s.netInvested).toFixed(1)}`)
      .join(" ");

    // Area fill under totalValue
    const fillPath = `${xFor(0)},${height - padding.bottom} ${valuePoints} ${xFor(snapshots.length - 1)},${height - padding.bottom}`;

    // Y-axis ticks (4 evenly spaced)
    const ticks = 4;
    const yTicks = Array.from({ length: ticks + 1 }, (_, i) => {
      const value = min + (range * i) / ticks;
      return { y: yFor(value), value };
    });

    // X-axis labels (first, mid, last)
    const xLabels = [
      { x: xFor(0), label: snapshots[0].date.slice(5) },
      {
        x: xFor(Math.floor((snapshots.length - 1) / 2)),
        label: snapshots[Math.floor((snapshots.length - 1) / 2)].date.slice(5),
      },
      {
        x: xFor(snapshots.length - 1),
        label: snapshots[snapshots.length - 1].date.slice(5),
      },
    ];

    const last = snapshots[snapshots.length - 1];
    const first = snapshots[0];
    const valueChange = last.totalValue - first.totalValue;
    const valueChangePct =
      first.totalValue > 0 ? (valueChange / first.totalValue) * 100 : 0;

    return {
      width,
      height,
      padding,
      valuePoints,
      investedPoints,
      fillPath,
      yTicks,
      xLabels,
      last,
      first,
      valueChange,
      valueChangePct,
    };
  }, [snapshots]);

  if (!data) {
    return (
      <Card className={cn("p-5", className)}>
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
          📈 Performa Portfolio
        </h3>
        <div className="text-sm text-muted-foreground text-center py-8">
          Butuh minimal 2 hari snapshot untuk menampilkan grafik. Kembali besok
          setelah halaman porto dibuka.
        </div>
      </Card>
    );
  }

  const isPositive = data.valueChange >= 0;

  return (
    <Card className={cn("p-5", className)}>
      <div className="flex items-start justify-between mb-3 gap-2 flex-wrap">
        <h3 className="text-sm font-bold flex items-center gap-2">
          📈 Performa Portfolio
        </h3>
        <div className="text-right">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Perubahan Sejak Awal
          </div>
          <div
            className={cn(
              "text-lg font-black tabular-nums",
              isPositive ? "text-bull-700 dark:text-bull-500" : "text-bear-700 dark:text-bear-500",
            )}
          >
            {isPositive ? "+" : ""}
            {formatIDR(data.valueChange)}
            <span className="text-xs ml-1.5 font-bold">
              ({isPositive ? "+" : ""}
              {formatPercent(data.valueChangePct)})
            </span>
          </div>
        </div>
      </div>

      <div className="w-full">
        <svg
          viewBox={`0 0 ${data.width} ${data.height}`}
          className="w-full h-auto"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Y-axis grid lines + labels */}
          {data.yTicks.map((tick, i) => (
            <g key={i}>
              <line
                x1={data.padding.left}
                x2={data.width - data.padding.right}
                y1={tick.y}
                y2={tick.y}
                stroke="currentColor"
                className="text-muted/20"
                strokeWidth="1"
                strokeDasharray="2,3"
              />
              <text
                x={data.padding.left - 6}
                y={tick.y + 3}
                textAnchor="end"
                fontSize="10"
                className="fill-muted-foreground"
              >
                {formatCompact(tick.value)}
              </text>
            </g>
          ))}

          {/* X-axis labels */}
          {data.xLabels.map((label, i) => (
            <text
              key={i}
              x={label.x}
              y={data.height - 8}
              textAnchor={i === 0 ? "start" : i === data.xLabels.length - 1 ? "end" : "middle"}
              fontSize="10"
              className="fill-muted-foreground"
            >
              {label.label}
            </text>
          ))}

          {/* Invested baseline */}
          <polyline
            points={data.investedPoints}
            fill="none"
            stroke="#9ca3af"
            strokeWidth="1.5"
            strokeDasharray="4,3"
          />

          {/* Portfolio value area fill */}
          <polygon points={data.fillPath} fill="url(#portfolioGradient)" />

          {/* Portfolio value line */}
          <polyline
            points={data.valuePoints}
            fill="none"
            stroke="#10b981"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* End-point dot */}
          <circle
            cx={data.padding.left +
              ((snapshots.length - 1) / (snapshots.length - 1)) *
                (data.width - data.padding.left - data.padding.right)}
            cy={
              data.padding.top +
              (1 -
                (data.last.totalValue -
                  Math.min(...snapshots.flatMap((s) => [s.totalValue, s.netInvested]))) /
                  (Math.max(...snapshots.flatMap((s) => [s.totalValue, s.netInvested])) -
                    Math.min(...snapshots.flatMap((s) => [s.totalValue, s.netInvested])) ||
                    1)) *
                (data.height - data.padding.top - data.padding.bottom)
            }
            r="5"
            fill="#10b981"
            stroke="white"
            strokeWidth="2"
          />

          <defs>
            <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-2 text-[10px]">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-0.5 bg-bull-500" />
            <span>Portfolio Value</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-0.5 bg-gray-400"
              style={{ borderTop: "1.5px dashed #9ca3af", background: "transparent" }}
            />
            <span>Modal (Top Up − Withdraw)</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

function formatCompact(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}M`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}jt`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}rb`;
  return value.toString();
}
