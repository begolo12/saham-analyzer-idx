"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Newspaper,
  Flame,
  Bell,
  TrendingDown,
  ChevronRight,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatIDR, formatPercent } from "@/lib/utils";
import { getWatchlistItems } from "@/components/watchlist-button";
import { getAlerts } from "@/lib/price-alerts";
import { POPULAR_STOCKS } from "@/lib/popular-stocks";

interface BriefingStock {
  code: string;
  name: string;
  sector: string;
  price: number;
  change: number;
  changePct: number;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
}

interface BriefingData {
  watchlist: BriefingStock[];
  hot: BriefingStock[];
  alertsTriggered: { ticker: string; threshold: number; direction: string; triggeredPrice: number }[];
  onSale: BriefingStock[]; // down > 5% from 52w high
}

/**
 * Daily Briefing — personal dashboard untuk daily decision-making.
 * Sections:
 *   1. 🔔 Alert Target Tercapai (priority — paling penting)
 *   2. Watchlist kamu hari ini (5 dengan perubahan terbesar)
 *   3. 🔥 Hot hari ini (top 3 lonjakan > 3%)
 *   4. 💎 Stok diskon (turun > 5% dari 52w high)
 */
export function DailyBriefing() {
  const [data, setData] = useState<BriefingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const timeout = setTimeout(() => {
      if (!cancelled) {
        setData(null);
        setLoading(false);
      }
    }, 12000);
    (async () => {
      setLoading(true);
      try {
        const watchedTickers = new Set(
          getWatchlistItems().map((i) => i.ticker),
        );
        const personalTickers = Array.from(watchedTickers);
        // Pull top 30 IDX stocks as hot/sale candidates
        const hotCandidates = POPULAR_STOCKS.slice(0, 30).map((s) => s.code);
        const allTickers = Array.from(
          new Set([...personalTickers, ...hotCandidates]),
        );

        const results = await Promise.all(
          allTickers.map(async (ticker) => {
            try {
              const res = await fetch(`/api/quick/${ticker}`);
              if (!res.ok) return null;
              const json = await res.json();
              return {
                code: ticker,
                name: json.name ?? ticker,
                sector: json.sector ?? "Lainnya",
                price: json.price ?? 0,
                change: json.change ?? 0,
                changePct: json.changePct ?? 0,
                fiftyTwoWeekHigh: json.fiftyTwoWeekHigh ?? null,
                fiftyTwoWeekLow: json.fiftyTwoWeekLow ?? null,
              } as BriefingStock;
            } catch {
              return null;
            }
          }),
        );

        const allStocks = results.filter(
          (s): s is BriefingStock => s !== null,
        );
        if (cancelled) return;
        clearTimeout(timeout);

        // 1. Watchlist hari ini
        const watchlist = personalTickers
          .map((t) => allStocks.find((s) => s.code === t))
          .filter((s): s is BriefingStock => s !== undefined)
          .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
          .slice(0, 5);

        // 2. Hot hari ini — top 3 by changePct (positive)
        const hot = allStocks
          .filter((s) => s.changePct >= 3)
          .sort((a, b) => b.changePct - a.changePct)
          .slice(0, 3);

        // 3. Alert triggered
        const triggeredAlerts = getAlerts()
          .filter((a) => a.status === "triggered")
          .map((a) => ({
            ticker: a.ticker,
            threshold: a.threshold,
            direction: a.direction,
            triggeredPrice: a.triggeredPrice ?? a.threshold,
          }));

        // 4. Stok diskon
        const onSale = allStocks
          .filter(
            (s) =>
              s.fiftyTwoWeekHigh !== null &&
              s.fiftyTwoWeekHigh > 0 &&
              s.price > 0 &&
              ((s.fiftyTwoWeekHigh - s.price) / s.fiftyTwoWeekHigh) * 100 > 5,
          )
          .sort((a, b) => {
            const dropA =
              ((a.fiftyTwoWeekHigh! - a.price) / a.fiftyTwoWeekHigh!) * 100;
            const dropB =
              ((b.fiftyTwoWeekHigh! - b.price) / b.fiftyTwoWeekHigh!) * 100;
            return dropB - dropA;
          })
          .slice(0, 3);

        setData({ watchlist, hot, alertsTriggered: triggeredAlerts, onSale });
        setLoading(false);
      } catch (err) {
        console.error("Daily briefing fetch failed:", err);
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, []);

  if (loading) {
    return (
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Newspaper className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">Daily Briefing</h2>
        </div>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border p-2 animate-pulse">
              <div className="flex items-center gap-2">
                <div className="h-4 w-12 bg-muted rounded" />
                <div className="h-3 w-20 bg-muted rounded" />
              </div>
              <div className="h-4 w-16 bg-muted rounded" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (!data) return null;

  const hasContent =
    data.watchlist.length > 0 ||
    data.hot.length > 0 ||
    data.alertsTriggered.length > 0 ||
    data.onSale.length > 0;

  if (!hasContent) {
    // Show empty state with CTA
    return (
      <Card className="p-5 border-primary/20 bg-gradient-to-br from-primary/5 to-purple-500/5">
        <div className="flex items-center gap-2 mb-2">
          <Newspaper className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">Daily Briefing</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Mulai tracking saham untuk lihat ringkasan personal harian di sini.
        </p>
        <Link
          href="/screener"
          className="text-xs text-primary hover:underline font-medium"
        >
          Cari saham potensial →
        </Link>
      </Card>
    );
  }

  return (
    <Card className="p-5 border-primary/20 bg-gradient-to-br from-primary/5 to-purple-500/5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Newspaper className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">Daily Briefing</h2>
          <Badge variant="info" className="text-[10px]">
            Hari ini
          </Badge>
        </div>
        <span className="text-[10px] text-muted-foreground italic">
          Update tiap halaman dibuka
        </span>
      </div>

      <div className="space-y-4">
        {/* 1. Alert Triggered (priority) */}
        {data.alertsTriggered.length > 0 && (
          <BriefingSection
            icon={
              <Bell className="h-4 w-4 text-amber-500 animate-pulse" />
            }
            title="🔔 Alert Target Tercapai"
            subtitle="Saham watchlist menyentuh target!"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {data.alertsTriggered.map((a) => (
                <Link
                  key={a.ticker}
                  href={`/stock/${a.ticker}`}
                  className="rounded-lg border-2 border-amber-500/40 bg-amber-50 dark:bg-amber-900/20 p-2.5 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-bold text-sm">{a.ticker}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {a.direction === "above" ? "Naik" : "Turun"}{" "}
                        {formatIDR(a.threshold)} → saat ini{" "}
                        <strong className="text-foreground">
                          {formatIDR(a.triggeredPrice)}
                        </strong>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 -rotate-90 text-amber-600 shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          </BriefingSection>
        )}

        {/* 2. Watchlist hari ini */}
        {data.watchlist.length > 0 && (
          <BriefingSection
            icon={<Sparkles className="h-4 w-4 text-primary" />}
            title="Watchlist kamu hari ini"
            subtitle="5 dengan perubahan terbesar"
          >
            <div className="space-y-1.5">
              {data.watchlist.map((s) => {
                const isUp = s.changePct >= 0;
                return (
                  <Link
                    key={s.code}
                    href={`/stock/${s.code}`}
                    className="flex items-center justify-between gap-2 rounded-lg border bg-card p-2 hover:bg-accent transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">{s.code}</span>
                        <span className="text-[10px] text-muted-foreground line-clamp-1">
                          {s.sector}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold tabular-nums">
                        {formatIDR(s.price)}
                      </div>
                      <div
                        className={cn(
                          "text-[10px] font-bold tabular-nums flex items-center justify-end gap-0.5",
                          isUp ? "text-bull-600" : "text-bear-600",
                        )}
                      >
                        {isUp ? (
                          <ArrowUpRight className="h-2.5 w-2.5" />
                        ) : (
                          <ArrowDownRight className="h-2.5 w-2.5" />
                        )}
                        {formatPercent(s.changePct)}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </BriefingSection>
        )}

        {/* 3. Hot hari ini */}
        {data.hot.length > 0 && (
          <BriefingSection
            icon={<Flame className="h-4 w-4 text-orange-500" />}
            title="🔥 Hot hari ini"
            subtitle="Lonjakan > 3% hari ini"
          >
            <div className="grid grid-cols-3 gap-2">
              {data.hot.map((s) => (
                <Link
                  key={s.code}
                  href={`/stock/${s.code}`}
                  className="rounded-lg border-2 border-bull-500/30 bg-bull-50/30 dark:bg-bull-700/10 p-2.5 hover:bg-bull-100/50 dark:hover:bg-bull-700/20 transition-colors text-center"
                >
                  <div className="font-bold text-sm">{s.code}</div>
                  <div className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                    {s.sector}
                  </div>
                  <div className="text-bull-700 dark:text-bull-500 font-black text-lg tabular-nums mt-1">
                    +{s.changePct.toFixed(2)}%
                  </div>
                </Link>
              ))}
            </div>
          </BriefingSection>
        )}

        {/* 4. Stok diskon */}
        {data.onSale.length > 0 && (
          <BriefingSection
            icon={<TrendingDown className="h-4 w-4 text-purple-500" />}
            title="💎 Stok diskon"
            subtitle="Turun > 5% dari 52w high"
          >
            <div className="space-y-1.5">
              {data.onSale.map((s) => {
                const dropFromHigh =
                  s.fiftyTwoWeekHigh !== null
                    ? ((s.fiftyTwoWeekHigh - s.price) / s.fiftyTwoWeekHigh) * 100
                    : 0;
                return (
                  <Link
                    key={s.code}
                    href={`/stock/${s.code}`}
                    className="flex items-center justify-between gap-2 rounded-lg border bg-card p-2 hover:bg-accent transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">{s.code}</span>
                        <span className="text-[10px] text-muted-foreground line-clamp-1">
                          {s.sector}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold tabular-nums">
                        {formatIDR(s.price)}
                      </div>
                      <div className="text-[10px] font-bold tabular-nums text-purple-700 dark:text-purple-400">
                        −{dropFromHigh.toFixed(1)}% from 52w
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </BriefingSection>
        )}
      </div>
    </Card>
  );
}

function BriefingSection({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        {icon}
        <h3 className="text-sm font-bold">{title}</h3>
        {subtitle && (
          <span className="text-[10px] text-muted-foreground italic">
            · {subtitle}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
