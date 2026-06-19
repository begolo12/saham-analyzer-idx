"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowDownToLine, ArrowUpFromLine, Loader2, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn, formatIDR, formatPercent } from "@/lib/utils";

interface FlowStock {
  code: string;
  name: string;
  sector: string;
  price: number;
  change: number;
  changePct: number;
  volume: number;
  avgVolume20d: number;
  volumeRatio: number;
  signal: "FOREIGN_BUY" | "FOREIGN_SELL" | "NEUTRAL";
  score: number;
}

interface ForeignFlowData {
  netBuy: FlowStock[];
  netSell: FlowStock[];
  fetchedAt: string;
  dataSource: string;
}

const CACHE_KEY = "saham_foreign_flow_cache";
const CACHE_TTL = 30 * 60 * 1000; // 30 min

function getCached(): ForeignFlowData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ForeignFlowData;
    if (Date.now() - new Date(parsed.fetchedAt).getTime() > CACHE_TTL) return null;
    return parsed;
  } catch {
    return null;
  }
}

function setCache(data: ForeignFlowData) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CACHE_KEY, JSON.stringify(data));
}

function formatVolume(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1_000_000) return `${(v / 1e6).toFixed(0)}M`;
  if (v >= 1_000) return `${(v / 1e3).toFixed(0)}K`;
  return String(v);
}

export function ForeignFlow() {
  const [data, setData] = useState<ForeignFlowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const cached = getCached();
    if (cached) {
      setData(cached);
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch("/api/foreign-flow");
        if (!res.ok) throw new Error("Foreign flow fetch failed");
        const result = await res.json();
        if (cancelled) return;
        setData(result);
        setCache(result);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError("Gagal memuat data flow");
        console.error(err);
      } finally {
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
          <ArrowDownToLine className="h-5 w-5 text-primary" />
          <h2 className="text-base font-bold">Foreign Flow (Asing)</h2>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Estimasi aktivitas asing...
        </div>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-2">
          <ArrowDownToLine className="h-5 w-5 text-primary" />
          <h2 className="text-base font-bold">Foreign Flow (Asing)</h2>
        </div>
        <p className="text-xs text-muted-foreground">{error || "Data belum tersedia"}</p>
      </Card>
    );
  }

  const hasData = data.netBuy.length > 0 || data.netSell.length > 0;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ArrowDownToLine className="h-5 w-5 text-primary" />
          <h2 className="text-base font-bold">Foreign Flow (Asing)</h2>
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Info foreign flow"
          >
            <Info className="h-4 w-4" />
          </button>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {new Date(data.fetchedAt).toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>

      {showInfo && (
        <div className="mb-3 rounded-lg border bg-amber-50/50 dark:bg-amber-700/10 p-3 text-[11px] text-amber-900 dark:text-amber-300">
          <strong>ℹ️ Disclaimer:</strong> IDX tidak menyediakan API publik untuk
          data asing. Ini adalah <em>proxy</em> dari volume spike + price action
          (bukan data asli). Konfirmasi via broker summary (Stockbit, IPOT, dll)
          untuk akurasi.
        </div>
      )}

      {!hasData ? (
        <p className="text-xs text-muted-foreground">
          Belum ada saham dengan aktivitas mencolok hari ini.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Net Buy */}
          <div className="rounded-lg border-2 border-bull-500/30 bg-bull-50/30 dark:bg-bull-700/10 p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <ArrowDownToLine className="h-4 w-4 text-bull-600" />
              <h3 className="text-sm font-bold text-bull-700 dark:text-bull-500">
                Net Buy (Asing Potensi Akumulasi)
              </h3>
            </div>
            {data.netBuy.length === 0 ? (
              <p className="text-xs text-muted-foreground">Tidak ada sinyal</p>
            ) : (
              <div className="space-y-1">
                {data.netBuy.map((s) => (
                  <FlowRow key={s.code} stock={s} />
                ))}
              </div>
            )}
          </div>

          {/* Net Sell */}
          <div className="rounded-lg border-2 border-bear-500/30 bg-bear-50/30 dark:bg-bear-700/10 p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <ArrowUpFromLine className="h-4 w-4 text-bear-600" />
              <h3 className="text-sm font-bold text-bear-700 dark:text-bear-500">
                Net Sell (Asing Potensi Distribusi)
              </h3>
            </div>
            {data.netSell.length === 0 ? (
              <p className="text-xs text-muted-foreground">Tidak ada sinyal</p>
            ) : (
              <div className="space-y-1">
                {data.netSell.map((s) => (
                  <FlowRow key={s.code} stock={s} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

function FlowRow({ stock }: { stock: FlowStock }) {
  const isUp = stock.changePct >= 0;
  return (
    <Link
      href={`/stock/${stock.code}`}
      className="flex items-center justify-between gap-2 p-1.5 rounded-md hover:bg-background/50 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-xs">{stock.code}</span>
          <span className="text-[10px] text-muted-foreground truncate">
            {stock.sector}
          </span>
        </div>
        <div className="text-[10px] text-muted-foreground">
          Vol {formatVolume(stock.volume)} ({stock.volumeRatio.toFixed(1)}x avg)
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-xs font-bold tabular-nums">
          {formatIDR(stock.price)}
        </div>
        <div
          className={cn(
            "text-[10px] font-bold tabular-nums",
            isUp ? "text-bull-600" : "text-bear-600",
          )}
        >
          {formatPercent(stock.changePct)}
        </div>
      </div>
    </Link>
  );
}
