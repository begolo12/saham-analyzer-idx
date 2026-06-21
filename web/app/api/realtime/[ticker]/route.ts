import { NextRequest, NextResponse } from "next/server";
import { getRealtimeQuote } from "@/lib/realtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

/**
 * GET /api/realtime/[ticker]
 * Single-ticker real-time quote.
 * Example: /api/realtime/BBCA
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> },
) {
  const { ticker } = await params;
  const cleaned = ticker.toUpperCase().replace(".JK", "").trim();

  if (!cleaned || !/^[A-Z]{3,5}$/.test(cleaned)) {
    return NextResponse.json(
      { error: "Invalid ticker format" },
      { status: 400 },
    );
  }

  try {
    const quote = await getRealtimeQuote(cleaned);
    if (!quote) {
      return NextResponse.json(
        { error: `No data for ${cleaned}` },
        { status: 404 },
      );
    }

    return NextResponse.json(quote, {
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=120",
      },
    });
  } catch (err) {
    console.error(`[api/realtime/${cleaned}] error:`, err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
