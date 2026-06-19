"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Filter,
  Loader2,
  Star,
  TrendingUp,
  TrendingDown,
  Activity,
  Plus,
  Info,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/alert";
import { TopHeader } from "@/components/top-header";
import { SCREENER_PRESETS, type ScreenerType, type ScreenerResult } from "@/lib/screener";
import { cn, formatIDR, formatPercent } from "@/lib/utils";
import { toast } from "sonner";

export default function ScreenerPage() {
  const router = useRouter();
  const [selectedScreen, setSelectedScreen] = useState<ScreenerType>("volume-breakout");
  const [results, setResults] = useState<ScreenerResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [method, setMethod] = useState<"fast" | "deep" | null>(null);
  const [total, setTotal] = useState(0);
  const [scanned, setScanned] = useState(0);

  const selectedPreset = useMemo(
    () => SCREENER_PRESETS.find((p) => p.id === selectedScreen),
    [selectedScreen],
  );

  const loadScreen = async (screen: ScreenerType) => {
    setSelectedScreen(screen);
    setLoading(true);
    setResults([]);
    try {
      const res = await fetch(`/api/screener?screen=${screen}&limit=20`);
      if (!res.ok) throw new Error("Screener failed");
      const data = await res.json();
      setResults(data.results || []);
      setMethod(data.method);
      setTotal(data.total || 0);
      setScanned(data.scanned || 0);
    } catch (err) {
      toast.error("Gagal menjalankan screener");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadScreen("volume-breakout");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <TopHeader />

      <main className="container py-4 sm:py-6 pb-24 md:pb-6">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2">
            <Filter className="h-6 w-6 sm:h-7 sm:h-7 text-primary" />
            Stock Screener
          </h1>
          <p className="text-sm text-muted-foreground">
            Screening saham IDX dengan kriteria teknikal
          </p>
        </div>

        <Alert variant="info" className="mb-4">
          <strong>💡 Tips:</strong> Pilih preset di bawah untuk filter saham.
          Tap kartu hasil untuk lihat analisa lengkap atau tambah ke watchlist.
        </Alert>

        {/* Preset Chips */}
        <div className="mb-4">
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-2">
            {SCREENER_PRESETS.map((preset) => {
              const active = selectedScreen === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => loadScreen(preset.id)}
                  className={cn(
                    "shrink-0 rounded-2xl border-2 px-4 py-3 transition-all min-w-[160px] text-left",
                    active
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-border hover:border-primary/40",
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{preset.icon}</span>
                    <span className={cn("font-bold text-sm", active && "text-primary")}>
                      {preset.name}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground line-clamp-2">
                    {preset.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Results Header */}
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <div className="font-bold text-base flex items-center gap-2">
              {selectedPreset?.icon} {selectedPreset?.name}
            </div>
            <div className="text-xs text-muted-foreground">
              {loading ? (
                "Scanning..."
              ) : (
                <>
                  {total} hasil ditemukan
                  {method === "deep" && scanned > 0 && ` (scanned ${scanned} saham)`}
                </>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadScreen(selectedScreen)}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              "Refresh"
            )}
          </Button>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-16 bg-secondary rounded shimmer" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-24 bg-secondary rounded shimmer" />
                    <div className="h-3 w-40 bg-secondary rounded shimmer" />
                  </div>
                  <div className="h-8 w-20 bg-secondary rounded shimmer" />
                </div>
              </Card>
            ))}
            <div className="text-center text-xs text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin inline mr-1" />
              {method === "deep"
                ? "Deep scan in progress (bisa 10-30 detik)..."
                : "Loading..."}
            </div>
          </div>
        )}

        {/* Results */}
        {!loading && results.length === 0 && (
          <Alert variant="info">
            <Info className="h-4 w-4" />
            Tidak ada saham yang match kriteria "{selectedPreset?.name}" saat ini.
            Coba screener lain atau refresh nanti.
          </Alert>
        )}

        {!loading && results.length > 0 && (
          <div className="space-y-2">
            {results.map((result) => (
              <ScreenerResultCard
                key={result.code}
                result={result}
                onClick={() => router.push(`/stock/${result.code}`)}
              />
            ))}
          </div>
        )}

        {/* Educational footer */}
        {!loading && results.length > 0 && (
          <Card className="p-4 mt-6 bg-secondary/30">
            <h3 className="font-bold text-sm mb-2 flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Tentang {selectedPreset?.name}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {selectedPreset?.description}.{" "}
              {method === "deep" && (
                <span className="italic">
                  Scan ini membutuhkan data historis sehingga lebih lambat. Gunakan untuk analisa mendalam.
                </span>
              )}
              {method === "fast" && (
                <span className="italic">
                  Scan ini real-time dari perubahan harga hari ini.
                </span>
              )}
            </p>
            <p className="text-[10px] text-muted-foreground mt-2">
              ⚠️ Screener adalah alat bantu, bukan sinyal beli/jual. Tetap DYOR.
            </p>
          </Card>
        )}
      </main>
    </div>
  );
}

function ScreenerResultCard({
  result,
  onClick,
}: {
  result: ScreenerResult;
  onClick: () => void;
}) {
  const isUp = result.changePct >= 0;
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl border bg-card p-4 card-hover"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-bold text-base">{result.code}</span>
            <Badge variant="secondary" className="text-[10px]">
              {result.sector}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground line-clamp-1 mb-2">
            {result.name}
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <Badge variant="info" className="text-[10px]">
              <Activity className="h-3 w-3 mr-0.5" />
              {result.matchDetails}
            </Badge>
            <span className="text-muted-foreground">
              score {result.matchScore.toFixed(0)}
            </span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-base font-bold tabular-nums">
            {formatIDR(result.currentPrice)}
          </div>
          <div
            className={cn(
              "text-xs font-bold tabular-nums",
              isUp ? "text-bull-600" : "text-bear-600",
            )}
          >
            {isUp ? <TrendingUp className="h-3 w-3 inline mr-0.5" /> : <TrendingDown className="h-3 w-3 inline mr-0.5" />}
            {formatPercent(result.changePct)}
          </div>
        </div>
      </div>
    </button>
  );
}
