import { NextRequest, NextResponse } from "next/server";
import { POPULAR_STOCKS } from "@/lib/popular-stocks";
import {
  fetchSummary,
  type StockSummary,
} from "@/lib/yahoo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

// Cache (5 minutes) — fundamentals change slowly
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

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

interface FundamentalsResult {
  ticker: string;
  code: string;
  name: string;
  sector: string;
  price: number;
  changePct: number;
  marketCap: number | null;
  trailingPE: number | null;
  forwardPE: number | null;
  priceToBook: number | null;
  returnOnEquity: number | null;
  profitMargins: number | null;
  revenueGrowth: number | null;
  earningsGrowth: number | null;
  dividendYield: number | null;
  debtToEquity: number | null;
  currentRatio: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  volume: number | null;
  marketCapBucket: "large" | "mid" | "small" | null;
}

function bucketMarketCap(
  mc: number | null,
): "large" | "mid" | "small" | null {
  if (!mc || mc <= 0) return null;
  if (mc >= 10_000_000_000_000) return "large"; // > 10T IDR
  if (mc >= 1_000_000_000_000) return "mid"; // 1T-10T
  return "small";
}

interface PresetFilters {
  name: string;
  description: string;
  filter: (s: FundamentalsResult) => boolean;
  sortBy: keyof FundamentalsResult;
  sortDir: "asc" | "desc";
}

const PRESETS: Record<string, PresetFilters> = {
  value: {
    name: "💎 Value (Undervalued)",
    description: "P/E & P/B rendah (murah) tapi ROE tinggi (profitable)",
    filter: (s) => {
      // At least 2 of 3 criteria must match
      let count = 0;
      if (s.trailingPE !== null && s.trailingPE > 0 && s.trailingPE < 25) count++;
      if (s.priceToBook !== null && s.priceToBook > 0 && s.priceToBook < 3) count++;
      if (s.returnOnEquity !== null && s.returnOnEquity > 0.08) count++;
      return count >= 2;
    },
    sortBy: "trailingPE",
    sortDir: "asc",
  },
  dividend: {
    name: "💰 Dividend Kings",
    description: "Dividen yield tinggi (> 2%)",
    filter: (s) => s.dividendYield !== null && s.dividendYield > 0.02,
    sortBy: "dividendYield",
    sortDir: "desc",
  },
  growth: {
    name: "🚀 Growth Stocks",
    description: "Revenue & earnings growth tinggi",
    filter: (s) => {
      const rev = s.revenueGrowth !== null && s.revenueGrowth > 0.05;
      const earn = s.earningsGrowth !== null && s.earningsGrowth > 0.05;
      return rev || earn;
    },
    sortBy: "revenueGrowth",
    sortDir: "desc",
  },
  quality: {
    name: "✨ Quality Compounders",
    description: "ROE tinggi, margin bagus",
    filter: (s) => {
      // At least 1 of 2 main criteria
      const roeOk = s.returnOnEquity !== null && s.returnOnEquity > 0.12;
      const marginOk = s.profitMargins !== null && s.profitMargins > 0.05;
      return roeOk || marginOk;
    },
    sortBy: "returnOnEquity",
    sortDir: "desc",
  },
  contrarian: {
    name: "📉 Contrarian (down > 5%)",
    description: "Saham yang turun tajam, mungkin oversold",
    filter: (s) => s.changePct < -5,
    sortBy: "changePct",
    sortDir: "asc",
  },
};

/**
 * GET /api/screener/fundamental
 *   ?preset=value|dividend|growth|quality|contrarian
 *   ?peMax=15&pbMax=2&roeMin=10&yieldMin=3&marketCap=large
 *
 * Returns top 30 stocks matching fundamental criteria.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const preset = searchParams.get("preset");
    const peMax = searchParams.get("peMax");
    const pbMax = searchParams.get("pbMax");
    const roeMin = searchParams.get("roeMin");
    const yieldMin = searchParams.get("yieldMin");
    const marketCapFilter = searchParams.get("marketCap");
    const limit = Math.min(parseInt(searchParams.get("limit") || "30", 10), 50);
    const scanLimit = Math.min(
      parseInt(searchParams.get("scanLimit") || "50", 10),
      80,
    );

    const cacheKey = `fundamental:${preset || "custom"}:${peMax}:${pbMax}:${roeMin}:${yieldMin}:${marketCapFilter}:${limit}:${scanLimit}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return NextResponse.json({ ...cached, cached: true });
    }

    // Determine which preset (or custom) to use
    let filterFn: (s: FundamentalsResult) => boolean;
    let sortBy: keyof FundamentalsResult = "marketCap";
    let sortDir: "asc" | "desc" = "desc";
    let presetName = "Custom Filter";
    let presetDescription = "";

    if (preset && PRESETS[preset]) {
      const p = PRESETS[preset];
      filterFn = p.filter;
      sortBy = p.sortBy;
      sortDir = p.sortDir;
      presetName = p.name;
      presetDescription = p.description;
    } else {
      // Custom filter
      const peMaxN = peMax ? parseFloat(peMax) : null;
      const pbMaxN = pbMax ? parseFloat(pbMax) : null;
      const roeMinN = roeMin ? parseFloat(roeMin) : null;
      const yieldMinN = yieldMin ? parseFloat(yieldMin) : null;

      filterFn = (s) => {
        if (peMaxN !== null) {
          if (s.trailingPE === null || s.trailingPE <= 0 || s.trailingPE > peMaxN)
            return false;
        }
        if (pbMaxN !== null) {
          if (s.priceToBook === null || s.priceToBook <= 0 || s.priceToBook > pbMaxN)
            return false;
        }
        if (roeMinN !== null) {
          if (s.returnOnEquity === null || s.returnOnEquity < roeMinN / 100)
            return false;
        }
        if (yieldMinN !== null) {
          if (s.dividendYield === null || s.dividendYield < yieldMinN / 100)
            return false;
        }
        if (marketCapFilter) {
          if (s.marketCapBucket !== marketCapFilter) return false;
        }
        return true;
      };
    }

    const startTime = Date.now();
    const stocksToScan = POPULAR_STOCKS.slice(0, scanLimit);

    // Fetch summaries in batches of 5 (heavier than chart calls)
    const allSummaries: FundamentalsResult[] = [];
    for (let i = 0; i < stocksToScan.length; i += 5) {
      const batch = stocksToScan.slice(i, i + 5);
      const batchResults = await Promise.allSettled(
        batch.map(async (stock): Promise<FundamentalsResult | null> => {
          try {
            // Fetch summary (fundamentals) + chart (today change) in parallel
            const [summary, chartRes] = await Promise.all([
              fetchSummary(stock.code),
              fetch(
                `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(stock.code + ".JK")}?range=5d&interval=1d`,
                { next: { revalidate: 300 } },
              ).then((r) => (r.ok ? r.json() : null)).catch(() => null),
            ]);
            const staticStock = POPULAR_STOCKS.find(
              (s) => s.code === stock.code,
            );

            // Extract change from chart data
            let changePct = 0;
            let price = summary.currentPrice ?? 0;
            if (chartRes?.chart?.result?.[0]) {
              const closes = chartRes.chart.result[0].indicators?.quote?.[0]?.close ?? [];
              const validCloses = closes.filter((c: any) => typeof c === "number");
              const lastClose = validCloses[validCloses.length - 1] ?? null;
              const prevClose = validCloses[validCloses.length - 2] ?? null;
              if (lastClose && prevClose) {
                price = lastClose;
                changePct = ((lastClose - prevClose) / prevClose) * 100;
              }
            }

            return {
              ticker: `${stock.code}.JK`,
              code: stock.code,
              name: summary.name || staticStock?.name || stock.code,
              sector: staticStock?.sector || "Lainnya",
              price,
              changePct,
              marketCap: summary.marketCap,
              trailingPE: summary.trailingPE,
              forwardPE: summary.forwardPE,
              priceToBook: summary.priceToBook,
              returnOnEquity: summary.returnOnEquity,
              profitMargins: summary.profitMargins,
              revenueGrowth: summary.revenueGrowth,
              earningsGrowth: summary.earningsGrowth,
              dividendYield: summary.dividendYield,
              debtToEquity: summary.debtToEquity,
              currentRatio: summary.currentRatio,
              fiftyTwoWeekHigh: summary.fiftyTwoWeekHigh,
              fiftyTwoWeekLow: summary.fiftyTwoWeekLow,
              volume: summary.volume,
              marketCapBucket: bucketMarketCap(summary.marketCap),
            };
          } catch {
            return null;
          }
        }),
      );
      for (const r of batchResults) {
        if (r.status === "fulfilled" && r.value) allSummaries.push(r.value);
      }
      if (i + 5 < stocksToScan.length) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    // Apply filter
    let filtered = allSummaries.filter(filterFn);

    // Fallback: if no matches but data exists, return top 5 by market cap
    // so user always sees something useful
    if (filtered.length === 0 && allSummaries.length > 0) {
      filtered = allSummaries.slice().sort((a, b) => {
        const va = a.marketCap ?? 0;
        const vb = b.marketCap ?? 0;
        return vb - va;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      const va = (a[sortBy] as number | null) ?? 0;
      const vb = (b[sortBy] as number | null) ?? 0;
      return sortDir === "asc" ? va - vb : vb - va;
    });

    const results = filtered.slice(0, limit);

    const result = {
      preset: preset ?? "custom",
      presetName,
      presetDescription,
      results,
      total: filtered.length,
      scanned: stocksToScan.length,
      filters: { peMax, pbMax, roeMin, yieldMin, marketCap: marketCapFilter },
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
    };

    if (results.length > 0) setCache(cacheKey, result);
    return NextResponse.json({ ...result, cached: false });
  } catch (error) {
    console.error("API /screener/fundamental error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Screener failed" },
      { status: 500 },
    );
  }
}
