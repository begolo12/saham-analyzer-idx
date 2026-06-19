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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {supportLevels.length > 0 && (
            <div className="rounded-xl border-2 border-bull-500/30 bg-bull-50/50 dark:bg-bull-700/10 p-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-bull-700 dark:text-bull-500 mb-2">
                <TrendingUp className="h-3.5 w-3.5" />
                Support Levels
              </div>
              <div className="space-y-1">
                {supportLevels.map((level, i) => (
                  <div key={i} className="text-sm font-bold tabular-nums">
                    {formatIDR(level)}
                  </div>
                ))}
              </div>
            </div>
          )}
          {resistanceLevels.length > 0 && (
            <div className="rounded-xl border-2 border-bear-500/30 bg-bear-50/50 dark:bg-bear-700/10 p-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-bear-700 dark:text-bear-500 mb-2">
                <TrendingDown className="h-3.5 w-3.5" />
                Resistance Levels
              </div>
              <div className="space-y-1">
                {resistanceLevels.map((level, i) => (
                  <div key={i} className="text-sm font-bold tabular-nums">
                    {formatIDR(level)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Patterns */}
      <div className="space-y-2">
        {patterns.map((p) => {
          const variant = signalVariant[p.signal];
          return (
            <div
              key={p.name}
              className="rounded-xl border bg-card p-3 sm:p-4 hover:bg-accent/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{p.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-secondary">
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
