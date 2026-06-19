"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Briefcase,
  Plus,
  TrendingUp,
  TrendingDown,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Inbox,
  Target,
  Award,
  Activity,
  ShoppingCart,
  Banknote,
  Bell,
  ArrowDownToLine,
  ArrowUpFromLine,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/alert";
import {
  calculateHoldings,
  calculateSummary,
  normalizeTicker,
  type Transaction,
} from "@/lib/portfolio";
import { usePortfolio, removeTransaction, clearAllTransactions } from "@/lib/portfolio-storage";
import { calculateCashSummary, type CashEntry, type CashEntryType } from "@/lib/cash-ledger";
import {
  useCashLedger,
  addCashEntry,
  removeCashEntry,
  clearAllCashEntries,
} from "@/lib/cash-storage";
import { AddTransactionModal } from "@/components/add-transaction-modal";
import { CashModal } from "@/components/cash-modal";
import { SectorDonut, processSectors } from "@/components/sector-donut";
import { PortfolioChart } from "@/components/portfolio-chart";
import { IHSGBenchmark } from "@/components/ihsg-benchmark";
import {
  getSnapshots,
  recordTodaySnapshot,
  type PortfolioSnapshot,
} from "@/lib/portfolio-snapshots";
import { formatIDR, formatPercent, cn } from "@/lib/utils";
import { toast } from "sonner";

interface PriceData {
  code: string;
  name: string;
  price: number | null;
  change: number | null;
  changePct: number | null;
  sector?: string;
  recentCloses?: number[];
}

// ============== Trailing Stop Helpers ==============
const PEAK_KEY = "saham_peak_prices";

function getPeakPrices(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(PEAK_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function getPeakPrice(ticker: string): number {
  const peaks = getPeakPrices();
  return peaks[ticker.toUpperCase()] ?? 0;
}

/**
 * Update peak price for a ticker if currentPrice is higher.
 * Called on every portfolio page load.
 */
function updatePeakPrices(prices: Record<string, number>): void {
  if (typeof window === "undefined") return;
  const peaks = getPeakPrices();
  let changed = false;
  for (const [ticker, price] of Object.entries(prices)) {
    if (price > 0) {
      const key = ticker.toUpperCase();
      if (!peaks[key] || price > peaks[key]) {
        peaks[key] = price;
        changed = true;
      }
    }
  }
  if (changed) {
    localStorage.setItem(PEAK_KEY, JSON.stringify(peaks));
  }
}

export default function PortfolioPage() {
  const { transactions, mounted } = usePortfolio();
  const { entries: cashEntries } = useCashLedger();
  const [currentPrices, setCurrentPrices] = useState<Record<string, PriceData>>({});
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [cashModalType, setCashModalType] = useState<CashEntryType | null>(null);
  const [snapshots, setSnapshots] = useState<PortfolioSnapshot[]>([]);
  const [quickAction, setQuickAction] = useState<{
    ticker: string;
    price: number;
    type: "BUY" | "SELL";
    maxLot?: number;
  } | null>(null);

  // Get unique tickers from transactions
  const uniqueTickers = useMemo(() => {
    return Array.from(new Set(transactions.map((t) => normalizeTicker(t.ticker))));
  }, [transactions]);

  // Fetch current prices
  useEffect(() => {
    if (!mounted || uniqueTickers.length === 0) {
      setCurrentPrices({});
      return;
    }

    setLoadingPrices(true);
    Promise.all(
      uniqueTickers.map(async (t) => {
        try {
          const res = await fetch(`/api/quick/${t}`);
          if (!res.ok) return [t, null] as const;
          const data = await res.json();
          return [t, { code: t, ...data }] as const;
        } catch {
          return [t, null] as const;
        }
      }),
    ).then((entries) => {
      const map: Record<string, PriceData> = {};
      for (const [t, data] of entries) {
        if (data) map[t] = data;
      }
      setCurrentPrices(map);
      setLoadingPrices(false);

      // Record today's snapshot (no-op if already saved today)
      const priceMapForSnap: Record<string, number> = {};
      for (const [t, d] of entries) {
        if (d?.price !== null && d?.price !== undefined && Number.isFinite(d.price)) {
          priceMapForSnap[t] = d.price;
        }
      }
      recordTodaySnapshot(transactions, [], priceMapForSnap);
      // Update peak prices for trailing stop
      updatePeakPrices(priceMapForSnap);
      setSnapshots(getSnapshots());
    });
  }, [uniqueTickers, mounted, transactions]);

  // Reload snapshots when transactions change (e.g. cash ledger update)
  useEffect(() => {
    if (!mounted) return;
    setSnapshots(getSnapshots());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions.length, cashEntries.length]);

  // Reload snapshots on portfolio-updated event
  useEffect(() => {
    if (!mounted) return;
    const handler = () => setSnapshots(getSnapshots());
    window.addEventListener("portfolio-updated", handler);
    return () => window.removeEventListener("portfolio-updated", handler);
  }, [mounted]);

  // Calculate holdings & summary
  const priceMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t in currentPrices) {
      if (currentPrices[t].price !== null) {
        map[t] = currentPrices[t].price!;
      }
    }
    return map;
  }, [currentPrices]);

  const holdings = useMemo(
    () => calculateHoldings(transactions, priceMap),
    [transactions, priceMap],
  );

  const summary = useMemo(
    () => calculateSummary(holdings, transactions),
    [holdings, transactions],
  );

  // Active holdings — those with shares > 0
  const activeHoldings = useMemo(
    () => holdings.filter((h) => h.totalShares > 0),
    [holdings],
  );

  // Cash summary (topup - withdraw) — saldo kas user
  const cashSummary = useMemo(
    () => calculateCashSummary(cashEntries),
    [cashEntries],
  );

  // Total portfolio = cash + current stock value
  const totalPortfolioValue = useMemo(() => {
    const stockValue = holdings.reduce(
      (sum, h) => sum + (h.currentValue ?? 0),
      0,
    );
    return cashSummary.cashBalance + stockValue;
  }, [cashSummary, holdings]);

  // Return % = (current total - net invested) / net invested
  // Net invested = totalTopup - totalWithdraw + (cost basis yang masih aktif di saham)
  // Lebih intuitif: return % = (current total - modal awal) / modal awal
  const totalTopup = cashSummary.totalTopup;
  const totalWithdraw = cashSummary.totalWithdraw;
  const netInvested = totalTopup - totalWithdraw; // Kas yang pernah dimasukkin user
  const totalReturnPercent =
    netInvested > 0
      ? ((totalPortfolioValue - netInvested) / netInvested) * 100
      : 0;

  // Sell Signals: detect holdings that should be sold
  const sellSignals = useMemo(() => {
    const signals: Array<{
      ticker: string;
      reason: string;
      severity: "warning" | "danger";
      currentPrice: number;
      plPercent: number;
      changePct: number;
    }> = [];

    for (const h of holdings) {
      if (h.totalShares <= 0) continue;
      const priceData = currentPrices[h.ticker];
      const currentPrice = priceData?.price ?? h.currentPrice ?? 0;
      const plPct = h.unrealizedPLPercent ?? 0;
      const changePct = priceData?.changePct ?? 0;

      // 1. Stop loss hit (>15% loss) — danger
      if (plPct < -15) {
        signals.push({
          ticker: h.ticker,
          reason: `Cut loss: rugi ${plPct.toFixed(1)}% dari harga beli`,
          severity: "danger",
          currentPrice,
          plPercent: plPct,
          changePct,
        });
        continue;
      }

      // 2. Big drop today (>5%) — warning
      if (changePct < -5) {
        signals.push({
          ticker: h.ticker,
          reason: `Turun tajam ${changePct.toFixed(2)}% hari ini`,
          severity: "warning",
          currentPrice,
          plPercent: plPct,
          changePct,
        });
        continue;
      }

      // 3. Trailing stop — price dropped > 7% from peak
      const peak = getPeakPrice(h.ticker);
      if (peak > 0 && currentPrice > 0) {
        const dropFromPeak = ((peak - currentPrice) / peak) * 100;
        if (dropFromPeak >= 7) {
          signals.push({
            ticker: h.ticker,
            reason: `Trailing stop: turun ${dropFromPeak.toFixed(1)}% dari peak ${formatIDR(peak)}`,
            severity: "warning",
            currentPrice,
            plPercent: plPct,
            changePct,
          });
          continue;
        }
      }

      // 4. Big gain — consider taking profit (>25%)
      if (plPct > 25) {
        signals.push({
          ticker: h.ticker,
          reason: `Take profit: profit ${plPct.toFixed(1)}%, pertimbangkan jual sebagian`,
          severity: "warning",
          currentPrice,
          plPercent: plPct,
          changePct,
        });
        continue;
      }

      // 5. Breakdown below MA20 — danger (jika data historical ada)
      const recentCloses = priceData?.recentCloses;
      if (recentCloses && recentCloses.length >= 20) {
        const ma20 =
          recentCloses.slice(-20).reduce((a, b) => a + b, 0) / 20;
        if (currentPrice < ma20 * 0.97 && plPct < 0) {
          signals.push({
            ticker: h.ticker,
            reason: `Breakdown: harga di bawah MA20 (${formatIDR(ma20)}) — tren melemah`,
            severity: "warning",
            currentPrice,
            plPercent: plPct,
            changePct,
          });
        }
      }
    }

    // Sort: danger first, then warning, then by severity
    return signals.sort((a, b) => {
      if (a.severity !== b.severity) {
        return a.severity === "danger" ? -1 : 1;
      }
      return a.plPercent - b.plPercent;
    });
  }, [holdings, currentPrices]);

  const handleDeleteTransaction = (id: string) => {
    if (confirm("Hapus transaksi ini?")) {
      removeTransaction(id);
      toast.success("Transaksi dihapus");
    }
  };

  if (!mounted) {
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
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2">
            <Briefcase className="h-6 w-6 sm:h-7 sm:w-7 text-primary shrink-0" />
            Portfolio
          </h1>
          <p className="text-sm text-muted-foreground">
            Virtual trading untuk simulasi investasi
          </p>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <Button
            onClick={() => setCashModalType("TOPUP")}
            size="lg"
            variant="outline"
            className="h-12 px-3 sm:px-4 rounded-full border-bull-500/40 text-bull-700 dark:text-bull-500 hover:bg-bull-50 dark:hover:bg-bull-700/20 shadow-sm"
            aria-label="Top Up"
          >
            <ArrowDownToLine className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Top Up</span>
          </Button>
          <Button
            onClick={() => setCashModalType("WITHDRAW")}
            size="lg"
            variant="outline"
            className="h-12 px-3 sm:px-4 rounded-full border-bear-500/40 text-bear-700 dark:text-bear-500 hover:bg-bear-50 dark:hover:bg-bear-700/20 shadow-sm"
            aria-label="Withdraw"
          >
            <ArrowUpFromLine className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Withdraw</span>
          </Button>
          <Button
            onClick={() => setShowAddModal(true)}
            size="lg"
            className="h-12 px-3 sm:px-4 rounded-full shadow-lg"
            aria-label="Tambah Transaksi"
          >
            <Plus className="h-5 w-5 sm:mr-1" />
            <span className="hidden sm:inline">Beli/Jual</span>
          </Button>
        </div>
      </div>

      {/* Disclaimer */}
      <Alert variant="info">
        <strong>📌 Virtual Portfolio:</strong> Track transaksi beli/jual Anda untuk
        hitung profit/loss real-time. Top Up & Withdraw untuk atur modal kas.
        Data tersimpan lokal (localStorage).
      </Alert>

      {/* Empty State */}
      {transactions.length === 0 && cashEntries.length === 0 && (
        <Card className="p-8 sm:p-12 text-center">
          <div className="inline-flex p-4 rounded-full bg-primary/10 mb-4">
            <Inbox className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-xl font-bold mb-2">Portfolio Kosong</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            Mulai dengan Top Up modal, lalu beli saham pertama Anda untuk track
            performa investasi.
          </p>
          <div className="flex gap-2 justify-center flex-wrap">
            <Button onClick={() => setCashModalType("TOPUP")} size="lg" variant="outline" className="border-bull-500/40 text-bull-700 dark:text-bull-500">
              <ArrowDownToLine className="h-5 w-5 mr-2" />
              Top Up Modal
            </Button>
            <Button onClick={() => setShowAddModal(true)} size="lg">
              <Plus className="h-5 w-5 mr-2" />
              Beli Saham
            </Button>
          </div>
        </Card>
      )}

      {/* Summary Cards */}
      {(transactions.length > 0 || cashEntries.length > 0) && (
        <>
          {/* Total P&L Card — overall portfolio (cash + stocks) vs modal awal */}
          <Card
            className={cn(
              "p-5 sm:p-6 border-2",
              totalPortfolioValue - netInvested >= 0
                ? "border-bull-500/30 bg-gradient-to-br from-bull-50 to-bull-100/30 dark:from-bull-700/10 dark:to-bull-700/5"
                : "border-bear-500/30 bg-gradient-to-br from-bear-50 to-bear-100/30 dark:from-bear-700/10 dark:to-bear-700/5",
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs sm:text-sm text-muted-foreground uppercase tracking-wider font-medium">
                Total Portfolio
              </div>
              {totalPortfolioValue - netInvested >= 0 ? (
                <ArrowUpRight className="h-5 w-5 text-bull-600" />
              ) : (
                <ArrowDownRight className="h-5 w-5 text-bear-600" />
              )}
            </div>
            <div
              className={cn(
                "text-3xl sm:text-5xl font-black tabular-nums leading-none",
                totalPortfolioValue - netInvested >= 0
                  ? "text-bull-700 dark:text-bull-500"
                  : "text-bear-700 dark:text-bear-500",
              )}
            >
              {formatIDR(totalPortfolioValue)}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span
                className={cn(
                  "text-sm font-bold tabular-nums",
                  totalPortfolioValue - netInvested >= 0
                    ? "text-bull-600"
                    : "text-bear-600",
                )}
              >
                {formatIDR(totalPortfolioValue - netInvested)}
              </span>
              <span className="text-xs text-muted-foreground">
                vs modal{" "}
                <strong className="text-foreground">
                  {formatIDR(netInvested)}
                </strong>
              </span>
              {netInvested > 0 && (
                <span
                  className={cn(
                    "text-xs font-bold tabular-nums px-1.5 py-0.5 rounded-full",
                    totalReturnPercent >= 0
                      ? "bg-bull-100 text-bull-700 dark:bg-bull-700/30 dark:text-bull-500"
                      : "bg-bear-100 text-bear-700 dark:bg-bear-700/30 dark:text-bear-500",
                  )}
                >
                  {formatPercent(totalReturnPercent)}
                </span>
              )}
            </div>
          </Card>

          {/* Stat Grid — Kas, Modal Saham, Nilai Saat Ini, Realized P&L, Unrealized P&L */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            <StatCard
              label="Kas"
              value={formatIDR(cashSummary.cashBalance)}
              highlight={cashSummary.cashBalance > 0 ? "bull" : undefined}
            />
            <StatCard
              label="Modal di Saham"
              value={formatIDR(summary.totalCost)}
            />
            <StatCard
              label="Nilai Saham"
              value={formatIDR(summary.totalValue)}
            />
            <StatCard
              label="Realized P&L"
              value={`${summary.totalRealizedPL >= 0 ? "+" : ""}${formatIDR(summary.totalRealizedPL)}`}
              positive={summary.totalRealizedPL >= 0}
            />
            <StatCard
              label="Unrealized P&L"
              value={`${summary.totalUnrealizedPL >= 0 ? "+" : ""}${formatIDR(summary.totalUnrealizedPL)}`}
              positive={summary.totalUnrealizedPL >= 0}
            />
            <StatCard
              label="Total Top Up"
              value={formatIDR(cashSummary.totalTopup)}
            />
          </div>

          {/* Performance + Allocation Charts */}
          {(snapshots.length > 0 || activeHoldings.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <PortfolioChart snapshots={snapshots} />
              <SectorDonut
                data={processSectors(
                  activeHoldings
                    .filter((h) => h.currentValue !== null && h.currentValue > 0)
                    .map((h) => ({
                      sector: currentPrices[h.ticker]?.sector ?? h.ticker,
                      value: h.currentValue ?? 0,
                    })),
                )}
                totalValue={summary.totalValue}
              />
            </div>
          )}

          {/* IHSG Benchmark — how does portfolio compare to market? */}
          {netInvested > 0 && (
            <IHSGBenchmark
              portfolioValue={totalPortfolioValue}
              initialDeposit={netInvested}
            />
          )}

          {/* Sell Signals - Critical Alerts */}
          {sellSignals.length > 0 && (
            <Card
              className={cn(
                "p-4 border-2",
                sellSignals.some((s) => s.severity === "danger")
                  ? "border-bear-500/50 bg-gradient-to-br from-bear-50 to-orange-50 dark:from-bear-700/10 dark:to-orange-900/10"
                  : "border-amber-500/50 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-700/10 dark:to-yellow-900/10",
              )}
            >
              <div className="flex items-center gap-2 mb-3">
                <Bell className="h-5 w-5 text-bear-600 animate-pulse" />
                <h2 className="font-bold text-base text-bear-700 dark:text-bear-500">
                  🚨 Sinyal Jual ({sellSignals.length})
                </h2>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Berdasarkan analisis P&L dan pergerakan harga:
              </p>
              <div className="space-y-2">
                {sellSignals.map((signal) => (
                  <Link
                    key={signal.ticker}
                    href={`/stock/${signal.ticker}`}
                    className="block"
                  >
                    <div
                      className={cn(
                        "rounded-xl border-2 p-3 transition-colors cursor-pointer",
                        signal.severity === "danger"
                          ? "border-bear-500 bg-white/80 dark:bg-background hover:bg-bear-50"
                          : "border-amber-500 bg-white/80 dark:bg-background hover:bg-amber-50",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm">{signal.ticker}</span>
                            <span className="text-xl">
                              {signal.severity === "danger" ? "🔴" : "⚠️"}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {signal.reason}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-bold tabular-nums">
                            {formatIDR(signal.currentPrice)}
                          </div>
                          <div
                            className={cn(
                              "text-[10px] font-bold tabular-nums",
                              signal.plPercent >= 0 ? "text-bull-600" : "text-bear-600",
                            )}
                          >
                            {signal.plPercent >= 0 ? "+" : ""}
                            {signal.plPercent.toFixed(1)}%
                          </div>
                          {signal.changePct !== 0 && (
                            <div
                              className={cn(
                                "text-[10px] tabular-nums",
                                signal.changePct >= 0 ? "text-bull-600" : "text-bear-600",
                              )}
                            >
                              today {signal.changePct >= 0 ? "+" : ""}
                              {signal.changePct.toFixed(2)}%
                            </div>
                          )}
                        </div>
                      </div>
                      {/* Quick sell button */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const holding = holdings.find((h) => h.ticker === signal.ticker);
                          if (holding) {
                            const maxLot = Math.floor(holding.totalShares / 100);
                            setQuickAction({
                              ticker: signal.ticker,
                              price: signal.currentPrice,
                              type: "SELL",
                              maxLot,
                            });
                          }
                        }}
                        className="mt-2 w-full text-xs font-bold py-2 rounded-lg bg-bear-500 hover:bg-bear-600 text-white transition-colors"
                      >
                        🔴 Jual Sekarang ({Math.floor(
                          (holdings.find((h) => h.ticker === signal.ticker)?.totalShares ?? 0) / 100,
                        )} lot)
                      </button>
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
          )}

          {/* Holdings */}
          {holdings.filter((h) => h.totalShares > 0).length > 0 && (
            <div>
              <h2 className="text-lg font-bold mb-2 px-1 flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Holdings ({holdings.filter((h) => h.totalShares > 0).length})
              </h2>
              <div className="space-y-2">
                {holdings
                  .filter((h) => h.totalShares > 0)
                  .map((h) => (
                    <HoldingCard
                      key={h.ticker}
                      holding={h}
                      currentPrice={currentPrices[h.ticker]?.price ?? null}
                      onQuickBuy={(ticker, price) =>
                        setQuickAction({ ticker, price, type: "BUY" })
                      }
                      onQuickSell={(ticker, price, maxLot) =>
                        setQuickAction({ ticker, price, type: "SELL", maxLot })
                      }
                    />
                  ))}
              </div>
            </div>
          )}

          {/* Closed positions */}
          {holdings.filter((h) => h.totalShares === 0 && h.realizedPL !== 0)
            .length > 0 && (
            <div>
              <h2 className="text-lg font-bold mb-2 px-1 flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-500" />
                Closed Positions
              </h2>
              <div className="space-y-2">
                {holdings
                  .filter((h) => h.totalShares === 0 && h.realizedPL !== 0)
                  .map((h) => (
                    <ClosedPositionCard key={h.ticker} holding={h} />
                  ))}
              </div>
            </div>
          )}

          {/* Best & Worst Trades */}
          {(summary.bestTrade || summary.worstTrade) && (
            <div className="grid grid-cols-2 gap-2">
              {summary.bestTrade && (
                <Card className="p-3 border-bull-500/30 bg-bull-50/30 dark:bg-bull-700/10">
                  <div className="text-xs text-bull-700 dark:text-bull-500 font-medium">
                    🏆 Best Trade
                  </div>
                  <div className="font-bold text-sm mt-0.5">
                    {summary.bestTrade.ticker}
                  </div>
                  <div className="text-bull-600 font-bold tabular-nums text-sm">
                    +{formatIDR(summary.bestTrade.pl)}
                  </div>
                  <div className="text-xs text-bull-600 tabular-nums">
                    {formatPercent(summary.bestTrade.plPercent)}
                  </div>
                </Card>
              )}
              {summary.worstTrade && (
                <Card className="p-3 border-bear-500/30 bg-bear-50/30 dark:bg-bear-700/10">
                  <div className="text-xs text-bear-700 dark:text-bear-500 font-medium">
                    💀 Worst Trade
                  </div>
                  <div className="font-bold text-sm mt-0.5">
                    {summary.worstTrade.ticker}
                  </div>
                  <div className="text-bear-600 font-bold tabular-nums text-sm">
                    {formatIDR(summary.worstTrade.pl)}
                  </div>
                  <div className="text-xs text-bear-600 tabular-nums">
                    {formatPercent(summary.worstTrade.plPercent)}
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Cash Ledger History */}
          {cashEntries.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2 px-1">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Banknote className="h-5 w-5 text-primary" />
                  Cash Ledger ({cashEntries.length})
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (confirm("Hapus semua cash ledger?")) {
                      clearAllCashEntries();
                      toast.success("Cash ledger dihapus");
                    }
                  }}
                  className="text-xs text-muted-foreground"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              </div>
              <div className="space-y-1.5">
                {cashEntries.map((entry) => (
                  <CashEntryRow
                    key={entry.id}
                    entry={entry}
                    onDelete={() => {
                      if (confirm("Hapus entry ini?")) {
                        removeCashEntry(entry.id);
                        toast.success("Entry dihapus");
                      }
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Transaction History */}
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Riwayat Transaksi ({transactions.length})
              </h2>
              {transactions.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (confirm("Hapus semua transaksi?")) {
                      clearAllTransactions();
                      toast.success("Semua transaksi dihapus");
                    }
                  }}
                  className="text-xs text-muted-foreground"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>
            <div className="space-y-1.5">
              {transactions.map((tx) => (
                <TransactionRow
                  key={tx.id}
                  tx={tx}
                  onDelete={() => handleDeleteTransaction(tx.id)}
                />
              ))}
            </div>
          </div>

          {/* Footer info */}
          <div className="text-center text-xs text-muted-foreground py-4">
            <p>Data tersimpan di browser Anda (localStorage)</p>
            <p className="mt-1">Refresh harga otomatis saat halaman dibuka</p>
          </div>
        </>
      )}

      {/* Cash Modal (Top Up / Withdraw) */}
      {cashModalType && (
        <CashModal
          defaultType={cashModalType}
          currentCash={cashSummary.cashBalance}
          onClose={() => setCashModalType(null)}
        />
      )}

      {/* Add Transaction Modal */}
      {showAddModal && (
        <AddTransactionModal onClose={() => setShowAddModal(false)} />
      )}

      {/* Quick Action Modal (from holdings) */}
      {quickAction && (
        <AddTransactionModal
          defaultTicker={quickAction.ticker}
          defaultPrice={quickAction.price}
          defaultType={quickAction.type}
          defaultLot={quickAction.type === "SELL" ? Math.min(1, quickAction.maxLot || 1) : 1}
          maxLot={quickAction.maxLot}
          onClose={() => setQuickAction(null)}
        />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  positive,
  highlight,
}: {
  label: string;
  value: string;
  positive?: boolean;
  highlight?: "bull" | "bear";
}) {
  return (
    <Card className="p-3">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
        {label}
      </div>
      <div
        className={cn(
          "text-base sm:text-lg font-bold tabular-nums mt-0.5",
          positive === true && "text-bull-600",
          positive === false && "text-bear-600",
          highlight === "bull" && "text-bull-700 dark:text-bull-500",
          highlight === "bear" && "text-bear-700 dark:text-bear-500",
        )}
      >
        {value}
      </div>
    </Card>
  );
}

function HoldingCard({
  holding,
  currentPrice,
  onQuickBuy,
  onQuickSell,
}: {
  holding: ReturnType<typeof calculateHoldings>[0];
  currentPrice: number | null;
  onQuickBuy: (ticker: string, price: number) => void;
  onQuickSell: (ticker: string, price: number, maxLot: number) => void;
}) {
  const isPL = holding.unrealizedPL ?? 0;
  const isUp = isPL >= 0;
  const priceChange = currentPrice ? currentPrice - holding.averagePrice : 0;
  const priceChangePct =
    holding.averagePrice > 0 ? (priceChange / holding.averagePrice) * 100 : 0;

  const totalLot = Math.floor(holding.totalShares / 100);
  const extraLembar = holding.totalShares % 100;

  return (
    <Card className="p-4">
      {/* Header - Link to stock detail */}
      <Link href={`/stock/${holding.ticker}`}>
        <div className="flex items-start justify-between gap-2 mb-3 cursor-pointer">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-base">{holding.ticker}</span>
              <Badge variant="bull" className="text-[10px]">
                {totalLot} lot {extraLembar > 0 && `+ ${extraLembar}`}
              </Badge>
              <span className="text-[10px] text-muted-foreground">
                ({holding.totalShares.toLocaleString("id-ID")} lembar)
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Avg: {formatIDR(holding.averagePrice)} • {holding.buyTransactions} buy
            </div>
          </div>
          {currentPrice && (
            <div className="text-right">
              <div className="text-sm font-bold tabular-nums">
                {formatIDR(currentPrice)}
              </div>
              <div
                className={cn(
                  "text-[10px] tabular-nums",
                  priceChange >= 0 ? "text-bull-600" : "text-bear-600",
                )}
              >
                {formatPercent(priceChangePct)} from avg
              </div>
            </div>
          )}
        </div>
      </Link>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <div className="text-muted-foreground">Modal</div>
          <div className="font-semibold tabular-nums">
            {formatIDR(holding.totalCost)}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">Nilai</div>
          <div className="font-semibold tabular-nums">
            {holding.currentValue !== null ? formatIDR(holding.currentValue) : "—"}
          </div>
        </div>
      </div>

      {/* Unrealized P&L */}
      <div
        className={cn(
          "mt-3 pt-3 border-t flex items-center justify-between",
          isUp ? "border-bull-500/20" : "border-bear-500/20",
        )}
      >
        <span className="text-xs text-muted-foreground">Unrealized P&L</span>
        <div className="text-right">
          <div
            className={cn(
              "font-bold text-sm tabular-nums",
              isUp ? "text-bull-600" : "text-bear-600",
            )}
          >
            {isPL >= 0 ? "+" : ""}
            {formatIDR(isPL)}
          </div>
          <div
            className={cn(
              "text-[10px] tabular-nums",
              isUp ? "text-bull-600" : "text-bear-600",
            )}
          >
            {formatPercent(holding.unrealizedPLPercent ?? 0)}
          </div>
        </div>
      </div>

      {/* Quick Action Buttons */}
      {currentPrice && (
        <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-2">
          <Button
            size="sm"
            variant="outline"
            className="border-bull-500/40 text-bull-700 dark:text-bull-500 hover:bg-bull-50 dark:hover:bg-bull-700/20"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onQuickBuy(holding.ticker, currentPrice);
            }}
          >
            <ShoppingCart className="h-3.5 w-3.5 mr-1" />
            Beli Lagi
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-bear-500/40 text-bear-700 dark:text-bear-500 hover:bg-bear-50 dark:hover:bg-bear-700/20"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onQuickSell(holding.ticker, currentPrice, totalLot);
            }}
          >
            <Banknote className="h-3.5 w-3.5 mr-1" />
            Jual
          </Button>
        </div>
      )}
    </Card>
  );
}

function ClosedPositionCard({
  holding,
}: {
  holding: ReturnType<typeof calculateHoldings>[0];
}) {
  const isUp = holding.realizedPL >= 0;

  return (
    <Card className="p-3 opacity-80">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-semibold text-sm">{holding.ticker}</span>
          <span className="text-xs text-muted-foreground ml-2">
            ({holding.sellTransactions} sell)
          </span>
        </div>
        <div
          className={cn(
            "font-bold text-sm tabular-nums",
            isUp ? "text-bull-600" : "text-bear-600",
          )}
        >
          {holding.realizedPL >= 0 ? "+" : ""}
          {formatIDR(holding.realizedPL)}
        </div>
      </div>
    </Card>
  );
}

function TransactionRow({
  tx,
  onDelete,
}: {
  tx: Transaction;
  onDelete: () => void;
}) {
  const isBuy = tx.type === "BUY";

  return (
    <div className="flex items-center gap-2 rounded-xl border bg-card p-3 hover:bg-accent/30 transition-colors">
      <div
        className={cn(
          "shrink-0 w-9 h-9 rounded-full flex items-center justify-center",
          isBuy ? "bg-bull-100 dark:bg-bull-700/30" : "bg-bear-100 dark:bg-bear-700/30",
        )}
      >
        {isBuy ? (
          <ArrowDownRight className="h-4 w-4 text-bull-600" />
        ) : (
          <ArrowUpRight className="h-4 w-4 text-bear-600" />
        )}
      </div>
      <Link href={`/stock/${tx.ticker}`} className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-sm">{tx.ticker}</span>
          <Badge variant={isBuy ? "bull" : "bear"} className="text-[10px]">
            {tx.type}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground tabular-nums mt-0.5">
          {Math.floor(tx.quantity / 100)} lot ({tx.quantity.toLocaleString("id-ID")} lembar)
          {" × "}
          {formatIDR(tx.price)} • {tx.date}
        </div>
        <div className="text-[10px] text-muted-foreground tabular-nums">
          Total: {formatIDR(tx.price * tx.quantity)}
          {tx.fee > 0 && ` • Fee: ${formatIDR(tx.fee)}`}
        </div>
      </Link>
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => {
          e.preventDefault();
          onDelete();
        }}
        className="shrink-0 text-muted-foreground hover:text-bear-600"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function CashEntryRow({
  entry,
  onDelete,
}: {
  entry: CashEntry;
  onDelete: () => void;
}) {
  const isTopup = entry.type === "TOPUP";

  return (
    <div className="flex items-center gap-2 rounded-xl border bg-card p-3 hover:bg-accent/30 transition-colors">
      <div
        className={cn(
          "shrink-0 w-9 h-9 rounded-full flex items-center justify-center",
          isTopup
            ? "bg-bull-100 dark:bg-bull-700/30"
            : "bg-bear-100 dark:bg-bear-700/30",
        )}
      >
        {isTopup ? (
          <ArrowDownToLine className="h-4 w-4 text-bull-600" />
        ) : (
          <ArrowUpFromLine className="h-4 w-4 text-bear-600" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant={isTopup ? "bull" : "bear"}
            className="text-[10px]"
          >
            {entry.type}
          </Badge>
          <span
            className={cn(
              "font-bold text-sm tabular-nums",
              isTopup ? "text-bull-600" : "text-bear-600",
            )}
          >
            {isTopup ? "+" : "−"}
            {formatIDR(entry.amount)}
          </span>
        </div>
        <div className="text-xs text-muted-foreground tabular-nums mt-0.5">
          {entry.date}
          {entry.notes && (
            <>
              {" • "}
              <span className="italic">{entry.notes}</span>
            </>
          )}
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={onDelete}
        className="shrink-0 text-muted-foreground hover:text-bear-600"
        aria-label="Hapus entry"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}


