"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Share2, ArrowLeft, Loader2, Check, Plus, Copy, Star } from "lucide-react";
import { TopHeader } from "@/components/top-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/alert";
import { useWatchlist, addToWatchlist } from "@/lib/watchlist-storage";
import { POPULAR_STOCKS } from "@/lib/popular-stocks";
import { cn, formatIDR, formatPercent } from "@/lib/utils";
import { toast } from "sonner";

interface SharedStock {
  code: string;
  name: string;
  sector?: string;
  price: number | null;
  change: number | null;
  changePct: number | null;
}

type RawStock = {
  code: string;
  name: string;
  sector?: string;
  price: number | null;
  change: number | null;
  changePct: number | null;
};

export default function ShareWatchlistPage() {
  const params = useSearchParams();
  const listParam = params.get("list") || "";
  const title = params.get("title") || "Watchlist";
  const owner = params.get("owner") || "Anonymous";
  const tickers = useMemo(
    () =>
      listParam
        .split(",")
        .map((t) => t.trim().toUpperCase())
        .filter(Boolean)
        .slice(0, 20),
    [listParam],
  );

  const [stocks, setStocks] = useState<SharedStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [imported, setImported] = useState(false);
  const [copied, setCopied] = useState(false);
  const { tickers: existingTickers } = useWatchlist();

  useEffect(() => {
    if (tickers.length === 0) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all(
      tickers.map(async (t): Promise<RawStock | null> => {
        try {
          const res = await fetch(`/api/quick/${t}`);
          if (!res.ok) return null;
          const data = await res.json();
          return {
            code: t,
            name: data.name || POPULAR_STOCKS.find((s) => s.code === t)?.name || t,
            sector: data.sector || POPULAR_STOCKS.find((s) => s.code === t)?.sector,
            price: data.price ?? null,
            change: data.change ?? null,
            changePct: data.changePct ?? null,
          };
        } catch {
          return {
            code: t,
            name: POPULAR_STOCKS.find((s) => s.code === t)?.name || t,
            sector: POPULAR_STOCKS.find((s) => s.code === t)?.sector,
            price: null,
            change: null,
            changePct: null,
          };
        }
      }),
    ).then((results) => {
      if (cancelled) return;
      setStocks(results.filter((r): r is RawStock => r !== null));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [tickers]);

  const handleImport = () => {
    let addedCount = 0;
    let skippedCount = 0;
    for (const stock of stocks) {
      if (existingTickers.includes(stock.code)) {
        skippedCount++;
        continue;
      }
      try {
        addToWatchlist(stock.code);
        addedCount++;
      } catch {
        skippedCount++;
      }
    }
    setImported(true);
    if (addedCount > 0) {
      toast.success(
        `✅ ${addedCount} saham ditambahkan${skippedCount > 0 ? ` (${skippedCount} sudah ada)` : ""}`,
      );
    } else if (skippedCount > 0) {
      toast("Semua saham sudah ada di watchlist kamu", { icon: "ℹ️" });
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("Link disalin!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Gagal menyalin link");
    }
  };

  const newTickers = tickers.filter((t) => !existingTickers.includes(t));
  const allExisting = newTickers.length === 0 && tickers.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <TopHeader />
      <main className="container py-4 sm:py-6 pb-24 md:pb-6 space-y-4">
        <div className="flex items-center gap-2">
          <Link href="/watchlist">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Watchlist</span>
            </Button>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2">
            <Share2 className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
            Watchlist Sharing
          </h1>
        </div>

        {tickers.length === 0 ? (
          <Card className="p-6 text-center">
            <Share2 className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <h2 className="text-lg font-bold mb-2">Tidak Ada Watchlist</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Link share harus mengandung parameter <code>?list=BBCA,BMRI</code>.
            </p>
            <Link href="/watchlist">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Kembali ke Watchlist
              </Button>
            </Link>
          </Card>
        ) : (
          <>
            <Card className="p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold truncate">{title}</h2>
                  <p className="text-xs text-muted-foreground">
                    Dibagikan oleh <strong>{owner}</strong> · {tickers.length} saham
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyLink}
                  className="shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Tersalin
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1" />
                      Salin Link
                    </>
                  )}
                </Button>
              </div>

              {!imported ? (
                <Button
                  onClick={handleImport}
                  disabled={allExisting}
                  className="w-full"
                  size="lg"
                >
                  {allExisting ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Semua Sudah di Watchlist
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Tambah {newTickers.length} Saham ke Watchlist Saya
                    </>
                  )}
                </Button>
              ) : (
                <Alert variant="info">
                  ✅ Saham sudah ditambahkan ke watchlist kamu.{" "}
                  <Link href="/watchlist" className="underline font-medium">
                    Lihat watchlist
                  </Link>
                </Alert>
              )}
            </Card>

            {/* Stock list */}
            <Card className="p-3 sm:p-4">
              <h3 className="text-sm font-bold mb-2 flex items-center gap-1.5">
                <Star className="h-4 w-4 text-amber-500" />
                Isi Watchlist
              </h3>
              {loading ? (
                <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Memuat data saham...
                </div>
              ) : (
                <div className="space-y-1.5">
                  {stocks.map((s) => {
                    const isUp = (s.changePct ?? 0) >= 0;
                    const alreadyIn = existingTickers.includes(s.code);
                    return (
                      <div
                        key={s.code}
                        className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="font-bold text-sm">{s.code}</span>
                          <span className="text-[10px] text-muted-foreground truncate">
                            {s.sector}
                          </span>
                          {alreadyIn && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                              ✓ Sudah
                            </span>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-bold tabular-nums">
                            {s.price !== null ? formatIDR(s.price) : "—"}
                          </div>
                          {s.changePct !== null && (
                            <div
                              className={cn(
                                "text-[10px] font-bold tabular-nums",
                                isUp ? "text-bull-600" : "text-bear-600",
                              )}
                            >
                              {formatPercent(s.changePct)}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
