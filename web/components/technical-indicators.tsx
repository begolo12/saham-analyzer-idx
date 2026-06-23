"use client";

import {
  SIGNAL_INDONESIAN,
  SIGNAL_EMOJI,
  type IndicatorResult,
} from "@/lib/technical";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TechnicalIndicatorsProps {
  indicators: IndicatorResult[];
}

const signalBadgeVariant: Record<string, "bull" | "bear" | "neutral"> = {
  STRONG_BUY: "bull",
  BUY: "bull",
  NEUTRAL: "neutral",
  SELL: "bear",
  STRONG_SELL: "bear",
};

export function TechnicalIndicators({ indicators }: TechnicalIndicatorsProps) {
  return (
    <div className="space-y-2">
      {indicators.map((ind) => {
        const variant = signalBadgeVariant[ind.signal];
        return (
          <div
            key={ind.name}
            className="rounded-xl border bg-card p-3 sm:p-4 hover:bg-accent/30 transition-colors"
          >
            <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm">{ind.name}</span>
                  {ind.value !== null && ind.value !== undefined && (
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {typeof ind.value === "number" ? ind.value.toFixed(2) : ind.value}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{ind.explanation}</p>
              </div>
              <Badge variant={variant} className="shrink-0 text-[10px] whitespace-nowrap">
                {SIGNAL_EMOJI[ind.signal]} {SIGNAL_INDONESIAN[ind.signal]}
              </Badge>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface ScoreBarProps {
  label: string;
  score: number;
  weight?: number;
  color?: string;
}

export function ScoreBar({ label, score, weight, color }: ScoreBarProps) {
  const isPositive = score >= 0;
  const absScore = Math.abs(score);
  const widthPercent = (absScore / 100) * 50;

  const fillColor =
    color ||
    (isPositive
      ? "linear-gradient(90deg, #10b981, #059669)"
      : "linear-gradient(270deg, #ef4444, #dc2626)");

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5 text-xs">
        <span className="font-medium text-foreground/80">{label}</span>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "tabular-nums font-bold text-sm",
              isPositive ? "text-bull-600 dark:text-bull-400" : "text-bear-600 dark:text-bear-400",
            )}
          >
            {score >= 0 ? "+" : ""}
            {score.toFixed(1)}
          </span>
          {weight !== undefined && (
            <span className="text-muted-foreground text-[10px]">
              ({weight.toFixed(0)}%)
            </span>
          )}
        </div>
      </div>
      <div className="relative h-2 bg-secondary rounded-full overflow-hidden border border-border/10">
        {/* Center line marker */}
        <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-muted-foreground/30 z-10" />
        
        {/* Fill bar */}
        <div
          className="absolute h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${widthPercent}%`,
            left: isPositive ? "50%" : "auto",
            right: !isPositive ? "50%" : "auto",
            background: fillColor,
          }}
        />
      </div>
    </div>
  );
}
