"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Star, Trash2, Loader2, TrendingUp, TrendingDown, ArrowLeft, Inbox } from "lucide-react";
import { TopHeader } from "@/components/top-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/alert";
import { StockCardSkeleton } from "@/components/skeleton";
import { getWatchlist, setWatchlist } from "@/components/watchlist-button";
import { cn, formatIDR, formatPercent } from "@/lib/utils";
import { toast } from "sonner";

interface QuickStockData {
  code: string;
  name: string;
  sector: string;
  price: number | null;
  change: number | null;
  changePct: number | null;
  previousClose: number | null;
  error?: string;
}

export default function WatchlistPage() {
  const [tickers, setTickers] = useState<string[]>([]);
  const [data, setData] = useState<Record<string, QuickStockData>>({});
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTickers(getWatchlist());

    const handler = () => setTickers(getWatchlist());
    window.addEventListener("watchlist-updated", handler);
    return () => window.removeEventListener("watchlist-updated", handler);
  }, []);

  useEffect(() => {
    if (!mounted || tickers.length === 0) {
      setData({});
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all(
      tickers.map(async (t) => {
        try {
          const res = await fetch(`/api/quick/${t}`);
          if (!res.ok) {
            return [t, { code: t, name: "N/A", sector: "N/A", price: null, change: null, changePct: null, previousClose: null, error: "Failed" }] as const;
          }
          const json = await res.json();
          return [t, { ...json, code: t }] as const;
        } catch {
          return [t, { code: t, name: "N/A", sector: "N/A", price: null, change: null, changePct: null, previousClose: null, error: "Network error" }] as const;
        }
      }),
    ).then((entries) => {
      setData(Object.fromEntries(entries));
      setLoading(false);
    });
  }, [tickers, mounted]);

  const remove = (ticker: string) => {
    setWatchlist(tickers.filter((t) => t !== ticker));
    setTickers(getWatchlist());
    toast.success(`Removed ${ticker} from watchlist`);
  };

  const clearAll = () => {
    if (confirm("Hapus semua dari watchlist?")) {
      setWatchlist([]);
      setTickers([]);
      toast.success("Watchlist cleared");
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background">
        <TopHeader />
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
      <TopHeader />

      <main className="container py-4 sm:py-6 pb-24 md:pb-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Beranda</span>
              </Button>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2">
              <Star className="h-6 w-6 text-amber-500 fill-amber-500" />
              Watchlist
            </h1>
          </div>
          {tickers.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAll} className="text-xs">
              <Trash2 className="h-4 w-4 mr-1" />
              Hapus Semua
            </Button>
          )}
        </div>

        {/* Empty state */}
        {tickers.length === 0 && (
          <Card className="p-8 sm:p-12 text-center">
            <div className="inline-flex p-4 rounded-full bg-amber-100 dark:bg-amber-900/30 mb-4">
              <Inbox className="h-10 w-10 text-amber-500" />
            </div>
            <h2 className="text-xl font-bold mb-2">Watchlist Kosong</h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              Tambahkan saham favorit dari halaman analisa untuk monitoring harga real-time.
            </p>
            <Link href="/">
              <Button>Jelajahi Saham</Button>
            </Link>
          </Card>
        )}

        {/* Loading skeletons */}
        {loading && tickers.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {tickers.map((t) => (
              <StockCardSkeleton key={t} />
            ))}
          </div>
        )}

        {/* Stock grid */}
        {!loading && tickers.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {tickers.map((ticker) => {
              const stock = data[ticker];
              if (!stock) return null;
              const isUp = (stock.changePct ?? 0) >= 0;

              return (
                <Card key={ticker} className="p-4 card-hover relative group">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      remove(ticker);
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-full opacity-0 group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground transition-all"
                    aria-label="Remove"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>

                  <Link href={`/stock/${ticker}`} className="block">
                    <div className="flex items-start justify-between mb-2 pr-6">
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-lg">{ticker}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {stock.name || "Loading..."}
                        </div>
                      </div>
                      {stock.changePct !== null && (
                        <div
                          className={cn(
                            "flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full shrink-0",
                            isUp
                              ? "bg-bull-100 text-bull-700 dark:bg-bull-700/30 dark:text-bull-500"
                              : "bg-bear-100 text-bear-700 dark:bg-bear-700/30 dark:text-bear-500",
                          )}
                        >
                          {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {formatPercent(stock.changePct)}
                        </div>
                      )}
                    </div>

                    <div className="mt-3">
                      <div className="text-2xl font-black tabular-nums">
                        {stock.price ? formatIDR(stock.price) : "—"}
                      </div>
                      {stock.change !== null && (
                        <div
                          className={cn(
                            "text-xs tabular-nums",
                            isUp ? "text-bull-600" : "text-bear-600",
                          )}
                        >
                          {isUp ? "+" : ""}
                          {stock.change ? Math.round(stock.change).toLocaleString("id-ID") : 0}
                        </div>
                      )}
                    </div>

                    {stock.sector && (
                      <Badge variant="secondary" className="mt-3 text-[10px]">
                        {stock.sector}
                      </Badge>
                    )}
                  </Link>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
