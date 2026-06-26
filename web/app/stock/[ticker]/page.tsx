"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Briefcase,
  RefreshCw,
  Star,
  ChevronLeft,
  ChevronRight,
  Activity,
  BarChart3,
  Building2,
  Newspaper,
  AlertTriangle,
} from "lucide-react";
import { TopHeader } from "@/components/top-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  RecommendationSkeleton,
  ChartSkeleton,
  StockDetailFullSkeleton,
} from "@/components/skeleton";
import { RecommendationHero } from "@/components/recommendation-hero";
import { TechnicalIndicators, ScoreBar } from "@/components/technical-indicators";
import { FundamentalMetrics } from "@/components/fundamental-metrics";
import { BehavioralPatterns } from "@/components/behavioral-patterns";
import { NewsList } from "@/components/news-list";
const PriceChart = dynamic(
  () => import("@/components/price-chart").then((m) => ({ default: m.PriceChart })),
  { ssr: false, loading: () => <ChartSkeleton /> },
);

const LazyMarkdown = dynamic(
  async () => {
    const [{ default: ReactMarkdown }, { default: remarkGfm }] = await Promise.all([
      import("react-markdown"),
      import("remark-gfm"),
    ]);
    return function MarkdownWrapper({ children }: { children: string }) {
      return <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>;
    };
  },
  { ssr: false },
);

import { WatchlistButton, bumpWatchView, getWatchlist } from "@/components/watchlist-button";
import { AddTransactionModal } from "@/components/add-transaction-modal";
import { useTrackRecommendation } from "@/components/track-recommendation";
import { ErrorBanner } from "@/components/error-banner";
import { EmptyState } from "@/components/empty-state";
import { CollapsibleCard } from "@/components/collapsible-card";
import { DataFreshnessPill } from "@/components/data-freshness-pill";
import { formatIDR, formatNumber, formatPercent, cn } from "@/lib/utils";
import {
  ACTION_INDONESIAN,
  ACTION_EMOJI,
  type Recommendation,
} from "@/lib/recommender";

import type { StockSummary, StockPrice } from "@/lib/yahoo";
import type { TechnicalAnalysisResult } from "@/lib/technical";
import type { FundamentalAnalysisResult } from "@/lib/fundamental";
import type { BehavioralAnalysisResult } from "@/lib/behavioral";
import type { SentimentSummary } from "@/lib/news";

interface AnalysisData {
  summary: StockSummary;
  historical: StockPrice[];
  technical: TechnicalAnalysisResult;
  fundamental: FundamentalAnalysisResult;
  behavioral: BehavioralAnalysisResult;
  sentiment: SentimentSummary | null;
  recommendation: Recommendation;
  meta: {
    confluence: any;
    supportResistance: any;
    weightedScoring: any;
    patterns: any;
    updatedAt?: string;
  };
}

type Period = "1mo" | "3mo" | "6mo" | "1y" | "2y";

const PERIODS: Period[] = ["1mo", "3mo", "6mo", "1y", "2y"];
const PERIOD_LABELS: Record<Period, string> = {
  "1mo": "1B",
  "3mo": "3B",
  "6mo": "6B",
  "1y": "1T",
  "2y": "2T",
};

export default function StockDetailPage() {
  return (
    <Suspense fallback={<StockDetailSkeleton />}>
      <StockDetailContent />
    </Suspense>
  );
}

/** Hook: detect swipe left/right on a container */
function useSwipeNavigation(
  containerRef: React.RefObject<HTMLElement | null>,
  onSwipeLeft: () => void,
  onSwipeRight: () => void,
) {
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchStart.current = { x: touch.clientX, y: touch.clientY };
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStart.current) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStart.current.x;
      const dy = touch.clientY - touchStart.current.y;
      touchStart.current = null;

      if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx) * 0.7) return;

      if (dx < 0) onSwipeLeft();
      else onSwipeRight();
    };

    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [containerRef, onSwipeLeft, onSwipeRight]);
}

function StockDetailContent() {
  const params = useParams<{ ticker: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const ticker = (params.ticker || "").toUpperCase().replace(".JK", "");
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [period, setPeriod] = useState<Period>("1y");

  // Price flash animation state
  const [priceFlash, setPriceFlash] = useState<"up" | "down" | null>(null);
  const prevPriceRef = useRef<number | null>(null);

  // Swipe navigation
  const mainRef = useRef<HTMLElement>(null);
  const watchlist = typeof window !== "undefined" ? getWatchlist() : [];
  const currentIdx = watchlist.indexOf(ticker);

  const navigateToStock = useCallback((t: string) => {
    router.push(`/stock/${t}`);
  }, [router]);

  const swipeNext = useCallback(() => {
    if (watchlist.length < 2) return;
    const nextIdx = (currentIdx + 1) % watchlist.length;
    navigateToStock(watchlist[nextIdx]);
  }, [watchlist, currentIdx, navigateToStock]);

  const swipePrev = useCallback(() => {
    if (watchlist.length < 2) return;
    const prevIdx = (currentIdx - 1 + watchlist.length) % watchlist.length;
    navigateToStock(watchlist[prevIdx]);
  }, [watchlist, currentIdx, navigateToStock]);

  useSwipeNavigation(mainRef, swipeNext, swipePrev);

  const updateUrl = useCallback(
    (next: { period?: Period }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.period) params.set("period", next.period);
      else if (params.get("period")) params.delete("period");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const handlePeriodChange = useCallback(
    (p: Period) => {
      setPeriod(p);
      updateUrl({ period: p });
    },
    [updateUrl],
  );

  useEffect(() => {
    if (!ticker) return;
    setLoading(true);
    setError(null);

    bumpWatchView(ticker);

    fetch(`/api/analysis/${ticker}?period=${period}&includeNews=true`)
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Gagal memuat data (${res.status})`);
        }
        return res.json();
      })
      .then((json) => {
        setData(json);
        setLoading(false);

        const newPrice = json?.summary?.currentPrice;
        if (prevPriceRef.current !== null && newPrice && newPrice !== prevPriceRef.current) {
          setPriceFlash(newPrice > prevPriceRef.current ? "up" : "down");
          setTimeout(() => setPriceFlash(null), 500);
        }
        prevPriceRef.current = newPrice ?? null;
      })
      .catch((err) => {
        console.error(err);
        setError(err instanceof Error ? err.message : "Gagal memuat analisa");
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker, period, retryNonce]);

  const refresh = useCallback(() => {
    setRetryNonce((n) => n + 1);
  }, []);

  const summary = data?.summary;
  const recommendation = data?.recommendation;
  const technical = data?.technical;
  const fundamental = data?.fundamental;
  const behavioral = data?.behavioral;
  const sentiment = data?.sentiment;

  useTrackRecommendation(ticker, recommendation ?? null);

  const lastPrice = summary?.currentPrice;
  const prevClose = summary?.previousClose;
  const priceChange = lastPrice && prevClose ? lastPrice - prevClose : 0;
  const priceChangePct = lastPrice && prevClose && prevClose !== 0
    ? (priceChange / prevClose) * 100
    : 0;
  const isUp = priceChange >= 0;

  const hasNext = watchlist.length > 1;
  const nextTicker = hasNext ? watchlist[(currentIdx + 1) % watchlist.length] : null;
  const prevTicker = hasNext ? watchlist[(currentIdx - 1 + watchlist.length) % watchlist.length] : null;

  return (
    <div className="app-shell min-h-screen bg-background">
      <TopHeader />

      <main
        ref={mainRef}
        className="page-main container space-y-4 overflow-x-hidden pb-24"
        data-sticky-actions="true"
      >
        {loading && <LoadingState />}

        {error && !loading && (
          <div className="space-y-3">
            <ErrorBanner
              title="Gagal memuat analisa"
              message={error}
              onRetry={refresh}
            />
            <EmptyState
              title="Coba lagi atau kembali"
              description="Pastikan ticker valid (contoh: BBCA, TLKM) dan koneksi internet stabil."
              actions={[
                {
                  label: "Cari saham lain",
                  icon: <RefreshCw className="h-3 w-3" aria-hidden />,
                  onClick: () => router.push("/search"),
                },
              ]}
            />
          </div>
        )}

        {data && !loading && (
          <div className="space-y-5 animate-fade-in">
            {/* ─── HERO: Ticker + Price + Recommendation ─── */}
            <HeroSection
              ticker={ticker}
              summary={summary}
              recommendation={recommendation}
              lastPrice={lastPrice ?? undefined}
              priceChange={priceChange}
              priceChangePct={priceChangePct}
              isUp={isUp}
              priceFlash={priceFlash}
              data={data}
              hasNext={hasNext}
              nextTicker={nextTicker}
              prevTicker={prevTicker}
              swipeNext={swipeNext}
              swipePrev={swipePrev}
              onBuy={() => setShowBuyModal(true)}
            />

            {/* ─── QUICK INSIGHT: 3 Horizon Cards ─── */}
            {recommendation && (
              <RecommendationHero rec={recommendation} />
            )}

            {/* ─── CHART ─── */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-sm font-bold">📈 Chart</div>
                  <div className="text-[10px] text-muted-foreground">Harga historis & analisa teknikal</div>
                </div>
                <div
                  role="radiogroup"
                  aria-label="Periode chart"
                  className="inline-flex items-center gap-0.5 rounded-full bg-muted/60 p-0.5"
                  style={{ boxShadow: "inset 2px 2px 4px rgba(0,0,0,0.06), inset -2px -2px 4px rgba(255,255,255,0.5)" }}
                >
                  {PERIODS.map((p) => {
                    const active = period === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => handlePeriodChange(p)}
                        className={cn(
                          "min-h-8 rounded-full px-3 text-[11px] font-semibold transition-all duration-200",
                          active
                            ? "bg-background text-foreground shadow-[3px_3px_6px_rgba(0,0,0,0.08),-3px_-3px_6px_rgba(255,255,255,0.7)]"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {PERIOD_LABELS[p]}
                      </button>
                    );
                  })}
                </div>
              </div>
              <Card className="overflow-hidden p-3" style={{ borderRadius: "20px" }}>
                <PriceChart
                  prices={data.historical || []}
                  technical={technical}
                  supportResistance={data.meta?.supportResistance}
                  height={typeof window !== "undefined" && window.innerWidth < 640 ? 260 : 380}
                />
              </Card>
            </section>

            {/* ─── ANALYSIS ACCORDION ─── */}
            <div className="space-y-3">
              <div className="text-sm font-bold mb-2 flex items-center gap-2">
                <span className="text-lg">🔬</span>
                <span>Analisa Detail</span>
              </div>

              {/* Sinyal */}
              <CollapsibleCard
                title="Sinyal"
                icon={<Activity className="h-4 w-4 text-blue-500" />}
                subtitle={`Skor ${recommendation ? (recommendation.componentScores.technical * recommendation.weights.technical + recommendation.componentScores.fundamental * recommendation.weights.fundamental + recommendation.componentScores.behavioral * recommendation.weights.behavioral + recommendation.componentScores.sentiment * recommendation.weights.sentiment).toFixed(0) : "0"} · ${recommendation?.action ? (ACTION_INDONESIAN[recommendation.action as keyof typeof ACTION_INDONESIAN]) : "—"}${recommendation?.confidence && recommendation.confidence >= 20 ? ` · Confidence ${recommendation.confidence.toFixed(0)}%` : ""}`}
                defaultOpen={false}
                storageKey="stock-detail-acc-sinyal"
                density="tight"
                accentColor="border-l-blue-500"
              >
                <div className="space-y-3 pt-2">
                  <ScoreBar
                    label="📊 Teknikal"
                    score={technical?.overallScore ?? 0}
                  />
                  <ScoreBar
                    label="💼 Fundamental"
                    score={fundamental?.overallScore ?? 0}
                  />
                  <ScoreBar
                    label="🔍 Behavioral"
                    score={behavioral?.overallScore ?? 0}
                  />
                  {recommendation?.reasoning && (
                    <div className="border-t border-border/40 pt-3 mt-1">
                      <div className="prose prose-sm max-w-none text-xs leading-relaxed text-foreground/90 dark:prose-invert [&_li]:my-0.5 [&_p]:my-1.5 [&_strong]:font-bold [&_strong]:text-foreground [&_ul]:my-2">
                        <LazyMarkdown>
                          {recommendation.reasoning}
                        </LazyMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              </CollapsibleCard>

              {/* Teknikal */}
              <CollapsibleCard
                title="Teknikal"
                icon={<BarChart3 className="h-4 w-4 text-emerald-500" />}
                subtitle={`Skor ${technical?.overallScore?.toFixed(0) ?? 0} · Tren: ${technical?.trend ?? "—"} · ${(technical?.overallSignal ?? "—").replace("_", " ")}`}
                defaultOpen={false}
                storageKey="stock-detail-acc-technical"
                density="tight"
                accentColor="border-l-emerald-500"
              >
                <div className="pt-2">
                  <TechnicalIndicators indicators={technical?.indicators || []} />
                </div>
              </CollapsibleCard>

              {/* Fundamental */}
              <CollapsibleCard
                title="Fundamental"
                icon={<Building2 className="h-4 w-4 text-purple-500" />}
                subtitle={`Skor ${fundamental?.overallScore?.toFixed(0) ?? 0} · Data: ${((fundamental?.dataAvailability || 0) * 100).toFixed(0)}% tersedia`}
                defaultOpen={false}
                storageKey="stock-detail-acc-fundamental"
                density="tight"
                accentColor="border-l-purple-500"
              >
                <div className="pt-2">
                  {fundamental?.summary && (
                    <p className="mb-3 text-xs italic text-muted-foreground">
                      {fundamental.summary}
                    </p>
                  )}
                  <FundamentalMetrics metrics={fundamental?.metrics || []} />
                </div>
              </CollapsibleCard>

              {/* Pola Perilaku */}
              <CollapsibleCard
                title="Pola Perilaku"
                icon={<span className="text-sm">🔍</span>}
                subtitle={`Skor ${behavioral?.overallScore?.toFixed(0) ?? 0} · ${(behavioral?.overallSignal ?? "—").replace("_", " ")}`}
                defaultOpen={false}
                storageKey="stock-detail-acc-behavioral"
                density="tight"
                accentColor="border-l-indigo-500"
              >
                <div className="pt-2">
                  {behavioral?.summary && (
                    <p className="mb-3 text-xs italic text-muted-foreground">
                      {behavioral.summary}
                    </p>
                  )}
                  <BehavioralPatterns
                    patterns={behavioral?.patterns || []}
                    supportLevels={behavioral?.supportLevels || []}
                    resistanceLevels={behavioral?.resistanceLevels || []}
                  />
                </div>
              </CollapsibleCard>

              {/* Berita & Sentimen */}
              <CollapsibleCard
                title="Berita & Sentimen"
                icon={<Newspaper className="h-4 w-4 text-orange-500" />}
                subtitle={`Skor ${sentiment?.overallScore?.toFixed(0) ?? 0} · ${sentiment?.articles?.length || 0} artikel · Confidence: ${((sentiment?.confidence || 0) * 100).toFixed(0)}%`}
                defaultOpen={false}
                storageKey="stock-detail-acc-sentiment"
                density="tight"
                accentColor="border-l-orange-500"
              >
                <div className="pt-2">
                  {sentiment?.summary && (
                    <p className="mb-3 text-xs italic text-muted-foreground">
                      {sentiment.summary}
                    </p>
                  )}
                  <NewsList
                    articles={sentiment?.articles || []}
                    positiveCount={sentiment?.positiveCount || 0}
                    negativeCount={sentiment?.negativeCount || 0}
                    neutralCount={sentiment?.neutralCount || 0}
                  />
                </div>
              </CollapsibleCard>
            </div>

            {/* ─── DISCLAIMER: Single pill ─── */}
            <DisclaimerPill warnings={recommendation?.warnings} />
          </div>
        )}

        <Footer />
      </main>

      {data && !loading && lastPrice && (
        <MobileActionBarInline
          ticker={ticker}
          onBuy={() => setShowBuyModal(true)}
        />
      )}

      {showBuyModal && lastPrice && (
        <AddTransactionModal
          defaultTicker={ticker}
          defaultPrice={lastPrice}
          onClose={() => setShowBuyModal(false)}
        />
      )}
    </div>
  );
}

/* ─────────────────────── HERO SECTION ─────────────────────── */

function HeroSection({
  ticker,
  summary,
  recommendation,
  lastPrice,
  priceChange,
  priceChangePct,
  isUp,
  priceFlash,
  data,
  hasNext,
  nextTicker,
  prevTicker,
  swipeNext,
  swipePrev,
  onBuy,
}: {
  ticker: string;
  summary: any;
  recommendation: any;
  lastPrice: number | undefined;
  priceChange: number;
  priceChangePct: number;
  isUp: boolean;
  priceFlash: "up" | "down" | null;
  data: AnalysisData;
  hasNext: boolean;
  nextTicker: string | null;
  prevTicker: string | null;
  swipeNext: () => void;
  swipePrev: () => void;
  onBuy: () => void;
}) {
  const action = recommendation?.action as string | undefined;
  const isBuy = action === "BUY" || action === "STRONG_BUY";
  const isSell = action === "SELL" || action === "STRONG_SELL";
  const confidence = recommendation?.confidence as number | undefined;

  return (
    <div className="space-y-3">
      {/* Back / nav row */}
      <div className="flex items-center justify-between">
        <Link href="/" aria-label="Kembali ke Beranda">
          <Button variant="ghost" size="sm" className="min-h-9 rounded-full px-3">
            <ArrowLeft className="mr-1 h-4 w-4" aria-hidden />
            <span>Beranda</span>
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <WatchlistButton ticker={ticker} />
          <Button
            onClick={onBuy}
            size="sm"
            aria-label={`Catat transaksi beli ${ticker}`}
            className="bg-[hsl(var(--primary))] text-white rounded-lg px-4 py-2 font-medium min-h-9 rounded-full bg-bull-600 px-4 hover:bg-bull-700"
          >
            <Briefcase className="mr-1 h-4 w-4" aria-hidden />
            <span>Beli</span>
          </Button>
        </div>
      </div>

      {/* Swipe hints */}
      {hasNext && (
        <div className="flex items-center justify-between">
          <button
            onClick={swipePrev}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-3 w-3" />
            {prevTicker}
          </button>
          <span className="text-[9px] text-muted-foreground/50">← swipe →</span>
          <button
            onClick={swipeNext}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            {nextTicker}
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Hero card — Claymorphism style */}
      <div
        className={cn(
          "bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl relative overflow-hidden",
          isBuy
            ? "bg-gradient-to-br from-emerald-50 via-emerald-100/50 to-card dark:from-emerald-900/30 dark:via-emerald-950/20 dark:to-card"
            : isSell
              ? "bg-gradient-to-br from-red-50 via-red-100/50 to-card dark:from-red-900/30 dark:via-red-950/20 dark:to-card"
              : "bg-gradient-to-br from-amber-50 via-amber-100/50 to-card dark:from-amber-900/20 dark:via-amber-950/10 dark:to-card",
        )}
        style={{ padding: "1.25rem 1.5rem" }}
      >
        {/* Subtle radial glow */}
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{ background: "radial-gradient(circle at 80% 0%, rgba(255,255,255,0.15) 0%, transparent 50%)" }}
          aria-hidden
        />

        <div className="relative">
          {/* Top row: ticker + freshness */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight">{ticker}</h1>
              <Badge variant="outline" className="text-[10px]">
                {summary?.sector || "N/A"}
              </Badge>
            </div>
            {data?.meta?.updatedAt && (
              <DataFreshnessPill updatedAt={data.meta.updatedAt} />
            )}
          </div>

          {/* Company name */}
          {summary?.name && (
            <p className="mt-0.5 text-sm text-muted-foreground">{summary.name}</p>
          )}

          {/* Price + Recommendation row */}
          <div className="mt-4 flex items-end justify-between gap-4">
            <div>
              {lastPrice ? (
                <div
                  className={cn(
                    "text-3xl sm:text-4xl font-black tabular-nums font-num",
                    priceFlash === "up" && "price-flash-up",
                    priceFlash === "down" && "price-flash-down",
                  )}
                >
                  {formatIDR(lastPrice)}
                </div>
              ) : (
                <div className="text-3xl font-black text-muted-foreground">—</div>
              )}
              <div
                className={cn(
                  "mt-1 inline-flex items-center gap-1.5 text-sm font-bold tabular-nums font-num",
                  isUp ? "text-bull-600" : "text-bear-600",
                )}
              >
                {isUp ? (
                  <TrendingUp className="h-4 w-4" aria-hidden />
                ) : (
                  <TrendingDown className="h-4 w-4" aria-hidden />
                )}
                <span>{formatPercent(priceChangePct)}</span>
                {summary?.previousClose && (
                  <span className="opacity-60 text-xs ml-1">
                    ({isUp ? "+" : ""}{Math.round(priceChange).toLocaleString("id-ID")})
                  </span>
                )}
              </div>
            </div>

            {/* Recommendation badge */}
            <div className="text-right">
              {action && (
                <div
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-sm font-bold border",
                    "shadow-[4px_4px_8px_rgba(0,0,0,0.08),-4px_-4px_8px_rgba(255,255,255,0.5)]",
                    isBuy
                      ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-700/30 dark:text-emerald-400 dark:border-emerald-600/30"
                      : isSell
                        ? "bg-red-100 text-red-700 border-red-200 dark:bg-red-700/30 dark:text-red-400 dark:border-red-600/30"
                        : "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-700/30 dark:text-amber-400 dark:border-amber-600/30",
                  )}
                >
                  <span className="text-lg">{ACTION_EMOJI[action as keyof typeof ACTION_EMOJI] ?? "📊"}</span>
                  {ACTION_INDONESIAN[action as keyof typeof ACTION_INDONESIAN] ?? action}
                </div>
              )}
              {confidence !== undefined && (
                confidence >= 20 ? (
                  <div className="mt-2 flex items-center justify-end gap-2">
                    <div
                      className="w-20 h-2 rounded-full bg-muted/60 overflow-hidden"
                      style={{ boxShadow: "inset 2px 2px 4px rgba(0,0,0,0.06), inset -2px -2px 4px rgba(255,255,255,0.4)" }}
                    >
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-1000",
                          isBuy
                            ? "bg-gradient-to-r from-emerald-400 to-emerald-600"
                            : isSell
                              ? "bg-gradient-to-r from-red-400 to-red-600"
                              : "bg-gradient-to-r from-amber-400 to-amber-600",
                        )}
                        style={{ width: `${Math.round(confidence)}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums font-num">
                      {Math.round(confidence)}%
                    </span>
                  </div>
                ) : (
                  <div className="mt-2 flex items-center justify-end">
                    <span
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-muted/60 text-muted-foreground border border-border/30"
                      style={{ boxShadow: "2px 2px 4px rgba(0,0,0,0.04), -2px -2px 4px rgba(255,255,255,0.3)" }}
                    >
                      ⚠️ Data terbatas
                    </span>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────── DISCLAIMER PILL ─────────────────────── */

function DisclaimerPill({ warnings }: { warnings?: string[] }) {
  const [expanded, setExpanded] = useState(false);

  if (!warnings || warnings.length === 0) {
    return (
      <div className="flex justify-center">
        <span
          className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground/60 bg-muted/50 px-4 py-1.5 rounded-full"
          style={{ boxShadow: "2px 2px 4px rgba(0,0,0,0.04), -2px -2px 4px rgba(255,255,255,0.4)" }}
        >
          <AlertTriangle className="h-3 w-3" />
          Bukan saran keuangan · Data dari Yahoo Finance & Google News
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="mx-auto flex items-center gap-1.5 text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-4 py-1.5 rounded-full hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
        style={{ boxShadow: "2px 2px 4px rgba(0,0,0,0.04), -2px -2px 4px rgba(255,255,255,0.4)" }}
      >
        <AlertTriangle className="h-3 w-3" />
        {warnings.length} catatan · Bukan saran keuangan
      </button>
      {expanded && (
        <div className="space-y-1 animate-fade-in">
          {warnings.map((w: string, i: number) => (
            <p key={i} className="text-[10px] text-muted-foreground text-center px-4">
              {w}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────── INLINE MOBILE ACTION BAR ─────────────────────── */

function MobileActionBarInline({
  ticker,
  onBuy,
}: {
  ticker: string;
  onBuy: () => void;
}) {
  return (
    <div
      className="fixed left-0 right-0 z-50 p-3 flex items-center gap-2 md:hidden"
      style={{
        bottom: "var(--mobile-action-bar-bottom, calc(4.5rem + env(safe-area-inset-bottom) + 0.5rem))",
        background: "hsl(var(--background) / 0.95)",
        backdropFilter: "blur(12px)",
        borderTop: "1px solid hsl(var(--border) / 0.6)",
      }}
    >
      <Button
        onClick={onBuy}
        className="bg-[hsl(var(--primary))] text-white rounded-lg px-4 py-2 font-medium flex-1 min-h-[44px] rounded-2xl bg-bull-600 hover:bg-bull-700 font-bold"
      >
        <Briefcase className="mr-2 h-4 w-4" />
        Beli {ticker}
      </Button>
      <Button
        variant="outline"
        className="min-h-[44px] rounded-2xl px-4"
        style={{ boxShadow: "3px 3px 6px rgba(0,0,0,0.08), -3px -3px 6px rgba(255,255,255,0.5)" }}
        onClick={() => {
          const button = document.querySelector<HTMLButtonElement>("[data-watchlist-toggle]");
          button?.click();
        }}
      >
        <Star className="h-4 w-4" />
      </Button>
    </div>
  );
}

/* ─────────────────────── HELPERS ─────────────────────── */

function LoadingState() {
  return <StockDetailFullSkeleton />;
}

function Footer() {
  return (
    <footer className="mt-8 border-t border-border/40 pb-4 pt-6 text-center text-xs text-muted-foreground">
      <p>📊 Data: Yahoo Finance • Sentimen: Google News</p>
      <p className="mt-1">© 2026 Saham Analyzer IDX • Not financial advice</p>
    </footer>
  );
}

function StockDetailSkeleton() {
  return (
    <div className="app-shell min-h-screen bg-background">
      <TopHeader />
      <main className="page-main container space-y-4">
        <div className="h-10 w-32 rounded-xl shimmer bg-secondary" />
        <Card className="p-4 sm:p-5">
          <div className="h-3 w-24 rounded-lg bg-secondary shimmer" />
          <div className="mt-3 space-y-2">
            <div className="h-10 w-40 rounded-lg bg-secondary shimmer" />
            <div className="h-4 w-56 rounded-lg bg-secondary shimmer" />
          </div>
        </Card>
        <RecommendationSkeleton />
        <ChartSkeleton />
      </main>
    </div>
  );
}
