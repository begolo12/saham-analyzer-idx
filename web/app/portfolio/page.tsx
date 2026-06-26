"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
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
  Target,
  Award,
  Activity,
  ShoppingCart,
  Banknote,
  Bell,
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/alert";
import {
  calculateHoldings,
  calculateSummary,
  calculatePortfolioStats,
  normalizeTicker,
  type Transaction,
  type PortfolioStats,
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
import { BenchmarkChart } from "@/components/benchmark-chart";
import { PortfolioStatsCard } from "@/components/portfolio-stats-card";
import { EmptyState } from "@/components/empty-state";
import {
  getSnapshots,
  recordTodaySnapshot,
  type PortfolioSnapshot,
} from "@/lib/portfolio-snapshots";
import {
  MobileAppBar,
  MobileActionBar,
  MobileSectionTabs,
  MobileStatRow,
  MobileListItem,
} from "@/components/mobile-app-bar";
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

type MobileSection = "holdings" | "activity" | "insights";

export default function PortfolioPage() {
  const { transactions, mounted } = usePortfolio();
  const { entries: cashEntries } = useCashLedger();
  const [currentPrices, setCurrentPrices] = useState<Record<string, PriceData>>({});
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [cashModalType, setCashModalType] = useState<CashEntryType | null>(null);
  const [snapshots, setSnapshots] = useState<PortfolioSnapshot[]>([]);
  const [mobileSection, setMobileSection] = useState<MobileSection>("holdings");
  const [quickAction, setQuickAction] = useState<{
    ticker: string;
    price: number;
    type: "BUY" | "SELL";
    maxLot?: number;
  } | null>(null);
  const [ihsgData, setIhsgData] = useState<Array<{ date: string; close: number }>>([]);
  const [ihsgLoading, setIhsgLoading] = useState(false);
  const [ihsgError, setIhsgError] = useState<string | null>(null);

  const uniqueTickers = useMemo(
    () => Array.from(new Set(transactions.map((t) => normalizeTicker(t.ticker)))),
    [transactions],
  );

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

      const priceMapForSnap: Record<string, number> = {};
      for (const [t, d] of entries) {
        if (d?.price !== null && d?.price !== undefined && Number.isFinite(d.price)) {
          priceMapForSnap[t] = d.price;
        }
      }
      recordTodaySnapshot(transactions, [], priceMapForSnap);
      updatePeakPrices(priceMapForSnap);
      setSnapshots(getSnapshots());
    });
  }, [uniqueTickers, mounted, transactions]);

  useEffect(() => {
    if (!mounted) return;
    setSnapshots(getSnapshots());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions.length, cashEntries.length]);

  useEffect(() => {
    if (!mounted) return;
    const handler = () => setSnapshots(getSnapshots());
    window.addEventListener("portfolio-updated", handler);
    return () => window.removeEventListener("portfolio-updated", handler);
  }, [mounted]);

  // Fetch IHSG historical data for benchmark comparison
  useEffect(() => {
    if (!mounted || snapshots.length < 2) return;
    let cancelled = false;
    setIhsgLoading(true);
    fetch("/api/ihsg?period=3mo")
      .then((res) => {
        if (!res.ok) throw new Error("Gagal memuat data IHSG");
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        if (data.data && Array.isArray(data.data)) {
          setIhsgData(data.data);
          setIhsgError(null);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setIhsgError("Gagal memuat data IHSG");
        console.error(err);
      })
      .finally(() => {
        if (!cancelled) setIhsgLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mounted, snapshots.length]);

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

  const activeHoldings = useMemo(
    () => holdings.filter((h) => h.totalShares > 0),
    [holdings],
  );

  const cashSummary = useMemo(
    () => calculateCashSummary(cashEntries),
    [cashEntries],
  );

  const totalPortfolioValue = useMemo(() => {
    const stockValue = holdings.reduce(
      (sum, h) => sum + (h.currentValue ?? 0),
      0,
    );
    return cashSummary.cashBalance + stockValue;
  }, [cashSummary, holdings]);

  const totalTopup = cashSummary.totalTopup;
  const totalWithdraw = cashSummary.totalWithdraw;
  const netInvested = totalTopup - totalWithdraw;
  const totalReturnPercent =
    netInvested > 0
      ? ((totalPortfolioValue - netInvested) / netInvested) * 100
      : 0;

  // Sector map for each ticker
  const sectorMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const t in currentPrices) {
      if (currentPrices[t].sector) {
        map[t] = currentPrices[t].sector!;
      }
    }
    return map;
  }, [currentPrices]);

  // Portfolio stats (Sharpe, max drawdown, etc.)
  const portfolioStats = useMemo((): PortfolioStats | null => {
    if (snapshots.length < 2 || transactions.length === 0) return null;
    // Build IHSG closes aligned with snapshot dates
    const ihsgCloses: number[] = [];
    if (ihsgData.length > 0) {
      for (const snap of snapshots) {
        const match = ihsgData.find((d) => d.date === snap.date);
        ihsgCloses.push(match?.close ?? 0);
      }
    }
    return calculatePortfolioStats(
      snapshots,
      transactions,
      holdings,
      netInvested,
      ihsgCloses.length === snapshots.length ? ihsgCloses : undefined,
    );
  }, [snapshots, transactions, holdings, netInvested, ihsgData]);

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

      const recentCloses = priceData?.recentCloses;
      if (recentCloses && recentCloses.length >= 20) {
        const ma20 = recentCloses.slice(-20).reduce((a, b) => a + b, 0) / 20;
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

    return signals.sort((a, b) => {
      if (a.severity !== b.severity) {
        return a.severity === "danger" ? -1 : 1;
      }
      return a.plPercent - b.plPercent;
    });
  }, [holdings, currentPrices]);

  const handleDeleteTransaction = (id: string) => {
    removeTransaction(id);
    toast.success("Transaksi dihapus", {
      action: {
        label: "Undo",
        onClick: () => {
          // Re-add would need the original tx data stored
          toast.info("Gunakan tombol Beli/Jual untuk menambah ulang");
        },
      },
    });
  };

  const openBuyModal = useCallback(() => setShowAddModal(true), []);
  const openTopupModal = useCallback(() => setCashModalType("TOPUP"), []);
  const openWithdrawModal = useCallback(() => setCashModalType("WITHDRAW"), []);

  const hasPortfolioData = transactions.length > 0 || cashEntries.length > 0;
  const portfolioDeltaPositive = totalPortfolioValue - netInvested >= 0;

  if (!mounted) {
    return (
      <div className="page-main container space-y-4" aria-busy="true">
        <div className="space-y-2 animate-pulse">
          <div className="h-8 w-40 bg-muted rounded-[0.75rem]" />
          <div className="h-4 w-56 bg-muted rounded-[0.75rem]" />
        </div>
        <Card className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 space-y-3 animate-pulse">
          <div className="h-3 w-20 bg-muted rounded" />
          <div className="h-10 w-44 bg-muted rounded" />
          <div className="h-3 w-32 bg-muted rounded" />
        </Card>
      </div>
    );
  }

  return (
    <div className="app-shell min-h-screen bg-background">
      <MobileAppBar
        title="Portfolio"
        subtitle={
          hasPortfolioData
            ? `${activeHoldings.length} holdings • Kas ${formatIDR(cashSummary.cashBalance)}`
            : "Mulai dengan Top Up, lalu beli saham pertama"
        }
        backHref="/"
        trailingValue={hasPortfolioData ? formatIDR(totalPortfolioValue) : undefined}
        trailingChange={
          hasPortfolioData && netInvested > 0 ? formatPercent(totalReturnPercent) : undefined
        }
      />

      <main
        className="page-main container space-y-4"
        data-sticky-actions={hasPortfolioData ? "true" : undefined}
      >
        {/* DESKTOP: keep legacy header */}
        <section className="page-hero-card p-5 sm:p-6 hidden md:block">
          <div className="page-eyebrow">Portfolio workspace</div>
          <div className="mt-2 flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="flex items-center gap-2 text-2xl font-black sm:text-3xl">
                <Briefcase className="h-6 w-6 shrink-0 text-primary sm:h-7 sm:w-7" aria-hidden />
                Portfolio
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Virtual trading untuk simulasi investasi
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Semua data portfolio, kas, dan histori transaksi tersimpan lokal di browser Anda.
              </p>
            </div>
            <div className="hidden shrink-0 gap-1.5 sm:flex">
              <Button
                onClick={openTopupModal}
                size="lg"
                variant="outline"
                className="min-h-10 rounded-full border-bull-500/40 px-3 text-bull-700 shadow-sm hover:bg-bull-50 dark:text-bull-500 dark:hover:bg-bull-700/20 sm:px-4"
                aria-label="Top up modal kas"
              >
                <ArrowDownToLine className="h-4 w-4 sm:mr-1" aria-hidden />
                <span className="hidden sm:inline">Top Up</span>
              </Button>
              <Button
                onClick={openWithdrawModal}
                size="lg"
                variant="outline"
                className="min-h-10 rounded-full border-bear-500/40 px-3 text-bear-700 shadow-sm hover:bg-bear-50 dark:text-bear-500 dark:hover:bg-bear-700/20 sm:px-4"
                aria-label="Tarik modal kas"
              >
                <ArrowUpFromLine className="h-4 w-4 sm:mr-1" aria-hidden />
                <span className="hidden sm:inline">Withdraw</span>
              </Button>
              <Button
                onClick={openBuyModal}
                size="lg"
                className="min-h-10 rounded-full px-3 shadow-lg sm:px-4"
                aria-label="Catat transaksi beli atau jual"
              >
                <Plus className="h-5 w-5 sm:mr-1" aria-hidden />
                <span className="hidden sm:inline">Beli/Jual</span>
              </Button>
            </div>
          </div>
        </section>

        {/* MOBILE: Big hero summary */}
        {hasPortfolioData && (
          <section className="md:hidden">
            <div className="mobile-hero">
              <div className="page-eyebrow text-white/80">Total portfolio</div>
              <div className="mobile-hero__row">
                <div>
                  <div className="mobile-hero__value">{formatIDR(totalPortfolioValue)}</div>
                  <div
                    className={cn(
                      "mobile-hero__delta",
                      !portfolioDeltaPositive && "bg-bear-500/30",
                    )}
                  >
                    {portfolioDeltaPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    <span>{formatIDR(totalPortfolioValue - netInvested)}</span>
                    <span className="opacity-80">·</span>
                    <span>{netInvested > 0 ? formatPercent(totalReturnPercent) : "—"}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="mobile-hero__label">Modal</div>
                  <div className="mt-1 text-sm font-bold text-white">{formatIDR(netInvested)}</div>
                </div>
              </div>
              <div className="mobile-hero__sub">
                Kas {formatIDR(cashSummary.cashBalance)} • Saham {formatIDR(summary.totalValue ?? 0)} • {activeHoldings.length} holdings
              </div>
            </div>

            <MobileStatRow
              items={[
                { label: "Modal Saham", value: formatIDR(summary.totalCost ?? 0) },
                { label: "Nilai Saham", value: formatIDR(summary.totalValue ?? 0), tone: "primary" },
                {
                  label: "Unreal P&L",
                  value: `${summary.totalUnrealizedPL >= 0 ? "+" : ""}${formatIDR(summary.totalUnrealizedPL ?? 0)}`,
                  tone: summary.totalUnrealizedPL >= 0 ? "bull" : "bear",
                },
              ]}
            />

            <MobileSectionTabs<MobileSection>
              value={mobileSection}
              onChange={setMobileSection}
              options={[
                { value: "holdings", label: "Holdings", count: activeHoldings.length },
                { value: "activity", label: "Aktivitas", count: transactions.length + cashEntries.length },
                { value: "insights", label: "Insight", count: sellSignals.length + (snapshots.length > 0 ? 1 : 0) },
              ]}
            />
          </section>
        )}

        {/* Empty state */}
        {transactions.length === 0 && cashEntries.length === 0 && (
          <>
            <div className="md:hidden">
              <Card className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-6 text-center">
                <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Briefcase className="h-6 w-6" />
                </div>
                <h2 className="mt-3 text-lg font-bold">Mulai portfolio</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Top Up modal dulu, lalu beli saham pertama kamu
                </p>
                <div className="mt-4 grid grid-cols-1 gap-2">
                  <Button onClick={openTopupModal} className="min-h-11 w-full">
                    <ArrowDownToLine className="mr-2 h-4 w-4" />
                    Top Up modal
                  </Button>
                  <Button
                    onClick={openBuyModal}
                    variant="outline"
                    className="min-h-11 w-full"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Beli saham
                  </Button>
                </div>
              </Card>
            </div>
            <div className="hidden md:block">
              <EmptyState
                icon={<Briefcase className="h-6 w-6 text-primary" aria-hidden />}
                title="Portfolio kosong"
                description="Mulai dengan Top Up modal, lalu beli saham pertama Anda untuk track performa investasi."
                actions={[
                  {
                    label: "Top Up modal",
                    icon: <ArrowDownToLine className="h-3 w-3" aria-hidden />,
                    onClick: openTopupModal,
                  },
                  {
                    label: "Beli saham",
                    variant: "secondary",
                    icon: <Plus className="h-3 w-3" aria-hidden />,
                    onClick: openBuyModal,
                  },
                ]}
              />
            </div>
          </>
        )}

        {/* MOBILE: Holdings section */}
        {hasPortfolioData && mobileSection === "holdings" && (
          <div className="md:hidden space-y-2">
            {activeHoldings.length === 0 ? (
              <EmptyState
                icon={<Activity className="h-5 w-5" aria-hidden />}
                title="Belum ada holdings"
                description="Catat transaksi belimu untuk mulai tracking performa."
                actions={[
                  { label: "Beli saham", onClick: openBuyModal },
                ]}
              />
            ) : (
              <div className="rounded-2xl border bg-card overflow-hidden">
                {activeHoldings.map((h) => {
                  const currentPrice = currentPrices[h.ticker]?.price ?? null;
                  const isUp = (h.unrealizedPL ?? 0) >= 0;
                  const totalLot = Math.floor(h.totalShares / 100);
                  return (
                    <MobileListItem
                      key={h.ticker}
                      href={`/stock/${h.ticker}`}
                      ticker={`${h.ticker} · ${totalLot} lot`}
                      name={h.averagePrice > 0 ? `Avg ${formatIDR(h.averagePrice)}` : undefined}
                      sector={currentPrice ? `Now ${formatIDR(currentPrice)}` : undefined}
                      change={
                        h.unrealizedPL !== null
                          ? {
                              text: `${(h.unrealizedPL >= 0 ? "+" : "")}${formatPercent(h.unrealizedPLPercent ?? 0)}`,
                              positive: isUp,
                            }
                          : undefined
                      }
                      accessory={
                        <div className="flex flex-col items-end gap-1">
                          {currentPrice && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setQuickAction({ ticker: h.ticker, price: currentPrice, type: "BUY" });
                              }}
                              className="rounded-full bg-bull-500/10 px-2 py-0.5 text-[10px] font-bold text-bull-700 hover:bg-bull-500 hover:text-white"
                            >
                              + Beli
                            </button>
                          )}
                          {currentPrice && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setQuickAction({ ticker: h.ticker, price: currentPrice, type: "SELL", maxLot: totalLot });
                              }}
                              className="rounded-full bg-bear-500/10 px-2 py-0.5 text-[10px] font-bold text-bear-700 hover:bg-bear-500 hover:text-white"
                            >
                              − Jual
                            </button>
                          )}
                        </div>
                      }
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* MOBILE: Activity section */}
        {hasPortfolioData && mobileSection === "activity" && (
          <div className="md:hidden space-y-3">
            {cashEntries.length > 0 && (
              <section>
                <div className="page-section-title">Cash Ledger ({cashEntries.length})</div>
                <div className="mt-2 space-y-1.5">
                  {cashEntries.slice(0, 20).map((entry) => {
                    const isTopup = entry.type === "TOPUP";
                    return (
                      <Card key={entry.id} className="p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={cn(
                              "h-9 w-9 rounded-full flex items-center justify-center shrink-0",
                              isTopup ? "bg-bull-100 dark:bg-bull-700/30" : "bg-bear-100 dark:bg-bear-700/30",
                            )}>
                              {isTopup ? <ArrowDownToLine className="h-4 w-4 text-bull-600" /> : <ArrowUpFromLine className="h-4 w-4 text-bear-600" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <Badge variant={isTopup ? "bull" : "bear"} className="text-[10px]">{entry.type}</Badge>
                                <span className={cn("text-sm font-bold tabular-nums", isTopup ? "text-bull-600" : "text-bear-600")}>
                                  {isTopup ? "+" : "−"}{formatIDR(entry.amount)}
                                </span>
                              </div>
                              <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                                {entry.date}{entry.notes ? ` · ${entry.notes}` : ""}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              removeCashEntry(entry.id);
                              toast.success("Entry dihapus");
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-bear-100 hover:text-bear-600"
                            aria-label="Hapus entry"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </section>
            )}

            {transactions.length > 0 && (
              <section>
                <div className="page-section-title">Riwayat Transaksi ({transactions.length})</div>
                <div className="mt-2 space-y-1.5">
                  {transactions.slice(0, 30).map((tx) => {
                    const isBuy = tx.type === "BUY";
                    return (
                      <Card key={tx.id} className="p-3">
                        <div className="flex items-center justify-between gap-2">
                          <Link href={`/stock/${tx.ticker}`} className="flex items-center gap-2 min-w-0 flex-1">
                            <div className={cn(
                              "h-9 w-9 rounded-full flex items-center justify-center shrink-0",
                              isBuy ? "bg-bull-100 dark:bg-bull-700/30" : "bg-bear-100 dark:bg-bear-700/30",
                            )}>
                              {isBuy ? <ArrowDownRight className="h-4 w-4 text-bull-600" /> : <ArrowUpRight className="h-4 w-4 text-bear-600" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm">{tx.ticker}</span>
                                <Badge variant={isBuy ? "bull" : "bear"} className="text-[10px]">{tx.type}</Badge>
                              </div>
                              <div className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
                                {Math.floor(tx.quantity / 100)} lot × {formatIDR(tx.price)} · {tx.date}
                              </div>
                            </div>
                          </Link>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              handleDeleteTransaction(tx.id);
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-bear-100 hover:text-bear-600"
                            aria-label="Hapus transaksi"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        )}

        {/* MOBILE: Insights section */}
        {hasPortfolioData && mobileSection === "insights" && (
          <div className="md:hidden space-y-3">
            {sellSignals.length > 0 && (
              <Card className="p-4">
                <div className="page-section-title flex items-center gap-2">
                  <Bell className="h-4 w-4 text-amber-500" /> Sinyal Jual ({sellSignals.length})
                </div>
                <div className="mt-2 space-y-2">
                  {sellSignals.slice(0, 5).map((s) => (
                    <Link key={s.ticker} href={`/stock/${s.ticker}`}>
                      <div className={cn(
                        "rounded-2xl border-2 p-3",
                        s.severity === "danger" ? "border-bear-500/40" : "border-amber-500/40",
                      )}>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm">{s.ticker}</span>
                          <span className="text-[10px] text-muted-foreground truncate flex-1">{s.reason}</span>
                          <span className={cn("text-xs font-bold tabular-nums", s.plPercent >= 0 ? "text-bull-600" : "text-bear-600")}>
                            {s.plPercent >= 0 ? "+" : ""}{s.plPercent.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </Card>
            )}

            {snapshots.length > 0 && (
              <Card className="p-4">
                <div className="page-section-title flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" /> Performa
                </div>
                <PortfolioChart snapshots={snapshots} />
              </Card>
            )}

            {activeHoldings.length > 0 && (
              <Card className="p-4">
                <div className="page-section-title flex items-center gap-2">
                  <Award className="h-4 w-4 text-amber-500" /> Alokasi sektor
                </div>
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
              </Card>
            )}

            {netInvested > 0 && (
              <IHSGBenchmark
                portfolioValue={totalPortfolioValue}
                initialDeposit={netInvested}
              />
            )}

            {portfolioStats && (
              <Card className="p-4">
                <PortfolioStatsCard stats={portfolioStats} className="border-0 p-0" />
              </Card>
            )}

            {snapshots.length >= 2 && (
              <Card className="p-4">
                <BenchmarkChart
                  snapshots={snapshots}
                  ihsgData={ihsgData}
                  loading={ihsgLoading}
                  error={ihsgError}
                  className="border-0 p-0"
                />
              </Card>
            )}
          </div>
        )}

        {/* DESKTOP: legacy layout */}
        {hasPortfolioData && (
          <div className="hidden md:block space-y-5">
            <Card
              className={cn(
                "bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 sm:p-6 border-2",
                portfolioDeltaPositive
                  ? "border-bull-500/30 bg-gradient-to-br from-bull-50 to-bull-100/30 dark:from-bull-700/10 dark:to-bull-700/5"
                  : "border-bear-500/30 bg-gradient-to-br from-bear-50 to-bear-100/30 dark:from-bear-700/10 dark:to-bear-700/5",
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs sm:text-sm text-muted-foreground uppercase tracking-wider font-medium">
                  Total Portfolio
                </div>
                {portfolioDeltaPositive ? <ArrowUpRight className="h-5 w-5 text-bull-600" /> : <ArrowDownRight className="h-5 w-5 text-bear-600" />}
              </div>
              <div
                className={cn(
                  "text-3xl sm:text-5xl font-black tabular-nums leading-none",
                  portfolioDeltaPositive ? "text-bull-700 dark:text-bull-500" : "text-bear-700 dark:text-bear-500",
                )}
              >
                {formatIDR(totalPortfolioValue)}
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span
                  className={cn(
                    "text-sm font-bold tabular-nums",
                    portfolioDeltaPositive ? "text-bull-600" : "text-bear-600",
                  )}
                >
                  {formatIDR(totalPortfolioValue - netInvested)}
                </span>
                <span className="text-xs text-muted-foreground">
                  vs modal <strong className="text-foreground">{formatIDR(netInvested)}</strong>
                </span>
                {netInvested > 0 && (
                  <span
                    className={cn(
                      "text-xs font-bold tabular-nums px-1.5 py-0.5 rounded-full",
                      totalReturnPercent >= 0 ? "bg-bull-100 text-bull-700 dark:bg-bull-700/30 dark:text-bull-500" : "bg-bear-100 text-bear-700 dark:bg-bear-700/30 dark:text-bear-500",
                    )}
                  >
                    {formatPercent(totalReturnPercent)}
                  </span>
                )}
              </div>
            </Card>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              <StatCard label="Kas" value={formatIDR(cashSummary.cashBalance)} highlight={cashSummary.cashBalance > 0 ? "bull" : undefined} />
              <StatCard label="Modal di Saham" value={formatIDR(summary.totalCost)} />
              <StatCard label="Nilai Saham" value={formatIDR(summary.totalValue)} />
              <StatCard label="Realized P&L" value={`${summary.totalRealizedPL >= 0 ? "+" : ""}${formatIDR(summary.totalRealizedPL)}`} positive={summary.totalRealizedPL >= 0} />
              <StatCard label="Unrealized P&L" value={`${summary.totalUnrealizedPL >= 0 ? "+" : ""}${formatIDR(summary.totalUnrealizedPL)}`} positive={summary.totalUnrealizedPL >= 0} />
              <StatCard label="Total Top Up" value={formatIDR(cashSummary.totalTopup)} />
            </div>

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

            {netInvested > 0 && <IHSGBenchmark portfolioValue={totalPortfolioValue} initialDeposit={netInvested} />}

            {/* Portfolio Stats & Risk Metrics */}
            {portfolioStats && (
              <PortfolioStatsCard stats={portfolioStats} />
            )}

            {/* Dual-line benchmark chart */}
            {snapshots.length >= 2 && (
              <BenchmarkChart
                snapshots={snapshots}
                ihsgData={ihsgData}
                loading={ihsgLoading}
                error={ihsgError}
              />
            )}

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
                <div className="space-y-2">
                  {sellSignals.slice(0, 5).map((signal) => (
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
                        onQuickBuy={(ticker, price) => setQuickAction({ ticker, price, type: "BUY" })}
                        onQuickSell={(ticker, price, maxLot) => setQuickAction({ ticker, price, type: "SELL", maxLot })}
                      />
                    ))}
                </div>
              </div>
            )}

            {holdings.filter((h) => h.totalShares === 0 && h.realizedPL !== 0).length > 0 && (
              <div>
                <h2 className="text-lg font-bold mb-2 px-1 flex items-center gap-2">
                  <Award className="h-5 w-5 text-amber-500" />
                  Closed Positions
                </h2>
                <div className="space-y-2">
                  {holdings.filter((h) => h.totalShares === 0 && h.realizedPL !== 0).map((h) => (
                    <ClosedPositionCard key={h.ticker} holding={h} />
                  ))}
                </div>
              </div>
            )}

            {(summary.bestTrade || summary.worstTrade) && (
              <div className="grid grid-cols-2 gap-2">
                {summary.bestTrade && (
                  <Card className="p-3 border-bull-500/30 bg-bull-50/30 dark:bg-bull-700/10">
                    <div className="text-xs text-bull-700 dark:text-bull-500 font-medium">🏆 Best Trade</div>
                    <div className="font-bold text-sm mt-0.5">{summary.bestTrade.ticker}</div>
                    <div className="text-bull-600 font-bold tabular-nums text-sm">+{formatIDR(summary.bestTrade.pl)}</div>
                    <div className="text-xs text-bull-600 tabular-nums">{formatPercent(summary.bestTrade.plPercent)}</div>
                  </Card>
                )}
                {summary.worstTrade && (
                  <Card className="p-3 border-bear-500/30 bg-bear-50/30 dark:bg-bear-700/10">
                    <div className="text-xs text-bear-700 dark:text-bear-500 font-medium">💀 Worst Trade</div>
                    <div className="font-bold text-sm mt-0.5">{summary.worstTrade.ticker}</div>
                    <div className="text-bear-600 font-bold tabular-nums text-sm">{formatIDR(summary.worstTrade.pl)}</div>
                    <div className="text-xs text-bear-600 tabular-nums">{formatPercent(summary.worstTrade.plPercent)}</div>
                  </Card>
                )}
              </div>
            )}

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
                      clearAllCashEntries();
                      toast.success("Cash ledger dihapus");
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
                        removeCashEntry(entry.id);
                        toast.success("Entry dihapus");
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

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
                      clearAllTransactions();
                      toast.success("Semua transaksi dihapus");
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

            <div className="text-center text-xs text-muted-foreground py-4">
              <p>Data tersimpan di browser Anda (localStorage)</p>
              <p className="mt-1">Refresh harga otomatis saat halaman dibuka</p>
            </div>
          </div>
        )}
      </main>

      {hasPortfolioData && (
        <MobileActionBar
          primary={{
            label: "Trade",
            ariaLabel: "Catat transaksi beli atau jual",
            icon: <Plus className="h-4 w-4" />,
            onClick: openBuyModal,
          }}
          secondary={{
            label: "Top Up",
            ariaLabel: "Top up modal kas",
            icon: <ArrowDownToLine className="h-4 w-4" />,
            onClick: openTopupModal,
          }}
        />
      )}

      {cashModalType && (
        <CashModal
          defaultType={cashModalType}
          currentCash={cashSummary.cashBalance}
          onClose={() => setCashModalType(null)}
        />
      )}

      {showAddModal && (
        <AddTransactionModal onClose={() => setShowAddModal(false)} />
      )}

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
    <Card className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-3">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{label}</div>
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
              <div className="text-sm font-bold tabular-nums">{formatIDR(currentPrice)}</div>
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
          <div className="font-semibold tabular-nums">{formatIDR(holding.totalCost)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Nilai</div>
          <div className="font-semibold tabular-nums">
            {holding.currentValue !== null ? formatIDR(holding.currentValue) : "—"}
          </div>
        </div>
      </div>

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

function ClosedPositionCard({ holding }: { holding: ReturnType<typeof calculateHoldings>[0] }) {
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

function TransactionRow({ tx, onDelete }: { tx: Transaction; onDelete: () => void }) {
  const isBuy = tx.type === "BUY";

  return (
    <div className="flex items-center gap-2 rounded-xl border bg-card p-3 hover:bg-accent/30 transition-colors">
      <div
        className={cn(
          "shrink-0 w-9 h-9 rounded-full flex items-center justify-center",
          isBuy ? "bg-bull-100 dark:bg-bull-700/30" : "bg-bear-100 dark:bg-bear-700/30",
        )}
      >
        {isBuy ? <ArrowDownRight className="h-4 w-4 text-bull-600" /> : <ArrowUpRight className="h-4 w-4 text-bear-600" />}
      </div>
      <Link href={`/stock/${tx.ticker}`} className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-sm">{tx.ticker}</span>
          <Badge variant={isBuy ? "bull" : "bear"} className="text-[10px]">{tx.type}</Badge>
        </div>
        <div className="text-xs text-muted-foreground tabular-nums mt-0.5">
          {Math.floor(tx.quantity / 100)} lot ({tx.quantity.toLocaleString("id-ID")} lembar) × {formatIDR(tx.price)} • {tx.date}
        </div>
        <div className="text-[10px] text-muted-foreground tabular-nums">
          Total: {formatIDR(tx.price * tx.quantity)}
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

function CashEntryRow({ entry, onDelete }: { entry: CashEntry; onDelete: () => void }) {
  const isTopup = entry.type === "TOPUP";

  return (
    <div className="flex items-center gap-2 rounded-xl border bg-card p-3 hover:bg-accent/30 transition-colors">
      <div
        className={cn(
          "shrink-0 w-9 h-9 rounded-full flex items-center justify-center",
          isTopup ? "bg-bull-100 dark:bg-bull-700/30" : "bg-bear-100 dark:bg-bear-700/30",
        )}
      >
        {isTopup ? <ArrowDownToLine className="h-4 w-4 text-bull-600" /> : <ArrowUpFromLine className="h-4 w-4 text-bear-600" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={isTopup ? "bull" : "bear"} className="text-[10px]">{entry.type}</Badge>
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
