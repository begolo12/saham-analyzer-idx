import { NextRequest, NextResponse } from "next/server";
import { POPULAR_STOCKS } from "@/lib/popular-stocks";
import { fetchHistorical, type StockPrice } from "@/lib/yahoo";
import {
  matchesCriteria,
  type ScreenerType,
  type ScreenerResult,
} from "@/lib/screener";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

interface QuickQuote {
  ticker: string;
  code: string;
  name: string;
  sector: string;
  price: number;
  previousClose: number | null;
  change: number;
  changePct: number;
}

// Cache to avoid hammering Yahoo Finance
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

function getCached(key: string): any | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: any) {
  cache.set(key, { data, timestamp: Date.now() });
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/**
 * Fetch quote directly from Yahoo Finance (no self-fetch)
 */
async function fetchQuoteDirect(code: string): Promise<QuickQuote | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(code + ".JK")}?range=5d&interval=1d`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      signal: controller.signal,
      next: { revalidate: 300 },
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = await res.json();
    const result = data.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta;
    const closes = result.indicators?.quote?.[0]?.close ?? [];
    const validCloses = closes.filter((c: any) => typeof c === "number");
    const lastClose = validCloses[validCloses.length - 1] ?? meta.regularMarketPrice ?? 0;
    const prevClose = validCloses[validCloses.length - 2] ?? meta.previousClose ?? meta.chartPreviousClose ?? 0;

    const change = prevClose ? lastClose - prevClose : 0;
    const changePct = prevClose ? (change / prevClose) * 100 : 0;

    const stock = POPULAR_STOCKS.find((s) => s.code === code);

    return {
      ticker: `${code}.JK`,
      code,
      name: meta.longName || meta.shortName || stock?.name || code,
      sector: stock?.sector || "N/A",
      price: lastClose,
      previousClose: prevClose,
      change,
      changePct,
    };
  } catch (err) {
    return null;
  }
}

/**
 * GET /api/screener?screen=volume-breakout&limit=20
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const screen = (searchParams.get("screen") || "top-gainers") as ScreenerType;
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 30);
    const scanLimit = Math.min(
      parseInt(searchParams.get("scanLimit") || "60", 10),
      80,
    );

    const forceRefresh = searchParams.get("refresh") === "1";
    const cacheKey = `screen:${screen}:${limit}:${scanLimit}`;
    const cached = forceRefresh ? null : getCached(cacheKey);
    if (cached && cached.total > 0) {
      return NextResponse.json({ ...cached, cached: true });
    }

    const startTime = Date.now();
    const stocksToScan = POPULAR_STOCKS.slice(0, scanLimit);

    // Fetch quotes in batches of 6 with delays (rate limit friendly)
    const allQuotes: QuickQuote[] = [];
    for (let i = 0; i < stocksToScan.length; i += 6) {
      const batch = stocksToScan.slice(i, i + 6);
      const batchResults = await Promise.allSettled(
        batch.map((stock) => fetchQuoteDirect(stock.code)),
      );
      for (const r of batchResults) {
        if (r.status === "fulfilled" && r.value) allQuotes.push(r.value);
      }
      if (i + 6 < stocksToScan.length) {
        await new Promise((resolve) => setTimeout(resolve, 150));
      }
    }

    // Quick screen from quotes
    const quickResults = runQuickScreen(screen, allQuotes);

    if (quickResults.length >= 3 || isQuickScreen(screen)) {
      const result = {
        screen,
        results: quickResults.slice(0, limit),
        total: quickResults.length,
        scanned: stocksToScan.length,
        method: "fast",
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
      };
      if (quickResults.length > 0) setCache(cacheKey, result);
      return NextResponse.json({ ...result, cached: false });
    }

    // Deep screen: fetch historical in batches
    const deepResults: ScreenerResult[] = [];
    for (let i = 0; i < stocksToScan.length; i += 4) {
      const batch = stocksToScan.slice(i, i + 4);
      const batchResults = await Promise.allSettled(
        batch.map(async (stock) => {
          try {
            const prices = await fetchHistorical(stock.code, "3mo");
            const match = matchesCriteria(screen, prices);
            if (!match.matched) return null;

            const quote = allQuotes.find((q) => q.code === stock.code);
            return {
              ticker: `${stock.code}.JK`,
              code: stock.code,
              name: stock.name,
              sector: stock.sector,
              currentPrice: quote?.price ?? prices[prices.length - 1].close,
              change: quote?.change ?? 0,
              changePct: quote?.changePct ?? 0,
              matchDetails: match.details,
              matchScore: match.score,
            } as ScreenerResult;
          } catch {
            return null;
          }
        }),
      );
      for (const r of batchResults) {
        if (r.status === "fulfilled" && r.value) deepResults.push(r.value);
      }
      if (i + 4 < stocksToScan.length) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    deepResults.sort((a, b) => b.matchScore - a.matchScore);

    const result = {
      screen,
      results: deepResults.slice(0, limit),
      total: deepResults.length,
      scanned: stocksToScan.length,
      method: "deep",
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
    };
    if (deepResults.length > 0) setCache(cacheKey, result);
    return NextResponse.json({ ...result, cached: false });
  } catch (error) {
    console.error("API /screener error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Screener failed" },
      { status: 500 },
    );
  }
}

function isQuickScreen(screen: ScreenerType): boolean {
  return ["top-gainers", "top-losers", "near-52w-high", "near-52w-low"].includes(screen);
}

function runQuickScreen(
  screen: ScreenerType,
  quotes: QuickQuote[],
): ScreenerResult[] {
  let filtered: QuickQuote[] = [];

  switch (screen) {
    case "top-gainers":
      filtered = quotes
        .filter((q) => q.changePct >= 1)
        .sort((a, b) => b.changePct - a.changePct);
      break;
    case "top-losers":
      filtered = quotes
        .filter((q) => q.changePct <= -1)
        .sort((a, b) => a.changePct - b.changePct);
      break;
    case "near-52w-high":
      filtered = quotes
        .filter((q) => q.changePct > 0 && q.price > 0)
        .sort((a, b) => b.changePct - a.changePct)
        .slice(0, 15);
      break;
    case "near-52w-low":
      filtered = quotes
        .filter((q) => q.changePct < 0 && q.price > 0)
        .sort((a, b) => a.changePct - b.changePct)
        .slice(0, 15);
      break;
    default:
      return [];
  }

  return filtered.slice(0, 30).map((q) => ({
    ticker: q.ticker,
    code: q.code,
    name: q.name,
    sector: q.sector,
    currentPrice: q.price,
    change: q.change,
    changePct: q.changePct,
    matchDetails: `${q.changePct >= 0 ? "+" : ""}${q.changePct.toFixed(2)}% ${isWeekend() ? "(last trading day)" : "hari ini"}`,
    matchScore: Math.min(100, Math.abs(q.changePct) * 15),
  }));
}

function isWeekend(): boolean {
  const day = new Date().getDay();
  return day === 0 || day === 6;
}
