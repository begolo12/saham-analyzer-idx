import { NextRequest, NextResponse } from "next/server";
import { fetchSummary, fetchHistorical, validateTicker } from "@/lib/yahoo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/quick/[ticker]?period=1y
 * Quick stock data for watchlist - just summary + last 30 days
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } },
) {
  try {
    const ticker = validateTicker(params.ticker);

    const [summary, historical] = await Promise.all([
      fetchSummary(ticker),
      fetchHistorical(ticker, "3mo"),
    ]);

    const lastPrice = historical[historical.length - 1]?.close ?? summary.currentPrice;
    const prevPrice = historical[historical.length - 2]?.close ?? summary.previousClose;

    let change: number | null = null;
    let changePct: number | null = null;

    if (lastPrice && prevPrice && prevPrice !== 0) {
      change = lastPrice - prevPrice;
      changePct = (change / prevPrice) * 100;
    }

    return NextResponse.json({
      summary,
      lastPrice,
      previousClose: prevPrice,
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
