"use client";

import { useState, useEffect } from "react";
import { X, Bell, Loader2, ArrowUp, ArrowDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addAlert, removeAlert, type PriceAlert, type AlertDirection } from "@/lib/price-alerts";
import { formatIDR, cn } from "@/lib/utils";
import { toast } from "sonner";

interface PriceAlertModalProps {
  ticker: string;
  currentPrice: number | null;
  existingAlerts: PriceAlert[];
  onClose: () => void;
}

export function PriceAlertModal({
  ticker,
  currentPrice,
  existingAlerts,
  onClose,
}: PriceAlertModalProps) {
  const [direction, setDirection] = useState<AlertDirection>("above");
  const [threshold, setThreshold] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Suggest thresholds based on current price
  const suggestions =
    currentPrice && currentPrice > 0
      ? direction === "above"
        ? [
            Math.round(currentPrice * 1.05),
            Math.round(currentPrice * 1.1),
            Math.round(currentPrice * 1.2),
            Math.round(currentPrice * 1.5),
          ]
        : [
            Math.round(currentPrice * 0.95),
            Math.round(currentPrice * 0.9),
            Math.round(currentPrice * 0.8),
            Math.round(currentPrice * 0.5),
          ]
      : [];

  useEffect(() => {
    if (currentPrice && !threshold) {
      // Default ke +5% dari harga saat ini
      setThreshold(String(Math.round(currentPrice * 1.05)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPrice, direction]);

  const thresholdNum = parseFloat(threshold.replace(/[^0-9.]/g, ""));
  const isValid = thresholdNum > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) {
      toast.error("Masukkan target harga yang valid");
      return;
    }
    if (currentPrice && thresholdNum === currentPrice) {
      toast.error("Target tidak boleh sama dengan harga saat ini");
      return;
    }

    setSubmitting(true);
    try {
      addAlert({
        ticker,
        threshold: thresholdNum,
        direction,
        note: note.trim() || undefined,
      });
      toast.success(
        `🔔 Alert dipasang: ${ticker} ${direction === "above" ? ">" : "<"} ${formatIDR(thresholdNum)}`,
      );
      onClose();
    } catch (err) {
      toast.error("Gagal menyimpan alert");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = (id: string) => {
    removeAlert(id);
    toast.success("Alert dihapus");
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-0 sm:p-4"
      onClick={onClose}
    >
      <Card
        className="w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl rounded-b-none sm:rounded-b-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Bell className="h-5 w-5 text-amber-500" />
                Price Alert
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Notifikasi otomatis untuk{" "}
                <strong className="text-foreground">{ticker}</strong>
              </p>
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Current price reference */}
          {currentPrice !== null && (
            <div className="rounded-lg bg-muted/50 p-3 text-sm flex items-center justify-between">
              <span className="text-muted-foreground">Harga saat ini</span>
              <span className="font-bold tabular-nums">
                {formatIDR(currentPrice)}
              </span>
            </div>
          )}

          {/* Direction toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDirection("above")}
              className={cn(
                "rounded-xl border-2 p-3 font-semibold transition-all",
                direction === "above"
                  ? "border-bull-500 bg-bull-50 dark:bg-bull-700/20 text-bull-700 dark:text-bull-500"
                  : "border-border hover:border-bull-500/50",
              )}
            >
              <ArrowUp className="h-5 w-5 mx-auto mb-1" />
              DI ATAS
            </button>
            <button
              type="button"
              onClick={() => setDirection("below")}
              className={cn(
                "rounded-xl border-2 p-3 font-semibold transition-all",
                direction === "below"
                  ? "border-bear-500 bg-bear-50 dark:bg-bear-700/20 text-bear-700 dark:text-bear-500"
                  : "border-border hover:border-bear-500/50",
              )}
            >
              <ArrowDown className="h-5 w-5 mx-auto mb-1" />
              DI BAWAH
            </button>
          </div>

          {/* Threshold */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Target Harga (Rp)
            </label>
            <Input
              type="text"
              inputMode="numeric"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              placeholder="7000"
              className="mt-1 h-12 text-base font-bold tabular-nums"
              autoFocus
              required
            />
            {suggestions.length > 0 && (
              <div className="flex gap-1.5 mt-2 flex-wrap">
                <span className="text-[10px] text-muted-foreground self-center mr-1">
                  Saran:
                </span>
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setThreshold(String(s))}
                    className="px-2.5 py-1 rounded-full text-xs font-medium bg-muted hover:bg-accent transition-colors"
                  >
                    {formatIDR(s)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Note */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Catatan (opsional)
            </label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Take profit..."
              className="mt-1 h-10"
            />
          </div>

          {/* Existing alerts */}
          {existingAlerts.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-muted-foreground">
                Alert aktif ({existingAlerts.length})
              </div>
              {existingAlerts.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between rounded-lg bg-muted/30 p-2 text-xs"
                >
                  <span>
                    <span className="font-bold">
                      {a.direction === "above" ? ">" : "<"}
                    </span>{" "}
                    {formatIDR(a.threshold)}
                    {a.status === "triggered" && (
                      <span className="ml-1 text-bull-600">✓ triggered</span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemove(a.id)}
                    className="text-muted-foreground hover:text-bear-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Submit */}
          <Button
            type="submit"
            size="lg"
            disabled={submitting || !isValid}
            className="w-full bg-amber-500 hover:bg-amber-600"
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Bell className="h-5 w-5 mr-2" />
                Pasang Alert
              </>
            )}
          </Button>

          <p className="text-[10px] text-muted-foreground text-center">
            🔔 Alert dicek tiap kali halaman watchlist dibuka. Browser
            notification opsional (permission diminta saat pertama pasang).
          </p>
        </form>
      </Card>
    </div>
  );
}
