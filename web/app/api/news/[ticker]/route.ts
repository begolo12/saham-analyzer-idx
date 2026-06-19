import { NextRequest, NextResponse } from "next/server";
import { fetchNews, summarizeSentiment } from "@/lib/news";
import { fetchSummary, validateTicker } from "@/lib/yahoo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * GET /api/news/[ticker]?limit=15
 * Fetch news articles + sentiment analysis
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } },
) {
  try {
    const ticker = validateTicker(params.ticker);
    const code = ticker.replace(".JK", "");
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "15", 10);

    const summary = await fetchSummary(code);

    const articles = await fetchNews(code, summary.name, limit);
    const result = summarizeSentiment(articles);

    return NextResponse.json(result);
  } catch (error) {
    console.error("API /news error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch news",
      },
      { status: 500 },
    );
  }
}
