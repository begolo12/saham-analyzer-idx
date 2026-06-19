"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Search,
  ChevronRight,
  Loader2,
  ArrowDownRight,
  Activity,
  Filter,
  Briefcase,
  Star,
  Scale,
  FlaskConical,
  BarChart3,
  TrendingUp,
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
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Disclaimer } from "@/components/alert";
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

export default function HomePage() {
  const [topGainers, setTopGainers] = useState<MarketStock[]>([]);
  const [topLosers, setTopLosers] = useState<MarketStock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/market/overview")
      .then((r) => r.json())
      .then((data) => {
        const stocks: MarketStock[] = data.stocks || [];
        const sorted = [...stocks].sort((a, b) => b.changePct - a.changePct);
        setTopGainers(sorted.slice(0, 5));
        setTopLosers(sorted.slice(-5).reverse());
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <TopHeader />

      <main className="container py-3 sm:py-4 pb-24 md:pb-6 space-y-3">
        <OnboardingTour />

        {/* Slim inline search */}
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground shrink-0 ml-1" />
            <div className="flex-1">
              <StockSearch />
            </div>
          </div>
        </Card>

        <Disclaimer />

        {/* Daily Briefing — most important, always shown */}
        <DailyBriefing />

        {/* Today's Movers — compact dense rows */}
        <CollapsibleSection
          title="Pergerakan Hari Ini"
          icon={<Activity className="h-4 w-4 text-primary" />}
          accessory={
            !loading && (
              <span className="text-[10px] text-muted-foreground">
                {topGainers.length + topLosers.length}
              </span>
            )
          }
          storageKey="home.movers.open"
          defaultOpen={true}
          action={
            <Link
              href="/screener"
              onClick={(e) => e.stopPropagation()}
              className="text-[10px] font-medium text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-accent"
            >
              Semua →
            </Link>
          }
          framed={false}
        >
          {loading ? (
            <div className="flex items-center justify-center py-3 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
              Loading...
            </div>
          ) : topGainers.length === 0 && topLosers.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">
              Belum ada data
            </p>
          ) : (
            <div className="divide-y divide-border/40">
              {topGainers.length > 0 && (
                <div className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                  🟢 Gainers
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
                <div className="px-2 py-1 mt-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                  🔴 Losers
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

        {/* Quick Actions — horizontal scroll chips */}
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

        {/* Fundamental Screener — secondary, collapsed by default */}
        <CollapsibleSection
          title="Saham Fundamental Bagus"
          icon={<TrendingUp className="h-4 w-4 text-bull-600" />}
          storageKey="home.screener.open"
          defaultOpen={false}
        >
          <FundamentalScreener />
        </CollapsibleSection>

        {/* Sector Heatmap — secondary, collapsed by default */}
        <CollapsibleSection
          title="Sector Heatmap"
          icon={<Activity className="h-4 w-4 text-cyan-600" />}
          storageKey="home.heatmap.open"
          defaultOpen={false}
        >
          <SectorHeatmap />
        </CollapsibleSection>

        {/* Foreign Flow — secondary, collapsed by default */}
        <CollapsibleSection
          title="Foreign Flow"
          icon={<ArrowDownRight className="h-4 w-4 text-fuchsia-600" />}
          subtitle="Estimasi aktivitas asing (proxy volume spike)"
          storageKey="home.foreign.open"
          defaultOpen={false}
        >
          <ForeignFlow />
        </CollapsibleSection>

        {/* Footer — minimal */}
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
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted hover:bg-accent transition-colors text-xs font-medium whitespace-nowrap shrink-0"
    >
      {icon}
      {label}
    </Link>
  );
}
