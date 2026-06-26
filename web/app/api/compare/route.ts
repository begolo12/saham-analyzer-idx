import { NextRequest, NextResponse } from "next/server";
import { POPULAR_STOCKS } from "@/lib/popular-stocks";
import {
  fetchSummary,
  fetchHistorical,
  type StockSummary,
} from "@/lib/yahoo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { YAHOO_UA as UA } from "@/lib/constants";

export interface CompareStock {
  code: string;
  name: string;
  sector: string;
  price: number;
  change: number;
  changePct: number;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  marketCap: number | null;
  trailingPE: number | null;
  forwardPE: number | null;
  priceToBook: number | null;
  priceToSales: number | null;
  returnOnEquity: number | null;
  returnOnAssets: number | null;
  profitMargins: number | null;
  grossMargins: number | null;
  revenueGrowth: number | null;
  earningsGrowth: number | null;
  dividendYield: number | null;
  debtToEquity: number | null;
  currentRatio: number | null;
  volume: number | null;
  averageVolume: number | null;
  performance: {
    oneDay: number;
    oneWeek: number;
    oneMonth: number;
    threeMonth: number;
  };
  rsi14: number | null;
  macdSignal: "bullish" | "bearish" | "neutral" | null;
  trend: "uptrend" | "downtrend" | "sideways" | null;
}

/**
 * Simple RSI(14) calculation from closing prices.
 */
function calcRSI(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;
  const recent = closes.slice(-(period + 1));
  let gains = 0;
  let losses = 0;
  for (let i = 1; i < recent.length; i++) {
    const change = recent[i] - recent[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/**
 * MACD(12,26,9) — return bullish/bearish signal from recent closes.
 */
function calcMACDSignal(closes: number[]): "bullish" | "bearish" | "neutral" | null {
  if (closes.length < 35) return null;
  const ema = (data: number[], period: number) => {
    const k = 2 / (period + 1);
    let e = data[0];
    for (let i = 1; i < data.length; i++) e = data[i] * k + e * (1 - k);
    return e;
  };
  const ema12 = ema(closes.slice(-26), 12);
  const ema26 = ema(closes.slice(-26), 26);
  const macdLine = ema12 - ema26;
  const signal = ema([...closes.slice(-35), macdLine], 9);
  const diff = macdLine - signal;
  if (diff > 0) return "bullish";
  if (diff < 0) return "bearish";
  return "neutral";
}

/**
 * Detect trend based on 20-day and 50-day moving averages.
 */
function calcTrend(closes: number[]): "uptrend" | "downtrend" | "sideways" | null {
  if (closes.length < 50) return null;
  const sma = (arr: number[], len: number) => {
    const slice = arr.slice(-len);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  };
  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, 50);
  const lastPrice = closes[closes.length - 1];
  if (lastPrice > sma20 && sma20 > sma50) return "uptrend";
  if (lastPrice < sma20 && sma20 < sma50) return "downtrend";
  return "sideways";
}

/**
 * Performance % from closes array.
 */
function calcPerformance(closes: number[]): CompareStock["performance"] {
  if (closes.length < 2) {
    return { oneDay: 0, oneWeek: 0, oneMonth: 0, threeMonth: 0 };
  }
  const last = closes[closes.length - 1];
  const prevDay = closes[closes.length - 2] ?? last;
  const oneWeekAgo = closes[Math.max(0, closes.length - 6)] ?? last;
  const oneMonthAgo = closes[Math.max(0, closes.length - 22)] ?? last;
  const threeMonthAgo = closes[Math.max(0, closes.length - 66)] ?? last;
  const pct = (a: number, b: number) => (b === 0 ? 0 : ((a - b) / b) * 100);
  return {
    oneDay: pct(last, prevDay),
    oneWeek: pct(last, oneWeekAgo),
    oneMonth: pct(last, oneMonthAgo),
    threeMonth: pct(last, threeMonthAgo),
  };
}

/**
 * GET /api/compare?tickers=BBCA,BMRI,BBRI
 * Returns comprehensive data for each ticker, suitable for side-by-side compare.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tickersParam = searchParams.get("tickers") || "";
    const tickers = tickersParam
      .split(",")
      .map((t) => t.trim().toUpperCase().replace(".JK", ""))
      .filter(Boolean)
      .slice(0, 3);

    if (tickers.length < 2) {
      return NextResponse.json(
        { error: "Minimal 2 tickers required" },
        { status: 400 },
      );
    }

    const results: CompareStock[] = [];

    for (const ticker of tickers) {
      const staticStock = POPULAR_STOCKS.find((s) => s.code === ticker);
      try {
        // Fetch summary (fundamentals) + chart (price + 1mo history) in parallel
        const [summary, chartRes] = await Promise.all([
          fetchSummary(ticker).catch(() => null),
          fetch(
            `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker + ".JK")}?range=3mo&interval=1d`,
            {
              headers: { "User-Agent": UA, Accept: "application/json" },
              next: { revalidate: 300 },
            },
          )
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
        ]);

        // Extract chart data
        const result = chartRes?.chart?.result?.[0];
        const closes: number[] = (
          result?.indicators?.quote?.[0]?.close ?? []
        ).filter((c: unknown): c is number => typeof c === "number");
        const meta = result?.meta ?? {};
        const lastClose = closes[closes.length - 1] ?? meta.regularMarketPrice ?? 0;
        const prevClose =
          closes[closes.length - 2] ?? meta.previousClose ?? meta.chartPreviousClose ?? lastClose;
        const change = lastClose - prevClose;
        const changePct = prevClose ? (change / prevClose) * 100 : 0;
        const yearHigh = meta.fiftyTwoWeekHigh ?? 0;
        const yearLow = meta.fiftyTwoWeekLow ?? 0;
        const volume = meta.regularMarketVolume ?? 0;

        const s = summary as StockSummary | null;
        results.push({
          code: ticker,
          name: s?.name || staticStock?.name || ticker,
          sector: staticStock?.sector || "Lainnya",
          price: lastClose,
          change,
          changePct,
          fiftyTwoWeekHigh: yearHigh || s?.fiftyTwoWeekHigh || null,
          fiftyTwoWeekLow: yearLow || s?.fiftyTwoWeekLow || null,
          marketCap: s?.marketCap ?? null,
          trailingPE: s?.trailingPE ?? null,
          forwardPE: s?.forwardPE ?? null,
          priceToBook: s?.priceToBook ?? null,
          priceToSales: s?.priceToSalesTrailing12Months ?? null,
          returnOnEquity: s?.returnOnEquity ?? null,
          returnOnAssets: s?.returnOnAssets ?? null,
          profitMargins: s?.profitMargins ?? null,
          grossMargins: null, // Not available in current StockSummary
          revenueGrowth: s?.revenueGrowth ?? null,
          earningsGrowth: s?.earningsGrowth ?? null,
          dividendYield: s?.dividendYield ?? null,
          debtToEquity: s?.debtToEquity ?? null,
          currentRatio: s?.currentRatio ?? null,
          volume,
          averageVolume: s?.averageVolume ?? null,
          performance: calcPerformance(closes),
          rsi14: calcRSI(closes),
          macdSignal: calcMACDSignal(closes),
          trend: calcTrend(closes),
        });
      } catch (err) {
        console.error(`Compare failed for ${ticker}:`, err);
      }
    }

    return NextResponse.json({ results, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error("API /compare error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Compare failed" },
      { status: 500 },
    );
  }
}
