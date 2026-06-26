import { NextRequest, NextResponse } from "next/server";
import { POPULAR_STOCKS } from "@/lib/popular-stocks";
import {
  type CustomScreenerConfig,
  type CustomScreenerStock,
  runCustomScreener,
  describeCustomScreener,
} from "@/lib/screener";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

import { YAHOO_UA as UA } from "@/lib/constants";

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

async function fetchQuoteDirect(code: string): Promise<QuickQuote | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(code + ".JK")}?range=5d&interval=1d`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      signal: controller.signal,
      next: { revalidate: 300 },
    } as RequestInit);
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = await res.json();
    const result = data.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta;
    const closes = result.indicators?.quote?.[0]?.close ?? [];
    const validCloses = closes.filter((c: any) => typeof c === "number");
    const lastClose = validCloses[validCloses.length - 1] ?? meta.regularMarketPrice ?? 0;
    const prevClose = validCloses[validCloses.length - 2] ?? meta.previousClose ?? 0;

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
  } catch {
    return null;
  }
}

/**
 * POST /api/screener/custom
 * Body: { config: CustomScreenerConfig, limit?: number, scanLimit?: number }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const config = body.config as CustomScreenerConfig;
    const limit = Math.min(body.limit || 20, 30);
    const scanLimit = Math.min(body.scanLimit || 60, 80);

    if (!config || !config.filters || config.filters.length === 0) {
      return NextResponse.json(
        { error: "Minimal 1 filter diperlukan" },
        { status: 400 },
      );
    }

    const startTime = Date.now();
    const stocksToScan = POPULAR_STOCKS.slice(0, scanLimit);

    // Fetch quotes in batches
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

    // Map to custom screener stocks (basic data only, fundamental requires extra fetches)
    const customStocks: CustomScreenerStock[] = allQuotes.map((q) => ({
      ticker: q.ticker,
      code: q.code,
      name: q.name,
      sector: q.sector,
      price: q.price,
      changePct: q.changePct,
      pe: null,
      pb: null,
      dividendYield: null,
      roe: null,
      marketCap: null,
      volume: null,
      matchCount: 0,
      totalFilters: config.filters.length,
    }));

    const results = runCustomScreener(config, customStocks);

    return NextResponse.json({
      screen: "custom",
      config,
      description: describeCustomScreener(config),
      results: results.slice(0, limit),
      total: results.length,
      scanned: allQuotes.length,
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
    });
  } catch (error) {
    console.error("API /screener/custom error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Custom screener failed" },
      { status: 500 },
    );
  }
}
