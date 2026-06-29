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
  const fetchOverview = useCallback(async (signal?: AbortSignal): Promise<void> => {
    try {
      const r = await fetch("/api/market/overview", { signal });
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
      if (err instanceof Error && err.name === "AbortError") return;
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Gagal memuat data",
      );
    }
  }, []);

  /** Shared top-picks fetch */
  const fetchTopPicks = useCallback(async (signal?: AbortSignal): Promise<void> => {
    setPicksLoading(true);
    try {
      const r = await fetch("/api/market/top-picks", { signal });
      if (!r.ok) throw new Error("Gagal memuat sinyal");
      const data = await r.json();
      setTopPicks(data.picks || []);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setTopPicks([]);
    } finally {
      setPicksLoading(false);
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
    const controller = new AbortController();
    setLoading(true);
    Promise.all([
      fetchOverview(controller.signal),
      fetchTopPicks(controller.signal),
    ]).finally(() => setLoading(false));
    return () => controller.abort();
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

        {/* Mobile-first: search as primary job-to-be-done */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-0.5">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                {greeting.text} 👋
              </p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-foreground md:text-3xl">
                Mau cek saham apa?
              </h1>
            </div>
            <span
              className={cn(
                "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-[11px] font-bold uppercase tracking-wider",
                marketOpen
                  ? "border-success/25 bg-success/10 text-success"
                  : "border-border bg-card text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  marketOpen ? "bg-success animate-pulse" : "bg-muted-foreground/40",
                )}
              />
              {marketOpen ? "Buka" : "Tutup"}
            </span>
          </div>

          <Link
            href="/search"
            className="group flex min-h-[72px] items-center gap-3 rounded-[1.35rem] border border-primary/18 bg-gradient-to-br from-primary/10 via-card to-card p-4 shadow-[0_10px_30px_hsl(var(--primary)/0.10)] transition-all active:scale-[0.985] md:hidden"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm transition-transform group-active:scale-95">
              <Search className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-black text-foreground">Cari saham IDX</span>
              <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                BBCA, TLKM, sektor bank, blue chip…
              </span>
            </span>
            <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-active:translate-x-0.5" />
          </Link>

          <div className="hidden rounded-[1.35rem] border bg-card p-3 md:block">
            <StockSearch />
          </div>
        </section>

        {/* Quick actions: only core mobile paths */}
        <section className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
          <HomeAction href="/screener" icon={<Filter className="h-4 w-4" />} title="Screener" desc="Scan peluang" tone="primary" />
          <HomeAction href="/watchlist" icon={<Eye className="h-4 w-4" />} title="Watchlist" desc="Pantauan" tone="blue" />
          <HomeAction href="/portfolio" icon={<Briefcase className="h-4 w-4" />} title="Portfolio" desc="Kinerja" tone="green" />
          <HomeAction href="/compare" icon={<Scale className="h-4 w-4" />} title="Bandingkan" desc="2–3 saham" tone="purple" />
        </section>

        {/* Signals: horizontal, scannable, thumb-friendly */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-black tracking-tight text-foreground">Sinyal terbaik</h2>
              <p className="text-xs text-muted-foreground">Confidence tertinggi hari ini</p>
            </div>
            <DataFreshnessPill updatedAt={marketTimestamp} className="shrink-0" />
          </div>
          <TopPicksSection picks={topPicks.slice(0, 5)} loading={picksLoading} />
        </section>

        {/* Market pulse: compact strip, no bulky hero */}
        <section className="grid grid-cols-3 gap-2 rounded-[1.35rem] border bg-card p-2.5">
          <PulseMetric label="Naik" value={advanceCount} tone="success" />
          <PulseMetric label="Turun" value={declineCount} tone="danger" />
          <PulseMetric
            label="Rata-rata"
            value={`${avgChange >= 0 ? "+" : ""}${avgChange.toFixed(2)}%`}
            tone={marketTone === "bear" ? "danger" : marketTone === "bull" ? "success" : "neutral"}
          />
        </section>

        {/* Movers: tap targets >= 44px */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black tracking-tight text-foreground">Pergerakan pasar</h2>
              <p className="text-xs text-muted-foreground">Ringkasan saham paling bergerak</p>
            </div>
            <Link href="/screener" className="inline-flex min-h-9 items-center gap-0.5 rounded-full px-2 text-xs font-bold text-primary">
              Semua <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-1 rounded-full bg-muted/70 p-1">
            {tabConfig.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setMarketTab(tab.value)}
                className={cn(
                  "min-h-11 rounded-full text-xs font-black transition-all",
                  marketTab === tab.value
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground active:bg-card/60",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {error ? (
            <ErrorBanner message={error} onRetry={retryCount < RETRY_LIMIT ? handleRetry : undefined} />
          ) : loading ? (
            <div className="overflow-hidden rounded-[1.35rem] border bg-card">
              <StockRowSkeleton count={5} />
            </div>
          ) : !hasMarketData ? (
            <div className="rounded-[1.35rem] border bg-card p-4">
              <EmptyState
                illustration={marketOpen ? "no-results" : "error"}
                icon={<Clock className="h-5 w-5" aria-hidden />}
                title={marketOpen ? "Belum ada pergerakan" : "Market sedang tutup"}
                description={marketOpen ? "Tunggu sebentar, data sedang dimuat." : "Buka lagi saat jam bursa (09:00–16:00 WIB)."}
                actions={[{ label: "Buka screener", icon: <Filter className="h-3 w-3" aria-hidden />, onClick: () => router.push("/screener") }]}
              />
            </div>
          ) : (
            <div className="overflow-hidden rounded-[1.35rem] border bg-card">
              {getActiveTabStocks().length === 0 && marketTab === "gainers" ? (
                <div className="p-4">
                  <EmptyState
                    illustration="no-results"
                    icon={<TrendingDown className="h-5 w-5" aria-hidden />}
                    title="Semua saham turun hari ini"
                    description="Tidak ada saham dengan kenaikan positif saat ini."
                    actions={[{ label: "Lihat saham terburuk", icon: <ChevronRight className="h-3 w-3" aria-hidden />, onClick: () => setMarketTab("losers") }]}
                  />
                </div>
              ) : (
                getActiveTabStocks().slice(0, 5).map((stock) => (
                  <CompactStockRow
                    key={stock.code}
                    ticker={stock.code}
                    name={stock.name}
                    sector={stock.sector}
                    price={stock.price}
                    changePct={stock.changePct}
                    highlighted={stock.changePct >= 0 ? "bull" : "bear"}
                  />
                ))
              )}
            </div>
          )}
        </section>

        <CollapsibleSection
          title="Analisis lanjutan"
          icon={<BarChart3 className="h-4 w-4 text-primary" />}
          subtitle="Fundamental, heatmap sektor, dan aliran asing"
          storageKey="home.advanced.open"
          defaultOpen={false}
        >
          <div className="space-y-2">
            <CollapsibleSection title="Saham Fundamental Bagus" icon={<TrendingUp className="h-4 w-4 text-success" />} storageKey="home.screener.open" defaultOpen={false}>
              <FundamentalScreener />
            </CollapsibleSection>
            <CollapsibleSection title="Heatmap Sektor" icon={<Activity className="h-4 w-4 text-primary" />} storageKey="home.heatmap.open" defaultOpen={false}>
              <SectorHeatmap />
            </CollapsibleSection>
            <CollapsibleSection title="Aliran Asing" icon={<ArrowDownRight className="h-4 w-4 text-ios-purple" />} subtitle="Estimasi aktivitas asing" storageKey="home.foreign.open" defaultOpen={false}>
              <ForeignFlow />
            </CollapsibleSection>
          </div>
        </CollapsibleSection>

        <footer className="pb-3 pt-1 text-center text-[11px] leading-relaxed text-muted-foreground">
          Data Yahoo Finance · Bukan saran finansial · DYOR
        </footer>
      </main>
    </div>
  );
}

function HomeAction({
  href,
  icon,
  title,
  desc,
  tone,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  tone: "primary" | "blue" | "green" | "purple";
}) {
  const toneClass = {
    primary: "bg-primary/10 text-primary border-primary/18",
    blue: "bg-sky-500/10 text-sky-600 border-sky-500/18",
    green: "bg-success/10 text-success border-success/18",
    purple: "bg-ios-purple/10 text-ios-purple border-ios-purple/18",
  }[tone];

  return (
    <Link
      href={href}
      className="group rounded-[1.15rem] border bg-card p-3.5 transition-all active:scale-[0.98]"
    >
      <div className={cn("mb-3 flex h-10 w-10 items-center justify-center rounded-2xl border", toneClass)}>
        {icon}
      </div>
      <div className="text-sm font-black tracking-tight text-foreground">{title}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{desc}</div>
    </Link>
  );
}

function PulseMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone: "success" | "danger" | "neutral";
}) {
  return (
    <div className="rounded-2xl bg-muted/45 px-2 py-3 text-center">
      <div
        className={cn(
          "text-lg font-black tabular-nums leading-none",
          tone === "success" && "text-success",
          tone === "danger" && "text-destructive",
          tone === "neutral" && "text-foreground",
        )}
      >
        {value}
      </div>
      <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
