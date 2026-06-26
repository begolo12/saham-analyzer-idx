"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { formatIDR, cn } from "@/lib/utils";

interface SectorSlice {
  sector: string;
  value: number;
  pct: number;
  color: string;
}

interface SectorDonutProps {
  data: SectorSlice[];
  totalValue: number;
  className?: string;
}

/**
 * Sector allocation donut chart — pure inline SVG.
 *
 * Memvisualisasikan komposisi portofolio berdasarkan sektor.
 * Warna deterministic per sektor via hash nama → palette color.
 */

const PALETTE = [
  "#3b82f6", // blue
  "#10b981", // emerald
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#ef4444", // red
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f97316", // orange
  "#84cc16", // lime
  "#a855f7", // purple
  "#eab308", // yellow
];

function colorForSector(sector: string): string {
  let hash = 0;
  for (let i = 0; i < sector.length; i++) {
    hash = (hash * 31 + sector.charCodeAt(i)) | 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export function processSectors(
  sectors: Array<{ sector: string; value: number }>,
): SectorSlice[] {
  const total = sectors.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return [];
  return sectors
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value)
    .map((s) => ({
      sector: s.sector,
      value: s.value,
      pct: (s.value / total) * 100,
      color: colorForSector(s.sector),
    }));
}

export function SectorDonut({ data, totalValue, className }: SectorDonutProps) {
  const arcs = useMemo(() => {
    if (data.length === 0) return [];
    const total = data.reduce((sum, s) => sum + s.pct, 0) || 1;
    let cumPct = 0;
    return data.map((slice) => {
      const startAngle = (cumPct / total) * 360 - 90;
      cumPct += slice.pct;
      const endAngle = (cumPct / total) * 360 - 90;
      return { ...slice, startAngle, endAngle };
    });
  }, [data]);

  if (data.length === 0) {
    return (
      <Card
        className={cn(
          "p-5 sm:p-6",
          "shadow-[0_1px_3px_hsl(222_25%_11%/0.06),0_6px_16px_hsl(222_25%_11%/0.05)]",
          "dark:shadow-[0_1px_3px_hsl(0_0%_0%/0.3),0_6px_16px_hsl(0_0%_0%/0.2)]",
          className,
        )}
      >
        <div className="text-sm text-muted-foreground text-center py-10">
          Belum ada posisi aktif untuk dihitung alokasinya.
        </div>
      </Card>
    );
  }

  const size = 180;
  const stroke = 34;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <Card
      className={cn(
        "p-5 sm:p-6",
        "shadow-[0_1px_3px_hsl(222_25%_11%/0.06),0_6px_16px_hsl(222_25%_11%/0.05)]",
        "dark:shadow-[0_1px_3px_hsl(0_0%_0%/0.3),0_6px_16px_hsl(0_0%_0%/0.2)]",
        className,
      )}
    >
      <h3 className="text-sm font-bold mb-4 flex items-center gap-2 tracking-tight">
        🥧 Alokasi Sektor
      </h3>

      <div className="flex flex-col items-center gap-5">
        {/* Donut chart — centered */}
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {/* Background ring */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              className="text-muted/20"
              strokeWidth={stroke}
            />
            {/* Sector arcs */}
            {arcs.map((arc) => {
              const arcLength = (arc.pct / 100) * circumference;
              const offset = -((arc.startAngle + 90) / 360) * circumference;
              return (
                <circle
                  key={arc.sector}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={arc.color}
                  strokeWidth={stroke}
                  strokeDasharray={`${arcLength} ${circumference - arcLength}`}
                  strokeDashoffset={offset}
                  transform={`rotate(${-arc.startAngle - 90} ${size / 2} ${size / 2})`}
                  className="transition-all"
                  strokeLinecap="butt"
                />
              );
            })}
          </svg>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
              Total
            </div>
            <div className="text-base font-black tabular-nums tracking-tight mt-0.5">
              {formatIDR(totalValue)}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {arcs.length} sektor
            </div>
          </div>
        </div>

        {/* Percentage labels on arcs — displayed as horizontal bar chart */}
        <div className="w-full space-y-2">
          {arcs.map((slice) => (
            <div
              key={slice.sector}
              className="flex items-center gap-3 text-xs group"
            >
              {/* Color dot */}
              <span
                className="inline-block w-3 h-3 rounded-md shrink-0 ring-1 ring-black/5 dark:ring-white/10"
                style={{ backgroundColor: slice.color }}
              />
              {/* Sector name */}
              <span className="font-medium flex-1 truncate text-foreground/80 group-hover:text-foreground transition-colors">
                {slice.sector}
              </span>
              {/* Progress bar */}
              <div className="w-16 h-1.5 rounded-full bg-muted/50 overflow-hidden shrink-0">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.max(slice.pct, 2)}%`,
                    backgroundColor: slice.color,
                    opacity: 0.75,
                  }}
                />
              </div>
              {/* Percentage */}
              <span className="tabular-nums font-bold w-12 text-right shrink-0">
                {slice.pct.toFixed(1)}%
              </span>
              {/* Value */}
              <span className="tabular-nums text-muted-foreground w-24 text-right shrink-0 text-[11px]">
                {formatIDR(slice.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
