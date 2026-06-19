"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Settings as SettingsIcon,
  Brain,
  TrendingUp,
  TrendingDown,
  Award,
  Target,
  Activity,
  Trash2,
  Info,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  ChevronRight,
  BarChart3,
  Heart,
  Star,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/alert";
import { useSelfAnalysis, updateRecord, clearAllRecords } from "@/lib/self-analysis-storage";
import {
  calculateSystemHealth,
  type SystemHealth,
  type TrackedAction,
} from "@/lib/self-analysis";
import { formatIDR, formatPercent, cn } from "@/lib/utils";
import { toast } from "sonner";

const ACTION_LABEL: Record<TrackedAction, string> = {
  STRONG_BUY: "🟢🟢 Strong Buy",
  BUY: "🟢 Buy",
  HOLD: "🟡 Hold",
  SELL: "🔴 Sell",
  STRONG_SELL: "🔴🔴 Strong Sell",
};

const DEFAULT_WEIGHTS = {
  technical: 0.3,
  fundamental: 0.3,
  behavioral: 0.25,
  sentiment: 0.15,
};

export default function SettingsPage() {
  const { records, mounted } = useSelfAnalysis();
  const [currentPrices, setCurrentPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Get tickers yang perlu dicek (sudah lewat checkAt dan belum ada outcome)
  const tickersToCheck = useMemo(() => {
    const now = Date.now();
    const set = new Set<string>();
    for (const r of records) {
      if (!r.outcome && new Date(r.checkAt).getTime() <= now) {
        set.add(r.ticker);
      }
      // Also fetch for already-tracked records to display
      set.add(r.ticker);
    }
    return Array.from(set);
  }, [records]);

  // Fetch current prices
  useEffect(() => {
    if (!mounted || tickersToCheck.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all(
      tickersToCheck.map(async (t) => {
        try {
          const res = await fetch(`/api/quick/${t}`);
          if (!res.ok) return [t, null] as const;
          const data = await res.json();
          return [t, data.price] as const;
        } catch {
          return [t, null] as const;
        }
      }),
    ).then((entries) => {
      const map: Record<string, number> = {};
      for (const [t, price] of entries) {
        if (price !== null) map[t] = price;
      }
      setCurrentPrices(map);
      setLoading(false);

      // Auto-update outcomes
      import("@/lib/self-analysis").then(({ updateOutcomes }) => {
        const updated = updateOutcomes(records, map);
        const changed = updated.filter(
          (u, i) => !records[i]?.outcome && u.outcome,
        );
        if (changed.length > 0) {
          import("@/lib/self-analysis-storage").then(({ saveRecords }) => {
            saveRecords(updated);
            toast.success(
              `${changed.length} rekomendasi baru di-check!`,
              {
                description: `Cek halaman Self-Analysis untuk lihat hasilnya`,
              },
            );
          });
        }
      });
    });
  }, [tickersToCheck, mounted, records]);

  // Compute system health
  const health: SystemHealth | null = useMemo(() => {
    if (!mounted) return null;
    return calculateSystemHealth(records, DEFAULT_WEIGHTS);
  }, [records, mounted]);

  const stats = useMemo(() => {
    const wins = records.filter((r) => r.outcome?.status === "WIN").length;
    const losses = records.filter((r) => r.outcome?.status === "LOSS").length;
    const neutral = records.filter((r) => r.outcome?.status === "NEUTRAL").length;
    const pending = records.filter((r) => !r.outcome).length;
    return { wins, losses, neutral, pending };
  }, [records]);

  if (!mounted || loading) {
    return (
      <div className="container py-6 pb-24">
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4 sm:py-6 pb-24 md:pb-6 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2">
          <SettingsIcon className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
          Settings & Self-Analysis
        </h1>
        <p className="text-sm text-muted-foreground">
          Sistem yang belajar dari kesalahannya sendiri
        </p>
      </div>

      {/* System Health Overview */}
      <Card className="p-5 bg-gradient-to-br from-primary/5 to-purple-500/5">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="h-5 w-5 text-primary" />
          <h2 className="font-bold text-lg">System Health</h2>
        </div>

        {records.length === 0 ? (
          <Alert variant="info">
            <strong>Belum ada data.</strong> Buka halaman analisa saham (misal
            BBCA) untuk mulai track rekomendasi. Sistem akan otomatis evaluasi
            performa setelah 1 hari.
          </Alert>
        ) : (
          <>
            {/* Big Numbers */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              <MetricCard
                label="Tracked"
                value={records.length.toString()}
                subtitle="rekomendasi"
              />
              <MetricCard
                label="Wins"
                value={stats.wins.toString()}
                subtitle="correct calls"
                color="bull"
              />
              <MetricCard
                label="Losses"
                value={stats.losses.toString()}
                subtitle="wrong calls"
                color="bear"
              />
              <MetricCard
                label="Pending"
                value={stats.pending.toString()}
                subtitle="checking soon"
              />
            </div>

            {/* Overall Accuracy */}
            {health && health.trackedOutcomes > 0 && (
              <div
                className={cn(
                  "rounded-xl border-2 p-4 mt-3",
                  health.overallAccuracy >= 60
                    ? "border-bull-500/30 bg-bull-50/50 dark:bg-bull-700/10"
                    : health.overallAccuracy >= 40
                      ? "border-amber-500/30 bg-amber-50/50 dark:bg-amber-700/10"
                      : "border-bear-500/30 bg-bear-50/50 dark:bg-bear-700/10",
                )}
              >
                <div className="text-xs uppercase tracking-wider font-medium opacity-80">
                  Overall Accuracy
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span
                    className={cn(
                      "text-4xl sm:text-5xl font-black tabular-nums",
                      health.overallAccuracy >= 60
                        ? "text-bull-600"
                        : health.overallAccuracy >= 40
                          ? "text-amber-600"
                          : "text-bear-600",
                    )}
                  >
                    {health.overallAccuracy.toFixed(1)}%
                  </span>
                  <span className="text-sm text-muted-foreground">
                    ({health.trackedOutcomes} outcomes)
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Signal Accuracy */}
      {health && health.trackedOutcomes >= 5 && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-lg">Akurasi per Sinyal</h2>
          </div>
          <div className="space-y-3">
            {(["technical", "fundamental", "behavioral", "sentiment"] as const).map(
              (signal) => {
                const acc = health.signalAccuracy[signal];
                const labels = {
                  technical: "📊 Teknikal",
                  fundamental: "💼 Fundamental",
                  behavioral: "🔍 Behavioral",
                  sentiment: "📰 Sentimen",
                };
                const weight = DEFAULT_WEIGHTS[signal] * 100;
                const isGood = acc.winRate >= 60 && acc.count >= 3;

                return (
                  <div key={signal}>
                    <div className="flex items-center justify-between mb-1 text-sm">
                      <span className="font-medium">{labels[signal]}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          weight {weight.toFixed(0)}%
                        </span>
                        <span
                          className={cn(
                            "font-bold tabular-nums",
                            acc.count === 0
                              ? "text-muted-foreground"
                              : isGood
                                ? "text-bull-600"
                                : "text-bear-600",
                          )}
                        >
                          {acc.count > 0 ? `${acc.winRate.toFixed(0)}%` : "—"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({acc.count})
                        </span>
                      </div>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full transition-all",
                          acc.count === 0
                            ? "bg-muted-foreground/30"
                            : isGood
                              ? "bg-bull-500"
                              : "bg-bear-500",
                        )}
                        style={{
                          width:
                            acc.count === 0
                              ? "0%"
                              : `${Math.min(100, acc.winRate)}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              },
            )}
          </div>
        </Card>
      )}

      {/* Bias Detection & Auto-Adjustment */}
      {health && health.trackedOutcomes >= 10 && health.bias.description && (
        <Card
          className={cn(
            "p-5 border-2",
            health.bias.overweighted
              ? "border-amber-500/30 bg-amber-50/30 dark:bg-amber-700/10"
              : "border-bull-500/20 bg-bull-50/30 dark:bg-bull-700/5",
          )}
        >
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-lg">Weight Optimization</h2>
            <Badge variant="info" className="text-[10px]">
              Auto-tune
            </Badge>
          </div>
          <p className="text-sm mb-3">{health.bias.description}</p>

          {health.suggestedWeights && (
            <div className="space-y-2 mb-3">
              <div className="text-xs font-medium text-muted-foreground">
                Suggested Weights:
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {(["technical", "fundamental", "behavioral", "sentiment"] as const).map(
                  (s) => {
                    const suggested = health.suggestedWeights[s];
                    const current = DEFAULT_WEIGHTS[s];
                    const diff = ((suggested - current) * 100).toFixed(1);
                    return (
                      <div
                        key={s}
                        className="rounded-lg border bg-card p-2 flex justify-between items-center"
                      >
                        <span className="capitalize">{s}</span>
                        <div className="text-right">
                          <div className="font-bold tabular-nums">
                            {(suggested * 100).toFixed(0)}%
                          </div>
                          {diff !== "0.0" && (
                            <div
                              className={cn(
                                "text-[10px] tabular-nums",
                                parseFloat(diff) > 0 ? "text-bull-600" : "text-bear-600",
                              )}
                            >
                              {parseFloat(diff) > 0 ? "+" : ""}
                              {diff}%
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
              <p className="text-[11px] text-muted-foreground italic mt-2">
                💡 {health.suggestedWeights.reason}
              </p>
            </div>
          )}
        </Card>
      )}

      {/* Calibration */}
      {health && health.trackedOutcomes >= 5 && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Award className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-lg">Confidence Calibration</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Seberapa well-calibrated confidence score kita?
          </p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="rounded-xl border bg-bull-50/30 dark:bg-bull-700/10 p-3 text-center">
              <div className="text-xs text-muted-foreground">
                High Confidence (≥70%)
              </div>
              <div className="text-2xl font-black text-bull-600 tabular-nums mt-1">
                {health.calibration.highConfidenceAccuracy}%
              </div>
              <div className="text-[10px] text-muted-foreground">
                win rate
              </div>
            </div>
            <div className="rounded-xl border bg-amber-50/30 dark:bg-amber-700/10 p-3 text-center">
              <div className="text-xs text-muted-foreground">
                Low Confidence (&lt;40%)
              </div>
              <div className="text-2xl font-black text-amber-600 tabular-nums mt-1">
                {health.calibration.lowConfidenceAccuracy}%
              </div>
              <div className="text-[10px] text-muted-foreground">
                win rate
              </div>
            </div>
          </div>
          <div className="text-center">
            <Badge
              variant={
                health.calibration.calibrationScore >= 70
                  ? "bull"
                  : health.calibration.calibrationScore >= 40
                    ? "neutral"
                    : "bear"
              }
              className="text-xs"
            >
              Calibration Score: {health.calibration.calibrationScore}/100
            </Badge>
            <p className="text-[11px] text-muted-foreground mt-2 italic">
              {health.calibration.calibrationScore >= 70
                ? "Sistem well-calibrated. High confidence = high win rate."
                : health.calibration.calibrationScore >= 40
                  ? "Cukup calibrated. Masih perlu lebih banyak data."
                  : "Belum well-calibrated. Confidence belum bisa dipercaya."}
            </p>
          </div>
        </Card>
      )}

      {/* Recommendation History */}
      {records.length > 0 && (
        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h2 className="font-bold text-lg">Recommendation History</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (confirm("Hapus semua tracking history?")) {
                  clearAllRecords();
                  toast.success("History dihapus");
                }
              }}
              className="text-xs"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear
            </Button>
          </div>

          <div className="space-y-2">
            {records
              .slice()
              .reverse()
              .slice(0, 30)
              .map((r) => (
                <RecordCard
                  key={r.id}
                  record={r}
                  currentPrice={currentPrices[r.ticker]}
                  onFeedback={(feedback) => {
                    updateRecord(r.id, { userFeedback: feedback });
                    toast.success(
                      feedback === "correct" ? "✓ Marked as correct" : "✗ Marked as wrong",
                    );
                  }}
                />
              ))}
          </div>
        </Card>
      )}

      {/* About / Info */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Info className="h-5 w-5 text-primary" />
          <h2 className="font-bold text-lg">Tentang Self-Analysis</h2>
        </div>
        <div className="text-sm text-muted-foreground space-y-2">
          <p>
            🧠 Setiap kali Anda membuka halaman analisa saham, sistem
            otomatis merekam rekomendasi yang dihasilkan.
          </p>
          <p>
            ⏰ Setelah 1 hari, sistem akan cek harga saat ini dan evaluasi
            apakah rekomendasi terbukti benar (WIN) atau salah (LOSS).
          </p>
          <p>
            📊 Dari data historis, sistem menghitung akurasi per sinyal
            (teknikal/fundamental/behavioral/sentimen) dan secara otomatis
            menyesuaikan bobot masing-masing sinyal.
          </p>
          <p>
            🎯 Tujuannya: semakin banyak Anda pakai, semakin akurat
            rekomendasinya untuk Anda.
          </p>
          <p className="text-[11px] italic pt-2 border-t">
            ⚠️ Self-analysis tidak menjamin profit. Tetap DYOR dan kelola
            risiko Anda.
          </p>
        </div>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-2 pt-2">
        <Link href="/">
          <Button variant="outline" className="w-full">
            <ChevronRight className="h-4 w-4 mr-1" />
            Beranda
          </Button>
        </Link>
        <Link href="/watchlist">
          <Button variant="outline" className="w-full">
            <Star className="h-4 w-4 mr-1" />
            Watchlist
          </Button>
        </Link>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  subtitle,
  color,
}: {
  label: string;
  value: string;
  subtitle: string;
  color?: "bull" | "bear";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-3",
        color === "bull" && "bg-bull-50/50 dark:bg-bull-700/10 border-bull-500/30",
        color === "bear" && "bg-bear-50/50 dark:bg-bear-700/10 border-bear-500/30",
        !color && "bg-card",
      )}
    >
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        {label}
      </div>
      <div
        className={cn(
          "text-2xl font-black tabular-nums mt-0.5",
          color === "bull" && "text-bull-600",
          color === "bear" && "text-bear-600",
        )}
      >
        {value}
      </div>
      <div className="text-[10px] text-muted-foreground">{subtitle}</div>
    </div>
  );
}

function RecordCard({
  record,
  currentPrice,
  onFeedback,
}: {
  record: import("@/lib/self-analysis").RecommendationRecord;
  currentPrice?: number;
  onFeedback: (feedback: "correct" | "wrong") => void;
}) {
  const isBuy =
    record.action === "BUY" || record.action === "STRONG_BUY";
  const isSell =
    record.action === "SELL" || record.action === "STRONG_SELL";

  const outcome = record.outcome;
  const userFeedback = record.userFeedback;

  let statusIcon: React.ReactNode = null;
  let statusText = "";
  let statusColor = "";

  if (outcome) {
    if (outcome.status === "WIN") {
      statusIcon = <CheckCircle2 className="h-4 w-4 text-bull-600" />;
      statusText = `Win ${outcome.priceChangePct >= 0 ? "+" : ""}${outcome.priceChangePct.toFixed(2)}%`;
      statusColor = "text-bull-600";
    } else if (outcome.status === "LOSS") {
      statusIcon = <XCircle className="h-4 w-4 text-bear-600" />;
      statusText = `Loss ${outcome.priceChangePct >= 0 ? "+" : ""}${outcome.priceChangePct.toFixed(2)}%`;
      statusColor = "text-bear-600";
    } else {
      statusIcon = <AlertCircle className="h-4 w-4 text-amber-600" />;
      statusText = `Neutral ${outcome.priceChangePct >= 0 ? "+" : ""}${outcome.priceChangePct.toFixed(2)}%`;
      statusColor = "text-amber-600";
    }
  } else if (userFeedback === "correct") {
    statusIcon = <CheckCircle2 className="h-4 w-4 text-bull-600" />;
    statusText = "User: correct";
    statusColor = "text-bull-600";
  } else if (userFeedback === "wrong") {
    statusIcon = <XCircle className="h-4 w-4 text-bear-600" />;
    statusText = "User: wrong";
    statusColor = "text-bear-600";
  } else if (currentPrice) {
    const change = ((currentPrice - record.entryPrice) / record.entryPrice) * 100;
    statusText = `${change >= 0 ? "+" : ""}${change.toFixed(2)}% (current)`;
    statusColor = change >= 0 ? "text-bull-600" : "text-bear-600";
    statusIcon =
      change >= 0 ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      );
  } else {
    statusText = "Pending...";
    statusColor = "text-muted-foreground";
    statusIcon = <Loader2 className="h-3 w-3 animate-spin" />;
  }

  return (
    <div className="rounded-xl border bg-card p-3 hover:bg-accent/30 transition-colors">
      <div className="flex items-start justify-between gap-2 mb-2">
        <Link href={`/stock/${record.ticker}`} className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm">{record.ticker}</span>
            <Badge
              variant={
                isBuy ? "bull" : isSell ? "bear" : "neutral"
              }
              className="text-[10px]"
            >
              {record.action.replace("_", " ")}
            </Badge>
            <span className="text-[10px] text-muted-foreground">
              conf {record.confidence.toFixed(0)}%
            </span>
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            Entry: {formatIDR(record.entryPrice)} • {new Date(record.recordedAt).toLocaleDateString("id-ID")}
          </div>
        </Link>
        <div className={cn("flex items-center gap-1 text-xs font-bold shrink-0", statusColor)}>
          {statusIcon}
          <span className="tabular-nums">{statusText}</span>
        </div>
      </div>

      {/* Component scores */}
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-2 overflow-x-auto no-scrollbar">
        {(["technical", "fundamental", "behavioral", "sentiment"] as const).map((s) => {
          const score = record.componentScores[s];
          const weight = record.weights[s] * 100;
          return (
            <span key={s} className="shrink-0">
              {s.slice(0, 3)}: {score >= 0 ? "+" : ""}
              {score.toFixed(0)} ({weight.toFixed(0)}%)
            </span>
          );
        })}
      </div>

      {/* User Feedback Buttons */}
      {!outcome && !userFeedback && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onFeedback("correct")}
            className="flex-1 h-8 text-xs"
          >
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Tepat
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onFeedback("wrong")}
            className="flex-1 h-8 text-xs"
          >
            <XCircle className="h-3 w-3 mr-1" />
            Salah
          </Button>
        </div>
      )}
    </div>
  );
}
