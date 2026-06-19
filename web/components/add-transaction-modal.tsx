"use client";

import { useState } from "react";
import { X, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addTransaction } from "@/lib/portfolio-storage";
import { normalizeTicker, type Transaction } from "@/lib/portfolio";
import { formatIDR, cn } from "@/lib/utils";
import { toast } from "sonner";

interface AddTransactionModalProps {
  defaultTicker?: string;
  defaultPrice?: number;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AddTransactionModal({
  defaultTicker = "",
  defaultPrice,
  onClose,
  onSuccess,
}: AddTransactionModalProps) {
  const [type, setType] = useState<"BUY" | "SELL">("BUY");
  const [ticker, setTicker] = useState(defaultTicker);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [price, setPrice] = useState(defaultPrice?.toString() ?? "");
  const [quantity, setQuantity] = useState("100");
  const [fee, setFee] = useState("0.15");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(price.replace(/[^0-9.]/g, ""));
    const qtyNum = parseInt(quantity.replace(/[^0-9]/g, ""), 10);
    const feeNum = parseFloat(fee) || 0;

    if (!ticker.trim() || !priceNum || !qtyNum) {
      toast.error("Lengkapi ticker, harga, dan jumlah");
      return;
    }

    setSubmitting(true);
    try {
      addTransaction({
        ticker: ticker.trim(),
        type,
        date,
        price: priceNum,
        quantity: qtyNum,
        fee: feeNum,
        notes: notes.trim() || undefined,
      });

      toast.success(
        `${type === "BUY" ? "🟢 Beli" : "🔴 Jual"} ${qtyNum} lembar ${normalizeTicker(ticker)} @ ${formatIDR(priceNum)}`,
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

  const totalPreview =
    parseFloat(price.replace(/[^0-9.]/g, "") || "0") *
    parseInt(quantity.replace(/[^0-9]/g, "") || "0");

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-0 sm:p-4"
      onClick={onClose}
    >
      <Card
        className="w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl rounded-b-none sm:rounded-b-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold">Tambah Transaksi</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Tersimpan di browser (localStorage)
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
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
                "rounded-xl border-2 p-3 font-semibold transition-all",
                type === "BUY"
                  ? "border-bull-500 bg-bull-50 dark:bg-bull-700/20 text-bull-700 dark:text-bull-500"
                  : "border-border hover:border-bull-500/50",
              )}
            >
              <TrendingUp className="h-5 w-5 mx-auto mb-1" />
              BELI
            </button>
            <button
              type="button"
              onClick={() => setType("SELL")}
              className={cn(
                "rounded-xl border-2 p-3 font-semibold transition-all",
                type === "SELL"
                  ? "border-bear-500 bg-bear-50 dark:bg-bear-700/20 text-bear-700 dark:text-bear-500"
                  : "border-border hover:border-bear-500/50",
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
            <Input
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              placeholder="BBCA"
              className="mt-1 h-12 text-base uppercase"
              autoFocus
              required
            />
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
              className="mt-1 h-12"
              required
            />
          </div>

          {/* Price */}
          <div className="mb-3">
            <label className="text-xs font-medium text-muted-foreground">
              Harga per Lembar
            </label>
            <Input
              type="text"
              inputMode="numeric"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="6500"
              className="mt-1 h-12 text-base tabular-nums"
              required
            />
          </div>

          {/* Quantity (lots) */}
          <div className="mb-3">
            <label className="text-xs font-medium text-muted-foreground">
              Jumlah Lembar (1 lot = 100 lembar)
            </label>
            <div className="flex gap-2 mt-1">
              <Input
                type="text"
                inputMode="numeric"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="100"
                className="h-12 text-base tabular-nums flex-1"
                required
              />
              <div className="flex gap-1">
                {[100, 500, 1000].map((qty) => (
                  <button
                    key={qty}
                    type="button"
                    onClick={() => setQuantity(qty.toString())}
                    className="px-3 h-12 rounded-xl border bg-secondary text-xs font-medium hover:bg-accent"
                  >
                    {qty}
                  </button>
                ))}
              </div>
            </div>
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
              className="mt-1 h-12 text-base tabular-nums"
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
              className="mt-1 h-10"
            />
          </div>

          {/* Total Preview */}
          {price && quantity && totalPreview > 0 && (
            <div className="rounded-lg bg-secondary p-3 mb-4">
              <div className="text-xs text-muted-foreground">
                Total {type === "BUY" ? "Pembelian" : "Penjualan"}
              </div>
              <div className="text-xl font-bold tabular-nums">
                {formatIDR(totalPreview)}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                + Fee {formatIDR((totalPreview * (parseFloat(fee) || 0)) / 100)}
              </div>
            </div>
          )}

          {/* Submit */}
          <Button
            type="submit"
            size="lg"
            disabled={submitting}
            className={cn(
              "w-full",
              type === "BUY"
                ? "bg-bull-600 hover:bg-bull-700"
                : "bg-bear-600 hover:bg-bear-700",
            )}
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                {type === "BUY" ? "🟢" : "🔴"} Konfirmasi {type === "BUY" ? "Beli" : "Jual"}
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
