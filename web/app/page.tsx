"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  ArrowDownRight,
  Activity,
  Filter,
  Briefcase,
  Star,
  Scale,
  FlaskConical,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Inbox,
  ChevronRight,
  ArrowUpRight,
  Clock,
  Sun,
  Moon,
  Sunset,
} from "lucide-react";
import { TopHeader } from "@/components/top-header";
import { StockSearch } from "@/components/stock-search";
import { DailyBriefing } from "@/components/daily-briefing";
import { SectorHeatmap } from "@/components/sector-heatmap";
import { FundamentalScreener } from "@/components/fundamental-screener";
import { ForeignFlow } from "@/components/foreign-flow";
import { OnboardingTour } from "@/components/onboarding-tour";
import { CompactStockRow } from "@/components/compact-stock-row";
import { CollapsibleSection } from "@/components/collapsible-section";
import { StockRowSkeleton } from "@/components/stock-row-skeleton";
import { EmptyState } from "@/components/empty-state";
import { ErrorBanner } from "@/components/error-banner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Disclaimer } from "@/components/alert";
import { MobileAppBar, MobileQuickAction, MobileListItem } from "@/components/mobile-app-bar";
import { TopPicksSection, type TopPick } from "@/components/top-picks-section";
import { DataFreshnessPill } from "@/components/data-freshness-pill";
import { cn, formatIDR, formatPercent } from "@/lib/utils";

interface MarketStock {
  ticker: string;
  code: string;
  name: string;
  sector: string;
  price: number;
  change: number;
  changePct: number;
}

const RETRY_LIMIT = 1;

function getGreeting() {
  const h = new Date().getHours();
  if (h < 11) return { text: "Selamat pagi", icon: Sun };
  if (h < 15) return { text: "Selamat siang", icon: Sun };
  if (h < 18) return { text: "Selamat sore", icon: Sunset };
  return { text: "Selamat malam", icon: Moon };
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
  const [marketTimestamp, setMarketTimestamp] = useState<string | undefined>(new Date().toISOString());

  const fetchOverview = () => {
    setLoading(true);
    setError(null);
    fetch("/api/market/overview")
      .then((r) => {
        if (!r.ok) throw new Error("Gagal memuat pergerakan pasar");
        return r.json();
      })
      .then((data) => {
        const stocks: MarketStock[] = data.stocks || [];
        const sorted = [...stocks].sort((a, b) => b.changePct - a.changePct);
        setTopGainers(sorted.slice(0, 5));
        setTopLosers(sorted.slice(-5).reverse());
        setMarketTimestamp(data.cached_at || new Date().toISOString());
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(err instanceof Error ? err.message : "Gagal memuat data");
        setLoading(false);
      });
  };

  const fetchTopPicks = () => {
    setPicksLoading(true);
    fetch("/api/market/top-picks")
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((data) => {
        setTopPicks(data.picks || []);
        setPicksLoading(false);
      })
      .catch(() => {
        setTopPicks([]);
        setPicksLoading(false);
      });
  };

  useEffect(() => {
    fetchOverview();
    fetchTopPicks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRetry = () => {
    if (retryCount >= RETRY_LIMIT) return;
    setRetryCount((c) => c + 1);
    fetchOverview();
  };

  const totalMovers = topGainers.length + topLosers.length;
  const hasMarketData = totalMovers > 0;

  // Market pulse from loaded data
  const advanceCount = topGainers.length;
  const declineCount = topLosers.length;
  const avgChange = hasMarketData
    ? [...topGainers, ...topLosers].reduce((sum, s) => sum + s.changePct, 0) /
      totalMovers
    : 0;
  const marketTone =
    !hasMarketData ? "neutral" : avgChange > 0.3 ? "bull" : avgChange < -0.3 ? "bear" : "neutral";
  const marketOpen = (() => {
    const now = new Date();
    const day = now.getDay();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    if (day === 0 || day === 6) return false;
    const time = hours * 60 + minutes;
    return time >= 9 * 60 && time <= 16 * 60;
  })();

  const greeting = getGreeting();
  const GreetingIcon = greeting.icon;

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

      <main className="page-main container space-y-3">
        <OnboardingTour />

        {/* MOBILE: Hero search + greeting + market pulse */}
        <div className="md:hidden space-y-3">
          {/* Greeting + market status */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <GreetingIcon className="h-3.5 w-3.5 text-amber-500" aria-hidden />
              <span className="text-sm font-semibold text-foreground/80">{greeting.text} 👋</span>
            </div>
            <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  marketOpen ? "bg-bull-500 animate-pulse" : "bg-muted-foreground/40",
                )}
              />
              {marketOpen ? "Buka" : "Tutup"}
            </div>
          </div>

          {/* Market pulse strip */}
          {hasMarketData && (
            <div
              className={cn(
                "rounded-2xl border p-3",
                marketTone === "bull" && "border-bull-500/30 bg-gradient-to-br from-bull-50/80 to-bull-50/30",
                marketTone === "bear" && "border-bear-500/30 bg-gradient-to-br from-bear-50/80 to-bear-50/30",
                marketTone === "neutral" && "border-border bg-card",
              )}
            >
              <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                <Activity className="h-3 w-3" /> Denyut pasar
              </div>
              <div className="mt-1.5 flex items-baseline gap-2">
                <div
                  className={cn(
                    "text-2xl font-black tabular-nums leading-none",
                    marketTone === "bull" && "text-bull-700",
                    marketTone === "bear" && "text-bear-700",
                    marketTone === "neutral" && "text-foreground",
                  )}
                >
                  {avgChange >= 0 ? "+" : ""}
                  {avgChange.toFixed(2)}%
                </div>
                <div className="text-[11px] text-muted-foreground font-medium">rata-rata</div>
              </div>
              <div className="mt-2 flex items-center gap-3 text-[11px]">
                <div className="flex items-center gap-1 font-semibold text-bull-700">
                  <ArrowUpRight className="h-3 w-3" /> {advanceCount} naik
                </div>
                <div className="flex items-center gap-1 font-semibold text-bear-700">
                  <TrendingDown className="h-3 w-3" /> {declineCount} turun
                </div>
                <Link
                  href="/screener"
                  className="ml-auto inline-flex items-center gap-0.5 text-[11px] font-bold text-primary hover:underline"
                >
                  Lihat semua <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          )}



          {/* Quick actions — 4 core actions (rest in Tools drawer) */}
          <div className="grid grid-cols-2 gap-2.5">
            <MobileQuickAction
              href="/screener"
              icon={<Filter className="h-4 w-4" />}
              label="Screener"
              description="Scan peluang teknikal"
              variant="primary"
            />
            <MobileQuickAction
              href="/compare"
              icon={<Scale className="h-4 w-4" />}
              label="Bandingkan"
              description="2-3 saham IDX"
            />
            <MobileQuickAction
              href="/backtest"
              icon={<FlaskConical className="h-4 w-4" />}
              label="Backtest"
              description="Uji strategi historis"
            />
            <MobileQuickAction
              href="/portfolio"
              icon={<Briefcase className="h-4 w-4" />}
              label="Portfolio"
              description="Lacak performa investasi"
            />
          </div>

          {/* Smart empty home — preset watchlists for first-time users */}
          {topPicks.length === 0 && !picksLoading && (
            <section className="space-y-2">
              <div className="px-1">
                <div className="text-xs font-bold text-muted-foreground">
                  Mau mulai dari mana?
                </div>
                <div className="text-[10px] text-muted-foreground/80 mt-0.5">
                  Tap preset di bawah untuk isi watchlist kamu dalam 1 detik.
                </div>
              </div>
              <Link href="/watchlist?preset=IDX30" className="preset-card">
                <div className="preset-card__icon">
                  <Star className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="preset-card__title">Watchlist IDX30</div>
                  <div className="preset-card__desc">30 saham blue chip utama</div>
                </div>
              </Link>
              <Link href="/watchlist?preset=LQ45" className="preset-card">
                <div className="preset-card__icon">
                  <Star className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="preset-card__title">Watchlist LQ45</div>
                  <div className="preset-card__desc">45 saham likuid pilihan</div>
                </div>
              </Link>
            </section>
          )}
        </div>

        {/* DESKTOP: Slim inline search */}
        <div className="hidden md:block">
          <Card className="p-2.5">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground shrink-0 ml-1" />
              <div className="flex-1">
                <StockSearch />
              </div>
            </div>
          </Card>
        </div>



        {/* Daily Briefing */}
        <DailyBriefing />

        <Disclaimer />

        {/* Top Picks — highest conviction signals today */}
        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold">Top Sinyal Hari Ini</h3>
              <span className="text-[10px] text-muted-foreground hidden sm:inline">
                Sinyal dengan confidence tertinggi
              </span>
            </div>
            <DataFreshnessPill updatedAt={marketTimestamp} />
          </div>
          <TopPicksSection picks={topPicks} loading={picksLoading} />
        </section>

        {/* Today's Movers */}
        <CollapsibleSection
          title="Pergerakan Hari Ini"
          icon={<Activity className="h-4 w-4 text-primary" />}
          accessory={
            !loading && !error && (
              <span className="text-[10px] text-muted-foreground">
                {totalMovers}
              </span>
            )
          }
          storageKey="home.movers.open"
          defaultOpen={true}
          action={
            <Link
              href="/screener"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex min-h-9 items-center gap-0.5 rounded-full px-2.5 text-[11px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Buka screener untuk lihat semua saham"
            >
              Semua <ChevronRight className="h-3 w-3" />
            </Link>
          }
          framed={false}
        >
          {error ? (
            <div className="px-2 py-2">
              <ErrorBanner
                message={error}
                onRetry={retryCount < RETRY_LIMIT ? handleRetry : undefined}
              />
            </div>
          ) : loading ? (
            <div className="px-1 py-1">
              <StockRowSkeleton count={6} />
            </div>
          ) : !hasMarketData ? (
            <EmptyState
              icon={<Clock className="h-5 w-5" aria-hidden />}
              title={marketOpen ? "Belum ada pergerakan" : "Market sedang tutup"}
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
          ) : (
            <div className="divide-y divide-border/40">
              {topGainers.length > 0 && (
                <div className="flex items-center gap-1 px-2 py-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                  <TrendingUp className="h-3 w-3 text-bull-600" aria-hidden />
                  <span>Top Naik</span>
                </div>
              )}
              {topGainers.map((stock) => (
                <CompactStockRow
                  key={stock.code}
                  ticker={stock.code}
                  name={stock.name}
                  sector={stock.sector}
                  price={stock.price}
                  changePct={stock.changePct}
                  highlighted="bull"
                />
              ))}
              {topLosers.length > 0 && (
                <div className="flex items-center gap-1 px-2 py-1.5 mt-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                  <TrendingDown className="h-3 w-3 text-bear-600" aria-hidden />
                  <span>Top Turun</span>
                </div>
              )}
              {topLosers.map((stock) => (
                <CompactStockRow
                  key={stock.code}
                  ticker={stock.code}
                  name={stock.name}
                  sector={stock.sector}
                  price={stock.price}
                  changePct={stock.changePct}
                  highlighted="bear"
                />
              ))}
            </div>
          )}
        </CollapsibleSection>

        {/* DESKTOP-only sections: deeper analytics */}
        <div className="hidden md:block space-y-3">
          <CollapsibleSection
            title="Aksi Cepat"
            icon={<BarChart3 className="h-4 w-4 text-primary" />}
            storageKey="home.quick.open"
            defaultOpen={true}
            framed={false}
          >
            <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
              <QuickChip href="/screener" icon={<Filter className="h-3.5 w-3.5" />} label="Screener" />
              <QuickChip href="/portfolio" icon={<Briefcase className="h-3.5 w-3.5" />} label="Portfolio" />
              <QuickChip href="/watchlist" icon={<Star className="h-3.5 w-3.5" />} label="Watchlist" />
              <QuickChip href="/compare" icon={<Scale className="h-3.5 w-3.5" />} label="Bandingkan" />
              <QuickChip href="/backtest" icon={<FlaskConical className="h-3.5 w-3.5" />} label="Backtest" />
              <QuickChip href="/settings" icon={<BarChart3 className="h-3.5 w-3.5" />} label="Pengaturan" />
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="Saham Fundamental Bagus"
            icon={<TrendingUp className="h-4 w-4 text-bull-600" />}
            storageKey="home.screener.open"
            defaultOpen={false}
          >
            <FundamentalScreener />
          </CollapsibleSection>

          <CollapsibleSection
            title="Heatmap Sektor"
            icon={<Activity className="h-4 w-4 text-cyan-600" />}
            storageKey="home.heatmap.open"
            defaultOpen={false}
          >
            <SectorHeatmap />
          </CollapsibleSection>

          <CollapsibleSection
            title="Aliran Asing"
            icon={<ArrowDownRight className="h-4 w-4 text-fuchsia-600" />}
            subtitle="Estimasi aktivitas asing (proxy volume spike)"
            storageKey="home.foreign.open"
            defaultOpen={false}
          >
            <ForeignFlow />
          </CollapsibleSection>
        </div>

        <footer className="text-center text-[10px] text-muted-foreground py-3">
          📊 Yahoo Finance • Bukan saran finansial
        </footer>
      </main>
    </div>
  );
}

function QuickChip({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      aria-label={`Buka ${label}`}
      className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-muted px-3 text-xs font-medium whitespace-nowrap shrink-0 transition-colors hover:bg-accent active:bg-accent/70"
    >
      {icon}
      {label}
    </Link>
  );
}
