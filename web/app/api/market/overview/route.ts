import { NextRequest, NextResponse } from "next/server";
import { POPULAR_STOCKS } from "@/lib/popular-stocks";
import { fetchSummary, fetchHistorical, validateTicker } from "@/lib/yahoo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/market/overview
 * Quick market overview of popular stocks
 */
export async function GET(_request: NextRequest) {
  try {
    const topStocks = POPULAR_STOCKS.slice(0, 8);
    const results = await Promise.allSettled(
      topStocks.map(async (stock) => {
        const ticker = validateTicker(stock.code);
        const [summary, historical] = await Promise.all([
          fetchSummary(stock.code),
          fetchHistorical(stock.code, "5d"),
        ]);

        const lastPrice =
          historical[historical.length - 1]?.close ?? summary.currentPrice;
        const prevPrice =
          historical[historical.length - 2]?.close ?? summary.previousClose;

        let changePct = 0;
        if (lastPrice && prevPrice && prevPrice !== 0) {
          changePct = ((lastPrice - prevPrice) / prevPrice) * 100;
        }

        return {
          ticker: stock.ticker,
          code: stock.code,
          name: summary.name,
          sector: stock.sector,
          price: lastPrice,
          change:
            lastPrice && prevPrice ? lastPrice - prevPrice : null,
          changePct,
        };
      }),
    );

    const stocks = results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
      .map((r) => r.value)
      .filter((s) => s.price !== null && s.price !== undefined);

    return NextResponse.json({ stocks, cached_at: new Date().toISOString() });
  } catch (error) {
    console.error("API /market/overview error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch market",
      },
      { status: 500 },
    );
  }
}
