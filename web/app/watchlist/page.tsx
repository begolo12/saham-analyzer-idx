"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Star,
  Trash2,
  Loader2,
  ArrowLeft,
  Inbox,
  ArrowUpDown,
  Filter,
  Sparkles,
  Flame,
  Bell,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/alert";
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
import { cn, formatIDR, formatPercent } from "@/lib/utils";
import { toast } from "sonner";

type SortBy = "default" | "hot" | "change" | "name" | "viewed";
type SectorFilter = "all" | string;

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [data, setData] = useState<Record<string, WatchlistStockData>>({});
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>("default");
  const [sectorFilter, setSectorFilter] = useState<SectorFilter>("all");
  const [alertModalTicker, setAlertModalTicker] = useState<string | null>(null);

  // Load watchlist + alerts + sync across tabs
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
      window.removeEventListener("alerts-updated", alertHandler);
      window.removeEventListener("storage", handler);
      window.removeEventListener("storage", alertHandler);
    };
  }, []);

  // Fetch live prices for all watchlist tickers
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

      // Check alerts after prices load
      const priceMap: Record<string, number | null> = {};
      for (const [t, d] of entries) {
        if (d && typeof d.price === "number") priceMap[t] = d.price;
      }
      const currentAlerts = getAlerts();
      if (currentAlerts.some((a) => a.status === "armed")) {
        const { newlyTriggered } = checkAlerts(currentAlerts, priceMap);
        if (newlyTriggered.length > 0) {
          // Update local state to reflect new statuses
          setAlerts(getAlerts());
          // Show toast + browser notification per triggered alert
          for (const a of newlyTriggered) {
            const directionText =
              a.direction === "above" ? "naik di atas" : "turun ke bawah";
            toast.success(
              `🔔 ${a.ticker} ${directionText} ${formatIDR(a.threshold)} (saat ini ${formatIDR(a.triggeredPrice ?? 0)})`,
              { duration: 8000 },
            );
            // Browser notification (if user granted permission + enabled)
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
    if (confirm("Hapus semua dari watchlist?")) {
      clearAllWatchlist();
      toast.success("Watchlist cleared");
    }
  };

  const addToWatchlist = (ticker: string) => {
    if (items.some((i) => i.ticker === ticker)) return;
    setWatchlist([...items.map((i) => i.ticker), ticker]);
    toast.success(`⭐ ${ticker} added to watchlist`);
  };

  // Sector list (only from watched stocks that have data)
  const availableSectors = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      const s = data[item.ticker]?.sector;
      if (s) set.add(s);
    }
    return Array.from(set).sort();
  }, [items, data]);

  // Filter by sector
  const filteredItems = useMemo(() => {
    if (sectorFilter === "all") return items;
    return items.filter((i) => data[i.ticker]?.sector === sectorFilter);
  }, [items, data, sectorFilter]);

  // Sort
  const sortedItems = useMemo(() => {
    const arr = [...filteredItems];
    switch (sortBy) {
      case "hot":
        // By |changePct| desc
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
      default:
        // Default: most recently added first, then by viewCount as tiebreaker
        arr.sort((a, b) => {
          if (b.viewCount !== a.viewCount) return b.viewCount - a.viewCount;
          return b.addedAt - a.addedAt;
        });
    }
    return arr;
  }, [filteredItems, sortBy, data]);

  // Smart Alerts — stocks with |Δ| > 3% today
  const smartAlerts = useMemo(() => {
    const alerts: { stock: WatchlistStockData; type: "hot" | "drop"; text: string }[] = [];
    for (const item of items) {
      const s = data[item.ticker];
      if (!s) continue;
      const pct = s.changePct ?? 0;
      if (pct >= 3) {
        alerts.push({ stock: s, type: "hot", text: `+${pct.toFixed(2)}% hari ini` });
      } else if (pct <= -3) {
        alerts.push({ stock: s, type: "drop", text: `${pct.toFixed(2)}% hari ini` });
      }
    }
    return alerts;
  }, [items, data]);

  // Discovery — same sector as watched stocks, not yet in watchlist
  const discovery = useMemo(() => {
    if (items.length === 0) return [];
    const watchedTickers = new Set(items.map((i) => i.ticker));
    const watchedSectors = new Set(
      items.map((i) => data[i.ticker]?.sector).filter(Boolean),
    );
    // Limit to top 6 candidates by changePct (live data if we have it)
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

  // Self-learning summary
  const totalViews = useMemo(
    () => items.reduce((sum, i) => sum + i.viewCount, 0),
    [items],
  );
  const mostViewed = useMemo(() => {
    const arr = [...items].sort((a, b) => b.viewCount - a.viewCount);
    return arr.find((i) => i.viewCount > 0);
  }, [items]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container py-6 pb-24">
          <div className="flex items-center justify-center min-h-[50vh]">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container py-4 sm:py-6 pb-24 md:pb-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Beranda</span>
              </Button>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2">
              <Star className="h-6 w-6 sm:h-7 sm:w-7 text-amber-500 fill-amber-500" />
              Watchlist
            </h1>
            {items.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {items.length}
              </Badge>
            )}
          </div>
          {items.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="text-xs"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Hapus Semua</span>
            </Button>
          )}
        </div>

        {/* Self-learning Insight Banner */}
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

        {/* Empty State */}
        {items.length === 0 && (
          <Card className="p-8 sm:p-12 text-center">
            <div className="inline-flex p-4 rounded-full bg-amber-100 dark:bg-amber-900/30 mb-4">
              <Inbox className="h-10 w-10 text-amber-500" />
            </div>
            <h2 className="text-xl font-bold mb-2">Watchlist Kosong</h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              Tambahkan saham favorit dari halaman analisa untuk monitoring
              harga real-time + smart alerts.
            </p>
            <Link href="/">
              <Button>
                <Star className="h-4 w-4 mr-2" />
                Jelajahi Saham
              </Button>
            </Link>
          </Card>
        )}

        {/* Sort + Filter bar (only when has items) */}
        {items.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
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
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setSortBy(opt.key as SortBy)}
                  className={cn(
                    "shrink-0 px-3 py-1 rounded-full text-xs font-bold transition-colors",
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
              <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1 shrink-0">
                  <Filter className="h-3 w-3" />
                  Filter
                </span>
                <button
                  onClick={() => setSectorFilter("all")}
                  className={cn(
                    "shrink-0 px-3 py-1 rounded-full text-xs font-bold transition-colors",
                    sectorFilter === "all"
                      ? "bg-foreground text-background"
                      : "bg-muted hover:bg-accent",
                  )}
                >
                  Semua ({items.length})
                </button>
                {availableSectors.map((sec) => {
                  const count = items.filter(
                    (i) => data[i.ticker]?.sector === sec,
                  ).length;
                  return (
                    <button
                      key={sec}
                      onClick={() => setSectorFilter(sec)}
                      className={cn(
                        "shrink-0 px-3 py-1 rounded-full text-xs font-bold transition-colors",
                        sectorFilter === sec
                          ? "bg-foreground text-background"
                          : "bg-muted hover:bg-accent",
                      )}
                    >
                      {sec} ({count})
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Triggered Price Alerts */}
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
                    className="p-3 border-amber-500/40 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-700/10 dark:to-amber-700/5"
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

        {/* Smart Alerts Section */}
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

        {/* Loading skeletons */}
        {loading && items.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {items.map((i) => (
              <Card key={i.ticker} className="p-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </Card>
            ))}
          </div>
        )}

        {/* Watchlist Grid */}
        {!loading && sortedItems.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sortedItems.map((item) => {
              const stock = data[item.ticker];
              if (!stock) return null;
              const itemAlerts = alerts.filter(
                (a) => a.ticker === item.ticker,
              );
              const triggered = itemAlerts.some(
                (a) => a.status === "triggered",
              );
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

        {/* No results after filter */}
        {!loading && items.length > 0 && sortedItems.length === 0 && (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            Tidak ada saham di sektor "{sectorFilter}".
          </Card>
        )}

        {/* Discovery Section — similar stocks not yet watched */}
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

        {/* Footer info */}
        <div className="text-center text-xs text-muted-foreground py-4">
          <p>Watchlist tersimpan di browser Anda (localStorage)</p>
          <p className="mt-1">
            Klik saham untuk lihat detail • Hover untuk hapus • Set Alert 🔔 untuk notifikasi harga
          </p>
        </div>
      </main>

      {/* Price Alert Modal */}
      {alertModalTicker && (
        <PriceAlertModal
          ticker={alertModalTicker}
          currentPrice={data[alertModalTicker]?.price ?? null}
          existingAlerts={alerts.filter((a) => a.ticker === alertModalTicker)}
          onClose={() => setAlertModalTicker(null)}
        />
      )}
    </div>
  );
}
