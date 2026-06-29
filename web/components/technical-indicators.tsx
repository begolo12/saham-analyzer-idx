"use client";

import { useEffect, useRef, useState } from "react";
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

/** Map signal to a numeric strength for the visual bar (-2 to +2) */
function signalStrength(signal: string): number {
  switch (signal) {
    case "STRONG_BUY": return 2;
    case "BUY": return 1;
    case "NEUTRAL": return 0;
    case "SELL": return -1;
    case "STRONG_SELL": return -2;
    default: return 0;
  }
}

/** Small strength dots indicator */
function SignalDots({ signal }: { signal: string }) {
  const strength = signalStrength(signal);
  const isPositive = strength > 0;
  const isNegative = strength < 0;
  const absStrength = Math.abs(strength);

  return (
    <div className="flex items-center gap-0.5" aria-hidden>
      {[-2, -1, 0, 1, 2].map((level) => {
        const filled =
          (isPositive && level > 0 && level <= absStrength) ||
          (isNegative && level < 0 && level >= -absStrength) ||
          (strength === 0 && level === 0);

        return (
          <div
            key={level}
            className={cn(
              "w-1.5 h-1.5 rounded-full transition-colors",
              filled
                ? isPositive
                  ? "bg-emerald-500"
                  : isNegative
                    ? "bg-red-500"
                    : "bg-muted-foreground"
                : "bg-muted",
            )}
          />
        );
      })}
    </div>
  );
}

export function TechnicalIndicators({ indicators }: TechnicalIndicatorsProps) {
  return (
    <div className="space-y-2.5">
      {indicators.map((ind, idx) => {
        const variant = signalBadgeVariant[ind.signal];
        const strength = signalStrength(ind.signal);
        const accentColor =
          strength >= 2
            ? "border-l-emerald-500"
            : strength === 1
              ? "border-l-emerald-400"
              : strength === 0
                ? "border-l-muted-foreground/30"
                : strength === -1
                  ? "border-l-red-400"
                  : "border-l-red-500";

        return (
          <div
            key={ind.name}
            className={cn(
              "bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl border-l-[3px] p-4 stagger-item",
              accentColor,
            )}
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm truncate">{ind.name}</span>
                  <SignalDots signal={ind.signal} />
                </div>
                {ind.value !== null && ind.value !== undefined && (
                  <div className="mt-1 text-xs text-muted-foreground tabular-nums font-num">
                    Nilai: <span className="font-medium text-foreground">{typeof ind.value === "number" ? ind.value.toFixed(2) : ind.value}</span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{ind.explanation}</p>
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
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 200);
    return () => clearTimeout(t);
  }, []);

  const isPositive = score >= 0;
  const absScore = Math.abs(score);
  const targetWidth = (absScore / 100) * 50;
  const widthPercent = mounted ? targetWidth : 0;

  const fillColor =
    color ||
    (isPositive
      ? "linear-gradient(90deg, #34d399, #059669)"
      : "linear-gradient(270deg, #f87171, #dc2626)");

  return (
    <div ref={ref}>
      <div className="flex items-center justify-between mb-1.5 text-xs">
        <span className="font-medium text-foreground/80">{label}</span>
        <span
          className={cn(
            "tabular-nums font-bold text-sm transition-colors font-num",
            isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
          )}
        >
          {score >= 0 ? "+" : ""}{score.toFixed(1)}
        </span>
      </div>
      <div
        className="relative h-3 rounded-full overflow-hidden"
        style={{
          background: "hsl(var(--muted) / 0.5)",
          boxShadow: "inset 2px 2px 4px rgba(0,0,0,0.06), inset -2px -2px 4px rgba(255,255,255,0.4)",
        }}
      >
        {/* Center line marker */}
        <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-muted-foreground/30 z-10" />

        {/* Fill bar — animates from center outward */}
        <div
          className="absolute h-full rounded-full transition-all duration-700 ease-out"
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
