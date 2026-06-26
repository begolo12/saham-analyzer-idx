import { NextRequest, NextResponse } from "next/server";
import { fetchHistorical } from "@/lib/yahoo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/ihsg
 * Returns IHSG historical closing prices for benchmark comparison.
 * Query params: period (1mo|3mo|6mo|1y, default 3mo)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = (searchParams.get("period") || "3mo") as
      | "1mo"
      | "3mo"
      | "6mo"
      | "1y";

    const prices = await fetchHistorical("^JKSE", period, "1d");

    const data = prices.map((p) => ({
      date: p.date,
      close: p.close,
    }));

    return NextResponse.json({ data, period });
  } catch (error) {
    console.error("API /ihsg error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch IHSG data",
      },
      { status: 500 },
    );
  }
}
