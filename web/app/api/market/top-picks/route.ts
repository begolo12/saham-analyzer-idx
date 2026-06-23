import { NextRequest, NextResponse } from "next/server";
import { POPULAR_STOCKS } from "@/lib/popular-stocks";
import { fetchSummary, fetchHistorical, validateTicker } from "@/lib/yahoo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/market/top-picks
 * Top 5 sinyal BUY confidence tertinggi hari ini.
 *
 * Strategi v2.1: gunakan market overview sebagai basis, lalu derive mock
 * recommendation score berdasarkan magnitude perubahan + volume vs average.
 * Ini memberi signal yang berguna untuk daily-use tanpa menjalankan heavy
 * recommender untuk semua ticker (yang akan butuh 30+ detik).
 *
 * TODO F2/F3: Ganti dengan actual recommender output ketika multi-horizon
 * engine sudah ready di backend.
 */

function mockActionFromChange(changePct: number, volume: number, avgVolume?: number): {
  action: "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "STRONG_SELL";
  confidence: number;
} {
  // Volume spike multiplier — strong confirmation signal
  const volSpike = avgVolume && avgVolume > 0 ? volume / avgVolume : 1;
  const volBonus = Math.min(15, Math.max(0, (volSpike - 1) * 12));

  // Base score from change magnitude
  const magnitude = Math.abs(changePct);
  let action: "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "STRONG_SELL" = "HOLD";
  let confidence = 35 + volBonus;

  if (changePct >= 4) {
    action = "STRONG_BUY";
    confidence = 75 + volBonus;
  } else if (changePct >= 1.5) {
    action = "BUY";
    confidence = 60 + volBonus;
  } else if (changePct <= -4) {
    action = "STRONG_SELL";
    confidence = 75 + volBonus;
  } else if (changePct <= -1.5) {
    action = "SELL";
    confidence = 60 + volBonus;
  } else if (magnitude >= 0.5) {
    action = "HOLD";
    confidence = 45 + volBonus;
  }

  return { action, confidence: Math.min(95, Math.round(confidence)) };
}

export async function GET(_request: NextRequest) {
  try {
    const candidates = POPULAR_STOCKS.slice(0, 18);
    const results = await Promise.allSettled(
      candidates.map(async (stock) => {
        const ticker = validateTicker(stock.code);
        const [summary, historical] = await Promise.all([
          fetchSummary(stock.code),
          fetchHistorical(stock.code, "1mo"),
        ]);

        const lastPrice =
          historical[historical.length - 1]?.close ?? summary.currentPrice;
        const prevPrice =
          historical[historical.length - 2]?.close ?? summary.previousClose;

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
      }),
    );

    const picks = results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
      .map((r) => r.value)
      .filter((s) => s.price !== null && s.price !== undefined);

    // Sort by confidence desc (BUY confidence > SELL confidence for visibility)
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
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch top picks",
        picks: [],
      },
      { status: 500 },
    );
  }
}
