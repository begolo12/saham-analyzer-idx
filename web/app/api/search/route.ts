import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

interface YahooSearchResponse {
  explains: any[];
  count: number;
  quotes: Array<{
    exchange: string;
    shortname?: string;
    longname?: string;
    quoteType: string;
    symbol: string;
    sector?: string;
    sectorDisp?: string;
    industry?: string;
    industryDisp?: string;
    exchDisp?: string;
  }>;
  news: any[];
}

export interface SearchResult {
  ticker: string; // Format Yahoo (e.g., BBCA.JK)
  code: string; // Display code (BBCA)
  name: string;
  sector: string;
  exchange: string;
}

/**
 * GET /api/search?q=BBCA&limit=20
 * Search IDX stocks via Yahoo Finance search API.
 * Returns EQUITY type results from Jakarta (JKT) exchange.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get("q") || "").trim();
    const limit = Math.min(parseInt(searchParams.get("limit") || "30", 10), 50);

    if (!query) {
      return NextResponse.json({ results: [], query: "" });
    }

    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=${limit}&newsCount=0`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json",
        "Accept-Language": "id-ID,id;q=0.9,en;q=0.8",
      },
      signal: controller.signal,
      next: { revalidate: 3600 }, // 1 hour cache
    });
    clearTimeout(timeout);

    if (!res.ok) {
      // Fallback: return empty results
      return NextResponse.json({
        results: [],
        query,
        warning: "Yahoo Finance search unavailable",
      });
    }

    const data: YahooSearchResponse = await res.json();

    // Filter hanya EQUITY dari Jakarta (JKT)
    const idxResults: SearchResult[] = (data.quotes || [])
      .filter(
        (q) =>
          q.exchange === "JKT" &&
          q.quoteType === "EQUITY" &&
          q.symbol.endsWith(".JK"),
      )
      .map((q) => ({
        ticker: q.symbol,
        code: q.symbol.replace(".JK", ""),
        name: q.longname || q.shortname || q.symbol.replace(".JK", ""),
        sector: q.sectorDisp || q.sector || "Lainnya",
        exchange: q.exchDisp || q.exchange,
      }))
      .slice(0, limit);

    return NextResponse.json({
      results: idxResults,
      query,
      total: idxResults.length,
    });
  } catch (error) {
    console.error("API /search error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Search failed",
        results: [],
      },
      { status: 500 },
    );
  }
}
