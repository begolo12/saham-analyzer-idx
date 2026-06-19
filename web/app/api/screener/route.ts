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

// Simple in-memory cache (1 hour TTL)
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

/**
 * GET /api/screener?screen=volume-breakout&limit=20
 * Run a predefined screen against popular stocks.
 *
 * Supports all screens with smart caching and graceful weekend handling.
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

    const cacheKey = `screen:${screen}:${limit}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return NextResponse.json({ ...cached, cached: true });
    }

    const startTime = Date.now();

    // Get more stocks for better results
    const stocksToScan = POPULAR_STOCKS.slice(0, scanLimit);

    // For ALL screens, use lightweight quote-based approach first
    const quotes = await Promise.allSettled(
      stocksToScan.map(async (stock) => {
        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/quick/${stock.code}`,
            { next: { revalidate: 300 } },
          );
          if (!res.ok) return null;
          const data = (await res.json()) as any;
          return {
            ticker: `${stock.code}.JK`,
            code: stock.code,
            name: stock.name,
            sector: stock.sector,
            price: data.price ?? 0,
            previousClose: data.previousClose ?? null,
            change: data.change ?? 0,
            changePct: data.changePct ?? 0,
          };
        } catch {
          return null;
        }
      }),
    );

    const validQuotes = quotes
      .filter(
        (q): q is PromiseFulfilledResult<QuickQuote> =>
          q.status === "fulfilled" && q.value !== null && q.value.price > 0,
      )
      .map((q) => q.value);

    // Phase 1: Quick screen from quote data (top gainers, losers, near 52w high/low)
    const quickResults = runQuickScreen(screen, validQuotes);

    if (quickResults.length >= 5 || isQuickScreen(screen)) {
      const result = {
        screen,
        results: quickResults.slice(0, limit),
        total: quickResults.length,
        scanned: stocksToScan.length,
        method: "fast",
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
      };
      setCache(cacheKey, result);
      return NextResponse.json({ ...result, cached: false });
    }

    // Phase 2: For deep screens (RSI, MACD, SMA), fetch historical
    const deepStocks = isQuickScreen(screen) ? [] : stocksToScan;
    const deepResults: ScreenerResult[] = [];

    const batches: typeof deepStocks[] = [];
    for (let i = 0; i < deepStocks.length; i += 4) {
      batches.push(deepStocks.slice(i, i + 4));
    }

    for (const batch of batches) {
      const batchResults = await Promise.allSettled(
        batch.map(async (stock) => {
          try {
            const prices = await fetchHistorical(stock.code, "3mo");
            const match = matchesCriteria(screen, prices);
            if (!match.matched) return null;

            const quote = validQuotes.find((q) => q.code === stock.code);
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
        if (r.status === "fulfilled" && r.value) {
          deepResults.push(r.value);
        }
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

    setCache(cacheKey, result);
    return NextResponse.json({ ...result, cached: false });
  } catch (error) {
    console.error("API /screener error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Screener failed",
      },
      { status: 500 },
    );
  }
}

function isQuickScreen(screen: ScreenerType): boolean {
  return ["top-gainers", "top-losers"].includes(screen);
}

function runQuickScreen(
  screen: ScreenerType,
  quotes: QuickQuote[],
): ScreenerResult[] {
  let filtered: QuickQuote[] = [];

  switch (screen) {
    case "top-gainers":
      filtered = quotes
        .filter((q) => q.changePct >= 1) // Lower threshold for more results
        .sort((a, b) => b.changePct - a.changePct);
      break;
    case "top-losers":
      filtered = quotes
        .filter((q) => q.changePct <= -1)
        .sort((a, b) => a.changePct - b.changePct);
      break;
    case "near-52w-high":
      // Just show stocks near 52w high based on momentum
      filtered = quotes
        .filter((q) => q.changePct > 0 && q.price > 0)
        .sort((a, b) => b.changePct - a.changePct)
        .slice(0, 10);
      break;
    case "near-52w-low":
      filtered = quotes
        .filter((q) => q.changePct < 0 && q.price > 0)
        .sort((a, b) => a.changePct - b.changePct)
        .slice(0, 10);
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
  return day === 0 || day === 6; // Sunday or Saturday
}
