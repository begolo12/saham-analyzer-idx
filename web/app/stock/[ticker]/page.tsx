"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, TrendingUp, TrendingDown, Briefcase } from "lucide-react";
import { TopHeader } from "@/components/top-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, Disclaimer } from "@/components/alert";
import {
  RecommendationSkeleton,
  ChartSkeleton,
  IndicatorSkeleton,
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

export default function StockDetailPage() {
  const params = useParams<{ ticker: string }>();
  const ticker = (params.ticker || "").toUpperCase().replace(".JK", "");
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<"1mo" | "3mo" | "6mo" | "1y" | "2y">("1y");
  const [activeTab, setActiveTab] = useState<string>("technical");
  const [showBuyModal, setShowBuyModal] = useState(false);

  useEffect(() => {
    if (!ticker) return;
    setLoading(true);
    setError(null);

    // Self-learning: bump view count if ticker is in watchlist
    bumpWatchView(ticker);

    fetch(`/api/analysis/${ticker}?period=${period}&includeNews=true`)
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to fetch");
        }
        return res.json();
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [ticker, period]);

  const refresh = () => {
    if (!ticker) return;
    setLoading(true);
    setError(null);
    fetch(`/api/analysis/${ticker}?period=${period}&includeNews=true`)
      .then((res) => res.json())
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  const summary = data?.summary;
  const recommendation = data?.recommendation;
  const technical = data?.technical;
  const fundamental = data?.fundamental;
  const behavioral = data?.behavioral;
  const sentiment = data?.sentiment;

  // Auto-track this recommendation untuk self-analysis
  useTrackRecommendation(ticker, recommendation);

  // Calculate price change for metrics
  const lastPrice = summary?.currentPrice;
  const prevClose = summary?.previousClose;
  const priceChange = lastPrice && prevClose ? lastPrice - prevClose : 0;
  const priceChangePct = lastPrice && prevClose && prevClose !== 0
    ? (priceChange / prevClose) * 100
    : 0;
  const isUp = priceChange >= 0;

  return (
    <div className="min-h-screen bg-background">
      <TopHeader />

      <main className="container py-4 sm:py-6">
        {/* Back button + actions */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Beranda</span>
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <WatchlistButton ticker={ticker} />
            <Button
              onClick={() => setShowBuyModal(true)}
              size="sm"
              className="bg-bull-600 hover:bg-bull-700"
            >
              <Briefcase className="h-4 w-4 mr-1" />
              <span>Beli</span>
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="h-8 w-32 bg-secondary rounded-lg shimmer" />
              <div className="h-4 w-48 bg-secondary rounded shimmer" />
            </div>
            <RecommendationSkeleton />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="rounded-2xl border bg-card p-4">
                  <div className="h-3 w-16 bg-secondary rounded shimmer mb-2" />
                  <div className="h-6 w-24 bg-secondary rounded shimmer" />
                </div>
              ))}
            </div>
            <ChartSkeleton />
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <Alert variant="danger" className="mb-4">
            <strong>Error:</strong> {error}
            <div className="mt-3">
              <Button onClick={refresh} variant="outline" size="sm">
                Coba Lagi
              </Button>
            </div>
          </Alert>
        )}

        {/* Success State */}
        {data && !loading && (
          <div className="space-y-5 animate-fade-in">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
                  {ticker}
                </h1>
                <Badge variant="outline" className="text-[10px]">
                  {summary?.sector || "N/A"}
                </Badge>
              </div>
              {summary?.name && (
                <p className="text-sm sm:text-base text-muted-foreground mt-0.5">
                  {summary.name}
                </p>
              )}
            </div>

            {/* Recommendation Hero */}
            <RecommendationHero rec={recommendation} />

            {/* Warnings */}
            {recommendation?.warnings?.length > 0 && (
              <div className="space-y-2">
                {recommendation.warnings.map((w: string, i: number) => (
                  <Alert key={i} variant="warning">
                    {w}
                  </Alert>
                ))}
              </div>
            )}

            {/* Key Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
                value={`${formatIDR(summary?.fiftyTwoWeekLow)}`}
                delta={`— ${formatIDR(summary?.fiftyTwoWeekHigh)}`}
              />
            </div>

            {/* Period selector */}
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg sm:text-xl font-bold">📈 Chart & Analysis</h2>
              <div className="flex gap-1">
                {(["1mo", "3mo", "6mo", "1y", "2y"] as const).map((p) => (
                  <Button
                    key={p}
                    variant={period === p ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPeriod(p)}
                    className="text-xs h-8 px-3"
                  >
                    {p.toUpperCase()}
                  </Button>
                ))}
              </div>
            </div>

            {/* Price Chart */}
            <Card className="p-2 sm:p-4 overflow-hidden">
              <PriceChart
                prices={data.historical || []}
                technical={technical}
                height={typeof window !== "undefined" && window.innerWidth < 640 ? 300 : 400}
              />
            </Card>

            {/* Score Breakdown */}
            <Card className="p-4 sm:p-5">
              <h3 className="font-bold text-base mb-3">📊 Signal Breakdown</h3>
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
                <div className="mt-4 pt-4 border-t">
                  <div className="text-xs sm:text-sm text-foreground/90 leading-relaxed prose prose-sm dark:prose-invert max-w-none [&_p]:my-1.5 [&_strong]:font-bold [&_strong]:text-foreground [&_ul]:my-2 [&_li]:my-0.5">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {recommendation.reasoning}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </Card>

            {/* Detailed Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full grid grid-cols-4">
                <TabsTrigger value="technical">📊 Tech</TabsTrigger>
                <TabsTrigger value="fundamental">💼 Fund</TabsTrigger>
                <TabsTrigger value="behavioral">🔍 Pattern</TabsTrigger>
                <TabsTrigger value="sentiment">📰 News</TabsTrigger>
              </TabsList>

              <TabsContent value="technical">
                <Card className="p-4 sm:p-5">
                  <div className="grid grid-cols-3 gap-3 mb-4">
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
                  <p className="text-xs text-muted-foreground mb-4 italic">
                    {technical?.summary}
                  </p>
                  <TechnicalIndicators indicators={technical?.indicators || []} />
                </Card>
              </TabsContent>

              <TabsContent value="fundamental">
                <Card className="p-4 sm:p-5">
                  <div className="grid grid-cols-2 gap-3 mb-4">
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
                  <p className="text-xs text-muted-foreground mb-4 italic">
                    {fundamental?.summary}
                  </p>
                  <FundamentalMetrics metrics={fundamental?.metrics || []} />
                </Card>
              </TabsContent>

              <TabsContent value="behavioral">
                <Card className="p-4 sm:p-5">
                  <div className="grid grid-cols-2 gap-3 mb-4">
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
                  <p className="text-xs text-muted-foreground mb-4 italic">
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
                  <div className="grid grid-cols-3 gap-3 mb-4">
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
                  <p className="text-xs text-muted-foreground mb-4 italic">
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
          </div>
        )}

        <Footer />
      </main>

      {/* Buy to Portfolio Modal */}
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

function Footer() {
  return (
    <footer className="border-t pt-6 pb-4 mt-8 text-center text-xs text-muted-foreground">
      <p>📊 Data: Yahoo Finance • Sentimen: Google News</p>
      <p className="mt-1">© 2026 Saham Analyzer IDX • Not financial advice</p>
    </footer>
  );
}
