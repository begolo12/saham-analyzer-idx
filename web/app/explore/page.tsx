"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  Grid3X3,
  Globe,
  Scale,
  FlaskConical,
  Settings,
  ChevronRight,
  Loader2,
  Sparkles,
  Activity,
  Rocket,
  Coins,
  ArrowDownToLine,
  ArrowUpFromLine,
} from "lucide-react";
import { TopHeader } from "@/components/top-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FundamentalScreener } from "@/components/fundamental-screener";
import { SectorHeatmap } from "@/components/sector-heatmap";
import { ForeignFlow } from "@/components/foreign-flow";
import { EmptyState } from "@/components/empty-state";
import { MobileAppBar } from "@/components/mobile-app-bar";
import { cn, formatIDR, formatPercent } from "@/lib/utils";
import { SCREENER_PRESETS, type ScreenerType, type ScreenerResult } from "@/lib/screener";
import { motion } from "framer-motion";
import { StaggerContainer, StaggerItem } from "@/components/page-transition";

const CATEGORY_LABELS: Record<string, string> = {
  All: "Semua",
  Momentum: "🚀 Momentum",
  Trend: "📈 Tren",
  Volume: "💥 Volume",
  Reversal: "🔄 Reversal",
};

const CATEGORY_MAP: Record<ScreenerType, string> = {
  "volume-breakout": "Volume",
  "top-gainers": "Momentum",
  "top-losers": "Momentum",
  oversold: "Reversal",
  overbought: "Reversal",
  "macd-bullish": "Trend",
  "golden-cross": "Trend",
  "strong-uptrend": "Trend",
  "near-52w-high": "Momentum",
  "near-52w-low": "Reversal",
};

const POPULAR_SCREENS = [
  { id: "volume-breakout" as ScreenerType, label: "Volume Breakout", emoji: "🚀" },
  { id: "top-gainers" as ScreenerType, label: "Top Gainers", emoji: "📈" },
  { id: "oversold" as ScreenerType, label: "Oversold", emoji: "⬇️" },
];

export default function ExplorePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [selectedScreen, setSelectedScreen] = useState<ScreenerType>("volume-breakout");
  const [results, setResults] = useState<ScreenerResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [method, setMethod] = useState<"fast" | "deep" | null>(null);
  const [total, setTotal] = useState(0);
  const [scanned, setScanned] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);

  const selectedPreset = useMemo(
    () => SCREENER_PRESETS.find((p) => p.id === selectedScreen),
    [selectedScreen],
  );

  const filteredPresets = useMemo(() => {
    if (activeCategory === "All") return SCREENER_PRESETS;
    return SCREENER_PRESETS.filter((p) => CATEGORY_MAP[p.id] === activeCategory);
  }, [activeCategory]);

  const loadScreen = async (screen: ScreenerType, showToast = false) => {
    setSelectedScreen(screen);
    setLoading(true);
    try {
      const res = await fetch(`/api/screener?screen=${screen}&limit=10`);
      if (!res.ok) throw new Error("Screener failed");
      const data = await res.json();
      setResults(data.results || []);
      setMethod(data.method);
      setTotal(data.total || 0);
      setScanned(data.scanned || 0);
      setLastUpdated(data.timestamp || new Date().toISOString());
      setDuration(data.duration || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadScreen("volume-breakout");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const ticker = searchQuery.trim().toUpperCase().replace(".JK", "");
    if (ticker) {
      router.push(`/stock/${ticker}`);
      setSearchQuery("");
    }
  };

  const lastUpdatedText = useMemo(() => {
    if (!lastUpdated) return "";
    const date = new Date(lastUpdated);
    const now = new Date();
    const diff = (now.getTime() - date.getTime()) / 1000;
    if (diff < 60) return `${Math.floor(diff)} detik lalu`;
    if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
    return date.toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" });
  }, [lastUpdated]);

  return (
    <div className="app-shell min-h-screen bg-background">
      <TopHeader />

      <MobileAppBar
        title="Jelajahi"
        subtitle="Screener, analisis, dan alat trading"
        backHref="/"
      />

      <main className="page-main container space-y-6">
        {/* DESKTOP header */}
        <div className="hidden md:block">
          <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2">
            <Search className="h-6 w-6 sm:h-7 sm:w-7 text-primary" aria-hidden />
            Jelajahi
          </h1>
          <p className="text-sm text-muted-foreground">Temukan peluang, analisis fundamental, dan alat trading</p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Cari saham (BBCA, TLKM...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 text-base rounded-[1rem] border-2 focus:border-primary shadow-[inset_2px_2px_4px_rgba(0,0,0,0.06),inset_-2px_-2px_4px_rgba(255,255,255,0.5)] dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.15),inset_-2px_-2px_4px_rgba(255,255,255,0.03)]"
          />
        </form>

        {/* Paling Populer — Quick access to top screeners */}
        <section>
          <h2 className="text-sm font-bold flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Paling Populer
          </h2>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {POPULAR_SCREENS.map((s) => {
              const isActive = selectedScreen === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => loadScreen(s.id, true)}
                  className={cn(
                    "shrink-0 inline-flex items-center gap-2 rounded-[0.75rem] px-4 py-2.5 text-sm font-semibold transition-all shadow-[shadow-sm]",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                      : "bg-card border border-border/60 hover:border-primary/40 hover:bg-accent/50",
                  )}
                >
                  <span className="text-base">{s.emoji}</span>
                  {s.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Quick Links */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Link href="/compare">
            <Card className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-4 cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
                  <Scale className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="font-bold text-sm">Bandingkan</div>
                  <div className="text-xs text-muted-foreground">2-3 saham</div>
                </div>
              </div>
            </Card>
          </Link>
          <Link href="/backtest">
            <Card className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-4 cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900/30">
                  <FlaskConical className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <div className="font-bold text-sm">Backtest</div>
                  <div className="text-xs text-muted-foreground">Uji strategi</div>
                </div>
              </div>
            </Card>
          </Link>
          <Link href="/settings">
            <Card className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-4 cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-900/30">
                  <Settings className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <div className="font-bold text-sm">Pengaturan</div>
                  <div className="text-xs text-muted-foreground">Preferensi</div>
                </div>
              </div>
            </Card>
          </Link>
        </div>

        {/* Screener Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 dark:bg-blue-500/15">
                <Filter className="h-4.5 w-4.5 text-blue-500" />
              </div>
              <div>
                <h2 className="text-base font-bold">Stock Screener</h2>
                <p className="text-[11px] text-muted-foreground">
                  {loading ? "Scanning..." : `${total} hasil · ${lastUpdatedText}`}
                </p>
              </div>
            </div>
            <Link href="/screener">
              <Button variant="outline" size="sm">
                Lihat Semua
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>

          {/* Category filter */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4" role="tablist" aria-label="Kategori screener">
            {Object.keys(CATEGORY_LABELS).map((cat) => (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={activeCategory === cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "shrink-0 inline-flex min-h-9 items-center rounded-[0.75rem] px-4 py-2 text-sm font-medium transition-colors shadow-[shadow-sm]",
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-secondary text-secondary-foreground hover:bg-accent",
                )}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>

          {/* Presets Grid */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 mb-4">
            {filteredPresets.map((preset) => {
              const active = selectedScreen === preset.id;
              const isBull = preset.color === "bull";
              const isBear = preset.color === "bear";
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => loadScreen(preset.id, true)}
                  disabled={loading && active}
                  aria-pressed={active}
                  className={cn(
                    "w-full text-left rounded-2xl border-2 p-3 transition-all duration-300 ease-out transform relative flex flex-col justify-between min-h-[7.5rem]",
                    active
                      ? isBull
                        ? "border-bull-500 bg-gradient-to-br from-emerald-50/60 to-bull-50/40 dark:from-emerald-950/20 dark:to-bull-950/10 shadow-lg shadow-bull-500/10 scale-[1.02] -translate-y-0.5"
                        : isBear
                          ? "border-bear-500 bg-gradient-to-br from-rose-50/60 to-bear-50/40 dark:from-rose-950/20 dark:to-bear-950/10 shadow-lg shadow-bear-500/10 scale-[1.02] -translate-y-0.5"
                          : "border-primary bg-gradient-to-br from-primary/10 to-primary/5 shadow-lg shadow-primary/10 scale-[1.02] -translate-y-0.5"
                      : isBull
                        ? "border-border bg-card hover:border-bull-500/40 hover:bg-bull-50/10 dark:hover:bg-bull-950/5 hover:-translate-y-0.5"
                        : isBear
                          ? "border-border bg-card hover:border-bear-500/40 hover:bg-bear-50/10 dark:hover:bg-bear-950/5 hover:-translate-y-0.5"
                          : "border-border bg-card hover:border-primary/40 hover:bg-primary/5 hover:-translate-y-0.5"
                  )}
                >
                  <div className="flex items-start justify-between w-full">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center text-lg ring-1",
                        active
                          ? isBull
                            ? "bg-emerald-500/15 ring-emerald-500/30 dark:bg-emerald-500/20 dark:ring-emerald-500/40"
                            : isBear
                              ? "bg-red-500/15 ring-red-500/30 dark:bg-red-500/20 dark:ring-red-500/40"
                              : "bg-primary/15 ring-primary/30"
                          : isBull
                            ? "bg-emerald-500/8 ring-emerald-500/15 dark:bg-emerald-500/12"
                            : isBear
                              ? "bg-red-500/8 ring-red-500/15 dark:bg-red-500/12"
                              : "bg-secondary ring-border/50",
                      )}
                    >
                      {preset.icon}
                    </div>
                    {active && (
                      <span className="flex h-2 w-2 relative">
                        <span
                          className={cn(
                            "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                            isBull ? "bg-bull-400" : isBear ? "bg-bear-400" : "bg-primary",
                          )}
                        ></span>
                        <span
                          className={cn(
                            "relative inline-flex rounded-full h-2 w-2",
                            isBull ? "bg-bull-500" : isBear ? "bg-bear-500" : "bg-primary",
                          )}
                        ></span>
                      </span>
                    )}
                  </div>
                  <div className="mt-3">
                    <div className={cn("font-bold text-xs sm:text-sm line-clamp-1", active && "text-foreground")}>
                      {preset.name}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2 leading-tight">
                      {preset.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Results Preview */}
          <Card className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <span aria-hidden>{selectedPreset?.icon}</span>
                  <span>{selectedPreset?.name}</span>
                </h3>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {loading ? (
                    "⏳ Scanning..."
                  ) : (
                    <>
                      <span className="font-semibold text-foreground">{total}</span> hasil
                      {scanned > 0 && method === "deep" && ` dari ${scanned} saham`}
                    </>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadScreen(selectedScreen)}
                disabled={loading}
                aria-label="Refresh hasil screener"
                className="min-h-9 shrink-0"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Activity className="h-3.5 w-3.5" aria-hidden />}
                <span className="ml-1.5 hidden sm:inline">Refresh</span>
              </Button>
            </div>

            {loading ? (
              <div className="space-y-2" role="status" aria-label="Memindai saham">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-xl border bg-card/50 p-4 animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-16 bg-secondary rounded" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-24 bg-secondary rounded" />
                        <div className="h-3 w-40 bg-secondary rounded" />
                      </div>
                      <div className="h-8 w-20 bg-secondary rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : results.length === 0 ? (
              <EmptyState
                icon={<Filter className="h-5 w-5 text-muted-foreground" />}
                title="Belum ada hasil"
                description="Tidak ada saham yang match kriteria saat ini."
              />
            ) : (
              <div className="space-y-2">
                {results.map((result) => (
                  <button
                    key={result.code}
                    onClick={() => router.push(`/stock/${result.code}`)}
                    className="w-full text-left rounded-xl border bg-card p-3 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{result.code}</span>
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                            {result.sector}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground line-clamp-1">{result.name}</div>
                        <div className="text-[11px] text-primary font-medium mt-0.5">{result.matchDetails}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-bold tabular-nums">{formatIDR(result.currentPrice)}</div>
                        <div className={cn("text-xs font-bold tabular-nums flex items-center justify-end gap-0.5", result.changePct >= 0 ? "text-bull-600" : "text-bear-600")}>
                          {result.changePct >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {formatPercent(result.changePct)}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
                {total > 10 && (
                  <Link href="/screener" className="block">
                    <Button variant="outline" className="w-full">
                      Lihat Semua {total} Hasil
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </Card>
        </section>

        {/* Fundamental Screener */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 dark:bg-amber-500/15">
                <Coins className="h-4.5 w-4.5 text-amber-500" />
              </div>
              <div>
                <h2 className="text-base font-bold">Fundamental</h2>
                <p className="text-[11px] text-muted-foreground">Saham berdasarkan rasio keuangan</p>
              </div>
            </div>
          </div>
          <FundamentalScreener />
        </section>

        {/* Sector Heatmap */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 dark:bg-violet-500/15">
                <Grid3X3 className="h-4.5 w-4.5 text-violet-500" />
              </div>
              <div>
                <h2 className="text-base font-bold">Heatmap Sektor</h2>
                <p className="text-[11px] text-muted-foreground">Pergerakan harga per sektor IDX</p>
              </div>
            </div>
          </div>
          <SectorHeatmap />
        </section>

        {/* Foreign Flow */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 dark:bg-cyan-500/15">
                <Globe className="h-4.5 w-4.5 text-cyan-500" />
              </div>
              <div>
                <h2 className="text-base font-bold">Foreign Flow</h2>
                <p className="text-[11px] text-muted-foreground">Aktivitas asing bersih di IDX</p>
              </div>
            </div>
          </div>
          <ForeignFlow />
        </section>

        {/* Bottom Links */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Link href="/compare">
            <Card className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-4 cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
                    <Scale className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <div className="font-bold text-sm">Bandingkan Saham</div>
                    <div className="text-xs text-muted-foreground">Analisis head-to-head 2-3 saham</div>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </Card>
          </Link>
          <Link href="/backtest">
            <Card className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-4 cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900/30">
                    <FlaskConical className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <div className="font-bold text-sm">Backtest Strategi</div>
                    <div className="text-xs text-muted-foreground">Uji strategi di data historis</div>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </Card>
          </Link>
          <Link href="/settings">
            <Card className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-4 cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-900/30">
                    <Settings className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <div className="font-bold text-sm">Pengaturan</div>
                    <div className="text-xs text-muted-foreground">Preferensi & data</div>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </Card>
          </Link>
        </div>
      </main>
    </div>
  );
}
