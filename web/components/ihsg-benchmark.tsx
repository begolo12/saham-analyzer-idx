"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Loader2, Award, TrendingDown, Activity } from "lucide-react";
import { cn, formatIDR, formatPercent } from "@/lib/utils";

interface IHSGData {
  currentValue: number;
  change: number;
  changePct: number;
  /** 30-day indexed values (each / first × 100) for chart */
  indexedSeries: { date: string; value: number }[];
  loadedAt: number;
}

const CACHE_KEY = "saham_ihsg_cache";
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

function getCached(): IHSGData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as IHSGData;
    if (Date.now() - parsed.loadedAt > CACHE_TTL) return null;
    return parsed;
  } catch {
    return null;
  }
}

function setCache(data: IHSGData): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CACHE_KEY, JSON.stringify(data));
}

async function fetchIHSG(): Promise<IHSGData> {
  // IHSG index: ^JKSE on Yahoo Finance
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/%5EJKSE?range=1mo&interval=1d`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error("IHSG fetch failed");
  const data = await res.json();
  const result = data.chart?.result?.[0];
  if (!result) throw new Error("IHSG data empty");
  const closes: number[] = (result.indicators?.quote?.[0]?.close ?? []).filter(
    (c: unknown) => typeof c === "number",
  );
  const timestamps: number[] = result.timestamp ?? [];
  if (closes.length === 0) throw new Error("IHSG no closes");
  const currentValue = closes[closes.length - 1] ?? 0;
  const prevValue = closes[closes.length - 2] ?? currentValue;
  const change = currentValue - prevValue;
  const changePct = prevValue ? (change / prevValue) * 100 : 0;
  // Build indexed series (each / first * 100)
  const first = closes[0] || 1;
  const indexedSeries = closes.map((c, i) => ({
    date: timestamps[i]
      ? new Date(timestamps[i] * 1000).toISOString().slice(5, 10)
      : `${i}`,
    value: (c / first) * 100,
  }));
  return {
    currentValue,
    change,
    changePct,
    indexedSeries,
    loadedAt: Date.now(),
  };
}

interface IHSGBenchmarkProps {
  /** Portfolio value (cash + stock current value) for comparison */
  portfolioValue: number;
  /** Initial deposit (total topup - total withdraw) */
  initialDeposit: number;
}

/**
 * IHSG Benchmark Card — compare portfolio return vs IHSG index.
 * Shows portfolio % return vs IHSG 30-day return, plus outperformance badge.
 */
export function IHSGBenchmark({
  portfolioValue,
  initialDeposit,
}: IHSGBenchmarkProps) {
  const [ihsg, setIhsg] = useState<IHSGData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const cached = getCached();
    if (cached) {
      setIhsg(cached);
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const data = await fetchIHSG();
        if (cancelled) return;
        setCache(data);
        setIhsg(data);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError("Gagal memuat data IHSG");
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Portfolio return % since initial deposit
  const portfolioReturnPct =
    initialDeposit > 0
      ? ((portfolioValue - initialDeposit) / initialDeposit) * 100
      : 0;

  // IHSG 30-day return as proxy
  const ihsg30dReturnPct =
    ihsg && ihsg.indexedSeries.length > 1
      ? ihsg.indexedSeries[ihsg.indexedSeries.length - 1].value - 100
      : 0;

  const outperformance = portfolioReturnPct - ihsg30dReturnPct;
  const isOutperforming = outperformance >= 0;
  const isIhsgUp = ihsg ? ihsg.changePct >= 0 : false;

  if (loading) {
    return (
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-bold">vs IHSG (Benchmark)</h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Memuat data IHSG...
        </div>
      </Card>
    );
  }

  if (error || !ihsg) {
    return (
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-bold">vs IHSG (Benchmark)</h3>
        </div>
        <div className="text-xs text-muted-foreground">
          {error || "Data IHSG belum tersedia"}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="h-5 w-5 text-primary" />
        <h3 className="text-sm font-bold">vs IHSG (Benchmark Pasar)</h3>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div
          className={cn(
            "rounded-lg border-2 p-3",
            portfolioReturnPct >= 0
              ? "border-bull-500/30 bg-bull-50/30 dark:bg-bull-700/10"
              : "border-bear-500/30 bg-bear-50/30 dark:bg-bear-700/10",
          )}
        >
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
            Portfolio
          </div>
          <div
            className={cn(
              "text-2xl font-black tabular-nums mt-0.5",
              portfolioReturnPct >= 0
                ? "text-bull-700 dark:text-bull-500"
                : "text-bear-700 dark:text-bear-500",
            )}
          >
            {portfolioReturnPct >= 0 ? "+" : ""}
            {portfolioReturnPct.toFixed(2)}%
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            Modal: {formatIDR(initialDeposit)} → {formatIDR(portfolioValue)}
          </div>
        </div>

        <div
          className={cn(
            "rounded-lg border-2 p-3",
            ihsg30dReturnPct >= 0
              ? "border-bull-500/30 bg-bull-50/30 dark:bg-bull-700/10"
              : "border-bear-500/30 bg-bear-50/30 dark:bg-bear-700/10",
          )}
        >
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
            IHSG (30 hari)
          </div>
          <div
            className={cn(
              "text-2xl font-black tabular-nums mt-0.5",
              ihsg30dReturnPct >= 0
                ? "text-bull-700 dark:text-bull-500"
                : "text-bear-700 dark:text-bear-500",
            )}
          >
            {ihsg30dReturnPct >= 0 ? "+" : ""}
            {ihsg30dReturnPct.toFixed(2)}%
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            Saat ini: {ihsg.currentValue.toFixed(2)}
            {isIhsgUp ? " 📈" : " 📉"}
          </div>
        </div>
      </div>

      <div
        className={cn(
          "rounded-lg p-3 flex items-center gap-3",
          isOutperforming
            ? "bg-gradient-to-r from-bull-100 to-bull-50 dark:from-bull-700/20 dark:to-bull-700/5"
            : "bg-gradient-to-r from-bear-100 to-bear-50 dark:from-bear-700/20 dark:to-bear-700/5",
        )}
      >
        {isOutperforming ? (
          <Award className="h-5 w-5 text-bull-600 shrink-0" />
        ) : (
          <TrendingDown className="h-5 w-5 text-bear-600 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold">
            {isOutperforming
              ? "🎉 Anda outperform pasar!"
              : "Pasar lebih baik dari Anda"}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {isOutperforming ? "+" : ""}
            {outperformance.toFixed(2)}% lebih{" "}
            {isOutperforming ? "tinggi" : "rendah"} dari IHSG 30 hari
          </div>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground mt-2 italic text-center">
        📊 Benchmark menggunakan return IHSG 30 hari sebagai proxy pasar. Data
        real-time dari Yahoo Finance.
      </p>
    </Card>
  );
}
