"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Loader2, Grid3X3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { POPULAR_STOCKS } from "@/lib/popular-stocks";
import { getWatchlistItems } from "@/components/watchlist-button";

interface SectorStat {
  sector: string;
  avgChangePct: number;
  stockCount: number;
  isPersonal: boolean; // true if user has stocks in this sector
}

interface HeatmapStock {
  code: string;
  sector: string;
  changePct: number;
}

/**
 * Sector Heatmap — color-coded grid of all IDX sectors.
 *
 * Each tile: avg changePct of stocks in that sector (from user's watchlist
 * + portfolio + top 30 IDX). Personal sectors (where user has stocks)
 * get a subtle highlight.
 *
 * Color scale:
 *   - Bright red for sharp drops
 *   - Light red for mild drops
 *   - Neutral for flat
 *   - Light green for mild gains
 *   - Bright green for sharp gains
 */
export function SectorHeatmap() {
  const [sectors, setSectors] = useState<SectorStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Compute which sectors user has exposure to (watchlist + portfolio)
        // We use localStorage for watchlist, and just known tickers for portfolio
        const watchedTickers = new Set(
          getWatchlistItems().map((i) => i.ticker),
        );
        // Also include tickers from common portfolio — try to read portfolio storage
        let portfolioTickers = new Set<string>();
        try {
          const raw = localStorage.getItem("saham_portfolio");
          if (raw) {
            const tx = JSON.parse(raw);
            if (Array.isArray(tx)) {
              for (const t of tx) {
                if (t.ticker) portfolioTickers.add(t.ticker);
              }
            }
          }
        } catch {
          // ignore
        }
        const personalTickers = new Set([
          ...watchedTickers,
          ...portfolioTickers,
        ]);

        // Fetch top stocks to compute sector averages
        const tickers = POPULAR_STOCKS.slice(0, 40).map((s) => s.code);
        const results = await Promise.all(
          tickers.map(async (t): Promise<HeatmapStock | null> => {
            try {
              const res = await fetch(`/api/quick/${t}`);
              if (!res.ok) return null;
              const json = await res.json();
              return {
                code: t,
                sector: json.sector ?? "Lainnya",
                changePct: json.changePct ?? 0,
              };
            } catch {
              return null;
            }
          }),
        );

        const valid = results.filter((r): r is HeatmapStock => r !== null);
        if (cancelled) return;

        // Group by sector
        const bySector = new Map<string, { sum: number; count: number }>();
        for (const stock of valid) {
          const prev = bySector.get(stock.sector) ?? { sum: 0, count: 0 };
          bySector.set(stock.sector, {
            sum: prev.sum + stock.changePct,
            count: prev.count + 1,
          });
        }

        const stats: SectorStat[] = Array.from(bySector.entries())
          .map(([sector, { sum, count }]) => {
            // Check if user has any stock in this sector (watchlist + portfolio)
            const allInSector = POPULAR_STOCKS.filter(
              (p) => p.sector === sector,
            ).map((p) => p.code);
            const isPersonal = allInSector.some((t) => personalTickers.has(t));
            return {
              sector,
              avgChangePct: sum / count,
              stockCount: count,
              isPersonal,
            };
          })
          .sort((a, b) => b.avgChangePct - a.avgChangePct);

        setSectors(stats);
        setLoading(false);
      } catch (err) {
        console.error("Sector heatmap fetch failed:", err);
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Grid3X3 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">Sector Heatmap</h2>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Memuat performa sektor...
        </div>
      </Card>
    );
  }

  if (sectors.length === 0) return null;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Grid3X3 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">Sector Heatmap</h2>
        </div>
        <span className="text-[10px] text-muted-foreground italic">
          Rata-rata % perubahan hari ini
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {sectors.map((s) => (
          <SectorTile key={s.sector} sector={s} />
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-2 mt-3 text-[10px] text-muted-foreground">
        <span>−</span>
        <div className="flex h-2 w-32 rounded-full overflow-hidden">
          <div className="flex-1 bg-bear-600" />
          <div className="flex-1 bg-bear-400" />
          <div className="flex-1 bg-muted" />
          <div className="flex-1 bg-bull-400" />
          <div className="flex-1 bg-bull-600" />
        </div>
        <span>+</span>
      </div>
    </Card>
  );
}

function SectorTile({ sector }: { sector: SectorStat }) {
  const pct = sector.avgChangePct;
  // Color intensity based on |pct|
  const intensity = Math.min(Math.abs(pct) / 3, 1); // 0..1, capped at 3%

  const bgClass = isColorClass(pct, intensity);
  const textClass = intensity > 0.4 ? "text-white" : pct > 0 ? "text-bull-900 dark:text-bull-100" : pct < 0 ? "text-bear-900 dark:text-bear-100" : "text-foreground";

  return (
    <div
      className={cn(
        "rounded-lg p-2.5 border transition-all",
        bgClass,
        sector.isPersonal && "ring-2 ring-primary/40",
        textClass,
      )}
    >
      <div className="flex items-start justify-between gap-1 mb-0.5">
        <div className={cn("text-xs font-bold line-clamp-1 flex-1", textClass)}>
          {sector.sector}
        </div>
        {sector.isPersonal && (
          <span
            className="text-[8px] font-bold bg-primary text-primary-foreground px-1 rounded shrink-0"
            title="Ada saham kamu di sektor ini"
          >
            ★
          </span>
        )}
      </div>
      <div className={cn("text-lg font-black tabular-nums leading-none", textClass)}>
        {pct >= 0 ? "+" : ""}
        {pct.toFixed(2)}%
      </div>
      <div className={cn("text-[10px] mt-0.5 opacity-80", textClass)}>
        {sector.stockCount} saham
      </div>
    </div>
  );
}

/**
 * Pick background color class based on % change + intensity.
 * - intensity 0: gray (flat)
 * - intensity low: pale tint
 * - intensity high: bold red/green
 */
function isColorClass(pct: number, intensity: number): string {
  if (intensity < 0.05) {
    return "bg-muted/40 border-border";
  }
  if (pct > 0) {
    if (intensity < 0.3) return "bg-bull-100 dark:bg-bull-900/30 border-bull-300/50";
    if (intensity < 0.6) return "bg-bull-300 dark:bg-bull-700/40 border-bull-400";
    if (intensity < 0.85) return "bg-bull-500 dark:bg-bull-600/50 border-bull-600";
    return "bg-bull-600 dark:bg-bull-700/70 border-bull-700";
  }
  if (pct < 0) {
    if (intensity < 0.3) return "bg-bear-100 dark:bg-bear-900/30 border-bear-300/50";
    if (intensity < 0.6) return "bg-bear-300 dark:bg-bear-700/40 border-bear-400";
    if (intensity < 0.85) return "bg-bear-500 dark:bg-bear-600/50 border-bear-600";
    return "bg-bear-600 dark:bg-bear-700/70 border-bear-700";
  }
  return "bg-muted border-border";
}
