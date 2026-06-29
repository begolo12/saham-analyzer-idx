"use client";

import { useState, useEffect } from "react";
import { X, Bell, Loader2, ArrowUp, ArrowDown, Percent, BarChart3 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addAlert, removeAlert, rearmAlert, type PriceAlert, type AlertDirection, type AlertType } from "@/lib/price-alerts";
import { formatIDR, cn } from "@/lib/utils";
import { toast } from "sonner";

interface PriceAlertModalProps {
  ticker: string;
  currentPrice: number | null;
  existingAlerts: PriceAlert[];
  onClose: () => void;
}

const ALERT_TYPE_OPTIONS: { type: AlertType; label: string; icon: React.ReactNode; desc: string }[] = [
  { type: "price_above", label: "Harga Naik", icon: <ArrowUp className="h-4 w-4" />, desc: "Notifikasi saat harga di atas target" },
  { type: "price_below", label: "Harga Turun", icon: <ArrowDown className="h-4 w-4" />, desc: "Notifikasi saat harga di bawah target" },
  { type: "pct_change", label: "% Perubahan", icon: <Percent className="h-4 w-4" />, desc: "Notifikasi saat harga berubah X%" },
  { type: "volume_spike", label: "Volume Spike", icon: <BarChart3 className="h-4 w-4" />, desc: "Notifikasi saat volume melonjak" },
];

export function PriceAlertModal({
  ticker,
  currentPrice,
  existingAlerts,
  onClose,
}: PriceAlertModalProps) {
  const [alertType, setAlertType] = useState<AlertType>("price_above");
  const [direction, setDirection] = useState<AlertDirection>("above");
  const [threshold, setThreshold] = useState("");
  const [volumeMultiplier, setVolumeMultiplier] = useState("2");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Auto-set direction based on alert type
  useEffect(() => {
    if (alertType === "price_above") setDirection("above");
    else if (alertType === "price_below") setDirection("below");
    else if (alertType === "pct_change") setDirection("above"); // above means >= X% change
  }, [alertType]);

  // Suggest thresholds based on current price
  const suggestions = useMemoForSuggestions(alertType, currentPrice, direction);

  useEffect(() => {
    if (currentPrice && !threshold) {
      if (alertType === "price_above") {
        setThreshold(String(Math.round(currentPrice * 1.05)));
      } else if (alertType === "price_below") {
        setThreshold(String(Math.round(currentPrice * 0.95)));
      } else if (alertType === "pct_change") {
        setThreshold("5");
      } else if (alertType === "volume_spike") {
        setThreshold("2");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPrice, alertType]);

  const thresholdNum = parseFloat(threshold.replace(/[^0-9.]/g, ""));
  const volMultNum = parseFloat(volumeMultiplier.replace(/[^0-9.]/g, ""));
  const isValid =
    alertType === "volume_spike"
      ? volMultNum > 0
      : thresholdNum > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) {
      toast.error("Masukkan target yang valid");
      return;
    }

    setSubmitting(true);
    try {
      if (alertType === "volume_spike") {
        addAlert({
          ticker,
          threshold: volMultNum,
          direction: "above",
          note: note.trim() || undefined,
          alertType: "volume_spike",
          basePrice: null,
          volumeMultiplier: volMultNum,
        });
        toast.success(
          `📊 Alert volume dipasang: ${ticker} volume ≥ ${volMultNum}x rata-rata`,
        );
      } else if (alertType === "pct_change") {
        addAlert({
          ticker,
          threshold: thresholdNum,
          direction,
          note: note.trim() || undefined,
          alertType: "pct_change",
          basePrice: currentPrice,
          volumeMultiplier: null,
        });
        toast.success(
          `📈 Alert % dipasang: ${ticker} ${direction === "above" ? "naik" : "turun"} ≥ ${thresholdNum}%`,
        );
      } else {
        if (currentPrice && thresholdNum === currentPrice) {
          toast.error("Target tidak boleh sama dengan harga saat ini");
          setSubmitting(false);
          return;
        }
        addAlert({
          ticker,
          threshold: thresholdNum,
          direction: alertType === "price_above" ? "above" : "below",
          note: note.trim() || undefined,
          alertType,
          basePrice: null,
          volumeMultiplier: null,
        });
        toast.success(
          `🔔 Alert dipasang: ${ticker} ${alertType === "price_above" ? ">" : "<"} ${formatIDR(thresholdNum)}`,
        );
      }
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

  const handleRearm = (id: string) => {
    rearmAlert(id);
    toast.success("Alert diaktifkan kembali");
  };

  const getAlertTypeLabel = (a: PriceAlert) => {
    switch (a.alertType) {
      case "price_above": return `> ${formatIDR(a.threshold)}`;
      case "price_below": return `< ${formatIDR(a.threshold)}`;
      case "pct_change": return `${a.direction === "above" ? "+" : "-"}${a.threshold}%`;
      case "volume_spike": return `Vol ≥ ${a.volumeMultiplier ?? a.threshold}x`;
      default: return `${a.direction === "above" ? ">" : "<"} ${formatIDR(a.threshold)}`;
    }
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

          {/* Alert Type Selector */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">
              Tipe Alert
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ALERT_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => setAlertType(opt.type)}
                  className={cn(
                    "rounded-xl border-2 p-2.5 text-left transition-all",
                    alertType === opt.type
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50",
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    {opt.icon}
                    <span className="text-xs font-bold">{opt.label}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Direction toggle — only for price and pct alerts */}
          {(alertType === "price_above" || alertType === "price_below" || alertType === "pct_change") && alertType !== "price_above" && alertType !== "price_below" && (
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
                NAIK
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
                TURUN
              </button>
            </div>
          )}

          {/* Threshold */}
          {alertType !== "volume_spike" ? (
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                {alertType === "pct_change" ? "Target Perubahan (%)" : "Target Harga (Rp)"}
              </label>
              <Input
                type="text"
                inputMode="numeric"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                placeholder={alertType === "pct_change" ? "5" : "7000"}
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
                      {alertType === "pct_change" ? `${s}%` : formatIDR(s)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Volume Multiplier (x rata-rata)
              </label>
              <Input
                type="text"
                inputMode="numeric"
                value={volumeMultiplier}
                onChange={(e) => setVolumeMultiplier(e.target.value)}
                placeholder="2"
                className="mt-1 h-12 text-base font-bold tabular-nums"
                autoFocus
                required
              />
              <div className="flex gap-1.5 mt-2 flex-wrap">
                <span className="text-[10px] text-muted-foreground self-center mr-1">
                  Saran:
                </span>
                {[1.5, 2, 3, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setVolumeMultiplier(String(s))}
                    className="px-2.5 py-1 rounded-full text-xs font-medium bg-muted hover:bg-accent transition-colors"
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>
          )}

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
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-bold">
                      {getAlertTypeLabel(a)}
                    </span>
                    {a.status === "triggered" && (
                      <span className="text-bull-600">✓ triggered</span>
                    )}
                    {a.note && (
                      <span className="text-muted-foreground truncate">{a.note}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {a.status === "triggered" && (
                      <button
                        type="button"
                        onClick={() => handleRearm(a.id)}
                        className="text-primary hover:text-primary/80 px-1"
                        title="Aktifkan kembali"
                      >
                        ↺
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemove(a.id)}
                      className="text-muted-foreground hover:text-bear-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
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

function useMemoForSuggestions(alertType: AlertType, currentPrice: number | null, direction: AlertDirection): number[] {
  // This is a regular function that returns a value, not a hook with stale closure
  if (!currentPrice || currentPrice <= 0) return [];

  switch (alertType) {
    case "price_above":
      return [
        Math.round(currentPrice * 1.05),
        Math.round(currentPrice * 1.1),
        Math.round(currentPrice * 1.2),
        Math.round(currentPrice * 1.5),
      ];
    case "price_below":
      return [
        Math.round(currentPrice * 0.95),
        Math.round(currentPrice * 0.9),
        Math.round(currentPrice * 0.8),
        Math.round(currentPrice * 0.5),
      ];
    case "pct_change":
      return [3, 5, 10, 20];
    default:
      return [];
  }
}
