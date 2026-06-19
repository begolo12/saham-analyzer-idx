import { NextRequest, NextResponse } from "next/server";
import { fetchSummary, fetchHistorical, validateTicker } from "@/lib/yahoo";
import { POPULAR_STOCKS, getStockByCode } from "@/lib/popular-stocks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/quick/[ticker]
 * Quick stock data for watchlist + portfolio + screener cards.
 * Includes sector from popular-stocks.ts fallback for reliability.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { ticker: string } },
) {
  try {
    const ticker = validateTicker(params.ticker);

    const [summary, historical] = await Promise.all([
      fetchSummary(ticker),
      fetchHistorical(ticker, "1mo"),
    ]);

    const lastPrice =
      historical[historical.length - 1]?.close ?? summary.currentPrice;
    const prevPrice =
      historical[historical.length - 2]?.close ?? summary.previousClose;

    let change: number | null = null;
    let changePct: number | null = null;

    if (lastPrice && prevPrice && prevPrice !== 0) {
      change = lastPrice - prevPrice;
      changePct = (change / prevPrice) * 100;
    }

    // Sector fallback: try static list first, then summary, then "N/A"
    const staticStock = getStockByCode(ticker.replace(".JK", ""));
    const sector =
      staticStock?.sector ?? summary.sector ?? "Lainnya";

    // Sparkline data — last 30 closes (used by watchlist cards)
    const recentCloses: number[] = historical
      .slice(-30)
      .map((p) => Math.round(p.close));

    return NextResponse.json({
      name: summary.name,
      ticker: summary.ticker,
      code: summary.code,
      sector,
      price: lastPrice,
      previousClose: prevPrice,
      change,
      changePct,
      // Extra info that might be useful
      dayHigh: summary.dayHigh,
      dayLow: summary.dayLow,
      volume: summary.volume,
      fiftyTwoWeekHigh: summary.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: summary.fiftyTwoWeekLow,
      recentCloses,
    });
  } catch (error) {
    console.error("API /quick error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch",
      },
      { status: 500 },
    );
  }
}