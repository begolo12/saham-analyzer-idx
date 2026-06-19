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
import { AddTransactionModal } from "@/components/add-transaction-modal";
import { formatIDR, formatPercent, cn } from "@/lib/utils";
import { toast } from "sonner";

interface PriceData {
  code: string;
  name: string;
  price: number | null;
  change: number | null;
  changePct: number | null;
}

export default function PortfolioPage() {
  const { transactions, mounted } = usePortfolio();
  const [currentPrices, setCurrentPrices] = useState<Record<string, PriceData>>({});
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
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
    });
  }, [uniqueTickers, mounted]);

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2">
            <Briefcase className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
            Portfolio
          </h1>
          <p className="text-sm text-muted-foreground">
            Virtual trading untuk simulasi investasi
          </p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          size="lg"
          className="rounded-full h-12 px-4 shadow-lg"
        >
          <Plus className="h-5 w-5 mr-1" />
          <span className="hidden sm:inline">Tambah</span>
        </Button>
      </div>

      {/* Disclaimer */}
      <Alert variant="info">
        <strong>📌 Virtual Portfolio:</strong> Track transaksi beli/jual Anda untuk
        hitung profit/loss real-time. Data tersimpan lokal (localStorage).
      </Alert>

      {/* Empty State */}
      {transactions.length === 0 && (
        <Card className="p-8 sm:p-12 text-center">
          <div className="inline-flex p-4 rounded-full bg-primary/10 mb-4">
            <Inbox className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-xl font-bold mb-2">Portfolio Kosong</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            Mulai dengan menambahkan transaksi beli pertama Anda untuk track
            performa investasi.
          </p>
          <Button onClick={() => setShowAddModal(true)} size="lg">
            <Plus className="h-5 w-5 mr-2" />
            Tambah Transaksi Pertama
          </Button>
        </Card>
      )}

      {/* Summary Cards */}
      {transactions.length > 0 && (
        <>
          {/* Total P&L Card */}
          <Card
            className={cn(
              "p-5 sm:p-6 border-2",
              summary.totalPL >= 0
                ? "border-bull-500/30 bg-gradient-to-br from-bull-50 to-bull-100/30 dark:from-bull-700/10 dark:to-bull-700/5"
                : "border-bear-500/30 bg-gradient-to-br from-bear-50 to-bear-100/30 dark:from-bear-700/10 dark:to-bear-700/5",
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs sm:text-sm text-muted-foreground uppercase tracking-wider font-medium">
                Total P&L
              </div>
              {summary.totalPL >= 0 ? (
                <ArrowUpRight className="h-5 w-5 text-bull-600" />
              ) : (
                <ArrowDownRight className="h-5 w-5 text-bear-600" />
              )}
            </div>
            <div
              className={cn(
                "text-3xl sm:text-5xl font-black tabular-nums leading-none",
                summary.totalPL >= 0 ? "text-bull-700 dark:text-bull-500" : "text-bear-700 dark:text-bear-500",
              )}
            >
              {summary.totalPL >= 0 ? "+" : ""}
              {formatIDR(summary.totalPL)}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={cn(
                  "text-sm font-bold tabular-nums",
                  summary.totalPLPercent >= 0 ? "text-bull-600" : "text-bear-600",
                )}
              >
                {formatPercent(summary.totalPLPercent)}
              </span>
              <span className="text-xs text-muted-foreground">return</span>
            </div>
          </Card>

          {/* Stat Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            <StatCard
              label="Modal"
              value={formatIDR(summary.totalCost)}
            />
            <StatCard
              label="Nilai Saat Ini"
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
          </div>

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
}: {
  label: string;
  value: string;
  positive?: boolean;
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


