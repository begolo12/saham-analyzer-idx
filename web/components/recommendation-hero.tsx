"use client";

import {
  ACTION_INDONESIAN,
  ACTION_EMOJI,
  HORIZON_INDONESIAN,
  type Recommendation,
} from "@/lib/recommender";
import { formatIDR, formatPercent, cn } from "@/lib/utils";
import { Target, MapPin, ShieldAlert, TrendingUp } from "lucide-react";

const actionClass: Record<string, string> = {
  STRONG_BUY: "rec-strong-buy",
  BUY: "rec-buy",
  HOLD: "rec-hold",
  SELL: "rec-sell",
  STRONG_SELL: "rec-strong-sell",
};

const actionTint: Record<string, string> = {
  STRONG_BUY: "rec-tint-buy",
  BUY: "rec-tint-buy",
  HOLD: "rec-tint-hold",
  SELL: "rec-tint-sell",
  STRONG_SELL: "rec-tint-sell",
};

export function RecommendationHero({ rec }: { rec: Recommendation }) {
  const isBuy = rec.action === "STRONG_BUY" || rec.action === "BUY";
  const isSell = rec.action === "STRONG_SELL" || rec.action === "SELL";

  return (
    <div className="space-y-3 stagger-item">
      {/* Hero Card */}
      <div
        className={cn(
          "rounded-2xl p-5 sm:p-7 shadow-md relative overflow-hidden",
          actionClass[rec.action],
        )}
      >
        {/* Subtle radial highlight overlay */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 100% 0%, rgba(255,255,255,0.25) 0%, transparent 60%)",
          }}
          aria-hidden
        />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0">
            <div className="text-caption-1 opacity-90 uppercase tracking-wider font-semibold">
              📊 Rekomendasi
            </div>
            <div className="text-display mt-1.5 leading-none font-display font-bold">
              {ACTION_EMOJI[rec.action]} {ACTION_INDONESIAN[rec.action]}
            </div>
            <div className="mt-3 text-subhead opacity-95 inline-flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" aria-hidden />
              {HORIZON_INDONESIAN[rec.horizon]}
            </div>
          </div>
          <div className="sm:text-right shrink-0">
            <div className="text-caption-1 opacity-90 uppercase tracking-wider font-semibold">
              Confidence
            </div>
            <div className="text-display mt-1 leading-none font-display font-bold font-num">
              {rec.confidence.toFixed(0)}%
            </div>
            <div className="mt-2 text-subhead opacity-95 font-num">
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
            <div className="card-elevated p-4 stagger-item">
              <div className="flex items-center gap-1.5 text-caption-1 uppercase tracking-wider text-muted-foreground font-semibold">
                <MapPin className="h-3 w-3" aria-hidden />
                Entry Zone
              </div>
              <div className="mt-2.5 space-y-0.5 font-num">
                <div className="text-callout font-bold">
                  {formatIDR(rec.entryZone[0])}
                </div>
                <div className="text-footnote text-muted-foreground">
                  — {formatIDR(rec.entryZone[1])}
                </div>
              </div>
            </div>
          )}

          {/* Target */}
          {rec.targetPrice && rec.currentPrice && (
            <div className="card-elevated p-4 stagger-item">
              <div className="flex items-center gap-1.5 text-caption-1 uppercase tracking-wider text-muted-foreground font-semibold">
                <Target className="h-3 w-3" aria-hidden />
                Target Price
              </div>
              <div className="mt-2.5 font-num">
                <div className="text-callout font-bold">
                  {formatIDR(rec.targetPrice)}
                </div>
                <div
                  className={cn(
                    "text-footnote font-semibold inline-flex items-center gap-0.5",
                    isBuy ? "text-success" : "text-destructive",
                  )}
                >
                  {formatPercent(
                    ((rec.targetPrice - rec.currentPrice) / rec.currentPrice) * 100,
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Stop Loss */}
          {rec.stopLoss && rec.currentPrice && (
            <div className="card-elevated p-4 stagger-item">
              <div className="flex items-center gap-1.5 text-caption-1 uppercase tracking-wider text-muted-foreground font-semibold">
                <ShieldAlert className="h-3 w-3" aria-hidden />
                Stop Loss
              </div>
              <div className="mt-2.5 font-num">
                <div className="text-callout font-bold">
                  {formatIDR(rec.stopLoss)}
                </div>
                <div
                  className={cn(
                    "text-footnote font-semibold",
                    isSell ? "text-success" : "text-destructive",
                  )}
                >
                  {formatPercent(
                    ((rec.stopLoss - rec.currentPrice) / rec.currentPrice) * 100,
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Risk/Reward Ratio */}
      {rec.riskRewardRatio && (
        <div className="card-elevated p-4 flex items-center justify-between stagger-item">
          <div>
            <div className="text-caption-1 uppercase tracking-wider text-muted-foreground font-semibold">
              Risk / Reward Ratio
            </div>
            <div className="text-title-3 mt-1 font-num font-bold">
              {rec.riskRewardRatio.toFixed(2)}x
            </div>
          </div>
          <div className="text-right">
            {rec.riskRewardRatio >= 2 ? (
              <span className={cn("px-2.5 py-1 rounded-full text-caption-1 font-bold", actionTint[isBuy ? "BUY" : "HOLD"])}>
                ✅ Bagus
              </span>
            ) : rec.riskRewardRatio >= 1 ? (
              <span className="rec-tint-hold px-2.5 py-1 rounded-full text-caption-1 font-bold">
                ⚠️ Cukup
              </span>
            ) : (
              <span className="rec-tint-sell px-2.5 py-1 rounded-full text-caption-1 font-bold">
                ❌ Kurang
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
