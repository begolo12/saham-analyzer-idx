"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Scale,
  Plus,
  X,
  Loader2,
  TrendingUp,
  TrendingDown,
  Check,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn, formatIDR, formatPercent } from "@/lib/utils";
import { toast } from "sonner";
import { POPULAR_STOCKS } from "@/lib/popular-stocks";

interface CompareStock {
  code: string;
  name: string;
  sector: string;
  price: number;
  change: number;
  changePct: number;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  marketCap: number | null;
  trailingPE: number | null;
  forwardPE: number | null;
  priceToBook: number | null;
  returnOnEquity: number | null;
  profitMargins: number | null;
  revenueGrowth: number | null;
  earningsGrowth: number | null;
  dividendYield: number | null;
  debtToEquity: number | null;
  volume: number | null;
  performance: {
    oneDay: number;
    oneWeek: number;
    oneMonth: number;
    threeMonth: number;
  };
  rsi14: number | null;
  macdSignal: "bullish" | "bearish" | "neutral" | null;
}

interface MetricRow {
  label: string;
  category: MetricCategory;
  format: (v: number) => string;
  better: (v: number) => "good" | "bad" | "neutral";
  hasData: (s: CompareStock) => boolean;
}

type MetricCategory =
  | "price"
  | "valuation"
  | "profitability"
  | "dividends"
  | "growth"
  | "technical"
  | "performance"
  | "risk";

const METRICS: MetricRow[] = [
  {
    label: "Harga",
    category: "price",
    format: (v) => formatIDR(v),
    better: () => "neutral",
    hasData: (s) => s.price > 0,
  },
  {
    label: "Perubahan Hari Ini",
    category: "price",
    format: (v) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`,
    better: (v) => (v > 0 ? "good" : v < 0 ? "bad" : "neutral"),
    hasData: (s) => s.price > 0,
  },
  {
    label: "Market Cap",
    category: "price",
    format: (v) => formatCompact(v),
    better: () => "neutral",
    hasData: (s) => s.marketCap !== null && s.marketCap > 0,
  },
  {
    label: "Volume",
    category: "price",
    format: (v) => formatCompact(v),
    better: () => "neutral",
    hasData: (s) => s.volume !== null && s.volume > 0,
  },
  {
    label: "52w High",
    category: "price",
    format: (v) => formatIDR(v),
    better: () => "neutral",
    hasData: (s) => s.fiftyTwoWeekHigh !== null,
  },
  {
    label: "52w Low",
    category: "price",
    format: (v) => formatIDR(v),
    better: () => "neutral",
    hasData: (s) => s.fiftyTwoWeekLow !== null,
  },
  {
    label: "P/E (trailing)",
    category: "valuation",
    format: (v) => v.toFixed(2),
    better: (v) => (v > 0 && v < 15 ? "good" : v > 25 ? "bad" : "neutral"),
    hasData: (s) => s.trailingPE !== null && s.trailingPE > 0,
  },
  {
    label: "P/E (forward)",
    category: "valuation",
    format: (v) => v.toFixed(2),
    better: (v) => (v > 0 && v < 15 ? "good" : v > 25 ? "bad" : "neutral"),
    hasData: (s) => s.forwardPE !== null && s.forwardPE > 0,
  },
  {
    label: "P/B (Price to Book)",
    category: "valuation",
    format: (v) => v.toFixed(2),
    better: (v) => (v > 0 && v < 1.5 ? "good" : v > 3 ? "bad" : "neutral"),
    hasData: (s) => s.priceToBook !== null && s.priceToBook > 0,
  },
  {
    label: "ROE",
    category: "profitability",
    format: (v) => `${(v * 100).toFixed(1)}%`,
    better: (v) => (v > 0.15 ? "good" : v < 0.08 ? "bad" : "neutral"),
    hasData: (s) => s.returnOnEquity !== null,
  },
  {
    label: "Profit Margin",
    category: "profitability",
    format: (v) => `${(v * 100).toFixed(1)}%`,
    better: (v) => (v > 0.15 ? "good" : v < 0.05 ? "bad" : "neutral"),
    hasData: (s) => s.profitMargins !== null,
  },
  {
    label: "Dividend Yield",
    category: "dividends",
    format: (v) => `${(v * 100).toFixed(2)}%`,
    better: (v) => (v > 0.04 ? "good" : v < 0.01 ? "bad" : "neutral"),
    hasData: (s) => s.dividendYield !== null && s.dividendYield > 0,
  },
  {
    label: "Revenue Growth",
    category: "growth",
    format: (v) => `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`,
    better: (v) => (v > 0.1 ? "good" : v < 0 ? "bad" : "neutral"),
    hasData: (s) => s.revenueGrowth !== null,
  },
  {
    label: "Earnings Growth",
    category: "growth",
    format: (v) => `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`,
    better: (v) => (v > 0.1 ? "good" : v < 0 ? "bad" : "neutral"),
    hasData: (s) => s.earningsGrowth !== null,
  },
  {
    label: "Debt to Equity",
    category: "risk",
    format: (v) => v.toFixed(2),
    better: (v) => (v < 0.5 ? "good" : v > 1.5 ? "bad" : "neutral"),
    hasData: (s) => s.debtToEquity !== null,
  },
  {
    label: "RSI(14)",
    category: "technical",
    format: (v) => v.toFixed(0),
    better: (v) => (v < 30 ? "good" : v > 70 ? "bad" : "neutral"),
    hasData: (s) => s.rsi14 !== null,
  },
  {
    label: "MACD Signal",
    category: "technical",
    format: (v) => String(v),
    better: (v) => (v === 1 ? "good" : v === -1 ? "bad" : "neutral"),
    hasData: (s) => s.macdSignal !== null,
  },
  {
    label: "1 Hari",
    category: "performance",
    format: (v) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`,
    better: (v) => (v > 0 ? "good" : v < 0 ? "bad" : "neutral"),
    hasData: () => true,
  },
  {
    label: "1 Minggu",
    category: "performance",
    format: (v) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`,
    better: (v) => (v > 0 ? "good" : v < 0 ? "bad" : "neutral"),
    hasData: () => true,
  },
  {
    label: "1 Bulan",
    category: "performance",
    format: (v) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`,
    better: (v) => (v > 0 ? "good" : v < 0 ? "bad" : "neutral"),
    hasData: () => true,
  },
  {
    label: "3 Bulan",
    category: "performance",
    format: (v) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`,
    better: (v) => (v > 0 ? "good" : v < 0 ? "bad" : "neutral"),
    hasData: () => true,
  },
];

const CATEGORIES: { id: MetricCategory; label: string; icon: string }[] = [
  { id: "price", label: "Harga & Market", icon: "💰" },
  { id: "valuation", label: "Valuation", icon: "📊" },
  { id: "profitability", label: "Profitabilitas", icon: "💎" },
  { id: "dividends", label: "Dividen", icon: "💵" },
  { id: "growth", label: "Pertumbuhan", icon: "📈" },
  { id: "risk", label: "Risiko", icon: "⚠️" },
  { id: "technical", label: "Teknikal", icon: "🔧" },
  { id: "performance", label: "Performa Historis", icon: "⏱️" },
];

function formatCompact(v: number): string {
  if (v >= 1_000_000_000_000) return `${(v / 1e12).toFixed(1)}T`;
  if (v >= 1_000_000_000) return `${(v / 1e9).toFixed(0)}M`;
  if (v >= 1_000_000) return `${(v / 1e6).toFixed(0)}jt`;
  if (v >= 1_000) return `${(v / 1e3).toFixed(0)}rb`;
  return String(v);
}

function getMetricValue(stock: CompareStock, metric: MetricRow): number | null {
  switch (metric.label) {
    case "Harga":
      return stock.price;
    case "Perubahan Hari Ini":
      return stock.changePct;
    case "Market Cap":
      return stock.marketCap;
    case "Volume":
      return stock.volume;
    case "52w High":
      return stock.fiftyTwoWeekHigh;
    case "52w Low":
      return stock.fiftyTwoWeekLow;
    case "P/E (trailing)":
      return stock.trailingPE;
    case "P/E (forward)":
      return stock.forwardPE;
    case "P/B (Price to Book)":
      return stock.priceToBook;
    case "ROE":
      return stock.returnOnEquity;
    case "Profit Margin":
      return stock.profitMargins;
    case "Dividend Yield":
      return stock.dividendYield;
    case "Revenue Growth":
      return stock.revenueGrowth;
    case "Earnings Growth":
      return stock.earningsGrowth;
    case "Debt to Equity":
      return stock.debtToEquity;
    case "RSI(14)":
      return stock.rsi14;
    case "MACD Signal":
      return stock.macdSignal === "bullish"
        ? 1
        : stock.macdSignal === "bearish"
          ? -1
          : 0;
    case "1 Hari":
      return stock.performance.oneDay;
    case "1 Minggu":
      return stock.performance.oneWeek;
    case "1 Bulan":
      return stock.performance.oneMonth;
    case "3 Bulan":
      return stock.performance.threeMonth;
    default:
      return null;
  }
}

export function StockComparison({
  initialTickers = [],
}: {
  initialTickers?: string[];
}) {
  const [tickers, setTickers] = useState<string[]>(initialTickers);
  const [input, setInput] = useState("");
  const [results, setResults] = useState<CompareStock[] | null>(null);
  const [loading, setLoading] = useState(false);

  const addTicker = (raw: string) => {
    const t = raw.toUpperCase().replace(".JK", "").trim();
    if (!t) return;
    if (tickers.includes(t)) {
      toast.error(`${t} sudah ada di list`);
      return;
    }
    if (tickers.length >= 3) {
      toast.error("Maksimal 3 saham");
      return;
    }
    if (!POPULAR_STOCKS.some((s) => s.code === t)) {
      const ok = confirm(`${t} tidak ada di list populer. Lanjutkan?`);
      if (!ok) return;
    }
    setTickers([...tickers, t]);
    setInput("");
  };

  const removeTicker = (t: string) => {
    setTickers(tickers.filter((x) => x !== t));
    setResults(null);
  };

  const fetchCompare = async () => {
    if (tickers.length < 2) {
      toast.error("Minimal 2 saham untuk compare");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/compare?tickers=${tickers.join(",")}`);
      if (!res.ok) throw new Error("Compare failed");
      const data = await res.json();
      if (data.results?.length < 2) {
        toast.error("Gagal mengambil data — coba lagi");
        setResults(null);
      } else {
        setResults(data.results);
      }
    } catch (err) {
      toast.error("Gagal membandingkan saham");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialTickers.length >= 2 && !results && !loading) {
      fetchCompare();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getBest = (metric: MetricRow): string | null => {
    if (!results) return null;
    const values = results
      .map((s) => ({ code: s.code, value: getMetricValue(s, metric) }))
      .filter((v) => v.value !== null) as { code: string; value: number }[];
    if (values.length < 2) return null;
    if (metric.better(values[0].value) === "neutral") return null;
    const isHigherBetter = metric.better(1) === "good";
    const best = isHigherBetter
      ? values.reduce((a, b) => (a.value > b.value ? a : b))
      : values.reduce((a, b) => (a.value < b.value ? a : b));
    return best.code;
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Scale className="h-5 w-5 text-primary" />
          <h2 className="text-base font-bold">Bandingkan Saham</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Pilih 2-3 saham untuk lihat side-by-side comparison lengkap
          (fundamental, teknikal, performa).
        </p>

        <div className="flex flex-wrap gap-2 mb-3 min-h-[36px]">
          {tickers.map((t) => (
            <Badge
              key={t}
              variant="default"
              className="px-2.5 py-1.5 text-sm flex items-center gap-1.5"
            >
              {t}
              <button
                onClick={() => removeTicker(t)}
                className="hover:text-bear-300"
                aria-label={`Remove ${t}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {tickers.length < 3 && (
            <div className="flex items-center gap-1.5">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && input) {
                    e.preventDefault();
                    addTicker(input);
                  }
                }}
                placeholder="Ketik kode (BBCA)..."
                className="h-8 w-40 text-sm"
                maxLength={6}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => input && addTicker(input)}
                disabled={!input}
                className="h-8"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className="text-[10px] text-muted-foreground self-center mr-1">
            Populer:
          </span>
          {["BBCA", "BMRI", "BBRI", "TLKM", "ASII", "ICBP"].map((c) => (
            <button
              key={c}
              onClick={() => addTicker(c)}
              disabled={tickers.includes(c) || tickers.length >= 3}
              className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              + {c}
            </button>
          ))}
        </div>

        <Button
          onClick={fetchCompare}
          disabled={tickers.length < 2 || loading}
          className="w-full sm:w-auto"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Comparing...
            </>
          ) : (
            <>
              <Scale className="h-4 w-4 mr-2" />
              Bandingkan ({tickers.length})
            </>
          )}
        </Button>
      </Card>

      {results && results.length >= 2 && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {results.map((s) => {
              const isUp = s.changePct >= 0;
              return (
                <Card key={s.code} className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <Link
                      href={`/stock/${s.code}`}
                      className="font-black text-lg hover:underline"
                    >
                      {s.code}
                    </Link>
                    <Badge variant="outline" className="text-[10px]">
                      {s.sector}
                    </Badge>
                  </div>
                  <div className="text-xl font-black tabular-nums">
                    {formatIDR(s.price)}
                  </div>
                  <div
                    className={cn(
                      "text-xs font-bold tabular-nums flex items-center gap-1",
                      isUp ? "text-bull-600" : "text-bear-600",
                    )}
                  >
                    {isUp ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {formatPercent(s.changePct)}
                  </div>
                </Card>
              );
            })}
          </div>

          {CATEGORIES.map((cat) => {
            const catMetrics = METRICS.filter(
              (m) => m.category === cat.id && results.some((s) => m.hasData(s)),
            );
            if (catMetrics.length === 0) return null;
            return (
              <Card key={cat.id} className="p-4">
                <h3 className="text-sm font-bold mb-3">
                  {cat.icon} {cat.label}
                </h3>
                <div className="space-y-1.5">
                  {catMetrics.map((metric) => {
                    const best = getBest(metric);
                    return (
                      <div
                        key={metric.label}
                        className="grid grid-cols-[1fr_repeat(3,minmax(0,1fr))] gap-2 items-center py-1.5 border-b last:border-b-0"
                      >
                        <div className="text-xs font-medium text-muted-foreground">
                          {metric.label}
                        </div>
                        {results.map((s) => {
                          const v = getMetricValue(s, metric);
                          if (v === null) {
                            return (
                              <div
                                key={s.code}
                                className="text-xs text-muted-foreground italic text-right"
                              >
                                —
                              </div>
                            );
                          }
                          const isBest = best === s.code;
                          const verdict = metric.better(v);
                          return (
                            <div
                              key={s.code}
                              className={cn(
                                "text-xs font-bold tabular-nums text-right px-2 py-0.5 rounded",
                                isBest &&
                                  verdict !== "neutral" &&
                                  "ring-2 ring-primary/50",
                                verdict === "good" && !isBest && "text-bull-600",
                                verdict === "bad" && !isBest && "text-bear-600",
                                isBest &&
                                  verdict === "good" &&
                                  "bg-bull-100 text-bull-700 dark:bg-bull-700/30 dark:text-bull-500",
                                isBest &&
                                  verdict === "bad" &&
                                  "bg-bear-100 text-bear-700 dark:bg-bear-700/30 dark:text-bear-500",
                                isBest &&
                                  verdict === "neutral" &&
                                  "bg-primary/10 text-primary",
                              )}
                            >
                              {metric.format(v)}
                              {isBest && verdict !== "neutral" && (
                                <Check className="h-2.5 w-2.5 inline ml-1" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}

          <p className="text-[10px] text-muted-foreground text-center italic px-2">
            ✓ = nilai terbaik di kategori ini. Hijau = favorable, merah =
            unfavorable. Data dari Yahoo Finance (mungkin terbatas untuk beberapa
            saham IDX).
          </p>
        </div>
      )}
    </div>
  );
}
