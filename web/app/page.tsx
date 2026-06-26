"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  ArrowDownRight,
  Activity,
  Filter,
  Briefcase,
  Scale,
  FlaskConical,
  BarChart3,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  ArrowUpRight,
  Clock,
  Sun,
  Moon,
  Sunset,
  Eye,
} from "lucide-react";
import { TopHeader } from "@/components/top-header";
import { StockSearch } from "@/components/stock-search";
import { SectorHeatmap } from "@/components/sector-heatmap";
import { FundamentalScreener } from "@/components/fundamental-screener";
import { ForeignFlow } from "@/components/foreign-flow";
import { OnboardingTour } from "@/components/onboarding-tour";
import { CompactStockRow } from "@/components/compact-stock-row";
import { CollapsibleSection } from "@/components/collapsible-section";
import { StockRowSkeleton } from "@/components/stock-row-skeleton";
import { EmptyState } from "@/components/empty-state";
import { ErrorBanner } from "@/components/error-banner";
import { Disclaimer } from "@/components/alert";
import { MobileAppBar } from "@/components/mobile-app-bar";
import { TopPicksSection, type TopPick } from "@/components/top-picks-section";
import { DataFreshnessPill } from "@/components/data-freshness-pill";
import { cn } from "@/lib/utils";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { motion } from "framer-motion";
import { StaggerContainer, StaggerItem } from "@/components/page-transition";

interface MarketStock {
  ticker: string;
  code: string;
  name: string;
  sector: string;
  price: number;
  change: number;
  changePct: number;
}

type MarketTab = "gainers" | "losers" | "active";

const RETRY_LIMIT = 1;

// Always false during SSR to prevent hydration mismatch
const prefersReducedMotion = false;

function getGreeting() {
  // Return a stable default for SSR; client useEffect will update it
  return { text: "Halo", icon: Sun };
}

function getClientGreeting() {
  const h = new Date().getHours();
  if (h < 11) return { text: "Selamat pagi", icon: Sun };
  if (h < 15) return { text: "Selamat siang", icon: Sun };
  if (h < 18) return { text: "Selamat sore", icon: Sunset };
  return { text: "Selamat malam", icon: Moon };
}

/**
 * Pick `count` stocks with sector diversity: at most `maxPerSector` from any
 * single sector. Falls back gracefully when the pool is small.
 */
function pickDiverse(
  sorted: MarketStock[],
  count: number,
  maxPerSector = 2,
): MarketStock[] {
  const result: MarketStock[] = [];
  const sectorCounts = new Map<string, number>();

  for (const stock of sorted) {
    if (result.length >= count) break;
    const used = sectorCounts.get(stock.sector) ?? 0;
    if (used < maxPerSector) {
      result.push(stock);
      sectorCounts.set(stock.sector, used + 1);
    }
  }

  // If we still need more (very few sectors), fill from remaining
  if (result.length < count) {
    const resultCodes = new Set(result.map((s) => s.code));
    for (const stock of sorted) {
      if (result.length >= count) break;
      if (!resultCodes.has(stock.code)) {
        result.push(stock);
      }
    }
  }

  return result;
}

/** Shared: fetch overview data and populate state */
function parseOverviewData(
  data: { stocks?: MarketStock[]; cached_at?: string },
  setTopGainers: (s: MarketStock[]) => void,
  setTopLosers: (s: MarketStock[]) => void,
  setMarketTimestamp: (s: string) => void,
) {
  const stocks: MarketStock[] = data.stocks || [];
  const unique = Array.from(new Map(stocks.map((s) => [s.code, s])).values());

  // Strict: gainers = ONLY positive change
  const positive = unique
    .filter((s) => s.changePct > 0)
    .sort((a, b) => b.changePct - a.changePct);

  // Strict: losers = ONLY negative change
  const negative = unique
    .filter((s) => s.changePct < 0)
    .sort((a, b) => a.changePct - b.changePct);

  // Sector-diverse top 5 (max 2 per sector)
  setTopGainers(pickDiverse(positive, 5, 2));
  setTopLosers(pickDiverse(negative, 5, 2));
  setMarketTimestamp(data.cached_at || new Date().toISOString());
}

export default function HomePage() {
  const router = useRouter();
  const [topGainers, setTopGainers] = useState<MarketStock[]>([]);
  const [topLosers, setTopLosers] = useState<MarketStock[]>([]);
  const [topPicks, setTopPicks] = useState<TopPick[]>([]);
  const [picksLoading, setPicksLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [marketTimestamp, setMarketTimestamp] = useState<
    string | undefined
  >(new Date().toISOString());
  const [marketTab, setMarketTab] = useState<MarketTab>("gainers");

  /** Shared overview fetch — used by both initial load and pull-to-refresh */
  const fetchOverview = useCallback(async (): Promise<void> => {
    try {
      const r = await fetch("/api/market/overview");
      if (!r.ok) throw new Error("Gagal memuat pergerakan pasar");
      const data = await r.json();
      parseOverviewData(
        data,
        setTopGainers,
        setTopLosers,
        setMarketTimestamp,
      );
      setError(null);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Gagal memuat data",
      );
    }
  }, []);

  /** Shared top-picks fetch */
  const fetchTopPicks = useCallback(async (): Promise<void> => {
    try {
      const r = await fetch("/api/market/top-picks");
      if (!r.ok) throw new Error("Gagal memuat sinyal");
      const data = await r.json();
      setTopPicks(data.picks || []);
    } catch {
      setTopPicks([]);
    }
  }, []);

  /** Combined refresh — reuses the same fetch functions */
  const handleRefresh = useCallback(async () => {
    await Promise.all([fetchOverview(), fetchTopPicks()]);
  }, [fetchOverview, fetchTopPicks]);

  const {
    pullDistance,
    isThresholdReached,
    isRefreshing,
    handlers: pullHandlers,
  } = usePullToRefresh({
    onRefresh: handleRefresh,
    disabled: loading,
  });

  // Initial data load
  useEffect(() => {
    setLoading(true);
    Promise.all([fetchOverview(), fetchTopPicks()]).finally(() =>
      setLoading(false),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRetry = () => {
    if (retryCount >= RETRY_LIMIT) return;
    setRetryCount((c) => c + 1);
    setLoading(true);
    fetchOverview().finally(() => setLoading(false));
  };

  const totalMovers = topGainers.length + topLosers.length;
  const hasMarketData = totalMovers > 0;

  const allStocks = [...topGainers, ...topLosers];
  const advanceCount = allStocks.filter((s) => s.changePct > 0).length;
  const declineCount = allStocks.filter((s) => s.changePct < 0).length;
  const avgChange = hasMarketData
    ? allStocks.reduce((sum, s) => sum + s.changePct, 0) / allStocks.length
    : 0;
  const marketTone =
    !hasMarketData
      ? "neutral"
      : avgChange > 0.3
        ? "bull"
        : avgChange < -0.3
          ? "bear"
          : "neutral";
  const [marketOpen, setMarketOpen] = useState(false);

  useEffect(() => {
    const check = () => {
      const now = new Date();
      const day = now.getDay();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      if (day === 0 || day === 6) {
        setMarketOpen(false);
        return;
      }
      const time = hours * 60 + minutes;
      setMarketOpen(time >= 9 * 60 && time <= 16 * 60);
    };
    check();
  }, []);

  const [greeting, setGreeting] = useState(getGreeting);
  const GreetingIcon = greeting.icon;

  useEffect(() => {
    setGreeting(getClientGreeting());
  }, []);

  const mostActive = [...topGainers, ...topLosers]
    .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
    .filter((s, i, arr) => arr.findIndex((x) => x.code === s.code) === i)
    .slice(0, 5);

  const getActiveTabStocks = (): MarketStock[] => {
    switch (marketTab) {
      case "gainers":
        return topGainers;
      case "losers":
        return topLosers;
      case "active":
        return mostActive;
    }
  };

  const tabConfig = [
    { value: "gainers" as const, label: "Terbaik", color: "success" },
    { value: "losers" as const, label: "Terburuk", color: "destructive" },
    { value: "active" as const, label: "Aktif", color: "primary" },
  ];

  return (
    <div className="app-shell min-h-screen bg-background">
      <TopHeader />

      <MobileAppBar
        title="Beranda"
        subtitle="Pantau pasar & temukan sinyal"
        trailing={
          <Link
            href="/search"
            aria-label="Cari saham"
            className="mobile-app-bar__back !w-10 !h-10"
          >
            <Search className="h-5 w-5" />
          </Link>
        }
      />

      {/* Pull-to-refresh indicator */}
      {pullDistance > 0 && (
        <motion.div
          className="fixed top-0 left-0 right-0 z-40 flex items-center justify-center"
          style={{ height: pullDistance }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div
            className={cn(
              "flex items-center gap-1.5 text-[11px] font-medium transition-colors",
              isThresholdReached ? "text-primary" : "text-muted-foreground",
            )}
          >
            <motion.div
              animate={
                isRefreshing
                  ? { rotate: 360 }
                  : { rotate: pullDistance * 3 }
              }
              transition={
                isRefreshing
                  ? { repeat: Infinity, duration: 0.8, ease: "linear" }
                  : { duration: 0 }
              }
            >
              <Activity className="h-4 w-4" />
            </motion.div>
            {isRefreshing
              ? "Memuat..."
              : isThresholdReached
                ? "Lepas untuk muat ulang"
                : "Tarik untuk muat ulang"}
          </div>
        </motion.div>
      )}

      <main
        className="page-main container space-y-5 md:space-y-6"
        style={{
          transform:
            pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined,
        }}
        {...pullHandlers}
      >
        <OnboardingTour />

        {/* ═══════════════════════════════════════════════════════════════
            HERO — Dark navy card with subtle border
            ═══════════════════════════════════════════════════════════════ */}
        <section className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-4 md:p-6 relative overflow-hidden">
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-transparent to-transparent pointer-events-none" />

          <div className="relative">
            {/* Greeting + market status */}
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">👋</span>
                <span className="text-xl md:text-2xl font-extrabold text-foreground leading-tight">
                  {greeting.text}
                </span>
              </div>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border",
                  marketOpen
                    ? "border-success/30 bg-success/10 text-success"
                    : "border-[hsl(var(--border))] bg-muted text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    marketOpen
                      ? "bg-success animate-pulse"
                      : "bg-muted-foreground/40",
                  )}
                />
                {marketOpen ? "Buka" : "Tutup"}
              </span>
            </div>

            {/* Search bar — real link to /search on mobile, inline StockSearch on desktop */}
            <Link
              href="/search"
              className="md:hidden rounded-lg bg-background border border-[hsl(var(--border))] px-4 py-3 flex items-center gap-3 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30 transition-all duration-200"
            >
              <Search className="h-5 w-5 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground">
                Cari saham, kode, atau sektor…
              </span>
            </Link>

            {/* Desktop: inline stock search */}
            <div className="hidden md:block">
              <div className="rounded-lg bg-background border border-[hsl(var(--border))] px-4 py-2.5 flex items-center gap-3 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30 transition-all duration-200">
                <Search className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="flex-1">
                  <StockSearch />
                </div>
              </div>
            </div>

            {/* Quick action pills */}
            <div className="mt-4 flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 md:flex-wrap md:overflow-visible">
              <Link href="/screener" className="quick-pill">
                <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Filter className="h-3 w-3 text-primary" />
                </span>
                Screener
              </Link>
              <Link href="/compare" className="quick-pill">
                <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ios-purple/10">
                  <Scale className="h-3 w-3 text-ios-purple" />
                </span>
                Bandingkan
              </Link>
              <Link href="/backtest" className="quick-pill">
                <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ios-orange/10">
                  <FlaskConical className="h-3 w-3 text-ios-orange" />
                </span>
                Backtest
              </Link>
              <Link href="/portfolio" className="quick-pill">
                <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/10">
                  <Briefcase className="h-3 w-3 text-success" />
                </span>
                Portfolio
              </Link>
              <Link href="/watchlist" className="quick-pill">
                <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Eye className="h-3 w-3 text-primary" />
                </span>
                Watchlist
              </Link>
            </div>

            {/* Market pulse cards */}
            {hasMarketData && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="bg-success/[0.08] border border-success/20 rounded-lg p-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-success/10">
                    <ArrowUpRight className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <div className="text-2xl font-black text-success tabular-nums leading-none">
                      {advanceCount}
                    </div>
                    <div className="text-[11px] text-success/70 font-medium mt-0.5">
                      Naik
                    </div>
                  </div>
                </div>
                <div className="bg-destructive/[0.08] border border-destructive/20 rounded-lg p-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
                    <TrendingDown className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <div className="text-2xl font-black text-destructive tabular-nums leading-none">
                      {declineCount}
                    </div>
                    <div className="text-[11px] text-destructive/70 font-medium mt-0.5">
                      Turun
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            SINYAL HARI INI — Horizontal scroll signal cards
            ═══════════════════════════════════════════════════════════════ */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-foreground">Sinyal Hari Ini</h3>
              <span className="text-[10px] text-muted-foreground hidden md:inline">
                Sinyal dengan confidence tertinggi
              </span>
            </div>
            <DataFreshnessPill updatedAt={marketTimestamp} />
          </div>
          <TopPicksSection picks={topPicks.slice(0, 5)} loading={picksLoading} />
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            PERGERAKAN HARI INI — Tabs + Stock list
            ═══════════════════════════════════════════════════════════════ */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-foreground">Pergerakan Hari Ini</h3>
            <Link
              href="/screener"
              className="inline-flex items-center gap-0.5 text-[11px] font-bold text-primary"
            >
              Lihat semua <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          {/* Tab pills — clean segmented */}
          <div className="flex gap-1.5 flex-wrap">
            {tabConfig.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setMarketTab(tab.value)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-[11px] font-bold transition-all duration-200",
                  marketTab === tab.value
                    ? tab.value === "gainers"
                      ? "bg-success/15 text-success border border-success/30"
                      : tab.value === "losers"
                        ? "bg-destructive/15 text-destructive border border-destructive/30"
                        : "bg-primary/15 text-primary border border-primary/30"
                    : "bg-muted text-muted-foreground border border-transparent hover:bg-accent",
                )}
              >
                {tab.value === "gainers" && "🟢 "}
                {tab.value === "losers" && "🔴 "}
                {tab.value === "active" && "⚡ "}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {error ? (
            <div className="px-2 py-2">
              <ErrorBanner
                message={error}
                onRetry={
                  retryCount < RETRY_LIMIT ? handleRetry : undefined
                }
              />
            </div>
          ) : loading ? (
            <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl overflow-hidden">
              <StockRowSkeleton count={5} />
            </div>
          ) : !hasMarketData ? (
            <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-4">
              <EmptyState
                illustration={marketOpen ? "no-results" : "error"}
                icon={<Clock className="h-5 w-5" aria-hidden />}
                title={
                  marketOpen
                    ? "Belum ada pergerakan"
                    : "Market sedang tutup"
                }
                description={
                  marketOpen
                    ? "Tunggu sebentar, data sedang dimuat."
                    : "Buka lagi saat jam bursa (09:00–16:00 WIB)."
                }
                actions={[
                  {
                    label: "Buka screener",
                    icon: <Filter className="h-3 w-3" aria-hidden />,
                    onClick: () => router.push("/screener"),
                  },
                ]}
              />
            </div>
          ) : (
            <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl overflow-hidden">
              {getActiveTabStocks().length === 0 &&
              marketTab === "gainers" ? (
                <div className="p-4">
                  <EmptyState
                    illustration="no-results"
                    icon={<TrendingDown className="h-5 w-5" aria-hidden />}
                    title="Semua saham turun hari ini"
                    description="Tidak ada saham dengan kenaikan positif saat ini."
                    actions={[
                      {
                        label: "Lihat saham terburuk",
                        icon: <ChevronRight className="h-3 w-3" aria-hidden />,
                        onClick: () => setMarketTab("losers"),
                      },
                    ]}
                  />
                </div>
              ) : (
                getActiveTabStocks().map((stock) => (
                  <CompactStockRow
                    key={stock.code}
                    ticker={stock.code}
                    name={stock.name}
                    sector={stock.sector}
                    price={stock.price}
                    changePct={stock.changePct}
                    highlighted={
                      stock.changePct >= 0 ? "bull" : "bear"
                    }
                  />
                ))
              )}
            </div>
          )}
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            COLLAPSIBLE SECTIONS — below the grid
            ═══════════════════════════════════════════════════════════════ */}

        <CollapsibleSection
          title="Saham Fundamental Bagus"
          icon={<TrendingUp className="h-4 w-4 text-success" />}
          storageKey="home.screener.open"
          defaultOpen={false}
        >
          <FundamentalScreener />
        </CollapsibleSection>

        <CollapsibleSection
          title="Heatmap Sektor"
          icon={<Activity className="h-4 w-4 text-primary" />}
          storageKey="home.heatmap.open"
          defaultOpen={false}
        >
          <SectorHeatmap />
        </CollapsibleSection>

        <CollapsibleSection
          title="Aliran Asing"
          icon={<ArrowDownRight className="h-4 w-4 text-ios-purple" />}
          subtitle="Estimasi aktivitas asing (proxy volume spike)"
          storageKey="home.foreign.open"
          defaultOpen={false}
        >
          <ForeignFlow />
        </CollapsibleSection>

        <footer className="text-center text-[10px] text-muted-foreground py-3 space-y-2">
          <div className="flex justify-center">
            <Disclaimer />
          </div>
          📊 Yahoo Finance · Bukan saran finansial
        </footer>
      </main>
    </div>
  );
}
