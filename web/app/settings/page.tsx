"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import {
  Settings as SettingsIcon,
  Brain,
  TrendingUp,
  TrendingDown,
  Award,
  Target,
  Activity,
  Bell,
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
import { LanguageSwitcher } from "@/components/language-switcher";
import { CompactModeToggle } from "@/components/compact-mode-toggle";
import {
  exportToFile,
  importFromFile,
  getBackupStats,
  resetAllData,
  getTotalItemCount,
} from "@/lib/backup";
import {
  isNotificationSupported,
  getNotificationPermission,
  isNotificationsEnabled,
  setNotificationsEnabled,
  requestNotificationPermission,
  showNotification,
  NotificationTemplates,
} from "@/lib/notifications";
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

      {/* Backup & Restore */}
      <BackupRestoreCard />

      {/* Mode Tampilan (Compact / Normal) */}
      <CompactModeToggle />

      {/* Language */}
      <LanguageSwitcher />

      {/* Reset All Data */}
      <ResetAllDataCard />

      {/* Notifications */}
      <NotificationSettingsCard />

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

function BackupRestoreCard() {
  const [stats, setStats] = useState<ReturnType<typeof getBackupStats> | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setStats(getBackupStats());
  }, []);

  const refreshStats = () => setStats(getBackupStats());

  const handleExport = () => {
    try {
      exportToFile(`saham-backup-${new Date().toISOString().slice(0, 10)}.json`);
      toast.success("📦 Backup didownload", {
        description: "Simpan file JSON ini di tempat aman (cloud/local).",
        duration: 5000,
      });
    } catch (err) {
      toast.error("Gagal export backup");
      console.error(err);
    }
  };

  const handleImport = async (file: File) => {
    if (!confirm(
      "Import akan MENGGANTI data saat ini (watchlist, portfolio, cash ledger, snapshots, alerts) dengan data dari file. Lanjutkan?"
    )) {
      return;
    }
    setImporting(true);
    try {
      const result = await importFromFile(file);
      toast.success(
        `✅ Restore berhasil! ${result.imported.length} kategori diimport`,
        {
          description: result.skipped.length > 0
            ? `${result.skipped.length} dilewati (kosong)`
            : undefined,
          duration: 5000,
        },
      );
      refreshStats();
    } catch (err) {
      toast.error(
        `Gagal import: ${err instanceof Error ? err.message : "unknown error"}`,
      );
    } finally {
      setImporting(false);
    }
  };

  const sizeKB = stats ? (stats.sizeBytes / 1024).toFixed(1) : "0";
  const totalItems =
    (stats?.watchlistCount ?? 0) +
    (stats?.portfolioCount ?? 0) +
    (stats?.cashCount ?? 0) +
    (stats?.snapshotCount ?? 0) +
    (stats?.alertCount ?? 0);

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <Heart className="h-5 w-5 text-primary" />
        <h2 className="font-bold text-lg">Backup & Restore</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Data Anda tersimpan di browser (localStorage). Export untuk backup ke file JSON, atau
        import untuk restore dari backup sebelumnya.
      </p>

      {stats && (
        <div className="grid grid-cols-3 gap-2 mb-4 text-center">
          <div className="rounded-lg border bg-card p-2">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Items
            </div>
            <div className="text-lg font-black tabular-nums">{totalItems}</div>
          </div>
          <div className="rounded-lg border bg-card p-2">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Storage
            </div>
            <div className="text-lg font-black tabular-nums">{sizeKB} KB</div>
          </div>
          <div className="rounded-lg border bg-card p-2">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Alerts
            </div>
            <div className="text-lg font-black tabular-nums">
              {stats.alertCount}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Button
          onClick={handleExport}
          variant="outline"
          className="h-11"
        >
          📦 Export Backup (JSON)
        </Button>
        <Button
          onClick={() => fileInputRef.current?.click()}
          variant="outline"
          disabled={importing}
          className="h-11"
        >
          {importing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Importing...
            </>
          ) : (
            <>📥 Import Backup</>
          )}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImport(file);
            e.target.value = "";
          }}
        />
      </div>

      <p className="text-[10px] text-muted-foreground mt-3 italic">
        💡 Tips: Export backup setiap minggu. Simpan di cloud (Google Drive / Dropbox) supaya
        tidak hilang kalau ganti browser atau clear cache.
      </p>
    </Card>
  );
}

function ResetAllDataCard() {
  const [confirmStep, setConfirmStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [itemCount, setItemCount] = useState(0);

  useEffect(() => {
    setItemCount(getTotalItemCount());
  }, []);

  const handleResetClick = () => {
    if (confirmStep === 0) {
      if (itemCount === 0) {
        toast("Tidak ada data untuk direset", { icon: "ℹ️" });
        return;
      }
      setConfirmStep(1);
    } else if (confirmStep === 1) {
      setConfirmStep(2);
    } else {
      setBusy(true);
      try {
        const { removed } = resetAllData();
        toast.success(
          `🧹 ${removed.length} kategori data dihapus. Mulai dari awal!`,
          { description: "Refresh halaman untuk melihat empty state.", duration: 5000 },
        );
        setConfirmStep(0);
        setItemCount(0);
        // Trigger reload supaya UI fresh ke empty state
        setTimeout(() => window.location.reload(), 1500);
      } catch (err) {
        toast.error("Gagal reset data");
        console.error(err);
      } finally {
        setBusy(false);
      }
    }
  };

  const handleCancel = () => setConfirmStep(0);

  return (
    <Card className="p-5 border-2 border-bear-500/30 bg-bear-50/30 dark:bg-bear-700/10">
      <div className="flex items-center gap-2 mb-2">
        <Trash2 className="h-5 w-5 text-bear-600" />
        <h2 className="font-bold text-lg text-bear-700 dark:text-bear-500">
          Reset Semua Data
        </h2>
        <Badge variant="bear" className="text-[10px]">
          Berbahaya
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground mb-3">
        Hapus <strong>semua</strong> data app: portfolio, cash ledger, watchlist,
        price alerts, snapshots, dan history self-analysis ({itemCount} item).
        Tidak bisa di-undo.
      </p>
      <p className="text-[11px] text-amber-700 dark:text-amber-500 mb-3 italic">
        ⚠️ Saran: Export backup dulu di atas sebelum reset, supaya bisa restore kalau berubah pikiran.
      </p>

      {confirmStep === 0 && (
        <Button
          onClick={handleResetClick}
          variant="outline"
          disabled={itemCount === 0 || busy}
          className="w-full h-11 border-bear-500/50 text-bear-700 dark:text-bear-500 hover:bg-bear-100 dark:hover:bg-bear-700/20"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Reset Semua Data
        </Button>
      )}

      {confirmStep === 1 && (
        <div className="space-y-2">
          <div className="rounded-lg border-2 border-bear-500/50 bg-bear-100/50 dark:bg-bear-700/20 p-3">
            <p className="text-sm font-bold text-bear-700 dark:text-bear-500 mb-1">
              ⚠️ Yakin reset {itemCount} item?
            </p>
            <p className="text-[11px] text-muted-foreground">
              Watchlist, portfolio, cash ledger, alerts — semuanya akan hilang.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={handleCancel} variant="outline" className="h-11">
              Batal
            </Button>
            <Button
              onClick={handleResetClick}
              variant="default"
              className="h-11 bg-bear-600 hover:bg-bear-700"
            >
              Ya, Lanjut →
            </Button>
          </div>
        </div>
      )}

      {confirmStep === 2 && (
        <div className="space-y-2">
          <div className="rounded-lg border-2 border-bear-600 bg-bear-200/60 dark:bg-bear-700/40 p-3">
            <p className="text-sm font-black text-bear-800 dark:text-bear-300 mb-1">
              🔴 KONFIRMASI TERAKHIR
            </p>
            <p className="text-[11px] text-bear-700 dark:text-bear-400">
              Klik tombol merah di bawah untuk <strong>MENGHAPUS PERMANEN</strong>{" "}
              semua data. Tidak ada undo.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={handleCancel} variant="outline" className="h-11">
              Batal
            </Button>
            <Button
              onClick={handleResetClick}
              disabled={busy}
              className="h-11 bg-bear-700 hover:bg-bear-800 text-white font-black"
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Menghapus...
                </>
              ) : (
                "🗑️ Hapus Permanen"
              )}
            </Button>
          </div>
        </div>
      )}
    </Card>
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

function NotificationSettingsCard() {
  const [mounted, setMounted] = useState(false);
  type PermState = "default" | "granted" | "denied" | "unsupported";
  const [permission, setPermission] = useState<PermState>("default");
  const [enabled, setEnabled] = useState(true);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setMounted(true);
    setSupported(isNotificationSupported());
    setPermission(getNotificationPermission() as PermState);
    setEnabled(isNotificationsEnabled());
  }, []);

  const handleRequestPermission = async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
    if (result === "granted") {
      toast.success("🔔 Notifikasi diizinkan! Kamu akan dapat alert real-time.");
      // Test notification
      showNotification({
        title: "🔔 Notifikasi Aktif!",
        body: "Kamu akan dapat alert saat saham menyentuh target.",
        tag: "test-notification",
      });
    } else if (result === "denied") {
      toast.error(
        "Notifikasi diblokir. Buka Settings browser untuk mengizinkan.",
      );
    }
  };

  const handleToggle = (v: boolean) => {
    setNotificationsEnabled(v);
    setEnabled(v);
    if (v) {
      toast.success("Notifikasi diaktifkan");
    } else {
      toast("Notifikasi dimatikan", { icon: "🔕" });
    }
  };

  if (!mounted) return null;

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <Bell className="h-5 w-5 text-primary" />
        <h2 className="font-bold text-lg">Push Notifications</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Dapatkan alert real-time di browser saat harga menyentuh target.
        Hanya bekerja saat tab ini terbuka.
      </p>

      {!supported && (
        <Alert variant="warning">
          Browser kamu tidak support Push Notifications. Coba Chrome, Firefox,
          atau Edge versi terbaru.
        </Alert>
      )}

      {supported && (
        <div className="space-y-3">
          {/* Permission status */}
          <div className="rounded-lg border p-3 flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">Status Izin Browser</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {permission === "default" &&
                  "Belum diminta. Klik untuk izinkan."}
                {permission === "granted" && "✅ Diizinkan — alert akan muncul"}
                {permission === "denied" &&
                  "❌ Diblokir. Ubah di Settings browser."}
                {permission === "unsupported" && "Browser tidak support"}
              </div>
            </div>
            {permission === "default" && (
              <Button onClick={handleRequestPermission} size="sm">
                Izinkan
              </Button>
            )}
            {permission === "granted" && (
              <Button
                onClick={() => {
                  showNotification({
                    title: "Test Notifikasi",
                    body: "Kalau kamu lihat ini, notifikasi berfungsi!",
                  });
                }}
                variant="outline"
                size="sm"
              >
                Test
              </Button>
            )}
          </div>

          {/* Toggle */}
          <div className="rounded-lg border p-3 flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">Aktifkan Notifikasi</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {enabled
                  ? "Aktif — alert akan muncul saat trigger"
                  : "Nonaktif — tidak ada notifikasi"}
              </div>
            </div>
            <button
              onClick={() => handleToggle(!enabled)}
              className={cn(
                "relative w-12 h-6 rounded-full transition-colors",
                enabled ? "bg-bull-500" : "bg-muted",
              )}
              aria-label="Toggle notifications"
            >
              <span
                className={cn(
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
                  enabled ? "left-6" : "left-0.5",
                )}
              />
            </button>
          </div>

          <p className="text-[10px] text-muted-foreground italic mt-2">
            💡 Notifikasi fired saat: alert harga triggered, watchlist drop
            besar. Aktif hanya saat tab ini terbuka (untuk background push perlu
            PWA install).
          </p>
        </div>
      )}
    </Card>
  );
}
