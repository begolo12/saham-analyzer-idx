"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Briefcase,
  RefreshCw,
  Star,
} from "lucide-react";
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
import { MobileAppBar, MobileActionBar, MobileStatRow, MobileSegmentedTabs } from "@/components/mobile-app-bar";
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
type MobileSection = "overview" | "signals" | "details";

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
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [mobileSection, setMobileSection] = useState<MobileSection>("overview");
  const [period, setPeriod] = useState<Period>("1y");
  const [activeTab, setActiveTab] = useState<Tab>("technical");

  const updateUrl = useCallback(
    (next: { tab?: Tab; period?: Period; section?: MobileSection }) => {
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
      setMobileSection("signals");
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

  const mobileTitle = summary?.name ? `${ticker} · ${summary.name}` : ticker;

  return (
    <div className="app-shell min-h-screen bg-background">
      <TopHeader />

      <MobileAppBar
        title={ticker}
        subtitle={summary?.name || "Analisa saham IDX"}
        backHref="/"
        emphasis="ticker"
        trailingValue={lastPrice ? formatIDR(lastPrice) : undefined}
        trailingChange={lastPrice ? formatPercent(priceChangePct) : undefined}
      />

      <main
        className={cn(
          "page-main container space-y-4",
          data && lastPrice && "data-[mobile-action=true]:pb-[10rem]",
        )}
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
            <section className="page-hero-card p-4 sm:p-5 hidden md:block">
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

            {/* MOBILE: Big hero + section switcher */}
            <div className="md:hidden">
              <section className="mobile-hero">
                <div className="page-eyebrow text-white/80">Live price</div>
                <div className="mobile-hero__row">
                  <div>
                    <div className="mobile-hero__value">
                      {lastPrice ? formatIDR(lastPrice) : "—"}
                    </div>
                    <div className="mobile-hero__delta">
                      {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      <span>{formatPercent(priceChangePct)}</span>
                      {prevClose && (
                        <span className="opacity-80">· {formatIDR(prevClose - lastPrice!)}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="mobile-hero__label">Rekomendasi</div>
                    <div className="mt-1 text-sm font-bold">
                      {recommendation?.action?.replace("_", " ") ?? "—"}
                    </div>
                    {recommendation?.confidence !== undefined && (
                      <div className="text-[10px] opacity-80">
                        {Math.round(recommendation.confidence)}% confidence
                      </div>
                    )}
                  </div>
                </div>
                {summary?.sector && (
                  <div className="mobile-hero__sub">{summary.sector}</div>
                )}
              </section>

              <MobileSegmentedTabs<MobileSection>
                value={mobileSection}
                onChange={setMobileSection}
                options={[
                  { value: "overview", label: "Overview" },
                  { value: "signals", label: "Sinyal" },
                  { value: "details", label: "Detail" },
                ]}
                subline={
                  mobileSection === "overview"
                    ? "Chart dan snapshot utama"
                    : mobileSection === "signals"
                      ? "Detail teknikal, fundamental, behavioral, sentimen"
                      : "Tentang keputusan investasi"
                }
              />
            </div>

            {/* DESKTOP: Persisted header / actions (md:flex) */}
            <div className="hidden md:flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Link href="/" aria-label="Kembali ke Beranda">
                  <Button variant="ghost" size="sm" className="min-h-9 rounded-full px-3">
                    <ArrowLeft className="mr-1 h-4 w-4" aria-hidden />
                    <span className="hidden sm:inline">Beranda</span>
                  </Button>
                </Link>
                <div className="flex items-center gap-2">
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
            </div>

            {/* MOBILE: Overview section = hero + snapshot + chart */}
            {mobileSection === "overview" && (
              <div className="md:hidden space-y-4">
                <MobileStatRow
                  items={[
                    {
                      label: "Volume",
                      value: formatNumber(summary?.volume),
                      tone: "neutral",
                    },
                    {
                      label: "52W High",
                      value: summary?.fiftyTwoWeekHigh ? formatIDR(summary.fiftyTwoWeekHigh) : "—",
                      tone: "bull",
                    },
                    {
                      label: "52W Low",
                      value: summary?.fiftyTwoWeekLow ? formatIDR(summary.fiftyTwoWeekLow) : "—",
                      tone: "bear",
                    },
                  ]}
                />

                <section>
                  <div className="page-section-heading">
                    <div>
                      <div className="page-section-title">Chart</div>
                      <div className="page-section-subtitle">Pilih horizon</div>
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
                  <Card className="overflow-hidden p-2">
                    <PriceChart
                      prices={data.historical || []}
                      technical={technical}
                      height={typeof window !== "undefined" && window.innerWidth < 640 ? 240 : 400}
                    />
                  </Card>
                </section>
              </div>
            )}

            {/* MOBILE: Signals section = recommendation + score breakdown */}
            {mobileSection === "signals" && (
              <div className="md:hidden space-y-4">
                <RecommendationHero rec={recommendation} />

                <Card className="p-4">
                  <div className="page-section-heading mb-3">
                    <div>
                      <div className="page-section-title">Skor sinyal</div>
                      <div className="page-section-subtitle">Tiap mesin analisa</div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <ScoreBar label="📊 Teknikal" score={technical?.overallScore ?? 0} weight={recommendation?.weights?.technical * 100} />
                    <ScoreBar label="💼 Fundamental" score={fundamental?.overallScore ?? 0} weight={recommendation?.weights?.fundamental * 100} />
                    <ScoreBar label="🔍 Behavioral" score={behavioral?.overallScore ?? 0} weight={recommendation?.weights?.behavioral * 100} />
                    <ScoreBar label="📰 Sentimen" score={sentiment?.overallScore ?? 0} weight={recommendation?.weights?.sentiment * 100} />
                  </div>
                </Card>

                <MobileSegmentedTabs<Tab>
                  value={activeTab}
                  onChange={handleTabChange}
                  options={[
                    { value: "technical", label: "📊 Tech" },
                    { value: "fundamental", label: "💼 Fund" },
                    { value: "behavioral", label: "🔍 Pattern" },
                    { value: "sentiment", label: "📰 News" },
                  ]}
                  subline="Buka tab sesuai sudut pandang analisa"
                />
              </div>
            )}

            {/* MOBILE: Details section = reasoning + charts on desktop, summary on mobile */}
            {mobileSection === "details" && (
              <div className="md:hidden space-y-4">
                {recommendation?.reasoning && (
                  <Card className="p-4">
                    <div className="page-section-heading mb-3">
                      <div>
                        <div className="page-section-title">Kenapa rekomendasi ini?</div>
                        <div className="page-section-subtitle">Ringkasan otomatis</div>
                      </div>
                    </div>
                    <div className="prose prose-sm max-w-none text-sm leading-relaxed text-foreground/90 dark:prose-invert [&_li]:my-0.5 [&_p]:my-1.5 [&_strong]:font-bold [&_strong]:text-foreground [&_ul]:my-2">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {recommendation.reasoning}
                      </ReactMarkdown>
                    </div>
                  </Card>
                )}

                <Tabs value={activeTab} onValueChange={handleTabChange}>
                  <TabsList className="grid w-full grid-cols-4" aria-label="Detail analisa mobile">
                    <TabsTrigger value="technical">📊</TabsTrigger>
                    <TabsTrigger value="fundamental">💼</TabsTrigger>
                    <TabsTrigger value="behavioral">🔍</TabsTrigger>
                    <TabsTrigger value="sentiment">📰</TabsTrigger>
                  </TabsList>
                  <TabsContent value="technical">
                    <TechnicalIndicatorsOnly technical={technical} />
                  </TabsContent>
                  <TabsContent value="fundamental">
                    <FundamentalMetrics metrics={fundamental?.metrics || []} />
                  </TabsContent>
                  <TabsContent value="behavioral">
                    <BehavioralPatterns
                      patterns={behavioral?.patterns || []}
                      supportLevels={behavioral?.supportLevels || []}
                      resistanceLevels={behavioral?.resistanceLevels || []}
                    />
                  </TabsContent>
                  <TabsContent value="sentiment">
                    <NewsList
                      articles={sentiment?.articles || []}
                      positiveCount={sentiment?.positiveCount || 0}
                      negativeCount={sentiment?.negativeCount || 0}
                      neutralCount={sentiment?.neutralCount || 0}
                    />
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {/* DESKTOP: Render all sections stacked */}
            <div className="hidden md:block space-y-5">
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
                  <MetricCard label="Harga" value={formatIDR(lastPrice)} delta={isUp ? "+" : ""} />
                  <MetricCard
                    label="Perubahan"
                    value={formatPercent(priceChangePct)}
                    delta={`${isUp ? "+" : ""}${Math.round(priceChange).toLocaleString("id-ID")}`}
                    deltaPositive={isUp}
                    icon={isUp ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  />
                  <MetricCard label="Volume" value={formatNumber(summary?.volume)} delta={`Avg: ${formatNumber(summary?.averageVolume)}`} />
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
                            active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
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
                  <ScoreBar label="📊 Teknikal" score={technical?.overallScore ?? 0} weight={recommendation?.weights?.technical * 100} />
                  <ScoreBar label="💼 Fundamental" score={fundamental?.overallScore ?? 0} weight={recommendation?.weights?.fundamental * 100} />
                  <ScoreBar label="🔍 Behavioral" score={behavioral?.overallScore ?? 0} weight={recommendation?.weights?.behavioral * 100} />
                  <ScoreBar label="📰 Sentimen" score={sentiment?.overallScore ?? 0} weight={recommendation?.weights?.sentiment * 100} />
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
          </div>
        )}

        <Footer />
      </main>

      {data && !loading && lastPrice && (
        <MobileActionBar
          primary={{
            label: `Beli ${ticker}`,
            ariaLabel: `Catat transaksi beli ${ticker}`,
            icon: <Briefcase className="h-4 w-4" />,
            onClick: () => setShowBuyModal(true),
          }}
          secondary={{
            label: "Watchlist",
            ariaLabel: "Tambah ke watchlist",
            icon: <Star className="h-4 w-4" />,
            onClick: () => {
              const button = document.querySelector<HTMLButtonElement>("[data-watchlist-toggle]");
              button?.click();
            },
          }}
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

function TechnicalIndicatorsOnly({ technical }: { technical: any }) {
  return (
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
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      <div className="md:hidden">
        <div className="mobile-hero opacity-90">
          <div className="mobile-hero__label">Memuat</div>
          <div className="mobile-hero__value">···</div>
          <div className="mobile-hero__sub">Mengambil data saham</div>
        </div>
      </div>
      <div className="hidden md:block page-hero-card p-4 sm:p-5">
        <div className="h-3 w-24 rounded bg-secondary shimmer" />
        <div className="mt-3 space-y-2">
          <div className="h-8 w-32 rounded-lg bg-secondary shimmer" />
          <div className="h-4 w-48 rounded bg-secondary shimmer" />
        </div>
      </div>
      <RecommendationSkeleton />
      <div className="grid grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-2xl border bg-card p-3 animate-pulse">
            <div className="h-2 w-12 rounded bg-muted" />
            <div className="mt-2 h-5 w-20 rounded bg-muted" />
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
        <div className="h-10 w-32 rounded shimmer bg-secondary" />
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
