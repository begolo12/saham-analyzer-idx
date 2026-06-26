"use client";

import { useState, useEffect } from "react";
import { X, TrendingUp, TrendingDown, Loader2, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addTransaction } from "@/lib/portfolio-storage";
import { normalizeTicker, type Transaction } from "@/lib/portfolio";
import { POPULAR_STOCKS, type PopularStock } from "@/lib/popular-stocks";
import { formatIDR, cn } from "@/lib/utils";
import { TickerAutocomplete } from "@/components/ticker-autocomplete";
import { toast } from "sonner";

interface AddTransactionModalProps {
  defaultTicker?: string;
  defaultPrice?: number;
  defaultType?: "BUY" | "SELL";
  defaultLot?: number;
  maxLot?: number; // For SELL validation
  onClose: () => void;
  onSuccess?: () => void;
}

export function AddTransactionModal({
  defaultTicker = "",
  defaultPrice,
  defaultType = "BUY",
  defaultLot = 1,
  maxLot,
  onClose,
  onSuccess,
}: AddTransactionModalProps) {
  const [type, setType] = useState<"BUY" | "SELL">(defaultType);
  const [ticker, setTicker] = useState(defaultTicker);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [price, setPrice] = useState(defaultPrice?.toString() ?? "");
  const [lotInput, setLotInput] = useState(defaultLot.toString());
  const [fee, setFee] = useState("0.15");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceAutoFilled, setPriceAutoFilled] = useState(false);

  // 5 quick-pick blue chips (popular & liquid IDX stocks)
  const QUICK_PICKS = ["BBCA", "BBRI", "BMRI", "TLKM", "ASII"] as const;

  // Fetch live price for a selected stock and auto-fill if user hasn't manually edited price.
  const fetchAndFillPrice = async (stock: PopularStock) => {
    setPriceLoading(true);
    try {
      const res = await fetch(`/api/quick/${stock.code}`);
      if (res.ok) {
        const data = await res.json();
        if (data.price && (priceAutoFilled || price === "")) {
          // Round to nearest integer for cleaner display
          setPrice(String(Math.round(data.price)));
          setPriceAutoFilled(true);
        }
      }
    } catch {
      // Silently fail — user can type price manually
    } finally {
      setPriceLoading(false);
    }
  };

  // Sync type when defaultType changes (e.g., opening for SELL from a holding)
  useEffect(() => {
    setType(defaultType);
  }, [defaultType]);

  // Sync lot when defaultLot changes
  useEffect(() => {
    setLotInput(defaultLot.toString());
  }, [defaultLot]);

  const priceNum = parseFloat(price.replace(/[^0-9.]/g, ""));
  const lotNum = parseInt(lotInput.replace(/[^0-9]/g, ""), 10);
  const lembarNum = lotNum * 100;
  const feeNum = parseFloat(fee) || 0;
  const total = priceNum * lembarNum;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker.trim() || !priceNum || !lotNum) {
      toast.error("Lengkapi ticker, harga, dan jumlah lot");
      return;
    }

    if (lotNum <= 0) {
      toast.error("Jumlah lot harus lebih dari 0");
      return;
    }

    if (maxLot !== undefined && lotNum > maxLot && type === "SELL") {
      toast.error(`Maksimal jual ${maxLot} lot (${maxLot * 100} lembar)`);
      return;
    }

    setSubmitting(true);
    try {
      addTransaction({
        ticker: ticker.trim(),
        type,
        date,
        price: priceNum,
        quantity: lembarNum, // Store as lembar
        fee: (total * feeNum) / 100,
        notes: notes.trim() || undefined,
      });

      toast.success(
        `${type === "BUY" ? "🟢 Beli" : "🔴 Jual"} ${lotNum} lot (${lembarNum.toLocaleString("id-ID")} lembar) ${normalizeTicker(ticker)} @ ${formatIDR(priceNum)}`,
        {
          description: "Tersimpan ke portfolio. Data aman di browser.",
          duration: 4000,
        },
      );

      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error("Gagal menyimpan transaksi");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-0 sm:p-4"
      onClick={onClose}
    >
      <Card
        className="w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl rounded-b-none sm:rounded-b-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold">💰 Tambah Transaksi</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Tersimpan di browser (localStorage)
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-xl"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Buy/Sell Toggle */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              type="button"
              onClick={() => setType("BUY")}
              className={cn(
                "rounded-2xl border-2 p-3 font-semibold transition-all",
                "shadow-[3px_3px_6px_rgba(0,0,0,0.06),-3px_-3px_6px_rgba(255,255,255,0.4)]",
                type === "BUY"
                  ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
                  : "border-border hover:border-emerald-500/50",
              )}
            >
              <TrendingUp className="h-5 w-5 mx-auto mb-1" />
              BELI
            </button>
            <button
              type="button"
              onClick={() => setType("SELL")}
              className={cn(
                "rounded-2xl border-2 p-3 font-semibold transition-all",
                "shadow-[3px_3px_6px_rgba(0,0,0,0.06),-3px_-3px_6px_rgba(255,255,255,0.4)]",
                type === "SELL"
                  ? "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"
                  : "border-border hover:border-red-500/50",
              )}
            >
              <TrendingDown className="h-5 w-5 mx-auto mb-1" />
              JUAL
            </button>
          </div>

          {/* Ticker */}
          <div className="mb-3">
            <label className="text-xs font-medium text-muted-foreground">
              Kode Saham
            </label>
            <div className="mt-1">
              <TickerAutocomplete
                value={ticker}
                onChange={setTicker}
                onSelect={fetchAndFillPrice}
                placeholder="BBCA"
                autoFocus
              />
            </div>
            {/* Quick pick chips — visible only when ticker is empty */}
            {!ticker && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className="text-[10px] text-muted-foreground self-center mr-1">
                  Cepat:
                </span>
                {QUICK_PICKS.map((code) => {
                  const stock = POPULAR_STOCKS.find((s) => s.code === code);
                  if (!stock) return null;
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => {
                        setTicker(code);
                        fetchAndFillPrice(stock);
                      }}
                      className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-medium bg-muted hover:bg-accent transition-colors",
                        "shadow-[2px_2px_4px_rgba(0,0,0,0.04),-2px_-2px_4px_rgba(255,255,255,0.3)]",
                      )}
                    >
                      {code}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Date */}
          <div className="mb-3">
            <label className="text-xs font-medium text-muted-foreground">
              Tanggal
            </label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 h-12 rounded-xl"
              style={{ boxShadow: "inset 2px 2px 4px rgba(0,0,0,0.06), inset -2px -2px 4px rgba(255,255,255,0.4)" }}
              required
            />
          </div>

          {/* Price */}
          <div className="mb-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">
                Harga per Lembar
              </label>
              {priceLoading ? (
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Mengambil harga...
                </span>
              ) : priceAutoFilled ? (
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Zap className="h-3 w-3 fill-current" />
                  Live dari Yahoo Finance
                </span>
              ) : null}
            </div>
            <Input
              type="text"
              inputMode="numeric"
              value={price}
              onChange={(e) => {
                setPrice(e.target.value);
                setPriceAutoFilled(false);
              }}
              placeholder="6500"
              className="mt-1 h-12 text-base tabular-nums rounded-xl font-num"
              style={{ boxShadow: "inset 2px 2px 4px rgba(0,0,0,0.06), inset -2px -2px 4px rgba(255,255,255,0.4)" }}
              required
            />
          </div>

          {/* Lot Quantity */}
          <div className="mb-3">
            <label className="text-xs font-medium text-muted-foreground">
              Jumlah Lot (1 lot = 100 lembar)
            </label>
            <div className="flex gap-2 mt-1">
              <Input
                type="text"
                inputMode="numeric"
                value={lotInput}
                onChange={(e) => setLotInput(e.target.value)}
                placeholder="1"
                className="h-12 text-base tabular-nums flex-1 rounded-xl font-num"
                style={{ boxShadow: "inset 2px 2px 4px rgba(0,0,0,0.06), inset -2px -2px 4px rgba(255,255,255,0.4)" }}
                required
              />
              <div className="flex gap-1">
                {[1, 5, 10, 50, 100].map((lot) => (
                  <button
                    key={lot}
                    type="button"
                    onClick={() => setLotInput(lot.toString())}
                    className={cn(
                      "px-3 h-12 rounded-xl border bg-secondary text-xs font-medium hover:bg-accent shrink-0",
                      "shadow-[2px_2px_4px_rgba(0,0,0,0.04),-2px_-2px_4px_rgba(255,255,255,0.3)]",
                      "active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.08),inset_-2px_-2px_4px_rgba(255,255,255,0.2)]",
                      lotInput === lot.toString() && "border-primary bg-primary/10 text-primary",
                    )}
                  >
                    {lot}
                  </button>
                ))}
              </div>
            </div>
            {maxLot !== undefined && type === "SELL" && (
              <p className="text-[10px] text-muted-foreground mt-1">
                Dimiliki: {maxLot} lot ({maxLot * 100} lembar)
              </p>
            )}
          </div>

          {/* Fee */}
          <div className="mb-3">
            <label className="text-xs font-medium text-muted-foreground">
              Fee / Komisi (%) — default 0.15%
            </label>
            <Input
              type="text"
              inputMode="decimal"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              placeholder="0.15"
              className="mt-1 h-12 text-base tabular-nums rounded-xl font-num"
              style={{ boxShadow: "inset 2px 2px 4px rgba(0,0,0,0.06), inset -2px -2px 4px rgba(255,255,255,0.4)" }}
            />
          </div>

          {/* Notes */}
          <div className="mb-4">
            <label className="text-xs font-medium text-muted-foreground">
              Catatan (opsional)
            </label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Buy untuk jangka panjang..."
              className="mt-1 h-10 rounded-xl"
              style={{ boxShadow: "inset 2px 2px 4px rgba(0,0,0,0.06), inset -2px -2px 4px rgba(255,255,255,0.4)" }}
            />
          </div>

          {/* Total Preview */}
          {priceNum && lotNum > 0 && (
            <div
              className={cn(
                "rounded-2xl p-4 mb-4",
                type === "BUY"
                  ? "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200/50 dark:border-emerald-700/30"
                  : "bg-red-50 dark:bg-red-900/20 border border-red-200/50 dark:border-red-700/30",
              )}
              style={{ boxShadow: "4px 4px 8px rgba(0,0,0,0.06), -4px -4px 8px rgba(255,255,255,0.4)" }}
            >
              <div className="text-xs text-muted-foreground">
                Total {type === "BUY" ? "Pembelian" : "Penjualan"}
              </div>
              <div className="text-2xl font-black tabular-nums font-num">
                {formatIDR(total)}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5 tabular-nums font-num">
                {lotNum} lot × {lembarNum.toLocaleString("id-ID")} lembar ×{" "}
                {formatIDR(priceNum)}
                {feeNum > 0 && ` + Fee ${formatIDR((total * feeNum) / 100)}`}
              </div>
            </div>
          )}

          {/* Submit */}
          <Button
            type="submit"
            size="lg"
            disabled={submitting}
            className={cn(
              "bg-[hsl(var(--primary))] text-white rounded-lg w-full rounded-2xl min-h-[48px]",
              type === "BUY"
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-red-600 hover:bg-red-700",
            )}
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                {type === "BUY" ? "🟢" : "🔴"} Konfirmasi{" "}
                {type === "BUY" ? "Beli" : "Jual"} {lotNum || 0} Lot
              </>
            )}
          </Button>

          <p className="text-[10px] text-muted-foreground text-center mt-3">
            💾 Data tersimpan di browser Anda. Aman sampai cache dihapus.
          </p>
        </form>
      </Card>
    </div>
  );
}
