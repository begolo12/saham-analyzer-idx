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
export const maxDuration = 60;

interface QuickQuote {
  ticker: string;
  code: string;
  price: number;
  previousClose: number | null;
  change: number;
  changePct: number;
}

/**
 * GET /api/screener?screen=volume-breakout&limit=20
 * Run a predefined screen against popular stocks.
 *
 * For "top-gainers" and "top-losers", uses lightweight /api/quick-style
 * fetches in parallel for fast results.
 * For other screens, fetches historical data (slower).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const screen = (searchParams.get("screen") || "top-gainers") as ScreenerType;
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 30);
    const scanLimit = Math.min(
      parseInt(searchParams.get("scanLimit") || "30", 10),
      50,
    );

    // Fast screens: use lightweight quotes
    if (screen === "top-gainers" || screen === "top-losers") {
      const results = await quickScreen(screen, limit);
      return NextResponse.json({
        screen,
        results,
        total: results.length,
        method: "fast",
      });
    }

    // Deep screens: fetch historical data for top stocks
    const stocksToScan = POPULAR_STOCKS.slice(0, scanLimit);
    const results: ScreenerResult[] = [];

    // Fetch historical data in parallel with concurrency limit
    const batches: typeof stocksToScan[] = [];
    for (let i = 0; i < stocksToScan.length; i += 5) {
      batches.push(stocksToScan.slice(i, i + 5));
    }

    for (const batch of batches) {
      const batchResults = await Promise.allSettled(
        batch.map(async (stock) => {
          try {
            const ticker = `${stock.code}.JK`;
            const [prices, quote] = await Promise.all([
              fetchHistorical(stock.code, "3mo"),
              fetch(`/api/quick/${stock.code}`)
                .then((r) => (r.ok ? r.json() : null))
                .catch(() => null),
            ]);

            const match = matchesCriteria(screen, prices);
            if (!match.matched) return null;

            return {
              ticker,
              code: stock.code,
              name: stock.name,
              sector: stock.sector,
              currentPrice: quote?.price ?? prices[prices.length - 1].close,
              change: quote?.change ?? 0,
              changePct: quote?.changePct ?? 0,
              matchDetails: match.details,
              matchScore: match.score,
            } as ScreenerResult;
          } catch (err) {
            return null;
          }
        }),
      );

      for (const r of batchResults) {
        if (r.status === "fulfilled" && r.value) {
          results.push(r.value);
        }
      }
    }

    // Sort by match score
    results.sort((a, b) => b.matchScore - a.matchScore);

    return NextResponse.json({
      screen,
      results: results.slice(0, limit),
      total: results.length,
      scanned: stocksToScan.length,
      method: "deep",
    });
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

async function quickScreen(
  screen: "top-gainers" | "top-losers",
  limit: number,
): Promise<ScreenerResult[]> {
  // Fetch all in parallel
  const stocks = POPULAR_STOCKS.slice(0, 40);
  const quotes = await Promise.allSettled(
    stocks.map(async (stock) => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/quick/${stock.code}`,
        );
        if (!res.ok) return null;
        const data = await res.json() as any;
        return {
          ticker: `${stock.code}.JK`,
          code: stock.code,
          name: stock.name,
          sector: stock.sector,
          price: data.price ?? 0,
          previousClose: data.previousClose ?? null,
          change: data.change ?? 0,
          changePct: data.changePct ?? 0,
        } as QuickQuote;
      } catch {
        return null;
      }
    }),
  );

  const validQuotes = quotes
    .filter(
      (q): q is PromiseFulfilledResult<any> =>
        q.status === "fulfilled" && q.value !== null && q.value.price > 0,
    )
    .map((q) => ({
      ticker: q.value.ticker,
      code: q.value.code,
      name: q.value.name,
      sector: q.value.sector,
      price: q.value.price,
      previousClose: q.value.previousClose ?? null,
      change: q.value.change ?? 0,
      changePct: q.value.changePct ?? 0,
    }));

  let filtered: QuickQuote[];
  if (screen === "top-gainers") {
    filtered = validQuotes
      .filter((q) => q.changePct >= 3)
      .sort((a, b) => b.changePct - a.changePct);
  } else {
    filtered = validQuotes
      .filter((q) => q.changePct <= -3)
      .sort((a, b) => a.changePct - b.changePct);
  }

  return filtered.slice(0, limit).map((q) => ({
    ticker: q.ticker,
    code: q.code,
    name: (q as any).name,
    sector: (q as any).sector,
    currentPrice: q.price,
    change: q.change,
    changePct: q.changePct,
    matchDetails: `${q.changePct >= 0 ? "+" : ""}${q.changePct.toFixed(2)}% hari ini`,
    matchScore: Math.min(100, Math.abs(q.changePct) * 10),
  }));
}
