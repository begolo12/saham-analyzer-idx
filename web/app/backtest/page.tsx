"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  FlaskConical,
  TrendingUp,
  TrendingDown,
  BarChart3,
  AlertCircle,
  Play,
} from "lucide-react";
import { TopHeader } from "@/components/top-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/alert";
import { ErrorBanner } from "@/components/error-banner";
import { EmptyState } from "@/components/empty-state";
import {
  runBacktest,
  compareWithIHSG,
  STRATEGIES,
  PERIODS,
  type BacktestConfig,
  type BacktestResult,
} from "@/lib/backtest";
import { MobileAppBar, MobileActionBar, MobileStatRow } from "@/components/mobile-app-bar";
import { cn, formatIDR } from "@/lib/utils";
import { POPULAR_STOCKS } from "@/lib/popular-stocks";

export default function BacktestPage() {
  const [ticker, setTicker] = useState("BBCA");
  const [strategy, setStrategy] = useState<BacktestConfig["strategy"]>("RSI_MEAN_REVERSION");
  const [period, setPeriod] = useState<BacktestConfig["period"]>("1y");
  const [capital, setCapital] = useState("10000000");
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [ihsgReturn, setIhsgReturn] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRun = async () => {
    setError(null);
    setResult(null);
    setIhsgReturn(null);
    setLoading(true);
    try {
      const config: BacktestConfig = {
        ticker: ticker.toUpperCase().replace(".JK", ""),
        strategy,
        period,
        initialCapital: parseFloat(capital) || 10_000_000,
      };
      const [btResult, ihsg] = await Promise.all([
        runBacktest(config),
        compareWithIHSG(period),
      ]);
      setIhsgReturn(ihsg.ihsgReturnPct);
      setResult({
        ...btResult,
        outperformance: Math.round((btResult.totalReturnPct - ihsg.ihsgReturnPct) * 100) / 100,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Backtest gagal");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell min-h-screen bg-background">
      <TopHeader />

      <MobileAppBar
        title="Backtest"
        subtitle={loading ? "Menjalankan strategi..." : result ? `${ticker} · ${period} · ${strategy.replace(/_/g, " ")}` : "Uji strategi trading di data historis"}
        backHref="/"
      />

      <main className="page-main container space-y-4" data-sticky-actions="true">
        {/* DESKTOP legacy header */}
        <div className="hidden md:flex items-center gap-2">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Beranda</span>
            </Button>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2">
            <FlaskConical className="h-6 w-6 sm:h-7 sm:w-7 text-primary" aria-hidden />
            Backtest Strategi
          </h1>
        </div>

        {/* MOBILE hero */}
        <div className="md:hidden">
          <div className="mobile-hero">
            <div className="page-eyebrow text-white/80">Backtest</div>
            <div className="mobile-hero__row">
              <div>
                <div className="mobile-hero__value">{ticker}</div>
                <div className="mobile-hero__delta">
                  <FlaskConical className="h-3 w-3" />
                  <span>{strategy.replace(/_/g, " ")}</span>
                </div>
                <div className="mobile-hero__sub">{period} • modal {formatIDR(parseFloat(capital) || 0)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Config */}
        <Card className="p-5 space-y-4">
          <h2 className="font-bold text-base">Konfigurasi</h2>

          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Saham</label>
            <Input
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              placeholder="BBCA"
              maxLength={6}
              className="font-bold"
            />
            <div className="flex flex-wrap gap-1 mt-2">
              {POPULAR_STOCKS.slice(0, 8).map((s) => (
                <button
                  key={s.code}
                  type="button"
                  onClick={() => setTicker(s.code)}
                  aria-pressed={ticker === s.code}
                  aria-label={`Pilih saham ${s.code}`}
                  className="inline-flex min-h-8 items-center rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium transition-colors hover:bg-accent active:bg-accent/70"
                >
                  + {s.code}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-xs text-muted-foreground mb-1.5 block">Strategi</span>
            <div className="grid grid-cols-1 gap-2" role="radiogroup" aria-label="Strategi backtest">
              {STRATEGIES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={strategy === s.id}
                  onClick={() => setStrategy(s.id)}
                  className={cn(
                    "min-h-12 text-left rounded-lg border-2 p-3 transition-colors active:scale-[0.99]",
                    strategy === s.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-accent/50",
                  )}
                >
                  <div className="font-bold text-sm">{s.label}</div>
                  <div className="text-xs text-muted-foreground">{s.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-xs text-muted-foreground mb-1.5 block">Periode</span>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Periode backtest">
              {PERIODS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={period === p.id}
                  onClick={() => setPeriod(p.id)}
                  className={cn(
                    "min-h-10 rounded-lg border-2 px-3 py-2 font-medium text-sm transition-colors active:scale-[0.99]",
                    period === p.id
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:bg-accent/50",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Modal Awal (IDR)</label>
            <Input
              type="number"
              value={capital}
              onChange={(e) => setCapital(e.target.value)}
              min={100000}
              step={1000000}
              className="font-bold tabular-nums"
            />
            <div className="flex gap-1 mt-2">
              {["5000000", "10000000", "50000000", "100000000"].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setCapital(v)}
                  aria-pressed={capital === v}
                  aria-label={`Modal ${formatIDR(parseFloat(v))}`}
                  className="min-h-9 flex-1 rounded px-2 py-1 text-[11px] font-semibold bg-muted hover:bg-accent transition-colors tabular-nums"
                >
                  {formatIDR(parseFloat(v))}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <ErrorBanner
              title="Backtest gagal"
              message={error}
              onRetry={handleRun}
            />
          )}
        </Card>

        {loading && !result && (
          <Card className="p-5 space-y-3" aria-busy="true">
            <div className="h-5 w-32 bg-secondary rounded shimmer" />
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border bg-card p-3 space-y-2 animate-pulse">
                <div className="h-3 w-20 bg-muted rounded" />
                <div className="h-7 w-24 bg-muted rounded" />
              </div>
              <div className="rounded-lg border bg-card p-3 space-y-2 animate-pulse">
                <div className="h-3 w-20 bg-muted rounded" />
                <div className="h-7 w-24 bg-muted rounded" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-10 bg-muted rounded animate-pulse" />
              ))}
            </div>
          </Card>
        )}

        {!loading && !result && !error && (
          <div className="md:hidden">
            <Card className="p-6 text-center">
              <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Play className="h-6 w-6" />
              </div>
              <h2 className="mt-3 text-lg font-bold">Belum ada hasil</h2>
              <p className="mt-1 text-sm text-muted-foreground">Atur konfigurasi, lalu tap tombol Run di bawah.</p>
            </Card>
          </div>
        )}

        {!loading && !result && !error && (
          <div className="hidden md:block">
            <EmptyState
              icon={<FlaskConical className="h-6 w-6 text-primary" aria-hidden />}
              title="Belum ada hasil"
              description="Atur konfigurasi di atas, lalu tekan Jalankan Backtest untuk simulasi strategi trading kamu."
            />
          </div>
        )}

        {result && (
          <>
            <div className="md:hidden">
              <MobileStatRow
                items={[
                  {
                    label: "Return",
                    value: `${result.totalReturnPct >= 0 ? "+" : ""}${result.totalReturnPct.toFixed(1)}%`,
                    tone: result.totalReturnPct >= 0 ? "bull" : "bear",
                  },
                  {
                    label: "vs IHSG",
                    value: `${ihsgReturn !== null ? (ihsgReturn >= 0 ? "+" : "") + ihsgReturn.toFixed(1) + "%" : "—"}`,
                    tone: result.outperformance >= 0 ? "bull" : "bear",
                  },
                  {
                    label: "Win Rate",
                    value: `${result.winRate.toFixed(1)}%`,
                    tone: result.winRate >= 50 ? "bull" : "bear",
                  },
                ]}
              />
            </div>

            <Card
              className={cn(
                "p-5 border-2",
                result.totalReturnPct >= 0
                  ? "border-bull-500/30 bg-gradient-to-br from-bull-50 to-bull-100/30 dark:from-bull-700/10 dark:to-bull-700/5"
                  : "border-bear-500/30 bg-gradient-to-br from-bear-50 to-bear-100/30 dark:from-bear-700/10 dark:to-bear-700/5",
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <h2 className="text-base font-bold">Hasil Backtest</h2>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="rounded-lg border bg-card p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Return Strategi</div>
                  <div className={cn("text-2xl font-black tabular-nums mt-0.5", result.totalReturnPct >= 0 ? "text-bull-600" : "text-bear-600")}>
                    {result.totalReturnPct >= 0 ? "+" : ""}{result.totalReturnPct.toFixed(2)}%
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">{formatIDR(result.totalReturn)}</div>
                </div>
                <div className="rounded-lg border bg-card p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Modal Akhir</div>
                  <div className="text-2xl font-black tabular-nums mt-0.5">{formatIDR(result.finalValue)}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">dari {formatIDR(result.initialCapital)}</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <StatPill label="vs Buy & Hold" value={result.buyHoldReturnPct} suffix="%" />
                <StatPill label="vs IHSG" value={ihsgReturn ?? 0} suffix="%" />
                <StatPill label="Win Rate" value={result.winRate} suffix="%" />
                <StatPill label="Max Drawdown" value={-result.maxDrawdown} suffix="%" />
                <StatPill label="Win / Loss" value={`${result.winCount} / ${result.lossCount}`} />
                <StatPill label="Trades" value={result.trades.filter((t) => t.action === "SELL").length} />
              </div>

              {result.outperformance > 0 ? (
                <div className="mt-3 rounded-lg bg-bull-100/50 dark:bg-bull-700/20 p-3 text-center">
                  <p className="text-sm font-bold text-bull-700 dark:text-bull-500">🎉 Strategi outperform IHSG sebesar {result.outperformance.toFixed(2)}%</p>
                </div>
              ) : (
                <div className="mt-3 rounded-lg bg-amber-100/50 dark:bg-amber-700/20 p-3 text-center">
                  <p className="text-sm font-bold text-amber-700 dark:text-amber-500">⚠️ Strategi underperform IHSG sebesar {Math.abs(result.outperformance).toFixed(2)}%</p>
                </div>
              )}
            </Card>

            {result.trades.length > 0 && (
              <Card className="p-5">
                <h2 className="text-base font-bold mb-3">Trade History ({result.trades.filter((t) => t.action === "SELL").length} transaksi)</h2>
                <div className="space-y-1.5 max-h-96 overflow-y-auto">
                  {result.trades.map((t, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/50 text-sm">
                      <div className="flex items-center gap-2">
                        {t.action === "BUY" ? <TrendingUp className="h-4 w-4 text-bull-600" /> : <TrendingDown className="h-4 w-4 text-bear-600" />}
                        <span className={cn("font-bold text-xs", t.action === "BUY" ? "text-bull-600" : "text-bear-600")}>
                          {t.action}
                        </span>
                        <span className="tabular-nums">{t.shares.toLocaleString("id-ID")} lembar</span>
                      </div>
                      <div className="text-right tabular-nums">
                        <div className="font-bold">{formatIDR(t.price)}</div>
                        <div className="text-[10px] text-muted-foreground">{formatIDR(t.value)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <Alert variant="info">
              <strong>ℹ️ Disclaimer:</strong> Backtest menggunakan data historis Yahoo Finance. Bukan jaminan performa masa depan. Selalu DYOR dan kelola risiko Anda.
            </Alert>
          </>
        )}
      </main>

      <MobileActionBar
        primary={{
          label: loading ? "Menjalankan..." : "Run Backtest",
          ariaLabel: loading ? "Menjalankan backtest" : "Jalankan backtest",
          icon: loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />,
          onClick: handleRun,
        }}
        primaryOnly
      />
    </div>
  );
}

function StatPill({ label, value, suffix }: { label: string; value: number | string; suffix?: string }) {
  const displayValue = typeof value === "number" ? value.toFixed(1) : value;
  const isPositive = typeof value === "number" && value > 0;
  const isNegative = typeof value === "number" && value < 0;
  return (
    <div className="rounded-lg bg-card border p-2 text-center">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className={cn("text-sm font-black tabular-nums", isPositive && "text-bull-600", isNegative && "text-bear-600")}>
        {typeof value === "number" && value > 0 ? "+" : ""}{displayValue}{suffix}
      </div>
    </div>
  );
}
