import { NextRequest, NextResponse } from "next/server";
import { fetchRealtimeQuotes } from "@/lib/realtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * GET /api/realtime?tickers=BBCA,BBRI,TLKM
 * Multi-ticker real-time quote via TradingView scanner.
 * Query: ?tickers=BBCA,BBRI (comma-separated, max 50)
 *
 * Returns: { quotes: RealtimeQuote[], fetchedAt: ISO, count: number }
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tickersParam = searchParams.get("tickers");

  if (!tickersParam) {
    return NextResponse.json(
      { error: "Missing 'tickers' query param" },
      { status: 400 },
    );
  }

  const tickers = tickersParam
    .split(",")
    .map((t) => t.trim().toUpperCase().replace(".JK", ""))
    .filter(Boolean)
    .slice(0, 50);

  if (tickers.length === 0) {
    return NextResponse.json(
      { error: "No valid tickers" },
      { status: 400 },
    );
  }

  try {
    const quotesMap = await fetchRealtimeQuotes(tickers);
    const quotes = Array.from(quotesMap.values());
    const fetchedAt = quotes[0]?.fetchedAt ?? new Date().toISOString();

    return NextResponse.json(
      { quotes, count: quotes.length, fetchedAt },
      {
        headers: {
          "Cache-Control": "public, max-age=60, stale-while-revalidate=120",
        },
      },
    );
  } catch (err) {
    console.error("[api/realtime] error:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Unknown error",
        quotes: [],
        count: 0,
        fetchedAt: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
