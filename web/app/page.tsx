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

export default function HomePage() {
  const router = useRouter();
  const [topGainers, setTopGainers] = useState<MarketStock[]>([]);
  const [topLosers, setTopLosers] = useState<MarketStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

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
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(err instanceof Error ? err.message : "Gagal memuat data");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRetry = () => {
    if (retryCount >= RETRY_LIMIT) return;
    setRetryCount((c) => c + 1);
    fetchOverview();
  };

  const totalMovers = topGainers.length + topLosers.length;
  const hasMarketData = totalMovers > 0;

  return (
    <div className="app-shell min-h-screen bg-background">
      <TopHeader />

      <MobileAppBar
        title="Beranda"
        subtitle="Cari saham, pantau watchlist, cek portfolio"
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

        {/* MOBILE: Hero search */}
        <div className="md:hidden space-y-3">
          <section className="rounded-2xl border bg-card p-3">
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-muted-foreground shrink-0 ml-1" />
              <div className="flex-1">
                <StockSearch />
              </div>
            </div>
          </section>

          <div className="grid grid-cols-2 gap-2.5">
            <MobileQuickAction
              href="/search"
              icon={<Search className="h-4 w-4" />}
              label="Cari Saham"
              description="900+ emiten IDX"
            />
            <MobileQuickAction
              href="/watchlist"
              icon={<Star className="h-4 w-4" />}
              label="Watchlist"
              description="Saham favorit kamu"
            />
            <MobileQuickAction
              href="/portfolio"
              icon={<Briefcase className="h-4 w-4" />}
              label="Portfolio"
              description="Lacak performa investasi"
            />
            <MobileQuickAction
              href="/compare"
              icon={<Scale className="h-4 w-4" />}
              label="Bandingkan"
              description="2-3 saham IDX"
            />
            <MobileQuickAction
              href="/screener"
              icon={<Filter className="h-4 w-4" />}
              label="Screener"
              description="Scan peluang teknikal"
            />
            <MobileQuickAction
              href="/backtest"
              icon={<FlaskConical className="h-4 w-4" />}
              label="Backtest"
              description="Uji strategi historis"
            />
          </div>
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

        <Disclaimer />

        {/* Daily Briefing */}
        <DailyBriefing />

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
              icon={<Inbox className="h-5 w-5" aria-hidden />}
              title="Belum ada pergerakan"
              description="Market mungkin sedang tutup. Coba lagi saat jam bursa (09:00–16:00 WIB)."
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
                  <span>Top Gainers</span>
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
                  <span>Top Losers</span>
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
              <QuickChip href="/compare" icon={<Scale className="h-3.5 w-3.5" />} label="Compare" />
              <QuickChip href="/backtest" icon={<FlaskConical className="h-3.5 w-3.5" />} label="Backtest" />
              <QuickChip href="/settings" icon={<BarChart3 className="h-3.5 w-3.5" />} label="Settings" />
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
            title="Sector Heatmap"
            icon={<Activity className="h-4 w-4 text-cyan-600" />}
            storageKey="home.heatmap.open"
            defaultOpen={false}
          >
            <SectorHeatmap />
          </CollapsibleSection>

          <CollapsibleSection
            title="Foreign Flow"
            icon={<ArrowDownRight className="h-4 w-4 text-fuchsia-600" />}
            subtitle="Estimasi aktivitas asing (proxy volume spike)"
            storageKey="home.foreign.open"
            defaultOpen={false}
          >
            <ForeignFlow />
          </CollapsibleSection>
        </div>

        <footer className="text-center text-[10px] text-muted-foreground py-3">
          📊 Yahoo Finance • Not financial advice
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
