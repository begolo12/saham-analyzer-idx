"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Filter,
  Loader2,
  TrendingUp,
  TrendingDown,
  Activity,
  ChevronRight,
  Search,
  Sparkles,
  Calendar,
  RefreshCw,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/alert";
import { TopHeader } from "@/components/top-header";
import { EmptyState } from "@/components/empty-state";
import { SCREENER_PRESETS, type ScreenerType, type ScreenerResult } from "@/lib/screener";
import { cn, formatIDR, formatPercent } from "@/lib/utils";
import { toast } from "sonner";

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

export default function ScreenerPage() {
  const router = useRouter();
  const [selectedScreen, setSelectedScreen] = useState<ScreenerType>("volume-breakout");
  const [results, setResults] = useState<ScreenerResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [method, setMethod] = useState<"fast" | "deep" | null>(null);
  const [total, setTotal] = useState(0);
  const [scanned, setScanned] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [searchTerm, setSearchTerm] = useState("");

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
    if (showToast) toast.info(`🔍 Scanning ${screen}...`);
    try {
      const res = await fetch(`/api/screener?screen=${screen}&limit=30`);
      if (!res.ok) throw new Error("Screener failed");
      const data = await res.json();
      setResults(data.results || []);
      setMethod(data.method);
      setTotal(data.total || 0);
      setScanned(data.scanned || 0);
      setLastUpdated(data.timestamp || new Date().toISOString());
      setDuration(data.duration || null);
    } catch (err) {
      toast.error("Gagal menjalankan screener");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadScreen("volume-breakout");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredResults = useMemo(() => {
    if (!searchTerm.trim()) return results;
    const q = searchTerm.toUpperCase();
    return results.filter(
      (r) => r.code.toUpperCase().includes(q) || r.name.toUpperCase().includes(q),
    );
  }, [results, searchTerm]);

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
    <div className="min-h-screen bg-background">
      <TopHeader />

      <main className="container py-4 sm:py-6 pb-24 md:pb-6 space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2">
            <Filter className="h-6 w-6 sm:h-7 sm:w-7 text-primary" aria-hidden />
            Stock Screener
          </h1>
          <p className="text-sm text-muted-foreground">
            Filter saham IDX berdasarkan kriteria teknikal
          </p>
        </div>

        {/* Category Filter - Sticky pills */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm -mx-4 px-4 py-2 border-b">
          <div className="flex gap-2 overflow-x-auto no-scrollbar" role="tablist" aria-label="Kategori screener">
            {Object.keys(CATEGORY_LABELS).map((cat) => (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={activeCategory === cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "shrink-0 inline-flex min-h-9 items-center rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-secondary text-secondary-foreground hover:bg-accent",
                )}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        </div>

        {/* Preset Cards - Vertical list, larger touch targets */}
        <div className="space-y-2">
          {filteredPresets.map((preset) => {
            const active = selectedScreen === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => loadScreen(preset.id, true)}
                disabled={loading && active}
                aria-pressed={active}
                className={cn(
                  "w-full min-h-14 text-left rounded-2xl border-2 p-4 transition-all active:scale-[0.99]",
                  active
                    ? "border-primary bg-primary/5 shadow-md"
                    : "border-border bg-card hover:border-primary/40 hover:bg-accent/30",
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-2xl",
                      active
                        ? preset.color === "bull"
                          ? "bg-bull-100 dark:bg-bull-700/30"
                          : preset.color === "bear"
                            ? "bg-bear-100 dark:bg-bear-700/30"
                            : "bg-amber-100 dark:bg-amber-700/30"
                        : "bg-secondary",
                    )}
                    aria-hidden
                  >
                    {preset.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={cn(
                          "font-bold text-base",
                          active && "text-primary",
                        )}
                      >
                        {preset.name}
                      </span>
                      {active && loading && (
                        <Loader2 className="h-3 w-3 animate-spin" aria-label="Memindai" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-snug">
                      {preset.description}
                    </p>
                  </div>
                  <ChevronRight
                    className={cn(
                      "shrink-0 h-5 w-5 text-muted-foreground transition-transform",
                      active && "translate-x-1 text-primary",
                    )}
                    aria-hidden
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* Results Section */}
        <Card className="p-4 sm:p-5">
          {/* Results Header */}
          <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                <span aria-hidden>{selectedPreset?.icon}</span>
                <span>{selectedPreset?.name}</span>
              </h3>
              <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap" aria-live="polite">
                <span>
                  {loading ? (
                    "⏳ Scanning..."
                  ) : (
                    <>
                      <span className="font-semibold text-foreground">{total}</span> hasil
                      {scanned > 0 && method === "deep" && ` dari ${scanned} saham`}
                    </>
                  )}
                </span>
                {lastUpdated && !loading && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" aria-hidden />
                      {lastUpdatedText}
                    </span>
                  </>
                )}
                {duration !== null && (
                  <>
                    <span>•</span>
                    <span>{duration}ms</span>
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
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              )}
              <span className="ml-1.5 hidden sm:inline">Refresh</span>
            </Button>
          </div>

          {/* Search Filter for Results */}
          {!loading && results.length > 3 && (
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
              <Input
                type="search"
                placeholder="Filter hasil..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-10 text-sm"
                aria-label="Filter hasil screener"
              />
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="space-y-2" role="status" aria-label="Memindai saham">
              {Array.from({ length: 6 }).map((_, i) => (
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
              <div className="text-center text-xs text-muted-foreground py-3">
                <Loader2 className="h-4 w-4 animate-spin inline mr-1" aria-hidden />
                {method === "deep"
                  ? "Deep scan: analisis teknikal 3 bulan (10-30 detik)..."
                  : "Scanning..."}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredResults.length === 0 && results.length === 0 && (
            <EmptyScreen
              screenName={selectedPreset?.name || ""}
              icon={selectedPreset?.icon || "📊"}
            />
          )}

          {/* Search No Match */}
          {!loading && filteredResults.length === 0 && results.length > 0 && (
            <EmptyState
              icon={<Search className="h-5 w-5" aria-hidden />}
              title={`Tidak ada saham cocok "${searchTerm}"`}
              description="Coba kata kunci lain, atau reset filter untuk lihat semua hasil."
              actions={[
                {
                  label: "Reset filter",
                  variant: "secondary",
                  onClick: () => setSearchTerm(""),
                },
              ]}
            />
          )}


          {/* Results */}
          {!loading && filteredResults.length > 0 && (
            <div className="space-y-2">
              {filteredResults.map((result) => (
                <ScreenerResultCard
                  key={result.code}
                  result={result}
                  onClick={() => router.push(`/stock/${result.code}`)}
                />
              ))}
            </div>
          )}
        </Card>

        {/* Info Footer */}
        <Alert variant="info" className="text-xs">
          <Sparkles className="h-4 w-4" aria-hidden />
          <div>
            <strong>💡 Tip:</strong> Data di-cache 1 jam. Untuk hasil real-time
            saat jam trading, klik <strong>Refresh</strong>. Tap kartu saham untuk
            lihat analisa lengkap.
          </div>
        </Alert>
      </main>
    </div>
  );
}

function ScreenerResultCard({
  result,
  onClick,
}: {
  result: ScreenerResult;
  onClick: () => void;
}) {
  const isUp = result.changePct >= 0;
  const isStrong = Math.abs(result.changePct) >= 5 || result.matchScore >= 80;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-xl border-2 bg-card p-4 card-hover transition-all",
        isStrong && isUp && "border-bull-500/30 bg-bull-50/20 dark:bg-bull-700/5",
        isStrong && !isUp && "border-bear-500/30 bg-bear-50/20 dark:bg-bear-700/5",
        !isStrong && "border-border",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-bold text-lg">{result.code}</span>
            {isStrong && (
              <Badge
                variant={isUp ? "bull" : "bear"}
                className="text-[9px] px-1.5 py-0"
              >
                {isUp ? "🚀 Strong" : "⚠️ Strong"}
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground line-clamp-1 mb-1.5">
            {result.name}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] flex-wrap">
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
              {result.sector}
            </Badge>
            <span className="text-primary font-medium">
              {result.matchDetails}
            </span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-base font-bold tabular-nums">
            {formatIDR(result.currentPrice)}
          </div>
          <div
            className={cn(
              "text-xs font-bold tabular-nums flex items-center justify-end gap-0.5 mt-0.5",
              isUp ? "text-bull-600" : "text-bear-600",
            )}
          >
            {isUp ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {formatPercent(result.changePct)}
          </div>
          {result.matchScore > 0 && (
            <div className="text-[10px] text-muted-foreground mt-0.5">
              score {result.matchScore.toFixed(0)}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

function EmptyScreen({
  screenName,
  icon,
}: {
  screenName: string;
  icon: string;
}) {
  return (
    <div className="text-center py-8 px-4">
      <div className="text-5xl mb-3">{icon}</div>
      <h3 className="font-bold text-base mb-1">Belum ada hasil</h3>
      <p className="text-xs text-muted-foreground max-w-xs mx-auto">
        Tidak ada saham yang match kriteria <strong>{screenName}</strong> saat ini.
        <br />
        Coba screener lain atau refresh nanti (data update saat jam bursa).
      </p>
    </div>
  );
}
