"use client";

import {
  BEHAVIORAL_INDONESIAN,
  type BehavioralPattern,
} from "@/lib/behavioral";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Shield } from "lucide-react";
import { formatIDR, cn } from "@/lib/utils";

interface BehavioralPatternsProps {
  patterns: BehavioralPattern[];
  supportLevels?: number[];
  resistanceLevels?: number[];
}

const signalVariant: Record<string, "bull" | "bear" | "neutral"> = {
  STRONG_BULLISH: "bull",
  BULLISH: "bull",
  NEUTRAL: "neutral",
  BEARISH: "bear",
  STRONG_BEARISH: "bear",
};

export function BehavioralPatterns({
  patterns,
  supportLevels = [],
  resistanceLevels = [],
}: BehavioralPatternsProps) {
  return (
    <div className="space-y-3">
      {/* Support / Resistance */}
      {(supportLevels.length > 0 || resistanceLevels.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {supportLevels.length > 0 && (
            <div
              className="rounded-2xl p-4 bg-emerald-50/80 dark:bg-emerald-900/15 border border-emerald-200/50 dark:border-emerald-700/30"
              style={{ boxShadow: "4px 4px 8px rgba(0,0,0,0.06), -4px -4px 8px rgba(255,255,255,0.5)" }}
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-2">
                <TrendingUp className="h-3.5 w-3.5" />
                Support Levels
              </div>
              <div className="space-y-1">
                {supportLevels.map((level, i) => (
                  <div key={i} className="text-sm font-bold tabular-nums font-num">
                    {formatIDR(level)}
                  </div>
                ))}
              </div>
            </div>
          )}
          {resistanceLevels.length > 0 && (
            <div
              className="rounded-2xl p-4 bg-red-50/80 dark:bg-red-900/15 border border-red-200/50 dark:border-red-700/30"
              style={{ boxShadow: "4px 4px 8px rgba(0,0,0,0.06), -4px -4px 8px rgba(255,255,255,0.5)" }}
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold text-red-700 dark:text-red-400 mb-2">
                <TrendingDown className="h-3.5 w-3.5" />
                Resistance Levels
              </div>
              <div className="space-y-1">
                {resistanceLevels.map((level, i) => (
                  <div key={i} className="text-sm font-bold tabular-nums font-num">
                    {formatIDR(level)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pattern cards */}
      <div className="space-y-2.5">
        {patterns.map((p) => {
          const variant = signalVariant[p.signal];
          return (
            <div
              key={p.name}
              className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-4"
            >
              <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{p.name}</span>
                    <span
                      className="text-xs px-2.5 py-0.5 rounded-full bg-secondary font-medium"
                      style={{ boxShadow: "inset 1px 1px 2px rgba(0,0,0,0.04), inset -1px -1px 2px rgba(255,255,255,0.3)" }}
                    >
                      {p.pattern}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{p.description}</p>
                  <p className="text-[11px] text-muted-foreground mt-1 italic">
                    💡 {p.implication}
                  </p>
                </div>
                <Badge variant={variant} className="shrink-0 text-[10px] whitespace-nowrap">
                  {BEHAVIORAL_INDONESIAN[p.signal]}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
