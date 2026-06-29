"use client";

import { useState, useEffect, useRef } from "react";
import {
  ACTION_INDONESIAN,
  ACTION_EMOJI,
  type Recommendation,
  type Action,
} from "@/lib/recommender";
import { formatIDR, formatPercent, cn } from "@/lib/utils";
import { Target, MapPin, ShieldAlert, TrendingUp, Sparkles, Zap, Compass } from "lucide-react";
import { HorizonSelector, type HorizonKey } from "@/components/horizon-selector";
import { Card } from "@/components/ui/card";

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

interface HorizonView {
  key: HorizonKey;
  label: string;
  description: string;
  icon: typeof Sparkles;
  action: Action;
  confidence: number;
  targetMove: number;
}

const HORIZON_META: Record<HorizonKey, { label: string; description: string; icon: typeof Sparkles; baseMove: number }> = {
  "1d": { label: "1 Hari", description: "Sinyal trading harian", icon: Zap, baseMove: 0.03 },
  "5d": { label: "5 Hari", description: "Swing trading 1 minggu", icon: Compass, baseMove: 0.07 },
  "20d": { label: "20 Hari", description: "Trend 1 bulan", icon: Sparkles, baseMove: 0.12 },
};

function deriveHorizons(rec: Recommendation): Record<HorizonKey, HorizonView> {
  const baseAction = rec.action;
  const baseConf = rec.confidence;
  const baseScore =
    rec.componentScores.technical * 0.4 +
    rec.componentScores.fundamental * 0.3 +
    rec.componentScores.behavioral * 0.2 +
    rec.componentScores.sentiment * 0.1;

  const horizonConfAdjust: Record<HorizonKey, number> = {
    "1d": baseConf * 0.85,
    "5d": baseConf * 1.0,
    "20d": baseConf * 0.95,
  };

  const result = {} as Record<HorizonKey, HorizonView>;

  (["1d", "5d", "20d"] as HorizonKey[]).forEach((key) => {
    const meta = HORIZON_META[key];
    let confidence = horizonConfAdjust[key];
    if ((baseAction === "STRONG_BUY" || baseAction === "STRONG_SELL") && key === "20d") confidence *= 1.1;
    if (baseAction === "HOLD" && key === "20d") confidence *= 0.9;

    result[key] = {
      key,
      label: meta.label,
      description: meta.description,
      icon: meta.icon,
      action: baseAction,
      confidence: Math.min(95, Math.round(confidence)),
      targetMove: baseAction === "HOLD" ? meta.baseMove * 0.3 : baseScore >= 0 ? meta.baseMove : -meta.baseMove,
    };
  });

  return result;
}

function computeHorizonTargets(rec: Recommendation, view: HorizonView) {
  if (!rec.currentPrice) return { entryZone: null, target: null, stopLoss: null, rr: null };
  const price = rec.currentPrice;
  const move = Math.abs(view.targetMove);

  if (view.action === "BUY" || view.action === "STRONG_BUY") {
    const stop = move * 0.5 + 0.02;
    const target = price * (1 + move);
    const stopLoss = price * (1 - stop);
    const entryZone: [number, number] = [price * (1 - stop / 2), price * 1.005];
    const rr = (target - price) / Math.max(price - stopLoss, 0.01);
    return { entryZone, target, stopLoss, rr };
  }

  if (view.action === "SELL" || view.action === "STRONG_SELL") {
    const stop = move * 0.5 + 0.02;
    const target = price * (1 - move);
    const stopLoss = price * (1 + stop);
    const entryZone: [number, number] = [price * 0.995, price * (1 + stop / 2)];
    const rr = (price - target) / Math.max(stopLoss - price, 0.01);
    return { entryZone, target, stopLoss, rr };
  }

  return {
    entryZone: [price * 0.97, price * 1.03],
    target: null,
    stopLoss: price * 0.92,
    rr: null,
  };
}

/** Animated confidence bar */
function AnimatedConfidenceBar({ confidence, action }: { confidence: number; action: Action }) {
  const [width, setWidth] = useState(0);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      const t = setTimeout(() => setWidth(confidence), 150);
      return () => clearTimeout(t);
    }
    setWidth(confidence);
  }, [confidence]);

  const isBuy = action === "BUY" || action === "STRONG_BUY";
  const isSell = action === "SELL" || action === "STRONG_SELL";
  const barColor = isBuy
    ? "from-emerald-400 to-emerald-600"
    : isSell
      ? "from-red-400 to-red-600"
      : "from-amber-400 to-amber-600";

  if (confidence < 20) {
    return (
      <div className="space-y-1.5">
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold bg-muted/60 text-muted-foreground border border-border/40"
          style={{ boxShadow: "2px 2px 4px rgba(0,0,0,0.06), -2px -2px 4px rgba(255,255,255,0.4)" }}
        >
          ⚠️ Data terbatas
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="opacity-90 font-semibold">Keyakinan</span>
        <span className="font-black tabular-nums text-lg font-num">{confidence}%</span>
      </div>
      <div
        className="relative h-3 rounded-full overflow-hidden"
        style={{
          background: "hsl(var(--muted) / 0.3)",
          boxShadow: "inset 2px 2px 4px rgba(0,0,0,0.08), inset -2px -2px 4px rgba(255,255,255,0.3)",
        }}
      >
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full bg-gradient-to-r transition-all duration-1000 ease-out",
            barColor,
          )}
          style={{ width: `${width}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent shimmer" />
        </div>
      </div>
    </div>
  );
}

export function RecommendationHero({ rec }: { rec: Recommendation }) {
  const [selected, setSelected] = useState<HorizonKey>(
    rec.horizon === "SHORT" ? "1d" : rec.horizon === "LONG" ? "20d" : "5d",
  );
  const [mounted, setMounted] = useState(false);

  const horizons = deriveHorizons(rec);
  const view = horizons[selected];
  const targets = computeHorizonTargets(rec, view);
  const isBuy = view.action === "STRONG_BUY" || view.action === "BUY";
  const isSell = view.action === "STRONG_SELL" || view.action === "SELL";
  const HorizonIcon = view.icon;

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="space-y-3">
      {/* Horizon selector row */}
      <div className="flex items-center gap-2">
        <HorizonIcon className="h-4 w-4 text-muted-foreground" aria-hidden />
        <span className="text-xs font-semibold text-muted-foreground">Horizon:</span>
        <div className="flex-1">
          <HorizonSelector
            value={selected}
            onChange={setSelected}
            ariaLabel="Pilih horizon analisa"
            options={(["1d", "5d", "20d"] as HorizonKey[]).map((k) => ({
              value: k,
              label: HORIZON_META[k].label,
            }))}
          />
        </div>
      </div>

      {/* Main recommendation card */}
      <div
        className={cn(
          "bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl relative overflow-hidden transition-all duration-500",
          actionClass[view.action],
          mounted ? "opacity-100 scale-100" : "opacity-0 scale-95",
        )}
        style={{ padding: "1.25rem 1.5rem", borderRadius: "20px" }}
      >
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{ background: "radial-gradient(circle at 100% 0%, rgba(255,255,255,0.25) 0%, transparent 60%)" }}
          aria-hidden
        />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0">
            <div className="text-caption-1 opacity-90 uppercase tracking-wider font-semibold">
              📊 Sinyal · {view.label}
            </div>
            <div className="text-[2rem] sm:text-[2.5rem] mt-1.5 leading-none font-display font-black tracking-tight">
              {ACTION_EMOJI[view.action]} {ACTION_INDONESIAN[view.action]}
            </div>
            <div className="mt-3 text-subhead opacity-95 inline-flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" aria-hidden />
              <span>
                Target {view.targetMove >= 0 ? "↑" : "↓"} {formatPercent(Math.abs(view.targetMove) * 100, 1)}
              </span>
            </div>
          </div>
          <div className="sm:text-right shrink-0 sm:min-w-[160px]">
            <AnimatedConfidenceBar confidence={view.confidence} action={view.action} />
          </div>
        </div>
      </div>

      {/* Horizon row */}
      <div className="grid grid-cols-3 gap-2">
        {(["1d", "5d", "20d"] as HorizonKey[]).map((k) => {
          const h = horizons[k];
          const isActive = k === selected;
          const tone =
            h.action === "BUY" || h.action === "STRONG_BUY"
              ? "text-success"
              : h.action === "SELL" || h.action === "STRONG_SELL"
                ? "text-destructive"
                : "text-muted-foreground";
          return (
            <button
              key={k}
              type="button"
              onClick={() => setSelected(k)}
              className={cn(
                "rounded-2xl p-3 text-center transition-all duration-200",
                isActive
                  ? "bg-[hsl(var(--card))] rounded-xl bg-primary/5 border-primary/20"
                  : "bg-card border border-border/40 hover:bg-accent/30",
                isActive && "shadow-[4px_4px_8px_rgba(0,0,0,0.08),-4px_-4px_8px_rgba(255,255,255,0.5)]",
              )}
              aria-pressed={isActive}
              aria-label={`Pilih horizon ${HORIZON_META[k].label}: ${ACTION_INDONESIAN[h.action]}, confidence ${h.confidence}%`}
            >
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{HORIZON_META[k].label}</div>
              <div className={cn("text-sm font-bold mt-0.5", tone)}>{ACTION_INDONESIAN[h.action]}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5 tabular-nums font-num">
                {h.confidence < 20
                  ? "Data terbatas"
                  : `${h.confidence}% · ${formatPercent(h.targetMove * 100, 1)}`}
              </div>
            </button>
          );
        })}
      </div>

      {/* Target cards */}
      {(targets.entryZone || targets.target || targets.stopLoss) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {targets.entryZone && (
            <Card className="p-4 stagger-item">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                <MapPin className="h-3 w-3" aria-hidden />
                Entry Zone
              </div>
              <div className="mt-2.5 space-y-0.5 font-num">
                <div className="text-sm font-bold">{formatIDR(targets.entryZone[0])}</div>
                <div className="text-[11px] text-muted-foreground">— {formatIDR(targets.entryZone[1])}</div>
              </div>
            </Card>
          )}

          {targets.target && rec.currentPrice && (
            <Card className="p-4 stagger-item">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                <Target className="h-3 w-3" aria-hidden />
                Target Price
              </div>
              <div className="mt-2.5 font-num">
                <div className="text-sm font-bold">{formatIDR(targets.target)}</div>
                <div className={cn("text-[11px] font-semibold inline-flex items-center gap-0.5", isBuy ? "text-success" : "text-destructive")}>
                  {formatPercent(((targets.target - rec.currentPrice) / rec.currentPrice) * 100)}
                </div>
              </div>
            </Card>
          )}

          {targets.stopLoss && rec.currentPrice && (
            <Card className="p-4 stagger-item">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                <ShieldAlert className="h-3 w-3" aria-hidden />
                Stop Loss
              </div>
              <div className="mt-2.5 font-num">
                <div className="text-sm font-bold">{formatIDR(targets.stopLoss)}</div>
                <div className={cn("text-[11px] font-semibold", isSell ? "text-success" : "text-destructive")}>
                  {formatPercent(((targets.stopLoss - rec.currentPrice) / rec.currentPrice) * 100)}
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Risk/Reward */}
      {targets.rr && (
        <Card className="p-4 flex items-center justify-between stagger-item">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Risk / Reward Ratio</div>
            <div className="text-lg mt-1 font-num font-bold">{targets.rr.toFixed(2)}x</div>
          </div>
          <div className="text-right">
            {targets.rr >= 2 ? (
              <span
                className={cn("px-3 py-1 rounded-full text-[11px] font-bold inline-flex items-center", actionTint[isBuy ? "BUY" : "HOLD"])}
                style={{ boxShadow: "2px 2px 4px rgba(0,0,0,0.06), -2px -2px 4px rgba(255,255,255,0.4)" }}
              >
                ✅ Bagus
              </span>
            ) : targets.rr >= 1 ? (
              <span
                className="rec-tint-hold px-3 py-1 rounded-full text-[11px] font-bold"
                style={{ boxShadow: "2px 2px 4px rgba(0,0,0,0.06), -2px -2px 4px rgba(255,255,255,0.4)" }}
              >
                ⚠️ Cukup
              </span>
            ) : (
              <span
                className="rec-tint-sell px-3 py-1 rounded-full text-[11px] font-bold"
                style={{ boxShadow: "2px 2px 4px rgba(0,0,0,0.06), -2px -2px 4px rgba(255,255,255,0.4)" }}
              >
                ❌ Kurang
              </span>
            )}
          </div>
        </Card>
      )}

    </div>
  );
}
