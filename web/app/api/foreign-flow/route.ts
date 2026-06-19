import { NextResponse } from "next/server";
import { getForeignFlowProxy } from "@/lib/foreign-flow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  try {
    const data = await getForeignFlowProxy();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, max-age=300" },
    });
  } catch (err) {
    console.error("[foreign-flow] error:", err);
    return NextResponse.json(
      {
        error: "Failed to fetch foreign flow",
        netBuy: [],
        netSell: [],
        fetchedAt: new Date().toISOString(),
        dataSource: "error",
      },
      { status: 500 },
    );
  }
}
