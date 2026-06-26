import { NextRequest, NextResponse } from "next/server";
import { fetchHistorical, fetchSummary, validateTicker } from "@/lib/yahoo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/stock/[ticker]?period=1y
 * Returns stock summary + historical data
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } },
) {
  try {
    const ticker = validateTicker(params.ticker);
    const { searchParams } = new URL(request.url);
    const period = (searchParams.get("period") || "1y") as
      | "1mo"
      | "3mo"
      | "6mo"
      | "1y"
      | "2y"
      | "5y";

    const [summary, historical] = await Promise.all([
      fetchSummary(ticker),
      fetchHistorical(ticker, period),
    ]);

    return NextResponse.json({
      summary,
      historical,
      cached_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("API /stock error:", error);
    const message =
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : error instanceof Error
          ? error.message
          : "Failed to fetch stock data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
