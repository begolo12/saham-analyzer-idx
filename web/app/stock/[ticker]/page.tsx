"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, TrendingUp, TrendingDown, Briefcase, RefreshCw } from "lucide-react";
import { TopHeader } from "@/components/top-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert } from "@/components/alert";
import {
  RecommendationSkeleton,
  ChartSkeleton,
} from "@/components/skeleton";
import { MetricCard } from "@/components/mini-chart";
import { RecommendationHero } from "@/components/recommendation-hero";
import { TechnicalIndicators, ScoreBar } from "@/components/technical-indicators";
import { FundamentalMetrics } from "@/components/fundamental-metrics";
import { BehavioralPatterns } from "@/components/behavioral-patterns";
import { NewsList } from "@/components/news-list";
import { PriceChart } from "@/components/price-chart";
import { WatchlistButton, bumpWatchView } from "@/components/watchlist-button";
import { AddTransactionModal } from "@/components/add-transaction-modal";
import { useTrackRecommendation } from "@/components/track-recommendation";
import { ErrorBanner } from "@/components/error-banner";
import { EmptyState } from "@/components/empty-state";
import { formatIDR, formatNumber, formatPercent, cn } from "@/lib/utils";

interface AnalysisData {
  summary: any;
  historical: any[];
  technical: any;
  fundamental: any;
  behavioral: any;
  sentiment: any;
  recommendation: any;
  meta: any;
}

type Period = "1mo" | "3mo" | "6mo" | "1y" | "2y";
type Tab = "technical" | "fundamental" | "behavioral" | "sentiment";

const PERIODS: Period[] = ["1mo", "3mo", "6mo", "1y", "2y"];
const PERIOD_LABELS: Record<Period, string> = {
  "1mo": "1B",
  "3mo": "3B",
  "6mo": "6B",
  "1y": "1T",
  "2y": "2T",
};
const VALID_TABS: Tab[] = ["technical", "fundamental", "behavioral", "sentiment"];

export default function StockDetailPage() {
  return (
    <Suspense fallback={<StockDetailSkeleton />}>
      <StockDetailContent />
    </Suspense>
  );
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

  const initialTab = (() => {
    const t = searchParams.get("tab");
    if (t === "news") return "sentiment";
    return t && VALID_TABS.includes(t as Tab) ? (t as Tab) : "technical";
  })();
  const initialPeriod = (() => {
    const p = searchParams.get("period");
    return p && PERIODS.includes(p as Period) ? (p as Period) : "1y";
  })();

  const [period, setPeriod] = useState<Period>(initialPeriod);
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [showBuyModal, setShowBuyModal] = useState(false);

  const updateUrl = useCallback(
    (next: { tab?: Tab; period?: Period }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.tab) params.set("tab", next.tab);
      else if (params.get("tab")) params.delete("tab");
      if (next.period) params.set("period", next.period);
      else if (params.get("period")) params.delete("period");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const handleTabChange = useCallback(
    (tab: string) => {
      if (!VALID_TABS.includes(tab as Tab)) return;
      setActiveTab(tab as Tab);
      updateUrl({ tab: tab as Tab });
    },
    [updateUrl],
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

  useTrackRecommendation(ticker, recommendation);

  const lastPrice = summary?.currentPrice;
  const prevClose = summary?.previousClose;
  const priceChange = lastPrice && prevClose ? lastPrice - prevClose : 0;
  const priceChangePct = lastPrice && prevClose && prevClose !== 0
    ? (priceChange / prevClose) * 100
    : 0;
  const isUp = priceChange >= 0;

  return (
    <div className="app-shell min-h-screen bg-background">
      <TopHeader />

      <main className="page-main container" data-sticky-actions="true">
        <div className="mobile-topbar md:hidden">
          <div className="mobile-topbar__inner">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Link href="/" aria-label="Kembali ke Beranda">
                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full">
                    <ArrowLeft className="h-4 w-4" aria-hidden />
                  </Button>
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="mobile-topbar__title truncate">{ticker}</div>
                  <div className="mobile-topbar__subtitle truncate">
                    {summary?.name || "Analisa saham IDX"}
                  </div>
                </div>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-sm font-black tabular-nums">{formatIDR(lastPrice)}</div>
              <div className={cn(
                "text-[11px] font-bold tabular-nums",
                isUp ? "text-bull-600" : "text-bear-600",
              )}>
                {formatPercent(priceChangePct)}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-4 hidden items-center justify-between gap-2 md:flex">
          <Link href="/" aria-label="Kembali ke Beranda">
            <Button variant="ghost" size="sm" className="min-h-9 rounded-full px-3">
              <ArrowLeft className="mr-1 h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Beranda</span>
            </Button>
          </Link>
          <div className="hidden sm:flex items-center gap-2">
            <WatchlistButton ticker={ticker} />
            <Button
              onClick={() => setShowBuyModal(true)}
              size="sm"
              aria-label={`Catat transaksi beli ${ticker}`}
              className="min-h-9 rounded-full bg-bull-600 px-4 hover:bg-bull-700"
            >
              <Briefcase className="mr-1 h-4 w-4" aria-hidden />
              <span>Beli</span>
            </Button>
          </div>
        </div>

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
            <section className="page-hero-card p-4 sm:p-5">
              <div className="page-eyebrow">Stock workspace</div>
              <div className="mt-2 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
                      {ticker}
                    </h1>
                    <Badge variant="outline" className="text-[10px]">
                      {summary?.sector || "N/A"}
                    </Badge>
                  </div>
                  {summary?.name && (
                    <p className="mt-1 text-sm sm:text-base text-muted-foreground">
                      {summary.name}
                    </p>
                  )}
                  <div className="mt-3 flex items-center gap-2 flex-wrap sm:hidden">
                    <WatchlistButton ticker={ticker} />
                    <Badge variant="secondary" className="text-[10px] font-medium">
                      {lastPrice ? formatIDR(lastPrice) : "Harga belum tersedia"}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] font-bold",
                        isUp ? "text-bull-600 border-bull-500/30" : "text-bear-600 border-bear-500/30",
                      )}
                    >
                      {formatPercent(priceChangePct)}
                    </Badge>
                  </div>
                </div>
                {lastPrice ? (
                  <div className="hidden sm:block shrink-0 text-right">
                    <div className="page-eyebrow">Harga saat ini</div>
                    <div className="mt-1 text-2xl font-black tabular-nums">
                      {formatIDR(lastPrice)}
                    </div>
                    <div
                      className={cn(
                        "mt-1 inline-flex items-center gap-1 text-xs font-bold tabular-nums",
                        isUp ? "text-bull-600" : "text-bear-600",
                      )}
                    >
                      {isUp ? (
                        <TrendingUp className="h-3.5 w-3.5" aria-hidden />
                      ) : (
                        <TrendingDown className="h-3.5 w-3.5" aria-hidden />
                      )}
                      <span>{formatPercent(priceChangePct)}</span>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>

            <RecommendationHero rec={recommendation} />

            {recommendation?.warnings?.length > 0 && (
              <div className="space-y-2">
                {recommendation.warnings.map((w: string, i: number) => (
                  <Alert key={i} variant="warning">
                    {w}
                  </Alert>
                ))}
              </div>
            )}

            <section>
              <div className="page-section-heading">
                <div>
                  <div className="page-section-title">Snapshot utama</div>
                  <div className="page-section-subtitle">Harga, perubahan, likuiditas, rentang 52 minggu</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <MetricCard
                  label="Harga"
                  value={formatIDR(lastPrice)}
                  delta={isUp ? "+" : ""}
                />
                <MetricCard
                  label="Perubahan"
                  value={formatPercent(priceChangePct)}
                  delta={`${isUp ? "+" : ""}${Math.round(priceChange).toLocaleString("id-ID")}`}
                  deltaPositive={isUp}
                  icon={isUp ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                />
                <MetricCard
                  label="Volume"
                  value={formatNumber(summary?.volume)}
                  delta={`Avg: ${formatNumber(summary?.averageVolume)}`}
                />
                <MetricCard
                  label="52w Range"
                  value={formatIDR(summary?.fiftyTwoWeekLow)}
                  delta={`— ${formatIDR(summary?.fiftyTwoWeekHigh)}`}
                />
              </div>
            </section>

            <section>
              <div className="page-section-heading">
                <div>
                  <div className="page-section-title">Chart & analisa</div>
                  <div className="page-section-subtitle">Pilih horizon lalu baca sinyal utamanya</div>
                </div>
                <div
                  role="radiogroup"
                  aria-label="Periode chart"
                  className="inline-flex items-center gap-0.5 rounded-full bg-muted p-0.5"
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
                          "min-h-8 rounded-full px-3 text-[11px] font-semibold transition-colors",
                          active
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {PERIOD_LABELS[p]}
                      </button>
                    );
                  })}
                </div>
              </div>
              <Card className="overflow-hidden p-2 sm:p-4">
                <PriceChart
                  prices={data.historical || []}
                  technical={technical}
                  height={typeof window !== "undefined" && window.innerWidth < 640 ? 300 : 400}
                />
              </Card>
            </section>

            <Card className="p-4 sm:p-5">
              <div className="page-section-heading mb-3">
                <div>
                  <div className="page-section-title">Signal breakdown</div>
                  <div className="page-section-subtitle">Lihat kontribusi tiap mesin analisa</div>
                </div>
              </div>
              <div className="space-y-3">
                <ScoreBar
                  label="📊 Teknikal"
                  score={technical?.overallScore ?? 0}
                  weight={recommendation?.weights?.technical * 100}
                />
                <ScoreBar
                  label="💼 Fundamental"
                  score={fundamental?.overallScore ?? 0}
                  weight={recommendation?.weights?.fundamental * 100}
                />
                <ScoreBar
                  label="🔍 Behavioral"
                  score={behavioral?.overallScore ?? 0}
                  weight={recommendation?.weights?.behavioral * 100}
                />
                <ScoreBar
                  label="📰 Sentimen"
                  score={sentiment?.overallScore ?? 0}
                  weight={recommendation?.weights?.sentiment * 100}
                />
              </div>
              {recommendation?.reasoning && (
                <div className="mt-4 border-t pt-4">
                  <div className="prose prose-sm max-w-none text-xs leading-relaxed text-foreground/90 dark:prose-invert sm:text-sm [&_li]:my-0.5 [&_p]:my-1.5 [&_strong]:font-bold [&_strong]:text-foreground [&_ul]:my-2">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {recommendation.reasoning}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </Card>

            <section>
              <div className="page-section-heading">
                <div>
                  <div className="page-section-title">Detail analisa</div>
                  <div className="page-section-subtitle">Buka tab sesuai sudut pandang yang ingin kamu cek</div>
                </div>
              </div>
              <Tabs value={activeTab} onValueChange={handleTabChange}>
                <TabsList className="grid w-full grid-cols-4" aria-label="Detail analisa">
                  <TabsTrigger value="technical">📊 Tech</TabsTrigger>
                  <TabsTrigger value="fundamental">💼 Fund</TabsTrigger>
                  <TabsTrigger value="behavioral">🔍 Pattern</TabsTrigger>
                  <TabsTrigger value="sentiment">📰 News</TabsTrigger>
                </TabsList>

                <TabsContent value="technical">
                  <Card className="p-4 sm:p-5">
                    <div className="mb-4 grid grid-cols-3 gap-3">
                      <div>
                        <div className="text-xs text-muted-foreground">Score</div>
                        <div className="text-2xl font-bold tabular-nums">
                          {technical?.overallScore?.toFixed(0) ?? 0}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Trend</div>
                        <div className="text-lg font-semibold">{technical?.trend}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Signal</div>
                        <div className="text-lg font-semibold">
                          {technical?.overallSignal?.replace("_", " ")}
                        </div>
                      </div>
                    </div>
                    <p className="mb-4 text-xs italic text-muted-foreground">
                      {technical?.summary}
                    </p>
                    <TechnicalIndicators indicators={technical?.indicators || []} />
                  </Card>
                </TabsContent>

                <TabsContent value="fundamental">
                  <Card className="p-4 sm:p-5">
                    <div className="mb-4 grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs text-muted-foreground">Score</div>
                        <div className="text-2xl font-bold tabular-nums">
                          {fundamental?.overallScore?.toFixed(0) ?? 0}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Data Available</div>
                        <div className="text-2xl font-bold tabular-nums">
                          {((fundamental?.dataAvailability || 0) * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>
                    <p className="mb-4 text-xs italic text-muted-foreground">
                      {fundamental?.summary}
                    </p>
                    <FundamentalMetrics metrics={fundamental?.metrics || []} />
                  </Card>
                </TabsContent>

                <TabsContent value="behavioral">
                  <Card className="p-4 sm:p-5">
                    <div className="mb-4 grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs text-muted-foreground">Score</div>
                        <div className="text-2xl font-bold tabular-nums">
                          {behavioral?.overallScore?.toFixed(0) ?? 0}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Signal</div>
                        <div className="text-lg font-semibold">
                          {behavioral?.overallSignal?.replace("_", " ")}
                        </div>
                      </div>
                    </div>
                    <p className="mb-4 text-xs italic text-muted-foreground">
                      {behavioral?.summary}
                    </p>
                    <BehavioralPatterns
                      patterns={behavioral?.patterns || []}
                      supportLevels={behavioral?.supportLevels || []}
                      resistanceLevels={behavioral?.resistanceLevels || []}
                    />
                  </Card>
                </TabsContent>

                <TabsContent value="sentiment">
                  <Card className="p-4 sm:p-5">
                    <div className="mb-4 grid grid-cols-3 gap-3">
                      <div>
                        <div className="text-xs text-muted-foreground">Score</div>
                        <div className="text-2xl font-bold tabular-nums">
                          {sentiment?.overallScore?.toFixed(0) ?? 0}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Articles</div>
                        <div className="text-2xl font-bold tabular-nums">
                          {sentiment?.articles?.length || 0}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Confidence</div>
                        <div className="text-2xl font-bold tabular-nums">
                          {((sentiment?.confidence || 0) * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>
                    <p className="mb-4 text-xs italic text-muted-foreground">
                      {sentiment?.summary}
                    </p>
                    <NewsList
                      articles={sentiment?.articles || []}
                      positiveCount={sentiment?.positiveCount || 0}
                      negativeCount={sentiment?.negativeCount || 0}
                      neutralCount={sentiment?.neutralCount || 0}
                    />
                  </Card>
                </TabsContent>
              </Tabs>
            </section>
          </div>
        )}

        <Footer />
      </main>

      {data && !loading && lastPrice && (
        <div className="app-sticky-action-bar md:hidden">
          <div className="app-sticky-action-bar__panel p-2.5">
            <div className="flex items-center gap-2">
              <WatchlistButton ticker={ticker} compact />
              <Button
                onClick={() => setShowBuyModal(true)}
                className="min-h-11 flex-1 rounded-xl bg-bull-600 hover:bg-bull-700"
                aria-label={`Catat transaksi beli ${ticker}`}
              >
                <Briefcase className="mr-1.5 h-4 w-4" aria-hidden />
                <span className="font-semibold">Beli {ticker}</span>
              </Button>
            </div>
          </div>
        </div>
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

function LoadingState() {
  return (
    <div className="space-y-4">
      <div className="page-hero-card p-4 sm:p-5">
        <div className="h-3 w-24 rounded bg-secondary shimmer" />
        <div className="mt-3 space-y-2">
          <div className="h-8 w-32 rounded-lg bg-secondary shimmer" />
          <div className="h-4 w-48 rounded bg-secondary shimmer" />
        </div>
      </div>
      <RecommendationSkeleton />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-2xl border bg-card p-4">
            <div className="mb-2 h-3 w-16 rounded bg-secondary shimmer" />
            <div className="h-6 w-24 rounded bg-secondary shimmer" />
          </div>
        ))}
      </div>
      <ChartSkeleton />
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-8 border-t pb-4 pt-6 text-center text-xs text-muted-foreground">
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
        <div className="h-9 w-32 rounded shimmer bg-secondary" />
        <div className="page-hero-card p-4 sm:p-5">
          <div className="h-3 w-24 rounded bg-secondary shimmer" />
          <div className="mt-3 space-y-2">
            <div className="h-10 w-40 rounded bg-secondary shimmer" />
            <div className="h-4 w-56 rounded bg-secondary shimmer" />
          </div>
        </div>
        <RecommendationSkeleton />
        <ChartSkeleton />
      </main>
    </div>
  );
}
