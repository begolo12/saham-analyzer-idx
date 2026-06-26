import { NextRequest, NextResponse } from "next/server";
import {
  fetchHistorical,
  fetchSummary,
  fetchInfo,
  validateTicker,
  type StockPrice,
} from "@/lib/yahoo";
import { analyzeTechnical } from "@/lib/technical";
import { analyzeFundamental } from "@/lib/fundamental";
import { analyzeBehavioral } from "@/lib/behavioral";
import { fetchNews, summarizeSentiment } from "@/lib/news";
import { generateRecommendation } from "@/lib/recommender";
import {
  analyzeConfluence,
  detectSupportResistance,
  calculateWeightedScore,
  detectPatterns,
} from "@/lib/analysis-engine";

export const runtime = "nodejs";
export const revalidate = 300; // 5 min ISR cache — reduces redundant Yahoo Finance calls
export const maxDuration = 60;

/**
 * GET /api/analysis/[ticker]?period=1y&includeNews=true
 * Returns complete analysis: technical, fundamental, behavioral, sentiment + recommendation
 * Plus: confluence, support/resistance, weighted scoring, pattern recognition
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } },
) {
  try {
    const tickerInput = params.ticker.toUpperCase();
    const ticker = validateTicker(tickerInput);
    const code = ticker.replace(".JK", "");
    const { searchParams } = new URL(request.url);
    const period = (searchParams.get("period") || "1y") as
      | "1mo"
      | "3mo"
      | "6mo"
      | "1y"
      | "2y"
      | "5y";
    const includeNews = searchParams.get("includeNews") !== "false";

    // Fetch all data in parallel
    // For multi-timeframe, also fetch weekly and monthly data
    const [summaryBase, historical, info, weeklyPrices, monthlyPrices] =
      await Promise.all([
        fetchSummary(code),
        fetchHistorical(code, period),
        fetchInfo(code),
        fetchHistorical(code, "1y", "1wk").catch(() => [] as StockPrice[]),
        fetchHistorical(code, "2y", "1mo").catch(() => [] as StockPrice[]),
      ]);

    // Merge summary with info (fundamentals)
    const summary = { ...summaryBase, ...info };

    const currentPrice =
      summary.currentPrice ??
      historical[historical.length - 1]?.close ??
      null;

    // Run analyses
    const technical = analyzeTechnical(historical);
    const fundamental = analyzeFundamental(summary);
    const behavioral = analyzeBehavioral(historical);

    // Multi-timeframe confluence
    const confluence = analyzeConfluence(historical, weeklyPrices, monthlyPrices);

    // Enhanced support/resistance detection
    const supportResistance = detectSupportResistance(historical);

    // Weighted signal scoring
    const weightedScoring = calculateWeightedScore(technical.indicators);

    // Pattern recognition (candlestick + chart patterns)
    const patterns = detectPatterns(historical);

    // News + sentiment (optional, may be slow)
    let sentimentData: ReturnType<typeof summarizeSentiment> | null = null;
    if (includeNews) {
      try {
        const articles = await fetchNews(code, summary.name, 12);
        sentimentData = summarizeSentiment(articles);
      } catch (err) {
        console.error("News fetch error:", err);
        sentimentData = null;
      }
    }

    // Generate final recommendation
    const recommendation = generateRecommendation({
      technical: {
        overallScore: technical.overallScore,
        overallSignal: technical.overallSignal,
        trend: technical.trend,
        summary: technical.summary,
      },
      fundamental: {
        overallScore: fundamental.overallScore,
        overallSignal: fundamental.overallSignal,
        dataAvailability: fundamental.dataAvailability,
        summary: fundamental.summary,
      },
      behavioral: {
        overallScore: behavioral.overallScore,
        overallSignal: behavioral.overallSignal,
        summary: behavioral.summary,
      },
      sentiment: sentimentData
        ? {
            overallScore: sentimentData.overallScore,
            overallLabel: sentimentData.overallLabel,
            confidence: sentimentData.confidence,
            summary: sentimentData.summary,
            articles: sentimentData.articles,
          }
        : undefined,
      currentPrice,
    });

    return NextResponse.json({
      summary,
      historical,
      technical,
      fundamental,
      behavioral,
      sentiment: sentimentData,
      recommendation,
      // New analysis engine features
      confluence,
      supportResistance,
      weightedScoring,
      patterns,
      meta: {
        ticker,
        code,
        period,
        cached_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("API /analysis error:", error);
    const message =
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : error instanceof Error
          ? error.message
          : "Failed to analyze stock";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
