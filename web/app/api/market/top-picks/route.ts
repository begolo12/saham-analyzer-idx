import { NextRequest, NextResponse } from "next/server";
import { POPULAR_STOCKS } from "@/lib/popular-stocks";
import { fetchSummary, fetchHistorical, validateTicker } from "@/lib/yahoo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * GET /api/market/top-picks
 * Top 5 sinyal BUY confidence tertinggi hari ini.
 * Strategi v2.1: mock recommendation dari changePct + volume spike.
 */

function mockActionFromChange(changePct: number, volume: number, avgVolume?: number): {
  action: "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "STRONG_SELL";
  confidence: number;
} {
  const volSpike = avgVolume && avgVolume > 0 ? volume / avgVolume : 1;
  const volBonus = Math.min(15, Math.max(0, (volSpike - 1) * 12));

  let action: "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "STRONG_SELL" = "HOLD";
  let confidence = 35 + volBonus;

  if (changePct >= 4) {
    action = "STRONG_BUY"; confidence = 75 + volBonus;
  } else if (changePct >= 1.5) {
    action = "BUY"; confidence = 60 + volBonus;
  } else if (changePct <= -4) {
    action = "STRONG_SELL"; confidence = 75 + volBonus;
  } else if (changePct <= -1.5) {
    action = "SELL"; confidence = 60 + volBonus;
  } else if (Math.abs(changePct) >= 0.5) {
    confidence = 45 + volBonus;
  }

  return { action, confidence: Math.min(95, Math.round(confidence)) };
}

export async function GET(_request: NextRequest) {
  try {
    // Only query top 10 to keep latency under 10s
    const candidates = POPULAR_STOCKS.slice(0, 10);

    const fetchOne = async (stock: (typeof candidates)[0]) => {
      const [summary, historical] = await Promise.all([
        fetchSummary(stock.code),
        fetchHistorical(stock.code, "1mo"),
      ]);

      const lastPrice = historical[historical.length - 1]?.close ?? summary.currentPrice;
      const prevPrice = historical[historical.length - 2]?.close ?? summary.previousClose;

      let changePct = 0;
      if (lastPrice && prevPrice && prevPrice !== 0) {
        changePct = ((lastPrice - prevPrice) / prevPrice) * 100;
      }

      const { action, confidence } = mockActionFromChange(
        changePct,
        summary.volume ?? 0,
        summary.averageVolume ?? undefined,
      );

      return {
        ticker: stock.ticker,
        code: stock.code,
        name: summary.name,
        sector: stock.sector,
        price: lastPrice,
        changePct,
        action,
        confidence,
      };
    };

    // Race: fetch all in parallel, filter successful
    const results = await Promise.allSettled(candidates.map(fetchOne));

    const picks = results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
      .map((r) => r.value)
      .filter((s) => s.price !== null && s.price !== undefined);

    const buyPicks = picks
      .filter((p) => p.action === "BUY" || p.action === "STRONG_BUY")
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3);

    const sellPicks = picks
      .filter((p) => p.action === "SELL" || p.action === "STRONG_SELL")
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 2);

    const topPicks = [...buyPicks, ...sellPicks]
      .slice(0, 5)
      .map((p, idx) => ({ ...p, rank: idx + 1 }));

    return NextResponse.json({
      picks: topPicks,
      cached_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("API /market/top-picks error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch", picks: [] },
      { status: 200 }, // 200 with empty picks — graceful degradation
    );
  }
}
