import { NextRequest, NextResponse } from "next/server";
import { fetchSummary, fetchHistorical, validateTicker } from "@/lib/yahoo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/quick/[ticker]
 * Quick stock data for watchlist
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

    return NextResponse.json({
      name: summary.name,
      sector: summary.sector,
      price: lastPrice,
      change,
      changePct,
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
