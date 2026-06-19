"use client";

import {
  ACTION_INDONESIAN,
  ACTION_EMOJI,
  ACTION_COLOR,
  HORIZON_INDONESIAN,
  type Recommendation,
} from "@/lib/recommender";
import { formatIDR, formatPercent, cn } from "@/lib/utils";
import { Target, MapPin, ShieldAlert } from "lucide-react";

const actionClass: Record<string, string> = {
  STRONG_BUY: "rec-strong-buy",
  BUY: "rec-buy",
  HOLD: "rec-hold",
  SELL: "rec-sell",
  STRONG_SELL: "rec-strong-sell",
};

export function RecommendationHero({ rec }: { rec: Recommendation }) {
  return (
    <div className="space-y-3">
      {/* Hero Card */}
      <div className={cn("rounded-3xl p-5 sm:p-7 animate-fade-in", actionClass[rec.action])}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-xs sm:text-sm opacity-90 uppercase tracking-wider font-medium">
              📊 Rekomendasi
            </div>
            <div className="text-3xl sm:text-5xl font-black mt-1 leading-none">
              {ACTION_EMOJI[rec.action]} {ACTION_INDONESIAN[rec.action]}
            </div>
            <div className="mt-3 text-sm sm:text-base opacity-95">
              🕐 {HORIZON_INDONESIAN[rec.horizon]}
            </div>
          </div>
          <div className="sm:text-right">
            <div className="text-xs sm:text-sm opacity-90 uppercase tracking-wider font-medium">
              Confidence
            </div>
            <div className="text-4xl sm:text-6xl font-black leading-none">
              {rec.confidence.toFixed(0)}%
            </div>
            <div className="mt-2 text-sm opacity-95">
              💰 {formatIDR(rec.currentPrice)}
            </div>
          </div>
        </div>
      </div>

      {/* Price Targets */}
      {(rec.entryZone || rec.targetPrice || rec.stopLoss) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Entry Zone */}
          {rec.entryZone && (
            <div className="rounded-2xl border bg-card p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                <MapPin className="h-3 w-3" />
                Entry Zone
              </div>
              <div className="mt-2 space-y-0.5">
                <div className="text-base sm:text-lg font-bold tabular-nums">
                  {formatIDR(rec.entryZone[0])}
                </div>
                <div className="text-xs text-muted-foreground">— {formatIDR(rec.entryZone[1])}</div>
              </div>
            </div>
          )}

          {/* Target */}
          {rec.targetPrice && rec.currentPrice && (
            <div className="rounded-2xl border bg-card p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                <Target className="h-3 w-3" />
                Target Price
              </div>
              <div className="mt-2">
                <div className="text-base sm:text-lg font-bold tabular-nums">
                  {formatIDR(rec.targetPrice)}
                </div>
                <div className="text-xs text-bull-600 font-semibold">
                  {formatPercent(((rec.targetPrice - rec.currentPrice) / rec.currentPrice) * 100)}
                </div>
              </div>
            </div>
          )}

          {/* Stop Loss */}
          {rec.stopLoss && rec.currentPrice && (
            <div className="rounded-2xl border bg-card p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                <ShieldAlert className="h-3 w-3" />
                Stop Loss
              </div>
              <div className="mt-2">
                <div className="text-base sm:text-lg font-bold tabular-nums">
                  {formatIDR(rec.stopLoss)}
                </div>
                <div className="text-xs text-bear-600 font-semibold">
                  {formatPercent(((rec.stopLoss - rec.currentPrice) / rec.currentPrice) * 100)}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Risk/Reward Ratio */}
      {rec.riskRewardRatio && (
        <div className="rounded-2xl border bg-card p-4 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Risk / Reward Ratio
            </div>
            <div className="text-2xl font-bold mt-1 tabular-nums">
              {rec.riskRewardRatio.toFixed(2)}x
            </div>
          </div>
          <div className="text-right">
            {rec.riskRewardRatio >= 2 ? (
              <span className="text-bull-600 font-semibold">✅ Bagus</span>
            ) : rec.riskRewardRatio >= 1 ? (
              <span className="text-amber-600 font-semibold">⚠️ Cukup</span>
            ) : (
              <span className="text-bear-600 font-semibold">❌ Kurang</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
