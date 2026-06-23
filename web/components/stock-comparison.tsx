"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Scale,
  Plus,
  X,
  Loader2,
  TrendingUp,
  TrendingDown,
  Check,
  ChevronRight,
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
    label: "P/E (trailing)",
    category: "valuation",
    format: (v) => v.toFixed(2),
    better: (v) => (v > 0 && v < 15 ? "good" : v > 25 ? "bad" : "neutral"),
    hasData: (s) => s.trailingPE !== null && s.trailingPE > 0,
  },
  {
    label: "P/B",
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
    case "P/E (trailing)":
      return stock.trailingPE;
    case "P/B":
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

function getWinnerCode(results: CompareStock[], metric: MetricRow): string | null {
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
}

function categorySummary(results: CompareStock[], category: MetricCategory) {
  const metrics = METRICS.filter((metric) => metric.category === category);
  const scores = new Map<string, number>();

  results.forEach((result) => scores.set(result.code, 0));

  metrics.forEach((metric) => {
    const winner = getWinnerCode(results, metric);
    if (winner) {
      scores.set(winner, (scores.get(winner) || 0) + 1);
    }
  });

  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  if (!ranked.length || ranked[0][1] === 0) return null;
  const winnerStock = results.find((stock) => stock.code === ranked[0][0]);
  if (!winnerStock) return null;
  return {
    code: winnerStock.code,
    score: ranked[0][1],
    total: metrics.length,
  };
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

  const summaryCards = useMemo(() => {
    if (!results || results.length < 2) return [];
    return CATEGORIES.map((category) => {
      const summary = categorySummary(results, category.id);
      if (!summary) return null;
      return {
        ...category,
        ...summary,
      };
    }).filter(Boolean) as Array<{ id: MetricCategory; label: string; icon: string; code: string; score: number; total: number }>;
  }, [results]);

  return (
    <div className="space-y-4">
      <Card className="page-hero-card p-4 sm:p-5">
        <div className="page-eyebrow">Compare builder</div>
        <div className="mt-2 flex items-center gap-2">
          <Scale className="h-5 w-5 text-primary" />
          <h2 className="text-base font-bold">Bandingkan saham di mobile</h2>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Fokuskan 2 saham utama dulu, lalu baca kategori demi kategori tanpa layout tabel yang sempit.
        </p>

        <div className="mt-4 flex flex-wrap gap-2 min-h-[36px]">
          {tickers.map((t) => (
            <Badge
              key={t}
              variant="default"
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm"
            >
              {t}
              <button
                onClick={() => removeTicker(t)}
                className="rounded-full hover:text-bear-300"
                aria-label={`Remove ${t}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === "Enter" && input) {
                e.preventDefault();
                addTicker(input);
              }
            }}
            placeholder="Tambah kode (BBCA)..."
            className="h-11 text-sm"
            maxLength={6}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => input && addTicker(input)}
            disabled={!input}
            className="h-11 w-11 rounded-xl"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {[
            "BBCA",
            "BMRI",
            "BBRI",
            "TLKM",
            "ASII",
            "ICBP",
          ].map((c) => (
            <button
              key={c}
              onClick={() => addTicker(c)}
              disabled={tickers.includes(c) || tickers.length >= 3}
              className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-30"
            >
              + {c}
            </button>
          ))}
        </div>

        <Button
          onClick={fetchCompare}
          disabled={tickers.length < 2 || loading}
          className="mt-4 min-h-11 w-full rounded-xl"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Comparing...
            </>
          ) : (
            <>
              <Scale className="mr-2 h-4 w-4" />
              Bandingkan {tickers.length} saham
            </>
          )}
        </Button>
      </Card>

      {results && results.length >= 2 && (
        <div className="space-y-4">
          <div className="mobile-topbar md:hidden">
            <div className="mobile-topbar__inner">
              <div className="min-w-0 flex-1">
                <div className="mobile-topbar__title">Winner snapshot</div>
                <div className="mobile-topbar__subtitle">Lihat unggulan per kategori sebelum masuk detail</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            {results.map((s) => {
              const isUp = s.changePct >= 0;
              return (
                <Card key={s.code} className="p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md border border-border">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link
                        href={`/stock/${s.code}`}
                        className="text-lg font-black hover:underline text-primary"
                      >
                        {s.code}
                      </Link>
                      <div className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{s.name}</div>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {s.sector}
                    </Badge>
                  </div>
                  <div className="mt-3 text-2xl font-black tabular-nums">
                    {formatIDR(s.price)}
                  </div>
                  <div
                    className={cn(
                      "mt-1 flex items-center gap-1 text-xs font-bold tabular-nums",
                      isUp ? "text-bull-600" : "text-bear-600",
                    )}
                  >
                    {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {formatPercent(s.changePct)}
                  </div>
                </Card>
              );
            })}
          </div>

          {summaryCards.length > 0 && (
            <Card className="p-4">
              <div className="page-section-heading">
                <div>
                  <div className="page-section-title">Ringkasan pemenang</div>
                  <div className="page-section-subtitle">Siapa unggul di tiap tema keputusan utama</div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 mt-3">
                {summaryCards.map((card) => (
                  <div key={card.id} className="rounded-2xl border bg-gradient-to-br from-primary/5 to-transparent p-3.5 hover:shadow-sm transition-all border-border/80">
                    <div className="text-xs text-muted-foreground">{card.icon} {card.label}</div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <div className="text-base font-black text-primary">{card.code}</div>
                      <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                        {card.score}/{card.total} metric unggul
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {CATEGORIES.map((cat) => {
            const catMetrics = METRICS.filter(
              (m) => m.category === cat.id && results.some((s) => m.hasData(s)),
            );
            if (catMetrics.length === 0) return null;
            return (
              <Card key={cat.id} className="p-4 border border-border">
                <div className="page-section-heading mb-3">
                  <div>
                    <div className="page-section-title">{cat.icon} {cat.label}</div>
                    <div className="page-section-subtitle">Bandingkan metric paling relevan tanpa tabel sempit</div>
                  </div>
                </div>
                <div className="space-y-3">
                  {catMetrics.map((metric) => {
                    const best = getWinnerCode(results, metric);
                    return (
                      <div key={metric.label} className="rounded-2xl border bg-card p-3 border-border/60">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <div className="text-sm font-bold text-foreground">{metric.label}</div>
                          {best && (
                            <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border border-primary/20">
                              Winner: {best}
                            </Badge>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          {results.map((s) => {
                            const v = getMetricValue(s, metric);
                            if (v === null) {
                              return (
                                <div key={s.code} className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2 text-xs text-muted-foreground border border-transparent">
                                  <span className="font-semibold">{s.code}</span>
                                  <span>—</span>
                                </div>
                              );
                            }
                            const isBest = best === s.code;
                            const verdict = metric.better(v);
                            return (
                              <div
                                key={s.code}
                                className={cn(
                                  "flex items-center justify-between rounded-xl px-3 py-2 text-sm transition-all duration-150",
                                  isBest && verdict === "good" && "bg-bull-50/80 text-bull-700 dark:bg-bull-700/15 dark:text-bull-500 font-semibold border border-bull-500/25",
                                  isBest && verdict === "bad" && "bg-bear-50/80 text-bear-700 dark:bg-bear-700/15 dark:text-bear-500 font-semibold border border-bear-500/25",
                                  isBest && verdict === "neutral" && "bg-primary/10 text-primary font-semibold border border-primary/20",
                                  !isBest && "bg-muted/40 border border-transparent",
                                )}
                              >
                                <span className="font-semibold">{s.code}</span>
                                <span className="flex items-center gap-1 font-bold tabular-nums">
                                  {metric.format(v)}
                                  {isBest && <Check className="h-3.5 w-3.5" />}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}

          <p className="px-2 text-center text-[10px] italic text-muted-foreground">
            Winner badge = saham paling unggul di metric/category itu. Detail lengkap tetap bisa dibuka ke halaman analisa masing-masing.
          </p>
        </div>
      )}
    </div>
  );
}
