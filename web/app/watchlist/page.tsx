"use client";

import { Suspense, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Star,
  Trash2,
  Loader2,
  ArrowLeft,
  ArrowUpDown,
  Filter,
  Sparkles,
  Flame,
  Bell,
  Share2,
  ChevronRight,
  Plus,
  TrendingUp,
  TrendingDown,
  Activity,
  Search,
  BarChart3,
  History,
  Zap,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/alert";
import { EmptyState } from "@/components/empty-state";
import { StockRowSkeleton } from "@/components/stock-row-skeleton";
import {
  getWatchlistItems,
  setWatchlist,
  clearAllWatchlist,
  type WatchlistItem,
} from "@/components/watchlist-button";
import {
  WatchlistCard,
  AlertCard,
  DiscoveryCard,
  type WatchlistStockData,
} from "@/components/watchlist-card";
import { POPULAR_STOCKS } from "@/lib/popular-stocks";
import {
  getAlerts,
  checkAlerts,
  type PriceAlert,
} from "@/lib/price-alerts";
import { PriceAlertModal } from "@/components/price-alert-modal";
import {
  showNotification,
  NotificationTemplates,
} from "@/lib/notifications";
import { MobileAppBar, MobileSectionTabs, MobileListItem } from "@/components/mobile-app-bar";
import { cn, formatIDR, formatPercent } from "@/lib/utils";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";

type SortBy = "default" | "hot" | "change" | "name" | "viewed" | "performance";
type SectorFilter = "all" | string;
type MobileSection = "watching" | "alerts" | "discovery";
type ConfirmAction = { type: "clearAll" } | null;

// Build a tiny inline sparkline from closes (no SVG lib needed)
function Sparkline({ closes, up }: { closes: number[]; up: boolean }) {
  if (!closes || closes.length < 2) return null;
  const w = 56;
  const h = 18;
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;
  const step = w / (closes.length - 1);
  const points = closes
    .map((c, i) => `${(i * step).toFixed(1)},${(h - ((c - min) / range) * h).toFixed(1)}`)
    .join(" ");
  const color = up ? "text-bull-600" : "text-bear-600";
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className={cn("shrink-0", color)}
      aria-hidden
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function WatchlistPage() {
  return (
    <Suspense fallback={<div className="page-main container"><div className="shimmer h-32 w-full rounded-2xl" style={{boxShadow: 'shadow-sm'}} /></div>}>
      <WatchlistPageContent />
    </Suspense>
  );
}

function WatchlistPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [data, setData] = useState<Record<string, WatchlistStockData>>({});
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>("default");
  const [sectorFilter, setSectorFilter] = useState<SectorFilter>("all");
  const [alertModalTicker, setAlertModalTicker] = useState<string | null>(null);
  const [mobileSection, setMobileSection] = useState<MobileSection>("watching");
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

  // Preset handling: /watchlist?preset=IDX30 or ?preset=LQ45
  useEffect(() => {
    if (!mounted) return;
    const preset = searchParams.get("preset");
    if (!preset) return;
    const existing = getWatchlistItems();
    if (existing.length > 0) return;

    const codes: string[] = preset === "IDX30"
      ? POPULAR_STOCKS.slice(0, 30).map((s) => s.code)
      : preset === "LQ45"
      ? POPULAR_STOCKS.slice(0, 45).map((s) => s.code)
      : [];

    if (codes.length === 0) return;
    setWatchlist(codes);
    toast.success(`⭐ Watchlist ${preset} ditambahkan (${codes.length} saham)`);
    router.replace("/watchlist");
  }, [mounted, searchParams, router]);

  useEffect(() => {
    setMounted(true);
    setItems(getWatchlistItems());
    setAlerts(getAlerts());

    const handler = () => setItems(getWatchlistItems());
    const alertHandler = () => setAlerts(getAlerts());
    window.addEventListener("watchlist-updated", handler);
    window.addEventListener("alerts-updated", alertHandler);
    window.addEventListener("storage", handler);
    window.addEventListener("storage", alertHandler);
    return () => {
      window.removeEventListener("watchlist-updated", handler);
      window.removeEventListener("alerts-updated", handler);
      window.removeEventListener("storage", handler);
      window.removeEventListener("storage", alertHandler);
    };
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (items.length === 0) {
      setData({});
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all(
      items.map(async (item) => {
        try {
          const res = await fetch(`/api/quick/${item.ticker}`);
          if (!res.ok) return [item.ticker, null] as const;
          const json = await res.json();
          return [
            item.ticker,
            { code: item.ticker, ...json } as WatchlistStockData,
          ] as const;
        } catch {
          return [item.ticker, null] as const;
        }
      }),
    ).then((entries) => {
      const map: Record<string, WatchlistStockData> = {};
      for (const [t, d] of entries) {
        if (d) map[t] = d;
      }
      setData(map);
      setLoading(false);

      const priceMap: Record<string, number | null> = {};
      for (const [t, d] of entries) {
        if (d && typeof d.price === "number") priceMap[t] = d.price;
      }
      const currentAlerts = getAlerts();
      if (currentAlerts.some((a) => a.status === "armed")) {
        const { newlyTriggered } = checkAlerts(currentAlerts, priceMap);
        if (newlyTriggered.length > 0) {
          setAlerts(getAlerts());
          for (const a of newlyTriggered) {
            const directionText =
              a.direction === "above" ? "naik di atas" : "turun ke bawah";
            toast.success(
              `🔔 ${a.ticker} ${directionText} ${formatIDR(a.threshold)} (saat ini ${formatIDR(a.triggeredPrice ?? 0)})`,
              { duration: 8000 },
            );
            showNotification(
              NotificationTemplates.alertTriggered(
                a.ticker,
                a.threshold,
                a.direction,
                a.triggeredPrice ?? a.threshold,
              ),
            );
          }
        }
      }
    });
  }, [items, mounted]);

  const remove = (ticker: string) => {
    setWatchlist(items.filter((i) => i.ticker !== ticker).map((i) => i.ticker));
    toast.success(`Removed ${ticker} from watchlist`);
  };

  const clearAll = () => {
    setConfirmAction({ type: "clearAll" });
  };

  const executeClearAll = () => {
    clearAllWatchlist();
    toast.success("Watchlist cleared");
  };

  const addToWatchlist = (ticker: string) => {
    if (items.some((i) => i.ticker === ticker)) return;
    setWatchlist([...items.map((i) => i.ticker), ticker]);
    toast.success(`⭐ ${ticker} added to watchlist`);
  };

  const availableSectors = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      const s = data[item.ticker]?.sector;
      if (s) set.add(s);
    }
    return Array.from(set).sort();
  }, [items, data]);

  const filteredItems = useMemo(() => {
    if (sectorFilter === "all") return items;
    return items.filter((i) => data[i.ticker]?.sector === sectorFilter);
  }, [items, data, sectorFilter]);

  const sortedItems = useMemo(() => {
    const arr = [...filteredItems];
    switch (sortBy) {
      case "hot":
        arr.sort((a, b) => {
          const ca = Math.abs(data[a.ticker]?.changePct ?? 0);
          const cb = Math.abs(data[b.ticker]?.changePct ?? 0);
          return cb - ca;
        });
        break;
      case "change":
        arr.sort((a, b) => (data[b.ticker]?.changePct ?? 0) - (data[a.ticker]?.changePct ?? 0));
        break;
      case "name":
        arr.sort((a, b) => a.ticker.localeCompare(b.ticker));
        break;
      case "viewed":
        arr.sort((a, b) => b.viewCount - a.viewCount);
        break;
      case "performance": {
        arr.sort((a, b) => {
          const aItem = items.find((i) => i.ticker === a.ticker);
          const bItem = items.find((i) => i.ticker === b.ticker);
          const aReturn = aItem?.priceAtAdded && data[a.ticker]?.price
            ? ((data[a.ticker]!.price! - aItem.priceAtAdded) / aItem.priceAtAdded) * 100
            : -Infinity;
          const bReturn = bItem?.priceAtAdded && data[b.ticker]?.price
            ? ((data[b.ticker]!.price! - bItem.priceAtAdded) / bItem.priceAtAdded) * 100
            : -Infinity;
          return bReturn - aReturn;
        });
        break;
      }
      default:
        arr.sort((a, b) => {
          if (b.viewCount !== a.viewCount) return b.viewCount - a.viewCount;
          return b.addedAt - a.addedAt;
        });
    }
    return arr;
  }, [filteredItems, sortBy, data, items]);

  const smartAlerts = useMemo(() => {
    const next: { stock: WatchlistStockData; type: "hot" | "drop"; text: string }[] = [];
    for (const item of items) {
      const s = data[item.ticker];
      if (!s) continue;
      const pct = s.changePct ?? 0;
      if (pct >= 3) {
        next.push({ stock: s, type: "hot", text: `+${pct.toFixed(2)}% hari ini` });
      } else if (pct <= -3) {
        next.push({ stock: s, type: "drop", text: `${pct.toFixed(2)}% hari ini` });
      }
    }
    return next;
  }, [items, data]);

  const discovery = useMemo(() => {
    if (items.length === 0) return [];
    const watchedTickers = new Set(items.map((i) => i.ticker));
    const watchedSectors = new Set(
      items.map((i) => data[i.ticker]?.sector).filter(Boolean),
    );
    return POPULAR_STOCKS.filter(
      (s) =>
        !watchedTickers.has(s.code) && watchedSectors.has(s.sector),
    )
      .slice(0, 6)
      .map((s) => {
        const live = data[s.code];
        return {
          code: s.code,
          name: live?.name ?? s.name,
          sector: s.sector,
          price: live?.price ?? null,
          changePct: live?.changePct ?? null,
        };
      });
  }, [items, data]);

  const totalViews = useMemo(
    () => items.reduce((sum, i) => sum + i.viewCount, 0),
    [items],
  );
  const mostViewed = useMemo(() => {
    const arr = [...items].sort((a, b) => b.viewCount - a.viewCount);
    return arr.find((i) => i.viewCount > 0);
  }, [items]);

  const triggeredCount = alerts.filter((a) => a.status === "triggered").length;

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background">
        <main className="page-main container">
          <div className="flex items-center justify-center min-h-[50vh]">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell min-h-screen bg-background">
      <MobileAppBar
        title="Watchlist"
        subtitle={
          items.length > 0
            ? `${items.length} saham • ${triggeredCount} alert`
            : "Tambah saham favorit dari halaman analisa"
        }
        backHref="/"
        trailing={
          items.length > 0 ? <ShareWatchlistButton tickers={items.map((i) => i.ticker)} /> : null
        }
      />

      <main className="page-main container space-y-4">
        {/* DESKTOP: keep legacy header */}
        <div className="hidden md:flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" aria-label="Kembali ke Beranda">
              <Button variant="ghost" size="sm" className="min-h-9">
                <ArrowLeft className="mr-1 h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">Beranda</span>
              </Button>
            </Link>
            <h1 className="flex items-center gap-2 text-2xl font-black sm:text-3xl">
              <Star className="h-6 w-6 fill-amber-500 text-amber-500 sm:h-7 sm:w-7" aria-hidden />
              Watchlist
            </h1>
            {items.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {items.length}
              </Badge>
            )}
          </div>
          {items.length > 0 && (
            <div className="flex gap-1">
              <Link href="/alerts">
                <Button variant="ghost" size="sm" className="min-h-9 text-xs">
                  <Bell className="mr-1 h-4 w-4" aria-hidden />
                  <span className="hidden sm:inline">Alert Manager</span>
                </Button>
              </Link>
              <ShareWatchlistButton tickers={items.map((i) => i.ticker)} />
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="min-h-9 text-xs"
                aria-label="Hapus semua saham dari watchlist"
              >
                <Trash2 className="mr-1 h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">Hapus Semua</span>
              </Button>
            </div>
          )}
        </div>

        {items.length === 0 ? (
          <div className="md:hidden">
            <Card className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-6 text-center">
              <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
                <Star className="h-6 w-6 fill-amber-500" />
              </div>
              <h2 className="mt-3 text-lg font-bold">Mulai watchlist</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Tap ⭐ di halaman analisa saham untuk menambah ke watchlist
              </p>
              <div className="mt-4 grid grid-cols-1 gap-2">
                <Button
                  onClick={() => router.push("/search")}
                  className="min-h-11 w-full"
                >
                  <Search className="mr-2 h-4 w-4" />
                  Cari saham populer
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push("/screener")}
                  className="min-h-11 w-full"
                >
                  <Filter className="mr-2 h-4 w-4" />
                  Buka screener
                </Button>
              </div>
            </Card>
          </div>
        ) : (
          <>
            {/* MOBILE: Hero summary */}
            <section className="md:hidden">
              <div className="mobile-hero">
                <div className="page-eyebrow text-white/80">Watchlist</div>
                <div className="mobile-hero__row">
                  <div>
                    <div className="mobile-hero__value">{items.length}</div>
                    <div className="mobile-hero__delta">
                      {triggeredCount > 0 ? <Bell className="h-3 w-3" /> : <Star className="h-3 w-3" />}
                      <span>{triggeredCount > 0 ? `${triggeredCount} alert triggered` : `${smartAlerts.length} smart alerts`}</span>
                    </div>
                    {totalViews > 0 && (
                      <div className="mobile-hero__sub">
                        {totalViews} kali dilihat • favorit: {mostViewed?.ticker}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Watchlist performance summary */}
              {sortedItems.length > 0 && (() => {
                const validChanges = sortedItems
                  .map((it) => data[it.ticker]?.changePct)
                  .filter((c): c is number => typeof c === "number");
                if (validChanges.length === 0) return null;
                const avg = validChanges.reduce((a, b) => a + b, 0) / validChanges.length;
                const advancers = validChanges.filter((c) => c > 0).length;
                const decliners = validChanges.filter((c) => c < 0).length;
                const tone = avg > 0.2 ? "bull" : avg < -0.2 ? "bear" : "neutral";
                return (
                  <div
                    className={cn(
                      "bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl rounded-2xl border p-3 mb-2",
                      tone === "bull" && "border-bull-500/30 bg-gradient-to-br from-bull-50 to-bull-50/30",
                      tone === "bear" && "border-bear-500/30 bg-gradient-to-br from-bear-50 to-bear-50/30",
                      tone === "neutral" && "border-border bg-card",
                    )}
                  >
                    <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                      <Activity className="h-3 w-3" /> Performa watchlist
                    </div>
                    <div className="mt-1 flex items-baseline gap-3">
                      <div
                        className={cn(
                          "text-2xl font-black tabular-nums leading-none",
                          tone === "bull" && "text-bull-700",
                          tone === "bear" && "text-bear-700",
                          tone === "neutral" && "text-foreground",
                        )}
                      >
                        {avg >= 0 ? "+" : ""}
                        {avg.toFixed(2)}%
                      </div>
                      <div className="text-[11px] text-muted-foreground font-medium">rata-rata hari ini</div>
                    </div>
                    <div className="mt-1.5 flex items-center gap-3 text-[11px]">
                      <span className="font-semibold text-bull-700">{advancers} naik</span>
                      <span className="font-semibold text-bear-700">{decliners} turun</span>
                      {triggeredCount > 0 && (
                        <span className="ml-auto font-semibold text-amber-600">🔔 {triggeredCount} alert</span>
                      )}
                    </div>
                  </div>
                );
              })()}

              <MobileSectionTabs<MobileSection>
                value={mobileSection}
                onChange={setMobileSection}
                options={[
                  { value: "watching", label: "Watching", count: items.length },
                  { value: "alerts", label: "Alerts", count: triggeredCount + smartAlerts.length },
                  { value: "discovery", label: "Discovery", count: discovery.length },
                ]}
              />

              {/* Quick action buttons */}
              <div className="flex gap-2 mt-2">
                <Link href="/compare" className="flex-1">
                  <Button variant="outline" size="sm" className="w-full min-h-10 text-xs font-bold rounded-xl">
                    <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
                    Bandingkan
                  </Button>
                </Link>
                <Link href="/alerts" className="flex-1">
                  <Button variant="outline" size="sm" className="w-full min-h-10 text-xs font-bold rounded-xl">
                    <History className="h-3.5 w-3.5 mr-1.5" />
                    Riwayat Alert
                  </Button>
                </Link>
              </div>
            </section>

            {/* MOBILE: Watching section */}
            {mobileSection === "watching" && (
              <div className="md:hidden space-y-3">
                <FilterBar
                  sortBy={sortBy}
                  setSortBy={setSortBy}
                  sectorFilter={sectorFilter}
                  setSectorFilter={setSectorFilter}
                  availableSectors={availableSectors}
                />
                {loading ? (
                  <div className="space-y-1" aria-label="Memuat data watchlist">
                    <StockRowSkeleton count={Math.max(items.length, 3)} />
                  </div>
                ) : sortedItems.length > 0 ? (
                  <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl rounded-2xl border bg-card divide-y divide-border/60 overflow-hidden">
                    {sortedItems.map((item) => {
                      const stock = data[item.ticker];
                      if (!stock) return null;
                      const isUp = (stock.changePct ?? 0) >= 0;
                      const showChange = stock.changePct !== null && stock.changePct !== undefined;
                      const recentCloses = (stock as { recentCloses?: number[] }).recentCloses;
                      // Performance since added
                      const returnSinceAdded = item.priceAtAdded && stock.price
                        ? ((stock.price - item.priceAtAdded) / item.priceAtAdded) * 100
                        : null;
                      const returnUp = returnSinceAdded !== null ? returnSinceAdded >= 0 : true;
                      return (
                        <MobileListItem
                          key={item.ticker}
                          href={`/stock/${item.ticker}`}
                          ticker={item.ticker}
                          name={stock.name}
                          sector={stock.sector}
                          price={showChange && stock.price !== null ? formatIDR(stock.price) : undefined}
                          change={showChange ? { text: formatPercent(stock.changePct), positive: isUp } : undefined}
                          accessory={
                            <div className="flex items-center gap-1.5">
                              {returnSinceAdded !== null && (
                                <span className={cn(
                                  "text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-full",
                                  returnUp ? "bg-bull-100 text-bull-700 dark:bg-bull-700/20 dark:text-bull-500" : "bg-bear-100 text-bear-700 dark:bg-bear-700/20 dark:text-bear-500",
                                )}>
                                  {returnUp ? "+" : ""}{returnSinceAdded.toFixed(1)}%
                                </span>
                              )}
                              {recentCloses && recentCloses.length > 1 && (
                                <Sparkline closes={recentCloses} up={isUp} />
                              )}
                              {triggeredAlertFor(item.ticker) && (
                                <Bell className="h-3.5 w-3.5 text-amber-500" aria-label="Alert triggered" />
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  remove(item.ticker);
                                }}
                                aria-label={`Hapus ${item.ticker} dari watchlist`}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-bear-100 hover:text-bear-600"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          }
                        />
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState
                    icon={<Filter className="h-5 w-5" aria-hidden />}
                    title="Tidak ada saham di filter ini"
                    description="Coba reset filter untuk melihat semua saham."
                    actions={[
                      {
                        label: "Reset filter",
                        onClick: () => setSectorFilter("all"),
                      },
                    ]}
                  />
                )}
              </div>
            )}

            {/* MOBILE: Alerts section */}
            {mobileSection === "alerts" && (
              <div className="md:hidden space-y-2">
                {alerts.filter((a) => a.status === "triggered").length === 0 && smartAlerts.length === 0 ? (
                  <EmptyState
                    icon={<Bell className="h-5 w-5" aria-hidden />}
                    title="Belum ada alert"
                    description="Tambahkan alert harga di tiap saham untuk dapat notifikasi."
                    actions={[
                      {
                        label: "Lihat watchlist",
                        onClick: () => setMobileSection("watching"),
                      },
                    ]}
                  />
                ) : (
                  <>
                    {alerts.filter((a) => a.status === "triggered").map((a) => (
                      <Card key={a.id} className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-3 border-amber-500/40">
                        <div className="flex items-start gap-2">
                          <Bell className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm">{a.ticker}</span>
                              <Badge variant="bull" className="text-[10px]">Triggered</Badge>
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {a.direction === "above" ? "Naik" : "Turun"} {formatIDR(a.threshold)}
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setAlertModalTicker(a.ticker)}
                              className="mt-2 -ml-1 text-[11px]"
                            >
                              Atur alert
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                    {smartAlerts.map(({ stock, type, text }) => (
                      <Link key={stock.code} href={`/stock/${stock.code}`}>
                        <Card className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-3 hover:bg-accent/50 transition-colors">
                          <div className="flex items-center gap-2">
                            {type === "hot" ? (
                              <Flame className="h-4 w-4 text-bull-600 shrink-0" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-bear-600 shrink-0" />
                            )}
                            <span className="font-bold text-sm">{stock.code}</span>
                            <span className={cn("text-xs font-bold tabular-nums ml-auto", type === "hot" ? "text-bull-600" : "text-bear-600")}>
                              {text}
                            </span>
                          </div>
                        </Card>
                      </Link>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* MOBILE: Discovery section */}
            {mobileSection === "discovery" && (
              <div className="md:hidden space-y-2">
                {discovery.length === 0 ? (
                  <EmptyState
                    icon={<Sparkles className="h-5 w-5" aria-hidden />}
                    title="Belum ada discovery"
                    description="Saham di sektor yang sama dengan watchlist kamu akan muncul di sini."
                  />
                ) : (
                  discovery.map((d) => {
                    const isUp = (d.changePct ?? 0) >= 0;
                    return (
                      <Card key={d.code} className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-3">
                        <div className="flex items-center gap-3">
                          <Link href={`/stock/${d.code}`} className="flex-1 min-w-0">
                            <div className="font-bold text-sm">{d.code}</div>
                            <div className="text-xs text-muted-foreground truncate">{d.name} · {d.sector}</div>
                            {d.price !== null && (
                              <div className="mt-0.5 flex items-center gap-2 text-[11px] tabular-nums">
                                <span className="font-semibold">{formatIDR(d.price)}</span>
                                {d.changePct !== null && (
                                  <span className={cn("font-bold", isUp ? "text-bull-600" : "text-bear-600")}>
                                    {formatPercent(d.changePct)}
                                  </span>
                                )}
                              </div>
                            )}
                          </Link>
                          <Button
                            size="sm"
                            onClick={() => addToWatchlist(d.code)}
                            className="min-h-9"
                          >
                            <Plus className="h-3 w-3" />
                            Watch
                          </Button>
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>
            )}

            {/* DESKTOP: keep legacy layout */}
            <div className="hidden md:block space-y-2">
              {items.length > 0 && totalViews > 0 && mostViewed && (
                <Alert variant="info" className="bg-primary/5 border-primary/20">
                  <div className="flex items-start gap-2">
                    <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div className="text-xs flex-1">
                      <strong className="font-bold">Self-Learning Aktif:</strong>{" "}
                      Anda telah melihat watchlist <strong>{totalViews}×</strong> total.
                      Favorit Anda:{" "}
                      <Link
                        href={`/stock/${mostViewed.ticker}`}
                        className="font-bold underline"
                      >
                        {mostViewed.ticker}
                      </Link>{" "}
                      ({mostViewed.viewCount}× dilihat). Sorted by popularitas.
                    </div>
                  </div>
                </Alert>
              )}

              <FilterBar
                sortBy={sortBy}
                setSortBy={setSortBy}
                sectorFilter={sectorFilter}
                setSectorFilter={setSectorFilter}
                availableSectors={availableSectors}
              />

              {alerts.some((a) => a.status === "triggered") && (
                <div>
                  <h2 className="text-lg font-bold mb-2 px-1 flex items-center gap-2">
                    <Bell className="h-5 w-5 text-amber-500 animate-pulse" />
                    Price Alerts Triggered
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {alerts
                      .filter((a) => a.status === "triggered")
                      .map((a) => (
                        <Card
                          key={a.id}
                          className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-3 border-amber-500/40 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-700/10 dark:to-amber-700/5"
                        >
                          <div className="flex items-start gap-2">
                            <Bell className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm">{a.ticker}</span>
                                <Badge variant="bull" className="text-[10px]">
                                  ✓ Hit Target
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {a.direction === "above" ? "Naik" : "Turun"}{" "}
                                {formatIDR(a.threshold)} → saat ini{" "}
                                <strong className="text-foreground">
                                  {formatIDR(a.triggeredPrice ?? 0)}
                                </strong>
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                  </div>
                </div>
              )}

              {smartAlerts.length > 0 && (
                <div>
                  <h2 className="text-lg font-bold mb-2 px-1 flex items-center gap-2">
                    <Flame className="h-5 w-5 text-orange-500" />
                    Smart Alerts ({smartAlerts.length})
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {smartAlerts.map(({ stock, type, text }) => (
                      <AlertCard
                        key={stock.code}
                        stock={stock}
                        alertType={type}
                        text={text}
                      />
                    ))}
                  </div>
                </div>
              )}

              {loading && items.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" aria-label="Memuat data watchlist">
                  {items.map((i) => (
                    <Card key={i.ticker} className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-4 space-y-2 animate-pulse">
                      <div className="h-4 w-20 rounded bg-muted" />
                      <div className="h-3 w-32 rounded bg-muted" />
                      <div className="flex justify-between pt-1">
                        <div className="h-4 w-20 rounded bg-muted" />
                        <div className="h-4 w-14 rounded bg-muted" />
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {!loading && sortedItems.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {sortedItems.map((item) => {
                    const stock = data[item.ticker];
                    if (!stock) return null;
                    const itemAlerts = alerts.filter((a) => a.ticker === item.ticker);
                    const triggered = itemAlerts.some((a) => a.status === "triggered");
                    const armed = itemAlerts.some((a) => a.status === "armed");
                    return (
                      <WatchlistCard
                        key={item.ticker}
                        item={item}
                        stock={stock}
                        onRemove={remove}
                        onSetAlert={(t) => setAlertModalTicker(t)}
                        alertTriggered={triggered}
                        alertArmed={armed}
                      />
                    );
                  })}
                </div>
              )}

              {!loading && items.length > 0 && sortedItems.length === 0 && (
                <Card className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-6 text-center text-sm text-muted-foreground">
                  Tidak ada saham di sektor &quot;{sectorFilter}&quot;.
                </Card>
              )}

              {/* Batch Analysis + Quick Actions */}
              {!loading && items.length >= 2 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Link href={`/compare?tickers=${items.slice(0, 3).map((i) => i.ticker).join(",")}`}>
                    <Card className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-4 hover:shadow-md transition-all cursor-pointer border-primary/20 hover:border-primary/40">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <BarChart3 className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-sm font-bold">Batch Compare</div>
                          <div className="text-xs text-muted-foreground">
                            Bandingkan {Math.min(items.length, 3)} saham teratas
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
                      </div>
                    </Card>
                  </Link>
                  <Link href="/alerts">
                    <Card className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-4 hover:shadow-md transition-all cursor-pointer border-amber-500/20 hover:border-amber-500/40">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                          <Bell className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-sm font-bold">Alert Manager</div>
                          <div className="text-xs text-muted-foreground">
                            {triggeredCount > 0 ? `${triggeredCount} alert triggered` : "Kelola semua alert"}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
                      </div>
                    </Card>
                  </Link>
                </div>
              )}

              {!loading && discovery.length > 0 && (
                <div>
                  <h2 className="text-lg font-bold mb-2 px-1 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Saham Serupa dari Watchlist Anda
                  </h2>
                  <p className="text-xs text-muted-foreground mb-3 px-1">
                    Saham di sektor yang Anda pantau, belum masuk watchlist.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {discovery.map((d) => (
                      <DiscoveryCard
                        key={d.code}
                        code={d.code}
                        name={d.name}
                        sector={d.sector}
                        price={d.price}
                        changePct={d.changePct}
                        onAdd={() => addToWatchlist(d.code)}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="text-center text-xs text-muted-foreground py-4">
                <p>Watchlist tersimpan di browser Anda (localStorage)</p>
                <p className="mt-1">
                  Hapus/alert tersedia langsung di touch • Set Alert 🔔 untuk notifikasi harga
                </p>
              </div>
            </div>
          </>
        )}

        {items.length > 0 && (
          <Button
            onClick={clearAll}
            variant="ghost"
            className="min-h-10 w-full text-xs text-muted-foreground md:hidden"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Hapus semua watchlist
          </Button>
        )}

        {items.length === 0 && (
          <div className="hidden md:block">
            <EmptyState
              illustration="watchlist"
              title="Watchlist kosong"
              description="Tambahkan saham favorit dari halaman analisa untuk monitoring harga real-time + smart alerts."
              actions={[
                {
                  label: "Jelajahi saham",
                  icon: <Star className="h-3 w-3" aria-hidden />,
                  onClick: () => router.push("/"),
                },
                {
                  label: "Cari saham",
                  variant: "secondary",
                  icon: <Filter className="h-3 w-3" aria-hidden />,
                  onClick: () => router.push("/search"),
                },
              ]}
            />
          </div>
        )}
      </main>

      {alertModalTicker && (
        <PriceAlertModal
          ticker={alertModalTicker}
          currentPrice={data[alertModalTicker]?.price ?? null}
          existingAlerts={alerts.filter((a) => a.ticker === alertModalTicker)}
          onClose={() => setAlertModalTicker(null)}
        />
      )}

      <ConfirmDialog
        open={confirmAction?.type === "clearAll"}
        onOpenChange={(open) => { if (!open) setConfirmAction(null); }}
        title="Hapus semua watchlist?"
        description="Semua saham akan dihapus dari watchlist. Tindakan ini tidak bisa dibatalkan."
        confirmLabel="Hapus Semua"
        variant="danger"
        onConfirm={executeClearAll}
      />
    </div>
  );

  function triggeredAlertFor(ticker: string) {
    return alerts.some((a) => a.ticker === ticker && a.status === "triggered");
  }
}

function FilterBar({
  sortBy,
  setSortBy,
  sectorFilter,
  setSectorFilter,
  availableSectors,
}: {
  sortBy: SortBy;
  setSortBy: (s: SortBy) => void;
  sectorFilter: SectorFilter;
  setSectorFilter: (s: SectorFilter) => void;
  availableSectors: string[];
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1 shrink-0">
          <ArrowUpDown className="h-3 w-3" />
          Sort
        </span>
        {[
          { key: "default", label: "Favorit" },
          { key: "hot", label: "🔥 Hot" },
          { key: "change", label: "% Change" },
          { key: "name", label: "A-Z" },
          { key: "viewed", label: "👁 Dilihat" },
          { key: "performance", label: "📈 Return" },
        ].map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setSortBy(opt.key as SortBy)}
            aria-pressed={sortBy === opt.key}
            className={cn(
              "shrink-0 inline-flex min-h-9 items-center rounded-[0.75rem] px-3 py-1 text-xs font-bold transition-colors shadow-[shadow-sm]",
              sortBy === opt.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-accent",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {availableSectors.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1 shrink-0">
            <Filter className="h-3 w-3" />
            Sektor
          </span>
          <button
            onClick={() => setSectorFilter("all")}
            className={cn(
              "shrink-0 px-3 py-1 rounded-[0.75rem] text-xs font-bold transition-colors shadow-[shadow-sm]",
              sectorFilter === "all"
                ? "bg-foreground text-background"
                : "bg-muted hover:bg-accent",
            )}
          >
            Semua ({availableSectors.length + 1})
          </button>
          {availableSectors.map((sec) => (
            <button
              key={sec}
              onClick={() => setSectorFilter(sec)}
              className={cn(
                "shrink-0 px-3 py-1 rounded-[0.75rem] text-xs font-bold transition-colors shadow-[shadow-sm]",
                sectorFilter === sec
                  ? "bg-foreground text-background"
                  : "bg-muted hover:bg-accent",
              )}
            >
              {sec}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ShareWatchlistButton({ tickers }: { tickers: string[] }) {
  const handleShare = async () => {
    const url = `${window.location.origin}/share/watchlist?list=${tickers.join(",")}&title=Watchlist%20Saya`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("🔗 Link watchlist disalin!");
    } catch {
      toast.error("Gagal menyalin link");
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleShare}
      className="text-xs !text-white !hover:bg-white/20"
      aria-label="Bagikan watchlist"
    >
      <Share2 className="h-4 w-4" />
    </Button>
  );
}
