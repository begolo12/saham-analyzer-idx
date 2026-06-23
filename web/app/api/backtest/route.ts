import { NextRequest, NextResponse } from "next/server";
import { runBacktest, compareWithIHSG, type BacktestConfig } from "@/lib/backtest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/backtest
 * Runs the backtesting simulation on the server-side to bypass CORS restriction.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ticker, strategy, period, initialCapital } = body;

    if (!ticker || !strategy || !period || initialCapital === undefined) {
      return NextResponse.json(
        { error: "Missing required config parameters (ticker, strategy, period, initialCapital)" },
        { status: 400 }
      );
    }

    const config: BacktestConfig = {
      ticker: ticker.toUpperCase().replace(".JK", ""),
      strategy,
      period,
      initialCapital: parseFloat(initialCapital) || 10_000_000,
    };

    const [btResult, ihsg] = await Promise.all([
      runBacktest(config),
      compareWithIHSG(period),
    ]);

    return NextResponse.json({
      result: {
        ...btResult,
        outperformance: Math.round((btResult.totalReturnPct - ihsg.ihsgReturnPct) * 100) / 100,
      },
      ihsgReturn: ihsg.ihsgReturnPct,
    });
  } catch (error) {
    console.error("Backtest API error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to run backtest",
      },
      { status: 500 }
    );
  }
}
