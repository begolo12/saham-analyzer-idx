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
  "#10b981", // emerald
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#84cc16", // lime
  "#f97316", // orange
  "#14b8a6", // teal
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
      <Card className={cn("p-5", className)}>
        <div className="text-sm text-muted-foreground text-center py-8">
          Belum ada posisi aktif untuk dihitung alokasinya.
        </div>
      </Card>
    );
  }

  const size = 180;
  const stroke = 36;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  // Use stroke-dasharray on a single circle, shift with stroke-dashoffset
  // Simpler than computing arcs paths.

  return (
    <Card className={cn("p-5", className)}>
      <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
        🥧 Alokasi Sektor
      </h3>
      <div className="flex flex-col sm:flex-row items-center gap-4">
        {/* Donut chart */}
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {/* Background ring */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              className="text-muted/30"
              strokeWidth={stroke}
            />
            {/* Sector arcs — each as a segment of the ring */}
            {arcs.map((arc, i) => {
              const arcLength = (arc.pct / 100) * circumference;
              // Rotate to position the arc correctly using stroke-dashoffset
              // We layer them using transform: rotate starting at top
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
                />
              );
            })}
          </svg>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Total
            </div>
            <div className="text-base font-black tabular-nums">
              {formatIDR(totalValue)}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {arcs.length} sektor
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 w-full min-w-0 space-y-1.5">
          {arcs.map((slice) => (
            <div
              key={slice.sector}
              className="flex items-center gap-2 text-xs"
            >
              <span
                className="inline-block w-3 h-3 rounded-sm shrink-0"
                style={{ backgroundColor: slice.color }}
              />
              <span className="font-medium flex-1 truncate">{slice.sector}</span>
              <span className="tabular-nums font-bold">
                {slice.pct.toFixed(1)}%
              </span>
              <span className="tabular-nums text-muted-foreground w-24 text-right">
                {formatIDR(slice.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
