"use client";

import {
  FUNDAMENTAL_INDONESIAN,
  FUNDAMENTAL_EMOJI,
  type FundamentalMetric,
} from "@/lib/fundamental";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface FundamentalMetricsProps {
  metrics: FundamentalMetric[];
}

const signalBadgeVariant: Record<string, "bull" | "bear" | "neutral" | "info"> = {
  EXCELLENT: "bull",
  GOOD: "bull",
  FAIR: "neutral",
  POOR: "bear",
  BAD: "bear",
  UNKNOWN: "info",
};

export function FundamentalMetrics({ metrics }: FundamentalMetricsProps) {
  const visible = metrics.filter((m) => m.signal !== "UNKNOWN");

  if (visible.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-6 text-center text-muted-foreground">
        Data fundamental tidak tersedia untuk saham IDX ini.
        <br />
        <span className="text-xs">Cek laporan keuangan langsung di idx.co.id</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {visible.map((m) => {
        const variant = signalBadgeVariant[m.signal];
        return (
          <div
            key={m.name}
            className="rounded-xl border bg-card p-3 sm:p-4 hover:bg-accent/30 transition-colors"
          >
            <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm">{m.name}</span>
                  <span className="text-xs font-mono text-muted-foreground">
                    {m.formatted}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{m.explanation}</p>
                <p className="text-[10px] text-muted-foreground/70 mt-1 italic">
                  📏 {m.benchmark}
                </p>
              </div>
              <Badge variant={variant} className="shrink-0 text-[10px] whitespace-nowrap">
                {FUNDAMENTAL_EMOJI[m.signal]} {FUNDAMENTAL_INDONESIAN[m.signal]}
              </Badge>
            </div>
          </div>
        );
      })}
    </div>
  );
}
