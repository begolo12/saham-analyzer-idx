"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Coins,
  Rocket,
  Sparkles,
  TrendingDown,
  Filter,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatIDR, formatPercent } from "@/lib/utils";

interface FundamentalsResult {
  ticker: string;
  code: string;
  name: string;
  sector: string;
  price: number;
  changePct: number;
  marketCap: number | null;
  trailingPE: number | null;
  priceToBook: number | null;
  returnOnEquity: number | null;
  profitMargins: number | null;
  revenueGrowth: number | null;
  earningsGrowth: number | null;
  dividendYield: number | null;
  debtToEquity: number | null;
  marketCapBucket: "large" | "mid" | "small" | null;
}

interface ScreenerResponse {
  results: FundamentalsResult[];
  total: number;
  scanned: number;
  presetName: string;
  presetDescription: string;
  duration?: number;
  cached?: boolean;
}

type Preset = "value" | "dividend" | "growth" | "quality" | "contrarian";

interface PresetConfig {
  id: Preset;
  name: string;
  description: string;
  icon: React.ReactNode;
}

const PRESETS: PresetConfig[] = [
  {
    id: "value",
    name: "Value",
    description: "P/E & P/B rendah, ROE tinggi",
    icon: <Sparkles className="h-4 w-4" />,
  },
  {
    id: "dividend",
    name: "Dividend",
    description: "Yield tinggi (>3%)",
    icon: <Coins className="h-4 w-4" />,
  },
  {
    id: "growth",
    name: "Growth",
    description: "Revenue & earnings naik",
    icon: <Rocket className="h-4 w-4" />,
  },
  {
    id: "quality",
    name: "Quality",
    description: "ROE tinggi, utang rendah",
    icon: <Sparkles className="h-4 w-4" />,
  },
  {
    id: "contrarian",
    name: "Contrarian",
    description: "Turun >10% (oversold)",
    icon: <TrendingDown className="h-4 w-4" />,
  },
];

/**
 * Fundamental Screener — jawab "saham apa yang akan dibeli".
 *
 * Tab preset: Value / Dividend / Growth / Quality / Contrarian
 * Tampilkan top 8 matches dengan metrik fundamental.
 */
export function FundamentalScreener() {
  const [preset, setPreset] = useState<Preset>("value");
  const [results, setResults] = useState<FundamentalsResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFallback, setIsFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(
          `/api/screener/fundamental?preset=${preset}&limit=8&scanLimit=40`,
        );
        if (!res.ok) throw new Error("Screener failed");
        const data: ScreenerResponse = await res.json();
        if (cancelled) return;
        setResults(data.results ?? []);
        setTotal(data.total ?? 0);
        setDuration(data.duration ?? 0);
        // If results returned but total is 0, it means fallback
        setIsFallback((data.total ?? 0) === 0 && (data.results ?? []).length > 0);
        setLoading(false);
      } catch (err) {
        console.error("Fundamental screener failed:", err);
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [preset]);

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">Saham Fundamental Bagus</h2>
        </div>
        <Link
          href="/screener"
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          Custom filter →
        </Link>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1 mb-3">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPreset(p.id)}
            className={cn(
              "shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-colors flex items-center gap-1.5",
              preset === p.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-accent",
            )}
          >
            {p.icon}
            {p.name}
          </button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground mb-3">
        {PRESETS.find((p) => p.id === preset)?.description}
        {!loading && total > 0 && (
          <>
            {" "}
            <span className="text-foreground font-medium">
              · {total} saham match
            </span>
            {duration > 0 && (
              <span className="text-[10px]"> · {Math.round(duration / 1000)}s</span>
            )}
          </>
        )}
        {isFallback && (
          <span className="text-amber-600 ml-1">
            (data fundamental IDX di Yahoo terbatas — menampilkan top by market cap)
          </span>
        )}
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" />
          Scanning fundamentals...
        </div>
      ) : results.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-6">
          Belum ada saham yang match filter.
        </div>
      ) : (
        <div className="space-y-1.5">
          {results.map((s) => (
            <FundamentalRow key={s.code} stock={s} preset={preset} />
          ))}
        </div>
      )}
    </Card>
  );
}

function FundamentalRow({
  stock,
  preset,
}: {
  stock: FundamentalsResult;
  preset: Preset;
}) {
  const highlightMetric = (() => {
    switch (preset) {
      case "value":
        return {
          label: "P/E",
          value: stock.trailingPE?.toFixed(1) ?? "—",
          good: stock.trailingPE !== null && stock.trailingPE < 12,
        };
      case "dividend":
        return {
          label: "Yield",
          value: stock.dividendYield
            ? `${(stock.dividendYield * 100).toFixed(1)}%`
            : "—",
          good: stock.dividendYield !== null && stock.dividendYield > 0.04,
        };
      case "growth":
        return {
          label: "Growth",
          value: stock.revenueGrowth
            ? `${(stock.revenueGrowth * 100).toFixed(0)}%`
            : stock.earningsGrowth
              ? `+${(stock.earningsGrowth * 100).toFixed(0)}%`
              : "—",
          good:
            (stock.revenueGrowth !== null && stock.revenueGrowth > 0.15) ||
            (stock.earningsGrowth !== null && stock.earningsGrowth > 0.15),
        };
      case "quality":
        return {
          label: "ROE",
          value: stock.returnOnEquity
            ? `${(stock.returnOnEquity * 100).toFixed(0)}%`
            : "—",
          good: stock.returnOnEquity !== null && stock.returnOnEquity > 0.18,
        };
      case "contrarian":
        return {
          label: "Today",
          value: `${stock.changePct.toFixed(1)}%`,
          good: false,
        };
    }
  })();

  return (
    <Link
      href={`/stock/${stock.code}`}
      className="block rounded-lg border bg-card p-2.5 hover:bg-accent transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm">{stock.code}</span>
            <Badge variant="outline" className="text-[10px]">
              {stock.sector}
            </Badge>
          </div>
          <div className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
            {stock.name}
          </div>
        </div>

        <div className="text-center shrink-0 min-w-[60px]">
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
            {highlightMetric.label}
          </div>
          <div
            className={cn(
              "text-sm font-black tabular-nums",
              highlightMetric.good ? "text-bull-600" : "text-foreground",
            )}
          >
            {highlightMetric.value}
          </div>
        </div>

        <div className="text-right shrink-0 min-w-[80px]">
          <div className="text-sm font-bold tabular-nums">
            {formatIDR(stock.price)}
          </div>
          <div
            className={cn(
              "text-[10px] font-bold tabular-nums",
              stock.changePct >= 0 ? "text-bull-600" : "text-bear-600",
            )}
          >
            {formatPercent(stock.changePct)}
          </div>
        </div>

        <ChevronRight className="h-4 w-4 -rotate-90 text-muted-foreground shrink-0" />
      </div>
    </Link>
  );
}
