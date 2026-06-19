"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Search,
  TrendingUp,
  TrendingDown,
  Filter,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Bell,
  BarChart3,
  Briefcase,
  Star,
  Activity,
} from "lucide-react";
import { TopHeader } from "@/components/top-header";
import { StockSearch } from "@/components/stock-search";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
        setTopGainers(sorted.slice(0, 3));
        setTopLosers(sorted.slice(-3).reverse());
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

      <main className="container py-4 sm:py-6 pb-24 md:pb-6 space-y-5">
        {/* Hero - Search */}
        <section className="text-center animate-fade-in">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary mb-3">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Real-time IDX data
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-2">
            <span className="bg-gradient-to-br from-bull-500 via-primary to-purple-600 bg-clip-text text-transparent">
              Saham Analyzer
            </span>
          </h1>
          <p className="text-sm text-muted-foreground mb-4 px-4">
            Cari, analisa, dan kelola portfolio saham Indonesia
          </p>

          {/* Search Bar */}
          <div className="max-w-md mx-auto px-4">
            <StockSearch />
          </div>
        </section>

        <Disclaimer />

        {/* Quick Actions */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Link href="/screener">
            <Card className="p-4 card-hover text-center">
              <Filter className="h-6 w-6 mx-auto mb-1 text-primary" />
              <div className="text-sm font-bold">Screener</div>
              <div className="text-[10px] text-muted-foreground">Filter saham</div>
            </Card>
          </Link>
          <Link href="/portfolio">
            <Card className="p-4 card-hover text-center">
              <Briefcase className="h-6 w-6 mx-auto mb-1 text-bull-500" />
              <div className="text-sm font-bold">Portfolio</div>
              <div className="text-[10px] text-muted-foreground">Track investasi</div>
            </Card>
          </Link>
          <Link href="/watchlist">
            <Card className="p-4 card-hover text-center">
              <Star className="h-6 w-6 mx-auto mb-1 text-amber-500" />
              <div className="text-sm font-bold">Watchlist</div>
              <div className="text-[10px] text-muted-foreground">Saham favorit</div>
            </Card>
          </Link>
          <Link href="/settings">
            <Card className="p-4 card-hover text-center">
              <BarChart3 className="h-6 w-6 mx-auto mb-1 text-purple-500" />
              <div className="text-sm font-bold">Self-Analysis</div>
              <div className="text-[10px] text-muted-foreground">Akurasi sistem</div>
            </Card>
          </Link>
        </section>

        {/* Today's Movers */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Pergerakan Hari Ini
            </h2>
            <Link href="/screener">
              <Button variant="ghost" size="sm" className="text-xs">
                Lihat Semua
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>

          {loading ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
              Loading market data...
            </Card>
          ) : (
            <div className="space-y-2">
              {/* Top Gainers */}
              {topGainers.length > 0 && (
                <div>
                  <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-1 mb-1">
                    🟢 Top Gainers
                  </div>
                  <div className="space-y-1.5">
                    {topGainers.map((stock) => (
                      <MiniStockRow key={stock.code} stock={stock} />
                    ))}
                  </div>
                </div>
              )}

              {/* Top Losers */}
              {topLosers.length > 0 && (
                <div className="mt-3">
                  <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-1 mb-1">
                    🔴 Top Losers
                  </div>
                  <div className="space-y-1.5">
                    {topLosers.map((stock) => (
                      <MiniStockRow key={stock.code} stock={stock} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Recommended Actions */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Mulai dengan
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link href="/screener?screen=volume-breakout">
              <Card className="p-4 card-hover border-bull-500/30 bg-bull-50/30 dark:bg-bull-700/10">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">🚀</div>
                  <div>
                    <div className="font-bold text-sm">Cari Volume Breakout</div>
                    <div className="text-xs text-muted-foreground">
                      Saham dengan volume spike + harga naik
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 ml-auto text-muted-foreground" />
                </div>
              </Card>
            </Link>
            <Link href="/screener?screen=oversold">
              <Card className="p-4 card-hover border-primary/30 bg-primary/5">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">⬇️</div>
                  <div>
                    <div className="font-bold text-sm">Cari Oversold</div>
                    <div className="text-xs text-muted-foreground">
                      Saham jatuh, potensi rebound
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 ml-auto text-muted-foreground" />
                </div>
              </Card>
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t pt-6 pb-2 text-center text-xs text-muted-foreground">
          <p>📊 Data: Yahoo Finance • Sentimen: Google News</p>
          <p className="mt-1">© 2026 Saham Analyzer IDX • Not financial advice</p>
        </footer>
      </main>
    </div>
  );
}

function MiniStockRow({ stock }: { stock: MarketStock }) {
  const isUp = stock.changePct >= 0;
  return (
    <Link href={`/stock/${stock.code}`}>
      <Card className="p-3 card-hover">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">{stock.code}</span>
              <span className="text-[10px] text-muted-foreground line-clamp-1">
                {stock.name}
              </span>
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {stock.sector}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-sm font-bold tabular-nums">
              {formatIDR(stock.price)}
            </div>
            <div
              className={cn(
                "text-[11px] font-bold tabular-nums flex items-center justify-end gap-0.5",
                isUp ? "text-bull-600" : "text-bear-600",
              )}
            >
              {isUp ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {formatPercent(stock.changePct)}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
